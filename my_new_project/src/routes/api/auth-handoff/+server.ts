import { json } from '@sveltejs/kit';
import { getStrapiMe } from '$lib/server/strapiClient';
import { setHandoffCookies } from '$lib/server/authHandoff';
import type { RequestHandler } from './$types';

/**
 * handoff להתחברות אוטומטית אחרי אישור מייל: הבאקאנד מאשר את החשבון ומפנה
 * ל-/confirm-email#jwt=<טוקן קצר-מועד>. הדף שולח את הטוקן לכאן (fragment לא
 * מגיע לשרתים/לוגים); אנחנו מאמתים אותו מול Strapi, שותלים אותו בעוגיית
 * strapi_jwt, ואז הקליינט קורא signIn('credentials') שמרים סשן מהעוגייה
 * (מסלול ה-handoff ב-authorize). ה-jwt callback יחליף את הטוקן הקצר בטוקן
 * מלא (365 יום) ברענון הראשון.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
    let jwt = '';
    try {
        jwt = String((await request.json())?.jwt ?? '');
    } catch { /* body לא תקין */ }
    if (!jwt) return json({ ok: false }, { status: 400 });

    // אימות מול Strapi — רק טוקן שמזהה משתמש אמיתי נשתל בעוגייה
    const me = await getStrapiMe(jwt);
    if (!me?.email) return json({ ok: false }, { status: 401 });

    // strapi_handoff (קצר) לזיהוי ב-authorize + strapi_jwt לקריאות server
    setHandoffCookies(cookies, jwt);
    return json({ ok: true });
};
