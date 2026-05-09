import { getItemsByCategory } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const items = await getItemsByCategory('realestate');
        return { items, city: null as string | null };
    } catch (e) {
        console.warn('[shabbat-hosting] load failed:', e instanceof Error ? e.message : e);
        return { items: [], city: null as string | null };
    }
};
