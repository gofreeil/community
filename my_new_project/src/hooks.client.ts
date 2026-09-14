import type { HandleClientError } from '@sveltejs/kit';
import { version } from '$app/environment';

/**
 * המקבילה של handleError בצד הדפדפן — והחוליה שהייתה חסרה.
 *
 * לא כל 500 מגיע מהשרת: כשל בניווט בצד הלקוח (שליפת __data.json שנקטעה,
 * timeout, 502 מה-CDN) או חריגה ברינדור של רכיב מפילים את הדף בדיוק אותו דבר.
 * בלי הוק כזה SvelteKit משתמש בברירת המחדל שלו: סטטוס 500, message גנרי,
 * **בלי ref, בלי שורת לוג ובלי התראה** — הגולש רואה "אופס, משהו השתבש" ואי-אפשר
 * לדעת לא איפה, לא למי ולא למה. מבחינת האתר התקלה פשוט לא קרתה.
 *
 * כאן: (1) מזהה תקלה שמוצג לגולש בתחתית +error.svelte, בדיוק כמו בצד השרת,
 * (2) שורת לוג מלאה בקונסולה של הדפדפן, (3) דיווח ל-/api/client-error שרושם
 * בלוג השרת ומתריע לסופר-אדמינים — כך ש"הצוות שלנו קיבל על כך התראה" שכתוב
 * בעמוד השגיאה נכון גם במקרה הזה.
 */
function newRef(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * תקלות ניווט חולפות — לא באג בקוד אלא מצב סביבתי שמתאושש בטעינה מחדש:
 *  • stale_build — עלתה גרסה חדשה (דיפלוי) בזמן שהדף היה פתוח בדפדפן, והניווט
 *    מנסה למשוך chunk ישן שכבר לא קיים על השרת ("Failed to fetch dynamically
 *    imported module"). SvelteKit עצמו מרענן במקרה הזה רק בניווט אמיתי — אבל
 *    preload (ריחוף/נגיעה בקישור) מגיע לכאן בלי הבדיקה הזו ומרעיש לשווא.
 *  • network — הבקשה ל-__data.json נפלה ברמת הרשת: "Failed to fetch" בכרום,
 *    "Load failed" בספארי, "NetworkError" בפיירפוקס — ניתוק, מעבר רשת, או חיבור
 *    שנרדם כשהדפדפן בנייד היה ברקע.
 * שני המקרים מקבלים recover:'reload' — +error.svelte טוען את היעד מחדש מהשרת
 * במקום להשאיר את הגולש עם "אופס". stale_build מאומת מול version.json: אם הגרסה
 * אכן התחלפה זה לא באג ולא מטרידים את האדמינים (לוג בלבד); אחרת ה-chunk חסר
 * מהבנייה הנוכחית — תקלה אמיתית שמדווחת כרגיל.
 */
type TransientKind = 'stale_build' | 'network';

const STALE_BUILD_RE =
    /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const NETWORK_RE =
    /^(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.?|The network connection was lost\.?|The Internet connection appears to be offline\.?|cancelled)$/i;

function classify(error: unknown): TransientKind | null {
    const msg = (error instanceof Error ? error.message : String(error)).trim();
    if (STALE_BUILD_RE.test(msg)) return 'stale_build';
    if (error instanceof TypeError && NETWORK_RE.test(msg)) return 'network';
    return null;
}

/** האם גרסת האתר על השרת שונה מזו שנבנתה לתוך הדפדפן הזה. כשל בבדיקה = "לא ידוע" (false). */
async function buildChanged(): Promise<boolean> {
    try {
        const res = await fetch('/_app/version.json', {
            headers: { pragma: 'no-cache', 'cache-control': 'no-cache' },
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { version?: string };
        return !!data.version && data.version !== version;
    } catch {
        return false;
    }
}

/**
 * צומת שגיאה של השרת שהגיע לכאן כמו שהוא — `{ type:'error', status, error:{message, ref} }`.
 *
 * זה מה שה-load של השרת מחזיר ב-__data.json כשהוא זרק (גם `error(403)` מכוון וגם
 * קריסה אמיתית). בניווט אמיתי SvelteKit מזהה את הצומת ולא קורא ל-handleError
 * ("כבר טופל בשרת") — אבל בנתיב ה-**preload** (ריחוף/נגיעה בקישור) הוא מעביר את
 * האובייקט הגולמי ישירות לכאן. התוצאה הייתה התראה "500 [object Object]" על
 * /admin לכל מנהל-שכונה שריחף על הקישור וקיבל 403 - לא באג, ולא 500.
 * השרת כבר רשם ללוג והתריע (אם היה 5xx) עם ה-ref שלו; כאן רק מעבירים אותו הלאה.
 */
type ServerErrorNode = { type: 'error'; status?: number; error?: { message?: string; ref?: string } | null };

function asServerErrorNode(error: unknown): ServerErrorNode | null {
    if (!error || typeof error !== 'object' || error instanceof Error) return null;
    const n = error as Partial<ServerErrorNode>;
    return n.type === 'error' && 'error' in n ? (n as ServerErrorNode) : null;
}

/** טקסט שגיאה קריא לכל ערך שנזרק - לא "[object Object]" על אובייקט שאינו Error. */
function errorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
        const m = (error as { message?: unknown }).message;
        if (typeof m === 'string' && m) return m;
        try {
            return JSON.stringify(error).slice(0, 300);
        } catch { /* circular etc. */ }
    }
    return String(error);
}

/** דיווח best-effort. כל כשל כאן נבלע: תקלה בדיווח לא תיצור תקלה נוספת. */
function report(body: Record<string, unknown>): void {
    try {
        void fetch('/api/client-error', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            // הניווט ממשיך לעמוד השגיאה תוך כדי — בלי keepalive הבקשה מבוטלת
            keepalive: true,
        }).catch(() => {});
    } catch { /* ignore */ }
}

export const handleError: HandleClientError = async ({ error, event, status, message }) => {
    // 404 אינו תקלת-אמת — לא מרעישים את הלוג בשבילו (זהה לצד השרת)
    if (status === 404) return { message: message ?? 'Not Found' };

    const path = event.url.pathname + event.url.search;

    // שגיאה שהשרת כבר טיפל בה (ראו asServerErrorNode): לא מדווחים פעמיים ולא מציגים
    // "500" על 403. ה-ref של השרת נשאר כדי שהגולש והלוג ידברו על אותו מזהה.
    const node = asServerErrorNode(error);
    if (node) {
        const nodeStatus = node.status ?? status;
        console.warn(`[client-error] ${nodeStatus} server error node during preload @ ${path}` +
            (node.error?.ref ? ` (server ref ${node.error.ref})` : ''));
        return {
            message: node.error?.message ?? message ?? 'Internal Error',
            ref: node.error?.ref,
        };
    }

    const ref = newRef();
    const errMsg = errorText(error);

    const kind = classify(error);
    const stale = kind === 'stale_build' && (await buildChanged());
    // בלי חיבור בכלל: אין למי לדווח ואין טעם לרענן — עמוד השגיאה עם "נסה שוב" הוא הנכון
    const offline = kind === 'network' && typeof navigator !== 'undefined' && navigator.onLine === false;

    const tag = kind ? ` [${kind}${stale ? ', build changed' : ''}${offline ? ', offline' : ''}]` : '';
    console.error(`[client-error ${ref}] ${status} "${message}" @ ${path}${tag}`);
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);

    if (!offline) {
        report({
            ref,
            status,
            routeId: event.route?.id ?? event.url.pathname,
            path,
            message: errMsg,
            // חתוך: /api/client-error דוחה גוף מעל 8KB, ו-stack ארוך היה מאבד את הדיווח כולו
            stack: error instanceof Error ? (error.stack ?? '').slice(0, 2000) : '',
            kind: kind ?? undefined,
            stale,
        });
    }

    return {
        message: message ?? 'Internal Error',
        ref,
        recover: kind && !offline ? 'reload' : undefined,
    };
};
