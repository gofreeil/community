// גישה ללוח הפנויים/פנויות — "מועדון סגור".
// מודל היברידי (לפי החלטת המשתמש):
//   • מי שפרסם כרטיס משלו שאושר (status='active') — גישה אוטומטית.
//   • כל השאר (הורים/שדכנים) — מבקשים גישה, וסופר-אדמין מאשר בפאנל /admin/singles-review.
// הבקשות נשמרות כפריטי category='singles_access' (קטגוריה חופשית, בלי שינוי סכמה בבאקאנד).
// הסטטוס נשמר ב-extra_fields.status ('pending' | 'approved' | 'rejected') — בדיוק כמו singles_request.

import { getItemsByUserId, getItemsByCategory, getDbItemById, createItem, updateItem } from './db';
import { markSinglesRequestMessagesHandled, type SinglesRequestDecision } from './singlesRequestNotifications';
import { getMatchmakerStatus } from './matchmaker';

export type SinglesAccessStatus = 'granted' | 'pending' | 'none' | 'unavailable';

function reqStatus(extra_fields: string | null | undefined): string {
    try { return String(JSON.parse(extra_fields || '{}').status || 'pending'); } catch { return 'pending'; }
}

/**
 * מחזיר את מצב הגישה של המשתמש ללוח הפנויים.
 * 'unavailable' = תקלת Strapi זמנית — אי-אפשר לקבוע גישה. הקוראים חייבים
 * להציג "נסה שוב" ולא לזרוק משתמש מאושר החוצה כאילו אין לו גישה.
 */
export async function getSinglesAccessStatus(
    userId: string | null | undefined,
    isSuperAdmin = false,
): Promise<SinglesAccessStatus> {
    if (isSuperAdmin) return 'granted';
    if (!userId) return 'none';
    const uid = String(userId);
    let hadError = false;

    // 1) בעל כרטיס פנויים מאושר (active) — גישה אוטומטית.
    try {
        const own = await getItemsByUserId(uid);
        if (own.some((i) => i.category === 'singles' && i.status === 'active')) return 'granted';
    } catch { hadError = true; /* ממשיכים לבדיקת בקשת הגישה */ }

    // 2) שדכן מערכת מאושר — גישה אוטומטית ללוח (חייב לראות כרטיסים כדי לשדך).
    try {
        if ((await getMatchmakerStatus(uid, false)) === 'approved') return 'granted';
    } catch { hadError = true; /* ממשיכים לבדיקת בקשת הגישה */ }

    // 3) בקשת גישה מפורשת (הורה/שדכן).
    try {
        const reqs = await getItemsByCategory('singles_access');
        const mine = reqs.filter((r) => r.user_id === uid);
        if (mine.some((r) => reqStatus(r.extra_fields) === 'approved')) return 'granted';
        if (mine.some((r) => reqStatus(r.extra_fields) === 'pending')) return 'pending';
    } catch { hadError = true; /* אין קטגוריה עדיין = אין בקשות */ }

    // הבדיקות לא הניבו תשובה חיובית ולפחות אחת נכשלה — אין ודאות
    return hadError ? 'unavailable' : 'none';
}

export const SINGLES_ACCESS_ROLES = ['single', 'parent', 'matchmaker'] as const;
export type SinglesAccessRole = (typeof SINGLES_ACCESS_ROLES)[number];

/**
 * בדיקה טרייה (עוקפת cache) אם למשתמש כבר יש בקשת גישה פתוחה/מאושרת.
 * הבדיקה הרגילה קוראת רשימת קטגוריה עם cache של 30 שניות, וב-Vercel כל
 * מופע שרת מחזיק cache משלו - שליחה חוזרת בתוך החלון הזה יצרה בקשה כפולה
 * (ושתי התראות למנהל). כאן שואלים את Strapi ישירות על פריטי המשתמש.
 */
export async function findOpenSinglesAccessRequest(userId: string): Promise<'granted' | 'pending' | null> {
    const mine = (await getItemsByUserId(String(userId))).filter((r) => r.category === 'singles_access');
    if (mine.some((r) => reqStatus(r.extra_fields) === 'approved')) return 'granted';
    if (mine.some((r) => reqStatus(r.extra_fields) === 'pending')) return 'pending';
    return null;
}

export type SinglesAccessDecisionResult =
    | { ok: true; nickname: string; role: string; alreadyDecided: boolean }
    | { ok: false; notFound: true };

/**
 * הכרעה בבקשת גישה ללוח (אישור/דחייה) - הלוגיקה היחידה לכל נקודות הכניסה:
 * דף /admin/singles-review וכפתורי אשר/דחה על כרטיס ההתראה בפרופיל.
 * כותבת את הסטטוס על הבקשה, שולחת הודעה למבקש/ת (רק כאן - אף פעם לא לפני
 * החלטת מנהל), ומסמנת את כל התראות המנהלים על הבקשה כטופלו.
 */
export async function decideSinglesAccess(
    requestId: string,
    decision: SinglesRequestDecision,
): Promise<SinglesAccessDecisionResult> {
    let req = null;
    try { req = await getDbItemById(requestId); } catch { req = null; }
    if (!req || req.category !== 'singles_access') {
        req = (await getItemsByCategory('singles_access')).find((r) => r.id === requestId) ?? null;
    }
    if (!req) return { ok: false, notFound: true };
    let ef: Record<string, unknown> = {};
    try { ef = req.extra_fields ? JSON.parse(req.extra_fields) : {}; } catch { ef = {}; }
    const snap = (ef.requester_snapshot ?? {}) as Record<string, unknown>;
    const nickname = String(snap.nickname ?? req.contact ?? '');
    const role = String(ef.role ?? '');
    const alreadyDecided = String(ef.status ?? 'pending') !== 'pending';

    await updateItem(requestId, {
        extra_fields: { ...ef, status: decision, decided_at: new Date().toISOString() },
    });

    // עדכון למבקש (הודעה בתוך האתר). אישור → הגישה נפתחה; דחייה → הודעה מנומסת.
    // פנוי/ה שביקש/ה צפייה בלבד ונדחה/תה — נוסח אישי: הזמנה לפרסם כרטיס + ליווי השדכנים.
    // בקשה שכבר הוכרעה קודם (לחיצה חוזרת) לא שולחת הודעה נוספת.
    const isSingleRejection = decision === 'rejected' && role === 'single';
    const singleRejectionText = [
        'תודה על התעניינותך בלוח הפנויים/פנויות 💗',
        'כדי לשמור על הפרטיות וההדדיות של חברי הלוח, הצפייה בכרטיסים פתוחה רק למי שמפרסמים כרטיס משלהם — ולכן לא נוכל לאשר גישת צפייה בלבד.',
        'נשמח שתצטרף/י בדרך המלאה: פרסום כרטיס אישי משלך — עם אישורו, הלוח ייפתח לך אוטומטית לצפייה. יצירת כרטיס: /add/singles',
        'בנוסף, השדכנים והשדכניות של המערכת מלווים את הלוח באופן אישי — כשיראו לנכון, ישלחו לך הצעות אישיות לצפייה בכרטיסים ספציפיים מהצד השני, להיכרות ולבחינת ההתאמה.',
        'מחכים לכרטיס שלך 💞',
    ].join('\n\n');
    if (req.user_id && !alreadyDecided) {
        try {
            await createItem({
                category: 'message',
                label: decision === 'approved'
                    ? '✅ הגישה ללוח הפנויים אושרה'
                    : 'לגבי בקשת הגישה ללוח הפנויים',
                description: decision === 'approved'
                    ? 'בקשתך אושרה — לוח הפנויים/פנויות פתוח לצפייה. כניסה: /singles'
                    : isSingleRejection
                        ? singleRejectionText
                        : 'לאחר בדיקה, בקשת הגישה ללוח לא אושרה כרגע. אפשר לפנות אלינו דרך "כתוב למערכת" בדף הפרופיל.',
                contact: '',
                user_id: req.user_id,
                icon: decision === 'approved' ? '✅' : '💬',
                color: 'pink',
                extra_fields: { type: 'singles_access_decision', read: false, link: isSingleRejection ? '/add/singles' : '/singles' },
            });
        } catch (e) {
            console.warn('[singlesAccess] notify requester failed:', e instanceof Error ? e.message : e);
        }
    }

    try { await markSinglesRequestMessagesHandled('singles_access', requestId, nickname, decision); }
    catch (e) { console.warn('[singlesAccess] mark admin notifications failed:', e instanceof Error ? e.message : e); }

    return { ok: true, nickname, role, alreadyDecided };
}
