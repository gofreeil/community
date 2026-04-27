import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createItem } from '$lib/server/db';
import { categoryConfig } from '$lib/categoryFields';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    return { userId: session?.user?.id ?? null };
};

export const actions: Actions = {
    default: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/giveaways/add');

        const fd          = await event.request.formData();
        const label       = fd.get('label')?.toString().trim()       ?? '';
        const condition   = fd.get('condition')?.toString().trim()   ?? '';
        const description = fd.get('description')?.toString().trim() ?? '';
        const address     = fd.get('address')?.toString().trim()     ?? '';
        const contact     = fd.get('contact')?.toString().trim()     ?? '';
        const phone       = fd.get('phone')?.toString().trim()       ?? '';
        const tags        = fd.get('tags')?.toString().trim()        ?? '';

        const validConditions = categoryConfig.giveaway.fields.find(f => f.key === 'condition')?.options ?? [];

        if (!label)                              return fail(400, { error: 'יש למלא שם פריט' });
        if (!condition || !validConditions.includes(condition))
                                                 return fail(400, { error: 'יש לבחור מצב פריט' });
        if (!description)                        return fail(400, { error: 'יש לכתוב תיאור' });
        if (!contact)                            return fail(400, { error: 'יש למלא שם ליצירת קשר' });
        if (!phone)                              return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });

        try {
            await createItem({
                category:    'giveaway',
                label,
                description,
                contact,
                phone,
                address,
                icon:        categoryConfig.giveaway.icon,
                color:       categoryConfig.giveaway.color,
                extra_fields: {
                    condition,
                    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                },
                user_id:     session.user.id,
            });
        } catch (e) {
            console.error('[giveaways] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירת הפריט, נסה שוב' });
        }

        throw redirect(303, '/giveaways');
    },
};
