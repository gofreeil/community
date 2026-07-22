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
    // הקטגוריה "בעלי מקצוע". הם נספרים יחד עם פריטי הקהילה במונה "פרטים במפה"
    // ובפילוח הקטגוריות (business-owners). created_at מגיע מהאינדקס — כשהוא חותמת
    // תקנית הם נכנסים גם לפילוח החודשי (לפי מועד הצטרפותם לאינדקס), וכשאין —
    // מגדילים רק את הסה״כ ואת הקטגוריה. נכשל ברכות ל-[] אם האינדקס לא זמין,
    // כדי שהסטטיסטיקה לא תיפול בגללו.
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

export interface SiteOverview {
    totalUsers: number;
    totalItems: number;
    totalCoordinators: number;
    newUsersThisMonth: number;
    newItemsThisMonth: number;
    monthlyVisits: number;
}

/**
 * סקירת האתר לבאנר לוח הבקרה — חישוב יחיד המשותף ללוח הניהול (/admin)
 * וללוח הרכז (/coordinator), כך ששני הפאנלים מציגים בדיוק אותם מספרים
 * (ובראשם "פרטים במפה" = פריטי הקהילה + עסקי האינדקס, דרך buildItemsSummary).
 * מקבל את אותם users/items שכבר נטענו בדף. אפשר להעביר itemsSummary מוכן כדי
 * לא לבנות אותו פעמיים כשהקורא כבר בנה אותו לגרף המסכם.
 */
export async function buildSiteOverview(
    users: DbUser[],
    items: DbItem[],
    monthlyVisits: number,
    itemsSummary?: ItemsSummary,
): Promise<SiteOverview> {
    const summary = itemsSummary ?? await buildItemsSummary(items);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const inThisMonth = (iso?: string | null) => {
        if (!iso) return false;
        const t = new Date(iso).getTime();
        return !isNaN(t) && t >= monthStart;
    };

    return {
        totalUsers:        users.length,
        totalItems:        summary.total,
        totalCoordinators: users.filter((u) => (u.coordinator_of?.length ?? 0) > 0).length,
        newUsersThisMonth: users.filter((u) => inThisMonth(u.created_at)).length,
        newItemsThisMonth: items.filter((i) => isFamilyItem(i.category) && inThisMonth(i.created_at)).length,
        monthlyVisits,
    };
}
