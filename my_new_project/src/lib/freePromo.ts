// ============================================================
// freePromo.ts - מבצע השקה: פרסום חינם עם קוד בדף התשלום
//
// FREE_PROMO = true  → מוצגת מודעת מבצע בדף התשלום, והקוד
//                      "יוצאים לחירות" נותן פטור מלא מתשלום.
//                      הזרימה הרגילה נשמרת: /add מפנה לדף התשלום,
//                      והמשתמש מזין את הקוד בשדה ההנחה.
// FREE_PROMO = false → עצירת המבצע: המודעה נעלמת והקוד מפסיק לעבוד.
//
// לעצירה: לשנות את השורה למטה ל-false, commit + push.
// ============================================================

import type { DiscountCode } from './discountCodes';

export const FREE_PROMO = true;

/** המילים שהמשתמש מקליד בשדה ההנחה כדי לקבל פטור מלא */
export const FREE_PROMO_CODE_TEXT = 'יוצאים לחירות';

export const FREE_PROMO_LABEL = 'מבצע השקה - הפרסום חינם';

/** קוד ההנחה של המבצע - מוזרק לרשימת הקודים בדף התשלום כש-FREE_PROMO פעיל */
export const FREE_PROMO_DISCOUNT: DiscountCode = {
    id: 'free-promo',
    label: FREE_PROMO_LABEL,
    code: FREE_PROMO_CODE_TEXT,
    kind: 'free',
    percent: 100,
    requiresCoordinator: false,
    active: true,
    note: 'קוד מבצע ההשקה - נשלט ע"י FREE_PROMO ב-freePromo.ts, לא דרך Strapi.',
};
