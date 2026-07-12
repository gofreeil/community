import { fail } from '@sveltejs/kit';
import { resetPassword, StrapiAuthError } from '$lib/server/strapiClient';
import { setHandoffCookies } from '$lib/server/authHandoff';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const code = url.searchParams.get('code') ?? '';
    return { code };
};

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const formData        = await request.formData();
        const code            = formData.get('code')            as string;
        const password        = formData.get('password')        as string;
        const passwordConfirm = formData.get('passwordConfirm') as string;

        if (!code)                         return fail(400, { error: 'קישור לא תקין' });
        if (!password || password.length < 6) return fail(400, { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
        if (password !== passwordConfirm)  return fail(400, { error: 'הסיסמאות אינן תואמות' });

        try {
            // Strapi מחזיר jwt+user - שותלים בעוגייה ומחברים אוטומטית
            // (הקליינט קורא signIn('credentials') שמרים סשן מהעוגייה)
            const { jwt } = await resetPassword(code, password, passwordConfirm);
            if (jwt) {
                setHandoffCookies(cookies, jwt);
                return { success: true, autoLogin: true };
            }
            return { success: true };
        } catch (e) {
            if (e instanceof StrapiAuthError && e.isServerIssue) {
                console.error('[reset-password] strapi unavailable:', e.message);
                return fail(503, { error: 'תקלה זמנית בשרת - נסה שוב בעוד רגע.' });
            }
            return fail(400, { error: 'הקישור אינו תקין או פג תוקפו. בקש קישור חדש.' });
        }
    },
};
