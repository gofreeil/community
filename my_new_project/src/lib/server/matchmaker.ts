// "שדכן מערכת" — משתמש שאושר ע"י סופר-אדמין לקבל כלי שידוך (המלצות התאמה + הפניית
// כרטיסים זה לזה). המודל זהה ל-singlesAccess: הבקשה נשמרת כפריט category='matchmaker_request'
// עם extra_fields.status ('pending' | 'approved' | 'rejected') — בלי שינוי סכמה בבאקאנד.
// כך "האם המשתמש שדכן מאושר" נגזר מהנתונים בלי שדה משתמש חדש ב-Strapi.

import { getItemsByCategory, getItemsByUserId, getDbItemById, createItem, updateItem } from './db';
import { markSinglesRequestMessagesHandled, type SinglesRequestDecision } from './singlesRequestNotifications';

export type MatchmakerStatus = 'approved' | 'pending' | 'none' | 'unavailable';

/** קטגוריית הפריטים שבהם נשמרות בקשות השדכנות */
export const MATCHMAKER_REQUEST_CATEGORY = 'matchmaker_request';

/** פער-גיל מקסימלי (בשנים) שעדיין נחשב "גילאים דומים" להמלצת התאמה ראשונית.
 *  בהמשך יתווספו קריטריונים נוספים (מגזר, עיר, מצב משפחתי...). */
export const AGE_MATCH_THRESHOLD = 5;

function reqStatus(extra_fields: string | null | undefined): string {
    try { return String(JSON.parse(extra_fields || '{}').status || 'pending'); } catch { return 'pending'; }
}

/**
 * מצב בקשת/הרשאת השדכנות של המשתמש.
 * 'unavailable' = תקלת Strapi זמנית — אי-אפשר לקבוע. הקוראים שמגנים על גישה
 * חייבים לטפל בזה כ"לא ודאי" ולא לחסום/לפתוח בטעות.
 * סופר-אדמין הוא תמיד שדכן מאושר (יש לו את כל הכלים ממילא).
 */
export async function getMatchmakerStatus(
    userId: string | null | undefined,
    isSuperAdmin = false,
): Promise<MatchmakerStatus> {
    if (isSuperAdmin) return 'approved';
    if (!userId) return 'none';
    const uid = String(userId);
    try {
        const mine = (await getItemsByCategory(MATCHMAKER_REQUEST_CATEGORY)).filter((r) => r.user_id === uid);
        if (mine.some((r) => reqStatus(r.extra_fields) === 'approved')) return 'approved';
        if (mine.some((r) => reqStatus(r.extra_fields) === 'pending')) return 'pending';
        return 'none';
    } catch {
        return 'unavailable';
    }
}

/**
 * בדיקה טרייה (עוקפת cache) אם למשתמש כבר יש בקשת שדכנות פתוחה/מאושרת -
 * אותה סיבה כמו findOpenSinglesAccessRequest: cache של 30 שניות פר-מופע
 * שרת אפשר בקשה כפולה בשליחה חוזרת מהירה.
 */
export async function findOpenMatchmakerRequest(userId: string): Promise<'approved' | 'pending' | null> {
    const mine = (await getItemsByUserId(String(userId))).filter((r) => r.category === MATCHMAKER_REQUEST_CATEGORY);
    if (mine.some((r) => reqStatus(r.extra_fields) === 'approved')) return 'approved';
    if (mine.some((r) => reqStatus(r.extra_fields) === 'pending')) return 'pending';
    return null;
}

export type MatchmakerDecisionResult =
    | { ok: true; nickname: string; alreadyDecided: boolean }
    | { ok: false; notFound: true };

/**
 * הכרעה בבקשת "שדכן מערכת" - הלוגיקה היחידה לדף /admin/singles-review
 * ולכפתורי אשר/דחה על כרטיס ההתראה בפרופיל. ההודעה למבקש נשלחת רק כאן,
 * אחרי החלטת מנהל; כל התראות המנהלים על הבקשה מסומנות כטופלו.
 */
export async function decideMatchmakerRequest(
    requestId: string,
    decision: SinglesRequestDecision,
): Promise<MatchmakerDecisionResult> {
    let req = null;
    try { req = await getDbItemById(requestId); } catch { req = null; }
    if (!req || req.category !== MATCHMAKER_REQUEST_CATEGORY) {
        req = (await getItemsByCategory(MATCHMAKER_REQUEST_CATEGORY)).find((r) => r.id === requestId) ?? null;
    }
    if (!req) return { ok: false, notFound: true };
    let ef: Record<string, unknown> = {};
    try { ef = req.extra_fields ? JSON.parse(req.extra_fields) : {}; } catch { ef = {}; }
    const snap = (ef.requester_snapshot ?? {}) as Record<string, unknown>;
    const nickname = String(snap.nickname ?? req.contact ?? '');
    const alreadyDecided = String(ef.status ?? 'pending') !== 'pending';

    await updateItem(requestId, {
        extra_fields: { ...ef, status: decision, decided_at: new Date().toISOString() },
    });

    if (req.user_id && !alreadyDecided) {
        try {
            await createItem({
                category: 'message',
                label: decision === 'approved'
                    ? '💘 אושרת כשדכן/ית מערכת'
                    : 'לגבי בקשת השדכנות',
                description: decision === 'approved'
                    ? 'הבקשה שלך אושרה — קיבלת הרשאת שדכן/ית מערכת. נכנסים לכלי השדכנות דרך "כלים לשדכן" בלוח הפנויים/פנויות: /singles/matchmaker'
                    : 'לאחר בדיקה, בקשת השדכנות לא אושרה כרגע. אפשר לפנות אלינו דרך "כתוב למערכת" בדף הפרופיל.',
                contact: '',
                user_id: req.user_id,
                icon: decision === 'approved' ? '💘' : '💬',
                color: 'pink',
                extra_fields: {
                    type: 'matchmaker_decision',
                    read: false,
                    link: decision === 'approved' ? '/singles/matchmaker' : '/singles',
                },
            });
        } catch (e) {
            console.warn('[matchmaker] notify requester failed:', e instanceof Error ? e.message : e);
        }
    }

    try { await markSinglesRequestMessagesHandled('matchmaker_request', requestId, nickname, decision); }
    catch (e) { console.warn('[matchmaker] mark admin notifications failed:', e instanceof Error ? e.message : e); }

    return { ok: true, nickname, alreadyDecided };
}
