import { getItemsByCategory, getUserById } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    const currentUserId = session?.user?.id ?? null;

    let userNeighborhood: string | null = null;
    let userCity:         string | null = null;
    if (currentUserId) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(currentUserId, jwt);
            if (user?.neighborhood) userNeighborhood = user.neighborhood;
            if (user?.city)         userCity         = user.city;
        } catch {}
    }

    try {
        const items = await getItemsByCategory('business');
        return { items, userNeighborhood, userCity };
    } catch (e) {
        console.warn('[babysitters] load failed:', e instanceof Error ? e.message : e);
        return { items: [], userNeighborhood, userCity };
    }
};
