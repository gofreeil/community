// ============================================================
// GET /api/server-health
// מדדי בריאות/עומס השרת ללוח האדמין. מוגן לסופר-אדמין בלבד.
// נצרך ע"י רכיב לוח המכוונים (ServerHealthGauges) שמרענן חי כל ~15 שנ'.
// ============================================================
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserById, getUserByEmail } from '$lib/server/db';
import { getServerHealth } from '$lib/server/serverHealth';

export const GET: RequestHandler = async (event) => {
    const session = await event.locals.auth();

    // בדיקת סופר-אדמין - ישירות מ-DB + fallback לפי אימייל (מיזוג OAuth+credentials),
    // בדיוק כמו ב-/admin, כדי שהרענון החי יעבוד גם לחשבונות מאוחדים.
    let isSuperAdmin = session?.user?.role === 'super_admin';
    if (!isSuperAdmin && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            isSuperAdmin = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!isSuperAdmin) throw error(403, 'נדרשת הרשאת מנהל ראשי');

    return json(await getServerHealth());
};
