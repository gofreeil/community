import type { RequestHandler } from './$types';
import { getDbItemById } from '$lib/server/db';

/**
 * GET /api/items/[id]/image
 *
 * מגיש את התמונה הראשונה של הפריט כתמונה אמיתית (לא base64),
 * כדי שסקרפרים של רשתות חברתיות (WhatsApp/Telegram/Facebook) יוכלו
 * להציג קדימון. תומך ב-data URLs (מפענח base64) וב-URLs רגילים (redirect).
 */
export const GET: RequestHandler = async (event) => {
    const id = event.params.id;
    if (!id) return new Response('Missing id', { status: 400 });

    const item = await getDbItemById(id);
    if (!item) return new Response('Not found', { status: 404 });

    const extraFields = (() => {
        try { return JSON.parse(item.extra_fields ?? '{}'); } catch { return {}; }
    })();

    const candidate: string =
        (typeof extraFields?.avatar === 'string' && extraFields.avatar)
        || (Array.isArray(extraFields?.images) && typeof extraFields.images[0] === 'string' && extraFields.images[0])
        || (typeof extraFields?.image === 'string' && extraFields.image)
        || '';

    if (!candidate) return new Response('No image', { status: 404 });

    // data URL: פענח את ה-base64 והגש כקובץ
    const dataMatch = candidate.match(/^data:([^;,]+)(?:;([^,]*))?,(.*)$/);
    if (dataMatch) {
        const mime = dataMatch[1] || 'image/jpeg';
        const encoding = dataMatch[2] || '';
        const payload = dataMatch[3] || '';
        const bytes = encoding === 'base64'
            ? Buffer.from(payload, 'base64')
            : Buffer.from(decodeURIComponent(payload), 'utf-8');
        return new Response(bytes, {
            headers: {
                'Content-Type': mime,
                'Content-Length': String(bytes.length),
                'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            },
        });
    }

    // URL רגיל: הפנה אליו
    if (/^https?:\/\//i.test(candidate) || candidate.startsWith('/')) {
        return new Response(null, {
            status: 302,
            headers: { location: candidate, 'Cache-Control': 'public, max-age=3600' },
        });
    }

    return new Response('Unsupported image format', { status: 415 });
};
