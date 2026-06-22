import { error } from '@sveltejs/kit';
import { getDbItemById } from '$lib/server/db';
import { mockSingles } from '$lib/singlesMock';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const id = params.id;

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
