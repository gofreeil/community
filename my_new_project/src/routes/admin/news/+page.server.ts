import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserById, getUserByEmail } from '$lib/server/db';
import { listNews, createNews, updateNews, setNewsArchived, deleteNews } from '$lib/server/newsStore';

/**
 * הרשאה: סופר-אדמין בלבד - הטיקר מוצג לכל מבקר בדף הבית.
 * הבדיקה זהה ללוח הניהול: קודם התפקיד שבסשן, ואם אינו שם - ישירות מה-DB
 * לפי מזהה ואז לפי אימייל (חשבונות OAuth+credentials שמוזגו).
 */
async function requireSuperAdminUser(locals: App.Locals) {
    const session = await locals.auth();
    let superAdmin = session?.user?.role === 'super_admin';
    if (!superAdmin && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            superAdmin = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!superAdmin) throw error(403, 'נדרשת הרשאת מנהל ראשי');
    return session;
}

export const load: PageServerLoad = async (event) => {
    await requireSuperAdminUser(event.locals);

    const posts = await listNews().catch((e) => {
        console.warn('[admin/news] listNews failed:', e instanceof Error ? e.message : e);
        return [];
    });

    return { posts };
};

export const actions: Actions = {
    // יצירה או עדכון - אותו טופס. postId ריק = ידיעה חדשה.
    save: async (event) => {
        await requireSuperAdminUser(event.locals);

        const fd = await event.request.formData();
        const postId    = String(fd.get('postId') ?? '').trim();
        const title     = String(fd.get('title') ?? '').trim();
        const summary   = String(fd.get('summary') ?? '').trim();
        const category  = String(fd.get('category') ?? '').trim();
        const sourceUrl = String(fd.get('sourceUrl') ?? '').trim();
        const archived  = fd.get('archived') === 'on' || fd.get('archived') === 'true';

        if (!title) return fail(400, { error: 'חסרה כותרת - זו השורה הראשונה בטיקר' });
        if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
            return fail(400, { error: 'הקישור חייב להתחיל ב-http:// או https://' });
        }

        try {
            const input = { title, summary, category, sourceUrl, archived };
            if (postId) {
                await updateNews(postId, input);
                return { success: true, message: `הידיעה "${title}" עודכנה ומופיעה בטיקר` };
            }
            await createNews(input);
            return { success: true, message: `הידיעה "${title}" נוספה ומופיעה בטיקר` };
        } catch (e) {
            return fail(500, { error: `שגיאה בשמירה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // ארכוב = הסתרה מהטיקר בלי למחוק. אפשר להחזיר בכל רגע.
    archive: async (event) => {
        await requireSuperAdminUser(event.locals);

        const fd = await event.request.formData();
        const postId   = String(fd.get('postId') ?? '').trim();
        const archived = fd.get('archived') === 'true';
        if (!postId) return fail(400, { error: 'חסר מזהה ידיעה' });

        try {
            await setNewsArchived(postId, archived);
            return {
                success: true,
                message: archived ? 'הידיעה הועברה לארכיון - אינה מוצגת בטיקר' : 'הידיעה הוחזרה לטיקר',
            };
        } catch (e) {
            return fail(500, { error: `שגיאה בעדכון: ${e instanceof Error ? e.message : e}` });
        }
    },

    remove: async (event) => {
        await requireSuperAdminUser(event.locals);

        const fd = await event.request.formData();
        const postId = String(fd.get('postId') ?? '').trim();
        if (!postId) return fail(400, { error: 'חסר מזהה ידיעה' });

        try {
            await deleteNews(postId);
            return { success: true, message: 'הידיעה נמחקה לצמיתות' };
        } catch (e) {
            return fail(500, { error: `שגיאה במחיקה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
