import { redirect, fail } from '@sveltejs/kit';
import {
    strapiLogin, resendConfirmation, StrapiAuthError,
    phoneOtpEnabled, requestPhoneOtp, verifyPhoneOtp,
} from '$lib/server/strapiClient';
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

/** האתר שממנו הגיעו דרך גשר ה-SSO (/sso) - רק תת-דומיין של gofreeil.com, לתצוגה בלבד */
function safeVia(raw: string | null): string | null {
    if (!raw) return null;
    const host = raw.trim().toLowerCase();
    if (host === 'gofreeil.com' || (host.endsWith('.gofreeil.com') && /^[a-z0-9.-]+$/.test(host))) return host;
    return null;
}

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* עוגייה פגומה - מציגים לוגין */ }

    if (session?.user) {
        throw redirect(302, safeRedirect(event.url.searchParams.get('redirect')));
    }

    // כניסה בקוד SMS מוצגת רק כשהבאקאנד מדווח שספק SMS מוגדר (מטמון 5 דק')
    let phoneLogin = false;
    try { phoneLogin = await phoneOtpEnabled(); } catch { /* לא זמין */ }

    return {
        redirectTo:  safeRedirect(event.url.searchParams.get('redirect')),
        via:         safeVia(event.url.searchParams.get('via')),
        phoneLogin,
        error:       event.url.searchParams.get('error') ?? null,
        registered:  event.url.searchParams.get('registered') === '1',
    };
};

/** מיפוי קוד שגיאה של כניסה ב-SMS (מהבאקאנד) → מפתח תרגום + סטטוס HTTP */
const PHONE_ERR_STATUS: Record<string, number> = {
    unavailable: 503, invalid_phone: 400, too_soon: 429, too_many: 429, sms_failed: 502,
    no_code: 400, expired: 400, wrong_code: 400, blocked: 403, server: 503,
};
function phoneFail(error: string, extra: Record<string, unknown>) {
    return fail(PHONE_ERR_STATUS[error] ?? 400, { phoneError: `account.phone_err_${error}`, ...extra });
}

export const actions: Actions = {
    /**
     * כניסה בקוד SMS, שלב 1: שליחת קוד לנייד. הבאקאנד מרסן (דקה בין שליחות,
     * 5 בשעה לנייד) ומחזיר קוד-שגיאה מובחן שמתורגם כאן למפתח i18n.
     */
    phoneRequest: async ({ request }) => {
        const formData = await request.formData();
        const phone = String(formData.get('phone') ?? '').trim();
        if (!phone) return phoneFail('invalid_phone', { phoneValue: phone });
        const r = await requestPhoneOtp(phone);
        if (!r.ok) return phoneFail(r.error, { phoneValue: phone });
        return { phoneSent: true, phoneValue: phone, phoneMasked: r.masked };
    },

    /**
     * שלב 2: אימות הקוד. בהצלחה הבאקאנד מזהה את המשתמש לפי הנייד (או יוצר
     * חדש) ומנפיק JWT; שותלים אותו ב-handoff והקליינט קורא signIn('credentials')
     * בלי פרטים — בדיוק כמו כניסה באימייל/סיסמה.
     */
    phoneVerify: async ({ request, cookies }) => {
        const formData = await request.formData();
        const phone = String(formData.get('phone') ?? '').trim();
        const code  = String(formData.get('code')  ?? '').trim();
        const r = await verifyPhoneOtp(phone, code);
        if (!r.ok) {
            // קוד שפג/נצרך/יותר מדי ניסיונות → חוזרים לשלב הנייד לשליחה חדשה
            const backToPhone = r.error === 'expired' || r.error === 'no_code' || r.error === 'too_many';
            return phoneFail(r.error, { phoneValue: phone, phoneSent: !backToPhone });
        }
        setHandoffCookies(cookies, r.jwt);
        return { success: true, phoneCreated: r.created };
    },

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
