// התראת "פנוי/ה חדש/ה ממתין/ה לאישור" נחשבת טופלה כשהכרטיס *שלה* כבר לא ממתין -
// ולא כשאין שום כרטיס ממתין. אחרת כרטיס חדש אחד "מחיה" את כל ההתראות הישנות
// שכבר ירדו להיסטוריה, והבאדג' קופץ ל-5 על כרטיס אחד.
//
// משמש גם את דף הפרופיל (תיבת ההודעות) וגם את /api/my-messages (הבאדג' בהדר),
// כדי שהמספר והתיבה יסכימו זה עם זה.
export interface PendingSinglesRef {
    id: string;
    /** createdAt של הכרטיס הממתין, במילישניות */
    createdMs: number;
}

// זמן ההתראה מאוחר מעט מזמן יצירת הכרטיס (אותה בקשה) - מרווח ביטחון להשוואה
const CLOCK_SLACK_MS = 5 * 60 * 1000;

export function isSinglesReviewHandled(
    itemId: string,
    msgCreatedMs: number,
    pending: PendingSinglesRef[],
): boolean {
    if (pending.length === 0) return true;
    // התראה חדשה נושאת את מזהה הכרטיס - טופלה אם הכרטיס הזה כבר לא ממתין
    if (itemId) return !pending.some((p) => String(p.id) === String(itemId));
    // התראה ישנה (מלפני item_id): הכרטיס שלה נוצר רגע לפניה. אם כל הכרטיסים
    // הממתינים נוצרו אחריה - הכרטיס שלה כבר הוכרע, וההתראה טופלה.
    if (!Number.isFinite(msgCreatedMs) || msgCreatedMs <= 0) return false;
    return !pending.some((p) => p.createdMs <= msgCreatedMs + CLOCK_SLACK_MS);
}

export function toPendingSinglesRefs(items: { id: string; created_at?: string }[]): PendingSinglesRef[] {
    return items.map((it) => ({ id: String(it.id), createdMs: new Date(it.created_at ?? '').getTime() || 0 }));
}
