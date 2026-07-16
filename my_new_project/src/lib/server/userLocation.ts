// ---- מיקום אפקטיבי של משתמש לטפסי הוספה ----
// מקור-אמת אחד לשלושת טפסי ההוספה (/add/[category], /gmachim/add, /giveaways/add):
// עיר+שכונה מהפרופיל, ואם אין עיר - נגזרות מהשכונות שהמשתמש מרכז (coordinator_of),
// כדי שרכז שכונה שלא מילא עיר בפרופיל יקבל את האזור שלו ולא את ברירת המחדל (ירושלים).

import { getUserById, type DbUser } from './db';

/**
 * getUserById עם ניסיון שני: כשל רגעי של Strapi (רשת / אחרי restart) לא אמור
 * להפיל את הפרופיל בשקט - שאז הטופס נפתח על ברירת המחדל במקום על עיר המשתמש.
 */
export async function getUserByIdRetry(id: string, jwt?: string): Promise<DbUser | undefined> {
    try {
        const u = await getUserById(id, jwt);
        if (u) return u;
    } catch { /* שקט - ננסה שוב */ }
    try {
        return await getUserById(id, jwt);
    } catch {
        return undefined;
    }
}

/**
 * עיר+שכונה אפקטיביות: פרופיל קודם; בלי עיר בפרופיל - הרשומה הראשונה ב-coordinator_of
 * שמכילה עיר בפורמט "שכונה (עיר)". רשומות בלי סוגריים (שכונה בלבד) לא מלמדות על עיר - מדלגים.
 */
export function effectiveUserLocation(
    u: Pick<DbUser, 'city' | 'neighborhood' | 'coordinator_of'>,
): { city: string; neighborhood: string } {
    const city = u.city?.trim() ?? '';
    const neighborhood = u.neighborhood?.trim() ?? '';
    if (city) return { city, neighborhood };
    for (const entry of u.coordinator_of ?? []) {
        const m = entry.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        const areaCity = m?.[2]?.trim();
        if (areaCity) {
            return { city: areaCity, neighborhood: neighborhood || m![1].trim() };
        }
    }
    return { city, neighborhood };
}
