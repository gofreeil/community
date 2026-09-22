// ============================================================
// shopAds.ts - המוצרים החדשים של חנות החירות כפרסומות ברשת
// ------------------------------------------------------------
// ארבעת המוצרים האחרונים שאושרו בחנות (shop.gofreeil.com) עולים
// אוטומטית כפרסומות בטור הימני של *כל* אתרי הרשת, במקומות 3, 7, 11, 15.
//
// למה דווקא המספרים האלה: הטור מציג 16 מקומות, ארבעה בכל פעם
// (1-4, 5-8, 9-12, 13-16), ומחליף אותם כל 7 שניות. 3, 7, 11, 15 הם
// *סדרה* אחת - השלישי בכל רביעייה. כלומר בכל רגע נתון מוצג בדיוק
// כרטיס אחד מהסדרה, תמיד באותו מקום בטור.
//
// יש ארבע סדרות: 1,5,9,13 | 2,6,10,14 | 3,7,11,15 | 4,8,12,16.
//
// מקום תפוס (מפרסם ששילם עליו) לא נדחק: המוצר עובר למקום הפנוי הבא.
//
// הקובץ הזה משותף לשרת (מנוע הסנכרון) וללקוח (מסך הניהול), ולכן אין בו
// שום ייבוא של קוד שרת.
// ============================================================

import { AD_SLOT_COUNT } from './adSlots.js';
import { BAND_MAX, DEFAULT_BAND_HEIGHT } from './adStyle.js';

export const SHOP_URL = 'https://shop.gofreeil.com';

// ============================================================
// כלל ברזל: הכרטיס לעולם לא מתארך
// ------------------------------------------------------------
// כל פרסומות המוצרים חייבות להיות בדיוק באותו גובה, אחרת הן מזיזות
// את המשבצות שמתחתיהן בטור ומוציאות את הסדרה מהשורה.
//
// בכרטיס יש שני אזורים: התמונה, שגובהה קבוע ביחס 144/450, והרצועה
// התחתונה שמתחתיה, שגובהה נגזר ממספר השורות בה. לכן:
//
//   1. הטקסט ברצועה התחתונה נשאר שורה אחת (SHOP_AD_CTA_MAX) - שורה
//      שנייה שם מאריכה את הכרטיס כולו.
//   2. טקסט שצריך יותר מקום מקבל אותו *כלפי מעלה*: הרצועה הצבעונית
//      האלכסונית (bandHeight) מטפסת לתוך אזור התמונה, שגובהו קבוע.
//      זה מרחיב את השטח הצבעוני בלי להוסיף ולו פיקסל אחד לכרטיס.
//
// bandHeightFor() הוא המימוש של סעיף 2, וכל שינוי כאן חייב לשמור עליו.
// ============================================================

/** מידות המשבצת בטור, בפיקסלים - הבסיס לכל חישוב שטח בכרטיס */
export const SLOT_W = 144;
export const SLOT_H = 450;

/**
 * גובה הרצועה הצבעונית (באחוזים מגובה התמונה) שבו תת-הכותרת נכנסת
 * במלואה. ככל שהטקסט ארוך יותר הרצועה מטפסת גבוה יותר - והכרטיס
 * נשאר בדיוק באותו גובה.
 *
 * המספרים נמדדו מה-CSS של הכרטיס: תת-הכותרת ב-0.88rem עם line-height
 * 1.3 (כ-18.5px לשורה), ריפוד של כ-26px למעלה ולמטה, ורוחב שימושי של
 * כ-121px. השורה הראשונה קצרה יותר כי shape-outside מקצר אותה לפי
 * שיפוע האלכסון.
 */
export function bandHeightFor(subtitle: string): number {
    const text = (subtitle ?? '').trim();
    if (!text) return DEFAULT_BAND_HEIGHT;
    const FIRST_LINE_CHARS = 12;
    const CHARS_PER_LINE   = 17;
    const LINE_PX          = 18.5;
    const PADDING_PX       = 26;
    const rest = text.length - FIRST_LINE_CHARS;
    const lines = 1 + (rest > 0 ? Math.ceil(rest / CHARS_PER_LINE) : 0);
    const pct = Math.ceil(((lines * LINE_PX + PADDING_PX) / SLOT_H) * 100);
    return Math.min(BAND_MAX, Math.max(DEFAULT_BAND_HEIGHT, pct));
}

/** ברירות המחדל: 4 מוצרים בסדרה השלישית (3, 7, 11, 15) */
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
    /** הקפיצה בין מוצר למוצר. 4 = סדרה אחת (זו ברירת המחדל) */
    step: number;
    /** מזהי האתרים שאליהם מסנכרנים (ריק = כולם) */
    sites: string[];
    /**
     * עריכות ידניות לכל מוצר, לפי מזהה המוצר בחנות. מה שלא נערך נגזר
     * מהמוצר כרגיל, וכך עריכה נשארת נכונה גם כשהמחיר או התיאור בחנות
     * משתנים. העריכה נדבקת למוצר, לא למקום: המוצר יכול לזוז בטור
     * ולשמור על הניסוח שנתת לו.
     */
    overrides: Record<string, ShopAdOverride>;
    /** חותמת הסנכרון המוצלח האחרון */
    syncedAt?: string;
}

/** עריכה ידנית של כרטיס מוצר. שדה חסר = נגזר מהמוצר אוטומטית. */
export interface ShopAdOverride {
    title?: string;
    subtitle?: string;
    /** הטקסט ברצועה התחתונה */
    cta?: string;
    /** הטקסט שמופיע בריחוף מעל הרצועה */
    hoverText?: string;
    /** מספר הצבע מהפלטה (0-based). חסר = הצבע לפי מקום המוצר ברשימה */
    gradientIndex?: number;
    /** מיקום וזום התמונה במשבצת */
    fit?: { x: number; y: number; z: number };
}

/** האם יש בעריכה משהו בפועל (כדי לא לשמור אובייקטים ריקים) */
export function hasOverride(ov: ShopAdOverride | undefined): boolean {
    if (!ov) return false;
    return Boolean(
        ov.title || ov.subtitle || ov.cta || ov.hoverText ||
        typeof ov.gradientIndex === 'number' || ov.fit,
    );
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

/** כמה מקומות מוצגים יחד בטור לפני שהוא מחליף */
export const SLOTS_PER_VIEW = 4;
/** כמה סדרות יש בלוח (16 מקומות, ארבעה בכל תצוגה) */
export const SERIES_COUNT = SLOTS_PER_VIEW;
/** כמה מקומות יש בכל סדרה */
export const SLOTS_PER_SERIES = AD_SLOT_COUNT / SLOTS_PER_VIEW;

/** הסדרה שאליה שייך המקום - 1..4 (3 ו-7 ו-11 ו-15 הם סדרה 3) */
export function seriesOf(slot: number): number {
    return ((slot - 1) % SLOTS_PER_VIEW) + 1;
}

/** באיזו תצוגה מתוך ארבע המקום נראה - 1..4 (7 נראה בתצוגה השנייה) */
export function viewOf(slot: number): number {
    return Math.floor((slot - 1) / SLOTS_PER_VIEW) + 1;
}

/** כל המקומות של סדרה: 3 -> [3, 7, 11, 15] */
export function seriesSlots(series: number): number[] {
    return Array.from({ length: SLOTS_PER_SERIES }, (_, i) => series + i * SLOTS_PER_VIEW);
}

/** האם כל המקומות שייכים לסדרה אחת */
export function sameSeries(slots: number[]): boolean {
    if (slots.length < 2) return true;
    const first = seriesOf(slots[0]);
    return slots.every(s => seriesOf(s) === first);
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
        overrides: normalizeOverrides(o.overrides),
        syncedAt:  typeof o.syncedAt === 'string' ? o.syncedAt : undefined,
    };
}

/**
 * תקרת הטקסט ברצועה התחתונה. זה השדה היחיד בכרטיס שמשפיע על גובהו
 * (התמונה מעליו ביחס קבוע), ולכן טקסט שגולש לשורה שנייה מגביה את
 * הכרטיס ומוציא אותו מהשורה מול האחרים.
 */
export const SHOP_AD_CTA_MAX = 22;

/** גבולות הזום של התמונה במשבצת - כמו בבילדר של הפרסומות */
export const SHOP_AD_ZOOM_MIN = 0.4;
export const SHOP_AD_ZOOM_MAX = 2;

export function normalizeOverride(raw: unknown): ShopAdOverride {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const str = (v: unknown, max: number) => {
        const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
        return s ? s.slice(0, max) : undefined;
    };
    const clamp = (v: unknown, lo: number, hi: number, round = false) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return undefined;
        const c = Math.min(hi, Math.max(lo, n));
        return round ? Math.round(c) : c;
    };
    const rawFit = (o.fit && typeof o.fit === 'object' ? o.fit : null) as Record<string, unknown> | null;
    const fit = rawFit
        ? {
            x: clamp(rawFit.x, 0, 100) ?? 50,
            y: clamp(rawFit.y, 0, 100) ?? 45,
            z: clamp(rawFit.z, SHOP_AD_ZOOM_MIN, SHOP_AD_ZOOM_MAX) ?? 0.6,
          }
        : undefined;
    const out: ShopAdOverride = {
        title:     str(o.title, 42),
        subtitle:  str(o.subtitle, 60),
        cta:       str(o.cta, SHOP_AD_CTA_MAX),
        hoverText: str(o.hoverText, 160),
        gradientIndex: clamp(o.gradientIndex, 0, GRADIENT_COUNT - 1, true),
        fit,
    };
    // מפתחות ריקים לא נשמרים - ככה "אפס" באמת מחזיר לברירת המחדל
    for (const k of Object.keys(out) as Array<keyof ShopAdOverride>) {
        if (out[k] === undefined) delete out[k];
    }
    return out;
}

function normalizeOverrides(raw: unknown): Record<string, ShopAdOverride> {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, ShopAdOverride> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        const ov = normalizeOverride(value);
        if (hasOverride(ov)) out[key] = ov;
    }
    return out;
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

/** כמה צבעים יש בפלטה - לבורר הצבע במסך הניהול */
export const GRADIENT_COUNT = GRADIENTS.length;

/** הגרדיאנט של המוצר ה-i, בצורה שהאתר מצפה לה */
export function shopAdGradient(index: number, format: 'tailwind' | 'css' | 'id'): string {
    const g = GRADIENTS[((index % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length];
    if (format === 'css') return g.css;
    if (format === 'id') return g.id;
    return g.tailwind;
}
