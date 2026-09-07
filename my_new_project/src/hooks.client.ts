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

    const ref = newRef();
    const errMsg = error instanceof Error ? error.message : String(error);
    const path = event.url.pathname + event.url.search;

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
            stack: error instanceof Error ? (error.stack ?? '') : '',
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
