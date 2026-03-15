import { getAllItems } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const dbItems = await getAllItems();
        return { dbItems };
    } catch (e) {
        console.warn('[home] getAllItems failed:', e instanceof Error ? e.message : e);
        return { dbItems: [] };
    }
};
