import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserById, updateUserProfile, getItemsByUserId } from '$lib/server/db';
import { citiesData } from '$lib/neighborhoodsData';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
        throw redirect(302, '/login?redirect=/profile');
    }

    let user, items;
    try {
        user  = getUserById(session.user.id);
    } catch (e) {
        console.warn('[profile] getUserById failed:', e);
    }
    try {
        items = await getItemsByUserId(session.user.id);
    } catch (e) {
        console.warn('[profile] getItemsByUserId failed:', e);
        items = [];
    }

    // fallback לתמונת OAuth אם אין avatar_url ב-DB
    const resolvedUser = user
        ? {
            ...user,
            avatar_url: user.avatar_url || session.user?.image || null,
            email:      user.email      || session.user?.email || null,
          }
        : null;

    return { user: resolvedUser, items: items ?? [], citiesData };
};

export const actions: Actions = {
    updateProfile: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/profile');

        const formData      = await event.request.formData();
        const name          = formData.get('name')?.toString().trim()          ?? '';
        const email         = formData.get('email')?.toString().trim()         ?? '';
        const nickname      = formData.get('nickname')?.toString().trim()      ?? '';
        const phone         = formData.get('phone')?.toString().trim()         ?? '';
        const city          = formData.get('city')?.toString().trim()          ?? '';
        const neighborhood  = formData.get('neighborhood')?.toString().trim()  ?? '';
        const business      = formData.get('business')?.toString().trim()      ?? '';
        const family_status = formData.get('family_status')?.toString()        ?? '';
        const gender        = formData.get('gender')?.toString()               ?? '';
        const notifications = formData.get('notifications') === 'true' ? 1 : 0;
        const avatarBase64  = formData.get('avatar_base64')?.toString()        ?? '';

        if (!name || name.length < 2) {
            return fail(400, { error: 'שם חייב להכיל לפחות 2 תווים' });
        }

        try {
            updateUserProfile(session.user.id, {
                name,
                email,
                nickname,
                phone,
                city,
                neighborhood,
                business,
                family_status,
                gender,
                notifications,
                ...(avatarBase64 ? { avatar_url: avatarBase64 } : {}),
            });
            return { success: true };
        } catch {
            return fail(500, { error: 'שגיאה בעדכון הפרופיל' });
        }
    },
};
