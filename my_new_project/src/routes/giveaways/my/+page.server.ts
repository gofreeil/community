import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getItemsByUserId, resolveItem } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/giveaways/my');

    try {
        const all = await getItemsByUserId(session.user.id);
        const items = all.filter(i => i.category === 'giveaway');
        return { items, currentUserId: session.user.id };
    } catch (e) {
        console.warn('[giveaways/my] load failed:', e instanceof Error ? e.message : e);
        return { items: [], currentUserId: session.user.id };
    }
};

export const actions: Actions = {
    markTaken: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'נדרשת התחברות' });

        const fd           = await event.request.formData();
        const item_id      = fd.get('item_id')?.toString()         ?? '';
        const item_user_id = fd.get('item_user_id')?.toString()    ?? '';

        if (!item_id)                          return fail(400, { error: 'לא נמצא הפריט' });
        if (session.user.id !== item_user_id)  return fail(403, { error: 'אין הרשאה' });

        try {
            await resolveItem(item_id, '[הפריט נמסר]');
        } catch (e) {
            console.error('[giveaways/my] markTaken failed:', e);
            return fail(500, { error: 'שגיאה בעדכון הפריט, נסה שוב' });
        }

        return { taken: true, takenItemId: item_id };
    },

    remove: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'נדרשת התחברות' });

        const fd           = await event.request.formData();
        const item_id      = fd.get('item_id')?.toString()         ?? '';
        const item_user_id = fd.get('item_user_id')?.toString()    ?? '';

        if (!item_id)                          return fail(400, { error: 'לא נמצא הפריט' });
        if (session.user.id !== item_user_id)  return fail(403, { error: 'אין הרשאה' });

        try {
            await resolveItem(item_id, '[הוסר על ידי המוסר]');
        } catch (e) {
            console.error('[giveaways/my] remove failed:', e);
            return fail(500, { error: 'שגיאה בהסרת הפריט, נסה שוב' });
        }

        return { removed: true, removedItemId: item_id };
    },
};
