import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

	let jwt: string | undefined;
	try {
		const session = await locals.auth();
		jwt = (session?.user as { strapiJwt?: string } | undefined)?.strapiJwt;
	} catch {
		jwt = undefined;
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

	// לא מחובר → מודיעים לאתר הקורא שהמשתמש אינו רשום
	callback.searchParams.set('error', 'not_registered');
	throw redirect(302, callback.toString());
};
