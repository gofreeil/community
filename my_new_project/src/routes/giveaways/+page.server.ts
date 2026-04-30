import { getItemsByCategory, getUserById } from '$lib/server/db';
import { buildDemoUserItems } from '$lib/demoUserItems';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    const currentUserId = session?.user?.id ?? null;
    const demoOwnerId = currentUserId ?? 'demo-user';
    const demoItems = buildDemoUserItems(demoOwnerId);

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
        const items = await getItemsByCategory('giveaway');
        return { items: [...demoItems, ...items], currentUserId, userNeighborhood, userCity };
    } catch (e) {
        console.warn('[giveaways] load failed:', e instanceof Error ? e.message : e);
        return { items: demoItems, currentUserId, userNeighborhood, userCity };
    }
};
