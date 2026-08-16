import { redirect, isRedirect } from '@sveltejs/kit';
import { getStrapiMeVerdict } from '$lib/server/strapiClient';
import { getUserByEmail } from '$lib/server/db';
import { signIn } from '../../auth';
import type { PageServerLoad, Actions } from './$types';

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
    if (!jwt) {
        // חזרה מגשר ה-SSO של האתר הראשי עם כישלון (error=not_registered) —
        // מדביקים sso_error ליעד כדי שדף הפרופיל יציג את העצה, לא נחיתה שקטה
        if (url.searchParams.get('error')) {
            const sep = redirectTo.includes('?') ? '&' : '?';
            throw redirect(302, `${redirectTo}${sep}sso_error=1`);
        }
        throw redirect(302, redirectTo);
    }

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

    // מסך פתיחה: מי שמגיע דרך אתר אחר ואין לו עדיין כרטיס קהילה הוא מצטרף חדש
    // ("ברוכים המצטרפים"); מי שכבר קיים אצלנו הוא חוזר ("ברוכים השבים").
    // בכשל בזיהוי נוטים ל-'back' — פחות מטעה מלברך ותיק כאילו הוא חדש.
    let welcome: 'new' | 'back' = 'back';
    try {
        const existing = await getUserByEmail(user.email.trim().toLowerCase(), jwt);
        if (!existing) welcome = 'new';
    } catch {
        /* ignore — נשאר 'back' */
    }

    return { redirect: redirectTo, welcome };
};

// כניסת ה-SSO חייבת לרוץ בצד שרת: ה-signIn של @auth/sveltekit/client שולח
// ספק credentials עם id מותאם (gofreeil-sso) לנקודת הקצה של OAuth במקום
// ל-callback, ולכן authorize() לא רץ כלל והמשתמש הוחזר ל-/login בלי שגיאה.
// ה-signIn השרתי מזהה את סוג הספק ומנתב נכון.
export const actions: Actions = {
	default: async (event) => {
		try {
			await signIn(event);
		} catch (err) {
			// הצלחה נזרקת כ-redirect של SvelteKit — מעבירים הלאה
			if (isRedirect(err)) throw err;
			// כישלון אימות — ל-login עם קוד שגיאה (יוצג כהודעה כללית)
			throw redirect(303, '/login?error=sso_failed');
		}
	}
};
