import { fail, redirect } from '@sveltejs/kit';
import { resetPassword } from '$lib/server/strapiClient';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const code = url.searchParams.get('code') ?? '';
    return { code };
};

export const actions: Actions = {
    default: async ({ request }) => {
        const formData        = await request.formData();
        const code            = formData.get('code')            as string;
        const password        = formData.get('password')        as string;
        const passwordConfirm = formData.get('passwordConfirm') as string;

        if (!code)                         return fail(400, { error: 'קישור לא תקין' });
        if (!password || password.length < 6) return fail(400, { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
        if (password !== passwordConfirm)  return fail(400, { error: 'הסיסמאות אינן תואמות' });

        try {
            await resetPassword(code, password, passwordConfirm);
            return { success: true };
        } catch {
            return fail(400, { error: 'הקישור אינו תקין או פג תוקפו. בקש קישור חדש.' });
        }
    },
};
