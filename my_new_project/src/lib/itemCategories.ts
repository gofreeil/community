// ============================================================
// itemCategories.ts — מה נחשב "פריט תוכן" באוסף ה-items המשותף.
//
// אוסף ה-item ב-Strapi הוא האוסף המשותף של *משפחת* האתרים המסונכרנים:
//   קהילה בשכונה (ה-hub) + הגמ"ח הארצי + פינת האבדות + בעלי מקצוע
//   (+ אתר השידוכין בעתיד).
// הסנכרון הדו-כיווני הוא תכונה מכוונת: פריט שעולה באחד מהאתרים מופיע גם
// אצל האחרים ועל המפה כאן, ולהיפך.
//
// ולכן — אסור לסנן לפי רשימת-היתר של קטגוריות הקהילה בלבד! קטגוריה של
// אתר-אחות (למשל 'lost_and_found' של פינת האבדות, שיש לה זרימה ייעודית
// ואינה ב-categoryConfig) חייבת לזרום פנימה אוטומטית, וכך גם כל קטגוריה
// חדשה שאתר-אחות יוסיף בעתיד.
//
// לכן הסינון הוא רשימת-חסימה בלבד:
//   1. קטגוריות מערכת — רשומות פנימיות (הודעות, בקשות, סקרים), לא תוכן.
//   2. קטגוריות של מוצר זר שחלק בטעות את אותו אוסף.
// ============================================================

/** רשומות מערכת — התראות/בקשות/סקרים פנימיים, לא תוכן שהעלה משתמש. */
export const SYSTEM_CATEGORIES: ReadonlySet<string> = new Set([
	'message', 'admin_alert', 'poll', 'emergency_team', 'raise_hand',
	'singles_access', 'singles_request', 'shabbat_report', 'shabbat_request',
	'location_request', 'user_feedback', 'vaad_member', 'wish',
]);

/**
 * קטגוריות של אתרים שאינם חלק מהמשפחה המסונכרנת.
 * 'pr_official' = אתר הדירוג הציבורי (public-rating-il) — מוצר נפרד לגמרי
 * שחלק בטעות את אוסף ה-items. הוא מבודד ל-collection `pr-item` בבאקאנד;
 * ההחרגה כאן היא הגנה זמנית עד שהמיגרציה תוציא את הרשומות מ-item.
 */
export const FOREIGN_CATEGORIES: ReadonlySet<string> = new Set([
	'pr_official', // המדורגים עצמם
	'pr_review',   // ביקורות על מדורג
	'pr_comment',  // תגובות
]);

/**
 * פריט תוכן אמיתי של משפחת האתרים — נספר במונים ומוצג על המפה.
 * כל מה שאינו רשומת מערכת ואינו של מוצר זר.
 */
export function isFamilyItem(category: string | null | undefined): boolean {
	return !!category && !SYSTEM_CATEGORIES.has(category) && !FOREIGN_CATEGORIES.has(category);
}
