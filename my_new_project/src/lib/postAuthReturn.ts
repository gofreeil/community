/**
 * יעד חזרה אחרי הרשמה / כניסה / אשף ההשלמה.
 *
 * הבעיה: מי שמתחיל פעולה כאורח (למשל "בקשה להיות שדכן מערכת") עובר הרשמה, אימות
 * מייל, אשף שכונה ועוד - ובדרך היעד נאבד והיא נוחתת ב-/profile. כאן שומרים את
 * היעד בדפדפן (localStorage, עם תפוגה) וכל תחנה בדרך מחזירה אותו בסוף.
 *
 * הפונקציות הטהורות (safeReturnPath) בטוחות גם בשרת; השאר רק בדפדפן.
 */

const KEY = 'post_auth_return';
const TTL_MS = 2 * 60 * 60 * 1000;

/** עמוד "הצטרפות כשדכן/ית" - מסך אחד שמטפל גם באורחת וגם במחוברת */
export const MATCHMAKER_JOIN_PATH = '/singles/matchmaker/join';

// מסכי האימות עצמם אינם יעד חזרה - אחרת נכנסים ללולאה
const AUTH_PREFIXES = ['/login', '/register', '/onboarding', '/confirm-email', '/forgot-password', '/reset-password'];

/** נתיב פנימי בלבד (נגד open-redirect): מתחיל ב-'/' ולא ב-'//' או '/\' */
export function safeReturnPath(raw: string | null | undefined): string | null {
    if (!raw || raw.length > 300 || !/^\/(?![/\\])/.test(raw)) return null;
    const path = raw.split(/[?#]/)[0];
    if (AUTH_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) return null;
    return raw;
}

export function rememberReturn(path: string): void {
    const safe = safeReturnPath(path);
    if (!safe) return;
    try {
        localStorage.setItem(KEY, JSON.stringify({ path: safe, at: Date.now() }));
    } catch { /* גלישה פרטית / אחסון חסום - ממשיכים בלי */ }
}

/** קורא בלי למחוק (מסכי ביניים שרק מציגים "אנחנו בדרך ל..." או מנווטים) */
export function peekReturn(): string | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const v = JSON.parse(raw) as { path?: string; at?: number };
        if (!v?.at || Date.now() - v.at > TTL_MS) {
            localStorage.removeItem(KEY);
            return null;
        }
        return safeReturnPath(v.path);
    } catch {
        return null;
    }
}

export function clearReturn(): void {
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

/**
 * היעד + welcome=new: מסך הפתיחה ביעד מציג "השלמת את ההרשמה — כעת תועבר לבקשתך
 * הראשונה" (ראו authIntent.ts). מסך הפתיחה נקרא רק בטעינה מלאה - לנווט ב-location.
 */
export function withWelcomeNew(path: string): string {
    const u = new URL(path, 'http://x');
    u.searchParams.set('welcome', 'new');
    return `${u.pathname}${u.search}${u.hash}`;
}

/** קורא ומוחק - התחנה האחרונה בדרך (סוף האשף, או היעד עצמו) */
export function takeReturn(): string | null {
    const p = peekReturn();
    clearReturn();
    return p;
}
