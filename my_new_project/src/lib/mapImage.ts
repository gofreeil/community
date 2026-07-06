// ============================================================
// mapImage.ts - פיצ'ר "תמונה/לוגו על המפה"
//
// מאפשר לבעל כרטיס (בית כנסת, עסק או כל יתרון אחר) לבחור תמונה
// מתוך התמונות שהעלה כך שהיא תופיע על המפה במקום האימוג'י של
// הקטגוריה. תוספת בתשלום - 50 ₪ לשנה. לא זמין לכרטיסי פנויים/פנויות.
//
// הבחירה נשמרת ב-extra_fields.map_image (מחרוזת: data URI / URL / נתיב).
// אם השדה ריק - מוצג האימוג'י הרגיל.
// ============================================================

/** עלות התוספת - 50 ₪ לשנה */
export const MAP_IMAGE_PRICE_YEARLY = 50;

/** קטגוריות שבהן אי אפשר להציג תמונה על המפה */
const MAP_IMAGE_EXCLUDED = new Set(['singles']);

/** האם הקטגוריה זכאית לפיצ'ר (הכל חוץ מפנויים/פנויות) */
export function canUseMapImage(category: string | null | undefined): boolean {
    return !!category && !MAP_IMAGE_EXCLUDED.has(category);
}

/** מחזיר את התמונה שנבחרה להצגה על המפה מתוך extra_fields (או '' אם אין) */
export function getMapImage(extra: Record<string, unknown> | null | undefined): string {
    const v = extra?.map_image;
    return typeof v === 'string' ? v.trim() : '';
}

/** האם מחרוזת היא תמונה תקינה להצגה (data URI / http(s) / נתיב מקומי) */
export function isDisplayableImage(s: string): boolean {
    if (!s) return false;
    return /^data:image\//i.test(s) || /^https?:\/\//i.test(s) || s.startsWith('/');
}
