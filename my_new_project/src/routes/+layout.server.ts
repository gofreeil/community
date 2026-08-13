import type { LayoutServerLoad } from './$types';
import { getUserById, getNeighborhoods, maybeSendTierUpgradeMessage } from '$lib/server/db';
import { listApprovedLive, computeAdSlots } from '$lib/server/adsStore';

/**
 * תקציב זמן קשיח לשליפה בשכבת ה-layout.
 *
 * ה-layout רץ בכל ניווט בכל עמוד, ולכן כל שנייה שהוא ממתין היא שנייה שבה
 * המסך של המשתמש קפוא לגמרי. strapiClient נותן לכל קריאה 3 ניסיונות × 6 שניות
 * עם backoff - כמעט 20 שניות עד ש-allSettled נפתר כש-Strapi מהבהב. משתמש
 * שלוחץ "כניסה לאזור האישי" ומחכה 20 שניות בלי שום שינוי על המסך מדווח
 * (בצדק) "לחצתי ולא קרה כלום".
 *
 * לכן: מי שלא ענה בתוך התקציב נחשב ככשל, בדיוק כמו כשל רשת - השדה נופל
 * לברירת המחדל הריקה שכבר קיימת כאן ממילא, והדף עולה. הקריאה עצמה לא
 * מבוטלת; היא רק מפסיקה לעכב את הניווט, וה-cache של adsStore יקלוט אותה
 * לבקשה הבאה.
 */
const LAYOUT_BUDGET_MS = 4000;

function withBudget<T>(p: Promise<T>, fallback: T, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const budget = new Promise<T>((resolve) => {
        timer = setTimeout(() => {
            console.warn(`[layout] ${label} חרג מ-${LAYOUT_BUDGET_MS}ms - נטען בלעדיו`);
            resolve(fallback);
        }, LAYOUT_BUDGET_MS);
    });
    // clearTimeout בכל מסלול: בלי זה כל טעינת layout משאירה טיימר תלוי של 4 שניות
    return Promise.race([p, budget])
        .catch(() => fallback)
        .finally(() => clearTimeout(timer));
}

export const load: LayoutServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // session לא תקין - נמשיך כמשתמש אנונימי
    }

    // שלוש השליפות בלתי-תלויות זו בזו → רצות במקביל (לא בטור) כדי לחסוך
    // round-trips סדרתיים ל-Strapi בכל ניווט. כל אחת חסומה בתקציב זמן
    // כדי ש-Strapi איטי יוריד תוכן מהדף - ולא יקפיא את הניווט כולו.
    const jwt = event.cookies.get('strapi_jwt');
    const [userRes, adsRes, neighborhoodsRes] = await Promise.allSettled([
        session?.user?.id
            ? withBudget(getUserById(session.user.id as string, jwt), null, 'getUserById')
            : Promise.resolve(null),
        withBudget(listApprovedLive(), [], 'listApprovedLive'),
        withBudget(getNeighborhoods('approved'), [], 'getNeighborhoods'),
    ]);

    // פרטי משתמש מלאים לתצוגה בדרואר
    const layoutUser = userRes.status === 'fulfilled' ? userRes.value : null;

    // הודעת השלמת-פרופיל חד-פעמית ב"הודעות" (הבאנר הקבוע הוסר מהפרופיל).
    // no-op מיידי כשכבר נשלחה (דגל על המשתמש); כשל כאן לעולם לא מפיל את הדף.
    if (layoutUser && !layoutUser.banned && session?.user?.id) {
        try {
            await maybeSendTierUpgradeMessage(session.user.id as string, layoutUser);
        } catch (e) {
            console.warn('[layout] tier prompt failed:', e instanceof Error ? e.message : e);
        }
    }

    // פרסומות מאושרות - נשתלות ב-RightAdBanner (הטור הימני) בלבד.
    // הטור השמאלי (AdsSidebar) הוא אתרי "יוצאים לחירות" ולא מקבל פרסומות.
    // מספר המקום (1..16) קובע גם את סדר הפרסומות וגם אילו משבצות פנויות
    // מוצגות סביבן - נקבע במסך הניהול ומחושב כאן פעם אחת לכל הרשימה.
    const liveSlots = computeAdSlots(adsRes.status === 'fulfilled' ? adsRes.value : []);
    const approvedAds = adsRes.status === 'fulfilled'
        ? adsRes.value.map(a => ({
            id: a.id,
            title: a.title,
            subtitle: a.subtitle,
            cta: a.cta,
            hover: a.hoverText,
            gradient: a.gradient,
            logo: a.logo,
            mainImage: a.mainImage,
            mainImageFit: a.mainImageFit,
            // תמונת הנייד (אם הועלתה) — הצרכן נופל לתמונה הראשית כשהיא ריקה
            mobileImage: a.mobileImage,
            mobileImageFit: a.mobileImageFit,
            // העיצוב מהבילדר — בלעדיו הכרטיס נבנה מברירות המחדל של האתר
            adStyle: a.adStyle,
            // מספר המקום בטור (1..16) - נקבע במסך הניהול
            slot: liveSlots.get(a.id),
        }))
        : [];

    // שכונות שהוצעו ע"י תושבים ואושרו - מתמזגות לבוררים ולמפה בכל האתר
    const approvedNeighborhoods = neighborhoodsRes.status === 'fulfilled'
        ? neighborhoodsRes.value.map(n => ({ name: n.name, city: n.city, lat: n.lat, lng: n.lng }))
        : [];

    return { session, layoutUser, approvedAds, approvedNeighborhoods };
};
