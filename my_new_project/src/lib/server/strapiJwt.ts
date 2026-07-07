import { createHash } from 'crypto';
import {
    strapiLogin,
    strapiRegister,
    issueSsoJwtViaBackend,
} from './strapiClient';

const AUTH_SECRET = process.env.AUTH_SECRET ?? '';

/**
 * מפיק JWT של ה-Strapi המשותף עבור משתמש ברשימה המאוחדת, בלי סיסמה שהמשתמש
 * מקליד. הסיסמה דטרמיניסטית — sha256(stableId + AUTH_SECRET).
 *
 * שלושה מסלולים, מהזול ליקר:
 *   1. login עם ה-seed — עובד אם החשבון כבר נוצר תחת אותו stableId.
 *   2. register — עובד אם האימייל עדיין לא קיים ב-Strapi.
 *   3. הנפקה ישירה מהבאקאנד (POST /api/sso/issue-jwt, מאומת ב-STRAPI_TOKEN) —
 *      עבור משתמש קיים שאין לו סיסמה תואמת (OAuth/מיזוג/חשבון ישן). זו הדרך
 *      *היחידה* שעובדת: איפוס-סיסמה דרך REST (PUT /users/:id) ב-Strapi 5 לא
 *      מייצר סיסמה שמישה לכניסה — ה-PUT מחזיר 200 אך login עוקב נכשל 400
 *      (אומת חי). לכן במקום זה הבאקאנד מנפיק JWT ישירות דרך שירות ה-jwt.
 *
 * מחזיר null רק אם אין AUTH_SECRET/אימייל, או שכל שלושת המסלולים נכשלו
 * (למשל הנתיב עוד לא פרוס בבאקאנד, או ה-STRAPI_TOKEN בלי הרשאה).
 */
export async function getOrCreateStrapiJwt(
    email: string | null | undefined,
    stableId: string,
    diag?: Record<string, unknown>,
): Promise<string | null> {
    // מחלץ קוד HTTP קצר מהודעת שגיאה של strapiClient (בלי טקסט/PII)
    const code = (e: unknown): string => {
        const m = e instanceof Error ? e.message : String(e);
        const n = m.match(/→\s*(\d{3})/) || m.match(/\b(\d{3})\b/);
        return n ? n[1] : 'network';
    };
    if (!email || !AUTH_SECRET) { if (diag) diag.reason = 'no-email-or-secret'; return null; }
    const password = createHash('sha256').update(stableId + AUTH_SECRET).digest('hex').slice(0, 32);
    const username = stableId.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30);

    // 1. כניסה עם ה-seed הדטרמיניסטי (משתמשים שנוצרו במסלול הזה)
    try {
        const { jwt } = await strapiLogin(email, password);
        if (jwt) { if (diag) diag.step1_login = 'ok'; return jwt; }
    } catch (e) { if (diag) diag.step1_login = code(e); }

    // 2. אימייל חדש לגמרי — נרשם ומקבל JWT
    try {
        const { jwt } = await strapiRegister(username, email, password);
        if (jwt) { if (diag) diag.step2_register = 'ok'; return jwt; }
    } catch (e) { if (diag) diag.step2_register = code(e); }

    // 3. משתמש קיים בלי סיסמה תואמת → הבאקאנד מנפיק JWT ישירות (מאומת ב-STRAPI_TOKEN)
    try {
        const jwt = await issueSsoJwtViaBackend(email);
        if (diag) diag.step3_backendIssue = jwt ? 'ok' : 'null';
        if (jwt) return jwt;
    } catch (e) {
        if (diag) diag.step3_backendIssue = code(e);
    }

    return null;
}
