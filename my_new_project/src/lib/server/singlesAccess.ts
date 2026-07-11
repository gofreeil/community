// גישה ללוח הפנויים/פנויות — "מועדון סגור".
// מודל היברידי (לפי החלטת המשתמש):
//   • מי שפרסם כרטיס משלו שאושר (status='active') — גישה אוטומטית.
//   • כל השאר (הורים/שדכנים) — מבקשים גישה, וסופר-אדמין מאשר בפאנל /admin/singles-review.
// הבקשות נשמרות כפריטי category='singles_access' (קטגוריה חופשית, בלי שינוי סכמה בבאקאנד).
// הסטטוס נשמר ב-extra_fields.status ('pending' | 'approved' | 'rejected') — בדיוק כמו singles_request.

import { getItemsByUserId, getItemsByCategory } from './db';

export type SinglesAccessStatus = 'granted' | 'pending' | 'none';

function reqStatus(extra_fields: string | null | undefined): string {
    try { return String(JSON.parse(extra_fields || '{}').status || 'pending'); } catch { return 'pending'; }
}

/** מחזיר את מצב הגישה של המשתמש ללוח הפנויים. */
export async function getSinglesAccessStatus(
    userId: string | null | undefined,
    isSuperAdmin = false,
): Promise<SinglesAccessStatus> {
    if (isSuperAdmin) return 'granted';
    if (!userId) return 'none';
    const uid = String(userId);

    // 1) בעל כרטיס פנויים מאושר (active) — גישה אוטומטית.
    try {
        const own = await getItemsByUserId(uid);
        if (own.some((i) => i.category === 'singles' && i.status === 'active')) return 'granted';
    } catch { /* ממשיכים לבדיקת בקשת הגישה */ }

    // 2) בקשת גישה מפורשת (הורה/שדכן).
    try {
        const reqs = await getItemsByCategory('singles_access');
        const mine = reqs.filter((r) => r.user_id === uid);
        if (mine.some((r) => reqStatus(r.extra_fields) === 'approved')) return 'granted';
        if (mine.some((r) => reqStatus(r.extra_fields) === 'pending')) return 'pending';
    } catch { /* אין קטגוריה עדיין = אין בקשות */ }

    return 'none';
}

export const SINGLES_ACCESS_ROLES = ['single', 'parent', 'matchmaker'] as const;
export type SinglesAccessRole = (typeof SINGLES_ACCESS_ROLES)[number];
