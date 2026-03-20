import { redirect } from '@sveltejs/kit';
import { getMessagesByUserId } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    if (!session?.user?.id) {
        throw redirect(302, '/login?redirect=/messages');
    }

    try {
        const messages = await getMessagesByUserId(session.user.id);
        return { messages };
    } catch (e) {
        console.warn('[messages] load failed:', e instanceof Error ? e.message : e);
        return { messages: [] };
    }
};
