// ============================================================
// statsSummary.ts - בנייני הסיכום ל"גרף הראשי" (סקירה כללית).
// משותף לדף הסטטיסטיקה (/admin/statistics) וללוח הניהול (/admin),
// כדי ששני הדפים יציגו בדיוק את אותו גרף מסכם מאותם נתונים.
// ============================================================
import { getAllItems, getAllUsers, type DbItem, type DbUser } from '$lib/server/db';
import { isFamilyItem } from '$lib/itemCategories';
import { getIndexBusinesses } from '$lib/server/indexBusinesses';

export interface ItemsSummary {
    total: number;
    byCategory: { category: string; count: number }[];
    byMonth: { month: string; count: number }[];
}

/**
 * סיכום הפריטים הפעילים שהועלו לאתר: סה״כ, פילוח לפי קטגוריה ולפי חודש.
 * אפשר להעביר מערך פריטים שכבר נטען (preItems) כדי לא לשלוף שוב מ-Strapi
 * ולהבטיח שהמספרים כאן זהים בדיוק למונה שבלוח הניהול (אותו מקור נתונים).
 */
export async function buildItemsSummary(preItems?: DbItem[]): Promise<ItemsSummary> {
    const all = preItems ?? await getAllItems();
    const real = all.filter((it) => isFamilyItem(it.category));

    // עסקי האינדקס (index.gofreeil.com) — מיובאים בקריאה-דרך ומוצגים תחת
    // "חנויות ועסקים". הם נספרים יחד עם פריטי הקהילה במונה "פרטים במפה"
    // ובפילוח הקטגוריות (shops). אין להם created_at תקני (חותמת גיליון), ולכן
    // הם מגדילים את הסה״כ והקטגוריה אך לא את הפילוח החודשי — וזה תקין, כי הם
    // יובאו בבת-אחת ולא "נוספו" חודש-אחר-חודש אצלנו. נכשל ברכות ל-[] אם האינדקס
    // לא זמין, כדי שהסטטיסטיקה לא תיפול בגללו.
    const businesses = await getIndexBusinesses().catch(() => [] as DbItem[]);
    const counted = [...real, ...businesses];

    const byCat = new Map<string, number>();
    const byMonth = new Map<string, number>();
    for (const it of counted) {
        byCat.set(it.category, (byCat.get(it.category) ?? 0) + 1);
        const m = (it.created_at || '').slice(0, 7); // YYYY-MM
        if (/^\d{4}-\d{2}$/.test(m)) byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
    }

    return {
        total: counted.length,
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

/**
 * נרשמים חדשים לפי חודש (לפי created_at של המשתמשים המאוחדים).
 * אפשר להעביר מערך משתמשים שכבר נטען (preUsers) כדי לא לשלוף שוב מ-Strapi.
 */
export async function buildRegistrationsSummary(preUsers?: DbUser[]): Promise<RegistrationsSummary> {
    const users = preUsers ?? await getAllUsers();
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
