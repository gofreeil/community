// פידבק שדכנים על ציוני ההתאמה - טיפוסים, תוויות וחישוב סטטיסטיקות, משותף לשרת ולקליינט.
// כל דירוג נשמר כפריט Strapi בקטגוריה match_feedback (extra_fields), כמו בקשות השדכנות וההצעות לשאלון -
// בלי שינוי סכמה בבאקאנד. הדירוג מצרף "צילום" של ציון המערכת ברגע הדירוג, כדי שאפשר יהיה
// להשוות בין מה שהמערכת חשבה למה שהשדכן/ית חושב/ת, גם אחרי שהמנוע ישתנה.
//
// הקובץ טהור (בלי רשת/DB) - summarizeFeedback נבדק ומשמש גם את מסך הניהול.

import type { PartKey } from './singlesMatching';

export const MATCH_FEEDBACK_CATEGORY = 'match_feedback';

export type Verdict = 'good' | 'maybe' | 'bad';

export const VERDICT_LABELS: Record<Verdict, string> = {
    good: '👍 מתאים',
    maybe: '🤔 אולי',
    bad: '👎 לא מתאים',
};

/** הציון שמעליו המערכת "אומרת" שהזוג טוב (תואם ל-tierLabel: "התאמה טובה" = 58+) */
export const SYSTEM_GOOD_SCORE = 58;
/** הציון שמתחתיו המערכת "אומרת" שהזוג חלש (תואם ל-tierLabel: מתחת ל"בינונית" = 45) */
export const SYSTEM_WEAK_SCORE = 45;

export const MAX_FEEDBACK_NOTE = 600;

export const PART_KEYS: PartKey[] = ['needs', 'similarity', 'values', 'dynamics', 'practical'];

/** מה הכי השפיע על ההחלטה. `part` = איזה חלק בציון המערכת זה מייצג (null = משהו שהמערכת לא רואה). */
export interface FeedbackReason { id: string; label: string; part: PartKey | null }

export const FEEDBACK_REASONS: FeedbackReason[] = [
    { id: 'sector', label: 'מגזר ואורח חיים', part: 'practical' },
    { id: 'age', label: 'גיל', part: 'practical' },
    { id: 'location', label: 'עיר / מרחק', part: 'practical' },
    { id: 'personality', label: 'אופי וסגנון חיים', part: 'similarity' },
    { id: 'values', label: 'ערכים', part: 'values' },
    { id: 'family', label: 'משפחה וילדים', part: 'values' },
    { id: 'communication', label: 'תקשורת ומחלוקות', part: 'dynamics' },
    { id: 'expectations', label: 'מה כל אחד מחפש', part: 'needs' },
    { id: 'attraction', label: 'משיכה / חיצוניות', part: null },
    { id: 'other', label: 'משהו אחר', part: null },
];

export const REASON_IDS = new Set(FEEDBACK_REASONS.map((r) => r.id));

export interface MatchFeedback {
    id: string;
    matchmakerId: string;
    matchmakerName: string;
    /** מפתח הזוג הבלתי-מסודר (כמו pairKey ב-singlesMatch) */
    pair: string;
    aId: string;
    bId: string;
    aName: string;
    bName: string;
    verdict: Verdict;
    reasons: string[];
    note: string;
    /** צילום ציון המערכת ברגע הדירוג; null אם אי אפשר היה לחשב (חסר מין בכרטיס) */
    score: number | null;
    partial: boolean;
    parts: Partial<Record<PartKey, number | null>>;
    dealbreakers: number;
    createdAt: string;
    updatedAt: string;
}

/** מפתח זוג בלתי-מסודר - זהה ל-pairKey בצד השרת, כך שהקליינט יכול לחשב אותו בלי לייבא קוד שרת */
export function feedbackPairKey(idA: string, idB: string): string {
    return [idA, idB].sort().join('__');
}

// ───────────── סטטיסטיקות ─────────────

export interface PartStat {
    key: PartKey;
    /** ממוצע ציון החלק בזוגות שסומנו "מתאים" / "לא מתאים" */
    avgGood: number | null;
    avgBad: number | null;
    nGood: number;
    nBad: number;
    /** avgGood - avgBad: חיובי = החלק באמת מבדיל בין טובים לרעים; קרוב לאפס/שלילי = לא מנבא */
    gap: number | null;
}

export interface ReasonStat { id: string; label: string; good: number; maybe: number; bad: number }

export interface FeedbackSummary {
    total: number;
    byVerdict: Record<Verdict, number>;
    matchmakers: number;
    /** ממוצע ציון המערכת לפי החלטת השדכנים */
    avgScore: Record<Verdict, number | null>;
    /** מתוך הדירוגים ה"חד-משמעיים" (מתאים/לא מתאים) עם ציון: כמה המערכת הסכימה */
    agreement: { agree: number; disagree: number; rate: number | null };
    /** המערכת אמרה "טוב" (ציון גבוה), השדכנים אמרו "לא מתאים" - הכי חשוב לבדוק */
    falsePositives: MatchFeedback[];
    /** המערכת אמרה "חלש", השדכנים אמרו "מתאים" - התאמות שהמנוע מפספס */
    falseNegatives: MatchFeedback[];
    parts: PartStat[];
    reasons: ReasonStat[];
    /** הציון שמפריד בצורה הטובה ביותר בין "מתאים" ל"לא מתאים"; null אם אין מספיק נתונים */
    bestThreshold: { score: number; accuracy: number } | null;
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x: number | null): number | null => (x === null ? null : Math.round(x * 10) / 10);

/** מינימום דירוגים מכל צד כדי להציע סף מפריד - מתחת לזה זה רעש */
export const MIN_FOR_THRESHOLD = 5;

export function summarizeFeedback(list: MatchFeedback[], listLimit = 10): FeedbackSummary {
    const byVerdict: Record<Verdict, number> = { good: 0, maybe: 0, bad: 0 };
    const scores: Record<Verdict, number[]> = { good: [], maybe: [], bad: [] };
    for (const f of list) {
        byVerdict[f.verdict]++;
        if (f.score !== null) scores[f.verdict].push(f.score);
    }

    // הסכמה: רק "מתאים"/"לא מתאים" עם ציון. "אולי" לא נספר לאף כיוון.
    const decided = list.filter((f) => f.score !== null && (f.verdict === 'good' || f.verdict === 'bad'));
    const agree = decided.filter((f) => (f.verdict === 'good') === (f.score! >= SYSTEM_GOOD_SCORE)).length;

    const falsePositives = list
        .filter((f) => f.verdict === 'bad' && f.score !== null && f.score >= SYSTEM_GOOD_SCORE)
        .sort((x, y) => y.score! - x.score!)
        .slice(0, listLimit);
    const falseNegatives = list
        .filter((f) => f.verdict === 'good' && f.score !== null && f.score < SYSTEM_WEAK_SCORE)
        .sort((x, y) => x.score! - y.score!)
        .slice(0, listLimit);

    const parts: PartStat[] = PART_KEYS.map((key) => {
        const pick = (v: Verdict) => list.filter((f) => f.verdict === v && typeof f.parts[key] === 'number').map((f) => f.parts[key] as number);
        const g = pick('good'), b = pick('bad');
        const avgGood = mean(g), avgBad = mean(b);
        return {
            key,
            avgGood: round1(avgGood),
            avgBad: round1(avgBad),
            nGood: g.length,
            nBad: b.length,
            gap: avgGood !== null && avgBad !== null ? round1(avgGood - avgBad) : null,
        };
    });

    const reasons: ReasonStat[] = FEEDBACK_REASONS.map((r) => {
        const row: ReasonStat = { id: r.id, label: r.label, good: 0, maybe: 0, bad: 0 };
        for (const f of list) if (f.reasons.includes(r.id)) row[f.verdict]++;
        return row;
    });

    // סף מפריד: מחפשים את הציון שממקסם דיוק מאוזן (מתאים נחשב נכון אם מעל הסף, לא מתאים אם מתחתיו)
    let bestThreshold: FeedbackSummary['bestThreshold'] = null;
    if (scores.good.length >= MIN_FOR_THRESHOLD && scores.bad.length >= MIN_FOR_THRESHOLD) {
        let best = -1;
        for (let t = 20; t <= 95; t++) {
            const tpr = scores.good.filter((s) => s >= t).length / scores.good.length;
            const tnr = scores.bad.filter((s) => s < t).length / scores.bad.length;
            const acc = (tpr + tnr) / 2;
            // בשוויון - הסף הקרוב יותר לסף הנוכחי, כדי לא להמליץ על שינוי בלי הצדקה
            if (acc > best + 1e-9 || (Math.abs(acc - best) <= 1e-9 && Math.abs(t - SYSTEM_GOOD_SCORE) < Math.abs(bestThreshold!.score - SYSTEM_GOOD_SCORE))) {
                best = acc;
                bestThreshold = { score: t, accuracy: Math.round(acc * 100) };
            }
        }
    }

    return {
        total: list.length,
        byVerdict,
        matchmakers: new Set(list.map((f) => f.matchmakerId)).size,
        avgScore: { good: round1(mean(scores.good)), maybe: round1(mean(scores.maybe)), bad: round1(mean(scores.bad)) },
        agreement: { agree, disagree: decided.length - agree, rate: decided.length ? Math.round((agree / decided.length) * 100) : null },
        falsePositives,
        falseNegatives,
        parts,
        reasons,
        bestThreshold,
    };
}
