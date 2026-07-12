// ============================================================
// statsSummary.ts - בנייני הסיכום ל"גרף הראשי" (סקירה כללית).
// משותף לדף הסטטיסטיקה (/admin/statistics) וללוח הניהול (/admin),
// כדי ששני הדפים יציגו בדיוק את אותו גרף מסכם מאותם נתונים.
// ============================================================
import { getAllItems, getAllUsers } from '$lib/server/db';

// קטגוריות "מערכת" — רשומות פנימיות (הודעות, בקשות, סקרים) שאינן פריטים שהעלו גולשים.
// לא נכללות בסיכום "תוכן שהועלה לאתר".
export const SYSTEM_CATEGORIES = new Set([
    'message', 'admin_alert', 'poll', 'emergency_team', 'raise_hand',
    'singles_access', 'singles_request', 'shabbat_report', 'shabbat_request',
    'location_request', 'user_feedback', 'vaad_member',
]);

export interface ItemsSummary {
    total: number;
    byCategory: { category: string; count: number }[];
    byMonth: { month: string; count: number }[];
}

/** סיכום הפריטים הפעילים שהועלו לאתר: סה״כ, פילוח לפי קטגוריה ולפי חודש. */
export async function buildItemsSummary(): Promise<ItemsSummary> {
    const all = await getAllItems();
    const real = all.filter((it) => !SYSTEM_CATEGORIES.has(it.category));

    const byCat = new Map<string, number>();
    const byMonth = new Map<string, number>();
    for (const it of real) {
        byCat.set(it.category, (byCat.get(it.category) ?? 0) + 1);
        const m = (it.created_at || '').slice(0, 7); // YYYY-MM
        if (/^\d{4}-\d{2}$/.test(m)) byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
    }

    return {
        total: real.length,
        byCategory: [...byCat.entries()]
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count),
        byMonth: [...byMonth.entries()]
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month)),
    };
}

export interface RegistrationsSummary {
    total: number;
    byMonth: { month: string; count: number }[];
}

/** נרשמים חדשים לפי חודש (לפי created_at של המשתמשים המאוחדים). */
export async function buildRegistrationsSummary(): Promise<RegistrationsSummary> {
    const users = await getAllUsers();
    const byMonth = new Map<string, number>();
    for (const u of users) {
        const m = (u.created_at || '').slice(0, 7); // YYYY-MM
        if (/^\d{4}-\d{2}$/.test(m)) byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
    }
    return {
        total: users.length,
        byMonth: [...byMonth.entries()]
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month)),
    };
}
