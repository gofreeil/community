// ============================================================
// cache.ts - שכבת cache בזיכרון עם stale-while-revalidate
//
// מטרה: ניווט מהיר. נתונים שכמעט לא משתנים (פריטים/אירועים/שכונות/
// פרסומות/משתמשים) נשמרים בזיכרון ה-lambda. בקשה חוזרת תוך חלון ה-TTL
// מקבלת את הערך מיידית מהזיכרון בלי round-trip ל-Strapi.
//
// stale-while-revalidate: כשהערך "מתיישן" הוא עדיין מוחזר מיד, וברקע
// מתבצע רענון יחיד. כך משתמש כמעט אף פעם לא ממתין לרשת.
//
// קריאה-אחרי-כתיבה (read-your-writes): הזיכרון הזה הוא *לכל מופע בנפרד*.
// ב-Vercel רצים כמה מופעים (ואפילו כמה אזורים) במקביל, ולכן invalidate()
// אחרי כתיבה מנקה רק את המופע שביצע אותה - הבקשה הבאה של אותו אדמין
// עלולה לנחות במופע אחר ולקבל מהזיכרון שלו ערך שנשלף לפני הכתיבה
// (קרה עם "קצוב תקופה" בפרסומות: Strapi עודכן, הדף המשיך להציג 30 ימים).
// הפתרון: כל ערך זוכר מתי השליפה שלו *התחילה*, ו-invalidateBefore(ts)
// מלמד את המופע ש"כל מה שנשלף לפני ts מיושן". חותמת הכתיבה מגיעה
// מהלקוח בעוגייה (ראו hooks.server.ts) ולכן מגיעה לכל מופע שהוא פוגש.
// ============================================================

interface Entry<T> {
    value: T;
    freshUntil: number;
    refreshing: boolean;
    /** מתי השליפה שהניבה את הערך התחילה (שמרני: התחלה ולא סיום) */
    fetchedAt: number;
}

interface Inflight {
    promise: Promise<unknown>;
    startedAt: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Inflight>();
/** קידומת מפתח → חותמת זמן: ערכים שנשלפו לפניה נחשבים מיושנים */
const floors = new Map<string, number>();

/** הרצפה שחלה על מפתח: המחמירה מבין כל הקידומות שמתאימות לו */
function floorFor(key: string): number {
    let floor = 0;
    for (const [prefix, ts] of floors) {
        if (key.startsWith(prefix) && ts > floor) floor = ts;
    }
    return floor;
}

/** ערך שנשלף לפני הרצפה (או באותה אלפית שנייה - שמרני) - נזרק, כאילו לא היה */
function liveEntry<T>(key: string): Entry<T> | undefined {
    const entry = store.get(key) as Entry<T> | undefined;
    if (!entry) return undefined;
    if (entry.fetchedAt <= floorFor(key)) {
        store.delete(key);
        return undefined;
    }
    return entry;
}

/** בקשה בטיסה שהתחילה לפני הרצפה - לא מצטרפים אליה */
function liveInflight(key: string): Inflight | undefined {
    const inf = inflight.get(key);
    if (!inf) return undefined;
    if (inf.startedAt <= floorFor(key)) {
        inflight.delete(key);
        return undefined;
    }
    return inf;
}

/**
 * מתחיל שליפה קרה עם dedup. התוצאה נשמרת רק אם הבקשה עדיין "בעלת המפתח" -
 * invalidate() באמצע (כתיבה שהתרחשה אחרי שהשליפה יצאה) מוחק אותה מהרשימה,
 * ואז אסור להחיות ערך שנשלף לפני הכתיבה.
 */
function startFetch<T>(key: string, fn: () => Promise<T>, ttlOf: (v: T) => number): Promise<T> {
    const startedAt = Date.now();
    const inf: Inflight = { promise: Promise.resolve(), startedAt };
    const p = fn()
        .then((v) => {
            if (inflight.get(key) === inf) {
                store.set(key, { value: v, freshUntil: Date.now() + ttlOf(v), refreshing: false, fetchedAt: startedAt });
                inflight.delete(key);
            }
            return v;
        })
        .catch((e) => {
            if (inflight.get(key) === inf) inflight.delete(key);
            throw e;
        });
    inf.promise = p;
    inflight.set(key, inf);
    return p;
}

/** רענון ברקע של ערך ישן - פעם אחת, ובלי להחיות ערך שבוטל בינתיים */
function refreshInBackground<T>(key: string, entry: Entry<T>, fn: () => Promise<T>, ttlOf: (v: T) => number): void {
    if (entry.refreshing) return;
    entry.refreshing = true;
    const startedAt = Date.now();
    fn()
        .then((v) => {
            // אם בינתיים המפתח בוטל (invalidate אחרי כתיבה) או הוחלף -
            // אסור להחיות ערך שנשלף לפני הכתיבה
            if (store.get(key) === entry && startedAt > floorFor(key)) {
                store.set(key, { value: v, freshUntil: Date.now() + ttlOf(v), refreshing: false, fetchedAt: startedAt });
            }
        })
        .catch(() => { entry.refreshing = false; /* נשמור את הערך הישן, ננסה שוב בפעם הבאה */ });
}

/**
 * מחזיר ערך מ-cache או טוען אותו. ttlMs קובע כמה זמן הערך נחשב "טרי".
 * - טרי  → מוחזר מיד מהזיכרון.
 * - ישן  → מוחזר מיד מהזיכרון + רענון יחיד ברקע.
 * - חסר  → ממתין לטעינה (עם dedup לבקשות מקבילות).
 *
 * ttlFor (אופציונלי) קובע TTL לפי הערך שהתקבל. נועד לתשובות "חלקיות" -
 * למשל תקלה זמנית במקור חיצוני, שאסור שתישמר לכל אורך ה-TTL הרגיל.
 */
export async function cached<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
    ttlFor?: (value: T) => number,
): Promise<T> {
    const now = Date.now();
    const ttlOf = (v: T) => (ttlFor ? ttlFor(v) : ttlMs);
    const entry = liveEntry<T>(key);

    if (entry) {
        if (now < entry.freshUntil) return entry.value;
        // ישן: מחזירים מיד, ומרעננים פעם אחת ברקע
        refreshInBackground(key, entry, fn, ttlOf);
        return entry.value;
    }

    // קר לגמרי: dedup לבקשות מקבילות שמחכות לאותו ערך
    const existing = liveInflight(key);
    if (existing) return existing.promise as Promise<T>;

    return startFetch(key, fn, ttlOf);
}

/**
 * גרסה שלעולם לא חוסמת ניווט. בניגוד ל-cached, כשהערך חסר לגמרי (lambda קר)
 * היא לא ממתינה ל-Strapi אלא מחזירה מיד את ה-fallback ומחממת את ה-cache ברקע.
 * מתאים לדפים עם תוכן ברירת-מחדל מלא (למשל /about/revenue) שבהם עדיף לפתוח
 * מיידית עם ברירות המחדל מאשר לתקוע את המשתמש בהמתנה כש-Strapi איטי.
 */
export function cachedBackground<T>(key: string, ttlMs: number, fn: () => Promise<T>, fallback: T): T {
    const now = Date.now();
    const ttlOf = () => ttlMs;
    const entry = liveEntry<T>(key);

    if (entry) {
        if (now < entry.freshUntil) return entry.value;
        refreshInBackground(key, entry, fn, ttlOf);
        return entry.value;
    }

    // קר לגמרי: לא חוסמים. מחממים ברקע (עם dedup) ומחזירים fallback מיד.
    if (!liveInflight(key)) {
        // בולעים דחייה כדי שלא ייווצר unhandled rejection (הקורא לא ממתין)
        startFetch(key, fn, ttlOf).catch(() => {});
    }
    return fallback;
}

/**
 * מבטל ערכים שמפתחם מתחיל בקידומת (לקריאה אחרי כתיבה). ריק = הכל.
 * גם בקשות בטיסה מתנתקות: שליפה שיצאה לפני הכתיבה לא תישמר כשתחזור.
 */
export function invalidate(prefix = ''): void {
    for (const k of [...store.keys()]) {
        if (k.startsWith(prefix)) store.delete(k);
    }
    for (const k of [...inflight.keys()]) {
        if (k.startsWith(prefix)) inflight.delete(k);
    }
}

/**
 * מלמד את המופע הזה שנתונים תחת הקידומת השתנו בזמן ts: כל ערך (או בקשה
 * בטיסה) שנשלף לפני ts מיושן ויישלף מחדש. לשימוש כשהכתיבה קרתה במופע אחר
 * (ראו hooks.server.ts - חותמת הכתיבה מגיעה בעוגייה). ts עתידי נחתך ל"עכשיו".
 */
export function invalidateBefore(prefix: string, ts: number): void {
    if (!Number.isFinite(ts) || ts <= 0) return;
    const bounded = Math.min(ts, Date.now());
    if ((floors.get(prefix) ?? 0) >= bounded) return;
    floors.set(prefix, bounded);
    for (const [k, e] of [...store.entries()]) {
        if (k.startsWith(prefix) && e.fetchedAt <= bounded) store.delete(k);
    }
    for (const [k, inf] of [...inflight.entries()]) {
        if (k.startsWith(prefix) && inf.startedAt <= bounded) inflight.delete(k);
    }
}
