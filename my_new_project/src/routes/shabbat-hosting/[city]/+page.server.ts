import { getItemsByCategory } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const cityParam = decodeURIComponent(event.params.city ?? '').trim();
    try {
        const all = await getItemsByCategory('realestate');
        const items = cityParam
            ? all.filter(it => (it.city ?? '').trim() === cityParam || (it.address ?? '').includes(cityParam))
            : all;
        return { items, city: cityParam };
    } catch (e) {
        console.warn('[shabbat-hosting/city] load failed:', e instanceof Error ? e.message : e);
        return { items: [], city: cityParam };
    }
};
