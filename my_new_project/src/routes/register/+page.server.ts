import { redirect, fail } from '@sveltejs/kit';
import { registerWithCredentials } from '$lib/server/db';
import { strapiRegister, resendConfirmation, StrapiAuthError } from '$lib/server/strapiClient';
import { setHandoffCookies } from '$lib/server/authHandoff';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user) throw redirect(302, '/profile');
    return {};
};

export const actions: Actions = {
    // חייב שם (לא default): SvelteKit אוסר default לצד action בשם (resendConfirmation)
    register: async ({ request, cookies }) => {
        const formData        = await request.formData();
        const username        = (formData.get('username')       as string)?.trim();
        const email           = (formData.get('email')          as string)?.trim().toLowerCase();
        const password        = formData.get('password')        as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (!username || !email || !password) {
            return fail(400, { error: 'יש למלא את כל השדות', username, email });
        }
        if (password.length < 6) {
            return fail(400, { error: 'הסיסמה חייבת להכיל לפחות 6 תווים', username, email });
        }
        if (password !== confirmPassword) {
            return fail(400, { error: 'הסיסמאות אינן תואמות', username, email });
        }

        // 1. יצירת משתמש ב-Strapi users-permissions
        // כשה-email confirmation מופעל - Strapi שולח מייל אישור ולא מחזיר JWT;
        // כשהוא כבוי - JWT חוזר מיד ומחברים את המשתמש אוטומטית (בלי לוגין ידני).
        let jwt: string | undefined;
        try {
            const res = await strapiRegister(username, email, password);
            jwt = res.jwt;
        } catch (e) {
            if (e instanceof StrapiAuthError) {
                if (e.isTaken) {
                    return fail(409, { error: 'אימייל זה כבר רשום. נסה להתחבר, או לשחזר סיסמה ב"שכחתי סיסמה".', username, email });
                }
                if (e.isRateLimited) {
                    return fail(429, { error: 'יותר מדי ניסיונות - המתן כמה דקות ונסה שוב.', username, email });
                }
                if (e.isServerIssue) {
                    console.error('[register] strapi unavailable:', e.message);
                    return fail(503, { error: 'תקלה זמנית בשרת - נסה שוב בעוד רגע. הפרטים שמילאת נשמרו כאן.', username, email });
                }
                // שגיאת ולידציה אחרת מ-Strapi (שם משתמש לא חוקי וכו')
                console.warn('[register] strapi validation:', e.strapiMessage);
                return fail(400, { error: 'ההרשמה נכשלה: בדוק שהאימייל תקין ושהשם באורך סביר, ונסה שוב.', username, email });
            }
            console.error('[register] unexpected error:', e);
            return fail(500, { error: 'שגיאה בהרשמה. נסה שוב.', username, email });
        }

        // 2. קישור external_id (ייתכן שיכשל אם Strapi לא מחזיר JWT לפני אישור מייל - זה בסדר)
        try {
            await registerWithCredentials(username, email, password);
        } catch {
            // לא קריטי - external_id יוגדר בכניסה הראשונה
        }

        // 3א. יש JWT (אישור מייל כבוי) → שותלים בעוגייה ומחברים אוטומטית:
        // הקליינט יקרא signIn('credentials') שמרים סשן מהעוגייה (handoff)
        if (jwt) {
            setHandoffCookies(cookies, jwt);
            return { success: true, autoLogin: true, email };
        }

        // 3ב. אין JWT (נדרש אישור מייל) → מסך הנחיה עם אפשרות שליחה חוזרת
        return { success: true, needsConfirm: true, email };
    },

    /** שליחה חוזרת של מייל האישור - למי שהמייל לא הגיע אליו */
    resendConfirmation: async ({ request }) => {
        const formData = await request.formData();
        const email = (formData.get('email') as string)?.trim().toLowerCase();
        if (!email || !email.includes('@')) {
            return fail(400, { error: 'כתובת אימייל לא תקינה' });
        }
        try {
            await resendConfirmation(email);
            return { needsConfirm: true, resent: true, email };
        } catch (e) {
            console.warn('[register] resendConfirmation failed:', e);
            return fail(503, { needsConfirm: true, resendFailed: true, email });
        }
    },
};
