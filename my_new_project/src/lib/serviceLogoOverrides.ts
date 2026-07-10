// ============================================================
// serviceLogoOverrides.ts - לוגואים רשמיים לפי סוג-שירות
//
// כאן ממפים מזהה service_type -> נתיב לקובץ לוגו רשמי שהונח בתיקייה
// static/service-logos/. כשמוגדר כאן, הלוגו הרשמי גובר על תג
// המונוגרם/הצבע האוטומטי בכל האתר (מפה, בורר סוג-שירות, דף פריט).
//
// ── איך מוסיפים לוגו רשמי ──────────────────────────────────
// 1. שמרו את קובץ המותג הרשמי (עדיף SVG שקוף; גם PNG עובד) בתיקייה
//    static/service-logos/  - למשל:  static/service-logos/hapoalim.svg
// 2. הוסיפו כאן שורה שמצביעה על הקובץ, לפי מזהה השירות (id מ-serviceTypes.ts):
//        bank_hapoalim: '/service-logos/hapoalim.svg',
// 3. שמרו ודחפו. מאותו רגע כל סניף מאותו סוג יציג את הלוגו הרשמי אוטומטית.
//
// ⚠️ השתמשו רק בקובצי מותג רשמיים שיש לכם זכות שימוש בהם. הלוגו מוצג
//    כפי שהוא (העיגול הצבעוני של התג לא מצויר סביבו) - לכן עדיף קובץ עם
//    שוליים/רקע משלו או SVG שקוף מרובע.
//
// המפתחות האפשריים (id) נמצאים ב-serviceTypes.ts - למשל:
//   post, postal_bank, bank_hapoalim, bank_leumi, bank_discount,
//   bank_mizrahi, bank_beinleumi, bank_mercantile, bank_yahav, bank_jerusalem
// ============================================================

export const SERVICE_LOGO_OVERRIDES: Record<string, string> = {
    // דוגמאות (בטלו את ההערה אחרי שהנחתם את הקובץ):
    // post:          '/service-logos/israel-post.svg',
    // bank_hapoalim: '/service-logos/hapoalim.svg',
    // bank_leumi:    '/service-logos/leumi.svg',
    // bank_discount: '/service-logos/discount.svg',
    // bank_mizrahi:  '/service-logos/mizrahi.svg',
};

/** נתיב ללוגו רשמי שהוגדר לסוג-שירות, או '' אם אין */
export function officialLogoFor(id: string | null | undefined): string {
    if (!id) return '';
    return SERVICE_LOGO_OVERRIDES[id] ?? '';
}
