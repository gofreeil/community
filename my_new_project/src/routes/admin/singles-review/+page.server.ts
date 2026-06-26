import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getUserById,
    getUserByEmail,
    getItemsByCategoryAndStatus,
    updateItem,
    adminDeleteItem,
} from '$lib/server/db';
import { dbItemToProfile } from '$lib/singlesMap';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSuperAdmin(event: any) {
    const session = await event.locals.auth();
    let isSA = session?.user?.role === 'super_admin';
    if (!isSA && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            isSA = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!isSA) throw error(403, 'נדרשת הרשאת מנהל ראשי');
    return session;
}

export const load: PageServerLoad = async (event) => {
    await ensureSuperAdmin(event);

    const [pendingItems, activeItems] = await Promise.all([
        getItemsByCategoryAndStatus('singles', 'pending').catch(() => []),
        getItemsByCategoryAndStatus('singles', 'active').catch(() => []),
    ]);

    // ממפה לפרופיל (שם, גיל, עיר, מגדר, תמונות) ומשאיר את התמונות הגולמיות לבדיקה
    const pending = pendingItems.map((it) => ({ ...dbItemToProfile(it), createdAt: it.created_at }));
    const active = activeItems.map((it) => ({ ...dbItemToProfile(it), createdAt: it.created_at }));

    return { pending, active };
};

export const actions: Actions = {
    approve: async (event) => {
        await ensureSuperAdmin(event);
        const id = (await event.request.formData()).get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            await updateItem(id, { status: 'active' });
            return { success: true, message: 'הכרטיס אושר ופורסם בלוח ✅' };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    reject: async (event) => {
        await ensureSuperAdmin(event);
        const id = (await event.request.formData()).get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            // החזרה ל-rejected: לא מוצג בלוח, אך לא נמחק (המשתמש יכול לערוך ולשלוח שוב)
            await updateItem(id, { status: 'rejected' });
            return { success: true, message: 'הכרטיס נדחה - לא יוצג בלוח 🚫' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    unapprove: async (event) => {
        await ensureSuperAdmin(event);
        const id = (await event.request.formData()).get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            await updateItem(id, { status: 'pending' });
            return { success: true, message: 'הכרטיס הוחזר לממתינים ⏳' };
        } catch (e) {
            return fail(500, { error: `שגיאה: ${e instanceof Error ? e.message : e}` });
        }
    },

    remove: async (event) => {
        const session = await ensureSuperAdmin(event);
        const id = (await event.request.formData()).get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            await adminDeleteItem(id, session?.user?.id ?? 'admin');
            return { success: true, message: 'הכרטיס נמחק לצמיתות 🗑️' };
        } catch (e) {
            return fail(500, { error: `שגיאה במחיקה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
