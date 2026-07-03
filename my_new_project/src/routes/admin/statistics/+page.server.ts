// דף סטטיסטיקה - היסטוריית כניסות חודשיות לאתר (סופר-אדמין בלבד).
// הנתונים מגיעים מ-visit-stat ב-Strapi דרך cache של יממה - מתעדכנים פעם ביום.
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById, getUserByEmail } from '$lib/server/db';
import { getVisitStats } from '$lib/server/visitStats';

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

    let stats: Awaited<ReturnType<typeof getVisitStats>> = [];
    try {
        stats = await getVisitStats();
    } catch (e) {
        console.warn('[statistics] getVisitStats failed:', e);
    }

    return { stats };
};
