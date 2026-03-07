import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // כבר מחובר — הפנה ליעד המבוקש או לדף הבית
    if (session?.user) {
        const redirectTo = event.url.searchParams.get('redirect') ?? '/';
        throw redirect(302, redirectTo);
    }

    return {
        redirectTo: event.url.searchParams.get('redirect') ?? '/',
        error: event.url.searchParams.get('error') ?? null,
    };
};
