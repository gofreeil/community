// מנוע ציון התאמה (1-100) בין שני פנויים. מקבל את הפרופילים שמחושבים משאלון ההתאמה
// (singlesQuestionnaire.ts) ואת פרטי הכרטיס (גיל, מגזר, עיר...), ומחזיר ציון + הסבר.
//
// הרעיון נשען על שיטות ידועות ומוכחות, ולא על נוסחה אחת:
//  1. OkCupid - "סיפוק הדדי": כמה האדם השני עונה על מה שאני מחפש/ת, וכמה אני עונה על מה שהוא/היא
//     מחפש/ת, כל תכונה לפי החשיבות שלה, ואז ממוצע הנדסי של שני הכיוונים. ממוצע הנדסי מעניש
//     קשר חד-צדדי: אם צד אחד לא מקבל כמעט כלום, הציון הכולל צונח גם אם הצד השני מרוצה מאוד.
//  2. eHarmony - "דמיון בליבה, משלימות במקומות שמתאימים": רוב התכונות מנבאות הצלחה כשהן קרובות
//     (משפחה, עומק, עצמאות, שאפתנות), תכונות חיוביות עדיף ששני הצדדים גבוהים בהן (חום, הומור),
//     ובשתיים (דומיננטיות, אגו) שני צדדים גבוהים מדי מתנגשים, ופער מתון דווקא עובד.
//  3. Gottman - סגנון התמודדות עם מחלוקת: דפוס "רודף-נסוג" (אחד מדבר מיד והשני מתכנס) הוא
//     המנבא החזק לפירוד, לעומת צד אחד שמדבר וצד שני שמתקרר ואז מדבר, שעובד היטב.
//  4. תורת ההיקשרות - צמד "חרד-נמנע" הוא המלכודת הקלאסית; לפחות צד אחד יציב מרים את הקשר.
//  5. Eastwick & Finkel - מה שאנשים אומרים שהם רוצים מנבא את מה שמושך אותם פחות משחשבו.
//     לכן כשיש פער בין הדירוג הישיר לתשובות העקיפות (מה מפריע / מה מושך / דילמות), נותנים
//     יותר משקל לעקיף (60%).
//  6. "מסנני חובה" (must-have / dealbreaker): סימנים אדומים שהאחד ציין ואצל השני הם בולטים,
//     ופער גדול בחשיבות המשפחה, מורידים את הציון בכפל ולא בחיבור - אי אפשר "לפצות" עליהם.
//  7. כיול: הציון הגולמי עובר סיגמואיד כך ש-50 = זוג רגיל ו-85+ = התאמה חריגה (מכויל בסימולציה).
//     ורמת הוודאות (כמה מהשאלון נענה, האם התשובות אמינות) מקרבת את הציון אל 50, כי ציון
//     שנשען על מעט מידע לא צריך להיראות נחרץ.
//
// הקובץ טהור (בלי גישה לרשת/DB) כדי שאפשר יהיה לבדוק ולכייל אותו בסימולציה.

import { QUIZ_FIELD_KEY, TRAIT_IDS, TRAITS, computeProfile, fmt, parseAnswers, toG } from './singlesQuestionnaire';
import type { G, Profile, TraitId } from './singlesQuestionnaire';
import { TRAIT_WORDS } from './singlesQuestionnaireData';
import { pickLabel, profileReliability } from './singlesProfileSummary';
import type { DbItem } from './server/db';

// ───────────── מועמד/ת ─────────────

export interface MatchCandidate {
    id: string;
    g: G;
    age: number | null;
    /** רמת דתיות מסודרת: 1 חילוני ... 5 חרדי. null = לא ידוע */
    sector: number | null;
    sectorLabel: string;
    city: string;
    smoker: boolean | null;
    marital: 'single' | 'previously' | null;
    /** null = לא מילא/ה את השאלון */
    profile: Profile | null;
}

const SECTOR_LEVELS: [string, number][] = [
    ['חרדי', 5], ['לאומי', 4], ['דתי', 4], ['מאמין', 3], ['מסורתי', 2], ['חילוני', 1], ['כללי', 2.5],
];

function ageOf(ef: Record<string, unknown>): number | null {
    if (ef.birth_date) {
        const d = new Date(String(ef.birth_date));
        if (!isNaN(d.getTime())) {
            const now = new Date();
            let age = now.getFullYear() - d.getFullYear();
            const m = now.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
            if (age > 0 && age < 130) return age;
        }
    }
    const n = parseInt(String(ef.age ?? ''), 10);
    return Number.isFinite(n) && n > 0 && n < 130 ? n : null;
}

/** ממיר פריט פנויים (Strapi) למועמד/ת. null אם אין מין תקין. */
export function candidateFromItem(item: DbItem): MatchCandidate | null {
    let ef: Record<string, unknown> = {};
    try { ef = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { ef = {}; }
    const g = toG(ef.gender);
    if (!g) return null;

    const sectorRaw = String(ef.sector ?? '').trim();
    const sector = SECTOR_LEVELS.find(([k]) => sectorRaw.includes(k))?.[1] ?? null;

    const smokerRaw = String(ef.smoker ?? '').trim();
    const maritalRaw = String(ef.marital_status ?? '').trim();

    const answers = parseAnswers(ef[QUIZ_FIELD_KEY]);
    const profile = Object.keys(answers).length ? computeProfile(g, answers) : null;
    // שאלון ריק לגמרי (למשל רק מחק תשובות) = כמו שלא מילא/ה
    const usable = profile && (Object.keys(profile.self).length + Object.keys(profile.seeks).length) >= 4 ? profile : null;

    return {
        id: String(item.id),
        g,
        age: ageOf(ef),
        sector,
        sectorLabel: sectorRaw,
        city: String(item.city || ef.city || '').trim(),
        smoker: smokerRaw ? smokerRaw.includes('מעשן') && !smokerRaw.includes('לא') : null,
        marital: maritalRaw ? (maritalRaw.includes('רווק') ? 'single' : 'previously') : null,
        profile: usable,
    };
}

// ───────────── תוצאה ─────────────

export type PartKey = 'needs' | 'similarity' | 'values' | 'dynamics' | 'practical';

export interface MatchPart {
    key: PartKey;
    label: string;
    /** 0-100, או null כשאין נתונים לחשב */
    score: number | null;
}

export interface MatchResult {
    /** 1-100 */
    score: number;
    tierLabel: string;
    /** כמה המערכת בטוחה בציון, 0-1 */
    confidence: number;
    confidenceLabel: 'גבוהה' | 'בינונית' | 'נמוכה';
    /** חסר שאלון לאחד הצדדים או לשניהם: הציון נשען על פרטי הכרטיס בלבד */
    partial: boolean;
    parts: MatchPart[];
    /** עד כמה הגבר עונה על מה שהאישה מחפשת, ולהפך (0-100) */
    aToB: number | null;
    bToA: number | null;
    /** לשדכן: מה עובד / איפה יש חיכוך / מסנני חובה שנפגעו */
    strengths: string[];
    frictions: string[];
    dealbreakers: string[];
    /** לפנוי/ה עצמם: ניסוח כללי בלי תוכן אישי מהשאלון של הצד השני */
    highlights: string[];
}

export const PART_LABELS: Record<PartKey, string> = {
    needs: 'עונים אחד לשני על מה שמחפשים',
    similarity: 'אופי וסגנון חיים',
    values: 'ערכים',
    dynamics: 'תקשורת ומחלוקות',
    practical: 'גיל, מגזר ופרטים מעשיים',
};

const PART_HIGHLIGHT: Record<PartKey, string> = {
    needs: 'כל אחד מכם מוצא אצל השני הרבה ממה שחיפש',
    similarity: 'אופי וסגנון חיים שמתאימים זה לזה',
    values: 'ערכים משותפים',
    dynamics: 'סגנון תקשורת שמשלים זה את זה',
    practical: 'גיל ורקע שמתאימים',
};

const WEIGHTS: Record<PartKey, number> = { needs: 0.40, similarity: 0.24, values: 0.14, dynamics: 0.10, practical: 0.12 };

/** כיול: raw (0-1) -> 1-100. מרכז = זוג "רגיל" מקבל ~50. נקבע בסימולציה (ראה scripts/simulate-matching). */
const CALIB_CENTER = 0.745;
const CALIB_SPREAD = 0.07;

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const who = (g: G) => (g === 'm' ? 'הוא' : 'היא');
const the = (g: G) => (g === 'm' ? 'הגבר' : 'האישה');
const forThe = (g: G) => (g === 'm' ? 'לגבר' : 'לאישה');
const word = (t: TraitId, score: number, g: G) => fmt(TRAIT_WORDS[t][score >= 50 ? 'high' : 'low'], g);

// ───────────── 1. סיפוק הדדי (OkCupid) ─────────────

/** תכונות שיותר מהן אף פעם לא מפריע: חריגה למעלה מהמבוקש לא נענשת */
const POSITIVE: ReadonlySet<TraitId> = new Set<TraitId>(['warmth', 'humor', 'calm', 'generosity', 'flexibility', 'support']);

/** ערך מתוך "הדברים החשובים לי" -> התכונות שהוא מחזק. רמז לחשיבות, בנוסף לעוצמת הדרישה. */
const VALUE_TRAITS: Record<string, TraitId[]> = {
    trust: ['directness'], humor: ['humor'], torah: ['depth'], family: ['family'],
    respect: ['flexibility', 'support'], space: ['independence'], passion: ['warmth', 'romance'],
    growth: ['depth', 'ambition'], stability: ['provider', 'calm'], adventure: ['spontaneity'],
    friends: ['sociability'], peace: ['calm'], ambition: ['ambition'], gentle: ['warmth', 'sensitivity'],
};

/** מה באמת מחפש/ת: כשיש פער ישיר-עקיף בתכונה, 60% מהעקיף (Eastwick & Finkel) */
function wantOf(p: Profile, t: TraitId): number | undefined {
    const gap = p.gaps.find((x) => x.kind === 'seeks' && x.trait === t);
    if (gap) return 0.4 * gap.direct + 0.6 * gap.indirect;
    return p.seeks[t];
}

interface NeedRow { trait: TraitId; want: number; has: number; w: number; fit: number }

/** עד כמה `other` עונה על מה ש-`seeker` מחפש/ת. 0-1, או null כשאין די נתונים. */
function needFit(seeker: Profile, other: Profile): { sat: number; rows: NeedRow[] } | null {
    const boosted = new Set<TraitId>();
    for (const v of seeker.values) for (const t of VALUE_TRAITS[v] ?? []) boosted.add(t);

    const rows: NeedRow[] = [];
    let sw = 0, sf = 0;
    for (const t of TRAIT_IDS) {
        const want = wantOf(seeker, t);
        const has = other.self[t];
        if (want === undefined || has === undefined) continue;

        // חשיבות: מי שדורש/ת קיצון כנראה מקפיד/ה; "באמצע" = לא ממש משנה
        let w = 0.5 + 3.5 * Math.pow(Math.abs(want - 50) / 50, 1.2);
        if (boosted.has(t)) w *= 1.35;

        let miss: number;
        if (want >= 60) {
            miss = Math.max(0, want - has) + (POSITIVE.has(t) ? 0 : 0.4 * Math.max(0, has - want - 15));
        } else if (want <= 40) {
            miss = Math.max(0, has - want) + 0.4 * Math.max(0, want - has - 15);
        } else {
            miss = Math.max(0, Math.abs(has - want) - 12);
        }
        const fit = 1 - Math.pow(Math.min(1, miss / 65), 1.15);
        rows.push({ trait: t, want, has, w, fit });
        sw += w; sf += w * fit;
    }
    if (rows.length < 3) return null;
    return { sat: sf / sw, rows };
}

// ───────────── 2. דמיון / משלימות (eHarmony) ─────────────

type PairKind = 'sim' | 'pos' | 'clash' | 'comp';

/** איך לדרג זוג ערכים בכל תכונה, ומשקל התכונה בתחזית שביעות רצון */
const PAIR: Record<TraitId, { kind: PairKind; w: number }> = {
    ego:          { kind: 'clash', w: 1.0 },
    sensitivity:  { kind: 'sim',   w: 0.6 },
    warmth:       { kind: 'pos',   w: 1.3 },
    humor:        { kind: 'pos',   w: 1.2 },
    dominance:    { kind: 'comp',  w: 1.2 },
    independence: { kind: 'sim',   w: 1.2 },
    calm:         { kind: 'pos',   w: 1.1 },
    ambition:     { kind: 'sim',   w: 1.0 },
    order:        { kind: 'sim',   w: 0.8 },
    spontaneity:  { kind: 'sim',   w: 0.8 },
    sociability:  { kind: 'sim',   w: 1.0 },
    generosity:   { kind: 'pos',   w: 0.9 },
    jealousy:     { kind: 'clash', w: 1.0 },
    flexibility:  { kind: 'pos',   w: 1.0 },
    romance:      { kind: 'sim',   w: 0.9 },
    family:       { kind: 'sim',   w: 1.8 },
    depth:        { kind: 'sim',   w: 1.1 },
    directness:   { kind: 'sim',   w: 0.6 },
    support:      { kind: 'pos',   w: 1.2 },
    provider:     { kind: 'pos',   w: 0.8 },
    parents:      { kind: 'sim',   w: 0.8 },
};

function similarity(d: number): number {
    return Math.max(0, 1 - Math.pow(d / 70, 1.3));
}

function pairScore(kind: PairKind, a: number, b: number): number {
    const d = Math.abs(a - b);
    switch (kind) {
        case 'sim':
            return similarity(d);
        case 'pos':
            // חיובי: עדיף ששניהם גבוהים; פער מתון נסלח (אחד רגוע מייצב את הסוער)
            return 0.35 * similarity(d) + 0.65 * Math.pow((a + b) / 200, 0.9);
        case 'clash':
            // שניהם גבוהים = התנגשות (אגו מול אגו, קנאה מול קנאה)
            return clamp(1 - 0.9 * Math.max(0, (Math.min(a, b) - 55) / 45) - 0.25 * (d / 100));
        case 'comp': {
            // דומיננטיות: פער מתון עובד הכי טוב; שני חזקים מתנגשים, שני נוחים נסחפים
            const base = 1 - Math.abs(d - 30) / 80;
            const clash = 0.7 * Math.max(0, (Math.min(a, b) - 62) / 38);
            const drift = 0.35 * Math.max(0, (38 - Math.max(a, b)) / 38);
            return clamp(base - clash - drift);
        }
    }
}

interface SimRow { trait: TraitId; kind: PairKind; s: number; a: number; b: number; w: number }

interface CrossRule {
    /** x = מי שמושפע, y = הצד השני */
    test: (x: Profile, y: Profile) => boolean;
    pen: number;
    text: (xg: G, yg: G) => string;
}

/** חיכוכים שנוצרים מצירוף של שתי תכונות, לא מתכונה בודדת */
const CROSS_RULES: CrossRule[] = [
    {
        test: (x, y) => (x.self.sensitivity ?? 0) >= 70 && (y.self.directness ?? 0) >= 70 && (y.self.support ?? 50) <= 55,
        pen: 0.07,
        text: (xg, yg) => `${who(xg)} ${fmt('רגיש{|ה} מאוד', xg)} ו${who(yg)} ${fmt('ישיר{|ה} מאוד', yg)} בלי ריפוד - עלול להיפגע`,
    },
    {
        test: (x, y) => (x.self.jealousy ?? 0) >= 68 && (y.self.independence ?? 0) >= 70,
        pen: 0.07,
        text: (xg, yg) => `${who(xg)} ${fmt('זקוק{|ה} לביטחון ותשומת לב', xg)}, ו${who(yg)} ${fmt('{צריך|צריכה} מרחב', yg)} - מתח מוכר של קרבה מול מרחב`,
    },
];

function simFit(a: Profile, b: Profile, ag: G, bg: G): { score: number; rows: SimRow[]; cross: string[] } | null {
    const rows: SimRow[] = [];
    let sw = 0, ss = 0;
    for (const t of TRAIT_IDS) {
        const x = a.self[t], y = b.self[t];
        if (x === undefined || y === undefined) continue;
        const { kind, w } = PAIR[t];
        const s = pairScore(kind, x, y);
        rows.push({ trait: t, kind, s, a: x, b: y, w });
        sw += w; ss += w * s;
    }
    if (rows.length < 4) return null;

    let score = ss / sw;
    const cross: string[] = [];
    // חיכוכי צירוף: בודקים בשני הכיוונים
    for (const r of CROSS_RULES) {
        if (r.test(a, b)) { score *= 1 - r.pen; cross.push(r.text(ag, bg)); }
        if (r.test(b, a)) { score *= 1 - r.pen; cross.push(r.text(bg, ag)); }
    }
    return { score: clamp(score), rows, cross };
}

// ───────────── 3. ערכים ושפות אהבה ─────────────

function valuesFit(a: Profile, b: Profile): { score: number; shared: string[]; gaps: string[] } | null {
    if (a.values.length < 2 || b.values.length < 2) return null;
    const shared = a.values.filter((v) => b.values.includes(v));
    const overlap = shared.length / Math.min(a.values.length, b.values.length);
    // אקראי ~35% חפיפה; 80%+ = כמעט זהים
    const vScore = clamp(0.15 + 0.85 * (overlap / 0.8));

    let love = 0.7; // לא ידוע = ניטרלי-חיובי
    if (a.loveLanguages.length && b.loveLanguages.length) {
        love = a.loveLanguages.some((l) => b.loveLanguages.includes(l)) ? 1 : 0.55;
    }
    return { score: clamp(0.82 * vScore + 0.18 * love), shared, gaps: [] };
}

/** ערכי ליבה בקהילה הזאת: אם חשוב לאחד ולא נמצא אצל השני, זה חיכוך גם כשהשאר תואם */
const CORE_VALUES = ['torah', 'family'];

// ───────────── 4. דינמיקה: מחלוקת והיקשרות (Gottman + attachment) ─────────────

type Conflict = NonNullable<Profile['conflictStyle']>;
type Attach = NonNullable<Profile['attachment']>;

const CONFLICT_PAIR: Record<Conflict, Record<Conflict, number>> = {
    direct:    { direct: 0.70, cooling: 0.85, yielding: 0.60, withdrawn: 0.30 },
    cooling:   { direct: 0.85, cooling: 0.70, yielding: 0.75, withdrawn: 0.45 },
    yielding:  { direct: 0.60, cooling: 0.75, yielding: 0.55, withdrawn: 0.35 },
    withdrawn: { direct: 0.30, cooling: 0.45, yielding: 0.35, withdrawn: 0.30 },
};

const ATTACH_PAIR: Record<Attach, Record<Attach, number>> = {
    secure:   { secure: 1.00, anxious: 0.85, avoidant: 0.80, mixed: 0.75 },
    anxious:  { secure: 0.85, anxious: 0.55, avoidant: 0.25, mixed: 0.40 },
    avoidant: { secure: 0.80, anxious: 0.25, avoidant: 0.50, mixed: 0.40 },
    mixed:    { secure: 0.75, anxious: 0.40, avoidant: 0.40, mixed: 0.30 },
};

function dynamicsFit(a: Profile, b: Profile, ag: G, bg: G): { score: number; strengths: string[]; frictions: string[] } | null {
    const parts: [number, number][] = [];
    const strengths: string[] = [], frictions: string[] = [];

    if (a.conflictStyle && b.conflictStyle) {
        const s = CONFLICT_PAIR[a.conflictStyle][b.conflictStyle];
        parts.push([s, 0.6]);
        const [x, y] = [a.conflictStyle, b.conflictStyle];
        const pair = (p: Conflict, q: Conflict) => (x === p && y === q) || (x === q && y === p);
        // מי שמדבר מיד ומי שנסוג - בניסוח לפי המגדר של כל אחד
        const sayer = x === 'direct' ? ag : bg, retreater = x === 'direct' ? bg : ag;
        if (pair('direct', 'withdrawn')) frictions.push(`בעימות ${who(sayer)} ${fmt('מדבר{|ת} מיד', sayer)} ו${who(retreater)} ${fmt('מתכנס{|ת}', retreater)} - דפוס רדיפה-נסיגה שדורש מודעות`);
        else if (x === 'withdrawn' && y === 'withdrawn') frictions.push('שניהם נוטים להתכנס בעימות - בעיות עלולות להישאר בלי פתרון');
        else if (s <= 0.36) frictions.push('סגנונות התמודדות עם מחלוקת שמתקשים להיפגש');
        else if (pair('direct', 'cooling')) strengths.push('בעימות אחד מדבר ישר והשני לוקח זמן להירגע - שילוב שעובד');
        else if (s >= 0.75) strengths.push('סגנון התמודדות עם מחלוקת שמשלים אחד את השני');
    }

    if (a.attachment && b.attachment) {
        const s = ATTACH_PAIR[a.attachment][b.attachment];
        parts.push([s, 0.4]);
        const [x, y] = [a.attachment, b.attachment];
        if ((x === 'anxious' && y === 'avoidant') || (x === 'avoidant' && y === 'anxious')) {
            const anx = x === 'anxious' ? ag : bg, avo = x === 'anxious' ? bg : ag;
            frictions.push(`${who(anx)} ${fmt('זקוק{|ה} לקרבה וביטחון', anx)} ו${who(avo)} נוטה לשמור מרחק - דפוס שדורש מודעות משני הצדדים`);
        } else if (x === 'secure' && y === 'secure') strengths.push('שניהם יציבים רגשית - בסיס טוב לקשר');
        else if (x === 'secure' || y === 'secure') strengths.push('לפחות אחד מהם יציב רגשית - מרים את הקשר');
    }

    if (!parts.length) return null;
    const w = parts.reduce((acc, [, wt]) => acc + wt, 0);
    return { score: parts.reduce((acc, [s, wt]) => acc + s * wt, 0) / w, strengths, frictions };
}

// ───────────── 5. פרטים מעשיים ─────────────

/** @param diff גיל הגבר פחות גיל האישה */
function ageFit(diff: number): number {
    if (diff >= 0 && diff <= 4) return 1;
    if (diff > 4) return clamp(1 - (diff - 4) * 0.08 - (diff > 7 ? (diff - 7) * 0.1 : 0));
    if (diff >= -2) return 0.9;
    return clamp(0.9 - (-diff - 2) * 0.15);
}

function sectorFit(a: number, b: number): number {
    const d = Math.abs(a - b);
    if (d <= 0.01) return 1;
    if (d <= 0.6) return 0.88;
    if (d <= 1.1) return 0.8;
    if (d <= 1.6) return 0.62;
    if (d <= 2.1) return 0.5;
    if (d <= 3.1) return 0.2;
    return 0.05;
}

function practicalFit(a: MatchCandidate, b: MatchCandidate): { score: number; sector: number | null; strengths: string[]; frictions: string[] } | null {
    const items: [number, number][] = [];
    const strengths: string[] = [], frictions: string[] = [];
    let sector: number | null = null;

    if (a.age !== null && b.age !== null) {
        const diff = a.age - b.age;
        items.push([ageFit(diff), 0.25]);
        if (Math.abs(diff) <= 2) strengths.push('גילאים קרובים');
        else if (diff < -2) frictions.push(`האישה מבוגרת מהגבר ב-${-diff} שנים`);
        else if (diff > 6) frictions.push(`פער גיל של ${diff} שנים`);
    }
    if (a.sector !== null && b.sector !== null) {
        const s = sectorFit(a.sector, b.sector);
        sector = s;
        items.push([s, 0.45]);
        if (s === 1) strengths.push('אותו מגזר ואורח חיים');
        else if (s <= 0.5) frictions.push(`פער במגזר ואורח חיים${a.sectorLabel && b.sectorLabel ? ` (${a.sectorLabel} מול ${b.sectorLabel})` : ''}`);
    }
    if (a.city && b.city) {
        const same = a.city === b.city;
        items.push([same ? 1 : 0.6, 0.1]);
        if (same) strengths.push('אותה עיר');
    }
    if (a.smoker !== null && b.smoker !== null) {
        items.push([a.smoker === b.smoker ? 1 : 0.45, 0.1]);
        if (a.smoker !== b.smoker) frictions.push('הבדל בעישון');
    }
    if (a.marital && b.marital) {
        items.push([a.marital === b.marital ? 1 : 0.85, 0.1]);
        if (a.marital !== b.marital) frictions.push('מצב משפחתי שונה (אחד מהם לא רווק)');
    }
    if (!items.length) return null;
    const w = items.reduce((acc, [, wt]) => acc + wt, 0);
    return { score: items.reduce((acc, [s, wt]) => acc + s * wt, 0) / w, sector, strengths, frictions };
}

// ───────────── 6. מסנני חובה ─────────────

/** סימן אדום -> איך הוא מתגלה אצל הצד השני (לפי הדירוגים שלו/ה) */
const RED_FLAG_TESTS: Record<string, { test: (p: Profile) => boolean; text: string }> = {
    ego:     { test: (p) => (p.self.ego ?? 0) >= 75, text: 'אגו גבוה מאוד' },
    temper:  { test: (p) => (p.self.calm ?? 100) <= 25, text: 'סערתיות גבוהה' },
    lazy:    { test: (p) => (p.self.order ?? 100) <= 20 && (p.self.ambition ?? 100) <= 30, text: 'זרימה ושאפתנות נמוכה מאוד' },
    cheap:   { test: (p) => (p.self.generosity ?? 100) <= 25, text: 'נתינה נמוכה מאוד' },
    control: { test: (p) => (p.self.jealousy ?? 0) >= 75, text: 'צורך גבוה מאוד בביטחון וקנאה' },
    cold:    { test: (p) => (p.self.warmth ?? 100) <= 25, text: 'הבעת חום נמוכה מאוד' },
    mama:    { test: (p) => (p.self.parents ?? 0) >= 80, text: 'קרבה גבוהה מאוד להורים' },
    mess:    { test: (p) => (p.self.order ?? 100) <= 20, text: 'סדר נמוך מאוד' },
    victim:  { test: (p) => (p.self.sensitivity ?? 0) >= 85 && (p.self.calm ?? 100) <= 30, text: 'רגישות גבוהה וסערתיות' },
};

function redFlagHits(x: MatchCandidate, y: MatchCandidate): string[] {
    if (!x.profile || !y.profile) return [];
    const out: string[] = [];
    for (const f of x.profile.redFlags) {
        const t = RED_FLAG_TESTS[f];
        if (t?.test(y.profile)) {
            out.push(`${who(x.g)} ${fmt('סימנ{|ה}', x.g)} "${pickLabel('v_red', f)}" כסימן אדום, ו${y.g === 'm' ? 'לו' : 'לה'} ${t.text}`);
        }
    }
    return out;
}

// ───────────── הרכבה ─────────────

function confidenceLabel(c: number): MatchResult['confidenceLabel'] {
    return c >= 0.75 ? 'גבוהה' : c >= 0.55 ? 'בינונית' : 'נמוכה';
}

export function tierLabel(score: number): string {
    return score >= 85 ? 'התאמה מצוינת' : score >= 72 ? 'התאמה גבוהה' : score >= 58 ? 'התאמה טובה' : score >= 45 ? 'התאמה בינונית' : 'התאמה חלשה';
}

export function scoreMatch(p: MatchCandidate, q: MatchCandidate): MatchResult {
    // a = גבר, b = אישה (אם שניהם מאותו מין - הסדר שהתקבל)
    const [a, b] = p.g === 'f' && q.g === 'm' ? [q, p] : [p, q];
    const pa = a.profile, pb = b.profile;
    const strengths: string[] = [], frictions: string[] = [], dealbreakers: string[] = [];
    const part: Record<PartKey, number | null> = { needs: null, similarity: null, values: null, dynamics: null, practical: null };
    let aToB: number | null = null, bToA: number | null = null;

    if (pa && pb) {
        // 1. סיפוק הדדי - ממוצע הנדסי
        const ab = needFit(pa, pb), ba = needFit(pb, pa);
        if (ab) aToB = ab.sat;
        if (ba) bToA = ba.sat;
        if (ab && ba) part.needs = Math.sqrt(ab.sat * ba.sat);
        else if (ab || ba) part.needs = (ab ?? ba)!.sat * 0.95;

        const explainNeeds = (seeker: MatchCandidate, other: MatchCandidate, res: ReturnType<typeof needFit>) => {
            if (!res) return;
            const sf = seeker.g === 'f' ? 'ת' : '';
            const good = res.rows.filter((r) => r.fit >= 0.9 && r.w >= 2 && (r.want >= 60 || r.want <= 40)).sort((x, y) => y.w * y.fit - x.w * x.fit)[0];
            if (good) strengths.push(`${who(other.g)} ${word(good.trait, good.has, other.g)} - בדיוק מה ש${who(seeker.g)} מחפש${sf}`);
            const bad = res.rows.filter((r) => r.fit <= 0.5 && r.w >= 1.8 && (r.want >= 60 || r.want <= 40)).sort((x, y) => y.w * (1 - y.fit) - x.w * (1 - x.fit)).slice(0, 2);
            for (const r of bad) {
                frictions.push(`${who(seeker.g)} מחפש${sf} ${word(r.trait, r.want, other.g)}, אבל ${who(other.g)} ${word(r.trait, r.has, other.g)}`);
            }
        };
        explainNeeds(a, b, ab);
        explainNeeds(b, a, ba);

        // 2. דמיון / משלימות
        const sim = simFit(pa, pb, a.g, b.g);
        if (sim) {
            part.similarity = sim.score;
            frictions.push(...sim.cross);
            const close = sim.rows.filter((r) => r.kind === 'sim' && r.s >= 0.9 && r.w >= 1).sort((x, y) => y.w - x.w).slice(0, 2);
            for (const r of close) strengths.push(`קרובים ב${TRAITS[r.trait].label}`);
            const both = sim.rows.filter((r) => r.kind === 'pos' && Math.min(r.a, r.b) >= 70).sort((x, y) => y.w - x.w)[0];
            if (both) strengths.push(`שניהם גבוהים ב${TRAITS[both.trait].label}`);
            const far = sim.rows.filter((r) => r.kind === 'sim' && r.s <= 0.35 && r.w >= 1).sort((x, y) => y.w * (1 - y.s) - x.w * (1 - x.s)).slice(0, 2);
            for (const r of far) frictions.push(`פער ב${TRAITS[r.trait].label}: ${who(a.g)} ${word(r.trait, r.a, a.g)} ו${who(b.g)} ${word(r.trait, r.b, b.g)}`);
            for (const r of sim.rows.filter((r) => r.kind === 'clash' && Math.min(r.a, r.b) >= 72)) frictions.push(`שניהם גבוהים ב${TRAITS[r.trait].label} - עלולים להתנגש`);
            const dom = sim.rows.find((r) => r.trait === 'dominance' && Math.min(r.a, r.b) >= 72);
            if (dom) frictions.push('שניהם דומיננטיים - עלולים להתנגש על החלטות');
        }

        // 3. ערכים
        const val = valuesFit(pa, pb);
        if (val) {
            part.values = val.score;
            if (val.shared.length >= 2) strengths.push(`ערכים משותפים: ${val.shared.slice(0, 3).map((v) => pickLabel('v_top', v)).join(', ')}`);
            else if (val.shared.length === 0) frictions.push('אין ערכים עליונים משותפים');
            for (const cv of CORE_VALUES) {
                for (const [x, y] of [[a, b], [b, a]] as const) {
                    if (x.profile!.values.includes(cv) && !y.profile!.values.includes(cv)) {
                        frictions.push(`"${pickLabel('v_top', cv)}" חשוב ${forThe(x.g)} אך לא בין הערכים העליונים אצל ${the(y.g)}`);
                    }
                }
            }
        }

        // 4. דינמיקה
        const dyn = dynamicsFit(pa, pb, a.g, b.g);
        if (dyn) { part.dynamics = dyn.score; strengths.push(...dyn.strengths); frictions.push(...dyn.frictions); }
    }

    // 5. פרטים מעשיים (גם בלי שאלון)
    const prac = practicalFit(a, b);
    if (prac) { part.practical = prac.score; strengths.push(...prac.strengths); frictions.push(...prac.frictions); }

    // הרכבת הציון הגולמי מהחלקים שיש להם נתונים
    const keys = (Object.keys(part) as PartKey[]).filter((k) => part[k] !== null);
    const wSum = keys.reduce((acc, k) => acc + WEIGHTS[k], 0);
    let raw = wSum ? keys.reduce((acc, k) => acc + WEIGHTS[k] * part[k]!, 0) / wSum : 0.5;

    const hasQuiz = !!(pa && pb);
    // פרטים מעשיים גרועים מורידים את כל הציון, לא רק את החלק שלהם. מגזר רחוק הוא כמעט מסנן חובה
    // בקהילה הזאת: תכונות מושלמות לא מפצות על פער בין חרדי לחילוני.
    if (hasQuiz && part.practical !== null) raw *= 0.85 + 0.15 * part.practical;
    if (prac?.sector != null) raw *= 0.7 + 0.3 * prac.sector;

    // מסנני חובה: כפל, עם רצפה
    let mult = 1;
    if (hasQuiz) {
        for (const hit of [...redFlagHits(a, b), ...redFlagHits(b, a)]) { dealbreakers.push(hit); mult *= 0.9; }
        const fa = pa!.self.family, fb = pb!.self.family;
        if (fa !== undefined && fb !== undefined && Math.abs(fa - fb) >= 50) {
            dealbreakers.push('פער גדול בחשיבות המשפחה והילדים');
            mult *= 0.85;
        }
    }
    raw *= Math.max(0.65, mult);

    // כיול + התחשבות בוודאות
    const calibrated = 100 * sigmoid((raw - CALIB_CENTER) / CALIB_SPREAD);
    const reliab = hasQuiz ? Math.min(profileReliability(pa!), profileReliability(pb!)) : 0;
    // בלי שאלון אצל אחד הצדדים: ציון "חלקי" שנשען רק על גיל/מגזר/עיר, ולכן נשאר קרוב ל-50
    const confidence = hasQuiz ? 0.4 + 0.6 * reliab : 0.3;
    const score = Math.round(clamp(50 + (calibrated - 50) * confidence, 1, 100));

    const parts: MatchPart[] = (Object.keys(PART_LABELS) as PartKey[]).map((key) => ({
        key,
        label: PART_LABELS[key],
        score: part[key] === null ? null : Math.round(part[key]! * 100),
    }));

    const highlights = (Object.keys(part) as PartKey[])
        .filter((k) => part[k] !== null && part[k]! >= 0.72)
        .sort((x, y) => part[y]! - part[x]!)
        .slice(0, 3)
        .map((k) => PART_HIGHLIGHT[k]);

    return {
        score,
        tierLabel: tierLabel(score),
        confidence,
        confidenceLabel: confidenceLabel(confidence),
        partial: !hasQuiz,
        parts,
        aToB: aToB === null ? null : Math.round(aToB * 100),
        bToA: bToA === null ? null : Math.round(bToA * 100),
        strengths: strengths.slice(0, 5),
        frictions: frictions.slice(0, 5),
        dealbreakers,
        highlights,
    };
}

/**
 * הגרסה שמותר להראות לפנוי/ה עצמם: הציון וניסוחים כלליים בלבד.
 * הפירוט (חוזקות, חיכוכים, מסנני חובה, ציוני החלקים) נשען על תשובות פרטיות של הצד השני.
 */
export function publicView(r: MatchResult): MatchResult {
    return { ...r, parts: [], aToB: null, bToA: null, strengths: [], frictions: [], dealbreakers: [] };
}

// ───────────── חיפוש ─────────────

export interface RankedMatch { candidate: MatchCandidate; result: MatchResult }

/**
 * המלצה נשענת על שאלון ההתאמה של שני הצדדים. זוג שלפחות אחד מהם לא מילא שאלון מקבל רק ציון
 * "חלקי" (גיל/מגזר/עיר), ולכן לא מומלץ ולא מדורג.
 */
export function isQuizBased(a: MatchCandidate, b: MatchCandidate): boolean {
    return !!(a.profile && b.profile);
}

/**
 * "מחפש התאמה" עבור `subject`: מדרג את כל המועמדים מהמין השני לפי ציון.
 * maxAgeGap = פער גיל מקסימלי (גם הקריטריון הקיים של כלי השדכן).
 */
export function rankMatches(subject: MatchCandidate, pool: MatchCandidate[], opts: { maxAgeGap?: number; limit?: number } = {}): RankedMatch[] {
    const out: RankedMatch[] = [];
    for (const c of pool) {
        if (c.id === subject.id || c.g === subject.g) continue;
        if (!isQuizBased(subject, c)) continue;
        if (opts.maxAgeGap !== undefined) {
            if (subject.age === null || c.age === null || Math.abs(subject.age - c.age) > opts.maxAgeGap) continue;
        }
        out.push({ candidate: c, result: scoreMatch(subject, c) });
    }
    out.sort((x, y) => y.result.score - x.result.score || y.result.confidence - x.result.confidence);
    return opts.limit ? out.slice(0, opts.limit) : out;
}
