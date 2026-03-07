import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserById, updateUserProfile, getItemsByUserId } from '$lib/server/db';
import { citiesData } from '$lib/neighborhoodsData';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
        throw redirect(302, '/login?redirect=/profile');
    }

    const user  = getUserById(session.user.id);
    const items = getItemsByUserId(session.user.id);

    return {
        user,
        items,
        citiesData,
    };
};

export const actions: Actions = {
    updateProfile: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) {
            throw redirect(302, '/login?redirect=/profile');
        }

        const formData = await event.request.formData();
        const name         = formData.get('name')?.toString().trim()         ?? '';
        const phone        = formData.get('phone')?.toString().trim()        ?? '';
        const neighborhood = formData.get('neighborhood')?.toString().trim() ?? '';
        const city         = formData.get('city')?.toString().trim()         ?? '';

        if (!name || name.length < 2) {
            return fail(400, { error: 'שם חייב להכיל לפחות 2 תווים' });
        }

        try {
            updateUserProfile(session.user.id, { name, phone, neighborhood, city });
            return { success: true };
        } catch {
            return fail(500, { error: 'שגיאה בעדכון הפרופיל' });
        }
    },
};
