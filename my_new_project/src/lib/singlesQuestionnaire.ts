// שאלון אישיות והתאמה (רמה 3 בכרטיס הפנויים) - הזנה למנוע ההתאמה של ה-AI.
//
// עקרונות:
//  1. שני וקטורים נפרדים לכל אדם: "מי אני" (self) ו"מה אני מחפש" (seeks), כל אחד בסקאלה 0-100
//     על אותן 21 תכונות. כך אפשר להצליב: seeks של א' מול self של ב' ולהפך.
//  2. כל וקטור נבנה משני מקורות: ישיר (דירוג עצמי / דירוג בן-הזוג האידיאלי) ועקיף
//     (מה מרתיע, מה מושך, תרחישים, דילמות). הפער ביניהם הוא תובנה בפני עצמה -
//     "אמרת שחשוב לך X, אבל מה שמושך אותך בפועל הוא Y".
//  3. השאלון שונה לגברים ולנשים: ניסוח דקדוקי נכון, בנק מה-מרתיע/מושך שונה, תרחישים ייעודיים,
//     ושאלות המשך שמופיעות רק כשתשובה קודמת מצדיקה אותן.
//
// סימון מגדר בטקסטים: {גבר|אישה} = מגדר הנשאל/ת; <בן הזוג|בת הזוג> = מגדר הצד השני.

import { QUIZ_FIELD_KEY } from './singlesQuizKey';
import { TRAITS, buildSections } from './singlesQuestionnaireData';

export { QUIZ_FIELD_KEY, TRAITS };

export type G = 'm' | 'f';

export type TraitId =
    | 'ego' | 'sensitivity' | 'warmth' | 'humor' | 'dominance' | 'independence'
    | 'calm' | 'ambition' | 'order' | 'spontaneity' | 'sociability' | 'generosity'
    | 'jealousy' | 'flexibility' | 'romance' | 'family' | 'depth' | 'directness'
    | 'support' | 'provider' | 'parents';

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

/** משקלי תכונות. בשאלות react: חיובי = ההתנהגות המתוארת מייצגת את הקוטב הגבוה של התכונה. */
export type Weights = Partial<Record<TraitId, number>>;

/** תנאי להצגת שאלת המשך, לפי תשובה קודמת */
export interface Cond { id: string; gte?: number; lte?: number; eq?: string }

interface Base { id: string; text: string; /** רק לנשאל/ת במגדר הזה */ g?: G; when?: Cond }

export interface RateQ extends Base { kind: 'rate'; trait: TraitId; /** על עצמי, או איפה הייתי רוצה את בן/בת הזוג */ about: 'self' | 'partner' }
export interface ReactQ extends Base {
    kind: 'react';
    /** bother = כמה זה מפריע; attract = כמה זה מושך */
    mode: 'bother' | 'attract';
    w: Weights;
    /** כמה מהאות נספר גם כהיסק על האדם עצמו (אנשים נוטים לחפש דומים) */
    mirror: number;
}
export interface ChoiceQ extends Base {
    kind: 'choice';
    options: { id: string; text: string; self?: Weights; seeks?: Weights }[];
}
export interface PickQ extends Base { kind: 'pick'; max: number; options: { id: string; text: string }[] }
export interface TextQ extends Base { kind: 'text'; placeholder?: string }
export type Question = RateQ | ReactQ | ChoiceQ | PickQ | TextQ;

export interface QuizSection {
    id: string;
    icon: string;
    title: string;
    intro: string;
    scale?: { low: string; high: string };
    questions: Question[];
}

/** מזהה שאלה -> ערך (מספר, מזהה אפשרות, מערך מזהים או טקסט) */
export type Answers = Record<string, number | string | string[]>;

// ───────────── מגדר וטקסט ─────────────

/** ערך שדה "מין" בטופס ('גבר' / 'אישה') -> G */
export function toG(v: unknown): G | null {
    const s = String(v ?? '').trim();
    if (s.includes('אישה') || s.includes('אשה')) return 'f';
    if (s.includes('גבר')) return 'm';
    return null;
}

const otherG = (g: G): G => (g === 'm' ? 'f' : 'm');

/** מחיל מגדר על טקסט. self = מגדר הנושא של {..|..}; <..|..> תמיד הצד ההפוך. */
export function fmt(text: string, self: G): string {
    const partner = otherG(self);
    return text
        .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_m, m: string, f: string) => (self === 'm' ? m : f))
        .replace(/<([^<>|]*)\|([^<>|]*)>/g, (_m, m: string, f: string) => (partner === 'm' ? m : f));
}

// ───────────── חשיפת השאלון לפי מגדר ותשובות ─────────────

function condMet(c: Cond | undefined, a: Answers): boolean {
    if (!c) return true;
    const v = a[c.id];
    if (v === undefined) return false;
    if (c.eq !== undefined) return v === c.eq;
    if (typeof v !== 'number') return false;
    if (c.gte !== undefined && v < c.gte) return false;
    if (c.lte !== undefined && v > c.lte) return false;
    return true;
}

/** הפרקים והשאלות שרלוונטיים לנשאל/ת הזה/זו, בהינתן תשובותיו/ה עד כה */
export function quizFor(g: G, answers: Answers): QuizSection[] {
    return buildSections(g)
        .map((s) => ({ ...s, questions: s.questions.filter((q) => (!q.g || q.g === g) && condMet(q.when, answers)) }))
        .filter((s) => s.questions.length > 0);
}

export function isAnswered(q: Question, a: Answers): boolean {
    const v = a[q.id];
    if (q.kind === 'pick') return Array.isArray(v) && v.length > 0;
    if (q.kind === 'text') return typeof v === 'string' && v.trim().length > 0;
    return v !== undefined && v !== '';
}

export function sectionProgress(s: QuizSection, a: Answers): { done: number; total: number } {
    return { done: s.questions.filter((q) => isAnswered(q, a)).length, total: s.questions.length };
}

export function totalProgress(sections: QuizSection[], a: Answers): { done: number; total: number; pct: number } {
    let done = 0, total = 0;
    for (const s of sections) {
        const p = sectionProgress(s, a);
        done += p.done; total += p.total;
    }
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ───────────── חישוב פרופיל ─────────────

export interface Gap {
    kind: 'self' | 'seeks';
    trait: TraitId;
    /** מה שנאמר במפורש (0-100) */
    direct: number;
    /** מה שעולה מהתשובות העקיפות (0-100) */
    indirect: number;
}

export interface Profile {
    /** מי אני, 0-100 לכל תכונה (50 = אמצע). חסרה תכונה = אין די עדות. */
    self: Partial<Record<TraitId, number>>;
    /** מה אני מחפש/ת בבן/בת זוג, 0-100 */
    seeks: Partial<Record<TraitId, number>>;
    /** פערים בין ישיר לעקיף, מהגדול לקטן */
    gaps: Gap[];
    conflictStyle?: 'direct' | 'cooling' | 'yielding' | 'withdrawn';
    attachment?: 'secure' | 'anxious' | 'avoidant' | 'mixed';
    loveLanguages: string[];
    values: string[];
    redFlags: string[];
    quality: {
        answered: number;
        total: number;
        /** תשובות זהות לרוב השאלות העקיפות - כנראה לא נבחנו באמת */
        straightlining: boolean;
        /** כמעט כל התכונות החיוביות בדירוג מקסימלי - תמונה מחמיאה מדי */
        flattering: boolean;
    };
}

interface Acc { sum: number; wt: number }
type AccMap = Partial<Record<TraitId, Acc>>;

function add(m: AccMap, t: TraitId, signal: number, weight: number) {
    const a = (m[t] ??= { sum: 0, wt: 0 });
    a.sum += signal * weight;
    a.wt += weight;
}

const clamp1 = (x: number) => Math.max(-1, Math.min(1, x));
const score = (a: Acc | undefined, minWt: number): number | undefined =>
    a && a.wt >= minWt ? Math.round(50 + 50 * clamp1(a.sum / a.wt)) : undefined;

const CONFLICT: Record<string, Profile['conflictStyle']> = { a: 'direct', b: 'cooling', c: 'yielding', d: 'withdrawn' };
const POSITIVE_TRAITS: TraitId[] = ['warmth', 'generosity', 'calm', 'humor', 'flexibility', 'support'];

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function computeProfile(g: G | null, answers: Answers): Profile {
    const empty: Profile = {
        self: {}, seeks: {}, gaps: [], loveLanguages: [], values: [], redFlags: [],
        quality: { answered: 0, total: 0, straightlining: false, flattering: false },
    };
    if (!g) return empty;

    const sections = quizFor(g, answers);
    const selfDir: AccMap = {}, selfInd: AccMap = {}, selfAll: AccMap = {};
    const seekDir: AccMap = {}, seekInd: AccMap = {}, seekAll: AccMap = {};
    const reactVals: number[] = [];
    const out: Profile = { ...empty, loveLanguages: [], values: [], redFlags: [] };

    for (const s of sections) {
        for (const q of s.questions) {
            const v = answers[q.id];
            if (v === undefined) continue;

            if (q.kind === 'rate' && typeof v === 'number') {
                const sig = (v - 4) / 3;
                // דירוג מפורש נספר בכפול - הצהרה ישירה
                if (q.about === 'self') { add(selfDir, q.trait, sig, 2); add(selfAll, q.trait, sig, 2); }
                else { add(seekDir, q.trait, sig, 2); add(seekAll, q.trait, sig, 2); }
            } else if (q.kind === 'react' && typeof v === 'number') {
                reactVals.push(v);
                // "לא מפריע" / "לא מושך" = ניטרלי, לא היפוך. רק 3-5 נושאים אות.
                const s0 = Math.max(0, v - 2) / 3;
                const s1 = q.mode === 'bother' ? -s0 : s0;
                for (const [t, w] of Object.entries(q.w) as [TraitId, number][]) {
                    const sig = s1 * Math.sign(w), wt = Math.abs(w);
                    add(seekInd, t, sig, wt); add(seekAll, t, sig, wt);
                    add(selfInd, t, sig, wt * q.mirror); add(selfAll, t, sig, wt * q.mirror);
                }
            } else if (q.kind === 'choice' && typeof v === 'string') {
                const opt = q.options.find((o) => o.id === v);
                if (!opt) continue;
                for (const [t, w] of Object.entries(opt.self ?? {}) as [TraitId, number][]) {
                    add(selfInd, t, Math.sign(w), Math.abs(w)); add(selfAll, t, Math.sign(w), Math.abs(w));
                }
                for (const [t, w] of Object.entries(opt.seeks ?? {}) as [TraitId, number][]) {
                    add(seekInd, t, Math.sign(w), Math.abs(w)); add(seekAll, t, Math.sign(w), Math.abs(w));
                }
                if (q.id === 's_fight') out.conflictStyle = CONFLICT[v];
            } else if (q.kind === 'pick' && Array.isArray(v)) {
                if (q.id === 'v_top') out.values = v;
                else if (q.id === 'v_red') out.redFlags = v;
                else if (q.id === 'v_love') out.loveLanguages = v;
            }
        }
    }

    for (const t of TRAIT_IDS) {
        const s = score(selfAll[t], 2); if (s !== undefined) out.self[t] = s;
        const k = score(seekAll[t], 2); if (k !== undefined) out.seeks[t] = k;

        const sd = score(selfDir[t], 2), si = score(selfInd[t], 1);
        if (sd !== undefined && si !== undefined && Math.abs(sd - si) >= 30) out.gaps.push({ kind: 'self', trait: t, direct: sd, indirect: si });
        const kd = score(seekDir[t], 2), ki = score(seekInd[t], 1.5);
        if (kd !== undefined && ki !== undefined && Math.abs(kd - ki) >= 28) out.gaps.push({ kind: 'seeks', trait: t, direct: kd, indirect: ki });
    }
    out.gaps.sort((a, b) => Math.abs(b.direct - b.indirect) - Math.abs(a.direct - a.indirect));
    out.gaps = out.gaps.slice(0, 6);

    // סגנון היקשרות - רק לצורך ה-AI, לא מוצג למשתמש. נגזר מהדירוגים הכלליים.
    const sf = out.self;
    const anx = [sf.jealousy, sf.sensitivity, sf.calm !== undefined ? 100 - sf.calm : undefined].filter((x): x is number => x !== undefined);
    const avo = [sf.independence, sf.warmth !== undefined ? 100 - sf.warmth : undefined].filter((x): x is number => x !== undefined);
    if (anx.length >= 2 && avo.length >= 2) {
        const hiA = mean(anx) >= 58, hiV = mean(avo) >= 58;
        out.attachment = hiA && hiV ? 'mixed' : hiA ? 'anxious' : hiV ? 'avoidant' : 'secure';
    }

    // איכות הנתונים - כדי שה-AI ידע כמה לסמוך
    const prog = totalProgress(sections, answers);
    const modal = reactVals.length >= 10
        ? Math.max(...[1, 2, 3, 4, 5].map((n) => reactVals.filter((x) => x === n).length)) / reactVals.length
        : 0;
    const pos = POSITIVE_TRAITS.map((t) => answers[`r_${t}`]).filter((x): x is number => typeof x === 'number');
    out.quality = {
        answered: prog.done, total: prog.total,
        straightlining: modal >= 0.8,
        flattering: pos.length >= 5 && mean(pos) >= 6.2,
    };
    return out;
}

// ───────────── שמירה וקריאה ─────────────

export function parseAnswers(raw: unknown): Answers {
    if (typeof raw !== 'string' || !raw.trim()) return {};
    try {
        const o = JSON.parse(raw);
        if (o && typeof o === 'object' && o.answers && typeof o.answers === 'object') return o.answers as Answers;
    } catch { /* פורמט פגום - מתחילים מחדש */ }
    return {};
}

/** המחרוזת שנשמרת ב-extra_fields.ai_quiz: התשובות הגולמיות + הפרופיל המחושב */
export function serializeQuiz(answers: Answers, g: G | null): string {
    return JSON.stringify({ v: 2, g, answers, profile: computeProfile(g, answers), updatedAt: new Date().toISOString() });
}

// ───────────── תצוגה למשתמש ─────────────

/** התכונות הבולטות ביותר (רחוקות ביותר מ-50) */
export function topTraits(scores: Partial<Record<TraitId, number>>, n = 4): { id: TraitId; score: number }[] {
    return (Object.entries(scores) as [TraitId, number][])
        .map(([id, score]) => ({ id, score }))
        .sort((x, y) => Math.abs(y.score - 50) - Math.abs(x.score - 50))
        .slice(0, n);
}

/** משפט "נקודה למחשבה" על פער בין מה שנאמר למה שמושך. מנוסח לנשאל/ת במגדרו/ה. */
export function describeGap(gap: Gap, g: G): string {
    const t = TRAITS[gap.trait];
    // התיאור מתייחס לצד השני (seeks) או לעצמי (self); הקצה הגבוה/נמוך נבחר לפי כיוון הפער
    const subj: G = gap.kind === 'seeks' ? otherG(g) : g;
    const dirLabel = fmt(gap.direct >= gap.indirect ? t.high : t.low, subj);
    const indLabel = fmt(gap.direct >= gap.indirect ? t.low : t.high, subj);
    return gap.kind === 'seeks'
        ? `בדירוג הישיר ביקשת ש${fmt('<בן הזוג|בת הזוג> <יהיה|תהיה>', g)}: ${dirLabel}. אבל מה שמושך אותך בפועל קרוב יותר ל: ${indLabel}.`
        : `בדירוג הישיר תיארת את עצמך כ${dirLabel}, אבל התשובות העקיפות מציירות תמונה קרובה יותר ל: ${indLabel}.`;
}
