import { getItemsByCategory, getUserById } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    let userNeighborhood: string | null = null;
    let userCity: string | null = null;
    try {
        const uid = session?.user?.id ?? null;
        if (uid) {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(uid, jwt);
            if (user?.neighborhood) userNeighborhood = user.neighborhood;
            if (user?.city) userCity = user.city;
        }
    } catch {}

    try {
        const items = await getItemsByCategory('ride');
        return { items, currentUserId: session?.user?.id ?? null, userNeighborhood, userCity };
    } catch (e) {
        console.warn('[rides] load failed:', e instanceof Error ? e.message : e);
        return { items: [], currentUserId: null, userNeighborhood, userCity };
    }
};
