// ============================================================
// coordinatorNotifications.ts - התראות המנהלים על בקשות "להיות רכז"
// ------------------------------------------------------------
// כל סופר-אדמין מקבל *עותק משלו* של ההתראה (רשומת message נפרדת עם
// extra_fields.type='coordinator_request'), אבל ההחלטה נעשית על רשומת הבקשה
// עצמה בעמוד הניהול - ושום דבר לא חיבר בין השניים. התוצאה: אישרת מישהו כרכז,
// והכרטיס "🙋 בקשת רכז חדשה" נשאר בתיבה ונספר כהודעה שלא נקראה לנצח.
//
// שני מסלולים, בדיוק כמו בהתראות בקשות הפרסום (adNotifications.ts):
//   1. markCoordinatorMessagesHandled - ברגע ההחלטה (אישור/דחייה/מינוי ידני
//      שסגר בקשה ממתינה). חל על כל העותקים אצל כל המנהלים, לא רק אצל מי שלחץ.
//   2. reconcileCoordinatorMessages - בזמן קריאת התיבה, מיישר התראות שהוכרעו
//      לפני שהסימון הזה היה קיים. בלעדיו הריפוי היה חל רק על החלטות עתידיות.
//
// מה שלא נעשה כאן: הרשומה של הבקשה לא משנה סטטוס. ההתראה יורדת בהתאם למצב
// הקיים - לעולם לא ההפך - כדי לא לחזור ל"אושר בלי שאישרתי".
// ============================================================

import {
    getAllAdminRecipients,
    getMessagesByUserId,
    updateItem,
    getAllCoordinatorRequests,
    getUserByAnyId,
    coordinatorCovers,
    type DbItem,
    type DbCoordinatorRequest,
} from './db.js';

export type CoordMessageOutcome = 'approve' | 'reject';

/** קידומת שמסבירה בכותרת מה קרה לבקשה, לפני שהיא יורדת ל"הודעות שטופלו" */
const LABEL_PREFIX: Record<CoordMessageOutcome, string> = {
    approve: '✅ אושרה · ',
    reject:  '✖️ נדחתה · ',
};

function parseEf(raw: string | null | undefined): Record<string, unknown> | null {
    try { return raw ? JSON.parse(raw) : {}; } catch { return null; }
}

/** נרמול טלפון להשוואה - ספרות בלבד, קידומת 972 → 0 (זהה לנרמול שב-db) */
function normPhone(p: unknown): string {
    let d = String(p ?? '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('972')) d = '0' + d.slice(3);
    return d;
}

const splitAreas = (raw: unknown): string[] =>
    String(raw ?? '').split(',').map(s => s.trim()).filter(Boolean);

/** האם ההתראה הזו נולדה מהבקשה הזו: אותו מבקש (מזהה או טלפון) ואותם אזורים */
function messageMatchesRequest(ef: Record<string, unknown>, req: { user_id?: string | null; phone?: string | null; neighborhoods: string[] }): boolean {
    const efId  = String(ef.requested_by_id ?? '').trim().toLowerCase();
    const reqId = String(req.user_id ?? '').trim().toLowerCase();
    const sameUser = (!!efId && efId === reqId) ||
        (!!normPhone(ef.requested_by_phone) && normPhone(ef.requested_by_phone) === normPhone(req.phone));
    if (!sameUser) return false;

    // אותו מבקש יכול להגיש כמה בקשות לאזורים שונים - התראה נסגרת רק מול הבקשה
    // שלה, ולכן נדרשת חפיפה דו-כיוונית של האזורים. התראה ישנה בלי אזורים
    // בכלל מזוהה לפי המבקש בלבד.
    const efAreas = splitAreas(ef.neighborhoods);
    if (efAreas.length === 0) return true;
    return coordinatorCovers(req.neighborhoods, efAreas) && coordinatorCovers(efAreas, req.neighborhoods);
}

/**
 * כותב את הסימון "טופלה" על התראה אחת.
 * - הקידומת נכתבת פעם אחת בלבד, כדי שטיפול חוזר לא יערים כותרות.
 * - הודעה שהמנהל העביר לארכיון נשארת בארכיון: status הוא גם דגל הארכיון.
 * מחזיר את הרשומה המעודכנת, או null אם הכתיבה נכשלה.
 */
async function writeHandled(
    msg: DbItem,
    ef: Record<string, unknown>,
    outcome: CoordMessageOutcome,
    extra: Record<string, unknown> = {},
): Promise<DbItem | null> {
    const label = (msg.label ?? '').startsWith(LABEL_PREFIX[outcome])
        ? msg.label ?? ''
        : `${LABEL_PREFIX[outcome]}${msg.label ?? ''}`;
    const status = msg.status === 'archived' ? 'archived' : 'handled';
    const extra_fields = { ...ef, ...extra, handled: true, decision: outcome, handled_at: new Date().toISOString() };
    try {
        await updateItem(msg.id, { label, status, extra_fields });
        return { ...msg, label, status, extra_fields: JSON.stringify(extra_fields) };
    } catch (e) {
        console.warn('[coordinatorNotifications] mark handled failed:', e instanceof Error ? e.message : e);
        return null;
    }
}

/**
 * מסמן כטופלו את התראות "בקשת רכז חדשה" של כל המנהלים על הבקשות שברשימה.
 * best-effort: כשל כאן לא מבטל את ההחלטה עצמה שכבר נשמרה.
 * מחזיר כמה התראות סומנו.
 */
export async function markCoordinatorMessagesHandled(
    requests: Array<Pick<DbCoordinatorRequest, 'user_id' | 'phone' | 'neighborhoods'>>,
    outcome: CoordMessageOutcome,
): Promise<number> {
    const targets = requests.filter(Boolean);
    if (targets.length === 0) return 0;

    let admins;
    try {
        admins = await getAllAdminRecipients();
    } catch (e) {
        console.warn('[coordinatorNotifications] admin list failed:', e instanceof Error ? e.message : e);
        return 0;
    }
    const inboxes = await Promise.all(admins.map(a => getMessagesByUserId(a.id).catch(() => [])));
    let marked = 0;

    await Promise.all(inboxes.flat().map(async (msg) => {
        const ef = parseEf(msg.extra_fields);
        if (!ef || ef.type !== 'coordinator_request' || ef.handled) return;
        if (!targets.some(req => messageMatchesRequest(ef, req))) return;
        if (await writeHandled(msg, ef, outcome)) marked++;
    }));
    return marked;
}

/**
 * הגשה חוזרת של אותה בקשה (אותו מבקש, אותם אזורים) - מרעננת את כרטיסי ההתראה
 * *הפתוחים* בתיבות המנהלים במקום להוסיף כרטיס נוסף על אותה בקשה. הכרטיס חוזר
 * להיות "לא נקרא", כי הפרטים שבו השתנו והמנהל צריך לראות אותם.
 *
 * מחזיר כמה כרטיסים עודכנו. 0 פירושו שאין כרטיס פתוח בשום תיבה (נמחק/הוסתר/סומן
 * טופל) - ואז על הקורא ליצור התראה חדשה, כדי שבקשה ממתינה לא תישאר בלי כרטיס.
 * best-effort: כשל כאן לא מכשיל את עדכון הבקשה עצמה.
 */
export async function refreshCoordinatorRequestMessages(
    req: { user_id?: string | null; phone?: string | null; neighborhoods: string[] },
    fields: { label: string; description: string },
): Promise<number> {
    let admins;
    try {
        admins = await getAllAdminRecipients();
    } catch (e) {
        console.warn('[coordinatorNotifications] admin list failed:', e instanceof Error ? e.message : e);
        return 0;
    }
    const inboxes = await Promise.all(admins.map(a => getMessagesByUserId(a.id).catch(() => [])));
    let refreshed = 0;

    await Promise.all(inboxes.flat().map(async (msg) => {
        const ef = parseEf(msg.extra_fields);
        // רק כרטיס פתוח: לא טופל, לא הוסתר, לא בארכיון. אחרת עדיף כרטיס חדש.
        if (!ef || ef.type !== 'coordinator_request' || ef.handled || ef.dismissed) return;
        if (msg.status === 'archived') return;
        if (!messageMatchesRequest(ef, req)) return;
        try {
            const extra_fields = {
                ...ef,
                read:           false,
                resubmitted_at: new Date().toISOString(),
            };
            await updateItem(msg.id, { label: fields.label, description: fields.description, extra_fields });
            refreshed++;
        } catch (e) {
            console.warn('[coordinatorNotifications] refresh failed:', e instanceof Error ? e.message : e);
        }
    }));
    return refreshed;
}

/**
 * מיישר התראות "בקשת רכז חדשה" מול המצב האמיתי של הבקשה, בזמן קריאת התיבה.
 *
 * שני מקורות להכרעה, שניהם בכיוון אחד בלבד - להוריד התראה שכבר טופלה:
 *   - רשומת הבקשה כבר approved/rejected.
 *   - המבקש כבר רכז בפועל של כל מה שביקש. זה המצב אחרי מינוי ידני דרך כרטיס
 *     המשתמש: עמוד הניהול כבר *מסתיר* בקשה כזו מרשימת הממתינות, אבל ההתראה
 *     בתיבה לא ידעה על כך ונשארה תלויה.
 *
 * הסימון נכתב חזרה ל-DB, ולכן הריפוי קורה פעם אחת בלבד וחל על כל המכשירים.
 * בקשה שבאמת ממתינה, או שלא הצלחנו לברר את מצבה, לא נגעת - עדיף התראה מיותרת
 * על בקשת רכז שנעלמת מעיני המנהל. כשאין התראות פתוחות (כלומר אצל כל משתמש
 * שאינו מנהל) אין ולו קריאה אחת נוספת.
 */
export async function reconcileCoordinatorMessages(msgs: DbItem[]): Promise<DbItem[]> {
    const open = msgs
        .map(msg => ({ msg, ef: parseEf(msg.extra_fields) }))
        .filter((o): o is { msg: DbItem; ef: Record<string, unknown> } =>
            !!o.ef && o.ef.type === 'coordinator_request' && !o.ef.handled);
    if (open.length === 0) return msgs;

    let requests: DbCoordinatorRequest[] = [];
    try {
        requests = await getAllCoordinatorRequests();
    } catch (e) {
        console.warn('[coordinatorNotifications] requests fetch failed:', e instanceof Error ? e.message : e);
        return msgs;
    }

    // בירור רכזות פר-מבקש, פעם אחת לכל מזהה גם אם יש לו כמה התראות
    const coversCache = new Map<string, Promise<boolean>>();
    const requesterIsCoordinator = (requesterId: string, areas: string[]): Promise<boolean> => {
        if (!requesterId || areas.length === 0) return Promise.resolve(false);
        const key = `${requesterId}|${areas.join(',')}`;
        let p = coversCache.get(key);
        if (!p) {
            p = getUserByAnyId(requesterId)
                .then(u => coordinatorCovers(u?.coordinator_of, areas))
                .catch(() => false);
            coversCache.set(key, p);
        }
        return p;
    };

    const patched = new Map<string, DbItem>();
    await Promise.all(open.map(async ({ msg, ef }) => {
        const mine = requests.filter(r => messageMatchesRequest(ef, r));
        const areas = splitAreas(ef.neighborhoods);

        let outcome: CoordMessageOutcome | undefined;
        if (mine.some(r => r.status === 'approved')) outcome = 'approve';
        else if (mine.length > 0 && mine.every(r => r.status === 'rejected')) outcome = 'reject';
        else if (await requesterIsCoordinator(String(ef.requested_by_id ?? ''), areas)) outcome = 'approve';
        if (!outcome) return;   // עדיין ממתינה, או שלא הצלחנו לברר - לא נוגעים

        const updated = await writeHandled(msg, ef, outcome, { reconciled: true });
        if (updated) patched.set(msg.id, updated);
    }));
    if (patched.size === 0) return msgs;
    console.info(`[coordinatorNotifications] יושרו ${patched.size} התראות בקשת רכז שכבר הוכרעו`);
    return msgs.map(m => patched.get(m.id) ?? m);
}
