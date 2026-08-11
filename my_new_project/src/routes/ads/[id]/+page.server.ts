import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAd } from '$lib/server/adsStore';
import { getUserById, getUserByEmail } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const ad = await getAd(event.params.id);
    let allowed = ad?.status === 'approved';
    let preview = false;

    // הסשן נשלף פעם אחת ומשמש גם ל-preview וגם לכפתור "פרסם בכל האתרים" של
    // הסופר-אדמין. במסלול הרגיל (פרסומת מאושרת) הבדיקה היא מהסשן בלבד -
    // בלי פניה ל-DB בדף ציבורי; אם התפקיד חסר בסשן הכפתור פשוט לא יוצג.
    const session = await event.locals.auth().catch(() => null);
    const sessionRole = (session?.user as { role?: string } | undefined)?.role;
    let isSuperAdmin = sessionRole === 'super_admin';

    // ?preview=1 - תצוגה מקדימה למי שמאשר פרסומות (סופר-אדמין או אדמין שמונה),
    // כדי שאפשר יהיה לראות את דף הנחיתה *לפני* האישור. בלי זה הכפתור "פתח את דף
    // הנחיתה המלא" בעמוד אישור הפרסומות הוביל ל-404 בטאבים "ממתינות" ו"נדחו".
    // הבדיקה היא צד-שרת בלבד; לגולש רגיל ?preview=1 לא משנה דבר.
    if (ad && !allowed && event.url.searchParams.get('preview') === '1') {
        const isAdminRole = (r?: string | null) => r === 'super_admin' || r === 'neighborhood_admin';
        let isAdmin = isAdminRole(sessionRole);
        if (!isAdmin && session?.user?.id) {
            try {
                let dbUser = await getUserById(session.user.id as string);
                if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
                isAdmin = isAdminRole(dbUser?.role);
                if (dbUser?.role === 'super_admin') isSuperAdmin = true;
            } catch { /* נשאר חסום */ }
        }
        if (isAdmin) { allowed = true; preview = true; }
    }

    if (!ad || !allowed) {
        throw error(404, 'הפרסומת לא נמצאה');
    }
    return { ad, preview, isSuperAdmin };
};
