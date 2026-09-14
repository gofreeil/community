import type { RequestHandler } from './$types';
import { getDbItemById } from '$lib/server/db';
import { decodeDataImage, immutableImageResponse } from '$lib/server/inlineImage';
import { singlesImageToken, singlesImageTokenMatches } from '$lib/server/singlesImages';

/**
 * תמונה מס' n של כרטיס פנויים/פנויות - במקום base64 מוטבע בנתוני /singles.
 * מוגש רק עם ?v=<HMAC> תואם (ראה singlesImages.ts): הלוח סגור למי שלא אושר,
 * והאסימון הוא מה שמונע דפדוף בתמונות לפי מזהים רציפים. הנתיב עוקף את
 * שרשרת ה-auth (PUBLIC_IMAGE_PATH ב-hooks.server) כדי שהקצה ישמור בקאש.
 */
export const GET: RequestHandler = async ({ params, url }) => {
    const notFound = () => new Response(null, { status: 404 });
    const index = Number(params.n);
    if (!Number.isInteger(index) || index < 0 || index > 50) return notFound();

    let item;
    try { item = await getDbItemById(params.id); } catch { return notFound(); }
    if (!item || item.category !== 'singles' || item.status === 'deleted') return notFound();

    let images: unknown[] = [];
    try {
        const ef = item.extra_fields ? JSON.parse(item.extra_fields) : {};
        images = Array.isArray(ef.images) ? ef.images : [];
    } catch { return notFound(); }

    const raw = images[index];
    if (typeof raw !== 'string') return notFound();
    if (!singlesImageTokenMatches(singlesImageToken(item.id, index, raw), url.searchParams.get('v'))) return notFound();

    const img = decodeDataImage(raw);
    if (!img) return notFound();
    return immutableImageResponse(img);
};
