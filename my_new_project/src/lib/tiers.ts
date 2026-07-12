// ============================================================
// מודל דרגות ההרשמה (Progressive Registration Tiers)
// ------------------------------------------------------------
// מקור אמת יחיד: מהן הדרגות, אילו שדות כל דרגה דורשת, ואיזו דרגה כל פעולה
// דורשת. הרעיון: לא חוסמים את הדלת — נרשמים ונכנסים מיד (דרגה 1), ורק כשמנסים
// פעולה שדורשת יותר, מבקשים להשלים בדיוק את מה שחסר, במקום (בלי ניתוב/גירוש).
//
// לכוונון גבולות הדרגות ("מתי דורשים לעלות דרגה") — עורכים כאן בלבד:
//   • TIER_FIELDS — אילו שדות כל דרגה מוסיפה.
//   • CATEGORY_TIER / DEFAULT_PUBLISH_TIER — איזו דרגה כל קטגוריית פרסום דורשת.
// כל שאר האתר (הבאנר בפרופיל, שער הפרסום, ה-endpoint) נגזר מכאן אוטומטית.
// ============================================================

export type Tier = 1 | 2 | 3;

/** תת-קבוצת שדות המשתמש שהדרגות נשענות עליהן (client+server, בלי תלות ב-DB) */
export interface TierUserFields {
    name?: string | null;
    email?: string | null;
    /** false = אימייל טרם אומת; undefined/true = לא חוסם (אישור-מייל כבוי → כולם מאומתים) */
    email_confirmed?: boolean;
    phone?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    gender?: string | null;
    birth_date?: string | null;
}

export type TierFieldKey =
    | 'name' | 'email_confirmed' | 'phone' | 'city' | 'neighborhood' | 'gender' | 'birth_date';

export type TierInput = 'text' | 'tel' | 'city' | 'neighborhood' | 'gender' | 'date' | 'email_verify';

export interface TierField {
    key: TierFieldKey;
    /** מפתח i18n לתווית (namespace tiers) */
    labelKey: string;
    /** מפתח i18n להסבר קצר/הדרכה */
    hintKey: string;
    input: TierInput;
}

// ---- אילו שדות כל דרגה מוסיפה (מצטבר: דרגה N דורשת את כל השדות עד N) ----
export const TIER_FIELDS: Record<Tier, TierField[]> = {
    // דרגה 1 — חבר: קיים תמיד מיד אחרי הרשמה (שם + אימייל נדרשים בהרשמה עצמה)
    1: [
        { key: 'name', labelKey: 'field_name', hintKey: 'hint_name', input: 'text' },
    ],
    // דרגה 2 — תושב מאומת: מיקום + טלפון (+ אימות מייל כשמופעל). נדרש לפרסום
    // מודעות בלוח — כדי שהמודעה תשובץ לעיר/שכונה הנכונה ושכן יוכל ליצור קשר.
    2: [
        { key: 'city',           labelKey: 'field_city',         hintKey: 'hint_city',         input: 'city' },
        { key: 'neighborhood',   labelKey: 'field_neighborhood', hintKey: 'hint_neighborhood', input: 'neighborhood' },
        { key: 'phone',          labelKey: 'field_phone',        hintKey: 'hint_phone',        input: 'tel' },
        { key: 'email_confirmed', labelKey: 'field_email_verify', hintKey: 'hint_email_verify', input: 'email_verify' },
    ],
    // דרגה 3 — פרופיל מלא: פרטים אישיים. נדרש ללוח פנויים/שידוכים.
    3: [
        { key: 'gender',     labelKey: 'field_gender',     hintKey: 'hint_gender',     input: 'gender' },
        { key: 'birth_date', labelKey: 'field_birth_date', hintKey: 'hint_birth_date', input: 'date' },
    ],
};

/** שם/תיאור קצר לכל דרגה (מפתחות i18n בלבד; namespace tiers) */
export const TIER_META: Record<Tier, { nameKey: string; descKey: string; emoji: string }> = {
    1: { nameKey: 'tier1_name', descKey: 'tier1_desc', emoji: '🌱' },
    2: { nameKey: 'tier2_name', descKey: 'tier2_desc', emoji: '🏘️' },
    3: { nameKey: 'tier3_name', descKey: 'tier3_desc', emoji: '⭐' },
};

// ---- כמה ספרות נחשבות טלפון תקין ----
function phoneOk(v: string | null | undefined): boolean {
    return (v ? v.replace(/\D/g, '') : '').length >= 9;
}

/** האם שדה בודד מסופק במידה מספקת לדרגה */
export function fieldSatisfied(user: TierUserFields, key: TierFieldKey): boolean {
    switch (key) {
        case 'name':         return !!user.name?.trim();
        case 'phone':        return phoneOk(user.phone);
        case 'city':         return !!user.city?.trim();
        case 'neighborhood': return !!user.neighborhood?.trim();
        case 'gender':       return !!user.gender?.trim();
        case 'birth_date':   return !!user.birth_date?.trim();
        // חוסם רק כשאומת במפורש כ-false; undefined/true = מאומת (אישור-מייל כבוי)
        case 'email_confirmed': return user.email_confirmed !== false;
    }
}

/** כל השדות (מכל הדרגות עד target) שעדיין חסרים למשתמש */
export function missingForTier(user: TierUserFields, target: Tier): TierField[] {
    const missing: TierField[] = [];
    for (let t = 1 as Tier; t <= target; t = (t + 1) as Tier) {
        for (const f of TIER_FIELDS[t]) {
            if (!fieldSatisfied(user, f.key)) missing.push(f);
        }
    }
    return missing;
}

/** האם המשתמש עומד בדרגת היעד (אין שדות חסרים) */
export function tierMet(user: TierUserFields, target: Tier): boolean {
    return missingForTier(user, target).length === 0;
}

/** הדרגה הגבוהה ביותר שהמשתמש עומד בה (1..3) */
export function userTier(user: TierUserFields | null | undefined): Tier {
    if (!user) return 1;
    if (!tierMet(user, 2)) return 1;
    if (!tierMet(user, 3)) return 2;
    return 3;
}

// ============================================================
// פעולות → דרגה נדרשת
// ============================================================

/**
 * פרסום מודעה לפי קטגוריה. ברירת המחדל לפרסום = דרגה 2 (צריך מיקום+טלפון).
 * חריגים: פנויים = דרגה 3 (פרטים אישיים); שירותי-חירום/קהילה בסיסיים = דרגה 1.
 */
export const DEFAULT_PUBLISH_TIER: Tier = 2;

export const CATEGORY_TIER: Record<string, Tier> = {
    // דרגה 3 — פרופיל מלא
    singles: 3,
    // דרגה 1 — עזרה קהילתית בסיסית, חייבת להישאר ללא חיכוך
    lost_and_found: 1,
    raise_hand: 1,
};

/** הדרגה הנדרשת לפרסום בקטגוריה נתונה */
export function categoryTier(categoryId: string | null | undefined): Tier {
    if (!categoryId) return DEFAULT_PUBLISH_TIER;
    return CATEGORY_TIER[categoryId] ?? DEFAULT_PUBLISH_TIER;
}
