import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    verifyTotp,
    makeTrustToken,
    TRUST_COOKIE_NAME,
    TRUST_COOKIE_MAX_AGE,
} from '$lib/server/totp';
import { getUserTotpSecret } from '$lib/server/db';

function safeRedirect(raw: string | null): string {
    if (!raw) return '/admin';
    return raw.startsWith('/') && !raw.startsWith('//') && raw.startsWith('/admin') ? raw : '/admin';
}

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

    // אם 2FA לא הופעל - אין מה לאמת, חזרה לאדמין
    if (!(await getUserTotpSecret(session.user.id!))) throw redirect(302, '/admin');

    return { redirect: safeRedirect(event.url.searchParams.get('redirect')) };
};

export const actions: Actions = {
    default: async (event) => {
        const session = await event.locals.auth();
        if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

        const secret = await getUserTotpSecret(session.user.id!);
        if (!secret) throw redirect(302, '/admin');

        const formData = await event.request.formData();
        const code = (formData.get('code') as string) ?? '';
        const redirectTo = safeRedirect(formData.get('redirect') as string);

        if (!verifyTotp(secret, code)) {
            return fail(400, { error: 'קוד שגוי. ודא שהשעון בטלפון מסונכרן ונסה שוב.' });
        }

        // אימות הצליח → סימון המכשיר כמהימן (עוגייה חתומה, מוגבלת לאתר זה בלבד)
        const identity = session.user.email ?? session.user.id!;
        event.cookies.set(TRUST_COOKIE_NAME, makeTrustToken(identity, secret), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: TRUST_COOKIE_MAX_AGE,
        });

        throw redirect(303, redirectTo);
    },
};
