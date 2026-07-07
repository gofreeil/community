import { createHash } from 'crypto';
import {
    strapiLogin,
    strapiRegister,
    findStrapiUpUsers,
    updateStrapiUpUser,
} from './strapiClient';

const AUTH_SECRET = process.env.AUTH_SECRET ?? '';

/**
 * מפיק JWT של ה-Strapi המשותף עבור משתמש ברשימה המאוחדת, בלי סיסמה שהמשתמש
 * מקליד. הסיסמה דטרמיניסטית — sha256(stableId + AUTH_SECRET) — כך שאותו משתמש
 * מקבל תמיד את אותה סיסמה, וכל login עוקב מצליח.
 *
 * שלושה מסלולים, מהזול ליקר:
 *   1. login עם ה-seed — עובד אם החשבון כבר נוצר תחת אותו stableId.
 *   2. register — עובד אם האימייל עדיין לא קיים ב-Strapi.
 *   3. ריפוי אדמין — האימייל קיים אך עם seed אחר (מיזוג Google↔credentials/אימייל,
 *      או חשבון שנוצר לפני שינוי סכמת ה-seed). מאתרים לפי אימייל דרך טוקן האדמין,
 *      מאפסים את הסיסמה ל-seed ונכנסים. מרפא כל משתמש קיים ברשימה.
 *
 * מחזיר null רק אם אין AUTH_SECRET / אין אימייל / הריפוי נכשל (למשל טוקן אדמין
 * בלי הרשאה או Strapi למטה).
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

    // 1. כניסה עם ה-seed הדטרמיניסטי
    try {
        const { jwt } = await strapiLogin(email, password);
        if (jwt) { if (diag) diag.step1_login = 'ok'; return jwt; }
    } catch (e) { if (diag) diag.step1_login = code(e); }

    // 2. משתמש לא קיים — ניצור אותו
    try {
        const { jwt } = await strapiRegister(username, email, password);
        if (jwt) { if (diag) diag.step2_register = 'ok'; return jwt; }
    } catch (e) { if (diag) diag.step2_register = code(e); }

    // 3. ריפוי אדמין: מאתרים לפי אימייל, מאפסים סיסמה ל-seed, נכנסים.
    try {
        const found = await findStrapiUpUsers({ 'filters[email][$eqi]': email });
        if (diag) diag.step3_findCount = Array.isArray(found) ? found.length : -1;
        const existing = found?.[0] as { id?: number } | undefined;
        if (existing?.id) {
            if (diag) diag.step3_foundId = true;
            await updateStrapiUpUser(existing.id, { password });
            if (diag) diag.step3_updated = true;
            const { jwt } = await strapiLogin(email, password);
            if (diag) diag.step3_relogin = jwt ? 'ok' : 'no-jwt';
            if (jwt) return jwt;
        }
    } catch (err) {
        if (diag) diag.step3_err = code(err);
        console.warn('[strapiJwt] admin-heal failed:', err);
    }
    return null;
}
