import type { RequestHandler } from './$types';
import { getApprovedAdImage, isAdImageKind } from '$lib/server/adsStore';
import { immutableImageResponse, imageUnavailableResponse } from '$lib/server/inlineImage';

/**
 * תמונות הפרסומות - במקום base64 מוטבע בכל דף.
 *
 * הכתובת נושאת ?v=<חותם תוכן>, ולכן היא ייחודית לתמונה הזו: אם התמונה
 * מוחלפת משתנה גם החותם וגם הכתובת. זה מה שמאפשר קאש "לנצח" (immutable)
 * גם בדפדפן וגם בקצה של Vercel - אחרי הבקשה הראשונה התמונה כבר לא יוצאת
 * שוב מהשרת, ולא נספרת שוב במכסת ה-Origin Transfer.
 *
 * מוגש רק מפרסומות מאושרות (getApprovedAdImage), כך שתמונות של פרסומת
 * ממתינה/נדחית אינן נחשפות דרך ניחוש מזהה.
 */
export const GET: RequestHandler = async ({ params }) => {
    if (!isAdImageKind(params.kind)) {
        return new Response(null, { status: 404 });
    }

    let img;
    try {
        img = await getApprovedAdImage(params.id, params.kind);
    } catch (e) {
        return imageUnavailableResponse('ad-image', e);
    }
    if (!img) {
        return new Response(null, { status: 404 });
    }

    return immutableImageResponse(img);
};
