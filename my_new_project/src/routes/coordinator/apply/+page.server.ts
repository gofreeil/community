import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth?.();

    if (!session?.user?.id) {
        return {
            user: null,
        };
    }

    const { getUserById } = await import('$lib/server/db');
    const user = await getUserById(session.user.id);

    return {
        user: user ? {
            name: user.name,
            phone: user.phone,
        } : null,
    };
};
