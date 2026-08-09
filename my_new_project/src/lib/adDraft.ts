// ============================================================
// adDraft.ts — המפתחות המשותפים של טיוטת הפרסומת
// ------------------------------------------------------------
// טיוטת הבילדר חיה ב-localStorage, ושלושה מקומות נוגעים בה: הבילדר,
// עורך דף הנחיתה והאזור האישי. כל אחד מהם החזיק את שם המפתח כמחרוזת
// משלו, וכך נוצר הפער: אחרי שליחה לאישור אף אחד לא סימן שהפרסומת כבר
// נשלחה, והאזור האישי המשיך לנדנד "יש לך פרסום בטיוטא - סיים את עריכתו"
// למפרסם שכבר סיים. הדגל הזה סוגר את הפער.
// ============================================================

/** הטיוטה עצמה - כל השדות שהמפרסם מילא בבילדר */
export const AD_DRAFT_KEY = 'ad_builder_draft_v1';

/** חותמת ISO של הרגע שבו הפרסומת נשלחה לאישור מהטיוטה הזו */
export const AD_SUBMITTED_KEY = 'ad_builder_submitted_v1';

/** נקרא אחרי שליחה מוצלחת: מכאן והלאה אין מה לנדנד למפרסם */
export function markAdSubmitted(): void {
    try { localStorage.setItem(AD_SUBMITTED_KEY, new Date().toISOString()); } catch { /* ignore */ }
}

/**
 * נקרא כשהמפרסם באמת עורך משהו אחרי השליחה - הטיוטה שוב "בעבודה",
 * ולכן נכון שהתזכורת תחזור עד שהוא ישלח את הגרסה החדשה.
 */
export function clearAdSubmitted(): void {
    try { localStorage.removeItem(AD_SUBMITTED_KEY); } catch { /* ignore */ }
}

/** האם הטיוטה שעל המסך כבר נשלחה לאישור ולא נערכה מאז */
export function isAdSubmitted(): boolean {
    try { return Boolean(localStorage.getItem(AD_SUBMITTED_KEY)); } catch { return false; }
}
