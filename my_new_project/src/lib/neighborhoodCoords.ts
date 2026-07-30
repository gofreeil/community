// קואורדינטות אמיתיות (lat/lng) לערים ושכונות בישראל.
// משמש את המפה (Leaflet) כדי לקבע את המרקרים על הקרקע ולא כשכבת CSS מעל iframe.
//
// פילוסופיה: שכונות נפוצות בערים גדולות מקבלות נקודה מדויקת.
// אם פריט בשכונה שלא מופיעה כאן - נחזור לעיר. אם גם זה לא - לירושלים כברירת מחדל.

import { citiesAndNeighborhoods, canonicalCity, normalizeNeighborhoodName } from './neighborhoodsData';

export type Coord = [number, number]; // [lat, lng]

// ---- מרכזי ערים (fallback אם השכונה לא ידועה) ----
export const cityCenters: Record<string, Coord> = {
    'אופקים':           [31.3142, 34.6206],
    'אפרת':              [31.6535, 35.1456],
    'אור יהודה':        [32.0306, 34.8553],
    'אור עקיבא':        [32.5103, 34.9183],
    'אילת':              [29.5577, 34.9519],
    'אלעד':              [32.0531, 34.9558],
    'אריאל':             [32.1056, 35.1739],
    'אשדוד':             [31.8014, 34.6435],
    'אשקלון':            [31.6688, 34.5715],
    'באר יעקב':         [31.9469, 34.8364],
    'באר שבע':          [31.2520, 34.7915],
    'בית שאן':          [32.4969, 35.4983],
    'בית שמש':          [31.7458, 34.9889],
    'בני ברק':          [32.0830, 34.8330],
    'בת ים':             [32.0167, 34.7456],
    'גבעת שמואל':       [32.0772, 34.8444],
    'גבעתיים':           [32.0708, 34.8089],
    'גדרה':              [31.8133, 34.7783],
    'דימונה':            [31.0700, 35.0331],
    'הוד השרון':        [32.1500, 34.8917],
    'הרצליה':            [32.1664, 34.8439],
    'חדרה':              [32.44074, 34.94011],
    'חולון':             [32.0117, 34.7728],
    'חיפה':              [32.81912, 34.99839],
    'טבריה':             [32.7959, 35.5311],
    'טייבה':             [32.2667, 35.0070],
    'יבנה':              [31.8783, 34.7397],
    'יהוד-מונוסון':     [32.0331, 34.8853],
    'יקנעם עילית':      [32.64806, 35.09435],
    'ירושלים':           [31.7683, 35.2137],
    'כפר סבא':          [32.1750, 34.9070],
    'כפר תפוח':          [32.1203, 35.2503],
    'לוד':               [31.9514, 34.8881],
    'מגדל העמק':        [32.6750, 35.2350],
    'מודיעין-מכבים-רעות':[31.90857, 35.00693],
    'מודיעין עילית':    [31.9319, 35.0397],
    'מעלה אדומים':      [31.7714, 35.2986],
    'נהריה':             [33.0089, 35.0978],
    'נס ציונה':         [31.9303, 34.7956],
    'נצרת':              [32.7022, 35.2978],
    'נוף הגליל':        [32.7022, 35.3206], // לשעבר נצרת עילית (ראה CITY_ALIASES)
    'נתיבות':            [31.4203, 34.5908],
    'נתניה':             [32.3215, 34.8533],
    'עכו':               [32.9281, 35.0822],
    'עפולה':             [32.6075, 35.2869],
    'פתח תקווה':        [32.0878, 34.8881],
    'צפת':               [32.9650, 35.4961],
    'קרית אונו':        [32.0644, 34.8553],
    'קרית אתא':         [32.8083, 35.1011],
    'קרית ביאליק':      [32.8281, 35.0867],
    'קרית גת':           [31.6100, 34.7642],
    'קרית מוצקין':      [32.8367, 35.0789],
    'קרית שמונה':       [33.2075, 35.5697],
    'ראש העין':         [32.0961, 34.9519],
    'ראשון לציון':       [31.9647, 34.8044],
    'רהט':               [31.3925, 34.7544],
    'רחובות':            [31.8928, 34.8113],
    'רמלה':              [31.9281, 34.8703],
    'רמת גן':            [32.0683, 34.8244],
    'רמת השרון':        [32.1467, 34.8456],
    'רעננה':             [32.1808, 34.8708],
    'שדרות':             [31.5253, 34.5953],
    // מפתחות הטבלה חייבים להיות שם העיר הקנוני מ-citiesData, אחרת החיפוש
    // (שמנרמל דרך canonicalCity) מחמיץ אותם ונופל לברירת המחדל בירושלים.
    'תל אביב יפו':       [32.0853, 34.7818],
    'תל מונד':           [32.2536, 34.9197],
};

// ---- שכונות מרכזיות בערים גדולות (קואורדינטות מדויקות) ----
export const neighborhoodCenters: Record<string, Coord> = {
    // ---- אפרת ----
    'הדגן':         [31.6571, 35.1517],
    'הזית':         [31.6555, 35.1481],
    'הגפן':         [31.6517, 35.1450],
    'הרימון':       [31.6494, 35.1431],
    'התאנה':        [31.6541, 35.1422],
    'התמר':         [31.6478, 35.1408],
    'הדקל':         [31.6589, 35.1500],
    'האלון':        [31.6533, 35.1389],

    // ---- ירושלים ----
    'קרית משה':    [31.7851, 35.1944],
    'רחביה':        [31.7748, 35.21208],
    'גבעת שאול':   [31.79112, 35.1931],
    // שם שקיים גם בעיר אחרת (רמות גם בבאר שבע) חייב מפתח "עיר|שכונה", אחרת
    // חיפוש לפי שם בלבד היה מציב פריט מבאר שבע על המפה בירושלים.
    'ירושלים|רמות': [31.81561, 35.19549],
    'גילה':         [31.7300, 35.1858],
    'קטמון':        [31.76602, 35.20933],
    'בקעה':         [31.75955, 35.21967],
    'מעלות דפנה':  [31.79337, 35.22468],
    'הר נוף':      [31.78581, 35.17415],
    'פסגת זאב':    [31.82126, 35.24857],
    'מלחה':         [31.75147, 35.18298],
    'עין כרם':     [31.76764, 35.1639],
    'תלפיות':       [31.75154, 35.21602],
    'ארנונה':       [31.75154, 35.21602],

    // ---- מודיעין-מכבים-רעות ----
    'חשמונאים':    [31.9089, 35.0139],

    // ---- תל אביב ----
    'רמת אביב':    [32.10886, 34.79509],
    'פלורנטין':     [32.05776, 34.76864],
    'נווה צדק':    [32.06325, 34.76413],
    'יפו העתיקה':  [32.0539, 34.7522],
    'רמת החייל':   [32.11557, 34.83665],
    'הצפון הישן':  [32.08093, 34.78079],
    'הצפון החדש':  [32.08685, 34.78964],
    'לב העיר':     [32.0769, 34.7758],
    'נמל תל אביב': [32.09865, 34.77552],
    'רוטשילד':      [32.0631, 34.7728],

    // ---- חיפה ----
    'כרמל צרפתי': [32.81779, 34.97828],
    'חיפה|נווה שאנן': [32.7874, 35.0189], // קיים גם בירושלים ובתל אביב יפו
    'רמת אלמוגי':  [32.77654, 35.0023],
    'בת גלים':     [32.83299, 34.97933],
    'הדר הכרמל':   [32.8089, 34.9992],
    'קרית חיים':   [32.82978, 35.06366],
    'קרית שמואל':  [32.8281, 35.0822],

    // ---- נתניה ----
    'קרית השרון':  [32.30442, 34.87323],
    'רמת פולג':    [32.27066, 34.84047],
    'נווה גנים':   [32.3056, 34.8617],
    'נתניה|עיר ימים': [32.27854, 34.84337], // קיים גם באשדוד
    'צוקי ים':     [32.36135, 34.85868],
    'נאות הרצל':   [32.3160, 34.8630],
    // שמות שקיימים גם בערים אחרות (כוכב הצפון בת"א; קריית צאנז בירושלים/טבריה/עפולה) -
    // ממופתחים כ"עיר|שכונה" כדי לא לחטוף פריטים של הערים האחרות לנתניה
    'נתניה|כוכב הצפון':  [32.3450, 34.8570],
    'עין התכלת':   [32.3521, 34.8556],
    'פרדס הגדוד':  [32.3400, 34.8650],
    'נתניה|קריית צאנז':  [32.3430, 34.8489],
    'נווה איתמר':  [32.3355, 34.8710],
    'מרכז העיר – צפון':      [32.3340, 34.8535],
    'מרכז העיר צפון-מערב':   [32.3315, 34.8505],
    'מרכז העיר צפון-מזרח':   [32.3315, 34.8575],
    'מרכז העיר דרום-מערב':   [32.3245, 34.8505],
    'מרכז העיר דרום-מזרח':   [32.3245, 34.8575],

    // ---- ראשון לציון ----
    'נווה דקלים':  [31.98177, 34.762],
    'רמת אליהו':   [31.98235, 34.78981],

    // ---- בני ברק ----
    'פרדס כץ':     [32.09528, 34.83944],
    'רמת אלחנן':   [32.0900, 34.8444],

    // ---- אשדוד / אשקלון רובעים ----
    'רובע א':      [31.81114, 34.64644],
    'רובע ג':      [31.79965, 34.66281],
    'רובע ז':      [31.79042, 34.66447],
    'ברנע':         [31.68352, 34.58052],
    'אפרידר':       [31.67748, 34.5673],
};

const DEFAULT_COORD: Coord = [31.7683, 35.2137]; // ירושלים מרכז

// מפתח localStorage למיקום האישי שהמשתמש סימן (תיקון מיידי לפני אישור אדמין)
export const MY_PIN_LS_KEY = 'gofreeil_my_location_pin';

// ---- שכונות שהוצעו ע"י תושבים ואושרו (נטענות בזמן ריצה מ-Strapi) ----
// ממופות לפי שם וגם לפי "עיר|שכונה" כדי למנוע התנגשות שמות בין ערים.
const dynamicNeighborhoodCenters: Record<string, Coord> = {};

const dynKey = (city: string, neighborhood: string) =>
    `${canonicalCity(city)}|${normalizeNeighborhoodName(neighborhood)}`;

// ---- אילו ערים תובעות כל שם שכונה ----
// 'רמות' קיימת גם בירושלים וגם בבאר שבע, 'נווה שאנן' בשלוש ערים. חיפוש לפי
// שם בלבד היה מחזיר את הקואורדינטה של העיר הראשונה שנרשמה, ומציב פריט מבאר
// שבע על המפה בירושלים. לכן שם שנתבע ע"י יותר מעיר אחת מחייב מפתח "עיר|שכונה".
const nbOwners: Map<string, Set<string>> = (() => {
    const m = new Map<string, Set<string>>();
    for (const [city, list] of Object.entries(citiesAndNeighborhoods)) {
        for (const nb of list) {
            const key = normalizeNeighborhoodName(nb);
            if (!key) continue;
            const set = m.get(key) ?? new Set<string>();
            set.add(city);
            m.set(key, set);
        }
    }
    return m;
})();

/**
 * האם מותר להסתמך על מפתח לפי-שם-בלבד עבור העיר הזו? לא, אם השם נתבע ע"י
 * עיר אחרת - עדיף ליפול למרכז העיר הנכונה מלהציב את הפריט בעיר אחרת לגמרי.
 */
function bareKeyAllowed(neighborhood: string, city?: string): boolean {
    if (!city) return true; // נקרא בלי עיר - אין דרך טובה יותר
    const owners = nbOwners.get(normalizeNeighborhoodName(neighborhood));
    if (!owners || owners.size <= 1) return true;
    return false;
}

/**
 * רישום שכונות מאושרות (עם פין מדויק) שנטענו מהשרת.
 * נקרא מה-layout בעת טעינה כדי שהמפה תציב פריטים בשכונות חדשות במקום הנכון.
 */
export function registerDynamicNeighborhoods(
    list: Array<{ name: string; city: string; lat: number; lng: number }>,
): void {
    for (const n of list) {
        if (!n?.name || !Number.isFinite(n.lat) || !Number.isFinite(n.lng)) continue;
        const coord: Coord = [n.lat, n.lng];
        dynamicNeighborhoodCenters[dynKey(n.city ?? '', n.name)] = coord;
        // גיבוי לפי שם בלבד (אם לא הועברה עיר בקריאה ל-getCoordsFor), רק אם
        // השם אינו נתבע ע"י עיר נוספת - אחרת היינו מציבים פריט בעיר הלא נכונה.
        const bare = normalizeNeighborhoodName(n.name);
        if (!staticNbIndex.has(bare) && (nbOwners.get(bare)?.size ?? 0) <= 1) {
            dynamicNeighborhoodCenters[bare] = coord;
        }
    }
    // שכונה מאושרת חדשה משנה את שיוך הפינים - התוצאות שנשמרו ב-cache לא תקפות.
    clearPinAreaCache();
}

// ---- אינדקס מנורמל של הקואורדינטות הסטטיות ----
// המפתחות בטבלה נכתבים בכתיב חופשי ("שכונת X" / "X", "עיר|שכונה"); כאן הם
// מיושרים לאותה צורה שבה מחפשים, כדי שהחיפוש לא יחמיץ בגלל תחילית.
const staticNbIndex: Map<string, Coord> = (() => {
    const m = new Map<string, Coord>();
    for (const [k, v] of Object.entries(neighborhoodCenters)) {
        if (k.includes('|')) {
            const [c, n] = k.split('|');
            m.set(dynKey(c, n), v);
        } else {
            m.set(normalizeNeighborhoodName(k), v);
        }
    }
    return m;
})();

/**
 * החזרת קואורדינטות לפריט לפי שכונה ועיר.
 * סדר עדיפויות: שכונה מאושרת (דינמי) → שכונה סטטית → מרכז עיר → ירושלים.
 */
export function getCoordsFor(neighborhood?: string, city?: string): Coord {
    const nb    = normalizeNeighborhoodName(neighborhood);
    const canon = canonicalCity(city);
    if (nb && canon && dynamicNeighborhoodCenters[dynKey(canon, nb)]) {
        return dynamicNeighborhoodCenters[dynKey(canon, nb)];
    }
    if (nb && canon && staticNbIndex.has(dynKey(canon, nb))) {
        return staticNbIndex.get(dynKey(canon, nb))!;
    }
    if (nb && bareKeyAllowed(nb, canon)) {
        if (dynamicNeighborhoodCenters[nb]) return dynamicNeighborhoodCenters[nb];
        if (staticNbIndex.has(nb))          return staticNbIndex.get(nb)!;
    }
    if (canon && cityCenters[canon]) {
        return cityCenters[canon];
    }
    return DEFAULT_COORD;
}

/**
 * האם קיימת קואורדינטה *מדויקת* לעיר/שכונה (סטטית, דינמית או אישית) -
 * להבדיל מנפילה ל-DEFAULT_COORD (ירושלים). משמש כדי להציע למשתמש לסמן
 * את מיקום הישוב שלו רק כשהמפה באמת לא מדויקת.
 */
export function hasPreciseCoords(neighborhood?: string, city?: string): boolean {
    const nb    = normalizeNeighborhoodName(neighborhood);
    const canon = canonicalCity(city);
    if (nb && canon && dynamicNeighborhoodCenters[dynKey(canon, nb)]) return true;
    if (nb && canon && staticNbIndex.has(dynKey(canon, nb)))          return true;
    if (nb && bareKeyAllowed(nb, canon)) {
        if (dynamicNeighborhoodCenters[nb]) return true;
        if (staticNbIndex.has(nb))          return true;
    }
    if (canon && cityCenters[canon]) return true;
    return false;
}

// ---- זיהוי העיר/שכונה הקרובות ביותר לנקודה על המפה ----

// מרחק בריבוע (קירוב equirectangular) - מספיק להשוואת "מי הכי קרוב".
// אורך קו-אורך מכווץ ב-cos(lat); בישראל (~31.5°) הפקטור ≈ 0.85.
function distSq(a: Coord, b: Coord): number {
    const dLat = a[0] - b[0];
    const dLng = (a[1] - b[1]) * 0.85;
    return dLat * dLat + dLng * dLng;
}

// קואורדינטה *מדויקת* של שכונה (דינמית מאושרת → סטטית), בלי נפילה למרכז העיר.
function preciseNeighborhoodCoord(neighborhood: string, city: string): Coord | null {
    const nb    = normalizeNeighborhoodName(neighborhood);
    const canon = canonicalCity(city);
    if (!nb) return null;
    if (dynamicNeighborhoodCenters[dynKey(canon, nb)]) return dynamicNeighborhoodCenters[dynKey(canon, nb)];
    if (staticNbIndex.has(dynKey(canon, nb)))          return staticNbIndex.get(dynKey(canon, nb))!;
    // שם שנתבע ע"י יותר מעיר אחת ('רמות' בירושלים ובבאר שבע) אינו מזוהה לפי
    // שם בלבד - אחרת היינו מייחסים לו את הקואורדינטה של העיר האחרת.
    if (!bareKeyAllowed(nb, canon)) return null;
    if (dynamicNeighborhoodCenters[nb]) return dynamicNeighborhoodCenters[nb];
    if (staticNbIndex.has(nb))          return staticNbIndex.get(nb)!;
    return null;
}

/**
 * מזהה את העיר+שכונה הקרובות ביותר לנקודה (פין שהמשתמש הציב על המפה). משמש
 * כדי לגזור אוטומטית את "מיקום הפרסום" מהפין - כך שסימון על המפה מספיק,
 * והמשתמש לא צריך גם לבחור עיר/שכונה ברשימה.
 *
 * המועמד הקרוב ביותר מבין כל מרכזי הערים והשכונות (עם קואורדינטה מדויקת)
 * קובע את שניהם. כך פין בשכונה מרוחקת (למשל פסגת זאב) עדיין משויך לעיר הנכונה,
 * ולא למרכז העיר השכן הקרוב יותר.
 *
 * @param cityNeighborhoods מפת עיר → רשימת שכונות (מבורר הפרסום, כולל מאושרות)
 * @returns { city, neighborhood } או null אם הקלט לא תקין / אין נתוני מיקום.
 *          neighborhood ריק = הפין זוהה ברמת העיר בלבד (אין שכונה מתאימה
 *          עם קואורדינטה, ולעיר אין "מרכז" בבורר).
 */
export function nearestCityNeighborhood(
    lat: number,
    lng: number,
    cityNeighborhoods: ReadonlyArray<readonly [string, readonly string[]]>,
): { city: string; neighborhood: string } | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const pin: Coord = [lat, lng];

    let best: { city: string; neighborhood: string } | null = null;
    let bestD = Infinity;

    for (const [city, nbs] of cityNeighborhoods) {
        // מועמד ברמת עיר - קובע כשאין שכונה מדויקת קרובה יותר.
        // "מרכז" מוחזר רק אם הוא באמת שכונה בעיר הזו (יישוב חד-שכונתי). בעיר
        // רבת-שכונות אין "מרכז" באף בורר, ושיוך אליו היה מוציא את הפריט מכל
        // לוח שכונתי - שם מחזירים שכונה ריקה, כלומר "ברמת העיר", והקורא מחליט
        // אם להשאיר את השכונה שכבר נבחרה.
        const cc = cityCenters[city];
        if (cc) {
            const d = distSq(pin, cc);
            if (d < bestD) {
                bestD = d;
                best = { city, neighborhood: nbs.length === 0 || nbs.includes('מרכז') ? 'מרכז' : '' };
            }
        }
        // מועמדים ברמת שכונה - רק שכונות עם קואורדינטה מדויקת משלהן
        for (const nb of nbs) {
            if (!nb || nb === 'מרכז') continue;
            const coord = preciseNeighborhoodCoord(nb, city);
            if (!coord) continue;
            const d = distSq(pin, coord);
            if (d < bestD) { bestD = d; best = { city, neighborhood: nb }; }
        }
    }

    return best;
}

// ---- האזור שאליו הפין באמת שייך ----
// זהה ל-nearestCityNeighborhood, עם memoization לפי הקואורדינטה. הסינון על
// המפה קורא לזה עבור כל פריט בכל שינוי מצב (חיפוש, קטגוריה, מעבר שכונה),
// ובלי cache היו כאן עשרות אלפי חישובי מרחק על כל הקשה.
const pinAreaCache = new Map<string, { city: string; neighborhood: string } | null>();

/**
 * לאיזה אזור שייכת נקודה על המפה, לפי הגאוגרפיה בלבד.
 *
 * זה מקור-האמת לשאלה "איפה הפריט נמצא": מפרסם שסימן פין התכוון למקום שסימן,
 * ותווית השכונה שנשמרה איתו היא לכל היותר עדות משנית - היא עלולה להיות שגויה,
 * לא מזוהה, או לא להיכתב בכלל. לכן מי שמסנן לפי אזור חייב לתת לפין לקבוע.
 *
 * @returns neighborhood ריק = הפין זוהה ברמת העיר בלבד (אין באותה עיר שכונה
 *          עם קואורדינטה קרובה יותר ממרכז העיר) - כלומר "בכל שכונות העיר".
 */
export function areaForPin(
    lat: number,
    lng: number,
    cityNeighborhoods: ReadonlyArray<readonly [string, readonly string[]]>,
): { city: string; neighborhood: string } | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const hit = pinAreaCache.get(key);
    if (hit !== undefined) return hit;
    const area = nearestCityNeighborhood(lat, lng, cityNeighborhoods);
    pinAreaCache.set(key, area);
    return area;
}

/** ניקוי ה-cache אחרי רישום שכונות מאושרות חדשות (הן משנות את התוצאה). */
export function clearPinAreaCache(): void {
    pinAreaCache.clear();
}

/**
 * הוספת offset קטן (במעלות) על בסיס hash של מזהה - כך שכמה פריטים באותה שכונה
 * לא יחפפו זה את זה. המרחק כ-50 מטר.
 */
export function jitterCoord(coord: Coord, id: string): Coord {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h * 31) + id.charCodeAt(i)) | 0;
    const dx = ((Math.abs(h) % 100) - 50) / 100000;       // ±0.0005°  ≈ 50 מ׳
    const dy = ((Math.abs(h * 7919) % 100) - 50) / 100000;
    return [coord[0] + dx, coord[1] + dy];
}
