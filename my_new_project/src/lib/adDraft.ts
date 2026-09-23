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

/**
 * לשם מה נכנסו לסטודיו:
 *  'edit' - עריכה של הפרסומת הקיימת (הגעה מ"עריכת הפרסומת" באזור האישי).
 *           השליחה מחליפה את מה שרץ על האתר.
 *  'new'  - רכישת פרסומת *נוספת* (הגעה מהמחירון אחרי בחירת מסלול).
 *           השליחה לא נוגעת בפרסומת הקיימת ושתיהן רצות במקביל.
 *
 * בלי ההבחנה הזו השרת זיהה "מפרסם חוזר" לפי זהות בלבד, וכל רכישה שנייה
 * הרגה את הראשונה - גם כשהמפרסם שילם בכוונה על שתיים.
 */
export const AD_INTENT_KEY = 'ad_builder_intent_v1';
export type AdIntent = 'edit' | 'new';

/**
 * המזהה של הפרסומת הספציפית שנערכת עכשיו (הגעה מ"ערוך" על פרסומת
 * מסוימת בנכסים). זה מה שהופך את העריכה למדויקת: השליחה נושאת את
 * המזהה, והאישור מחליף את הפרסומת הזו בלבד - לא את כל הפרסומות של
 * המפרסם. בלי מזהה (כניסה ישנה/כללית) השרת נופל לזיהוי לפי מפרסם.
 */
export const AD_EDIT_TARGET_KEY = 'ad_builder_edit_target_v1';

export function setAdEditTarget(id: string): void {
    try { localStorage.setItem(AD_EDIT_TARGET_KEY, id); } catch { /* ignore */ }
}

export function getAdEditTarget(): string | null {
    try { return localStorage.getItem(AD_EDIT_TARGET_KEY) || null; } catch { return null; }
}

export function clearAdEditTarget(): void {
    try { localStorage.removeItem(AD_EDIT_TARGET_KEY); } catch { /* ignore */ }
}

/**
 * עריכה *במקום*: הגעה לבילדר עם ?edit=<id>&inplace=1 - ממסך פרסומות
 * המוצרים של חנות החירות. השליחה אז מעדכנת את הפרסומת הקיימת במקום
 * ליצור גרסה חדשה שממתינה לאישור, כי לפרסומת מוצר אין מפרסם שממתין
 * לאישור - היא כבר על האוויר. שמור לסופר-אדמין, והשרת אוכף זאת שוב
 * ומסרב לגעת ברשומה שאינה פרסומת מוצר.
 */
export const AD_EDIT_INPLACE_KEY = 'ad_builder_edit_inplace_v1';

export function setAdEditInPlace(on: boolean): void {
    try {
        if (on) localStorage.setItem(AD_EDIT_INPLACE_KEY, '1');
        else localStorage.removeItem(AD_EDIT_INPLACE_KEY);
    } catch { /* ignore */ }
}

/** לאן לחזור אחרי שמירה במקום - מסך הניהול שממנו הגיעו (נתיב פנימי בלבד) */
export const AD_EDIT_RETURN_KEY = 'ad_builder_edit_return_v1';

export function setAdEditReturn(path: string | null): void {
    try {
        if (path && path.startsWith('/') && !path.startsWith('//')) localStorage.setItem(AD_EDIT_RETURN_KEY, path);
        else localStorage.removeItem(AD_EDIT_RETURN_KEY);
    } catch { /* ignore */ }
}

export function getAdEditReturn(): string | null {
    try { return localStorage.getItem(AD_EDIT_RETURN_KEY); } catch { return null; }
}

export function isAdEditInPlace(): boolean {
    try { return localStorage.getItem(AD_EDIT_INPLACE_KEY) === '1'; } catch { return false; }
}

export function setAdIntent(intent: AdIntent): void {
    try { localStorage.setItem(AD_INTENT_KEY, intent); } catch { /* ignore */ }
}

/** ברירת המחדל היא 'edit' - ההתנהגות שהייתה לפני שהדגל הזה נוסף */
export function getAdIntent(): AdIntent {
    try { return localStorage.getItem(AD_INTENT_KEY) === 'new' ? 'new' : 'edit'; } catch { return 'edit'; }
}

export function clearAdIntent(): void {
    try { localStorage.removeItem(AD_INTENT_KEY); } catch { /* ignore */ }
}

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
