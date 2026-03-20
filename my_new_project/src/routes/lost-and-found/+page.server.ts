import { getItemsByCategory } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const items = await getItemsByCategory('lost_and_found');
        return { items };
    } catch (e) {
        console.warn('[lost-and-found] load failed:', e instanceof Error ? e.message : e);
        return { items: [] };
    }
};
