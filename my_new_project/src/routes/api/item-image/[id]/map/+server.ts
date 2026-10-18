import type { RequestHandler } from './$types';
import { getActiveItemForImage } from '$lib/server/db';
import { isPrivateCategory } from '$lib/itemCategories';
import { canUseMapImage, getMapImage } from '$lib/mapImage';
import { decodeDataImage, immutableImageResponse, imageUnavailableResponse } from '$lib/server/inlineImage';

/**
 * "תמונה או לוגו על המפה" (extra_fields.map_image) - במקום base64 מוטבע
 * בנתוני דף הבית. הכתובת נושאת ?v=<חותם תוכן>, ולכן היא ייחודית לתמונה
 * ומאפשרת קאש immutable בדפדפן ובקצה. ראה inlineImage.ts.
 *
 * פריטים פעילים בלבד (getActiveItemForImage - מה-cache כשהוא חם, אחרת
 * הרשומה הבודדת). קטגוריות פרטיות (הודעות, משוב, בקשות) חסומות כאן בדיוק
 * כפי שהן מוחרגות מדף הבית - כדי שהנתיב לא ייהפך לפרצה לתוכן שלא נועד לגולש.
 */
export const GET: RequestHandler = async ({ params }) => {
    let item;
    try {
        item = await getActiveItemForImage(params.id);
    } catch (e) {
        return imageUnavailableResponse('item-image', e);
    }
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
