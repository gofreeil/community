import { error, fail, redirect } from '@sveltejs/kit';
import { getDbItemById, resolveItem, deleteItem } from '$lib/server/db';
import { isSuperAdmin } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    const item = await getDbItemById(event.params.id);
    if (!item || item.category !== 'lost_and_found') throw error(404, 'מודעה לא נמצאה');

    return { item, currentUserId: session?.user?.id ?? null, isSuperAdmin: isSuperAdmin(session) };
};

export const actions: Actions = {
    // הורדת מודעה על ידי הבעלים - "רזולוציה" רכה עם טלפון המחזיר
    resolveItem: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { resolveError: 'נדרשת התחברות' });

        const fd             = await event.request.formData();
        const item_user_id   = fd.get('item_user_id')?.toString()          ?? '';
        const resolver_phone = fd.get('resolver_phone')?.toString().trim() ?? '';

        if (session.user.id !== item_user_id) return fail(403, { resolveError: 'אין הרשאה' });
        if (!resolver_phone)                  return fail(400, { resolveError: 'יש למלא מספר טלפון' });

        try {
            await resolveItem(event.params.id, resolver_phone);
        } catch (e) {
            console.error('[resolveItem] failed:', e);
            return fail(500, { resolveError: 'שגיאה בהסרת המודעה, נסה שוב' });
        }

        throw redirect(303, '/lost-and-found');
    },

    // מחיקה מלאה על ידי סופר-אדמין - לתוכן לא ראוי / מודעות של משתמשים אחרים
    adminDeleteItem: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!isSuperAdmin(session)) return fail(403, { adminDeleteError: 'נדרשת הרשאת מנהל ראשי' });

        try {
            await deleteItem(event.params.id);
        } catch (e) {
            console.error('[adminDeleteItem] failed:', e);
            return fail(500, { adminDeleteError: 'שגיאה במחיקת המודעה, נסה שוב' });
        }

        throw redirect(303, '/lost-and-found');
    },
};
