// ============================================================
// חיפוש טקסט עברי סלחני - לוגיקה אחידה לכל חיפוש/סינון/השלמה באתר.
//
// למה: משתמשים מקלידים בסדר טבעי ובכתיב חופשי, בעוד המקורות (מאגר רחובות
// ממשלתי, כותרות פריטים, שמות) שומרים סדר/כתיב אחר. דוגמה קלאסית: הרחוב
// "ויטל חיים" (שם-משפחה קודם) שגולש מחפש כ"חיים ויטאל". חיפוש substring
// נאיבי מפספס. הפתרון - שכבות מהמדויקת לסלחנית, כל שכבה נכנסת רק כשהקודמת
// נכשלה, כך שתוצאות "אמיתיות" תמיד מדורגות לפני ניחושים:
//   1. נורמליזציה: אותיות קטנות, הסרת גרשיים/מרכאות (גם הטיפוגרפיים ”“’ של
//      וואטסאפ/וורד) וניקוד, איחוד מקף בין ספרות (050-123 ↔ 050123), איחוד רווחים.
//   2. התאמה לפי מילים בכל סדר (order-independent) - כל מילה שהוקלדה חייבת
//      להופיע (כתחילת/חלק) של מילה כלשהי ביעד.
//   3. שכבת "כתיב רופף": התעלמות מאמות קריאה (א/ו/י) לגישור כתיב מלא/חסר
//      (ויטל↔ויטאל, דוד↔דויד), רק כשההתאמה המדויקת נכשלה. מילה שנשארת ממנה
//      אות אחת ("לוי"→"ל", "אור"→"ר") לא מרופפת - אחרת שם פרטי מתאים לחצי הרשימה.
//   4. שכבת מקלדת: השאילתה הוקלדה בפריסה הלא-נכונה ("dnj" במקום "גמח") -
//      ממירים לפי פריסת SI-1452 ומריצים שוב את שכבות 1-3. נכנסת רק כשההמרה
//      באמת מחליפה כתב (עברית↔לטינית) ויש לפחות 3 אותיות - "עם"→"go" לא נחשב.
//      גם מילה-מילה: בשאילתה מעורבת ("חוג mhur") מומרות רק המילים הלטיניות.
//   5. שכבת טעויות הקלדה (fuzzy): מרחק עריכה Damerau-Levenshtein בין מילות
//      השאילתה למילות היעד, עם תקציב שגיאות לפי אורך המילה (מילה קצרה -
//      אפס סובלנות, אחרת כל שאילתה בת שתי אותיות תתאים להכל), איחוד אותיות
//      סופיות (ם↔מ) והסרת אותיות שימוש (ה/ו/ב/ל/מ/ש/כ) בתחילת מילה. מילה
//      שהוקלדה מחוברת ("בייביסיטר") מושווית גם לצמד מילים סמוכות ביעד.
//   6. "האם התכוונת ל...": תיקון שאילתה מול אוצר המילים של הרשימה עצמה
//      (suggestQuery) - כשאין תוצאות מדויקות מציגים את תוצאות התיקון, וכשיש
//      אבל התיקון היה מניב יותר - רק מציעים אותו.
//
// כניסות עיקריות:
//   heMatches(query, ...fields) → boolean        — לסינון רשימות (רב-שדות)
//   heRank(query, items, getText)  → T[]          — להשלמה/דירוג (typeahead)
//   heSearch(query, items, getFields) → SearchResult — חיפוש מלא עם תיקון
//   buildVocabulary / suggestQuery                — אוצר מילים + "האם התכוונת"
//
// תאימות: normalizeHe משמשת גם להשוואות שוויון ומפתחות (בוחרי שכונה/רחוב/עיר),
// לכן היא לא נוגעת באותיות סופיות - האיחוד קורה רק בתוך שכבות ההתאמה.
// ============================================================

/** ניקוי בסיסי: אותיות קטנות (למחרוזות מעורבות אנגלית), הסרת גרשיים/מרכאות
 *  (כולל הטיפוגרפיים ‘’“” שמגיעים מהדבקה) וניקוד (U+0591-U+05C7), איחוד
 *  ספרות שמופרדות במקף (02-6541234 → 026541234, כדי שטלפון יימצא בכל צורת
 *  כתיבה), איחוד רווחים ו-trim. עברית חסרת case כך שה-toLowerCase לא מזיק לה. */
export function normalizeHe(s: string | null | undefined): string {
    return String(s ?? '')
        .toLowerCase()
        .replace(/["'׳״`‘’“”֑-ׇ]/g, '')
        .replace(/(\d)-(?=\d)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

// הפונקציות הבאות רצות עשרות אלפי פעמים בחיפוש אחד (לכל מילה בכל פריט), לכן
// הן כתובות כלולאות על קודי תווים ולא כ-regex - זהות בתוצאה, פי כמה מהירות.

/** א (05D0) / ו (05D5) / י (05D9) - אמות הקריאה שמתעלמים מהן בכתיב רופף. */
function isMaterCode(c: number): boolean {
    return c === 0x05d0 || c === 0x05d5 || c === 0x05d9;
}

/** כתיב רופף: מסיר אמות קריאה (א/ו/י) כדי לגשר על כתיב מלא/חסר. */
export function loosenHe(s: string): string {
    if (typeof s !== 'string') s = String(s ?? '');
    const n = s.length;
    let i = 0;
    while (i < n && !isMaterCode(s.charCodeAt(i))) i++;
    if (i === n) return s; // אין מה להסיר - בלי הקצאה
    let out = s.slice(0, i);
    for (; i < n; i++) {
        if (!isMaterCode(s.charCodeAt(i))) out += s[i];
    }
    return out;
}

/** הגרסה הרופפת של מילת שאילתה: אם אחרי הסרת אמות הקריאה נשארת אות אחת
 *  ("לוי"→"ל", "אבי"→"ב", "תא"→"ת") המילה נשארת כמות שהיא - אות בודדת היא
 *  substring של כמעט כל יעד, ושם פרטי היה "מתאים" לרוב הרשימה ברמה 3. */
function looseToken(t: string): string {
    const l = loosenHe(t);
    return l.length >= 2 ? l : t;
}

// ------------------------------------------------------------
// אותיות סופיות
// ------------------------------------------------------------

/** ך=05DA ם=05DD ן=05DF ף=05E3 ץ=05E5 - וביוניקוד האות הרגילה היא תמיד הקוד הבא. */
function isFinalCode(c: number): boolean {
    return c === 0x05da || c === 0x05dd || c === 0x05df || c === 0x05e3 || c === 0x05e5;
}

const REGULAR_TO_FINAL: Record<string, string> = { כ: 'ך', מ: 'ם', נ: 'ן', פ: 'ף', צ: 'ץ' };

/** איחוד אותיות סופיות לצורה הרגילה (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ), כדי ש"שולחנ"
 *  (טעות נפוצה) ו"שולחן" ייחשבו זהים בהתאמה. לא נכנס ל-normalizeHe כי היא
 *  משמשת גם למחרוזות תצוגה/מפתחות. */
export function foldFinalsHe(s: string): string {
    if (typeof s !== 'string') s = String(s ?? '');
    const n = s.length;
    let i = 0;
    while (i < n && !isFinalCode(s.charCodeAt(i))) i++;
    if (i === n) return s;
    let out = s.slice(0, i);
    for (; i < n; i++) {
        const c = s.charCodeAt(i);
        out += isFinalCode(c) ? String.fromCharCode(c + 1) : s[i];
    }
    return out;
}

/** היפוך היוריסטי לתצוגה: אות כמנפ"צ בסוף מילה חוזרת לצורה הסופית. משמש רק
 *  כשאין לנו את צורת המקור של המילה (אוצר מילים חיצוני). */
function unfoldFinalsHe(token: string): string {
    if (token.length < 2) return token;
    const fin = REGULAR_TO_FINAL[token[token.length - 1]];
    return fin ? token.slice(0, -1) + fin : token;
}

// ------------------------------------------------------------
// פריסת מקלדת (SI-1452 מול QWERTY)
// ------------------------------------------------------------

const LATIN_TO_HE: Record<string, string> = {
    q: '/', w: "'", e: 'ק', r: 'ר', t: 'א', y: 'ט', u: 'ו', i: 'ן', o: 'ם', p: 'פ',
    a: 'ש', s: 'ד', d: 'ג', f: 'כ', g: 'ע', h: 'י', j: 'ח', k: 'ל', l: 'ך', ';': 'ף',
    z: 'ז', x: 'ס', c: 'ב', v: 'ה', b: 'נ', n: 'מ', m: 'צ', ',': 'ת', '.': 'ץ',
};

// מפה דו-כיוונית אחת: התווים הלטיניים והעבריים זרים זה לזה, כך שההמרה היא
// אינוולוציה (swap(swap(s)) === s לכל תו ממופה).
const LAYOUT_SWAP = new Map<string, string>();
for (const [latin, heb] of Object.entries(LATIN_TO_HE)) {
    LAYOUT_SWAP.set(latin, heb);
    LAYOUT_SWAP.set(heb, latin);
}

/** המרת מחרוזת שהוקלדה בפריסת מקלדת שגויה: לטינית→עברית ועברית→לטינית לפי
 *  הפריסה הישראלית התקנית. לא רגיש לרישיות; תווים שאינם במפה עוברים כמות שהם. */
export function swapKeyboardLayout(s: string): string {
    if (typeof s !== 'string') s = String(s ?? '');
    let out = '';
    for (const ch of s) {
        out += LAYOUT_SWAP.get(ch.toLowerCase()) ?? ch;
    }
    return out;
}

/** האם רוב האותיות במחרוזת לטיניות (a-z)? משמש להחליט אם שווה לנסות
 *  התאמה fuzzy גם על הגרסה המומרת לעברית. */
export function looksLatin(s: string): boolean {
    let latin = 0;
    let other = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90)) latin++;
        else if ((c >= 0x05d0 && c <= 0x05ea) || (c >= 0x0400 && c <= 0x04ff)) other++;
    }
    return latin > 0 && latin * 2 > latin + other;
}

/** מספר האותיות (עברית/לטינית/קירילית) במחרוזת - בלי ספרות וסימני פיסוק. */
function letterCount(s: string): number {
    let n = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 0x05d0 && c <= 0x05ea) || (c >= 0x0400 && c <= 0x04ff)) n++;
    }
    return n;
}

/** האם המרת הפריסה של q ל-sw היא המרה "אמיתית": יש לפחות 3 אותיות והכתב
 *  באמת מתחלף (עברית↔לטינית). בלי זה "ת"→"," מתאים לכל תווית עם פסיק,
 *  ו"עם"→"go" מתאים לכל תיאור באנגלית. */
function isRealLayoutSwap(q: string, sw: string): boolean {
    return sw !== '' && sw !== q && letterCount(q) >= 3 && looksLatin(q) !== looksLatin(sw);
}

// ------------------------------------------------------------
// פירוק למילים
// ------------------------------------------------------------

/** מפריד מילים: רווח (כולל tab/שורה/NBSP) + מפרידים נפוצים בכותרות -
 *  - / – — ־(מקף עברי) | , ; : ( )  ("גמ"ח - שמחות", "ירושלים/קרית משה"). */
function isSepCode(c: number): boolean {
    return (
        c === 32 || c === 9 || c === 10 || c === 13 || c === 0xa0 ||
        c === 45 || c === 47 || c === 0x2013 || c === 0x2014 || c === 0x05be || c === 124 ||
        c === 44 || c === 59 || c === 58 || c === 40 || c === 41
    );
}

/** פירוק למילים לפי isSepCode, בלי regex ובלי מילים ריקות. */
function splitTokens(s: string): string[] {
    const out: string[] = [];
    let start = -1;
    for (let i = 0; i < s.length; i++) {
        if (isSepCode(s.charCodeAt(i))) {
            if (start >= 0) {
                out.push(s.slice(start, i));
                start = -1;
            }
        } else if (start < 0) start = i;
    }
    if (start >= 0) out.push(s.slice(start));
    return out;
}

/** מילות השאילתה לרמות 2-3: פירוק לפי רווחים (כמו תמיד), אבל בלי סימני פיסוק
 *  בקצוות המילה - "שולחנות," / "(גמח)" / "תל-" הן אותה מילה בלי הפיסוק,
 *  ובלי הקיצוץ התאמה מדויקת הייתה נופלת לרמת ה-fuzzy. */
function queryTokens(q: string): string[] {
    const out: string[] = [];
    for (const raw of q.split(' ')) {
        let a = 0;
        let b = raw.length;
        while (a < b && isSepCode(raw.charCodeAt(a))) a++;
        while (b > a && isSepCode(raw.charCodeAt(b - 1))) b--;
        if (b > a) out.push(a === 0 && b === raw.length ? raw : raw.slice(a, b));
    }
    // שאילתה שכולה פיסוק ("-") - נשארת מילה אחת, כמו קודם
    return out.length === 0 && q ? [q] : out;
}

/** מסכת אותיות של מילה (ביט לכל אות; עברית 0-26, לטינית/ספרות/קירילית
 *  ממופות על אותם ביטים, כל השאר ביט 27). שימוש: סינון מהיר לפני מרחק עריכה -
 *  אם למילת השאילתה יש יותר אותיות שחסרות ביעד מתקציב השגיאות, אין סיכוי
 *  להתאמה (כל עריכה משנה לכל היותר אות אחת של השאילתה). מיפוי חופף רק
 *  מחליש את הסינון, אף פעם לא פוסל התאמה אמיתית. */
function tokenMask(t: string): number {
    let m = 0;
    for (let i = 0; i < t.length; i++) {
        const c = t.charCodeAt(i);
        if (c >= 0x05d0 && c <= 0x05ea) m |= 1 << (c - 0x05d0);
        else if (c >= 97 && c <= 122) m |= 1 << (c - 97);
        else if (c >= 48 && c <= 57) m |= 1 << (c - 48);
        else if (c >= 0x0430 && c <= 0x044f) m |= 1 << ((c - 0x0430) % 27);
        else m |= 1 << 27;
    }
    return m;
}

/** האם במסכה x דולקים יותר מ-allow ביטים (עוצר ברגע שחורגים). */
function bitsExceed(x: number, allow: number): boolean {
    let c = 0;
    while (x !== 0) {
        x &= x - 1;
        if (++c > allow) return true;
    }
    return false;
}

/** מילות היעד לשכבת ה-fuzzy: פירוק מורחב + איחוד אותיות סופיות + מסכות אותיות. */
interface FuzzyDoc {
    tokens: string[];
    masks: Int32Array;
}

function fuzzyDoc(s: string): FuzzyDoc {
    const tokens = splitTokens(s);
    const masks = new Int32Array(tokens.length);
    for (let i = 0; i < tokens.length; i++) {
        tokens[i] = foldFinalsHe(tokens[i]);
        masks[i] = tokenMask(tokens[i]);
    }
    return { tokens, masks };
}

/** מילות השאילתה לשכבת ה-fuzzy: כמו fuzzyDoc, ובנוסף לכל מילה כמה אותיות
 *  שלה מותר שיחסרו ביעד (תקציב השגיאות + אותיות שימוש שאפשר להסיר ממנה). */
interface FuzzyQuery {
    tokens: string[];
    masks: Int32Array;
    allow: Int8Array;
}

function fuzzyQuery(s: string): FuzzyQuery {
    const tokens = splitTokens(s);
    const masks = new Int32Array(tokens.length);
    const allow = new Int8Array(tokens.length);
    for (let i = 0; i < tokens.length; i++) {
        const t = foldFinalsHe(tokens[i]);
        tokens[i] = t;
        masks[i] = tokenMask(t);
        allow[i] = typoBudget(t.length) + cliticStripCount(t);
    }
    return { tokens, masks, allow };
}

// ------------------------------------------------------------
// מרחק עריכה
// ------------------------------------------------------------

// שלושה מאגרים משותפים (שורה נוכחית, קודמת, לפני-קודמת) שגדלים לפי הצורך -
// חוסך הקצאה בכל קריאה כשמריצים עשרות אלפי השוואות בחיפוש אחד.
let edRow0 = new Int32Array(64);
let edRow1 = new Int32Array(64);
let edRow2 = new Int32Array(64);

function ensureEditBuffers(n: number): void {
    if (edRow0.length >= n) return;
    const size = Math.max(n, edRow0.length * 2);
    edRow0 = new Int32Array(size);
    edRow1 = new Int32Array(size);
    edRow2 = new Int32Array(size);
}

/**
 * גרסה פנימית עם אורכים מפורשים. prefix=true (מצב typeahead): מוחזר המינימום
 * בין המרחק ל-b כולה לבין המרחק לקידומת של b באורך a - שניהם יוצאים מאותה
 * טבלה (העמודה la בשורה האחרונה), אז אין צורך בריצה שנייה או ב-slice.
 */
function editDistanceN(a: string, la: number, b: string, lb: number, max: number, prefix = false): number {
    if (la === 0) return lb;
    if (lb === 0) return la;
    if (la - lb > max) return max + 1;
    if (lb - la > max) {
        if (!prefix) return max + 1;
        lb = la; // ההתאמה המלאה ממילא חורגת - נשארת רק הקידומת
    }
    ensureEditBuffers(lb + 1);
    let prev2 = edRow0;
    let prev = edRow1;
    let cur = edRow2;
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
        cur[0] = i;
        let rowMin = i;
        const ca = a.charCodeAt(i - 1);
        for (let j = 1; j <= lb; j++) {
            const cb = b.charCodeAt(j - 1);
            let v = prev[j - 1] + (ca === cb ? 0 : 1); // החלפה / זהות
            const del = prev[j] + 1; // מחיקה
            if (del < v) v = del;
            const ins = cur[j - 1] + 1; // הוספה
            if (ins < v) v = ins;
            // החלפת מקום בין שתי אותיות סמוכות (מיסרה↔מסירה) - עלות 1
            if (i > 1 && j > 1 && ca === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === cb) {
                const tr = prev2[j - 2] + 1;
                if (tr < v) v = tr;
            }
            cur[j] = v;
            if (v < rowMin) rowMin = v;
        }
        // כל מסלול יישור עובר דרך השורה הזו, לכן המרחק הסופי ≥ המינימום בה -
        // אם כבר חרגנו מהתקציב אין טעם להמשיך.
        if (rowMin > max) return max + 1;
        const tmp = prev2;
        prev2 = prev;
        prev = cur;
        cur = tmp;
    }
    let d = prev[lb];
    if (prefix && lb > la && prev[la] < d) d = prev[la];
    return d;
}

/**
 * מרחק Damerau-Levenshtein (יישור אופטימלי: הוספה, מחיקה, החלפה, החלפת מקום
 * של שתי אותיות סמוכות). שורות מתגלגלות - O(len(a)·len(b)) זמן, O(len(b)) זיכרון.
 * כשמועבר max, מוחזר ערך > max ברגע שברור שהמרחק חורג ממנו (יציאה מוקדמת).
 */
export function editDistance(a: string, b: string, max = Number.POSITIVE_INFINITY): number {
    if (a === b) return 0;
    return editDistanceN(a, a.length, b, b.length, max);
}

/** תקציב שגיאות למילת שאילתה לפי אורכה: עד 3 אותיות - אפס (אחרת "גמ" יתאים
 *  לכל דבר), 4-5 - שגיאה אחת, 6 ומעלה - שתיים. */
export function typoBudget(len: number): number {
    if (len <= 3) return 0;
    if (len <= 5) return 1;
    return 2;
}

// ------------------------------------------------------------
// אותיות שימוש (clitics)
// ------------------------------------------------------------

const CLITICS = 'הובלמשכ';

/** ה=05D4 ו=05D5 ב=05D1 ל=05DC מ=05DE ש=05E9 כ=05DB */
function isCliticCode(c: number): boolean {
    return c === 0x05d4 || c === 0x05d5 || c === 0x05d1 || c === 0x05dc || c === 0x05de || c === 0x05e9 || c === 0x05db;
}

/** כמה אותיות שימוש מותר להסיר מתחילת המילה (0-3): אות אחת (לגמח→גמח), צמד
 *  נפוץ (והשולחן→שולחן; ו+כל אות שימוש, כש, שה, מה) או שלישייה (כשה, ושה,
 *  ומה, וכש - "כשהגמח"). מה שנשאר חייב להיות באורך 2 לפחות - אחרת "הבן"→"ן"
 *  יתאים לכל דבר. */
function cliticStripCount(t: string): number {
    if (t.length < 3 || !isCliticCode(t.charCodeAt(0))) return 0;
    if (t.length >= 4 && isCliticCode(t.charCodeAt(1))) {
        const c0 = t.charCodeAt(0);
        const c1 = t.charCodeAt(1);
        const vav = c0 === 0x05d5;
        if (
            vav || // ו + אות שימוש
            (c0 === 0x05db && c1 === 0x05e9) || // כש
            (c0 === 0x05e9 && c1 === 0x05d4) || // שה
            (c0 === 0x05de && c1 === 0x05d4) // מה
        ) {
            if (t.length >= 5) {
                const c2 = t.charCodeAt(2);
                const he = c2 === 0x05d4;
                if (
                    (c0 === 0x05db && c1 === 0x05e9 && he) || // כשה
                    (vav && c1 === 0x05e9 && he) || // ושה
                    (vav && c1 === 0x05de && he) || // ומה
                    (vav && c1 === 0x05db && c2 === 0x05e9) // וכש
                ) return 3;
            }
            return 2;
        }
    }
    return 1;
}

/** גרסאות המילה בלי אותיות שימוש מקדימות (המילה עצמה תמיד ראשונה). */
function cliticVariants(t: string): string[] {
    const out = [t];
    const k = cliticStripCount(t);
    for (let i = 1; i <= k; i++) out.push(t.slice(i));
    return out;
}

/** האם q (מהאינדקס qi) שווה ל-t (מהאינדקס ti) או ש-t משם והלאה מתחיל בו -
 *  השוואה במקום, בלי slice: הלולאה הזו רצה על כל זוג מילים בחיפוש. */
function tailMatches(q: string, qi: number, t: string, ti: number): boolean {
    const alen = q.length - qi;
    if (t.length - ti < alen) return false;
    for (let x = 0; x < alen; x++) {
        if (q.charCodeAt(qi + x) !== t.charCodeAt(ti + x)) return false;
    }
    return true;
}

// זוגות אותיות שמתבלבלים ביניהן: בשמיעה (א/ע, ס/ש, ת/ט, כ/ק, כ/ח, ב/ו, א/ה),
// בדקדוק (ספריה/ספרית - ה/ת) ובאצבע (מקשים שכנים באותה שורה במקלדת: ם/ן,
// ד/ש...). בסינון הבוליאני (heMatches) החלפת אות במילה קצרה (4-5 אותיות,
// תקציב שגיאה אחת) מתקבלת רק ביניהם - אחרת "דירה" מסננת גם "בירה" ו"מורה"
// גם "תורה", כי ברוב המילים הקצרות החלפת אות אחת היא מילה אחרת ולא שגיאת כתיב.
const CONFUSABLE = new Set<string>();
function addConfusable(a: string, b: string): void {
    CONFUSABLE.add(a + b);
    CONFUSABLE.add(b + a);
}
for (const [a, b] of [['א', 'ע'], ['א', 'ה'], ['ס', 'ש'], ['ת', 'ט'], ['כ', 'ק'], ['כ', 'ח'], ['ב', 'ו'], ['ה', 'ת']]) addConfusable(a, b);
for (const row of ['קראטוןםפ', 'שדגכעיחלךף', 'זסבהנמצתץ']) {
    const f = foldFinalsHe(row);
    for (let i = 0; i + 1 < f.length; i++) addConfusable(f[i], f[i + 1]);
}

function isHebrewCode(c: number): boolean {
    return c >= 0x05d0 && c <= 0x05ea;
}

/** האם החלפת a ב-b סבירה כשגיאת כתיב: זוג מתבלבל, אותה מקש בפריסה השנייה
 *  (שיעוr↔שיעור), או שאחת מהן אינה עברית (מילים לועזיות לא מוגבלות). */
function isConfusable(a: string, b: string): boolean {
    if (!isHebrewCode(a.charCodeAt(0)) || !isHebrewCode(b.charCodeAt(0))) return true;
    return CONFUSABLE.has(a + b) || LAYOUT_SWAP.get(a) === b;
}

/**
 * מילה קצרה (תקציב = 1) שעברה את מרחק העריכה, במצב מחמיר: מאשרים
 * הוספה/מחיקה/החלפת מקום, והחלפת אות רק בין אותיות מתבלבלות. ההשוואה היא
 * באורך השאילתה (מול היעד כולו או קידומתו - כמו מצב ה-typeahead של editDistanceN).
 */
function shortTypoOk(qt: string, tt: string): boolean {
    const L = qt.length;
    if (tt.length === L - 1) return true; // מחיקה (מכולת→מכלת)
    if (tt.length === L + 1 && editDistanceN(qt, L, tt, L + 1, 1) <= 1) return true; // הוספה
    if (tt.length < L) return false;
    let d1 = -1;
    let d2 = -1;
    for (let x = 0; x < L; x++) {
        if (qt.charCodeAt(x) !== tt.charCodeAt(x)) {
            if (d1 < 0) d1 = x;
            else if (d2 < 0) d2 = x;
            else return false;
        }
    }
    if (d1 < 0) return true; // קידומת זהה
    if (d2 < 0) return isConfusable(qt[d1], tt[d1]); // החלפת אות אחת
    // החלפת מקום של שתי אותיות סמוכות (מיסרה↔מסירה)
    return d2 === d1 + 1 && qt[d1] === tt[d2] && qt[d2] === tt[d1];
}

/**
 * התאמת מילה בודדת בסובלנות לטעויות. שני הצדדים כבר מנורמלים עם אותיות
 * סופיות מאוחדות. מתאים אם:
 *   - מרחק העריכה בתוך התקציב (typoBudget לפי אורך השאילתה), או
 *   - מצב typeahead: היעד ארוך יותר והקידומת שלו באורך השאילתה בתוך התקציב, או
 *   - אחרי הסרת אות/צמד/שלישיית אותיות שימוש מאחד הצדדים המילים שוות (או
 *     שהיעד מתחיל בשאילתה המקוצרת - רק כשנשארו ממנה 3 אותיות לפחות: "כלב"→"לב"
 *     לא הופך לקידומת של "לבני", אבל "הבן" עדיין שווה ל"בן").
 * strictShort=true (הסינון הבוליאני של heMatches): במילה קצרה (4-5 אותיות)
 * החלפת אות מתקבלת רק בין אותיות מתבלבלות (ראו shortTypoOk) - בדירוג
 * (heScore/heSearch) ההתאמה הזו ממילא בשכבה האחרונה, בסינון היא רעש.
 */
export function fuzzyTokenMatch(qt: string, tt: string, strictShort = false): boolean {
    if (!qt || !tt) return false;
    if (qt === tt) return true;
    const budget = typoBudget(qt.length);
    if (budget > 0 && editDistanceN(qt, qt.length, tt, tt.length, budget, true) <= budget) {
        if (budget > 1 || !strictShort || shortTypoOk(qt, tt)) return true;
    }
    // אותיות שימוש: כל צירוף של הסרה משני הצדדים, בלי להקצות מחרוזות
    const qk = cliticStripCount(qt);
    const tk = cliticStripCount(tt);
    if (qk === 0 && tk === 0) return false;
    for (let i = 0; i <= qk; i++) {
        const qRem = qt.length - i;
        for (let j = 0; j <= tk; j++) {
            const tRem = tt.length - j;
            // שארית קצרה (2 אותיות) אחרי הסרה - רק שוויון מלא, לא קידומת
            if (tRem !== qRem && ((i > 0 && qRem < 3) || (j > 0 && tRem < 3))) continue;
            if (tailMatches(qt, i, tt, j)) return true;
        }
    }
    return false;
}

/** מילת שאילתה ארוכה (6+) שהוקלדה מחוברת מול צמד מילים סמוכות ביעד
 *  ("בייביסיטר" ↔ "בייבי סיטר", "בניברק" ↔ "לבני ברק"): המילה הראשונה בצמד
 *  (בלי אות שימוש מקדימה, אם יש) חייבת להיות קידומת מדויקת של השאילתה, ומה
 *  שנשאר מהשאילתה מושווה למילה השנייה במרחק עריכה בתקציב (במצב typeahead).
 *  ההשוואה נעצרת ברוב הצמדים כבר באות הראשונה - בלי לבנות מחרוזת מחוברת. */
function pairMatches(qt: string, tTokens: string[]): boolean {
    const budget = typoBudget(qt.length);
    for (let j = 0; j + 1 < tTokens.length; j++) {
        const a = tTokens[j];
        const ak = cliticStripCount(a);
        for (let s = 0; s <= ak; s++) {
            const alen = a.length - s;
            // החלק הראשון והשארית - שניהם לפחות 2 אותיות
            if (alen < 2 || alen > qt.length - 2) continue;
            if (!tailMatches(a, s, qt, 0)) continue;
            const rest = qt.slice(alen);
            const b = tTokens[j + 1];
            if (rest === b || editDistanceN(rest, rest.length, b, b.length, budget, true) <= budget) return true;
        }
    }
    return false;
}

/** האם כל מילות השאילתה (fuzzy) מוצאות מילה מתאימה ביעד - בכל סדר. מילה
 *  ארוכה שלא נמצאה מושווית גם לצמדי מילים סמוכות מחוברות (pairMatches).
 *  strict - ראו fuzzyTokenMatch. */
function fuzzyCover(fq: FuzzyQuery, fd: FuzzyDoc, strict: boolean): boolean {
    const qTokens = fq.tokens;
    const tTokens = fd.tokens;
    if (qTokens.length === 0 || tTokens.length === 0) return false;
    for (let k = 0; k < qTokens.length; k++) {
        const qt = qTokens[k];
        const qm = fq.masks[k];
        const allow = fq.allow[k];
        let found = false;
        for (let j = 0; j < tTokens.length; j++) {
            // סינון מהיר: יותר אותיות חסרות מהמותר - אין סיכוי, בלי מרחק עריכה
            if (bitsExceed(qm & ~fd.masks[j], allow)) continue;
            if (fuzzyTokenMatch(qt, tTokens[j], strict)) {
                found = true;
                break;
            }
        }
        if (!found && qt.length >= 6 && tTokens.length >= 2) found = pairMatches(qt, tTokens);
        if (!found) return false;
    }
    return true;
}

// ------------------------------------------------------------
// ליבת הניקוד
// ------------------------------------------------------------

/** האם כל מילות q מופיעות (כתחילת/חלק) במילות target - בכל סדר.
 *  (includes מכסה גם startsWith - בדיקה אחת לכל זוג, הלולאה החמה של רמה 2.) */
function tokensCover(qTokens: string[], targetTokens: string[]): boolean {
    if (qTokens.length === 0) return false;
    for (const qt of qTokens) {
        let ok = false;
        for (const tt of targetTokens) {
            if (tt.includes(qt)) {
                ok = true;
                break;
            }
        }
        if (!ok) return false;
    }
    return true;
}

/** רמה 3: כל מילת שאילתה רופפת מופיעה במילות היעד הרופפות. מילה שלא רופפה
 *  (looseToken השאיר אותה) מושווית למילות היעד המקוריות. */
function looseCover(qLoose: string[], t: TargetCache): boolean {
    if (qLoose.length === 0) return false;
    for (const qt of qLoose) {
        let ok = false;
        for (const tt of t.loose) {
            if (tt.includes(qt)) {
                ok = true;
                break;
            }
        }
        if (!ok && qt !== loosenHe(qt)) {
            for (const tt of t.tokens) {
                if (tt.includes(qt)) {
                    ok = true;
                    break;
                }
            }
        }
        if (!ok) return false;
    }
    return true;
}

/** גרסה של השאילתה בפריסת המקלדת ההפוכה - כל הנגזרות שלה. */
interface SwapVariant {
    q: string;
    tokens: string[];
    loose: string[];
    /** מילות fuzzy - רק כשהגרסה עברית (המקור הוקלד בפריסה לטינית בטעות). */
    fuzzy: FuzzyQuery | null;
}

function swapVariant(q: string, withFuzzy: boolean): SwapVariant {
    const tokens = queryTokens(q);
    return { q, tokens, loose: tokens.map(looseToken), fuzzy: withFuzzy ? fuzzyQuery(q) : null };
}

/** שאילתה "מקומפלת" פעם אחת - כל הנגזרות שהיו מחושבות מחדש לכל פריט. */
interface QueryPlan {
    q: string;
    tokens: string[];
    loose: string[];
    /** גרסאות בפריסת המקלדת ההפוכה: השאילתה כולה, ובשאילתה מעורבת גם רק
     *  המילים הלטיניות ("חוג mhur" → "חוג ציור"). ריק כשאין המרה אמיתית. */
    swaps: SwapVariant[];
    fuzzy: FuzzyQuery;
}

function compileQuery(q: string): QueryPlan {
    const tokens = queryTokens(q);
    const swaps: SwapVariant[] = [];
    const whole = normalizeHe(swapKeyboardLayout(q));
    const qLatin = looksLatin(q);
    if (isRealLayoutSwap(q, whole)) swaps.push(swapVariant(whole, qLatin));
    // שאילתה מעורבת: מילה לטינית (3+ אותיות) לצד מילה שאינה לטינית - ממירים
    // רק את הלטיניות. כשהכל לטיני זה זהה להמרה של השאילתה כולה.
    let hasLatin = false;
    let hasOther = false;
    for (const t of tokens) {
        if (looksLatin(t)) {
            if (letterCount(t) >= 3) hasLatin = true;
        } else if (letterCount(t) > 0) hasOther = true;
    }
    if (hasLatin && hasOther) {
        const perToken = tokens.map((t) => (looksLatin(t) ? normalizeHe(swapKeyboardLayout(t)) : t)).join(' ');
        if (perToken !== q && perToken !== whole) swaps.push(swapVariant(perToken, true));
    }
    return { q, tokens, loose: tokens.map(looseToken), swaps, fuzzy: fuzzyQuery(q) };
}

/** נגזרות של מחרוזת יעד שמחושבות פעם אחת לכל פריט (heSearch מריץ עד שתי
 *  שאילתות על אותם פריטים - המקורית וההצעה - ואין טעם לפרק שוב). */
interface TargetCache {
    tokens: string[];
    loose: string[];
    fuzzy: FuzzyDoc | null;
}

function targetCache(ns: string): TargetCache {
    const tokens = ns.split(' ').filter(Boolean);
    return { tokens, loose: tokens.map(loosenHe).filter(Boolean), fuzzy: null };
}

/** רמות 0..3 - ההתנהגות המקורית. tc - נגזרות היעד אם כבר חושבו. */
function scoreExact(q: string, qTokens: string[], qLoose: string[], ns: string, tc?: TargetCache): number {
    if (ns.startsWith(q)) return 0;
    if (ns.includes(q)) return 1;
    const t = tc ?? targetCache(ns);
    if (tokensCover(qTokens, t.tokens)) return 2;
    if (looseCover(qLoose, t)) return 3;
    return -1;
}

/** ניקוד מלא (0..5 / -1) של שאילתה מקומפלת מול יעד מנורמל. tc - נגזרות היעד
 *  אם כבר חושבו (heSearch שומר אותן לכל פריט ומשתף בין הריצות). */
function scorePlan(plan: QueryPlan, ns: string, tc?: TargetCache): number {
    if (!ns) return -1;
    // רמות 0/1 לא צריכות פירוק - רוב הפריטים נופלים כאן או ביציאה המהירה
    if (ns.startsWith(plan.q)) return 0;
    if (ns.includes(plan.q)) return 1;
    const t = tc ?? targetCache(ns);
    if (tokensCover(plan.tokens, t.tokens)) return 2;
    if (looseCover(plan.loose, t)) return 3;
    for (const sv of plan.swaps) {
        if (scoreExact(sv.q, sv.tokens, sv.loose, ns, t) >= 0) return 4;
    }
    const tf = t.fuzzy ?? (t.fuzzy = fuzzyDoc(ns));
    if (fuzzyCover(plan.fuzzy, tf, false)) return 5;
    for (const sv of plan.swaps) {
        if (sv.fuzzy && fuzzyCover(sv.fuzzy, tf, false)) return 5;
    }
    return -1;
}

/** בדיקת ה"ערימה" של heMatches (כל מילה מופיעה, ואז בכתיב רופף) - כפי שהייתה,
 *  חוץ מזה שמילה שכתיבה הרופף הוא אות אחת נבדקת כמות שהיא (ראו looseToken). */
function hayCovers(qTokens: string[], hay: string): boolean {
    if (qTokens.length === 0) return false;
    if (qTokens.every((t) => hay.includes(t))) return true;
    const looseHay = loosenHe(hay);
    for (const t of qTokens) {
        const l = loosenHe(t);
        if (!(l.length >= 2 ? looseHay.includes(l) : hay.includes(t))) return false;
    }
    return true;
}

/**
 * סינון בוליאני לרשימות עם כמה שדות. מאחד את כל השדות ל"ערימת חיפוש" אחת
 * ודורש שכל מילה שהוקלדה תופיע בה (בכל סדר), עם נפילה לכתיב רופף, ואז
 * (כמוצא אחרון) לפריסת מקלדת הפוכה ולהתאמת טעויות הקלדה.
 * שאילתה ריקה → true (הכל עובר).
 *
 * @example items.filter(i => heMatches(query, i.label, i.description, i.city))
 */
export function heMatches(query: string, ...fields: (string | null | undefined)[]): boolean {
    const q = normalizeHe(query);
    if (!q) return true;
    const hay = fields.map((f) => normalizeHe(f)).filter(Boolean).join(' ');
    if (!hay) return false;

    const plan = compileQuery(q);
    if (hayCovers(plan.tokens, hay)) return true;

    // שכבת מקלדת: אותה בדיקה על השאילתה המומרת
    for (const sv of plan.swaps) {
        if (hayCovers(sv.tokens, hay)) return true;
    }

    // שכבת טעויות הקלדה - במצב מחמיר למילים קצרות (סינון, לא דירוג)
    const hayFuzzy = fuzzyDoc(hay);
    if (fuzzyCover(plan.fuzzy, hayFuzzy, true)) return true;
    for (const sv of plan.swaps) {
        if (sv.fuzzy && fuzzyCover(sv.fuzzy, hayFuzzy, true)) return true;
    }
    return false;
}

/**
 * ציון התאמה של שאילתה מול מחרוזת יעד יחידה, לצורך דירוג:
 *   0 = היעד מתחיל בשאילתה (הכי טוב)
 *   1 = היעד מכיל את השאילתה כרצף
 *   2 = התאמת מילים בכל סדר
 *   3 = התאמת מילים בכתיב רופף
 *   4 = התאמה (ברמות 0-3) רק אחרי המרת פריסת מקלדת
 *   5 = התאמה fuzzy: כל מילת שאילתה קרובה (מרחק עריכה בתקציב) למילה ביעד
 *  -1 = אין התאמה
 * רמות 0-3 עובדות כמו קודם (פירוק לפי רווחים בלבד, בלי פיסוק בקצות המילים);
 * רמה 5 מפרקת גם לפי מקפים/לוכסנים/פסיקים ומאחדת אותיות סופיות.
 */
export function heScore(query: string, target: string): number {
    const q = normalizeHe(query);
    if (!q) return 0;
    const ns = normalizeHe(target);
    if (!ns) return -1;
    return scorePlan(compileQuery(q), ns);
}

/** true אם יש התאמה כלשהי בין השאילתה למחרוזת היעד (heScore ≥ 0). */
export function heMatch(query: string, target: string): boolean {
    return heScore(query, target) >= 0;
}

/**
 * דירוג + סינון רשימה לפי טקסט מחולץ מכל פריט. מוחזרת ממוינת מהטובה להתאמה
 * החלשה (מתחיל → מכיל → מילים → רופף → מקלדת → fuzzy); בתוך אותה רמה נשמר
 * הסדר המקורי. שאילתה ריקה → הרשימה כמו שהיא (עד limit).
 *
 * @example heRank(input, streets, s => s, 80)
 */
export function heRank<T>(
    query: string,
    items: readonly T[],
    getText: (item: T) => string,
    limit = 80,
): T[] {
    const q = normalizeHe(query);
    if (!q) return items.slice(0, limit);
    const plan = compileQuery(q);
    const scored: { item: T; score: number; i: number }[] = [];
    items.forEach((item, i) => {
        const score = scorePlan(plan, normalizeHe(getText(item)));
        if (score >= 0) scored.push({ item, score, i });
    });
    // מיון יציב: קודם לפי איכות ההתאמה, ואז לפי הסדר המקורי
    scored.sort((a, b) => a.score - b.score || a.i - b.i);
    return scored.slice(0, limit).map((s) => s.item);
}

// ------------------------------------------------------------
// אוצר מילים + "האם התכוונת ל..."
// ------------------------------------------------------------

// צורת המקור של כל מילה מאוחדת (שולחנ→שולחן) - נשמרת בצד, לפי זהות המפה,
// כדי שההצעה שתוצג למשתמש תיראה כמו שהוא היה כותב אותה.
const vocabSurface = new WeakMap<Map<string, number>, Map<string, string>>();

/**
 * בניית אוצר מילים מרשימת טקסטים: מילים מנורמלות עם אותיות סופיות מאוחדות
 * (אורך ≥ 2) → משקל מצטבר. לתת משקל גבוה יותר לכותרות מאשר לתיאורים - לקרוא
 * פעמיים עם weight שונה ולאחד ב-mergeVocabularies. את המפה המוחזרת עדיף לא
 * לשנות ידנית - suggestQuery שומר עליה אינדקס עזר (ראו vocabIndex).
 */
export function buildVocabulary(texts: Iterable<string | null | undefined>, weight = 1): Map<string, number> {
    return buildVocabularyFrom(texts, weight, false);
}

/** הוספת מילות טקסט מנורמל אחד לאוצר (וצורת המקור למפת התצוגה). tokens -
 *  הפירוק אם כבר חושב (heSearch משתף אותו בין שדות חוזרים כמו תוויות קטגוריה). */
function addToVocabulary(vocab: Map<string, number>, surface: Map<string, string>, normalized: string, weight: number, tokens?: string[]): void {
    for (const raw of tokens ?? splitTokens(normalized)) {
        if (raw.length < 2) continue;
        const t = foldFinalsHe(raw);
        const prev = vocab.get(t);
        if (prev === undefined) {
            vocab.set(t, weight);
            surface.set(t, raw); // צורת המקור = ההופעה הראשונה
        } else vocab.set(t, prev + weight);
    }
}

/** הגרסה הפנימית: normalized=true כשהטקסטים כבר עברו normalizeHe. */
function buildVocabularyFrom(texts: Iterable<string | null | undefined>, weight: number, normalized: boolean): Map<string, number> {
    const vocab = new Map<string, number>();
    const surface = new Map<string, string>();
    for (const text of texts) {
        const n = normalized ? (text ?? '') : normalizeHe(text);
        if (n) addToVocabulary(vocab, surface, n, weight);
    }
    vocabSurface.set(vocab, surface);
    return vocab;
}

/** איחוד כמה אוצרות מילים (המשקלים מסתכמים). */
export function mergeVocabularies(...maps: Map<string, number>[]): Map<string, number> {
    const merged = new Map<string, number>();
    const surface = new Map<string, string>();
    for (const m of maps) {
        const ms = vocabSurface.get(m);
        for (const [t, w] of m) {
            merged.set(t, (merged.get(t) ?? 0) + w);
            const s = ms?.get(t);
            if (s && !surface.has(t)) surface.set(t, s);
        }
    }
    vocabSurface.set(merged, surface);
    return merged;
}

/** אינדקס עזר לאוצר מילים: מילים לפי אורך (מועמד לתיקון חייב להיות באורך
 *  דומה, אז סורקים רק דליים רלוונטיים). נשמר לפי זהות המפה ונבנה מחדש כשגודלה
 *  השתנה או כשמילה שנדגמה ממנו כבר לא קיימת (מפה ששונתה במקום באותו גודל). */
interface VocabIndex {
    size: number;
    byLen: Map<number, string[]>;
    all: string[];
}
const vocabIndexes = new WeakMap<Map<string, number>, VocabIndex>();

function vocabIndex(vocab: Map<string, number>): VocabIndex {
    const cached = vocabIndexes.get(vocab);
    if (
        cached &&
        cached.size === vocab.size &&
        (cached.all.length === 0 || (vocab.has(cached.all[0]) && vocab.has(cached.all[cached.all.length - 1])))
    ) return cached;
    const byLen = new Map<number, string[]>();
    const all: string[] = [];
    for (const t of vocab.keys()) {
        all.push(t);
        const bucket = byLen.get(t.length);
        if (bucket) bucket.push(t);
        else byLen.set(t.length, [t]);
    }
    const idx = { size: vocab.size, byLen, all };
    vocabIndexes.set(vocab, idx);
    return idx;
}

interface Candidate {
    tok: string;
    dist: number;
    weight: number;
    /** צורת תצוגה מוכנה (לפיצול לשתי מילים); אחרת displayForm(tok). */
    display?: string;
}

/** מוסיף למועמדים את כל מילות האוצר שבמרחק ≤ budget מ-t (dist מוזז ב-extra). */
function collectNear(t: string, budget: number, idx: VocabIndex, vocab: Map<string, number>, out: Map<string, Candidate>, extra: number): void {
    for (let len = Math.max(2, t.length - budget); len <= t.length + budget; len++) {
        const bucket = idx.byLen.get(len);
        if (!bucket) continue;
        for (const tok of bucket) {
            const d = editDistanceN(t, t.length, tok, tok.length, budget);
            if (d > budget) continue;
            addCandidate(out, tok, d + extra, vocab);
        }
    }
}

function addCandidate(out: Map<string, Candidate>, tok: string, dist: number, vocab: Map<string, number>, display?: string): void {
    const prev = out.get(tok);
    if (prev && prev.dist <= dist) return;
    out.set(tok, { tok, dist, weight: vocab.get(tok) ?? 0, display });
}

/** האם t (≥ 2 אותיות) היא קידומת של מילה ארוכה יותר באוצר - כלומר המשתמש
 *  כנראה עדיין מקליד אותה. */
function isVocabPrefix(t: string, idx: VocabIndex): boolean {
    if (t.length < 2) return false;
    for (const v of idx.all) {
        if (v.length > t.length && v.startsWith(t)) return true;
    }
    return false;
}

/** ההמרה של מילה לפריסה השנייה, או null כשאינה המרה אמיתית (ראו isRealLayoutSwap). */
function swappedToken(t: string): string | null {
    const sw = foldFinalsHe(normalizeHe(swapKeyboardLayout(t)));
    return isRealLayoutSwap(t, sw) ? sw : null;
}

/** המועמד הטוב ביותר לתיקון מילה אחת (מאוחדת סופיות), או null. */
function bestCandidate(t: string, sw: string | null, vocab: Map<string, number>, idx: VocabIndex): Candidate | null {
    const budget = typoBudget(t.length);
    const cands = new Map<string, Candidate>();

    // (א) מילים קרובות במרחק עריכה
    if (budget > 0) collectNear(t, budget, idx, vocab, cands, 0);

    // (ב) פריסת מקלדת הפוכה - התאמה מלאה (מרחק 0) או קרובה. שילוב של המרה +
    //     טעות הקלדה הוא קפיצה גדולה יותר, לכן מקבל חצי נקודה כדי להפסיד
    //     בשוויון לתיקון פשוט.
    if (sw) {
        if (vocab.has(sw)) addCandidate(cands, sw, 0, vocab);
        else if (budget > 0) collectNear(sw, budget, idx, vocab, cands, 0.5);
    }

    // (ג) אותיות שימוש - הסרה או הוספה
    const variants = cliticVariants(t);
    for (let i = 1; i < variants.length; i++) {
        if (vocab.has(variants[i])) addCandidate(cands, variants[i], 1, vocab);
    }
    for (const c of CLITICS) {
        if (vocab.has(c + t)) addCandidate(cands, c + t, 1, vocab);
    }

    // (ד) שתי מילים שהוקלדו מחוברות ("בייביסיטר" → "בייבי סיטר"): שני החלקים
    //     באוצר. מרחק 1.5 - מפסיד לתיקון של אות אחת, מנצח תיקון של שתיים.
    for (let i = 2; i <= t.length - 2; i++) {
        const a = t.slice(0, i);
        const b = t.slice(i);
        const wa = vocab.get(a);
        const wb = vocab.get(b);
        if (wa === undefined || wb === undefined) continue;
        const tok = a + ' ' + b;
        if (!cands.has(tok)) cands.set(tok, { tok, dist: 1.5, weight: Math.min(wa, wb), display: displayForm(a, vocab) + ' ' + displayForm(b, vocab) });
    }

    if (cands.size === 0) return null;
    const first = t[0];
    // "שלד" זהה (אותן אותיות בלי אמות קריאה): שולחנת→שולחנות ולא →שולחן -
    // השמטת ו/י היא שגיאת הכתיב העברית הנפוצה ביותר, לכן היא שוברת שוויון
    // לפני המשקל.
    const skel = loosenHe(t);
    const ranked = [...cands.values()].sort(
        (a, b) =>
            a.dist - b.dist ||
            Number(loosenHe(b.tok) === skel) - Number(loosenHe(a.tok) === skel) ||
            b.weight - a.weight ||
            Number(b.tok[0] === first) - Number(a.tok[0] === first) ||
            Math.abs(a.tok.length - t.length) - Math.abs(b.tok.length - t.length),
    );
    return ranked[0];
}

/** צורת התצוגה של מילת אוצר: המקור שנשמר בבנייה, אחרת היפוך היוריסטי של הסופיות. */
function displayForm(tok: string, vocab: Map<string, number>): string {
    return vocabSurface.get(vocab)?.get(tok) ?? unfoldFinalsHe(tok);
}

/**
 * מתקן "האם התכוונת ל...": לכל מילת שאילתה - אם היא באוצר, או קידומת (≥ 2
 * אותיות) של מילה באוצר (המשתמש אולי עדיין מקליד) - נשארת. אחרת נבחר
 * המועמד הטוב ביותר: מרחק עריכה בתקציב, המרת פריסת מקלדת, אות שימוש, או
 * פיצול לשתי מילים. דירוג: מרחק ↑, אותו שלד (בלי אמות קריאה), משקל באוצר ↓,
 * אותה אות ראשונה, הפרש אורך קטן.
 * מחזיר את השאילתה המתוקנת (מילים בסדר המקורי, רווח בודד) רק אם משהו השתנה
 * ושונה מהקלט המנורמל; אחרת null.
 */
export function suggestQuery(query: string, vocab: Map<string, number>): string | null {
    const q = normalizeHe(query);
    if (!q || vocab.size === 0) return null;
    const rawTokens = splitTokens(q);
    if (rawTokens.length === 0) return null;
    const idx = vocabIndex(vocab);
    let changed = false;
    const out = rawTokens.map((raw) => {
        if (raw.length < 2) return raw;
        const t = foldFinalsHe(raw);
        if (vocab.has(t)) return raw;
        // עדיין מקליד? קידומת של מילה קיימת - לא נתקן
        if (isVocabPrefix(t, idx)) return raw;
        // הוקלד בפריסה הפוכה ועדיין באמצע מילה (ahgu→שיעו, קידומת של שיעור)
        const sw = swappedToken(t);
        if (sw && !vocab.has(sw) && isVocabPrefix(sw, idx)) return raw;
        const best = bestCandidate(t, sw, vocab, idx);
        if (!best || best.tok === t) return raw;
        changed = true;
        return best.display ?? displayForm(best.tok, vocab);
    });
    if (!changed) return null;
    const result = out.join(' ');
    return result === q ? null : result;
}

// ------------------------------------------------------------
// חיפוש מלא
// ------------------------------------------------------------

export interface SearchResult<T> {
    /** הפריטים שנמצאו, מדורגים: קודם רמות 0-3 (לפי ציון), אחריהן רמות 4-5. */
    hits: T[];
    /** הציון (רמה) של כל פריט ב-hits, באותו סדר. */
    scores: number[];
    /** השאילתה המתוקנת שה-UI צריך להציג (ראו usedCorrection), או null. */
    correctedQuery: string | null;
    /** true = לא היו תוצאות מדויקות ו-hits הן תוצאות של correctedQuery
     *  ("מציג תוצאות עבור X"); false = hits של השאילתה המקורית, ו-correctedQuery
     *  (אם קיים) הוא רק הצעה ("האם התכוונת ל..."). */
    usedCorrection: boolean;
    /** ההצעה הגולמית של suggestQuery, גם כשלא נבחרה. */
    suggestion: string | null;
}

export interface SearchOptions {
    limit?: number;
    /** אוצר מילים מוכן (buildVocabulary); אם חסר - נבנה מהשדות של הפריטים. */
    vocabulary?: Map<string, number>;
    /** משקל כל שדה בבניית אוצר המילים (ברירת מחדל: השדה הראשון 3, השאר 1). */
    fieldWeights?: number[];
}

interface Tiered {
    exact: { i: number; s: number }[];
    fuzzy: { i: number; s: number }[];
}

/**
 * חיפוש מלא ברשימה: ניקוד לפי כל השדות המאוחדים (כמו heMatches), הפרדה
 * לתוצאות מדויקות (רמות 0-3) ו-fuzzy (4-5), ותיקון "האם התכוונת" מול אוצר
 * המילים של הרשימה:
 *   - יש תוצאות מדויקות → מציגים אותן (ואחריהן fuzzy); correctedQuery מוצע
 *     רק אם היה מניב יותר תוצאות מדויקות.
 *   - אין מדויקות אבל התיקון מניב → מציגים את תוצאות התיקון (usedCorrection).
 *   - אחרת → רק תוצאות fuzzy.
 * שאילתה ריקה → תוצאה ריקה.
 */
export function heSearch<T>(
    query: string,
    items: readonly T[],
    getFields: (item: T) => (string | null | undefined)[],
    opts: SearchOptions = {},
): SearchResult<T> {
    const q = normalizeHe(query);
    if (!q) return { hits: [], scores: [], correctedQuery: null, usedCorrection: false, suggestion: null };

    // נורמליזציה פעם אחת לכל פריט (השדות בנפרד לאוצר המילים, מאוחדים לניקוד).
    // שדות קצרים חוזרים על עצמם בין פריטים (תוויות קטגוריה, עיר, שכונה) -
    // מנורמלים ומפורקים פעם אחת לכל מחרוזת ייחודית; תיאורים ארוכים הם ייחודיים
    // ממילא, ולהם המטמון היה רק עולה.
    const SHORT = 64;
    const normMemo = new Map<string, string>();
    const n = items.length;
    const fieldsPer: string[][] = new Array(n);
    const docs: string[] = new Array(n);
    let maxFields = 0;
    for (let i = 0; i < n; i++) {
        const raw = getFields(items[i]);
        const fs: string[] = new Array(raw.length);
        for (let k = 0; k < raw.length; k++) {
            const f = raw[k];
            if (typeof f === 'string' && f.length <= SHORT) {
                let v = normMemo.get(f);
                if (v === undefined) normMemo.set(f, (v = normalizeHe(f)));
                fs[k] = v;
            } else fs[k] = normalizeHe(f);
        }
        fieldsPer[i] = fs;
        if (fs.length > maxFields) maxFields = fs.length;
        docs[i] = fs.filter(Boolean).join(' ');
    }

    // אוצר מילים במעבר אחד על השדות שכבר נורמלו (השדה הראשון = כותרת, משקל 3)
    let vocab = opts.vocabulary;
    if (!vocab) {
        const built = new Map<string, number>();
        const surface = new Map<string, string>();
        const tokensMemo = new Map<string, string[]>();
        const weights: number[] = [];
        for (let k = 0; k < maxFields; k++) weights.push(opts.fieldWeights?.[k] ?? (k === 0 ? 3 : 1));
        for (let i = 0; i < n; i++) {
            const fs = fieldsPer[i];
            for (let k = 0; k < fs.length; k++) {
                const f = fs[k];
                if (!f) continue;
                if (f.length <= SHORT) {
                    let toks = tokensMemo.get(f);
                    if (toks === undefined) tokensMemo.set(f, (toks = splitTokens(f)));
                    addToVocabulary(built, surface, f, weights[k], toks);
                } else addToVocabulary(built, surface, f, weights[k]);
            }
        }
        vocabSurface.set(built, surface);
        vocab = built;
    }

    // נגזרות כל פריט (מילים / כתיב רופף / fuzzy) מחושבות בעצלתיים ופעם אחת -
    // משותפות לריצת השאילתה המקורית ולריצת ההצעה
    const caches: (TargetCache | undefined)[] = new Array(n);
    // exactOnly - רק רמות 0-3 (כשההצעה משמשת רק להשוואת מספר התוצאות המדויקות
    // אין טעם לשלם על שכבות המקלדת וה-fuzzy שלה)
    const run = (nq: string, exactOnly: boolean): Tiered => {
        const plan = compileQuery(nq);
        const exact: { i: number; s: number }[] = [];
        const fuzzy: { i: number; s: number }[] = [];
        for (let i = 0; i < n; i++) {
            const ns = docs[i];
            if (!ns) continue;
            let s: number;
            if (ns.startsWith(plan.q)) s = 0;
            else if (ns.includes(plan.q)) s = 1;
            else {
                const tc = caches[i] ?? (caches[i] = targetCache(ns));
                s = exactOnly ? scoreExact(plan.q, plan.tokens, plan.loose, ns, tc) : scorePlan(plan, ns, tc);
            }
            if (s < 0) continue;
            if (s <= 3) exact.push({ i, s });
            else fuzzy.push({ i, s });
        }
        // מיון יציב לפי ציון; הסדר המקורי נשמר בתוך אותה רמה
        exact.sort((a, b) => a.s - b.s);
        fuzzy.sort((a, b) => a.s - b.s);
        return { exact, fuzzy };
    };

    const current = run(q, false);
    const suggestion = suggestQuery(q, vocab);
    let chosen = current;
    let correctedQuery: string | null = null;
    let usedCorrection = false;

    if (suggestion) {
        // ריצה חוזרת על ההצעה בלבד - בלי להציע שוב (אין רקורסיה). כשיש כבר
        // תוצאות מדויקות, ההצעה רק נספרת ולא מוצגת - מספיקות רמות 0-3.
        const alt = run(normalizeHe(suggestion), current.exact.length > 0);
        if (current.exact.length > 0) {
            if (alt.exact.length > current.exact.length) correctedQuery = suggestion;
        } else if (alt.exact.length > 0) {
            chosen = alt;
            usedCorrection = true;
            correctedQuery = suggestion;
        }
    }

    const ordered = chosen.exact.concat(chosen.fuzzy);
    const limited = opts.limit !== undefined ? ordered.slice(0, Math.max(0, opts.limit)) : ordered;
    return {
        hits: limited.map((r) => items[r.i]),
        scores: limited.map((r) => r.s),
        correctedQuery,
        usedCorrection,
        suggestion,
    };
}
