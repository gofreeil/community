// סיווג התראות: "מערכת" מול "פרטיות".
//
// התראת מערכת = בקשה/דיווח שמגיעים למנהל או לרכז כדי שיטפל בהם (אישור פרסומת,
// בקשת שכונה, נרשם חדש, תקלה באתר...). היא לא "על" המשתמש עצמו אלא על האתר.
// התראה פרטית = כל השאר: הודעה אישית שנוגעת למשתמש הזה (תגובה על פריט שלו,
// התאמה בלוח הפנויים, החלטה על בקשה ששלח, תזכורת על הפרסומת שלו).
//
// ברירת המחדל היא "פרטית": סוג חדש שלא נרשם כאן ייחשב אישי, כדי שלעולם לא
// תיעלם התראה אישית לתוך ערוץ הניהול.

export type NotificationChannel = 'system' | 'private';

/** סוגי ההתראות שמופנות לצוות הניהול/הרכזים ולא למשתמש עצמו */
export const SYSTEM_MSG_TYPES = new Set<string>([
    'ad_submission',          // בקשת פרסום חדשה לאישור
    'coordinator_request',    // בקשה להיות רכז שכונה
    'location_request',       // בקשת מיקום חדש
    'neighborhood_request',   // בקשת שכונה חדשה
    'singles_review',         // כרטיס פנויים ממתין לבדיקה
    'singles_access',         // בקשת גישה ללוח הפנויים
    'matchmaker_request',     // בקשה להיות שדכן/ית מערכת
    'wish_request',           // משאלה חדשה ממתינה לאישור
    'design_help_request',    // בקשת עזרה בעיצוב פרסומת
    'new_user',               // נרשם חדש באתר
    'server_error',           // תקלת שרת
    'client_error',           // תקלה בדפדפן של גולש
    'order_failed',           // שליחת בקשת פרסום נכשלה
]);

export function notificationChannel(type: string | null | undefined): NotificationChannel {
    return SYSTEM_MSG_TYPES.has(String(type ?? '')) ? 'system' : 'private';
}

export function isSystemNotification(type: string | null | undefined): boolean {
    return notificationChannel(type) === 'system';
}
