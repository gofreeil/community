import { error, redirect } from '@sveltejs/kit';
import { categoryConfig } from '$lib/categoryFields';
import { getUserById } from '$lib/server/db';
import type { PageServerLoad } from './$types';

const DEDICATED_ROUTES: Record<string, string> = {
    gemachim: '/gmachim/add',
};

export const load: PageServerLoad = async (event) => {
    const dedicated = DEDICATED_ROUTES[event.params.category];
    if (dedicated) throw redirect(302, dedicated);

    const session = await event.locals.auth();

    const config = categoryConfig[event.params.category];
    if (!config) {
        error(404, `קטגוריה "${event.params.category}" לא קיימת`);
    }

    let userProfile: { nickname: string; phone: string; neighborhood: string; city: string } | null = null;
    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            const u = await getUserById(session.user.id as string, jwt);
            if (u) userProfile = { nickname: u.nickname ?? '', phone: u.phone ?? '', neighborhood: u.neighborhood ?? '', city: u.city ?? '' };
        } catch { /* שקט */ }
    }

    return {
        categoryId: event.params.category,
        config,
        userId: session?.user?.id ?? null,
        userProfile,
    };
};
