import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOwnAdForEdit } from '$lib/server/adsStore';

/**
 * GET /api/ads/mine?id=<documentId>
 * התוכן המלא של פרסומת אחת של המשתמש המחובר - להזנת הבילדר בעריכה
 * ממוקדת ("ערוך" על פרסומת מסוימת בנכסים). הבעלות מאומתת בשרת לפי
 * מפתחות הזהות של המפרסם; מזהה זר מחזיר 404 בלי להסגיר שהוא קיים.
 */
export const GET: RequestHandler = async (event) => {
    const session = await event.locals.auth().catch(() => null);
    const identity = {
        id: session?.user?.id as string | undefined,
        email: session?.user?.email ?? undefined,
    };
    if (!identity.id && !identity.email) throw error(401, 'נדרשת התחברות');

    const id = event.url.searchParams.get('id')?.trim();
    if (!id) throw error(400, 'חסר מזהה פרסומת');

    const ad = await getOwnAdForEdit(id, identity).catch(() => null);
    if (!ad) throw error(404, 'הפרסומת לא נמצאה או שאינה שייכת לחשבון הזה');

    // רק מה שהבילדר צריך כדי להמשיך לערוך - תוכן ועיצוב, בלי שדות ניהול
    // ובלי מפתחות פנימיים (_site, _order וכו') שחיים בתוך landing.
    const L = ad.landing as Record<string, unknown> as {
        headline?: string; pitch?: string; extended?: string; image?: string;
        advantages?: string[]; uniqueness?: string; phone?: string; whatsapp?: string;
        website?: string; email?: string; address?: string; hours?: string;
        products?: unknown[];
    };
    return json({
        id: ad.id,
        status: ad.status,
        title: ad.title,
        subtitle: ad.subtitle,
        hoverText: ad.hoverText,
        cta: ad.cta,
        gradient: ad.gradient,
        logo: ad.logo,
        mainImage: ad.mainImage,
        mainImageFit: ad.mainImageFit,
        mobileImage: ad.mobileImage,
        mobileImageFit: ad.mobileImageFit,
        adStyle: ad.adStyle,
        durationDays: ad.durationDays ?? null,
        landing: {
            headline: L?.headline ?? '',
            pitch: L?.pitch ?? '',
            extended: L?.extended ?? '',
            image: L?.image ?? '',
            advantages: [
                L?.advantages?.[0] ?? '',
                L?.advantages?.[1] ?? '',
                L?.advantages?.[2] ?? '',
            ],
            uniqueness: L?.uniqueness ?? '',
            phone: L?.phone ?? '',
            whatsapp: L?.whatsapp ?? '',
            website: L?.website ?? '',
            email: L?.email ?? '',
            address: L?.address ?? '',
            hours: L?.hours ?? '',
            products: Array.isArray(L?.products) ? L.products : [],
        },
    });
};
