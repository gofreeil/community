// ============================================================
// shopAds.ts - המוצרים החדשים של חנות החירות כפרסומות ברשת
// ------------------------------------------------------------
// ארבעת המוצרים האחרונים שאושרו בחנות (shop.gofreeil.com) עולים
// אוטומטית כפרסומות בטור הימני של *כל* אתרי הרשת, במקומות 3, 7, 11, 15.
//
// למה דווקא המספרים האלה: הטור מציג 16 מקומות בקבוצות של 4
// (1-4, 5-8, 9-12, 13-16) שמתחלפות בסבב. 3, 7, 11 ו-15 הם המקום
// השלישי בכל אחת מארבע הקבוצות - כלומר *אותה קומה* בטור, בכל סיבוב
// של הסבב. מוצר אחד נראה בכל רגע נתון, תמיד באותו גובה.
//
// מקום תפוס (מפרסם ששילם עליו) לא נדחק: המוצר עובר למקום הפנוי הבא.
//
// הקובץ הזה משותף לשרת (מנוע הסנכרון) וללקוח (מסך הניהול), ולכן אין בו
// שום ייבוא של קוד שרת.
// ============================================================

import { AD_SLOT_COUNT } from './adSlots.js';

export const SHOP_URL = 'https://shop.gofreeil.com';

/** ברירות המחדל: 4 מוצרים, מקום ראשון 3, קפיצה של 4 (קומה זהה) */
export const SHOP_ADS_DEFAULTS = {
    enabled: false,
    count: 4,
    firstSlot: 3,
    step: 4,
} as const;

export interface ShopAdsConfig {
    /** האם הסנכרון האוטומטי פעיל */
    enabled: boolean;
    /** כמה מוצרים אחרונים מתפרסמים */
    count: number;
    /** המקום הראשון בטור (1-based) */
    firstSlot: number;
    /** הקפיצה בין מוצר למוצר. 4 = אותה קומה בכל קבוצה */
    step: number;
    /** מזהי האתרים שאליהם מסנכרנים (ריק = כולם) */
    sites: string[];
    /** חותמת הסנכרון המוצלח האחרון */
    syncedAt?: string;
}

/** סוג האחסון של הפרסומות באתר היעד */
export type ShopAdSiteKind =
    /** אוסף submitted-ads המשותף, עם שיוך ב-landing._site */
    | 'submitted'
    /** אוסף נפרד pg-submitted-ads (רכישות קבוצתיות) */
    | 'pg'
    /** רשומת item בקטגוריה הפנימית __ng_ad (הגמ"ח הארצי) */
    | 'ng'
    /** רשומת pr-item בקטגוריה pr_ad (דירוג ציבורי) - תמונות מוטבעות בלבד */
    | 'pr';

export interface ShopAdSite {
    id: string;
    label: string;
    url: string;
    kind: ShopAdSiteKind;
    /**
     * הערך שנכתב ב-landing._site (רק ל-kind='submitted'). "קהילה בשכונה"
     * הוא האתר הוותיק באוסף ולכן גם רשומה בלי הסימון שייכת לו.
     */
    siteTag?: string;
    /**
     * האם המפתחות הפנימיים ב-landing נושאים קידומת קו תחתון
     * (_adStyle, _mainImageFit). "קהילה בשכונה" הוא היחיד ששמר אותם
     * בלי קידומת, ולכן צריך את שתי הצורות.
     */
    underscoreKeys: boolean;
    /**
     * צורת הגרדיאנט שהאתר מצפה לה: זוג מחלקות Tailwind
     * ("from-emerald-500 to-teal-700"), מחרוזת CSS מלאה, או מזהה מתוך
     * פלטה סגורה (דירוג ציבורי).
     */
    gradient: 'tailwind' | 'css' | 'id';
}

/**
 * כל אתרי הרשת שיש להם טור פרסומות נמכרות (11). הרשימה נגזרה מה-SITE_ID
 * של adsStore בכל מאגר - שינוי שם שם מחייב עדכון כאן. אתר שכל משבצותיו
 * קבועות ואין לו מאגר פרסומות (freedom) אינו ברשימה.
 */
export const SHOP_AD_SITES: ShopAdSite[] = [
    { id: 'community',     label: 'קהילה בשכונה',        url: 'https://community.gofreeil.com',     kind: 'submitted', siteTag: 'community',     underscoreKeys: false, gradient: 'tailwind' },
    { id: 'index',         label: 'אינדקס העסקים',       url: 'https://index.gofreeil.com',         kind: 'submitted', siteTag: 'index',         underscoreKeys: true,  gradient: 'tailwind' },
    { id: 'neighborhoods', label: 'ועדי שכונות',         url: 'https://neighborhoods.gofreeil.com', kind: 'submitted', siteTag: 'neighborhoods', underscoreKeys: true,  gradient: 'css' },
    { id: 'criticism',     label: 'מבקר רשויות המדינה',  url: 'https://criticism.gofreeil.com',     kind: 'submitted', siteTag: 'criticism',     underscoreKeys: true,  gradient: 'css' },
    { id: 'referendum',    label: 'משאלי העם',           url: 'https://referendum.gofreeil.com',    kind: 'submitted', siteTag: 'referendum',    underscoreKeys: true,  gradient: 'css' },
    { id: 'chachmim',      label: 'בתי הפיוס',           url: 'https://chachmim.gofreeil.com',      kind: 'submitted', siteTag: 'chachmim',      underscoreKeys: true,  gradient: 'css' },
    { id: 'experts',       label: 'המומחים של העם',      url: 'https://experts.gofreeil.com',       kind: 'submitted', siteTag: 'experts',       underscoreKeys: true,  gradient: 'css' },
    { id: 'avedot',        label: 'פינת האבדות',         url: 'https://avedot.gofreeil.com',        kind: 'submitted', siteTag: 'avedot',        underscoreKeys: true,  gradient: 'css' },
    { id: 'pg',            label: 'רכישות קבוצתיות',     url: 'https://groups.gofreeil.com',        kind: 'pg',                                  underscoreKeys: true,  gradient: 'css' },
    { id: 'ng',            label: 'הגמ"ח הארצי',         url: 'https://gemach.gofreeil.com',        kind: 'ng',                                  underscoreKeys: true,  gradient: 'css' },
    { id: 'rating',        label: 'דירוג ציבורי',        url: 'https://rating.gofreeil.com',        kind: 'pr',                                  underscoreKeys: true,  gradient: 'id' },
];

export function shopAdSite(id: string): ShopAdSite | undefined {
    return SHOP_AD_SITES.find(s => s.id === id);
}

/**
 * המקומות המבוקשים (1-based) לפי ההגדרה. מקום שחורג מהלוח נחתך -
 * עדיף פחות מוצרים על מוצר שמתפרסם מחוץ לטור.
 */
export function preferredSlots(cfg: Pick<ShopAdsConfig, 'count' | 'firstSlot' | 'step'>): number[] {
    const out: number[] = [];
    for (let i = 0; i < cfg.count; i++) {
        const slot = cfg.firstSlot + i * cfg.step;
        if (slot > AD_SLOT_COUNT) break;
        out.push(slot);
    }
    return out;
}

/** הקבוצה (הקומה) שבה המקום מוצג - 1..4 בלוח של 16 בקבוצות של 4 */
export function slotGroup(slot: number, perGroup = 4): number {
    return Math.floor((slot - 1) / perGroup) + 1;
}

/** המיקום בתוך הקבוצה - 1..4. שווה בכל המקומות = אותה קומה */
export function slotRow(slot: number, perGroup = 4): number {
    return ((slot - 1) % perGroup) + 1;
}

/** האם כל המקומות נופלים על אותה קומה (אותו מיקום בתוך הקבוצה) */
export function sameFloor(slots: number[], perGroup = 4): boolean {
    if (slots.length < 2) return true;
    const first = slotRow(slots[0], perGroup);
    return slots.every(s => slotRow(s, perGroup) === first);
}

export function normalizeShopAdsConfig(raw: unknown): ShopAdsConfig {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const int = (v: unknown, fallback: number, lo: number, hi: number) => {
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
    };
    const sites = Array.isArray(o.sites)
        ? o.sites.map(String).filter(id => SHOP_AD_SITES.some(s => s.id === id))
        : SHOP_AD_SITES.map(s => s.id);
    return {
        enabled:   o.enabled === true,
        count:     int(o.count,     SHOP_ADS_DEFAULTS.count,     1, AD_SLOT_COUNT),
        firstSlot: int(o.firstSlot, SHOP_ADS_DEFAULTS.firstSlot, 1, AD_SLOT_COUNT),
        step:      int(o.step,      SHOP_ADS_DEFAULTS.step,      1, AD_SLOT_COUNT),
        sites:     sites.length > 0 ? sites : SHOP_AD_SITES.map(s => s.id),
        syncedAt:  typeof o.syncedAt === 'string' ? o.syncedAt : undefined,
    };
}

// ----- הצבע של כל מוצר בטור -----
// הזוגות נבחרו מהפלטה של הבילדר (adGradient / adGradients בשאר האתרים),
// כדי שגם התרגום למחרוזת CSS באתרים שמצפים לה יימצא בטבלה שלהם.
const GRADIENTS: Array<{ tailwind: string; css: string; id: string }> = [
    { tailwind: 'from-emerald-500 to-teal-700',  css: 'linear-gradient(135deg, #10b981, #0f766e)', id: 'emerald' },
    { tailwind: 'from-amber-500 to-orange-600',  css: 'linear-gradient(135deg, #f59e0b, #ea580c)', id: 'amber'   },
    { tailwind: 'from-blue-600 to-cyan-600',     css: 'linear-gradient(135deg, #2563eb, #0891b2)', id: 'blue'    },
    { tailwind: 'from-purple-600 to-pink-600',   css: 'linear-gradient(135deg, #9333ea, #db2777)', id: 'violet'  },
    { tailwind: 'from-rose-500 to-fuchsia-600',  css: 'linear-gradient(135deg, #f43f5e, #c026d3)', id: 'rose'    },
    { tailwind: 'from-indigo-600 to-blue-600',   css: 'linear-gradient(135deg, #4f46e5, #2563eb)', id: 'ocean'   },
    { tailwind: 'from-green-600 to-emerald-600', css: 'linear-gradient(135deg, #16a34a, #059669)', id: 'emerald' },
    { tailwind: 'from-orange-500 to-red-500',    css: 'linear-gradient(135deg, #f97316, #ef4444)', id: 'sunset'  },
];

/** הגרדיאנט של המוצר ה-i, בצורה שהאתר מצפה לה */
export function shopAdGradient(index: number, format: 'tailwind' | 'css' | 'id'): string {
    const g = GRADIENTS[index % GRADIENTS.length];
    if (format === 'css') return g.css;
    if (format === 'id') return g.id;
    return g.tailwind;
}
