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
        syncedAt:  typeof o.syncedAt === 'string' ? o.syncedAt : undefined,
    };
}

/**
 * תקרת הטקסט ברצועה התחתונה. זה השדה היחיד בכרטיס שמשפיע על גובהו
 * (התמונה מעליו ביחס קבוע), ולכן טקסט שגולש לשורה שנייה מגביה את
 * הכרטיס ומוציא אותו מהשורה מול האחרים.
 */
export const SHOP_AD_CTA_MAX = 22;

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

/**
 * כל הפלטה של הבילדר (22 צבעים) בתרגום למחרוזת CSS. פרסומת שנערכה
 * בבילדר נושאת זוג מחלקות Tailwind, ורוב אתרי הרשת מצפים למחרוזת CSS
 * מלאה - בלי התרגום הזה הרצועה שלהם הייתה נשארת בלי צבע. זו אותה
 * טבלה שקיימת ב-adGradient.ts של "ועדי שכונות".
 */
const BUILDER_TAILWIND_TO_CSS: Record<string, string> = {
    'from-amber-500 to-orange-600':   'linear-gradient(135deg, #f59e0b, #ea580c)',
    'from-orange-500 to-red-500':     'linear-gradient(135deg, #f97316, #ef4444)',
    'from-yellow-400 to-amber-500':   'linear-gradient(135deg, #facc15, #f59e0b)',
    'from-red-600 to-pink-600':       'linear-gradient(135deg, #dc2626, #db2777)',
    'from-rose-500 to-fuchsia-600':   'linear-gradient(135deg, #f43f5e, #c026d3)',
    'from-rose-700 to-red-900':       'linear-gradient(135deg, #be123c, #7f1d1d)',
    'from-fuchsia-500 to-purple-600': 'linear-gradient(135deg, #d946ef, #9333ea)',
    'from-purple-600 to-pink-600':    'linear-gradient(135deg, #9333ea, #db2777)',
    'from-violet-600 to-indigo-700':  'linear-gradient(135deg, #7c3aed, #4338ca)',
    'from-indigo-600 to-blue-600':    'linear-gradient(135deg, #4f46e5, #2563eb)',
    'from-blue-600 to-cyan-600':      'linear-gradient(135deg, #2563eb, #0891b2)',
    'from-sky-400 to-blue-500':       'linear-gradient(135deg, #38bdf8, #3b82f6)',
    'from-teal-500 to-cyan-600':      'linear-gradient(135deg, #14b8a6, #0891b2)',
    'from-emerald-500 to-teal-700':   'linear-gradient(135deg, #10b981, #0f766e)',
    'from-green-600 to-emerald-600':  'linear-gradient(135deg, #16a34a, #059669)',
    'from-lime-400 to-green-500':     'linear-gradient(135deg, #a3e635, #22c55e)',
    'from-slate-500 to-gray-700':     'linear-gradient(135deg, #64748b, #374151)',
    'from-gray-800 to-slate-900':     'linear-gradient(135deg, #1f2937, #0f172a)',
    'from-orange-300 to-pink-400':    'linear-gradient(135deg, #fdba74, #f472b6)',
    'from-emerald-300 to-teal-400':   'linear-gradient(135deg, #6ee7b7, #2dd4bf)',
    'from-yellow-500 to-amber-700':   'linear-gradient(135deg, #eab308, #b45309)',
    'from-slate-700 to-blue-900':     'linear-gradient(135deg, #334155, #1e3a8a)',
};

/** מזהה הצבע באתר הדירוג הציבורי, לפי משפחת הצבע של מחלקת ה-from */
const FAMILY_TO_RATING_ID: Record<string, string> = {
    amber: 'amber', yellow: 'gold', orange: 'sunset', red: 'rose', rose: 'rose',
    fuchsia: 'violet', purple: 'violet', violet: 'violet', indigo: 'ocean',
    blue: 'blue', sky: 'cyan', cyan: 'cyan', teal: 'cyan', emerald: 'emerald',
    green: 'emerald', lime: 'emerald', slate: 'slate', gray: 'slate',
};

/**
 * גרדיאנט ששמור על פרסומת (בצורת Tailwind, כפי שהבילדר שומר) בצורה
 * שאתר היעד מצפה לה. ערך לא מוכר נופל לברירת מחדל צבעונית, לא לשקוף.
 */
export function convertGradient(value: string, format: 'tailwind' | 'css' | 'id'): string {
    const raw = (value ?? '').trim();
    if (format === 'tailwind') return raw || shopAdGradient(0, 'tailwind');
    if (/^(linear|radial|conic)-gradient\(/.test(raw)) {
        return format === 'css' ? raw : shopAdGradient(0, 'id');
    }
    const pair = raw.split(/\s+/).filter(c => /^(from|to)-/.test(c)).join(' ');
    if (format === 'css') return BUILDER_TAILWIND_TO_CSS[pair] ?? shopAdGradient(0, 'css');
    const family = /^from-([a-z]+)-/.exec(pair)?.[1] ?? '';
    return FAMILY_TO_RATING_ID[family] ?? shopAdGradient(0, 'id');
}

/** הגרדיאנט של המוצר ה-i, בצורה שהאתר מצפה לה */
export function shopAdGradient(index: number, format: 'tailwind' | 'css' | 'id'): string {
    const g = GRADIENTS[((index % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length];
    if (format === 'css') return g.css;
    if (format === 'id') return g.id;
    return g.tailwind;
}
