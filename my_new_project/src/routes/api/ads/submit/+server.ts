import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitAd, type SubmittedAd } from '$lib/server/adsStore';
import { getAllAdminRecipients, createItem, getMessagesByUserId, updateItem } from '$lib/server/db';
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
              (ad.replacesTitle ? `הגרסה הקודמת: ${ad.replacesTitle}\n` : '') +
              details +
              `\nעם האישור הגרסה החדשה תיכנס במקום הישנה - הישנה תרד מהאתר אוטומטית, באותו מקום בטור ועם אותו תאריך סיום.\n` +
              `היכנס/י לעמוד "אישור פרסומות" בפאנל הניהול כדי לאשר או לדחות.\n` +
              `קישור: /admin/ads-review`
            : `${advertiser} שלח/ה פרסומת חדשה לאישור.\n\n` +
              details +
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
 * מוריד מההתראות הפעילות את ההודעות על בקשות ממתינות שהוחלפו כרגע.
 * בלי זה המנהל היה נשאר עם כרטיס "אשר ופרסם" שמצביע על גרסה מיושנת -
 * לחיצה עליו הייתה מפרסמת את הגרסה שהמפרסם כבר החליף.
 */
async function retireSupersededMessages(retiredIds: string[], newAd: SubmittedAd) {
    if (retiredIds.length === 0) return;
    const retired = new Set(retiredIds);
    const admins = await getAllAdminRecipients();
    const inboxes = await Promise.all(admins.map(a => getMessagesByUserId(a.id).catch(() => [])));
    const now = new Date().toISOString();
    await Promise.all(inboxes.flat().map(async (msg) => {
        let ef: Record<string, unknown> = {};
        try { ef = msg.extra_fields ? JSON.parse(msg.extra_fields) : {}; } catch { return; }
        if (ef.type !== 'ad_submission' || ef.handled) return;
        if (!retired.has(String(ef.ad_id ?? ''))) return;
        try {
            await updateItem(msg.id, {
                label:  `🔄 הוחלפה בגרסה מעודכנת · ${msg.label ?? ''}`.trim(),
                status: 'handled',
                extra_fields: {
                    ...ef,
                    handled:        true,
                    decision:       'superseded',
                    handled_at:     now,
                    superseded_by:  newAd.id,
                },
            });
        } catch (e) {
            console.warn('[ads/submit] retire superseded message failed:', e instanceof Error ? e.message : e);
        }
    }));
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
        await retireSupersededMessages(ad.retiredPendingIds ?? [], ad);
    } catch (e) {
        console.warn('[ads/submit] notify admins failed:', e instanceof Error ? e.message : e);
    }

    return json({ ok: true, id: ad.id, status: ad.status, replacesAdId: ad.replacesAdId ?? null });
};
