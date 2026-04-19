import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireSuperAdmin, requireAdmin } from '$lib/server/auth';
import { getAllUsers, banUser, unbanUser, setUserRole, setCoordinatorOf, getAllItems, adminDeleteItem, getUserById, getUserByEmail } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // בדיקת הרשאה — ישירות מ-DB + fallback לפי אימייל (מיזוג OAuth+credentials)
    let isSuperAdmin = session?.user?.role === 'super_admin';
    if (!isSuperAdmin && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            // fallback לפי אימייל — כמו בדף הפרופיל
            if (!dbUser && session.user.email) {
                dbUser = await getUserByEmail(session.user.email);
            }
            isSuperAdmin = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!isSuperAdmin) throw error(403, 'נדרשת הרשאת מנהל ראשי');

    const jwt = event.cookies.get('strapi_jwt');

    let users: Awaited<ReturnType<typeof getAllUsers>> = [];
    let items: Awaited<ReturnType<typeof getAllItems>> = [];

    try {
        users = await getAllUsers(jwt);
    } catch (e) {
        console.warn('[admin] getAllUsers failed:', e);
    }

    try {
        items = await getAllItems();
    } catch (e) {
        console.warn('[admin] getAllItems failed:', e);
    }

    return {
        users,
        items,
        currentUserId: session?.user?.id ?? '',
    };
};

export const actions: Actions = {
    ban: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });

        try {
            await banUser(userId);
            return { success: true, message: `משתמש ${userId} נחסם` };
        } catch (e) {
            return fail(500, { error: `שגיאה בחסימה: ${e instanceof Error ? e.message : e}` });
        }
    },

    unban: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });

        try {
            await unbanUser(userId);
            return { success: true, message: `חסימת ${userId} בוטלה` };
        } catch (e) {
            return fail(500, { error: `שגיאה בביטול חסימה: ${e instanceof Error ? e.message : e}` });
        }
    },

    setRole: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        const role = formData.get('role') as string;
        const neighborhood = formData.get('neighborhood') as string || undefined;

        if (!userId || !role) return fail(400, { error: 'חסרים פרטים' });

        try {
            await setUserRole(userId, role, neighborhood);
            return { success: true, message: `תפקיד עודכן ל-${role}` };
        } catch (e) {
            return fail(500, { error: `שגיאה בעדכון תפקיד: ${e instanceof Error ? e.message : e}` });
        }
    },

    setCoordinator: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const userId       = formData.get('userId') as string;
        const neighborhoods = (formData.get('neighborhoods') as string ?? '')
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);

        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });

        try {
            await setCoordinatorOf(userId, neighborhoods);
            const msg = neighborhoods.length > 0
                ? `המשתמש מונה לרכז של: ${neighborhoods.join(', ')}`
                : 'הרכזות הוסרה מהמשתמש';
            return { success: true, message: msg };
        } catch (e) {
            return fail(500, { error: `שגיאה: ${e instanceof Error ? e.message : e}` });
        }
    },

    deleteItem: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const itemId = formData.get('itemId') as string;
        if (!itemId) return fail(400, { error: 'חסר מזהה פריט' });

        try {
            await adminDeleteItem(itemId, session?.user?.id ?? 'admin');
            return { success: true, message: 'הפריט נמחק' };
        } catch (e) {
            return fail(500, { error: `שגיאה במחיקה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
