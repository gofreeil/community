import { redirect, fail } from '@sveltejs/kit';
import { getMessagesByUserId, getDbItemById, deleteItem, updateItem } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    if (!session?.user?.id) {
        throw redirect(302, '/login?redirect=/messages');
    }

    try {
        const messages = await getMessagesByUserId(session.user.id);
        return { messages };
    } catch (e) {
        console.warn('[messages] load failed:', e instanceof Error ? e.message : e);
        return { messages: [] };
    }
};

export const actions: Actions = {
    // מחיקה סופית של הודעה אחת מהשרת (Strapi) - לאחר ווידוא בעלות
    delete: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/messages');

        const form = await event.request.formData();
        const id = String(form.get('id') ?? '');
        if (!id) return fail(400, { error: 'missing id' });

        const item = await getDbItemById(id);
        // רק הבעלים של ההודעה רשאי למחוק אותה
        if (!item || item.category !== 'message' || item.user_id !== session.user.id) {
            return fail(403, { error: 'forbidden' });
        }

        await deleteItem(id);
        return { success: true, deleted: id };
    },

    // שמירה לארכיון / הסרה ממנו - status 'archived' מפקיע את ההודעה ממחיקת ה-60 יום
    setArchive: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/messages');

        const form = await event.request.formData();
        const id = String(form.get('id') ?? '');
        const archived = String(form.get('archived') ?? '') === '1';
        if (!id) return fail(400, { error: 'missing id' });

        const item = await getDbItemById(id);
        if (!item || item.category !== 'message' || item.user_id !== session.user.id) {
            return fail(403, { error: 'forbidden' });
        }

        await updateItem(id, { status: archived ? 'archived' : 'active' });
        return { success: true, archived };
    },

    // מחיקה סופית של כל ההודעות של המשתמש מהשרת
    deleteAll: async (event) => {
        const session = await event.locals.auth();
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/messages');

        const msgs = await getMessagesByUserId(session.user.id);
        const results = await Promise.allSettled(msgs.map((m) => deleteItem(m.id)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) console.warn(`[messages] deleteAll: ${failed}/${msgs.length} failed`);
        return { success: true, deletedAll: true };
    },
};
