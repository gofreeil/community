// ============================================================
// GET /api/coordinators
// רשימת רכזי השכונות (ציבורי) - נצרך ע"י neighborhoods.gofreeil.com
// מחזיר לכל רכז: שם, טלפון, תמונה, עיר, שכונות, ומספר תושבים רשומים
// ============================================================
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllUsers } from '$lib/server/db';

// "אושיות (רחובות)" → { name: "אושיות", city: "רחובות" }
function parseArea(entry: string): { name: string; city: string } {
    const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    return m ? { name: m[1].trim(), city: m[2].trim() } : { name: entry.trim(), city: '' };
}
const stripCity = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();

export const GET: RequestHandler = async () => {
    let coordinators: unknown[] = [];
    try {
        const users = await getAllUsers();

        coordinators = users
            .filter(u => (u.coordinator_of?.length ?? 0) > 0)
            .map(u => {
                const areas = (u.coordinator_of ?? []).map(parseArea);
                // ספירת תושבים רשומים בשכונות שהרכז מנהל (התאמה לפי שכונה + עיר)
                const residentIds = new Set<string>();
                for (const r of users) {
                    if (!r.neighborhood) continue;
                    const rn = stripCity(r.neighborhood);
                    const match = areas.some(a => a.name === rn && (a.city ? r.city === a.city : true));
                    if (match) residentIds.add(r.id);
                }
                return {
                    id:             u.id,
                    name:           u.name || u.nickname || 'רכז/ת',
                    phone:          u.phone ?? '',
                    avatar_url:     u.avatar_url ?? null,
                    city:           u.city ?? '',
                    neighborhoods:  (u.coordinator_of ?? []).map(stripCity),
                    residentsCount: residentIds.size,
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
