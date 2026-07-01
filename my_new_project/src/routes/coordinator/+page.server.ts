import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById, getItemsByCategory, getPendingEvents, getAllUsers, getAllItems } from '$lib/server/db';

// "אושיות (רחובות)" → { name: "אושיות", city: "רחובות" }
function parseArea(entry: string): { name: string; city: string } {
    const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    return m ? { name: m[1].trim(), city: m[2].trim() } : { name: entry.trim(), city: '' };
}
const stripCity = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator');

    const jwt = event.cookies.get('strapi_jwt');
    const user = await getUserById(session.user.id, jwt ?? undefined);
    if (!user) throw error(403, 'משתמש לא נמצא');

    const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
    const isAdmin       = user.role === 'neighborhood_admin' || user.role === 'super_admin';
    if (!isCoordinator && !isAdmin) {
        throw error(403, 'דף זה זמין רק לרכזי שכונות');
    }

    // השכונות שהרכז מנהל (סופר־אדמין רואה את שכונתו כברירת מחדל)
    const neighborhoods = isAdmin && user.role === 'super_admin'
        ? (user.coordinator_of?.length ? user.coordinator_of : [user.neighborhood].filter(Boolean))
        : user.coordinator_of;

    // התאמה לפי שכונה + עיר (זהה ל-/api/coordinators): שם השכונה תואם, ואם צוינה עיר בסוגריים - גם היא.
    const areas = (neighborhoods ?? []).map(parseArea);
    const inMyNeighborhoods = (it: { neighborhood?: string | null; city?: string | null }) => {
        if (!it.neighborhood) return false;
        const n = stripCity(it.neighborhood);
        return areas.some(a => a.name === n && (a.city ? it.city === a.city : true));
    };

    // סיכום "רק השכונה שלי" ללוח הבקרה של הרכז
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const inThisMonth = (iso?: string | null) => {
        if (!iso) return false;
        const t = new Date(iso).getTime();
        return !isNaN(t) && t >= monthStart;
    };

    // ספירות מהירות לדשבורד
    let emergencyCount = 0, vaadCount = 0, activePollsCount = 0, pendingEventsCount = 0, residentsCount = 0;
    let itemsCount = 0, itemsOnMap = 0, newItemsThisMonth = 0, newResidentsThisMonth = 0;
    try {
        const [emergency, vaad, polls, allUsers, allItems] = await Promise.all([
            getItemsByCategory('emergency_team'),
            getItemsByCategory('vaad_member'),
            getItemsByCategory('poll'),
            getAllUsers().catch(() => []),
            getAllItems().catch(() => []),
        ]);
        emergencyCount   = emergency.filter(inMyNeighborhoods).length;
        vaadCount        = vaad.filter(inMyNeighborhoods).length;
        activePollsCount = polls.filter(inMyNeighborhoods).filter(p => p.status === 'active').length;

        // תושבים שנרשמו תחת השכונה/ות שהרכז מנהל
        const myResidents = allUsers.filter(inMyNeighborhoods);
        residentsCount        = myResidents.length;
        newResidentsThisMonth = myResidents.filter(u => inThisMonth((u as any).created_at)).length;

        // כל הפריטים בשכונה של הרכז - סה"כ, כמה על המפה (עם קואורדינטות), וכמה חדשים החודש
        const myItems = allItems.filter(inMyNeighborhoods);
        itemsCount        = myItems.length;
        itemsOnMap        = myItems.filter(it => it.lat != null && it.lng != null).length;
        newItemsThisMonth = myItems.filter(it => inThisMonth((it as any).created_at)).length;

        // לוח האירועים מחולק לפי עיר - סופרים אירועים ממתינים בעיר של הרכז.
        const pending = user.city ? await getPendingEvents(user.city).catch(() => []) : [];
        pendingEventsCount = pending.length;
    } catch (e) {
        console.warn('[coordinator] dashboard counts failed:', e);
    }

    return {
        user,
        neighborhoods,
        emergencyCount,
        vaadCount,
        activePollsCount,
        pendingEventsCount,
        residentsCount,
        itemsCount,
        itemsOnMap,
        newItemsThisMonth,
        newResidentsThisMonth,
    };
};
