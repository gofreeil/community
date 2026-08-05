import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAd } from '$lib/server/adsStore';
import { getUserById, getUserByEmail } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const ad = await getAd(event.params.id);
    let allowed = ad?.status === 'approved';
    let preview = false;

    // ?preview=1 - תצוגה מקדימה לסופר-אדמין בלבד, כדי שאפשר יהיה לראות את דף
    // הנחיתה *לפני* האישור. בלי זה הכפתור "פתח את דף הנחיתה המלא" בעמוד אישור
    // הפרסומות הוביל תמיד ל-404 בטאבים "ממתינות" ו"נדחו".
    // הבדיקה היא צד-שרת בלבד; לגולש רגיל ?preview=1 לא משנה דבר.
    if (ad && !allowed && event.url.searchParams.get('preview') === '1') {
        const session = await event.locals.auth().catch(() => null);
        let isSA = session?.user?.role === 'super_admin';
        if (!isSA && session?.user?.id) {
            try {
                let dbUser = await getUserById(session.user.id as string);
                if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
                isSA = dbUser?.role === 'super_admin';
            } catch { /* נשאר חסום */ }
        }
        if (isSA) { allowed = true; preview = true; }
    }

    if (!ad || !allowed) {
        throw error(404, 'הפרסומת לא נמצאה');
    }
    return { ad, preview };
};
