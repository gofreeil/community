// ============================================================
// smsPrefs.ts — העדפות SMS לנייד של מנהלים ורכזים (משותף לקליינט ולשרת)
//
// ה-SMS עצמו יוצא מהבאקאנד (community-backend/src/utils/adminSms.ts) על כל
// התראת ניהול חדשה. שם גם מסווגים כל התראה לאחת מהקבוצות כאן, ובודקים את
// sms_prefs של הנמען. הרשימה הזו חייבת להישאר זהה לזו שבבאקאנד.
//
// העדפה חסרה (null) = הכל פתוח — כך מנהל שמעולם לא נגע בהגדרות מקבל הכל.
// ============================================================

export const SMS_GROUPS = ['ads', 'coordinators', 'locations', 'content', 'errors', 'other'] as const;
export type SmsGroup = (typeof SMS_GROUPS)[number];

export interface SmsPrefs {
    /** false = בלי SMS בכלל, בלי קשר לקבוצות */
    enabled: boolean;
    /** הקבוצות שכן נשלחות. ריק + enabled = כלום. */
    groups: SmsGroup[];
}

export const DEFAULT_SMS_PREFS: SmsPrefs = { enabled: true, groups: [...SMS_GROUPS] };

/** מנרמל ערך גולמי מה-DB (json חופשי) להעדפה תקינה; null/זבל → ברירת המחדל (הכל) */
export function normalizeSmsPrefs(raw: unknown): SmsPrefs {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_SMS_PREFS, groups: [...SMS_GROUPS] };
    const o = raw as { enabled?: unknown; groups?: unknown };
    const groups = Array.isArray(o.groups)
        ? (o.groups.filter((g): g is SmsGroup => (SMS_GROUPS as readonly string[]).includes(String(g))))
        : [...SMS_GROUPS];
    return { enabled: o.enabled !== false, groups };
}
