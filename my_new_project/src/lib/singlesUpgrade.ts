// "שדרג את כרטיסך": אילו מהתאים שנוספו לכרטיס הפנויים עדיין ריקים —
// רמה 2 (מידע לשדכנים בלבד) ורמה 3 (שאלון ההתאמה של המערכת).
// קל במכוון: לא גורר את בנק השאלות. אותה לוגיקה כמו בקובץ המקביל באתר הפנויים.

import { categoryConfig } from './categoryFields';
import { QUIZ_FIELD_KEY } from './singlesQuizKey';

const MATCHMAKER_KEYS = (categoryConfig.singles?.fields ?? []).filter((f) => f.group === 'matchmakers').map((f) => f.key);

export interface SinglesUpgrade {
    /** תא "לשדכנים בלבד" מולא */
    matchmakers: boolean;
    /** שאלון ההתאמה נענה (לפחות חלקית) */
    quiz: boolean;
    /** הרמה הראשונה שחסרה — אליה מפנה המדבקה */
    level: 2 | 3;
}

/** null = שני התאים כבר מולאו, אין מה לשדרג */
export function singlesUpgradeNeeded(extraFields: unknown): SinglesUpgrade | null {
    let ef: Record<string, unknown> = {};
    if (typeof extraFields === 'string') {
        try { ef = JSON.parse(extraFields) ?? {}; } catch { /* פורמט פגום - נחשב ריק */ }
    } else if (extraFields && typeof extraFields === 'object') {
        ef = extraFields as Record<string, unknown>;
    }

    const matchmakers = MATCHMAKER_KEYS.some((k) => typeof ef[k] === 'string' && (ef[k] as string).trim() !== '');

    let quiz = false;
    const raw = ef[QUIZ_FIELD_KEY];
    try {
        const q = (typeof raw === 'string' ? (raw.trim() ? JSON.parse(raw) : null) : raw) as { answers?: unknown } | null;
        quiz = !!q && typeof q === 'object' && !!q.answers && typeof q.answers === 'object' && Object.keys(q.answers).length > 0;
    } catch { /* פורמט פגום - כאילו לא נענה */ }

    if (matchmakers && quiz) return null;
    return { matchmakers, quiz, level: matchmakers ? 3 : 2 };
}
