import type { RequestHandler } from './$types';
import { getApprovedAdImage, isAdImageKind } from '$lib/server/adsStore';

/**
 * תמונות הפרסומות - במקום base64 מוטבע בכל דף.
 *
 * הכתובת נושאת ?v=<חותם תוכן>, ולכן היא ייחודית לתמונה הזו: אם התמונה
 * מוחלפת משתנה גם החותם וגם הכתובת. זה מה שמאפשר קאש "לנצח" (immutable)
 * גם בדפדפן וגם בקצה של Vercel - אחרי הבקשה הראשונה התמונה כבר לא יוצאת
 * שוב מהשרת, ולא נספרת שוב במכסת ה-Origin Transfer.
 *
 * מוגש רק מפרסומות מאושרות (getApprovedAdImage נשען על רשימת המאושרות
 * שב-cache), כך שתמונות של פרסומת ממתינה/נדחית אינן נחשפות דרך ניחוש מזהה.
 */
export const GET: RequestHandler = async ({ params }) => {
    if (!isAdImageKind(params.kind)) {
        return new Response(null, { status: 404 });
    }

    const img = await getApprovedAdImage(params.id, params.kind);
    if (!img) {
        return new Response(null, { status: 404 });
    }

    return new Response(img.bytes, {
        headers: {
            'content-type': img.mime,
            'content-length': String(img.bytes.byteLength),
            'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        },
    });
};
