import { redirect, fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDbItemById, updateItem } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) throw redirect(302, `/login?redirect=/giveaways/edit/${event.params.id}`);

    const item = await getDbItemById(event.params.id);
    if (!item)                                throw error(404, 'הפריט לא נמצא');
    if (item.user_id !== session.user.id)     throw error(403, 'אין הרשאה לערוך פריט זה');
    if (item.category !== 'giveaway')         throw error(400, 'פריט זה אינו פריט למסירה');

    let extra: Record<string, unknown> = {};
    try { extra = JSON.parse(item.extra_fields || '{}'); } catch {}

    return { item, extra };
};

export const actions: Actions = {
    default: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, `/login?redirect=/giveaways/edit/${event.params.id}`);

        const item = await getDbItemById(event.params.id);
        if (!item)                              return fail(404, { error: 'הפריט לא נמצא' });
        if (item.user_id !== session.user.id)   return fail(403, { error: 'אין הרשאה' });

        const fd          = await event.request.formData();
        const images_json = fd.get('images_json')?.toString() ?? '';
        let images: string[] = [];
        try { const parsed = JSON.parse(images_json); if (Array.isArray(parsed)) images = parsed.filter(s => typeof s === 'string'); } catch {}

        if (images.length === 0) return fail(400, { error: 'יש לצרף לפחות תמונה אחת כדי לפרסם' });

        let extra: Record<string, unknown> = {};
        try { extra = JSON.parse(item.extra_fields || '{}'); } catch {}
        extra.image  = images[0];
        extra.images = images;

        try {
            await updateItem(item.id, {
                extra_fields: extra,
                status:       'active',
            });
        } catch (e) {
            console.error('[giveaways/edit] publish failed:', e);
            return fail(500, { error: 'שגיאה בפרסום, נסה שוב' });
        }

        throw redirect(303, '/giveaways/my?published=1');
    },
};
