import { handle as authHandle } from './auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

/**
 * אחרי auth - אם המשתמש מחובר ויש לו strapiJwt בסשן אך אין cookie,
 * נשמור את ה-JWT ב-HttpOnly cookie (ל-7 ימים).
 * מאפשר לכל שרת-אקשן לקרוא את הטוקן מה-cookie ולשלוח ל-Strapi.
 */
/** בדיקת חסימה - אם המשתמש banned מפנים לדף חסימה */
const checkBanned: Handle = async ({ event, resolve }) => {
    // לא חוסם את דף החסימה עצמו, login, ו-API של auth
    const path = event.url.pathname;
    if (path === '/banned' || path.startsWith('/api/auth') || path === '/login') {
        return resolve(event);
    }
    try {
        const session = await event.locals.auth();
        if (session?.user?.banned) {
            return new Response(null, {
                status: 302,
                headers: { location: '/banned' },
            });
        }
    } catch { /* ignore */ }
    return resolve(event);
};

/**
 * זיהוי-SSO אוטומטי: משתמש שכבר מחובר באתר אחר תחת gofreeil.com מגיע עם
 * עוגיית `gofreeil-auth` אך בלי סשן קהילה. במקרה כזה מפנים פעם אחת ל-/sso-adopt
 * שמקים סשן דרך הספק gofreeil-sso — וכך הוא "כבר מחובר" בלי ללחוץ על כלום.
 * עוגיית `sso_adopt_tried` (שעה) מונעת לולאת-הפניות אם ה-JWT פג/לא תקין.
 */
const ssoAutoAdopt: Handle = async ({ event, resolve }) => {
    const path = event.url.pathname;
    const isHtmlGet =
        event.request.method === 'GET' &&
        (event.request.headers.get('accept') ?? '').includes('text/html');
    const hasShared  = !!event.cookies.get('gofreeil-auth');
    const alreadyTried = !!event.cookies.get('sso_adopt_tried');
    // לא מפנים על נתיבי auth/adopt/login עצמם, על נכסים, או על בקשות שאינן ניווט HTML
    const excluded =
        path.startsWith('/api') ||
        path.startsWith('/sso-adopt') ||
        path === '/login' || path === '/register' || path === '/banned';

    if (isHtmlGet && hasShared && !alreadyTried && !excluded) {
        let loggedIn = false;
        try {
            const session = await event.locals.auth();
            loggedIn = !!session?.user;
        } catch { /* ignore */ }
        if (!loggedIn) {
            event.cookies.set('sso_adopt_tried', '1', {
                path: '/', httpOnly: true, sameSite: 'lax', secure: true, maxAge: 60 * 60,
            });
            const target = event.url.pathname + event.url.search;
            return new Response(null, {
                status: 302,
                headers: { location: `/sso-adopt?redirect=${encodeURIComponent(target)}` },
            });
        }
    }
    return resolve(event);
};

const setStrApiCookie: Handle = async ({ event, resolve }) => {
    const isProd = process.env.NODE_ENV === 'production';
    // עוגייה משותפת לכל 13 אתרי gofreeil.com: זיהוי מאוחד מול רשימת המשתמשים
    // האחת ב-Strapi המשותף. כל אתר תחת .gofreeil.com קורא אותה ומזהה את המשתמש
    // ישירות — בלי redirect ובלי הקלדת פרטים.
    const needsLocal  = !event.cookies.get('strapi_jwt');
    const needsShared = isProd && !event.cookies.get('gofreeil-auth');
    if (needsLocal || needsShared) {
        try {
            const session = await event.locals.auth();
            const jwt = (session?.user as { strapiJwt?: string } | undefined)?.strapiJwt;
            if (jwt) {
                // יש סשן תקין → מנקים את דגל ניסיון ה-SSO כדי שמחזור logout/login הבא יעבוד
                if (event.cookies.get('sso_adopt_tried')) {
                    event.cookies.delete('sso_adopt_tried', { path: '/' });
                }
                if (needsLocal) {
                    event.cookies.set('strapi_jwt', jwt, {
                        httpOnly: true,
                        secure:   isProd,
                        sameSite: 'strict',
                        path:     '/',
                        maxAge:   60 * 60 * 24 * 365,
                    });
                }
                if (needsShared) {
                    event.cookies.set('gofreeil-auth', jwt, {
                        httpOnly: true,
                        secure:   true,
                        sameSite: 'lax',
                        path:     '/',
                        domain:   '.gofreeil.com',
                        maxAge:   60 * 60 * 24 * 30,
                    });
                }
            }
        } catch { /* ignore - session unavailable */ }
    }
    return resolve(event);
};

/**
 * עוטפים את ה-handle של Auth ב-try/catch.
 * אם ה-JWT קיים בעוגייה אבל לא תקין (למשל AUTH_SECRET שונה),
 * @auth/sveltekit עלול לזרוק - ואז כל הדפים מקבלים 500.
 * הפתרון: אם handle זורק, נמשיך ב-resolve רגיל (משתמש אנונימי).
 */
export const handle: Handle = async ({ event, resolve }) => {
    // נתיב תמונת הקדימון (OG) ציבורי לחלוטין - עוקפים את ה-auth כדי שלא
    // ייווסף Set-Cookie (שמונע cache ב-CDN). כך סקרפרים של רשתות חברתיות
    // (טלגרם/וואטסאפ/פייסבוק) מקבלים את התמונה מהר ומה-edge cache.
    if (/^\/api\/items\/[^/]+\/og\.jpg$/.test(event.url.pathname)) {
        (event.locals as unknown as Record<string, unknown>).auth = async () => null;
        return await resolve(event);
    }

    try {
        return await sequence(authHandle, ssoAutoAdopt, checkBanned, setStrApiCookie)({ event, resolve });
    } catch (err) {
        console.warn('[hooks] auth handle threw - continuing anonymously:', err);
        // fallback: מגדיר auth בטוח כדי שקוד downstream לא יזרוק TypeError
        if (!event.locals.auth) {
            (event.locals as unknown as Record<string, unknown>).auth = async () => null;
        }
        return await resolve(event);
    }
};
