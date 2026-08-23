import type { HandleClientError } from '@sveltejs/kit';

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

export const handleError: HandleClientError = ({ error, event, status, message }) => {
    // 404 אינו תקלת-אמת — לא מרעישים את הלוג בשבילו (זהה לצד השרת)
    if (status === 404) return { message: message ?? 'Not Found' };

    const ref = newRef();
    const errMsg = error instanceof Error ? error.message : String(error);
    const path = event.url.pathname + event.url.search;

    console.error(`[client-error ${ref}] ${status} "${message}" @ ${path}`);
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);

    report({
        ref,
        status,
        routeId: event.route?.id ?? event.url.pathname,
        path,
        message: errMsg,
        stack: error instanceof Error ? (error.stack ?? '') : '',
    });

    return { message: message ?? 'Internal Error', ref };
};
