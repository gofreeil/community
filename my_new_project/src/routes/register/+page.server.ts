import { redirect, fail } from '@sveltejs/kit';
import { registerWithCredentials } from '$lib/server/db';
import { strapiRegister } from '$lib/server/strapiClient';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user) throw redirect(302, '/profile');
    return {};
};

export const actions: Actions = {
    default: async ({ request }) => {
        const formData        = await request.formData();
        const username        = (formData.get('username')       as string)?.trim();
        const email           = (formData.get('email')          as string)?.trim().toLowerCase();
        const password        = formData.get('password')        as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (!username || !email || !password) {
            return fail(400, { error: 'יש למלא את כל השדות', username, email });
        }
        if (password.length < 6) {
            return fail(400, { error: 'הסיסמה חייבת להכיל לפחות 6 תווים', username, email });
        }
        if (password !== confirmPassword) {
            return fail(400, { error: 'הסיסמאות אינן תואמות', username, email });
        }

        // 1. יצירת משתמש ב-Strapi users-permissions
        // כשה-email confirmation מופעל — Strapi שולח מייל אישור ולא מחזיר JWT
        try {
            await strapiRegister(username, email, password);
        } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            if (msg.includes('Email already taken') || msg.includes('400')) {
                return fail(409, { error: 'אימייל זה כבר רשום. נסה להתחבר.', username, email });
            }
            console.error('[register] strapi error:', msg);
            return fail(500, { error: 'שגיאה בהרשמה. נסה שוב.', username, email });
        }

        // 2. קישור external_id (ייתכן שיכשל אם Strapi לא מחזיר JWT לפני אישור מייל — זה בסדר)
        try {
            await registerWithCredentials(username, email, password);
        } catch {
            // לא קריטי — external_id יוגדר בכניסה הראשונה
        }

        // 3. מחזירים success עם בקשה לאמת אימייל (לא מתחברים אוטומטית)
        return { success: true, email };
    },
};
