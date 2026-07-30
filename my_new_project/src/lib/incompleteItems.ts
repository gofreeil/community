// זיהוי פריטים שהמיקום שלהם לא שלם - הבסיס למסך "נכסים להשלמה" בלוח הניהול.
//
// למה זה נחוץ: הלוח השכונתי מסנן לפי התאמת שם עיר/שכונה. פריט שנשמר עם שם
// שאינו ברשימה (יבוא שבו שדה השכונה הוא כתובת רחוב, אזור במקום עיר, שכונה
// שלא נבחרה) לא שייך לאף לוח שכונתי. רשת הביטחון במפה מציגה אותו ברמת העיר
// כדי שלא ייעלם, אבל זו הקלה זמנית - המקום הנכון שלו עדיין חסר, ורק אדם
// שמכיר את הפריט יכול להשלים אותו.

import { canonicalCity, citiesAndNeighborhoods, isKnownNeighborhood } from './neighborhoodsData';

export type LocationProblem =
    | 'city_unknown'           // שדה העיר אינו עיר מזוהה (אזור, טקסט חופשי, ריק)
    | 'neighborhood_missing'   // העיר תקינה אבל לא נבחרה שכונה
    | 'neighborhood_unknown'   // שם השכונה אינו ברשימת השכונות של העיר
    | 'no_pin';                // אין קואורדינטות - הפריט לא ממוקם בנקודה על המפה

export const PROBLEM_LABELS: Record<LocationProblem, string> = {
    city_unknown:         'עיר לא מזוהה',
    neighborhood_missing: 'חסרה שכונה',
    neighborhood_unknown: 'שכונה לא מזוהה',
    no_pin:               'בלי פין על המפה',
};

export const PROBLEM_HINTS: Record<LocationProblem, string> = {
    city_unknown:         'הערך בשדה העיר אינו עיר ברשימה - הפריט אינו שייך לאף לוח עירוני',
    neighborhood_missing: 'הפריט מוצג בכל שכונות העיר במקום בשכונה שלו',
    neighborhood_unknown: 'שם השכונה אינו ניתן לבחירה באף בורר - הפריט מוצג ברמת העיר',
    no_pin:               'אין קואורדינטות, ולכן אין נקודה מדויקת על המפה',
};

/** דירוג חומרה - כמה השלמת הפריט דחופה. גבוה = דחוף יותר. */
export const PROBLEM_SEVERITY: Record<LocationProblem, number> = {
    city_unknown:         3,
    neighborhood_unknown: 2,
    neighborhood_missing: 1,
    no_pin:               0,
};

export interface LocatableItem {
    city?: string | null;
    neighborhood?: string | null;
    lat?: number | null;
    lng?: number | null;
    extra_fields?: string | null;
}

type ApprovedList = ReadonlyArray<{ name: string; city: string }> | null | undefined;

function extra(item: LocatableItem): Record<string, unknown> {
    try {
        return item.extra_fields ? (JSON.parse(item.extra_fields) as Record<string, unknown>) ?? {} : {};
    } catch {
        return {};
    }
}

/**
 * האם האדמין כבר קבע שהמיקום של הפריט תקין כפי שהוא? משמש לגמ"ח ארצי ולכל
 * פריט שאין לו באמת עיר - בלי זה הוא היה נשאר ברשימה לנצח ואי-אפשר היה לסיים.
 */
export function isLocationApproved(item: LocatableItem): boolean {
    return extra(item).location_ok === true;
}

/** מזהה האדמין שהמשימה הועברה אליו, אם הועברה. */
export function locationAssignee(item: LocatableItem): { id: string; name: string } | null {
    const ef = extra(item);
    const id = String(ef.location_assignee ?? '').trim();
    if (!id) return null;
    return { id, name: String(ef.location_assignee_name ?? '') || id };
}

/** כל הבעיות שיש למיקום הפריט, מהחמורה לקלה. */
export function locationProblems(item: LocatableItem, approved?: ApprovedList): LocationProblem[] {
    const out: LocationProblem[] = [];
    const city = canonicalCity(item.city);
    const nb = (item.neighborhood ?? '').trim();

    if (!city || !citiesAndNeighborhoods[city]) {
        out.push('city_unknown');
    } else if (!nb) {
        out.push('neighborhood_missing');
    } else if (!isKnownNeighborhood(city, nb, approved)) {
        out.push('neighborhood_unknown');
    }

    if (item.lat == null || item.lng == null) out.push('no_pin');

    return out.sort((a, b) => PROBLEM_SEVERITY[b] - PROBLEM_SEVERITY[a]);
}

/**
 * האם הפריט דורש השלמה ידנית?
 *
 * @param includeMissingPin האם גם פריט שהמיקום הטקסטואלי שלו תקין אבל אין לו
 *        פין נחשב "להשלמה". כברירת מחדל לא: הוא מוצג בשכונה הנכונה, ורק הנקודה
 *        המדויקת חסרה - זו השלמה נחמדה, לא תקלה.
 */
export function needsCompletion(
    item: LocatableItem,
    approved?: ApprovedList,
    includeMissingPin = false,
): boolean {
    if (isLocationApproved(item)) return false;
    const problems = locationProblems(item, approved);
    if (!problems.length) return false;
    if (problems.some((p) => p !== 'no_pin')) return true;
    return includeMissingPin;
}
