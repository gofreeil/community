// ============================================================
// discountCodes.ts - קודי הנחה לדף התשלום (פרסום)
//
// מקור אמת אחד לקודי ההנחה. נטען מ-Strapi (singleType discount-config)
// עם נפילה לברירות-המחדל כאן. ניתן לעריכה בדף הסופר-אדמין.
//
// קובץ זה אינו server-only - הוא משותף בין הלקוח (דף התשלום) לשרת.
// ============================================================

export type DiscountKind = 'percent' | 'free';

export interface DiscountCode {
    /** מזהה יציב (לא לשנות אחרי יצירה) */
    id: string;
    /** שם תצוגה, למשל "הנחת רכז" */
    label: string;
    /** המילים המדויקות שעל המשתמש להקליד במגירה */
    code: string;
    /** percent = אחוז הנחה · free = פטור מלא מתשלום */
    kind: DiscountKind;
    /** אחוז ההנחה (רלוונטי ל-kind='percent'; ב-free זה 100) */
    percent: number;
    /** האם נדרש שהמשתמש יהיה מאושר כרכז במערכת כדי שההנחה תחול */
    requiresCoordinator: boolean;
    /** האם הקוד פעיל */
    active: boolean;
    /** הערה לסופר-אדמין (לא מוצג למשתמש) */
    note?: string;
}

// ברירות מחדל - "לשם התחלה" לפי הוראת המשתמש.
export const DEFAULT_DISCOUNT_CODES: DiscountCode[] = [
    {
        id: 'coordinator',
        label: 'הנחת רכז',
        code: 'רכז יוצאים לחירות',
        kind: 'percent',
        percent: 10,
        requiresCoordinator: true,
        active: true,
        note: 'תקף רק למשתמש שמאושר כרכז במערכת (coordinator_of אינו ריק).',
    },
    {
        id: 'owner',
        label: 'הנחת בעלים',
        code: 'הנחת בעלים',
        kind: 'percent',
        percent: 20,
        requiresCoordinator: false,
        active: true,
        note: 'ללא הוכחה כרגע - חל לפי הזנת המילים בלבד.',
    },
    {
        id: 'free',
        label: 'פטור מלא',
        code: "לה' הארץ ומלואה",
        kind: 'free',
        percent: 100,
        requiresCoordinator: false,
        active: true,
        note: 'פטור מלא מתשלום - הפרסום עולה ללא עלות.',
    },
];

/**
 * נרמול טקסט להשוואה: הסרת גרשיים/אפוסטרופים, איחוד רווחים, lowercase.
 * סלחני בכוונה - "לה' הארץ ומלואה" יזוהה גם אם הוקלד בלי הגרש.
 */
export function normalizeCode(s: string): string {
    return (s ?? '')
        .replace(/[׳'`’׳]/g, '')   // גרש / אפוסטרופים
        .replace(/["״״]/g, '')     // גרשיים
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

export interface DiscountResult {
    /** הקוד שהותאם (גם אם לא חלה הזכאות) */
    matched: DiscountCode | null;
    /** האם ההנחה חלה בפועל (התאמה + זכאות + פעיל) */
    applied: boolean;
    reason: '' | 'no-match' | 'inactive' | 'not-coordinator';
}

/** מציאת הקוד והערכת זכאות לפי הטקסט שהוזן + סטטוס רכז של המשתמש. */
export function evaluateDiscount(
    input: string,
    codes: DiscountCode[],
    isCoordinator: boolean
): DiscountResult {
    const norm = normalizeCode(input);
    if (!norm) return { matched: null, applied: false, reason: 'no-match' };

    const matched = (codes ?? []).find(c => normalizeCode(c.code) === norm) ?? null;
    if (!matched) return { matched: null, applied: false, reason: 'no-match' };
    if (!matched.active) return { matched, applied: false, reason: 'inactive' };
    if (matched.requiresCoordinator && !isCoordinator)
        return { matched, applied: false, reason: 'not-coordinator' };

    return { matched, applied: true, reason: '' };
}

/** סכום ההנחה בשקלים לפי הסכום הכולל. */
export function discountAmount(total: number, matched: DiscountCode): number {
    if (matched.kind === 'free') return total;
    return Math.round(total * (matched.percent / 100));
}
