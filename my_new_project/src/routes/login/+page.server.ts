import { redirect, fail } from '@sveltejs/kit';
import { strapiLogin, resendConfirmation, StrapiAuthError } from '$lib/server/strapiClient';
import { setHandoffCookies } from '$lib/server/authHandoff';
import type { PageServerLoad, Actions } from './$types';

/**
 * הגנה מ-open-redirect: רק נתיב פנימי. חייב להתחיל ב-'/' אך לא בתו נוסף מסוג
 * '/' או '\' — כי בדפדפן, ב-URL עם סכמה מיוחדת (http/https), '\' מתפרש כמו '/',
 * כך ש-'/\evil.com' נפתר ל-https://evil.com. הרגקס חוסם את שני התווים.
 */
function safeRedirect(raw: string | null): string {
    if (raw && /^\/(?![/\\])/.test(raw)) return raw;
    return '/profile';
}

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* עוגייה פגומה - מציגים לוגין */ }

    if (session?.user) {
        throw redirect(302, safeRedirect(event.url.searchParams.get('redirect')));
    }

    return {
        redirectTo:  safeRedirect(event.url.searchParams.get('redirect')),
        error:       event.url.searchParams.get('error') ?? null,
        registered:  event.url.searchParams.get('registered') === '1',
    };
};

export const actions: Actions = {
    /**
     * שלב 1: בדיקת אימייל+סיסמה בשרת - פעם אחת בלבד.
     * בהצלחה שותלים strapi_jwt בעוגייה ומחזירים { success } - ואז הקליינט
     * קורא ל-signIn('credentials') *בלי פרטים*, שמרים סשן מהעוגייה (handoff).
     * בכישלון מחזירים שגיאה מובחנת: סיסמה שגויה / אימייל לא מאומת /
     * יותר מדי ניסיונות / תקלת שרת - כדי שהמשתמש יידע מה באמת קרה.
     */
    credentials: async (event) => {
        const { cookies } = event;
        const formData   = await event.request.formData();
        const email      = (formData.get('email')    as string)?.trim().toLowerCase();
        const password   = formData.get('password')  as string;

        if (!email || !password) {
            return fail(400, { error: 'יש למלא אימייל וסיסמה' });
        }

        try {
            const { jwt } = await strapiLogin(email, password);
            setHandoffCookies(cookies, jwt);
        } catch (e) {
            if (e instanceof StrapiAuthError) {
                if (e.isUnconfirmed) {
                    return fail(403, { unconfirmed: true, email });
                }
                if (e.isRateLimited) {
                    return fail(429, { errorKey: 'account.err_too_many' });
                }
                if (e.isServerIssue) {
                    console.error('[login] strapi unavailable:', e.message);
                    return fail(503, { errorKey: 'account.err_server_temp' });
                }
            }
            return fail(401, { errorKey: 'account.err_credentials' });
        }

        return { success: true };
    },

    /** שליחה חוזרת של מייל האישור - למי שנתקע בלי המייל */
    resendConfirmation: async ({ request }) => {
        const formData = await request.formData();
        const email = (formData.get('email') as string)?.trim().toLowerCase();
        if (!email || !email.includes('@')) {
            return fail(400, { errorKey: 'account.err_unknown' });
        }
        try {
            await resendConfirmation(email);
            return { resent: true, email };
        } catch (e) {
            console.warn('[login] resendConfirmation failed:', e);
            return fail(503, { resendFailed: true, email });
        }
    },
};
