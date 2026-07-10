// ============================================================
// serviceTypes.ts - קטלוג "שירות ציבורי" + לוגואים למפה
//
// המשתמש בוחר בטופס "שירות ציבורי" (קטגוריית attractions) מהו סוג
// השירות - עירייה, דואר, בנק (על סוגיו), מקווה, קופת חולים, בית ספר,
// משטרה וכו'. לפי הבחירה מוצג על המפה הלוגו/סמל המתאים במקום האימוג'י.
//
// הסמלים כאן הם *איקונים מקוריים פונקציונליים* (בניין עם עמודים לבנק,
// מעטפה לדואר, גלי מים למקווה, צלב לקופת חולים...) - לא שכפול של לוגו
// מסחרי/מוגן. כל סמל נבנה כ-SVG עגול מלא-שוליים ומקודד כ-data URI, כך
// שהוא נטען ללא בקשת רשת חיצונית ועובד בכל מקום שבו מוצגת תמונה על המפה
// (extra_fields.map_image / <img>).
//
// רוצים לוגו אמיתי לסניף מסוים? מעלים תמונה בשדה "לוגו על המפה" בטופס -
// היא גוברת על סמל השירות (ראו JerusalemMap: map_image ידני > service_type).
// ============================================================

export interface ServiceType {
    /** מזהה יציב הנשמר ב-extra_fields.service_type */
    id: string;
    /** שם לתצוגה (עברית) */
    label: string;
    /** מפתח לתוך GLYPHS - צורת הסמל */
    glyph: string;
    /** צבע רקע העיגול (hex) - גם צבע מסגרת הפין על המפה */
    color: string;
    /** מילות חיפוש נוספות (לא חובה) */
    aliases?: string[];
}

export interface ServiceGroup {
    /** כותרת הקבוצה בבורר */
    group: string;
    items: ServiceType[];
}

// ------------------------------------------------------------
// ספריית סמלים - כל סמל הוא markup פנימי של SVG (0..48), לבן על הרקע
// הצבעוני. האסימון {{c}} מוחלף בצבע הרקע (לפרטים שצריכים ניגוד).
// ------------------------------------------------------------
const GLYPHS: Record<string, string> = {
    // עירייה / מועצה - בניין עם עמודים + דגל
    municipality: `
        <rect x="23.2" y="5" width="1.6" height="6"/>
        <path d="M24.8 5.5 L30 7 L24.8 8.5 Z"/>
        <polygon points="24,10 39,17.5 9,17.5"/>
        <rect x="10" y="18.5" width="28" height="2.2"/>
        <rect x="12" y="21.5" width="2.8" height="10.5"/>
        <rect x="18.6" y="21.5" width="2.8" height="10.5"/>
        <rect x="25.2" y="21.5" width="2.8" height="10.5"/>
        <rect x="31.4" y="21.5" width="2.8" height="10.5"/>
        <rect x="9" y="33" width="30" height="2.8" rx="1"/>`,

    // בנק - בניין קלאסי עם עמודים (סמל הבנק המקובל)
    bank: `
        <polygon points="24,10 38,16.5 10,16.5"/>
        <rect x="11" y="17.5" width="26" height="2"/>
        <rect x="13" y="20.5" width="2.6" height="11"/>
        <rect x="19" y="20.5" width="2.6" height="11"/>
        <rect x="26.4" y="20.5" width="2.6" height="11"/>
        <rect x="32.4" y="20.5" width="2.6" height="11"/>
        <rect x="10" y="32.5" width="28" height="2.8" rx="1"/>`,

    // בית משפט - מאזני צדק
    courthouse: `
        <circle cx="24" cy="10.5" r="1.9"/>
        <rect x="23" y="12" width="2" height="21.5"/>
        <rect x="15" y="33.5" width="18" height="2.6" rx="1"/>
        <path d="M11 16 H37" fill="none" stroke="#fff" stroke-width="2.2"/>
        <path d="M24 12.5 L11 16 M24 12.5 L37 16" fill="none" stroke="#fff" stroke-width="1.4"/>
        <path d="M11 16 L7 23 a4.6 4.6 0 0 0 8 0 Z"/>
        <path d="M37 16 L33 23 a4.6 4.6 0 0 0 8 0 Z"/>`,

    // דואר - מעטפה
    envelope: `
        <g fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round">
            <rect x="9" y="14" width="30" height="20" rx="2.6"/>
            <path d="M10 16 L24 26 L38 16"/>
        </g>`,

    // כספומט - כרטיס
    card: `
        <rect x="8" y="15" width="32" height="20" rx="3"/>
        <rect x="8" y="19.5" width="32" height="4.2" fill="{{c}}"/>
        <rect x="12" y="28" width="10" height="2.6" rx="1" fill="{{c}}"/>
        <rect x="25" y="28" width="6" height="2.6" rx="1" fill="{{c}}"/>`,

    // מקווה - טיפה + גלי מים
    water: `
        <path d="M24 8 C 24 8 31 17 31 22 A7 7 0 0 1 17 22 C 17 17 24 8 24 8 Z"/>
        <g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round">
            <path d="M10 31 q3.5 -3 7 0 t7 0 t7 0"/>
            <path d="M10 36 q3.5 -3 7 0 t7 0 t7 0"/>
        </g>`,

    // בית כנסת / מגן דוד אדום - מגן דוד
    star: `
        <g fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round">
            <polygon points="24,9 33.5,25.5 14.5,25.5"/>
            <polygon points="24,31 14.5,14.5 33.5,14.5"/>
        </g>`,

    // מועצה דתית / כשרות - לוחות הברית
    tablets: `
        <path d="M12.5 16 a5.5 5.5 0 0 1 11 0 v15.5 a1.5 1.5 0 0 1 -1.5 1.5 h-8 a1.5 1.5 0 0 1 -1.5 -1.5 Z"/>
        <path d="M24.5 16 a5.5 5.5 0 0 1 11 0 v15.5 a1.5 1.5 0 0 1 -1.5 1.5 h-8 a1.5 1.5 0 0 1 -1.5 -1.5 Z"/>`,

    // קופות חולים / מרפאה - צלב רפואי
    cross: `<path d="M20.5 12 h7 v6 h6 v7 h-6 v6 h-7 v-6 h-6 v-7 h6 Z"/>`,

    // בית מרקחת - כדור/קפסולה
    capsule: `
        <g transform="rotate(-40 24 24)">
            <rect x="12" y="19.5" width="24" height="9" rx="4.5"/>
            <rect x="23.6" y="19.5" width="1.8" height="9" fill="{{c}}"/>
        </g>`,

    // בית חולים - בניין + צלב
    hospital: `
        <rect x="12" y="13" width="24" height="22" rx="2.5"/>
        <path d="M21.5 17 h5 v3.5 h3.5 v5 h-3.5 v3.5 h-5 v-3.5 h-3.5 v-5 h3.5 Z" fill="{{c}}"/>
        <rect x="20" y="30" width="8" height="5" fill="{{c}}"/>`,

    // טיפת חלב - בקבוק תינוק
    bottle: `
        <rect x="20.5" y="9" width="7" height="4" rx="1.5"/>
        <rect x="20.5" y="13" width="7" height="2.4"/>
        <path d="M19 15.5 h10 v16.5 a3 3 0 0 1 -3 3 h-4 a3 3 0 0 1 -3 -3 Z"/>
        <rect x="19" y="19.5" width="10" height="2" fill="{{c}}"/>
        <rect x="19" y="23.5" width="10" height="2" fill="{{c}}"/>`,

    // מרפאת שיניים - שן
    tooth: `<path d="M15 11 C 11 11 10.5 17 12.5 25 C 13.5 31 15 36 17 36 C 19 36 19 30.5 24 30.5 C 29 30.5 29 36 31 36 C 33 36 34.5 31 35.5 25 C 37.5 17 37 11 33 11 C 29 11 26.5 14 24 14 C 21.5 14 19 11 15 11 Z"/>`,

    // בית ספר / מכללה - כובע סיום
    cap: `
        <path d="M24 12 L40 18 L24 24 L8 18 Z"/>
        <path d="M14 20.5 V27 c0 3.2 20 3.2 20 0 V20.5" fill="none" stroke="#fff" stroke-width="2.6"/>
        <path d="M40 18 V27" fill="none" stroke="#fff" stroke-width="1.8"/>
        <circle cx="40" cy="28.5" r="1.9"/>`,

    // גן ילדים - קוביות משחק
    blocks: `
        <rect x="11" y="26" width="9.5" height="9.5" rx="1.6"/>
        <rect x="22" y="26" width="9.5" height="9.5" rx="1.6"/>
        <rect x="16.5" y="15.5" width="9.5" height="9.5" rx="1.6"/>`,

    // ספרייה / תלמוד תורה / ישיבה - ספר פתוח
    book: `
        <path d="M24 16 C 20 13 13 13 9 15 V33 C 13 31 20 31 24 34 C 28 31 35 31 39 33 V15 C 35 13 28 13 24 16 Z"/>
        <path d="M24 16 V34" fill="none" stroke="{{c}}" stroke-width="1.6"/>`,

    // משטרה - מגן עם כוכב
    shield_star: `
        <path d="M24 9 L37 13 V22 C 37 30 31 34.5 24 37.5 C 17 34.5 11 30 11 22 V13 Z"/>
        <polygon points="24,16 26,21 31,21 27,24.5 28.5,29.5 24,26.5 19.5,29.5 21,24.5 17,21 22,21" fill="{{c}}"/>`,

    // כבאות - להבה
    flame: `<path d="M24 7 C 27 14 33 16 31 24 A7.5 7.5 0 0 1 16 24 C 15 19 19 18 19 13 C 21.5 15.5 21 11 24 7 Z"/>`,

    // מקלט / מרחב מוגן - בית עם קירות עבים
    shelter: `
        <path d="M24 11 L38 23 H33 V35 H15 V23 H10 Z"/>
        <rect x="21" y="27" width="6" height="8" fill="{{c}}"/>`,

    // לשכת תעסוקה - תיק עבודה
    briefcase: `
        <path d="M18 17 v-2.5 a2.5 2.5 0 0 1 2.5 -2.5 h7 a2.5 2.5 0 0 1 2.5 2.5 V17" fill="none" stroke="#fff" stroke-width="2.6"/>
        <rect x="9" y="17" width="30" height="18" rx="2.6"/>
        <rect x="9" y="23.5" width="30" height="2.4" fill="{{c}}"/>
        <rect x="21.5" y="22" width="5" height="5" rx="1" fill="{{c}}"/>`,

    // משרד הפנים / רשות האוכלוסין - תעודת זהות
    id_card: `
        <rect x="8" y="14" width="32" height="20" rx="2.6"/>
        <circle cx="17" cy="22" r="3.6" fill="{{c}}"/>
        <path d="M11.5 30 c0 -4 11 -4 11 0 Z" fill="{{c}}"/>
        <rect x="25" y="19" width="10" height="2.4" rx="1" fill="{{c}}"/>
        <rect x="25" y="24" width="10" height="2.4" rx="1" fill="{{c}}"/>
        <rect x="25" y="29" width="7" height="2.4" rx="1" fill="{{c}}"/>`,

    // ביטוח לאומי - מגן עם דמות
    shield_person: `
        <path d="M24 9 L37 13 V22 C 37 30 31 34.5 24 37.5 C 17 34.5 11 30 11 22 V13 Z"/>
        <circle cx="24" cy="20" r="3.4" fill="{{c}}"/>
        <path d="M17.5 30 c0 -5 13 -5 13 0 Z" fill="{{c}}"/>`,

    // רשות המסים - ערמת מטבעות
    coins: `
        <ellipse cx="24" cy="15" rx="10" ry="4"/>
        <path d="M14 15 v6 c0 2.2 4.5 4 10 4 s10 -1.8 10 -4 v-6" fill="none" stroke="#fff" stroke-width="2.4"/>
        <path d="M14 21 v6 c0 2.2 4.5 4 10 4 s10 -1.8 10 -4 v-6" fill="none" stroke="#fff" stroke-width="2.4"/>`,

    // מתנ"ס / מרכז קהילתי - קבוצת אנשים
    people: `
        <circle cx="17" cy="18" r="4"/>
        <circle cx="31" cy="18" r="4"/>
        <path d="M9 33 c0 -6 5.5 -8.5 8 -8.5 s8 2.5 8 8.5 Z"/>
        <path d="M23 33 c0 -6 5.5 -8.5 8 -8.5 s8 2.5 8 8.5 Z"/>`,

    // פארק / גן ציבורי - עץ
    tree: `
        <circle cx="24" cy="19" r="10"/>
        <rect x="22.4" y="27" width="3.2" height="10" rx="1"/>`,

    // רווחה - לב
    heart: `<path d="M24 34 C 11 25.5 12 15.5 19 15.5 C 22 15.5 23.4 18 24 19.5 C 24.6 18 26 15.5 29 15.5 C 36 15.5 37 25.5 24 34 Z"/>`,

    // וטרינר - כף חתול/כלב
    paw: `
        <ellipse cx="24" cy="29" rx="7.5" ry="6"/>
        <ellipse cx="14.5" cy="21" rx="3.2" ry="4"/>
        <ellipse cx="20" cy="16.5" rx="3.2" ry="4.2"/>
        <ellipse cx="28" cy="16.5" rx="3.2" ry="4.2"/>
        <ellipse cx="33.5" cy="21" rx="3.2" ry="4"/>`,

    // חברת חשמל - ברק
    bolt: `<path d="M26 7 L13 27 H21 L19 41 L34 20 H25 Z"/>`,
};

// ------------------------------------------------------------
// הקטלוג - מקובץ לפי נושא (סדר הקבוצות = סדר התצוגה בבורר)
// ------------------------------------------------------------
export const SERVICE_GROUPS: ServiceGroup[] = [
    {
        group: 'רשויות ומינהל ציבורי',
        items: [
            { id: 'municipality',       label: 'עירייה / מועצה מקומית', glyph: 'municipality',  color: '#4f46e5', aliases: ['רשות מקומית', 'מועצה אזורית', 'מוקד 106'] },
            { id: 'interior_ministry',  label: 'משרד הפנים / רשות האוכלוסין', glyph: 'id_card', color: '#475569', aliases: ['תעודת זהות', 'דרכון', 'לשכת מרשם'] },
            { id: 'national_insurance', label: 'ביטוח לאומי',           glyph: 'shield_person', color: '#0d9488' },
            { id: 'employment',         label: 'לשכת התעסוקה',          glyph: 'briefcase',     color: '#2563eb', aliases: ['שירות התעסוקה'] },
            { id: 'tax_authority',      label: 'רשות המסים',            glyph: 'coins',         color: '#15803d', aliases: ['מס הכנסה', 'מע"מ'] },
            { id: 'courthouse',         label: 'בית משפט',              glyph: 'courthouse',    color: '#64748b' },
        ],
    },
    {
        group: 'דואר ובנקאות',
        items: [
            { id: 'post',           label: 'דואר ישראל',        glyph: 'envelope', color: '#dc2626', aliases: ['סניף דואר', 'חבילה', 'דואר'] },
            { id: 'postal_bank',    label: 'בנק הדואר',          glyph: 'bank',     color: '#b91c1c' },
            { id: 'bank',           label: 'בנק (כללי)',         glyph: 'bank',     color: '#166534', aliases: ['סניף בנק'] },
            { id: 'bank_hapoalim',  label: 'בנק הפועלים',        glyph: 'bank',     color: '#e11d48' },
            { id: 'bank_leumi',     label: 'בנק לאומי',          glyph: 'bank',     color: '#1d4ed8' },
            { id: 'bank_discount',  label: 'בנק דיסקונט',        glyph: 'bank',     color: '#16a34a' },
            { id: 'bank_mizrahi',   label: 'בנק מזרחי טפחות',    glyph: 'bank',     color: '#ea580c' },
            { id: 'bank_beinleumi', label: 'הבנק הבינלאומי',     glyph: 'bank',     color: '#0284c7' },
            { id: 'bank_mercantile',label: 'בנק מרכנתיל',        glyph: 'bank',     color: '#0d9488' },
            { id: 'bank_yahav',     label: 'בנק יהב',            glyph: 'bank',     color: '#7c3aed' },
            { id: 'bank_jerusalem', label: 'בנק ירושלים',        glyph: 'bank',     color: '#ca8a04' },
            { id: 'bank_other',     label: 'בנק אחר',            glyph: 'bank',     color: '#334155' },
            { id: 'atm',            label: 'כספומט',             glyph: 'card',     color: '#334155', aliases: ['מכשיר כספי'] },
        ],
    },
    {
        group: 'דת ומקוואות',
        items: [
            { id: 'mikveh',            label: 'מקווה',               glyph: 'water',   color: '#0891b2', aliases: ['מקוה', 'טבילה'] },
            { id: 'synagogue',         label: 'בית כנסת',            glyph: 'star',    color: '#2563eb', aliases: ['בהכ"נ', 'מניין'] },
            { id: 'religious_council', label: 'מועצה דתית / רבנות',  glyph: 'tablets', color: '#b45309', aliases: ['רבנות'] },
            { id: 'kashrut',           label: 'השגחת כשרות',         glyph: 'tablets', color: '#a16207' },
        ],
    },
    {
        group: 'בריאות',
        items: [
            { id: 'clalit',       label: 'כללית',              glyph: 'cross',   color: '#16a34a', aliases: ['קופת חולים כללית'] },
            { id: 'maccabi',      label: 'מכבי',               glyph: 'cross',   color: '#2563eb', aliases: ['מכבי שירותי בריאות'] },
            { id: 'meuhedet',     label: 'מאוחדת',             glyph: 'cross',   color: '#7c3aed', aliases: ['קופת חולים מאוחדת'] },
            { id: 'leumit',       label: 'לאומית',             glyph: 'cross',   color: '#ea580c', aliases: ['לאומית שירותי בריאות'] },
            { id: 'clinic',       label: 'מרפאה / קופת חולים', glyph: 'cross',   color: '#0ea5e9' },
            { id: 'pharmacy',     label: 'בית מרקחת',          glyph: 'capsule', color: '#0d9488', aliases: ['סופר פארם', 'ניו פארם'] },
            { id: 'hospital',     label: 'בית חולים',          glyph: 'hospital',color: '#dc2626' },
            { id: 'mada',         label: 'מגן דוד אדום',       glyph: 'star',    color: '#dc2626', aliases: ['מד"א', 'אמבולנס'] },
            { id: 'tipat_chalav', label: 'טיפת חלב',           glyph: 'bottle',  color: '#db2777' },
            { id: 'dentist',      label: 'מרפאת שיניים',       glyph: 'tooth',   color: '#0891b2' },
        ],
    },
    {
        group: 'חינוך',
        items: [
            { id: 'school',       label: 'בית ספר',            glyph: 'cap',    color: '#2563eb' },
            { id: 'kindergarten', label: 'גן ילדים',           glyph: 'blocks', color: '#ea580c', aliases: ['גן', 'מעון'] },
            { id: 'talmud_torah', label: 'תלמוד תורה / חיידר',  glyph: 'book',   color: '#92400e' },
            { id: 'yeshiva',      label: 'ישיבה / כולל',       glyph: 'book',   color: '#4338ca' },
            { id: 'library',      label: 'ספרייה',             glyph: 'book',   color: '#0d9488' },
            { id: 'college',      label: 'מכללה / אוניברסיטה', glyph: 'cap',    color: '#7c3aed' },
        ],
    },
    {
        group: 'חירום, רווחה וקהילה',
        items: [
            { id: 'police',           label: 'משטרה',              glyph: 'shield_star', color: '#1d4ed8', aliases: ['תחנת משטרה', 'מוקד 100'] },
            { id: 'fire',             label: 'כבאות והצלה',        glyph: 'flame',       color: '#dc2626', aliases: ['מכבי אש', 'מוקד 102'] },
            { id: 'shelter',          label: 'מקלט / מרחב מוגן',    glyph: 'shelter',     color: '#475569', aliases: ['ממ"ד', 'מקלט ציבורי'] },
            { id: 'welfare',          label: 'לשכת רווחה',         glyph: 'heart',       color: '#db2777', aliases: ['שירותים חברתיים'] },
            { id: 'community_center', label: 'מתנ"ס / מרכז קהילתי', glyph: 'people',      color: '#7c3aed' },
            { id: 'park',             label: 'גן ציבורי / פארק',   glyph: 'tree',        color: '#16a34a', aliases: ['גינה'] },
            { id: 'veterinary',       label: 'וטרינר עירוני',      glyph: 'paw',         color: '#b45309' },
            { id: 'electric',         label: 'חברת חשמל',          glyph: 'bolt',        color: '#ca8a04', aliases: ['חשמל'] },
        ],
    },
];

// ------------------------------------------------------------
// גישה מהירה (מזהה -> ServiceType) ורשימה שטוחה
// ------------------------------------------------------------
export const ALL_SERVICE_TYPES: ServiceType[] = SERVICE_GROUPS.flatMap(g => g.items);

const BY_ID: Record<string, ServiceType> = Object.fromEntries(
    ALL_SERVICE_TYPES.map(s => [s.id, s]),
);

export function getServiceType(id: string | null | undefined): ServiceType | undefined {
    if (!id) return undefined;
    return BY_ID[id];
}

// ------------------------------------------------------------
// בניית ה-SVG וה-data URI (עם מטמון כדי לא לבנות מחדש בכל render)
// ------------------------------------------------------------
function buildSvg(item: ServiceType): string {
    const glyph = GLYPHS[item.glyph]?.replace(/\{\{c\}\}/g, item.color) ?? '';
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">` +
        `<circle cx="24" cy="24" r="24" fill="${item.color}"/>` +
        `<circle cx="24" cy="24" r="22.5" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="2"/>` +
        `<g fill="#ffffff" stroke-linejoin="round" stroke-linecap="round">${glyph}</g>` +
        `</svg>`
    );
}

const URI_CACHE: Record<string, string> = {};

/** מחזיר data URI (SVG) של סמל השירות, או '' אם המזהה לא מוכר */
export function serviceLogoDataUri(id: string | null | undefined): string {
    const item = getServiceType(id);
    if (!item) return '';
    if (URI_CACHE[item.id]) return URI_CACHE[item.id];
    const uri = 'data:image/svg+xml,' + encodeURIComponent(buildSvg(item)).replace(/\s{2,}/g, ' ');
    URI_CACHE[item.id] = uri;
    return uri;
}

/** צבע הרקע/מסגרת של סמל השירות (או '' אם לא מוכר) */
export function serviceColor(id: string | null | undefined): string {
    return getServiceType(id)?.color ?? '';
}

/** שם השירות לתצוגה (או '' אם לא מוכר) */
export function serviceLabel(id: string | null | undefined): string {
    return getServiceType(id)?.label ?? '';
}

/**
 * הלוגו למפה לפי extra_fields של הפריט (או מזהה ישיר).
 * מחזיר data URI של סמל השירות, או '' אם אין service_type מוכר.
 */
export function logoForService(extraOrId: Record<string, unknown> | string | null | undefined): string {
    if (extraOrId == null) return '';
    const id = typeof extraOrId === 'string' ? extraOrId : (extraOrId.service_type as string | undefined);
    return serviceLogoDataUri(id);
}
