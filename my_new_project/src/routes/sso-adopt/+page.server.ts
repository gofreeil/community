import { redirect } from '@sveltejs/kit';
import { getStrapiMeVerdict } from '$lib/server/strapiClient';
import type { PageServerLoad } from './$types';

/**
 * דף-ביניים לזיהוי SSO אוטומטי. ה-hook הפנה לכאן כי קיימת עוגיית gofreeil-auth
 * אך אין סשן קהילה.
 *
 * מאמתים את העוגייה מול Strapi *כאן, בשרת* לפני שנותנים לקליינט לנסות signIn:
 * עוגייה מתה (JWT פג / משתמש נחסם / רוטציית secret) נמחקת מיד והמשתמש מוחזר
 * ליעד המקורי כאורח — במקום להיזרק ל-/login עם שגיאה ולחזור על הריקוד כל שעה.
 * תקלה זמנית ב-Strapi (לא דחייה ודאית) — לא מוחקים עוגייה שאולי חיה, רק
 * חוזרים ליעד; עוגיית sso_adopt_tried (שעה) כבר מונעת לולאה.
 */
export const load: PageServerLoad = async ({ url, cookies }) => {
    const raw = url.searchParams.get('redirect') ?? '/';
    // הגנה מ-open-redirect: רק נתיב פנימי. חוסם גם '\' כתו שני ('/\evil.com'
    // נפתר בדפדפן ל-https://evil.com כי '\'='/' ב-URL עם סכמה מיוחדת)
    const redirectTo = /^\/(?![/\\])/.test(raw) ? raw : '/';

    const jwt = cookies.get('gofreeil-auth');
    if (!jwt) throw redirect(302, redirectTo);

    const { user, definitive } = await getStrapiMeVerdict(jwt);
    if (!user?.email) {
        if (definitive) {
            // עוגייה מתה — מנקים אותה (וגם strapi_jwt יתום) כדי שהריקוד לא יחזור
            cookies.delete('gofreeil-auth', { path: '/', domain: '.gofreeil.com' });
            cookies.delete('gofreeil-auth', { path: '/' });
            cookies.delete('strapi_jwt', { path: '/' });
        }
        throw redirect(302, redirectTo);
    }

    return { redirect: redirectTo };
};
