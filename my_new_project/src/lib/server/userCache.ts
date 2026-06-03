// ============================================================
// userCache.ts - Caching server-side לנתוני משתמש
// מטרה: בעת outage קצר של Strapi, לא לאבד את התצוגה.
// ה-cache הוא in-memory בתהליך SvelteKit (כל instance בנפרד).
// בפרודקשן multi-instance - אפשר לשדרג ל-Redis בעתיד.
// ============================================================

import { getUserById } from './db';
import type { DbUser } from './db';

interface CacheEntry {
    user: DbUser;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();

const FRESH_TTL_MS = 5 * 60 * 1000;   // 5 דקות - בתוך זה נשתמש מה-cache בלי לקרוא ל-Strapi
const STALE_TTL_MS = 30 * 60 * 1000;  // 30 דקות - בעת outage נקבל גם cache בייש

export interface CachedUserResult {
    user: DbUser | null;
    /** האם Strapi זמין כרגע. אם false - מציגים באנר "בעיה זמנית". */
    strapiAvailable: boolean;
    /** האם המידע מ-cache (ולא מ-Strapi). */
    fromCache: boolean;
    /** האם ה-cache בייש (Strapi דאון, אבל יש cache ישן). */
    stale: boolean;
}

/**
 * שכבת cache מעל getUserById:
 * - אם יש cache טרי (< 5 דקות) → מחזיר מיד בלי לקרוא ל-Strapi.
 * - אחרת מנסה לטעון מ-Strapi; בהצלחה - שומר ל-cache.
 * - בכישלון (Strapi דאון) - מחזיר cache בייש (אם קיים), עם דגל `strapiAvailable: false`.
 */
export async function getCachedUserById(id: string, jwt?: string): Promise<CachedUserResult> {
    const now = Date.now();
    const entry = cache.get(id);

    // cache טרי - החזר מיד
    if (entry && now - entry.timestamp < FRESH_TTL_MS) {
        return { user: entry.user, strapiAvailable: true, fromCache: true, stale: false };
    }

    // נסה לטעון מ-Strapi
    try {
        const user = await getUserById(id, jwt);
        if (user) {
            cache.set(id, { user, timestamp: now });
            return { user, strapiAvailable: true, fromCache: false, stale: false };
        }
        // משתמש לא נמצא ב-Strapi (לא outage - באמת לא קיים)
        return { user: null, strapiAvailable: true, fromCache: false, stale: false };
    } catch (e) {
        console.warn('[userCache] Strapi failed for', id, '- trying stale cache');
        // נכשל - נסה cache בייש
        if (entry && now - entry.timestamp < STALE_TTL_MS) {
            return { user: entry.user, strapiAvailable: false, fromCache: true, stale: true };
        }
        // אין cache או שהוא ישן מדי
        return { user: null, strapiAvailable: false, fromCache: false, stale: false };
    }
}

/** הוצא משתמש מה-cache (לדוגמה לאחר עדכון פרופיל - כדי שהקריאה הבאה תיקח עדכני) */
export function invalidateCachedUser(id: string): void {
    cache.delete(id);
}
