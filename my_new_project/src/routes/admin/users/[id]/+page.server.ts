import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById, getUserByEmail, getUserByAnyId, getItemsByUserId } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // בדיקת הרשאת סופר־אדמין - ישירות מ-DB + fallback לפי אימייל (מיזוג OAuth+credentials)
    let isSuperAdmin = session?.user?.role === 'super_admin';
    if (!isSuperAdmin && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) {
                dbUser = await getUserByEmail(session.user.email);
            }
            isSuperAdmin = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!isSuperAdmin) throw error(403, 'נדרשת הרשאת מנהל ראשי');

    const userId = event.params.id;
    const user = await getUserByAnyId(userId);
    if (!user) throw error(404, 'המשתמש לא נמצא');

    let items: Awaited<ReturnType<typeof getItemsByUserId>> = [];
    try {
        items = await getItemsByUserId(userId);
    } catch (e) {
        console.warn('[admin/users] getItemsByUserId failed:', e);
    }

    return { profileUser: user, items };
};
