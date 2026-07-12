import { json } from '@sveltejs/kit';
import { cached } from '$lib/server/cache';
import { reverseGeocodeParts } from '$lib/server/geocode';
import type { RequestHandler } from './$types';

// ============================================================
// GET /api/reverse-geocode?lat=<lat>&lng=<lng>
//
// קליטת מיקום מ-GPS של הנייד / מפין שסומן על המפה: מחזיר כתובת קריאה בעברית
// (address) וגם את שם השכונה בלבד (neighborhood) - למילוי אוטומטי של שם השכונה
// אחרי שהמשתמש אישר מיקום על המפה.
// proxy ל-Nominatim דרך השרת (מדיניות ה-UA שלהם) + cache שמונע הצפה.
// ============================================================

export const GET: RequestHandler = async ({ url, setHeaders }) => {
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return json({ address: '', neighborhood: '', city: '' });
    }

    // עיגול ל-~11 מ' לצורך מפתח cache - מיקומים קרובים חולקים תוצאה
    const key = `revgeo2:${lat.toFixed(4)},${lng.toFixed(4)}`;
    let parts = { address: '', neighborhood: '', city: '' };
    try {
        parts = await cached(key, 7 * 24 * 60 * 60 * 1000, () => reverseGeocodeParts(lat, lng));
    } catch {
        parts = { address: '', neighborhood: '', city: '' };
    }

    setHeaders({ 'cache-control': 'public, max-age=86400' });
    return json(parts);
};
