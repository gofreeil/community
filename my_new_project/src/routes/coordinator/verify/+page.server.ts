import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    verifyTotp,
    makeTrustToken,
    COORD_TRUST_COOKIE_NAME,
    TRUST_COOKIE_MAX_AGE,
} from '$lib/server/totp';
import { getUserTotpSecret } from '$lib/server/db';

function safeRedirect(raw: string | null): string {
    if (!raw) return '/coordinator';
    return raw.startsWith('/') && !raw.startsWith('//') && raw.startsWith('/coordinator') ? raw : '/coordinator';
}

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* ignore */ }
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator');

    // אם 2FA לא הופעל — אין מה לאמת
    if (!(await getUserTotpSecret(session.user.id))) throw redirect(302, '/coordinator');

    return { redirect: safeRedirect(event.url.searchParams.get('redirect')) };
};

export const actions: Actions = {
    default: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch { /* ignore */ }
        if (!session?.user?.id) throw error(401, 'נדרשת התחברות');

        const secret = await getUserTotpSecret(session.user.id);
        if (!secret) throw redirect(302, '/coordinator');

        const formData = await event.request.formData();
        const code = (formData.get('code') as string) ?? '';
        const redirectTo = safeRedirect(formData.get('redirect') as string);

        if (!verifyTotp(secret, code)) {
            return fail(400, { error: 'קוד שגוי. ודא שהשעון בטלפון מסונכרן ונסה שוב.' });
        }

        const identity = session.user.email ?? session.user.id;
        event.cookies.set(COORD_TRUST_COOKIE_NAME, makeTrustToken(identity, secret), {
            path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: TRUST_COOKIE_MAX_AGE,
        });

        throw redirect(303, redirectTo);
    },
};
