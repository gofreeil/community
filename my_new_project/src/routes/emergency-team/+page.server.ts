import { getItemsByCategory, getUserById } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    let userNeighborhood: string | null = null;
    if (session?.user?.id) {
        try {
            const user = await getUserById(session.user.id);
            userNeighborhood = user?.neighborhood ?? null;
        } catch {}
    }

    const url = new URL(event.url);
    const requestedNeighborhood = url.searchParams.get('neighborhood') || userNeighborhood;

    let members: Awaited<ReturnType<typeof getItemsByCategory>> = [];
    try {
        const all = await getItemsByCategory('emergency_team');
        members = requestedNeighborhood
            ? all.filter(m => m.neighborhood === requestedNeighborhood)
            : all;
    } catch (e) {
        console.warn('[emergency-team] load failed:', e);
    }

    return {
        members,
        currentNeighborhood: requestedNeighborhood,
    };
};
