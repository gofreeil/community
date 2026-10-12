import type { RequestHandler } from './$types';
import { getDbItemById } from '$lib/server/db';
import { decodeDataImage, immutableImageResponse } from '$lib/server/inlineImage';
import { singlesImageToken, singlesImageTokenMatches, singlesBlurToken } from '$lib/server/singlesImages';
import { blurJpeg, BLUR_PLACEHOLDER } from '$lib/server/blurImage';

/**
 * תמונה מס' n של כרטיס פנויים/פנויות - במקום base64 מוטבע בנתוני /singles.
 * מוגש רק עם ?v=<HMAC> תואם (ראה singlesImages.ts): הלוח סגור למי שלא אושר,
 * והאסימון הוא מה שמונע דפדוף בתמונות לפי מזהים רציפים. הנתיב עוקף את
 * שרשרת ה-auth (PUBLIC_IMAGE_PATH ב-hooks.server) כדי שהקצה ישמור בקאש.
 *
 * ?b=<HMAC> (במקום v) — הגרסה המטושטשת בלבד, לכרטיס "בלוח עם פנים מטושטשות".
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

    const img = decodeDataImage(raw);
    if (singlesImageTokenMatches(singlesImageToken(item.id, index, raw), url.searchParams.get('v'))) {
        return img ? immutableImageResponse(img) : notFound();
    }
    if (singlesImageTokenMatches(singlesBlurToken(item.id, index, raw), url.searchParams.get('b'))) {
        const blurred = img && /jpe?g/i.test(img.mime) ? blurJpeg(img.bytes) : null;
        if (blurred) return immutableImageResponse({ mime: 'image/jpeg', bytes: blurred });
        const svg = new TextEncoder().encode(BLUR_PLACEHOLDER);
        return immutableImageResponse({ mime: 'image/svg+xml', bytes: svg.buffer as ArrayBuffer });
    }
    return notFound();
};
