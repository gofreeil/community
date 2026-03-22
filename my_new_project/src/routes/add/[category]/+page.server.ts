import { error, redirect } from '@sveltejs/kit';
import { categoryConfig } from '$lib/categoryFields';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    // ---- Auth guard: חובה להיות מחובר ----
    const session = await event.locals.auth();
    // TEMP_BYPASS — if (!session?.user) { throw redirect(302, `/login?redirect=/add/${event.params.category}`); }

    // ---- טעינת קונפיגורציית קטגוריה ----
    const config = categoryConfig[event.params.category];
    if (!config) {
        error(404, `קטגוריה "${event.params.category}" לא קיימת`);
    }

    return {
        categoryId: event.params.category,
        config,
        userId: session?.user?.id ?? 'guest', // TEMP_BYPASS
    };
};
