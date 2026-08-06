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
// ============================================================

import { getAllAdminRecipients, getMessagesByUserId, updateItem } from './db.js';

export type AdMessageOutcome = 'approve' | 'reject' | 'superseded';

/** קידומת שמסבירה בכותרת מה קרה לבקשה, לפני שהיא יורדת ל"הודעות שטופלו" */
const LABEL_PREFIX: Record<AdMessageOutcome, string> = {
    approve:    '✅ אושרה · ',
    reject:     '✖️ נדחתה · ',
    superseded: '🔄 הוחלפה בגרסה מעודכנת · ',
};

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
    const now = new Date().toISOString();
    let marked = 0;

    await Promise.all(inboxes.flat().map(async (msg) => {
        let ef: Record<string, unknown>;
        try { ef = msg.extra_fields ? JSON.parse(msg.extra_fields) : {}; } catch { return; }
        if (ef.type !== 'ad_submission' || ef.handled) return;
        if (!targets.has(String(ef.ad_id ?? ''))) return;
        // הקידומת נכתבת פעם אחת בלבד - כדי שטיפול חוזר לא יערים כותרות
        const label = (msg.label ?? '').startsWith(LABEL_PREFIX[outcome])
            ? msg.label ?? ''
            : `${LABEL_PREFIX[outcome]}${msg.label ?? ''}`;
        try {
            await updateItem(msg.id, {
                label,
                status: 'handled',
                extra_fields: { ...ef, ...extra, handled: true, decision: outcome, handled_at: now },
            });
            marked++;
        } catch (e) {
            console.warn('[adNotifications] mark handled failed:', e instanceof Error ? e.message : e);
        }
    }));
    return marked;
}
