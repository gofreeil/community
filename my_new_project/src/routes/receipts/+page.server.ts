import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
        throw redirect(302, '/login?redirect=/receipts');
    }

    let user = null;
    try {
        const jwt = event.cookies.get('strapi_jwt');
        user = await getUserById(session.user.id, jwt);
    } catch (e) {
        console.warn('[receipts] getUserById failed:', e);
    }

    // תקבולים — בהמשך יבואו מ-Strapi
    const receipts: { id: number; date: string; description: string; amount: number; type: string }[] = [];

    return {
        user,
        receipts,
        balance: (user as { balance?: number } | null)?.balance ?? 0,
    };
};
