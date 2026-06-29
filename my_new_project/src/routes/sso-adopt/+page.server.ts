import type { PageServerLoad } from './$types';

/**
 * דף-ביניים לזיהוי SSO אוטומטי. ה-hook הפנה לכאן כי קיימת עוגיית gofreeil-auth
 * אך אין סשן קהילה. כאן רק מחלצים את יעד החזרה; הקליינט קורא ל-signIn('gofreeil-sso').
 */
export const load: PageServerLoad = async ({ url }) => {
    const raw = url.searchParams.get('redirect') ?? '/';
    // הגנה מ-open-redirect: רק נתיב פנימי
    const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
    return { redirect };
};
