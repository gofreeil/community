import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getItemsByCategory, getUserById } from '$lib/server/db';
import { categoryConfig } from '$lib/categoryFields';

// הפניות לדפים ארציים שכבר קיימים כדף ייעודי באתר (למנוע כפילות)
const nationalRedirects: Record<string, string> = {
    singles: '/singles',
};

// קטגוריות שיש להן דף ארצי
// ⚠️ אין export - SvelteKit מאפשר רק: load, actions, prerender, csr, ssr, trailingSlash, config, entries, או עם '_' prefix
const nationalCategories: Record<string, { slug: string; title: string }> = {
    security:    { slug: 'security',    title: 'צימרים ונופש' },
    attractions: { slug: 'attractions', title: 'שירות ציבורי' },
    jobs:        { slug: 'jobs',        title: 'דרושים עובדים' },
    restaurants: { slug: 'restaurants', title: 'מזון מהיר ומסעדות' },
    halls:       { slug: 'halls',       title: 'אולמות וחללים - לאירועים ולחוגים' },
};

export const load: PageServerLoad = async (event) => {
    const categoryId = event.params.category;

    if (nationalRedirects[categoryId]) {
        redirect(308, nationalRedirects[categoryId]);
    }

    if (!nationalCategories[categoryId]) {
        error(404, `אין דף ארצי לקטגוריה "${categoryId}"`);
    }

    const config = categoryConfig[categoryId];
    if (!config) {
        error(404, `קטגוריה לא קיימת`);
    }

    let items: import('$lib/server/db').DbItem[] = [];
    try {
        items = await getItemsByCategory(categoryId);
    } catch (err) {
        console.error(`[national/${categoryId}] getItemsByCategory failed:`, err);
    }

    // מיקום המשתמש מהפרופיל - לשכבות "באזורך / בעירך / סביבך / ארצי"
    let userNeighborhood: string | null = null;
    let userCity: string | null = null;
    try {
        const session = await event.locals.auth();
        const uid = session?.user?.id ?? null;
        if (uid) {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(uid, jwt);
            if (user?.neighborhood) userNeighborhood = user.neighborhood;
            if (user?.city) userCity = user.city;
        }
    } catch {}

    return {
        categoryId,
        // מחזירים רק את מה שהעמוד צריך (icon + label) - מונע בעיות serialization
        config: { icon: config.icon, label: config.label },
        items,
        meta: nationalCategories[categoryId],
        userNeighborhood,
        userCity,
    };
};
