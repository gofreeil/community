import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById, getItemsByCategory, getPendingEvents } from '$lib/server/db';

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

    // ספירות מהירות לדשבורד
    let emergencyCount = 0, vaadCount = 0, activePollsCount = 0, pendingEventsCount = 0;
    try {
        const [emergency, vaad, polls] = await Promise.all([
            getItemsByCategory('emergency_team'),
            getItemsByCategory('vaad_member'),
            getItemsByCategory('poll'),
        ]);
        const inMyNeighborhoods = (it: { neighborhood: string }) => neighborhoods.includes(it.neighborhood);
        emergencyCount   = emergency.filter(inMyNeighborhoods).length;
        vaadCount        = vaad.filter(inMyNeighborhoods).length;
        activePollsCount = polls.filter(inMyNeighborhoods).filter(p => p.status === 'active').length;

        const pendingArrays = await Promise.all(
            neighborhoods.map(n => getPendingEvents(n).catch(() => []))
        );
        pendingEventsCount = pendingArrays.reduce((sum, arr) => sum + arr.length, 0);
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
    };
};
