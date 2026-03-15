import { redirect, fail } from '@sveltejs/kit';
import { strapiRegister } from '$lib/server/strapiClient';
import { upsertUser } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user) throw redirect(302, '/');
    return {};
};

export const actions: Actions = {
    default: async ({ request }) => {
        const formData       = await request.formData();
        const username       = (formData.get('username')       as string)?.trim();
        const email          = (formData.get('email')          as string)?.trim().toLowerCase();
        const password       = formData.get('password')        as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        // ולידציה בסיסית
        if (!username || !email || !password) {
            return fail(400, { error: 'יש למלא את כל השדות', username, email });
        }
        if (password.length < 6) {
            return fail(400, { error: 'הסיסמה חייבת להכיל לפחות 6 תווים', username, email });
        }
        if (password !== confirmPassword) {
            return fail(400, { error: 'הסיסמאות אינן תואמות', username, email });
        }

        try {
            const { user } = await strapiRegister(username, email, password);

            // שמור גם ב-SQLite (תואמות auth.js)
            upsertUser({
                id:       `credentials_${user.email}`,
                name:     user.username,
                email:    user.email,
                provider: 'credentials',
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : '';

            if (msg.includes('Email already taken') || msg.includes('already exists')) {
                return fail(409, { error: 'אימייל זה כבר רשום. נסה להתחבר.', username, email });
            }
            if (msg.includes('Username already taken')) {
                return fail(409, { error: 'שם המשתמש תפוס. בחר שם אחר.', username, email });
            }
            console.error('[register] Strapi error:', msg);
            return fail(500, { error: 'שגיאה בהרשמה. נסה שוב.', username, email });
        }

        throw redirect(302, '/login?registered=1');
    },
};
