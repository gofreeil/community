import { handle as authHandle } from './auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError, RequestEvent } from '@sveltejs/kit';
import {
    verifyTrustToken,
    TRUST_COOKIE_NAME,
    COORD_TRUST_COOKIE_NAME,
} from '$lib/server/totp';
import { getUserTotpSecret, getAllSuperAdmins, createItem } from '$lib/server/db';

/**
 * לוכד כל שגיאה לא-מטופלת בצד השרת (load/render/actions) *לפני* ש-SvelteKit
 * מציג את עמוד השגיאה. עד היום קריסות כאלה יצאו כ-"500 Internal Error" גולמי
 * בלי שום תיעוד — ואי-אפשר היה לדעת מה נפל (למשל בעמוד "הנכסים שלי"/פרופיל).
 *
 * כאן אנחנו: (1) מדפיסים ללוג את הסטטוס, ה-URL והסטאק המלא כדי לאתר את השורש,
 * (2) מחזירים למשתמש הודעה גנרית (בלי לדלוף פרטים פנימיים) + מזהה תקלה קצר
 * שמוצג גם ב-+error.svelte, כך שתלונת משתמש ניתנת לשיוך מול השורה בלוג.
 */
/**
 * התראת תקלה לסופר-אדמינים ("הצוות שלנו קיבל על כך התראה" בעמוד השגיאה — באמת):
 * כל שגיאת שרת לא-מטופלת שולחת admin_alert לתיבת ההודעות של כל סופר-אדמין, עם
 * מזהה התקלה שהמשתמש רואה — כך תלונה ("קיבלתי 9R8B08") ניתנת לשיוך מיידי.
 *
 * ריסון: פעם ב-15 דק' לכל חתימת (סטטוס+מסלול+שגיאה) ולכל היותר 8 התראות
 * לאינסטנס — כדי שבאג בדף פופולרי לא יציף את התיבה בעשרות הודעות זהות.
 * fire-and-forget: כשל בשליחה (למשל Strapi עצמו נפל) לעולם לא מפיל את עמוד
 * השגיאה עצמו; הלוג עם ה-ref נשאר תמיד כגיבוי.
 */
const ERROR_ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const ERROR_ALERT_MAX_PER_INSTANCE = 8;
const errorAlertLastSent = new Map<string, number>();
let errorAlertsSent = 0;

async function notifySuperAdminsOfError(ref: string, status: number, event: RequestEvent, err: unknown): Promise<void> {
    try {
        const routeId = event.route?.id ?? event.url.pathname;
        const errMsg = err instanceof Error ? err.message : String(err);
        const sig = `${status}:${routeId}:${errMsg.slice(0, 80)}`;
        const now = Date.now();
        if (now - (errorAlertLastSent.get(sig) ?? 0) < ERROR_ALERT_COOLDOWN_MS) return;
        if (errorAlertsSent >= ERROR_ALERT_MAX_PER_INSTANCE) return;
        errorAlertLastSent.set(sig, now);
        errorAlertsSent++;

        const stackHead = err instanceof Error && err.stack
            ? err.stack.split('\n').slice(0, 8).join('\n').slice(0, 1200)
            : '';
        const url = `${event.request.method} ${event.url.pathname}${event.url.search}`;
        const admins = await getAllSuperAdmins();
        await Promise.allSettled(admins.map((a) => createItem({
            category:    'admin_alert',
            label:       `🌩️ תקלת שרת ${status} - ${routeId}`,
            description:
                `תקלה לא-מטופלת הפילה עמוד באתר, והגולש קיבל את עמוד השגיאה.\n\n` +
                `מזהה תקלה: ${ref} (מוצג לגולש בתחתית עמוד השגיאה)\n` +
                `כתובת: ${url}\n` +
                `שגיאה: ${errMsg.slice(0, 300)}\n` +
                (stackHead ? `\nתחילת ה-stack:\n${stackHead}\n` : '') +
                `\nהפרטים המלאים בלוג השרת תחת [error ${ref}].`,
            icon:        '🌩️',
            color:       'red',
            user_id:     a.id,
            extra_fields: {
                type:          'server_error',
                ref,
                status,
                url:           event.url.pathname + event.url.search,
                method:        event.request.method,
                error_message: errMsg.slice(0, 300),
            },
        })));
    } catch (e) {
        console.warn('[hooks] error alert to admins failed:', e instanceof Error ? e.message : e);
    }
}

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
    const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
    // 404 אינו תקלת-אמת — לא מרעישים את הלוג בשבילו
    if (status !== 404) {
        console.error(
            `[error ${ref}] ${status} "${message}" @ ${event.request.method} ${event.url.pathname}${event.url.search}`,
        );
        console.error(error instanceof Error ? (error.stack ?? error.message) : error);
        // בפיתוח לא שולחים — ה-.env המקומי מדבר עם ה-Strapi הייצורי והתיבה תוצף בכל באג.
        // await (ולא fire-and-forget): על Vercel ה-lambda קופא אחרי שליחת התשובה,
        // ועבודה תלויה באוויר עלולה להיקטע. תקרת 2.5ש כדי לא לתקוע את עמוד השגיאה.
        if (process.env.NODE_ENV === 'production') {
            await Promise.race([
                notifySuperAdminsOfError(ref, status, event, error),
                new Promise<void>((resolve) => setTimeout(resolve, 2500)),
            ]);
        }
    }
    return { message: message ?? 'Internal Error', ref };
};

/**
 * memoization ל-event.locals.auth: ה-jwt callback (כולל קריאת DB) רץ בכל
 * קריאת auth(), ויש עד 5-6 קריאות כאלה פר בקשה (hooks + layout + page loads).
 * עוטפים פעם אחת אחרי authHandle כך שהתוצאה מחושבת פעם אחת לבקשה —
 * מוריד דרמטית עומס וזמן תגובה, במיוחד כש-Strapi איטי.
 */
const memoizeAuth: Handle = async ({ event, resolve }) => {
    const original = event.locals.auth;
    if (typeof original === 'function') {
        let memo: ReturnType<typeof original> | null = null;
        event.locals.auth = (() => (memo ??= original())) as typeof original;
    }
    return resolve(event);
};

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

/**
 * שער 2FA לאזור הניהול. רץ ב-hook (לפני ניתוב) כך שהוא חוסם גם טעינת דפים
 * וגם POST-ים ל-form actions ההרסניים (ban/setRole/delete...) — לא רק את ה-UI.
 *
 * הלוגיקה: סופר-אדמין שהפעיל 2FA (סוד TOTP שמור על המשתמש ב-DB) אך אין לו עוגיית
 * מכשיר-מהימן תקפה → GET מופנה ל-/admin/verify, POST נחסם 403. מכשיר שכבר אומת
 * פעם אחת נושא עוגייה חתומה ועובר חלק. אם 2FA לא הופעל כלל — השער שקוף.
 *
 * הסוד נשמר ב-DB (לא ב-env) כדי שההפעלה תהיה שירות-עצמי אטומי: מאמתים קוד מול
 * הסוד ושומרים אותו באותו צעד — אי-אפשר ש-ה-QR שנסרק לא יתאים לסוד השמור.
 */
const adminGate: Handle = async ({ event, resolve }) => {
    const path = event.url.pathname;
    const guarded =
        path.startsWith('/admin') &&
        path !== '/admin/verify' &&
        path !== '/admin/2fa-setup';
    if (!guarded) return resolve(event);

    let session = null;
    try { session = await event.locals.auth(); } catch { /* ignore */ }
    // לא-אדמין: נותנים ל-load/route עצמו לזרוק 403 כרגיל
    if (session?.user?.role !== 'super_admin' || !session.user.id) return resolve(event);

    let secret: string | null = null;
    try { secret = await getUserTotpSecret(session.user.id); } catch { /* ignore */ }
    if (!secret) return resolve(event); // 2FA לא הופעל → שער שקוף

    const identity = session.user.email ?? session.user.id;
    const trusted = verifyTrustToken(event.cookies.get(TRUST_COOKIE_NAME), identity, secret);
    if (trusted) return resolve(event);

    // לא מאומת במכשיר זה
    if (event.request.method === 'GET') {
        const target = event.url.pathname + event.url.search;
        return new Response(null, {
            status: 302,
            headers: { location: `/admin/verify?redirect=${encodeURIComponent(target)}` },
        });
    }
    return new Response('נדרש אימות דו-שלבי', { status: 403 });
};

/**
 * שער 2FA לאזור הרכזים (/coordinator). מקביל ל-adminGate אך פר-משתמש:
 * הסוד נשמר ב-DB (totp_secret על המשתמש) ולא ב-env, כך שכל רכז מגדיר 2FA
 * משלו. רכז שלא הפעיל 2FA → השער שקוף. רכז שהפעיל אך אין לו עוגיית מכשיר-
 * מהימן → GET מופנה ל-/coordinator/verify, POST נחסם 403 (חוסם גם form actions).
 * דפי ההגדרה והאימות עצמם פטורים כדי לא ליצור לולאה.
 */
const coordinatorGate: Handle = async ({ event, resolve }) => {
    const path = event.url.pathname;
    const guarded =
        path.startsWith('/coordinator') &&
        path !== '/coordinator/verify' &&
        path !== '/coordinator/2fa-setup' &&
        path !== '/coordinator/apply';
    if (!guarded) return resolve(event);

    let session = null;
    try { session = await event.locals.auth(); } catch { /* ignore */ }
    // לא מחובר: ה-load של הדף יפנה ל-/login כרגיל
    if (!session?.user?.id) return resolve(event);

    let secret: string | null = null;
    try { secret = await getUserTotpSecret(session.user.id); } catch { /* ignore */ }
    if (!secret) return resolve(event); // 2FA לא הופעל → שער שקוף

    const identity = session.user.email ?? session.user.id;
    const trusted = verifyTrustToken(event.cookies.get(COORD_TRUST_COOKIE_NAME), identity, secret);
    if (trusted) return resolve(event);

    if (event.request.method === 'GET') {
        const target = event.url.pathname + event.url.search;
        return new Response(null, {
            status: 302,
            headers: { location: `/coordinator/verify?redirect=${encodeURIComponent(target)}` },
        });
    }
    return new Response('נדרש אימות דו-שלבי', { status: 403 });
};

const setStrApiCookie: Handle = async ({ event, resolve }) => {
    const isProd = process.env.NODE_ENV === 'production';
    // עוגייה משותפת לכל 13 אתרי gofreeil.com: זיהוי מאוחד מול רשימת המשתמשים
    // האחת ב-Strapi המשותף. כל אתר תחת .gofreeil.com קורא אותה ומזהה את המשתמש
    // ישירות — בלי redirect ובלי הקלדת פרטים.
    //
    // רענון ולא רק יצירה: ה-jwt callback מרענן strapiJwt פג בסשן, אבל בעבר
    // העוגיות נכתבו רק כשהיו חסרות — ונשארו עם טוקן מת עד פקיעתן (90/365 יום).
    // לכן משווים את ערך העוגייה לטוקן שבסשן ומעדכנים בכל אי-התאמה.
    try {
        const session = await event.locals.auth();
        const jwt = (session?.user as { strapiJwt?: string } | undefined)?.strapiJwt;
        if (jwt) {
            // יש סשן תקין → מנקים את דגל ניסיון ה-SSO כדי שמחזור logout/login הבא יעבוד
            if (event.cookies.get('sso_adopt_tried')) {
                event.cookies.delete('sso_adopt_tried', { path: '/' });
            }
            if (event.cookies.get('strapi_jwt') !== jwt) {
                event.cookies.set('strapi_jwt', jwt, {
                    httpOnly: true,
                    secure:   isProd,
                    sameSite: 'strict',
                    path:     '/',
                    maxAge:   60 * 60 * 24 * 365,
                });
            }
            if (isProd && event.cookies.get('gofreeil-auth') !== jwt) {
                event.cookies.set('gofreeil-auth', jwt, {
                    httpOnly: true,
                    secure:   true,
                    sameSite: 'lax',
                    path:     '/',
                    domain:   '.gofreeil.com',
                    maxAge:   60 * 60 * 24 * 90,
                });
            }
        }
    } catch { /* ignore - session unavailable */ }
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
        return await sequence(authHandle, memoizeAuth, ssoAutoAdopt, adminGate, coordinatorGate, checkBanned, setStrApiCookie)({ event, resolve });
    } catch (err) {
        console.warn('[hooks] auth handle threw - continuing anonymously:', err);
        // fallback: מגדיר auth בטוח כדי שקוד downstream לא יזרוק TypeError
        if (!event.locals.auth) {
            (event.locals as unknown as Record<string, unknown>).auth = async () => null;
        }
        return await resolve(event);
    }
};
