// ---- גיבוי-עוגייה לטיוטות טפסי הוספה ----
// רשת ביטחון שנייה לטיוטות (add_draft_* ב-localStorage): נכתבת רק כאשר השמירה
// ל-localStorage נכשלת - מכסה מלאה (למשל טיוטה ישנה עם תמונות base64 שתופסת
// את כל ה-quota של האתר) או אחסון חסום - כדי שהטקסט שהמשתמש הקליד יישאר אצלו
// גם אחרי יציאה מהעמוד/סגירת הטאב, ולא יאבד בשקט.
//
// עוגייה מוגבלת ל-4KB ולכן נשמר בה טקסט בלבד (בלי תמונות), ואם עדיין גדול -
// משמיטים את הערכים הכבדים ביותר עד שנכנסים למכסה: שחזור חלקי עדיף מכלום.

import { browser } from '$app/environment';

const COOKIE_NAME = 'add_draft_backup';
const MAX_AGE = 60 * 60 * 24 * 7; // שבוע - גיבוי זמני עד שהטיוטה חוזרת ל-localStorage
const MAX_ENCODED = 3800; // תקציב בטוח מתחת לתקרת ה-4KB של עוגייה

/** כל העלים (ערכים שאינם אובייקט) בעומק כלשהו - לצורך השמטת הכבדים כשחורגים מהמכסה */
function collectLeaves(obj: Record<string, unknown>): Array<{ o: Record<string, unknown>; k: string; n: number }> {
    const out: Array<{ o: Record<string, unknown>; k: string; n: number }> = [];
    for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            out.push(...collectLeaves(v as Record<string, unknown>));
        } else {
            out.push({ o: obj, k, n: typeof v === 'string' ? v.length : 0 });
        }
    }
    return out;
}

/** שומר גיבוי טיוטה בעוגייה. `key` = מפתח הטיוטה (add_draft_<category>) - מזהה למי הגיבוי שייך. */
export function saveDraftBackup(key: string, draft: Record<string, unknown>): void {
    if (!browser) return;
    try {
        // עותק JSON-י - ההשמטות למטה לא יגעו באובייקט של הטופס עצמו
        const data = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>;
        const encode = () => encodeURIComponent(JSON.stringify({ c: key, d: data }));
        let encoded = encode();
        while (encoded.length > MAX_ENCODED) {
            const leaves = collectLeaves(data).filter((l) => l.n > 0);
            if (!leaves.length) break;
            leaves.sort((a, b) => b.n - a.n);
            const { o, k } = leaves[0];
            const v = o[k];
            // ערך ארוך (תיאור וכד') נחתך בהדרגה ולא נזרק - עדיף חצי תיאור מכלום
            if (typeof v === 'string' && v.length > 120) o[k] = v.slice(0, Math.floor(v.length / 2));
            else delete o[k];
            encoded = encode();
        }
        document.cookie = `${COOKIE_NAME}=${encoded};path=/;max-age=${MAX_AGE};samesite=lax`;
    } catch { /* עוגיות חסומות - אין עוד רשת ביטחון */ }
}

/** מחזיר את גיבוי הטיוטה של המפתח הזה, או null אם אין / שייך לטופס אחר. */
export function loadDraftBackup(key: string): Record<string, unknown> | null {
    if (!browser) return null;
    try {
        const m = document.cookie.match(/(?:^|;\s*)add_draft_backup=([^;]+)/);
        if (!m) return null;
        const parsed = JSON.parse(decodeURIComponent(m[1]));
        return parsed?.c === key && parsed.d && typeof parsed.d === 'object'
            ? (parsed.d as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

/** מוחק את הגיבוי אחרי פרסום מוצלח - רק אם הוא אכן שייך למפתח הזה. */
export function clearDraftBackup(key: string): void {
    if (!browser) return;
    if (!loadDraftBackup(key)) return; // הגיבוי של טופס אחר - לא נוגעים
    try {
        document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;samesite=lax`;
    } catch { /* עוגיות חסומות */ }
}
