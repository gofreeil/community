import { error } from '@sveltejs/kit';
import { categoryConfig } from '$lib/categoryFields';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const config = categoryConfig[params.category];
    if (!config) {
        error(404, `קטגוריה "${params.category}" לא קיימת`);
    }
    return {
        categoryId: params.category,
        config,
    };
};
