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
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/jobs/add');

        const fd          = await event.request.formData();
        const job_type    = fd.get('job_type')?.toString()           ?? '';
        const title       = fd.get('title')?.toString().trim()       ?? '';
        const description = fd.get('description')?.toString().trim() ?? '';
        const address     = fd.get('address')?.toString().trim()     ?? '';
        const hours       = fd.get('hours')?.toString().trim()       ?? '';
        const salary      = fd.get('salary')?.toString().trim()      ?? '';
        const contact     = fd.get('contact')?.toString().trim()     ?? '';
        const phone       = fd.get('phone')?.toString().trim()       ?? '';

        if (job_type !== 'offering' && job_type !== 'seeking')
            return fail(400, { error: 'יש לבחור: דרוש/ה או מחפש/ת עבודה' });
        if (!title) return fail(400, { error: 'יש למלא כותרת' });
        if (!phone) return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });

        try {
            await createItem({
                category:    'job',
                label:       title,
                description,
                contact,
                phone,
                address,
                icon:        job_type === 'offering' ? '💼' : '👤',
                color:       job_type === 'offering' ? 'emerald' : 'violet',
                extra_fields: { job_type, hours, salary },
                user_id:     session.user.id,
            });
        } catch (e) {
            console.error('[jobs] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירת המודעה, נסה שוב' });
        }

        throw redirect(303, '/jobs');
    },
};
