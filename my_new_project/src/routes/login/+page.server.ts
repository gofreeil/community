import { redirect, fail } from '@sveltejs/kit';
import { signIn } from '../../auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // כבר מחובר — הפנה ליעד המבוקש או לדף הבית
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
        const formData  = await event.request.formData();
        const email     = formData.get('email')      as string;
        const password  = formData.get('password')   as string;
        const redirectTo = formData.get('redirectTo') as string || '/';

        if (!email || !password) {
            return fail(400, { error: 'יש למלא אימייל וסיסמה' });
        }

        try {
            await signIn('credentials', {
                email,
                password,
                redirect:    false,
            });
        } catch (e) {
            // Auth.js זורק redirect — אם זה redirect זה הצלחה
            if (e instanceof Response || (e as { status?: number })?.status === 302) {
                throw redirect(302, redirectTo);
            }
            // שגיאה אמיתית
            const msg = e instanceof Error ? e.message : '';
            if (msg.includes('CredentialsSignin') || msg.includes('401')) {
                return fail(401, { error: 'אימייל או סיסמה שגויים' });
            }
            return fail(500, { error: 'שגיאה בהתחברות. נסה שוב.' });
        }

        throw redirect(302, redirectTo);
    },
};
