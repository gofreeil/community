import { error } from '@sveltejs/kit';
import { getUserById, getUserByEmail } from './db';

/**
 * שער ההרשאה לאישור פרסומות. יושב כאן ולא בתוך +page.server.ts כדי
 * שגם נתיב החתימה (admin/ads-review/signal) ישתמש באותה בדיקה בדיוק,
 * בלי עותק שני של לוגיקת הרשאות שעלול להתפצל ממנה בעתיד.
 */

type EventWithLocals = { locals: App.Locals };

/** התפקיד האמיתי של המשתמש - מה-session, ובנפילה לאחור מה-DB (session ישן) */
export async function resolveRole(event: EventWithLocals): Promise<string> {
    const session = await event.locals.auth();
    let role = session?.user?.role ?? '';
    if (role !== 'super_admin' && role !== 'neighborhood_admin' && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            role = dbUser?.role ?? role;
        } catch { /* ignore */ }
    }
    return role;
}

/** אישור פרסומות פתוח לסופר-אדמין וגם לאדמין שמונה - שניהם מקבלים את ההתראה */
export async function ensureAdsAdmin(event: EventWithLocals) {
    const session = await event.locals.auth();
    const role = await resolveRole(event);
    if (role !== 'super_admin' && role !== 'neighborhood_admin') {
        throw error(403, 'נדרשת הרשאת ניהול');
    }
    return { session, role };
}
