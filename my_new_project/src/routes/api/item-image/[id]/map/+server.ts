import type { RequestHandler } from './$types';
import { getAllItems } from '$lib/server/db';
import { isPrivateCategory } from '$lib/itemCategories';
import { canUseMapImage, getMapImage } from '$lib/mapImage';
import { decodeDataImage, immutableImageResponse } from '$lib/server/inlineImage';

/**
 * "תמונה או לוגו על המפה" (extra_fields.map_image) - במקום base64 מוטבע
 * בנתוני דף הבית. הכתובת נושאת ?v=<חותם תוכן>, ולכן היא ייחודית לתמונה
 * ומאפשרת קאש immutable בדפדפן ובקצה. ראה inlineImage.ts.
 *
 * נשלף מרשימת הפריטים שב-cache (פריטים פעילים בלבד), ולכן בלי round-trip
 * נוסף ל-Strapi. קטגוריות פרטיות (הודעות, משוב, בקשות) חסומות כאן בדיוק
 * כפי שהן מוחרגות מדף הבית - כדי שהנתיב לא ייהפך לפרצה לתוכן שלא נועד לגולש.
 */
export const GET: RequestHandler = async ({ params }) => {
    const item = (await getAllItems()).find(i => i.id === params.id);
    if (!item || isPrivateCategory(item.category) || !canUseMapImage(item.category)) {
        return new Response(null, { status: 404 });
    }

    let extra: Record<string, unknown> = {};
    try {
        extra = item.extra_fields ? JSON.parse(item.extra_fields) : {};
    } catch {
        return new Response(null, { status: 404 });
    }

    const img = decodeDataImage(getMapImage(extra));
    if (!img) {
        return new Response(null, { status: 404 });
    }

    return immutableImageResponse(img);
};
