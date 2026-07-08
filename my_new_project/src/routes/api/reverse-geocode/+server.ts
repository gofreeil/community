import { json } from '@sveltejs/kit';
import { cached } from '$lib/server/cache';
import { reverseGeocode } from '$lib/server/geocode';
import type { RequestHandler } from './$types';

// ============================================================
// GET /api/reverse-geocode?lat=<lat>&lng=<lng>
//
// קליטת מיקום מ-GPS של הנייד: הלקוח לוקח קואורדינטות מ-navigator.geolocation
// וקורא לכאן כדי לקבל כתובת קריאה בעברית (רחוב/שכונה/עיר) למילוי אוטומטי.
// proxy ל-Nominatim דרך השרת (מדיניות ה-UA שלהם) + cache שמונע הצפה.
// ============================================================

export const GET: RequestHandler = async ({ url, setHeaders }) => {
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return json({ address: '' });
    }

    // עיגול ל-~11 מ' לצורך מפתח cache - מיקומים קרובים חולקים תוצאה
    const key = `revgeo:${lat.toFixed(4)},${lng.toFixed(4)}`;
    let address = '';
    try {
        address = await cached(key, 7 * 24 * 60 * 60 * 1000, () => reverseGeocode(lat, lng));
    } catch {
        address = '';
    }

    setHeaders({ 'cache-control': 'public, max-age=86400' });
    return json({ address });
};
