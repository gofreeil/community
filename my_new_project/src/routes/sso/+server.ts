import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrCreateStrapiJwt } from '$lib/server/strapiJwt';
import { getStrapiMe } from '$lib/server/strapiClient';

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
 * חסינות: לא מסתמכים על כך ש-`session.user.strapiJwt` כבר קיים *ותקף*. שני מקרים:
 *   א. חסר לגמרי — סשנים ישנים/OAuth/ממוזגים נשמרו בלי strapiJwt.
 *   ב. קיים אך פג — הסשן חי שנה (auth.ts) בעוד ש-JWT של Strapi פג הרבה קודם.
 *      במקרה כזה נשתול טוקן מת בעוגייה, והאתר האחות יאמת אותו מול /api/users/me,
 *      יקבל 401, ויראה "לא רשום" — למרות שהמשתמש מחובר מצוין.
 * לכן: מאמתים את הטוקן שבסשן מול Strapi; אם חסר או פג — מייצרים חדש לפי אימייל+מזהה.
 * כך הגשר תמיד שותל טוקן חי בלבד.
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

export const GET: RequestHandler = async ({ locals, url, cookies, request }) => {
	const debug = url.searchParams.get('debug') === '1';
	const callback = isAllowedCallback(url.searchParams.get('callback'));
	if (!callback && !debug) throw error(400, 'callback לא חוקי — חייב להיות כתובת תחת gofreeil.com');

	let session: Awaited<ReturnType<typeof locals.auth>> = null;
	let authThrew = false;
	try {
		session = await locals.auth();
	} catch {
		session = null;
		authThrew = true;
	}

	const user = session?.user as
		| { strapiJwt?: string; email?: string | null; id?: string | null }
		| undefined;

	// אבחון: booleans בלבד, בלי ערכי טוקן. נחשף רק עם ?debug=1.
	const diag: Record<string, unknown> = {
		marker: 'sso-v3-validate',
		hasSessionCookie: !!request.headers.get('cookie')?.match(/authjs|__Secure-authjs|session-token/i),
		authThrew,
		hasSession: !!session,
		hasUser: !!user,
		hasEmail: !!user?.email,
		hasUserId: !!user?.id,
		hadStrapiJwtInSession: !!user?.strapiJwt,
	};

	// 1. הטוקן שבסשן — אבל רק אם הוא עדיין תקף מול Strapi (לא פג).
	let jwt: string | undefined = user?.strapiJwt;
	if (jwt) {
		try {
			const me = await getStrapiMe(jwt);
			if (!me) jwt = undefined; // פג/לא תקף → נייצר חדש למטה
			diag.sessionJwtValid = !!me;
		} catch {
			jwt = undefined;
			diag.sessionJwtValid = false;
		}
	}

	// 2. חסר או פג → מייצרים במקום לפי הזהות שבסשן.
	//    stableId = ה-dbUserId (session.user.id); נפילה ל-credentials_<email> אם חסר.
	if (!jwt && user?.email) {
		const stableId = user.id || `credentials_${user.email.trim().toLowerCase()}`;
		try {
			jwt = (await getOrCreateStrapiJwt(user.email, stableId)) ?? undefined;
			diag.mintedFresh = !!jwt;
		} catch {
			jwt = undefined;
			diag.mintedFresh = false;
			diag.mintThrew = true;
		}
	}

	diag.finalHasJwt = !!jwt;

	if (debug) {
		return new Response(JSON.stringify(diag, null, 2), {
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	}

	// כאן debug=false, ולכן (מהבדיקה בראש) callback מובטח קיים
	if (!callback) throw error(400, 'callback לא חוקי');

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
