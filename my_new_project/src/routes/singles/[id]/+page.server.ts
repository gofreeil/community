import { error, redirect } from '@sveltejs/kit';
import { getDbItemById } from '$lib/server/db';
import { mockSingles } from '$lib/singlesMock';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    // דפי פרופיל נחשפים רק למשתמשים רשומים
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) {
        throw redirect(302, '/login?next=' + encodeURIComponent(event.url.pathname));
    }

    const id = event.params.id;

    // קודם ננסה מ-DB (פריט אמיתי), אחר כך mock
    try {
        const dbItem = await getDbItemById(id);
        if (dbItem && dbItem.category === 'singles') {
            return { single: null, dbItem };
        }
    } catch {
        // ignore - ניפול ל-mock
    }

    const single = mockSingles.find((s) => s.id === id);
    if (!single) throw error(404, 'הפרופיל לא נמצא');

    return { single, dbItem: null };
};
