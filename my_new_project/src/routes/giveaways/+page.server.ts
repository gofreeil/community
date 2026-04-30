import { getItemsByCategory } from '$lib/server/db';
import { buildDemoUserItems } from '$lib/demoUserItems';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    const currentUserId = session?.user?.id ?? null;
    const demoOwnerId = currentUserId ?? 'demo-user';
    const demoItems = buildDemoUserItems(demoOwnerId);

    try {
        const items = await getItemsByCategory('giveaway');
        return { items: [...demoItems, ...items], currentUserId };
    } catch (e) {
        console.warn('[giveaways] load failed:', e instanceof Error ? e.message : e);
        return { items: demoItems, currentUserId };
    }
};
