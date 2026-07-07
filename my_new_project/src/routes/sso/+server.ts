import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrCreateStrapiJwt } from '$lib/server/strapiJwt';

/**
 * SSO bridge לכל אתרי gofreeil.com.
 * אתר אחר (למשל רכישות קבוצתיות) מפנה לכאן עם ?callback=<url>.
 *
 * - אם המשתמש מחובר בקהילה → קובעים את העוגייה המשותפת `gofreeil-auth`
 *   על `.gofreeil.com` (אותו JWT של Strapi המשותף) ומחזירים ל-callback.
 *   כל אתר תחת הדומיין יזהה אותו מיד.
 * - אם אינו מחובר/רשום → מחזירים ל-callback עם ?error=not_registered.
 *
 * ה-callback חייב להיות תת-דומיין של gofreeil.com (הגנה מ-open-redirect).
 *
 * חסינות: לא מסתמכים על כך ש-`session.user.strapiJwt` כבר קיים. סשנים ישנים/
 * OAuth נשמרו לפעמים בלי strapiJwt (ה-Strapi המשותף לא היה זמין לרגע בעת ההתחברות,
 * או שהחשבון מוזג), וה-jwt callback לא תמיד הספיק לרפא בזמן. לכן אם המשתמש מחובר
 * אך חסר לו strapiJwt — מייצרים אותו כאן ועכשיו לפי אימייל+מזהה, וכך הגשר תמיד עובד.
 */

const SHARED_COOKIE = 'gofreeil-auth';

function isAllowedCallback(raw: string | null): URL | null {
	if (!raw) return null;
	let u: URL;
	try {
		u = new URL(raw);
	} catch {
		return null;
	}
	if (u.protocol !== 'https:') return null;
	if (u.hostname !== 'gofreeil.com' && !u.hostname.endsWith('.gofreeil.com')) return null;
	return u;
}

export const GET: RequestHandler = async ({ locals, url, cookies }) => {
	const callback = isAllowedCallback(url.searchParams.get('callback'));
	if (!callback) throw error(400, 'callback לא חוקי — חייב להיות כתובת תחת gofreeil.com');

	let session: Awaited<ReturnType<typeof locals.auth>> = null;
	try {
		session = await locals.auth();
	} catch {
		session = null;
	}

	const user = session?.user as
		| { strapiJwt?: string; email?: string | null; id?: string | null }
		| undefined;

	// 1. הטוקן כבר בסשן (המסלול הרגיל)
	let jwt: string | undefined = user?.strapiJwt;

	// 2. מחובר אך חסר strapiJwt → מייצרים במקום לפי הזהות שבסשן.
	//    stableId = ה-dbUserId (session.user.id); נפילה ל-credentials_<email> אם חסר.
	if (!jwt && user?.email) {
		const stableId = user.id || `credentials_${user.email.trim().toLowerCase()}`;
		try {
			jwt = (await getOrCreateStrapiJwt(user.email, stableId)) ?? undefined;
		} catch {
			jwt = undefined;
		}
	}

	if (jwt) {
		// אותן אפשרויות בדיוק כמו authCookieOptions של רכישות קבוצתיות
		cookies.set(SHARED_COOKIE, jwt, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			domain: '.gofreeil.com',
			maxAge: 60 * 60 * 24 * 90, // 90 ימים
		});
		throw redirect(302, callback.toString());
	}

	// לא מחובר / לא נמצא ברשימה → מודיעים לאתר הקורא
	callback.searchParams.set('error', 'not_registered');
	throw redirect(302, callback.toString());
};
