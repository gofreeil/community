import { error } from '@sveltejs/kit';
import { getDbItemById } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    const item = await getDbItemById(event.params.id);
    if (!item || item.category !== 'lost_and_found') throw error(404, 'מודעה לא נמצאה');

    return { item, currentUserId: session?.user?.id ?? null };
};
