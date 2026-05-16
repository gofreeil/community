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
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/deliveries/add');

        const fd          = await event.request.formData();
        const role        = fd.get('role')?.toString()              ?? '';
        const from        = fd.get('from')?.toString().trim()        ?? '';
        const to          = fd.get('to')?.toString().trim()          ?? '';
        const date        = fd.get('date')?.toString().trim()        ?? '';
        const time        = fd.get('time')?.toString().trim()        ?? '';
        const item        = fd.get('item')?.toString().trim()        ?? '';
        const description = fd.get('description')?.toString().trim() ?? '';
        const contact     = fd.get('contact')?.toString().trim()     ?? '';
        const phone       = fd.get('phone')?.toString().trim()       ?? '';

        if (role !== 'courier' && role !== 'sender')
            return fail(400, { error: 'יש לבחור: נהג מתנדב או מוסר חבילה' });
        if (!from)  return fail(400, { error: 'יש למלא נקודת מוצא' });
        if (!to)    return fail(400, { error: 'יש למלא יעד' });
        if (role === 'sender' && !item)
            return fail(400, { error: 'יש לתאר את החבילה למסירה' });
        if (!phone) return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });

        try {
            await createItem({
                category:    'delivery',
                label:       role === 'courier' ? `נהג בדרך: ${from} ← ${to}` : `חבילה למסירה: ${from} ← ${to}`,
                description,
                contact,
                phone,
                address:     from,
                icon:        role === 'courier' ? '🚚' : '📦',
                color:       role === 'courier' ? 'green' : 'orange',
                extra_fields: { role, from, to, date, time, item },
                user_id:     session.user.id,
            });
        } catch (e) {
            console.error('[deliveries] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירת המודעה, נסה שוב' });
        }

        throw redirect(303, '/deliveries');
    },
};
