// ============================================================
// adNotifications.ts - התראות המנהלים על בקשות פרסום
// ------------------------------------------------------------
// כל אדמין מקבל *עותק משלו* של ההתראה (רשומת message נפרדת). לכן טיפול
// בבקשה חייב לסמן את כל העותקים, ולא רק את זה שנלחץ:
//   - החלטה במסך "אישור פרסומות" לא נגעה בהתראות בכלל, וההודעה נשארה
//     בתיבה עם כפתורי "אשר ופרסם" על בקשה שכבר טופלה. זה מה שנראה כמו
//     בקשה כפולה: התראה ישנה שלא ירדה + ההתראה על השליחה החדשה.
//   - אישור מכרטיס ההתראה בפרופיל סימן רק את העותק של האדמין שלחץ,
//     והשאר נשארו תקועים.
//
// הסימון בזמן ההחלטה הוא תנאי הכרחי אבל לא מספיק: הוא חל רק על החלטות
// שנעשות מכאן ואילך. כל בקשה שהוכרעה בדרך אחרת - לפני שהסימון היה קיים,
// מחיקת הפרסומת מהמאגר, החלפה בגרסה מעודכנת - נשארה תלויה בתיבה לנצח
// וחזרה בכל רענון. reconcileAdMessages מיישר את זה בזמן קריאה מול המצב
// האמיתי של הפרסומת.
// ============================================================

import { getAllAdminRecipients, getMessagesByUserId, updateItem, type DbItem } from './db.js';
import { getAdStatuses } from './adsStore.js';

export type AdMessageOutcome = 'approve' | 'reject' | 'superseded' | 'gone';

/** קידומת שמסבירה בכותרת מה קרה לבקשה, לפני שהיא יורדת ל"הודעות שטופלו" */
const LABEL_PREFIX: Record<AdMessageOutcome, string> = {
    approve:    '✅ אושרה · ',
    reject:     '✖️ נדחתה · ',
    superseded: '🔄 הוחלפה בגרסה מעודכנת · ',
    gone:       '🗑️ הבקשה כבר לא קיימת · ',
};

function parseEf(raw: string | null | undefined): Record<string, unknown> | null {
    try { return raw ? JSON.parse(raw) : {}; } catch { return null; }
}

/**
 * כותב את הסימון "טופלה" על התראה אחת.
 * - הקידומת נכתבת פעם אחת בלבד, כדי שטיפול חוזר לא יערים כותרות.
 * - חשוב: לא כותבים status. הסכמה של items ב-Strapi מקבלת רק
 *   active/inactive/deleted/resolved/pending/rejected/frozen - הערך
 *   'handled' נדחה ב-400 והפיל את *כל* העדכון, כולל extra_fields. זו
 *   הסיבה שהתראות נשארו "פתוחות" לנצח עם כפתורי אשר/דחה למרות שהבקשה
 *   הוכרעה. מצב "טופלה" חי ממילא ב-extra_fields.handled - וזה מה שכל
 *   מסכי ההודעות בודקים.
 * מחזיר את הרשומה המעודכנת, או null אם הכתיבה נכשלה.
 */
async function writeHandled(
    msg: DbItem,
    ef: Record<string, unknown>,
    outcome: AdMessageOutcome,
    extra: Record<string, unknown>,
): Promise<DbItem | null> {
    const label = (msg.label ?? '').startsWith(LABEL_PREFIX[outcome])
        ? msg.label ?? ''
        : `${LABEL_PREFIX[outcome]}${msg.label ?? ''}`;
    const extra_fields = { ...ef, ...extra, handled: true, decision: outcome, handled_at: new Date().toISOString() };
    try {
        await updateItem(msg.id, { label, extra_fields });
        return { ...msg, label, extra_fields: JSON.stringify(extra_fields) };
    } catch (e) {
        console.warn('[adNotifications] mark handled failed:', e instanceof Error ? e.message : e);
        return null;
    }
}

/**
 * מסמן כטופלו את כל ההתראות של כל האדמינים על הפרסומות שברשימה.
 * best-effort: כשל כאן לא מבטל את ההחלטה עצמה שכבר נשמרה.
 * מחזיר כמה התראות סומנו.
 */
export async function markAdMessagesHandled(
    adIds: string[],
    outcome: AdMessageOutcome,
    extra: Record<string, unknown> = {},
): Promise<number> {
    const targets = new Set(adIds.filter(Boolean));
    if (targets.size === 0) return 0;

    let admins;
    try {
        admins = await getAllAdminRecipients();
    } catch (e) {
        console.warn('[adNotifications] admin list failed:', e instanceof Error ? e.message : e);
        return 0;
    }
    const inboxes = await Promise.all(admins.map(a => getMessagesByUserId(a.id).catch(() => [])));
    let marked = 0;

    await Promise.all(inboxes.flat().map(async (msg) => {
        const ef = parseEf(msg.extra_fields);
        if (!ef || ef.type !== 'ad_submission' || ef.handled) return;
        if (!targets.has(String(ef.ad_id ?? ''))) return;
        if (await writeHandled(msg, ef, outcome, extra)) marked++;
    }));
    return marked;
}

/**
 * מיישר התראות בקשת-פרסום מול המצב האמיתי של הפרסומת, בזמן קריאת התיבה.
 *
 * התראה נשארת "פתוחה" - עם כפתורי אשר/דחה ובספירת שלא-נקראו - כל עוד
 * extra_fields.handled לא נכתב, והוא נכתב רק ברגע ההחלטה. משמעות הדבר היא
 * שכל בקשה שהוכרעה בלי לעבור במסלול הזה נשארה נראית כבקשה פתוחה: המנהל
 * מסתיר אותה, מרענן, והיא חוזרת. כאן בודקים את הסטטוס בפועל - פרסומת שאינה
 * 'pending' כבר הוכרעה, וההתראה עליה מסומנת כטופלה ועוברת להיסטוריה.
 *
 * הסימון נכתב חזרה ל-DB, ולכן הריפוי קורה פעם אחת בלבד וחל על כל המכשירים.
 * בקשה שבאמת ממתינה, או שלא הצלחנו לברר את מצבה, לא נגעת - עדיף התראה
 * מיותרת על בקשת פרסום שנעלמת מעיני המנהל.
 */
export async function reconcileAdMessages(msgs: DbItem[]): Promise<DbItem[]> {
    const open = msgs
        .map(msg => ({ msg, ef: parseEf(msg.extra_fields) }))
        .filter((o): o is { msg: DbItem; ef: Record<string, unknown> } =>
            !!o.ef && o.ef.type === 'ad_submission' && !o.ef.handled && !!o.ef.ad_id);
    // המקרה הרגיל (כל משתמש שאינו אדמין, וכל אדמין בלי בקשה פתוחה) - בלי אף קריאה נוספת
    if (open.length === 0) return msgs;

    const statuses = await getAdStatuses(open.map(o => String(o.ef.ad_id)));
    if (statuses.size === 0) return msgs;

    const patched = new Map<string, DbItem>();
    await Promise.all(open.map(async ({ msg, ef }) => {
        const st = statuses.get(String(ef.ad_id));
        // 'pending' = הבקשה באמת ממתינה להחלטה; undefined = לא ידוע. בשניהם לא נוגעים.
        if (!st || st === 'pending') return;
        const outcome: AdMessageOutcome = st === 'approved' ? 'approve' : st === 'rejected' ? 'reject' : 'gone';
        const updated = await writeHandled(msg, ef, outcome, { reconciled: true });
        if (updated) patched.set(msg.id, updated);
    }));
    if (patched.size === 0) return msgs;
    console.info(`[adNotifications] יושרו ${patched.size} התראות פרסום שכבר הוכרעו`);
    return msgs.map(m => patched.get(m.id) ?? m);
}
