import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getAdminTotpSecret,
    verifyTotp,
    makeTrustToken,
    TRUST_COOKIE_NAME,
    TRUST_COOKIE_MAX_AGE,
} from '$lib/server/totp';

function safeRedirect(raw: string | null): string {
    if (!raw) return '/admin';
    return raw.startsWith('/') && !raw.startsWith('//') && raw.startsWith('/admin') ? raw : '/admin';
}

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

    // אם 2FA לא הוגדר - אין מה לאמת, חזרה לאדמין
    if (!getAdminTotpSecret(session.user.email)) throw redirect(302, '/admin');

    return { redirect: safeRedirect(event.url.searchParams.get('redirect')) };
};

export const actions: Actions = {
    default: async (event) => {
        const session = await event.locals.auth();
        if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

        const secret = getAdminTotpSecret(session.user.email);
        if (!secret) throw redirect(302, '/admin');

        const formData = await event.request.formData();
        const code = (formData.get('code') as string) ?? '';
        const redirectTo = safeRedirect(formData.get('redirect') as string);

        if (!verifyTotp(secret, code)) {
            return fail(400, { error: 'קוד שגוי. ודא שהשעון בטלפון מסונכרן ונסה שוב.' });
        }

        // אימות הצליח → סימון המכשיר כמהימן (עוגייה חתומה, מוגבלת לאתר זה בלבד)
        event.cookies.set(TRUST_COOKIE_NAME, makeTrustToken(session.user.email!, secret), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: TRUST_COOKIE_MAX_AGE,
        });

        throw redirect(303, redirectTo);
    },
};
