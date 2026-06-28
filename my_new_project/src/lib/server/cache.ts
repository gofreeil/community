// ============================================================
// cache.ts - שכבת cache בזיכרון עם stale-while-revalidate
//
// מטרה: ניווט מהיר. נתונים שכמעט לא משתנים (פריטים/אירועים/שכונות/
// פרסומות/משתמשים) נשמרים בזיכרון ה-lambda. בקשה חוזרת תוך חלון ה-TTL
// מקבלת את הערך מיידית מהזיכרון בלי round-trip ל-Strapi.
//
// stale-while-revalidate: כשהערך "מתיישן" הוא עדיין מוחזר מיד, וברקע
// מתבצע רענון יחיד. כך משתמש כמעט אף פעם לא ממתין לרשת.
// ============================================================

interface Entry<T> {
    value: T;
    freshUntil: number;
    refreshing: boolean;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * מחזיר ערך מ-cache או טוען אותו. ttlMs קובע כמה זמן הערך נחשב "טרי".
 * - טרי  → מוחזר מיד מהזיכרון.
 * - ישן  → מוחזר מיד מהזיכרון + רענון יחיד ברקע.
 * - חסר  → ממתין לטעינה (עם dedup לבקשות מקבילות).
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = store.get(key) as Entry<T> | undefined;

    if (entry) {
        if (now < entry.freshUntil) return entry.value;

        // ישן: מחזירים מיד, ומרעננים פעם אחת ברקע
        if (!entry.refreshing) {
            entry.refreshing = true;
            fn()
                .then((v) => store.set(key, { value: v, freshUntil: Date.now() + ttlMs, refreshing: false }))
                .catch(() => { entry.refreshing = false; /* נשמור את הערך הישן, ננסה שוב בפעם הבאה */ });
        }
        return entry.value;
    }

    // קר לגמרי: dedup לבקשות מקבילות שמחכות לאותו ערך
    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;

    const p = fn()
        .then((v) => {
            store.set(key, { value: v, freshUntil: Date.now() + ttlMs, refreshing: false });
            inflight.delete(key);
            return v;
        })
        .catch((e) => {
            inflight.delete(key);
            throw e;
        });
    inflight.set(key, p);
    return p;
}

/** מבטל ערכים שמפתחם מתחיל בקידומת (לקריאה אחרי כתיבה). ריק = הכל. */
export function invalidate(prefix = ''): void {
    for (const k of [...store.keys()]) {
        if (k.startsWith(prefix)) store.delete(k);
    }
}
