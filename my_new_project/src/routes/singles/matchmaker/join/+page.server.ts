import { getUserById, getUserByEmail } from '$lib/server/db';
import { getMatchmakerStatus } from '$lib/server/matchmaker';
import type { PageServerLoad } from './$types';

// "הצטרפות כשדכן/ית מערכת": יעד אחד לכל המסלולים. אורחת רואה את השלבים ועוברת
// הרשמה/כניסה שמחזירה אותה לכאן; מחוברת - הבקשה נשלחת מיד (ראו +page.svelte).
export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* אורחת */ }
    const uid = session?.user?.id as string | undefined;
    if (!uid) return { loggedIn: false, status: 'none' as const };

    // כמו בלוח: סופר-אדמין מזוהה גם מול ה-DB למקרה שה-role בסשן לא עודכן
    let isSuperAdmin = session?.user?.role === 'super_admin';
    if (!isSuperAdmin) {
        try {
            let u = await getUserById(uid);
            if (!u && session?.user?.email) u = await getUserByEmail(session.user.email);
            if (u?.role === 'super_admin') isSuperAdmin = true;
        } catch { /* ignore */ }
    }

    return { loggedIn: true, status: await getMatchmakerStatus(uid, isSuperAdmin) };
};
