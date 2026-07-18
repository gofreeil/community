// גישה ללוח הפנויים/פנויות — "מועדון סגור".
// מודל היברידי (לפי החלטת המשתמש):
//   • מי שפרסם כרטיס משלו שאושר (status='active') — גישה אוטומטית.
//   • כל השאר (הורים/שדכנים) — מבקשים גישה, וסופר-אדמין מאשר בפאנל /admin/singles-review.
// הבקשות נשמרות כפריטי category='singles_access' (קטגוריה חופשית, בלי שינוי סכמה בבאקאנד).
// הסטטוס נשמר ב-extra_fields.status ('pending' | 'approved' | 'rejected') — בדיוק כמו singles_request.

import { getItemsByUserId, getItemsByCategory } from './db';
import { getMatchmakerStatus } from './matchmaker';

export type SinglesAccessStatus = 'granted' | 'pending' | 'none' | 'unavailable';

function reqStatus(extra_fields: string | null | undefined): string {
    try { return String(JSON.parse(extra_fields || '{}').status || 'pending'); } catch { return 'pending'; }
}

/**
 * מחזיר את מצב הגישה של המשתמש ללוח הפנויים.
 * 'unavailable' = תקלת Strapi זמנית — אי-אפשר לקבוע גישה. הקוראים חייבים
 * להציג "נסה שוב" ולא לזרוק משתמש מאושר החוצה כאילו אין לו גישה.
 */
export async function getSinglesAccessStatus(
    userId: string | null | undefined,
    isSuperAdmin = false,
): Promise<SinglesAccessStatus> {
    if (isSuperAdmin) return 'granted';
    if (!userId) return 'none';
    const uid = String(userId);
    let hadError = false;

    // 1) בעל כרטיס פנויים מאושר (active) — גישה אוטומטית.
    try {
        const own = await getItemsByUserId(uid);
        if (own.some((i) => i.category === 'singles' && i.status === 'active')) return 'granted';
    } catch { hadError = true; /* ממשיכים לבדיקת בקשת הגישה */ }

    // 2) שדכן מערכת מאושר — גישה אוטומטית ללוח (חייב לראות כרטיסים כדי לשדך).
    try {
        if ((await getMatchmakerStatus(uid, false)) === 'approved') return 'granted';
    } catch { hadError = true; /* ממשיכים לבדיקת בקשת הגישה */ }

    // 3) בקשת גישה מפורשת (הורה/שדכן).
    try {
        const reqs = await getItemsByCategory('singles_access');
        const mine = reqs.filter((r) => r.user_id === uid);
        if (mine.some((r) => reqStatus(r.extra_fields) === 'approved')) return 'granted';
        if (mine.some((r) => reqStatus(r.extra_fields) === 'pending')) return 'pending';
    } catch { hadError = true; /* אין קטגוריה עדיין = אין בקשות */ }

    // הבדיקות לא הניבו תשובה חיובית ולפחות אחת נכשלה — אין ודאות
    return hadError ? 'unavailable' : 'none';
}

export const SINGLES_ACCESS_ROLES = ['single', 'parent', 'matchmaker'] as const;
export type SinglesAccessRole = (typeof SINGLES_ACCESS_ROLES)[number];
