import { getItemsByCategory } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const items = await getItemsByCategory('business');
        return { items };
    } catch (e) {
        console.warn('[babysitters] load failed:', e instanceof Error ? e.message : e);
        return { items: [] };
    }
};
