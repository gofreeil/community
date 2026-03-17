import { redirect, fail } from '@sveltejs/kit';
import { signIn } from '../../auth';
import { getUserByEmail } from '$lib/server/db';
import { strapiLogin } from '$lib/server/strapiClient';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    if (session?.user) {
        const redirectTo = event.url.searchParams.get('redirect') ?? '/';
        throw redirect(302, redirectTo);
    }

    return {
        redirectTo:  event.url.searchParams.get('redirect') ?? '/',
        error:       event.url.searchParams.get('error') ?? null,
        registered:  event.url.searchParams.get('registered') === '1',
    };
};

export const actions: Actions = {
    credentials: async (event) => {
        const { request, cookies } = event;
        const formData   = await request.formData();
        const email      = (formData.get('email')    as string)?.trim().toLowerCase();
        const password   = formData.get('password')  as string;
        const redirectTo = formData.get('redirectTo') as string || '/';

        if (!email || !password) {
            return fail(400, { error: 'יש למלא אימייל וסיסמה' });
        }

        // בדיקה אם המשתמש בכלל קיים
        const existingUser = await getUserByEmail(email);
        if (!existingUser) {
            return fail(401, { error: 'אימייל זה לא רשום. האם ברצונך להירשם?' });
        }
        if (existingUser.provider !== 'credentials') {
            return fail(401, { error: `חשבון זה מחובר דרך ${existingUser.provider}. התחבר עם הכפתור המתאים.` });
        }

        // קבלת Strapi JWT ושמירה ב-HTTP-only cookie
        try {
            const { jwt } = await strapiLogin(email, password);
            cookies.set('strapi_jwt', jwt, {
                httpOnly: true,
                secure:   process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path:     '/',
                maxAge:   60 * 60 * 24 * 7, // 7 ימים
            });
        } catch {
            // סיסמה שגויה לפי Strapi
            return fail(401, { error: 'סיסמה שגויה. נסה שוב.' });
        }

        try {
            await signIn('credentials', {
                email,
                password,
                redirect: false,
            });
        } catch (e) {
            // Auth.js זורק redirect בהצלחה
            if (e instanceof Response || (e as { status?: number })?.status === 302) {
                throw redirect(302, redirectTo);
            }
            const msg = e instanceof Error ? e.message : String(e);
            if (
                msg.includes('CredentialsSignin') ||
                msg.includes('401') ||
                msg.includes('credentials')
            ) {
                return fail(401, { error: 'סיסמה שגויה. נסה שוב.' });
            }
            console.error('[login] error:', msg);
            return fail(500, { error: `שגיאה: ${msg}` });
        }

        throw redirect(302, redirectTo);
    },
};
