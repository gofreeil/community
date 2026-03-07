import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getItemsByCategory } from '$lib/server/db';
import { categoryConfig } from '$lib/categoryFields';

// קטגוריות שיש להן דף ארצי
export const nationalCategories: Record<string, { slug: string; title: string }> = {
    singles:     { slug: 'singles',     title: 'שידוכים — פנויים ופנויות' },
    security:    { slug: 'security',    title: 'צימרים ונופש' },
    attractions: { slug: 'attractions', title: 'אטרקציות' },
    jobs:        { slug: 'jobs',        title: 'דרושים עובדים' },
};

export const load: PageServerLoad = async ({ params }) => {
    const categoryId = params.category;

    if (!nationalCategories[categoryId]) {
        error(404, `אין דף ארצי לקטגוריה "${categoryId}"`);
    }

    const config = categoryConfig[categoryId];
    if (!config) {
        error(404, `קטגוריה לא קיימת`);
    }

    const items = getItemsByCategory(categoryId);

    return {
        categoryId,
        config,
        items,
        meta: nationalCategories[categoryId],
    };
};
