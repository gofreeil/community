import { getItemsByCategory, createItem, resolveItem, getResolvedCount } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    try {
        const [items, returnedCount] = await Promise.all([
            getItemsByCategory('lost_and_found'),
            getResolvedCount('lost_and_found'),
        ]);
        return { items, currentUserId: session?.user?.id ?? null, returnedCount };
    } catch (e) {
        console.warn('[lost-and-found] load failed:', e instanceof Error ? e.message : e);
        return { items: [], currentUserId: null, returnedCount: 0 };
    }
};

export const actions: Actions = {
    sendMessage: async (event) => {
        const fd           = await event.request.formData();
        const recipient_id = fd.get('recipient_id')?.toString()        ?? '';
        const item_label   = fd.get('item_label')?.toString()          ?? '';
        const message      = fd.get('message')?.toString().trim()      ?? '';
        const sender_name  = fd.get('sender_name')?.toString().trim()  ?? '';
        const sender_phone = fd.get('sender_phone')?.toString().trim() ?? '';

        if (!recipient_id) return fail(400, { msgError: 'לא ניתן לזהות את הפורסם' });
        if (!message)      return fail(400, { msgError: 'יש לכתוב הודעה' });
        if (!sender_name)  return fail(400, { msgError: 'יש למלא שם ליצירת קשר' });
        if (!sender_phone) return fail(400, { msgError: 'יש למלא מספר טלפון' });

        let session = null;
        try { session = await event.locals.auth(); } catch {}

        try {
            await createItem({
                category:    'message',
                label:       `הודעה על: ${item_label}`,
                description: message,
                contact:     sender_name,
                phone:       sender_phone,
                user_id:     recipient_id,
                icon:        '✉️',
                color:       'blue',
                extra_fields: {
                    sender_id:    session?.user?.id ?? null,
                    sender_name,
                    sender_phone,
                    item_label,
                    read:         false,
                },
            });
        } catch (e) {
            console.error('[sendMessage] failed:', e);
            return fail(500, { msgError: 'שגיאה בשליחה, נסה שוב' });
        }

        return { msgSent: true };
    },

    resolveItem: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { resolveError: 'נדרשת התחברות' });

        const fd             = await event.request.formData();
        const item_id        = fd.get('item_id')?.toString()          ?? '';
        const item_user_id   = fd.get('item_user_id')?.toString()     ?? '';
        const resolver_phone = fd.get('resolver_phone')?.toString().trim() ?? '';

        if (session.user.id !== item_user_id) return fail(403, { resolveError: 'אין הרשאה' });
        if (!resolver_phone)                  return fail(400, { resolveError: 'יש למלא מספר טלפון' });

        try {
            await resolveItem(item_id, resolver_phone);
        } catch (e) {
            console.error('[resolveItem] failed:', e);
            return fail(500, { resolveError: 'שגיאה בהסרת המודעה, נסה שוב' });
        }

        return { resolved: true, resolvedItemId: item_id };
    },
};
