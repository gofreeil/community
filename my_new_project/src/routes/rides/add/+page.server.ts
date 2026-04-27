import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createItem } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    return { userId: session?.user?.id ?? null };
};

export const actions: Actions = {
    default: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/rides/add');

        const fd          = await event.request.formData();
        const direction   = fd.get('direction')?.toString()           ?? '';
        const from        = fd.get('from')?.toString().trim()         ?? '';
        const to          = fd.get('to')?.toString().trim()           ?? '';
        const date        = fd.get('date')?.toString().trim()         ?? '';
        const time        = fd.get('time')?.toString().trim()         ?? '';
        const seats       = fd.get('seats')?.toString().trim()        ?? '';
        const description = fd.get('description')?.toString().trim() ?? '';
        const contact     = fd.get('contact')?.toString().trim()     ?? '';
        const phone       = fd.get('phone')?.toString().trim()       ?? '';

        if (direction !== 'driver' && direction !== 'passenger')
            return fail(400, { error: 'יש לבחור: מציע או מחפש טרמפ' });
        if (!from)  return fail(400, { error: 'יש למלא נקודת מוצא' });
        if (!to)    return fail(400, { error: 'יש למלא יעד' });
        if (!phone) return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });

        try {
            await createItem({
                category:    'ride',
                label:       `${from} ← ${to}`,
                description,
                contact,
                phone,
                address:     from,
                icon:        direction === 'driver' ? '🚙' : '🙋',
                color:       direction === 'driver' ? 'green' : 'orange',
                extra_fields: { direction, from, to, date, time, seats },
                user_id:     session.user.id,
            });
        } catch (e) {
            console.error('[rides] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירת המודעה, נסה שוב' });
        }

        throw redirect(303, '/rides');
    },
};
