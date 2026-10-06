// פרופיל מסכם של שאלון ההתאמה - מה שמוצג בסוף השאלון, ומה שהשדכן רואה בכרטיס.
// פשוט "תצוגה" של Profile (שמחושב ב-singlesQuestionnaire.ts): כל המדדים, מילים בולטות,
// ערכים וסימנים, פערים בין מה שנאמר למה שמושך, ומידת הדיוק של הנתונים.

import { TRAIT_IDS, TRAITS, describeGap, fmt, type G, type Profile, type TraitId } from './singlesQuestionnaire';
import { TRAIT_WORDS, buildSections } from './singlesQuestionnaireData';

export const TRAIT_GROUPS: { title: string; ids: TraitId[] }[] = [
    { title: 'אופי ומזג', ids: ['ego', 'sensitivity', 'warmth', 'humor', 'dominance', 'independence', 'calm'] },
    { title: 'סגנון חיים', ids: ['ambition', 'order', 'spontaneity', 'sociability', 'generosity'] },
    { title: 'זוגיות ומשפחה', ids: ['jealousy', 'flexibility', 'romance', 'family', 'depth', 'directness', 'support', 'provider', 'parents'] },
];

/** סגנון התמודדות עם מחלוקת - בגוף שלישי, בנטייה לפי מגדר מי שמתואר */
export const CONFLICT_LABELS: Record<NonNullable<Profile['conflictStyle']>, string> = {
    direct: 'מדבר{|ת} מיד על מה שמפריע',
    cooling: '{צריך|צריכה} זמן להירגע ואז מדבר{|ת}',
    yielding: 'מוותר{|ת} כדי להימנע ממתח',
    withdrawn: 'נפגע{|ת} ומתכנס{|ת} עד שמבינים',
};

let pickMap: Map<string, string> | null = null;
/** התווית של אפשרות בשאלת pick (ערכים / סימנים אדומים / שפות אהבה) */
export function pickLabel(questionId: string, optionId: string): string {
    if (!pickMap) {
        pickMap = new Map();
        for (const s of buildSections('m')) {
            for (const q of s.questions) {
                if (q.kind === 'pick') for (const o of q.options) pickMap.set(`${q.id}:${o.id}`, o.text);
            }
        }
    }
    return pickMap.get(`${questionId}:${optionId}`) ?? optionId;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * כמה אפשר לסמוך על הפרופיל, 0-1: כמה מהשאלון נענה, כמה תכונות יש עליהן נתון,
 * והורדה כששמנו לב לתשובות שחוזרות על עצמן או לתמונה מחמיאה מדי.
 */
export function profileReliability(p: Profile): number {
    const cov = p.quality.total ? p.quality.answered / p.quality.total : 0;
    const traitCov = (Object.keys(p.self).length + Object.keys(p.seeks).length) / (TRAIT_IDS.length * 2);
    let r = 0.5 * clamp01(cov / 0.8) + 0.5 * clamp01(traitCov / 0.7);
    if (p.quality.straightlining) r *= 0.8;
    if (p.quality.flattering) r *= 0.9;
    return r;
}

export interface TraitRow {
    id: TraitId;
    label: string;
    lowWord: string;
    highWord: string;
    /** מי אני, 0-100 */
    self?: number;
    /** מה אני מחפש/ת, 0-100 */
    seeks?: number;
}

export interface ProfileSummary {
    selfWords: string[];
    seeksWords: string[];
    groups: { title: string; rows: TraitRow[] }[];
    conflict: string | null;
    loveLanguages: string[];
    values: string[];
    redFlags: string[];
    /** פערים בין הדירוג הישיר לתשובות העקיפות, בניסוח מוכן */
    insights: string[];
    /** כמה מהשאלון נענה, 0-100 */
    completeness: number;
    reliability: 'high' | 'medium' | 'low';
    notes: string[];
    /** יש די נתונים כדי שהמערכת תחפש התאמה */
    ready: boolean;
}

function words(scores: Partial<Record<TraitId, number>>, n: number, subject: G): string[] {
    return (Object.entries(scores) as [TraitId, number][])
        .filter(([, s]) => Math.abs(s - 50) >= 12)
        .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
        .slice(0, n)
        .map(([t, s]) => fmt(TRAIT_WORDS[t][s >= 50 ? 'high' : 'low'], subject));
}

export function buildProfileSummary(g: G, p: Profile): ProfileSummary {
    const partner: G = g === 'm' ? 'f' : 'm';
    const rowOf = (id: TraitId): TraitRow => ({
        id,
        label: TRAITS[id].label,
        lowWord: TRAIT_WORDS[id].low,
        highWord: TRAIT_WORDS[id].high,
        self: p.self[id],
        seeks: p.seeks[id],
    });
    const groups = TRAIT_GROUPS
        .map((grp) => ({ title: grp.title, rows: grp.ids.map(rowOf).filter((r) => r.self !== undefined || r.seeks !== undefined) }))
        .filter((grp) => grp.rows.length > 0);

    const completeness = p.quality.total ? Math.round((p.quality.answered / p.quality.total) * 100) : 0;
    const rel = profileReliability(p);
    const reliability = rel >= 0.75 ? 'high' : rel >= 0.45 ? 'medium' : 'low';

    const notes: string[] = [];
    if (p.quality.straightlining) notes.push('כמעט כל התשובות ב"מה מפריע / מה מושך" זהות - המערכת תיתן להן משקל נמוך. כדאי לחזור ולגוון.');
    if (p.quality.flattering) notes.push('כמעט כל התכונות החיוביות דורגו גבוה - המערכת תתייחס לדירוג העצמי בזהירות.');
    if (completeness < 60) notes.push('ככל שתענו על יותר שאלות, ההתאמה תהיה מדויקת יותר.');

    return {
        selfWords: words(p.self, 5, g),
        seeksWords: words(p.seeks, 5, partner),
        groups,
        conflict: p.conflictStyle ? fmt(CONFLICT_LABELS[p.conflictStyle], g) : null,
        loveLanguages: p.loveLanguages.map((id) => pickLabel('v_love', id)),
        values: p.values.map((id) => pickLabel('v_top', id)),
        redFlags: p.redFlags.map((id) => pickLabel('v_red', id)),
        insights: p.gaps.slice(0, 3).map((x) => describeGap(x, g)),
        completeness,
        reliability,
        notes,
        ready: p.quality.answered >= 15 && Object.keys(p.self).length >= 8 && Object.keys(p.seeks).length >= 6,
    };
}
