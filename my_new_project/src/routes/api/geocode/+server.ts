import { json } from '@sveltejs/kit';
import { cached } from '$lib/server/cache';
import { geocodeAddress } from '$lib/server/geocode';
import type { RequestHandler } from './$types';

// ============================================================
// GET /api/geocode?q=<רחוב ומספר>&city=<עיר>
//
// תצוגה מקדימה של פין בטופס הפרסום: ברגע שהמשתמש בחר רחוב ומספר בית,
// הלקוח קורא לכאן והפין קופץ אוטומטית על המפה - נשאר לו רק לאשר/לגרור.
// proxy ל-Nominatim דרך השרת (מדיניות ה-UA שלהם + cache שמונע הצפה).
// ============================================================

export const GET: RequestHandler = async ({ url, setHeaders }) => {
    const q = (url.searchParams.get('q') ?? '').trim();
    const city = (url.searchParams.get('city') ?? '').trim();
    if (!q) return json({ lat: null, lng: null });

    const query = [q, city, 'ישראל'].filter(Boolean).join(', ');

    // כתובות לא זזות - cache שבועי; גם תוצאת "לא נמצא" נשמרת כדי לא להציף את Nominatim
    let hit: { lat: number | null; lng: number | null } = { lat: null, lng: null };
    try {
        hit = await cached(`geocode:${query}`, 7 * 24 * 60 * 60 * 1000, async () => {
            const r = await geocodeAddress(query);
            return r ?? { lat: null, lng: null };
        });
    } catch {
        hit = { lat: null, lng: null };
    }

    setHeaders({ 'cache-control': 'public, max-age=86400' });
    return json(hit);
};
