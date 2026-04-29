import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createItem, getUserById } from '$lib/server/db';
import { categoryConfig } from '$lib/categoryFields';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    if (!session?.user?.id) {
        return {
            userId: null,
            defaults: { name: '', phone: '', neighborhood: '', city: '' },
        };
    }

    let defaults = { name: '', phone: '', neighborhood: '', city: '' };
    try {
        const jwt = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt);
        if (user) {
            defaults = {
                name:         user.name ?? user.nickname ?? '',
                phone:        user.phone ?? '',
                neighborhood: user.neighborhood ?? '',
                city:         user.city ?? '',
            };
        }
    } catch (e) {
        console.warn('[giveaways/add] failed to load user defaults:', e instanceof Error ? e.message : e);
    }

    return { userId: session.user.id, defaults };
};

export const actions: Actions = {
    default: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/giveaways/add');

        const fd           = await event.request.formData();
        const label        = fd.get('label')?.toString().trim()        ?? '';
        const category     = fd.get('category')?.toString().trim()     ?? '';
        const condition    = fd.get('condition')?.toString().trim()    ?? '';
        const description  = fd.get('description')?.toString().trim()  ?? '';
        const address      = fd.get('address')?.toString().trim()      ?? '';
        const contact      = fd.get('contact')?.toString().trim()      ?? '';
        const phone        = fd.get('phone')?.toString().trim()        ?? '';
        const tags         = fd.get('tags')?.toString().trim()         ?? '';
        const neighborhood = fd.get('neighborhood')?.toString().trim() ?? '';
        const city         = fd.get('city')?.toString().trim()         ?? '';
        const images_json  = fd.get('images_json')?.toString()         ?? '';
        let images: string[] = [];
        try { const parsed = JSON.parse(images_json); if (Array.isArray(parsed)) images = parsed.filter(s => typeof s === 'string'); } catch {}

        const priceRaw = fd.get('price')?.toString().trim() ?? '';
        const priceNum = priceRaw ? parseInt(priceRaw, 10) : 0;
        const price    = Number.isFinite(priceNum) && priceNum > 0 ? Math.min(priceNum, 500) : 0;

        const validConditions = categoryConfig.giveaway.fields.find(f => f.key === 'condition')?.options ?? [];

        if (!label)                              return fail(400, { error: 'יש למלא שם פריט' });
        if (!condition || !validConditions.includes(condition))
                                                 return fail(400, { error: 'יש לבחור מצב פריט' });
        if (!description)                        return fail(400, { error: 'יש לכתוב תיאור' });
        if (!contact)                            return fail(400, { error: 'יש למלא שם ליצירת קשר' });
        if (!phone)                              return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });
        if (!city)                               return fail(400, { error: 'יש לבחור עיר' });
        if (!neighborhood)                       return fail(400, { error: 'יש לבחור שכונה' });

        const isDraft = images.length === 0;

        try {
            await createItem({
                category:     'giveaway',
                label,
                description,
                contact,
                phone,
                address,
                neighborhood,
                city,
                icon:         categoryConfig.giveaway.icon,
                color:        categoryConfig.giveaway.color,
                extra_fields: {
                    condition,
                    category: category || undefined,
                    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                    ...(images.length > 0 ? { image: images[0], images } : {}),
                    ...(price > 0 ? { price } : {}),
                },
                user_id:      session.user.id,
                status:       isDraft ? 'draft' : 'active',
            });
        } catch (e) {
            console.error('[giveaways] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירת הפריט, נסה שוב' });
        }

        if (isDraft) throw redirect(303, '/giveaways/my?draft=saved');
        throw redirect(303, '/giveaways');
    },
};
