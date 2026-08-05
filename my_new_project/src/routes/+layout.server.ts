import type { LayoutServerLoad } from './$types';
import { getUserById, getNeighborhoods, maybeSendTierUpgradeMessage } from '$lib/server/db';
import { listApproved } from '$lib/server/adsStore';

export const load: LayoutServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // session לא תקין - נמשיך כמשתמש אנונימי
    }

    // שלוש השליפות בלתי-תלויות זו בזו → רצות במקביל (לא בטור) כדי לחסוך
    // round-trips סדרתיים ל-Strapi בכל ניווט.
    const jwt = event.cookies.get('strapi_jwt');
    const [userRes, adsRes, neighborhoodsRes] = await Promise.allSettled([
        session?.user?.id ? getUserById(session.user.id as string, jwt) : Promise.resolve(null),
        listApproved(),
        getNeighborhoods('approved'),
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
        }))
        : [];

    // שכונות שהוצעו ע"י תושבים ואושרו - מתמזגות לבוררים ולמפה בכל האתר
    const approvedNeighborhoods = neighborhoodsRes.status === 'fulfilled'
        ? neighborhoodsRes.value.map(n => ({ name: n.name, city: n.city, lat: n.lat, lng: n.lng }))
        : [];

    return { session, layoutUser, approvedAds, approvedNeighborhoods };
};
