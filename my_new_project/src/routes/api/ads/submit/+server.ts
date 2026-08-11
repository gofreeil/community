import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitAd, listApproved, computeAdSlots, type SubmittedAd } from '$lib/server/adsStore';
import { getAllAdminRecipients, createItem } from '$lib/server/db';
import { markAdMessagesHandled } from '$lib/server/adNotifications';
import { parseAdImageFit } from '$lib/adImageFit';
import { parseAdStyle } from '$lib/adStyle';
import { toExternalUrl } from '$lib/urlNormalize';

/**
 * שולח הודעה אישית (category 'message') לכל אדמין - סופר-אדמין וגם אדמין שמונה - על בקשת פרסום,
 * כדי שהיא תופיע מיד בתיבת ההודעות ותיספר בבאדג' ההודעות שלא נקראו.
 * זהו אותו דפוס שבו מתריעות בקשת רכז ובקשת עזרה בעיצוב - best-effort:
 * כשל בהתראה לעולם לא מבטל את השליחה עצמה.
 *
 * מפרסם חוזר שמשפר פרסומת קיימת מקבל ניסוח משלו: "עדכון לפרסומת קיימת"
 * ולא "בקשת פרסום חדשה", כי מבחינת המנהל זו אותה פרסומת בגרסה חדשה -
 * והאישור יחליף את הישנה במקום להוסיף פרסומת שנייה לאותו מפרסם.
 */
async function notifyAdminsInApp(ad: SubmittedAd) {
    // שרשרת הזיהוי חייבת לרדת עד לפרטי הקשר שבדף הנחיתה: פרסומת אפשר לשלוח
    // גם בלי להתחבר, ואז submittedBy ריק לגמרי. בלי הנפילה הזו האדמין היה מקבל
    // "בקשת פרסום חדשה: מפרסם" בלי שום דרך לדעת מי שלח.
    const contactEmail = ad.submittedBy?.email || ad.landing?.email || '';
    const advertiser =
        ad.submittedBy?.name || ad.companyName || contactEmail || ad.landing?.phone || ad.title || 'מפרסם';
    const isUpdate = !!ad.replacesAdId;
    // רק גרסה קודמת שנמצאת באמת על האתר תרד עם האישור. קודמת שנדחתה או
    // שעדיין ממתינה - אין מה להוריד, ואסור להבטיח למנהל החלפה שלא תקרה.
    const replacesLive = ad.replacesStatus === 'approved';
    // מספר המקום של הפרסומת שתוחלף - כדי שהמנהל ידע בדיוק איזו משבצת
    // מתעדכנת, במיוחד אצל מפרסם שמחזיק כמה משבצות במקביל. best-effort.
    let replacesSlot: number | undefined;
    if (isUpdate && replacesLive && ad.replacesAdId) {
        try {
            replacesSlot = computeAdSlots(await listApproved()).get(ad.replacesAdId);
        } catch { /* אין מספר - ההתראה פשוט לא תנקוב מקום */ }
    }
    const prevLine = ad.replacesTitle
        ? `הגרסה הקודמת: ${ad.replacesTitle}` +
          (ad.replacesStatus === 'rejected' ? ' (נדחתה)' : ad.replacesStatus === 'pending' ? ' (ממתינה)' : '') + '\n'
        : '';
    const details =
        `כותרת: ${ad.title}\n` +
        (ad.subtitle ? `תת-כותרת: ${ad.subtitle}\n` : '') +
        (contactEmail ? `אימייל: ${contactEmail}\n` : '') +
        (ad.landing?.phone ? `טלפון: ${ad.landing.phone}\n` : '') +
        (ad.landing?.website ? `אתר: ${ad.landing.website}\n` : '');
    // הסופר-אדמין וגם כל אדמין שמונה - כולם צריכים לראות בקשת פרסום
    const admins = await getAllAdminRecipients();
    await Promise.all(admins.map(admin => createItem({
        category:    'message',
        label:       isUpdate
            ? `🔄 עדכון לפרסומת קיימת: ${advertiser}`
            : `📢 בקשת פרסום חדשה: ${advertiser}`,
        description: isUpdate
            ? `${advertiser} שידרג/ה את הפרסומת הקיימת ושלח/ה גרסה מעודכנת לאישור. זו לא פרסומת נוספת.\n\n` +
              prevLine +
              details +
              (replacesLive
                  ? `\nעם האישור הגרסה החדשה תיכנס במקום הישנה${replacesSlot ? ` (מקום ${replacesSlot} בטור)` : ''} - רק הפרסומת הזו תרד מהאתר, באותו מקום בטור ועם אותו תאריך סיום. פרסומות אחרות של המפרסם לא יושפעו.\n`
                  : `\nלמפרסם הזה אין כרגע פרסומת פעילה על האתר, ולכן האישור פשוט יפרסם את הגרסה הזו.\n`) +
              `היכנס/י לעמוד "אישור פרסומות" בפאנל הניהול כדי לאשר או לדחות.\n` +
              `קישור: /admin/ads-review`
            : `${advertiser} שלח/ה פרסומת חדשה לאישור.\n\n` +
              details +
              // משבצת נוספת שנקנתה במחירון: המנהל צריך לדעת שהיא *לא* באה
              // במקום הפרסומת הקיימת, ושהאישור לא יוריד אותה מהאתר
              (ad.standalone
                  ? `\nזו פרסומת נוספת שנרכשה במחירון - היא מתווספת לפרסומת שכבר רצה למפרסם הזה, ולא באה במקומה.\n`
                  : '') +
              `\nהיכנס/י לעמוד "אישור פרסומות" בפאנל הניהול כדי לאשר או לדחות.\n` +
              `קישור: /admin/ads-review`,
        icon:        isUpdate ? '🔄' : '📢',
        color:       isUpdate ? 'blue' : 'amber',
        user_id:     admin.id,
        extra_fields: {
            type:              'ad_submission',
            ad_id:             ad.id,
            ad_title:          ad.title,
            is_update:         isUpdate,
            replaces_ad_id:    ad.replacesAdId ?? '',
            replaces_title:    ad.replacesTitle ?? '',
            replaces_status:   ad.replacesStatus ?? '',
            submitted_by_id:   ad.submittedBy?.id ?? '',
            submitted_by_name: ad.submittedBy?.name ?? '',
            submitted_by_email: contactEmail,
            advertiser_phone:  ad.landing?.phone ?? '',
            review_link:       '/admin/ads-review',
            submitted_at:      ad.submittedAt,
            read:              false,
        },
    })));
}

/**
 * מסלול התשלום שנבחר בדף המחירים → מספר הימים שהפרסומת תרוץ.
 * רק שני המסלולים האמיתיים מתקבלים; כל ערך אחר נופל לחודש, וכך גם
 * מודעה שנשלחה בלי המידע הזה (טיוטה ישנה) מתנהגת כמו קודם.
 */
function parsePlanDays(raw: unknown): number {
    return Number(raw) === 6 ? 180 : 30;
}

export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth().catch(() => null);

    let payload: any;
    try {
        payload = await event.request.json();
    } catch {
        throw error(400, 'גוף הבקשה חייב להיות JSON תקין');
    }

    const required = ['title', 'subtitle', 'mainImage', 'gradient'];
    for (const k of required) {
        if (!payload?.[k] || typeof payload[k] !== 'string') {
            throw error(400, `חסר שדה: ${k}`);
        }
    }
    if (!payload.landing || typeof payload.landing !== 'object') {
        throw error(400, 'חסר אובייקט landing');
    }

    let ad;
    try {
        ad = await submitAd({
        submittedBy: session?.user
            ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.name ?? undefined }
            : undefined,
        title: payload.title,
        subtitle: payload.subtitle,
        hoverText: payload.hoverText ?? '',
        cta: payload.cta ?? '',
        gradient: payload.gradient,
        logo: payload.logo ?? '',
        mainImage: payload.mainImage,
        // מיקום+זום שנבחרו בבילדר — מנורמלים כאן, קלט דפדפן הוא לא-אמין
        mainImageFit: parseAdImageFit(payload.mainImageFit),
        // תמונה ייעודית לנייד; ריק = הנייד משתמש בתמונה הראשית
        mobileImage: typeof payload.mobileImage === 'string' ? payload.mobileImage : '',
        mobileImageFit: parseAdImageFit(payload.mobileImageFit),
        // התקופה שנקנתה בדף המחירים. קלט דפדפן - מקבלים רק את שני המסלולים
        // הקיימים, כדי שאי אפשר יהיה לבקש שנה בחינם דרך ה-API.
        durationDays: parsePlanDays(payload.planMonths),
        // 'new' = המפרסם הגיע דרך המחירון וקנה משבצת נוספת. השליחה הזו לא
        // מתקשרת לפרסומת הקיימת ולא מורידה אותה כשהיא מאושרת.
        standalone: payload.intent === 'new',
        // עריכה ממוקדת: המזהה של הפרסומת הספציפית ש"ערוך" נלחץ עליה
        // בנכסים. השרת מקשר את הגרסה החדשה אליה בלבד (אחרי אימות בעלות).
        editOfAdId: typeof payload.editOfAdId === 'string' && payload.editOfAdId.trim()
            ? payload.editOfAdId.trim()
            : undefined,
        // מיקום/צורת הלוגו, גובה הרצועה וצבע הכותרת — אותו עיצוב שהמפרסם
        // ראה בתצוגה החיה. חסר (מודעה ותיקה) נשמר כ-null.
        adStyle: parseAdStyle(payload.adStyle),
        landing: {
            headline: payload.landing.headline ?? '',
            pitch: payload.landing.pitch ?? '',
            extended: payload.landing.extended ?? '',
            image: payload.landing.image ?? '',
            advantages: [
                payload.landing.advantages?.[0] ?? '',
                payload.landing.advantages?.[1] ?? '',
                payload.landing.advantages?.[2] ?? '',
            ],
            uniqueness: payload.landing.uniqueness ?? '',
            phone: payload.landing.phone ?? '',
            whatsapp: payload.landing.whatsapp ?? '',
            // נשמר מנורמל (https:// מלא) כדי שהקישור לא ייפול לנתיב יחסי על
            // הדומיין שלנו. ערך שאי אפשר לנרמל נשמר כמו שהוא ולא נזרק.
            website: toExternalUrl(payload.landing.website ?? '') || (payload.landing.website ?? ''),
            email: payload.landing.email ?? '',
            address: payload.landing.address ?? '',
            hours: payload.landing.hours ?? '',
            products: Array.isArray(payload.landing.products) ? payload.landing.products : [],
        },
        });
    } catch (err) {
        console.error('ads/submit failed:', err);
        // תקרת koa-body של Strapi (~1MB) — שגיאה שהמפרסם יכול לתקן בעצמו
        if (err instanceof Error && err.message.includes('→ 413')) {
            throw error(413, 'התמונות כבדות מדי — הקטינו תמונה ונסו שוב');
        }
        throw error(502, 'השליחה נכשלה — נסו שוב בעוד רגע');
    }

    // התראה לאדמין - best-effort. בלי זה בקשת פרסום נשמרה בשקט
    // ואיש לא ידע עליה עד שמישהו נכנס במקרה ל"אישור פרסומות".
    try {
        await notifyAdminsInApp(ad);
        // בקשות ממתינות של אותו מפרסם שירדו מהתור - גם ההתראות עליהן יורדות,
        // אחרת נשארים כרטיסי אישור כפולים על גרסאות מיושנות
        await markAdMessagesHandled(ad.retiredPendingIds ?? [], 'superseded', { superseded_by: ad.id });
    } catch (e) {
        console.warn('[ads/submit] notify admins failed:', e instanceof Error ? e.message : e);
    }

    return json({ ok: true, id: ad.id, status: ad.status, replacesAdId: ad.replacesAdId ?? null });
};
