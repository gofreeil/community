import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAd } from '$lib/server/adsStore';

export const load: PageServerLoad = async ({ params }) => {
    const ad = await getAd(params.id);
    if (!ad || ad.status !== 'approved') {
        throw error(404, 'הפרסומת לא נמצאה');
    }
    return { ad };
};
