import { getItemsByCategory } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    try {
        const items = await getItemsByCategory('job');
        return { items, currentUserId: session?.user?.id ?? null };
    } catch (e) {
        console.warn('[jobs] load failed:', e instanceof Error ? e.message : e);
        return { items: [], currentUserId: null };
    }
};
