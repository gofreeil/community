import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createItem, getUserById } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    let userCity: string | null = null;
    let userNeighborhood: string | null = null;
    if (session?.user?.id) {
        try {
            const user = await getUserById(session.user.id);
            userCity         = user?.city         || null;
            userNeighborhood = user?.neighborhood || null;
        } catch {}
    }

    return {
        userId: session?.user?.id ?? null,
        userCity,
        userNeighborhood,
    };
};

export const actions: Actions = {
    default: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/gmachim/add');

        const fd           = await event.request.formData();
        const title        = fd.get('title')?.toString().trim()        ?? '';
        const description  = fd.get('description')?.toString().trim()  ?? '';
        const address      = fd.get('address')?.toString().trim()      ?? '';
        const hours        = fd.get('hours')?.toString().trim()        ?? '';
        const contact      = fd.get('contact')?.toString().trim()      ?? '';
        const phone        = fd.get('phone')?.toString().trim()        ?? '';
        const icon         = fd.get('icon')?.toString().trim()         || '🤝';
        const city         = fd.get('city')?.toString().trim()         ?? '';
        const neighborhood = fd.get('neighborhood')?.toString().trim() ?? '';
        const gmachType    = fd.get('gmach_type')?.toString().trim()   ?? '';
        const logoBase64   = fd.get('logo_base64')?.toString()         ?? '';
        const imagesJson   = fd.get('images_json')?.toString()         ?? '';
        const tagsJson     = fd.get('tags_json')?.toString()           ?? '';

        let images: string[] = [];
        try {
            const parsed = JSON.parse(imagesJson || '[]');
            if (Array.isArray(parsed)) images = parsed.filter(s => typeof s === 'string');
        } catch {}

        let tags: string[] = [];
        try {
            const parsed = JSON.parse(tagsJson || '[]');
            if (Array.isArray(parsed)) tags = parsed.filter(s => typeof s === 'string' && s.trim().length > 0);
        } catch {}

        if (!title)        return fail(400, { error: 'יש למלא שם הגמ"ח' });
        if (!phone)        return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });
        if (!address)      return fail(400, { error: 'יש למלא כתובת מדויקת' });
        if (!city)         return fail(400, { error: 'יש לבחור עיר (חובה לאתר הארצי)' });
        if (!neighborhood) return fail(400, { error: 'יש לבחור שכונה (חובה לאתר הארצי)' });

        try {
            await createItem({
                category:     'gmach',
                label:        title,
                description,
                contact,
                phone,
                address,
                icon,
                color:        'amber',
                city,
                neighborhood,
                extra_fields: {
                    hours,
                    gmach_type: gmachType,
                    ...(logoBase64 ? { logo: logoBase64 } : {}),
                    ...(images.length > 0 ? { images } : {}),
                    ...(tags.length > 0 ? { tags } : {}),
                },
                user_id:      session.user.id,
            });
        } catch (e) {
            console.error('[gmachim] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירת המודעה, נסה שוב' });
        }

        throw redirect(303, '/gmachim?added=1');
    },
};
