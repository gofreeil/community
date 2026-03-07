import { getAllItems } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const dbItems = getAllItems();
    return { dbItems };
};
