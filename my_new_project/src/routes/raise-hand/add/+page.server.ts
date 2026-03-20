import { redirect, fail } from '@sveltejs/kit';
import { createItem } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

const OPTIONS: Record<string, { text: string; icon: string }> = {
    '1': { text: 'מבוגר זקוק לעזרה',                icon: '👴' },
    '2': { text: 'זקוק לעזרה עם הרכב להתנעה',      icon: '🚗' },
    '3': { text: 'הלך ילד לאיבוד',                   icon: '👶' },
    '4': { text: 'קריאת עזרה',                        icon: '🆘' },
    '5': { text: 'אבד כלב',                           icon: '🐕' },
};

export const load: PageServerLoad = async (event) => {
    const optionId = event.url.searchParams.get('option') ?? '4';
    const option   = OPTIONS[optionId] ?? OPTIONS['4'];
    return { optionId, option };
};

export const actions: Actions = {
    default: async (event) => {
        const fd          = await event.request.formData();
        const optionId    = fd.get('option_id')?.toString()           ?? '4';
        const description = fd.get('description')?.toString().trim()  ?? '';
        const location    = fd.get('location')?.toString().trim()     ?? '';
        const contact     = fd.get('contact')?.toString().trim()      ?? '';
        const phone       = fd.get('phone')?.toString().trim()        ?? '';
        const image_b64   = fd.get('image_base64')?.toString()        ?? '';

        if (!description) return fail(400, { error: 'יש לתאר את בקשת העזרה' });
        if (!location)    return fail(400, { error: 'יש למלא מיקום' });
        if (!phone)       return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });

        const option = OPTIONS[optionId] ?? OPTIONS['4'];

        let session = null;
        try { session = await event.locals.auth(); } catch {}

        try {
            await createItem({
                category:    'raise_hand',
                label:       option.text,
                description,
                contact,
                phone,
                address:     location,
                icon:        option.icon,
                color:       'red',
                user_id:     session?.user?.id,
                extra_fields: {
                    option_id: optionId,
                    ...(image_b64 ? { image: image_b64 } : {}),
                },
            });
        } catch (e) {
            console.error('[raise-hand] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירה, נסה שוב' });
        }

        throw redirect(302, '/?help_sent=1');
    },
};
