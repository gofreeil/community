// ============================================================
// GET /api/coordinators
// רשימת רכזי השכונות (ציבורי) - נצרך ע"י neighborhoods.gofreeil.com
// מחזיר לכל רכז: שם, טלפון, תמונה, עיר, שכונות, מספר תושבים רשומים,
// ומספר הפריטים שכבר על המפה (בעלי קואורדינטות) בשכונותיו.
// ============================================================
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllUsers, getAllItems } from '$lib/server/db';

// "אושיות (רחובות)" → { name: "אושיות", city: "רחובות" }
function parseArea(entry: string): { name: string; city: string } {
    const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    return m ? { name: m[1].trim(), city: m[2].trim() } : { name: entry.trim(), city: '' };
}
const stripCity = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();

// טלפון חסר בפרופיל: חילוץ מספר נייד ישראלי המוטמע בכתובת המייל
// (למשל a0504510011@gmail.com → 050-4510011). האימייל עצמו לא נחשף.
function phoneFromEmail(email: string | null | undefined): string {
    const m = (email ?? '').split('@')[0].match(/05\d{8}/);
    return m ? `${m[0].slice(0, 3)}-${m[0].slice(3)}` : '';
}

export const GET: RequestHandler = async () => {
    let coordinators: unknown[] = [];
    try {
        const [users, items] = await Promise.all([getAllUsers(), getAllItems()]);

        coordinators = users
            .filter(u => (u.coordinator_of?.length ?? 0) > 0)
            .map(u => {
                const areas = (u.coordinator_of ?? []).map(parseArea);
                // התאמה לפי שכונה + עיר (זהה ללוח האדמין)
                const matchesArea = (neighborhood?: string | null, city?: string | null) => {
                    const n = neighborhood ? stripCity(neighborhood) : '';
                    return areas.some(a => {
                        // רשומה בלי "(עיר)" ששמה הוא שם העיר = רכז עיר, תופס את כל העיר
                        if (!a.city && city && a.name === city) return true;
                        return !!n && a.name === n && (a.city ? city === a.city : true);
                    });
                };

                // ספירת תושבים רשומים בשכונות שהרכז מנהל
                const residentIds = new Set<string>();
                for (const r of users) {
                    if (matchesArea(r.neighborhood, r.city)) residentIds.add(r.id);
                }

                // ספירת פריטים שכבר על המפה (בעלי lat/lng) בשכונות הרכז
                let itemsOnMap = 0;
                for (const it of items) {
                    if (matchesArea(it.neighborhood, it.city) && it.lat != null && it.lng != null) itemsOnMap++;
                }

                return {
                    id:             u.id,
                    name:           u.name || u.nickname || 'רכז/ת',
                    phone:          u.phone || phoneFromEmail(u.email),
                    avatar_url:     u.avatar_url ?? null,
                    city:           u.city ?? '',
                    neighborhoods:  (u.coordinator_of ?? []).map(stripCity),
                    residentsCount: residentIds.size,
                    itemsOnMap,
                };
            })
            .sort((a, b) => b.residentsCount - a.residentsCount);
    } catch (e) {
        console.warn('[api/coordinators] failed:', e);
    }

    return json({ coordinators }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300',
        },
    });
};
