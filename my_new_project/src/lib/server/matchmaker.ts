// "שדכן מערכת" — משתמש שאושר ע"י סופר-אדמין לקבל כלי שידוך (המלצות התאמה + הפניית
// כרטיסים זה לזה). המודל זהה ל-singlesAccess: הבקשה נשמרת כפריט category='matchmaker_request'
// עם extra_fields.status ('pending' | 'approved' | 'rejected') — בלי שינוי סכמה בבאקאנד.
// כך "האם המשתמש שדכן מאושר" נגזר מהנתונים בלי שדה משתמש חדש ב-Strapi.

import { getItemsByCategory } from './db';

export type MatchmakerStatus = 'approved' | 'pending' | 'none' | 'unavailable';

/** קטגוריית הפריטים שבהם נשמרות בקשות השדכנות */
export const MATCHMAKER_REQUEST_CATEGORY = 'matchmaker_request';

/** פער-גיל מקסימלי (בשנים) שעדיין נחשב "גילאים דומים" להמלצת התאמה ראשונית.
 *  בהמשך יתווספו קריטריונים נוספים (מגזר, עיר, מצב משפחתי...). */
export const AGE_MATCH_THRESHOLD = 5;

function reqStatus(extra_fields: string | null | undefined): string {
    try { return String(JSON.parse(extra_fields || '{}').status || 'pending'); } catch { return 'pending'; }
}

/**
 * מצב בקשת/הרשאת השדכנות של המשתמש.
 * 'unavailable' = תקלת Strapi זמנית — אי-אפשר לקבוע. הקוראים שמגנים על גישה
 * חייבים לטפל בזה כ"לא ודאי" ולא לחסום/לפתוח בטעות.
 * סופר-אדמין הוא תמיד שדכן מאושר (יש לו את כל הכלים ממילא).
 */
export async function getMatchmakerStatus(
    userId: string | null | undefined,
    isSuperAdmin = false,
): Promise<MatchmakerStatus> {
    if (isSuperAdmin) return 'approved';
    if (!userId) return 'none';
    const uid = String(userId);
    try {
        const mine = (await getItemsByCategory(MATCHMAKER_REQUEST_CATEGORY)).filter((r) => r.user_id === uid);
        if (mine.some((r) => reqStatus(r.extra_fields) === 'approved')) return 'approved';
        if (mine.some((r) => reqStatus(r.extra_fields) === 'pending')) return 'pending';
        return 'none';
    } catch {
        return 'unavailable';
    }
}
