/**
 * שער השכונה - משותף לשרת (+layout.server.ts) ולדפדפן (+layout.svelte).
 *
 * משתמש מחובר בלי שכונה - לא משנה איך נרשם (אימייל, גוגל, פייסבוק, SSO מאתר
 * אחר, או חשבון ממוזג שדילג על האשף) - מופנה לשלב 1 של אשף ההרשמה עד שיבחר
 * עיר ושכונה. סופר-אדמין פטור כדי לא לנעול את בעל האתר בטעות.
 *
 * למה גם בדפדפן: בלי זה כל לחיצה על קישור מתוך האשף עשתה שני סבבי רשת -
 * נתוני היעד (שהשרת ממילא דוחה) ואז שוב נתוני /onboarding/1 - רק כדי לחזור
 * לאותו מסך בלי שום הסבר. כשהסבב השני נפל ברשת (26.9.2026, Y7X726) גולש
 * שנרשם הרגע קיבל עמוד שגיאה ועזב. השרת נשאר הסמכות; הדפדפן רק חוסך את הסבב.
 */

/**
 * נתיבים שפתוחים גם למשתמש מחובר שעדיין לא בחר שכונה: האשף עצמו, מסכי
 * כניסה/הרשמה/אימות, גשרי SSO, דפי מידע ותנאים. כל השאר מופנה ל-/onboarding/1.
 */
export const NEIGHBORHOOD_GATE_EXEMPT = [
    '/onboarding', '/login', '/register', '/banned', '/confirm-email',
    '/forgot-password', '/reset-password', '/sso', '/sso-adopt', '/auth',
    '/admin/verify', '/coordinator/verify', '/about', '/sitemap.xml', '/api',
];

export const NEIGHBORHOOD_GATE_TARGET = '/onboarding/1';

export function isNeighborhoodGateExempt(path: string): boolean {
    return NEIGHBORHOOD_GATE_EXEMPT.some(p => path === p || path.startsWith(p + '/'));
}

/** האם המשתמש נעול מאחורי השער. null/undefined (שליפה שנכשלה) = לא ידוע → לא חוסמים. */
export function needsNeighborhood(
    user: { banned?: boolean | null; role?: string | null; neighborhood?: string | null } | null | undefined,
): boolean {
    return !!user && !user.banned && user.role !== 'super_admin' && !(user.neighborhood ?? '').trim();
}
