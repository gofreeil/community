// ============================================================
// singlesRequestNotifications.ts - התראות המנהלים על בקשות לוח הפנויים
// (גישה לצפייה / שדכן מערכת)
// ------------------------------------------------------------
// כל סופר-אדמין מקבל עותק משלו של ההתראה (רשומת message נפרדת). החלטה -
// בין אם מדף /admin/singles-review ובין אם מכפתור על כרטיס ההתראה בפרופיל -
// חייבת לסמן את *כל* העותקים כטופלו, אחרת ההתראה נשארת "פתוחה" בתיבה
// בעוד דף האישור מציג 0 ממתינים (זה בדיוק מה שהמשתמש ראה 14.9.2026).
//
// זיהוי ההתראה של הבקשה: extra_fields.request_id (התראות חדשות), ובהתראות
// ישנות שלא שמרו request_id - לפי כינוי המבקש/ת בגוף ההודעה.
// ============================================================

import { getAllSuperAdmins, getMessagesByUserId, updateItem, type DbItem } from './db.js';

export type SinglesRequestKind = 'singles_access' | 'matchmaker_request';
export type SinglesRequestDecision = 'approved' | 'rejected';

const LABEL_PREFIX: Record<SinglesRequestDecision, string> = {
    approved: '✅ אושרה · ',
    rejected: '✖️ נדחתה · ',
};

function parseEf(raw: string | null | undefined): Record<string, unknown> {
    try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

/** סימון עותק התראה אחד כטופל (בלי status - הסכמה של Strapi לא מכירה 'handled'). */
export async function markSinglesRequestMessageHandled(
    msg: DbItem,
    decision: SinglesRequestDecision,
): Promise<void> {
    const ef = parseEf(msg.extra_fields);
    if (ef.handled) return;
    const label = (msg.label ?? '').startsWith(LABEL_PREFIX[decision])
        ? msg.label ?? ''
        : `${LABEL_PREFIX[decision]}${msg.label ?? ''}`;
    await updateItem(msg.id, {
        label,
        extra_fields: { ...ef, handled: true, read: true, decision, handled_at: new Date().toISOString() },
    });
}

/**
 * מסמן כטופלו את כל התראות המנהלים על בקשה מסוימת.
 * @param requestId  מזהה פריט הבקשה (singles_access / matchmaker_request)
 * @param nickname   כינוי המבקש/ת - לזיהוי התראות ישנות בלי request_id
 */
export async function markSinglesRequestMessagesHandled(
    kind: SinglesRequestKind,
    requestId: string,
    nickname: string,
    decision: SinglesRequestDecision,
): Promise<number> {
    let admins: DbItem['user_id'][] = [];
    try { admins = (await getAllSuperAdmins()).map((a) => a.id).filter(Boolean); }
    catch (e) { console.warn('[singlesRequestNotifications] getAllSuperAdmins failed:', e); return 0; }

    let count = 0;
    await Promise.all(
        admins.map(async (adminId) => {
            let msgs: DbItem[] = [];
            try { msgs = await getMessagesByUserId(String(adminId)); }
            catch (e) { console.warn('[singlesRequestNotifications] getMessagesByUserId failed:', e); return; }
            for (const m of msgs) {
                const ef = parseEf(m.extra_fields);
                if (ef.type !== kind || ef.handled) continue;
                const byId = ef.request_id ? String(ef.request_id) === requestId : false;
                const byName = !ef.request_id && !!nickname && String(m.description ?? '').includes(nickname);
                if (!byId && !byName) continue;
                try { await markSinglesRequestMessageHandled(m, decision); count++; }
                catch (e) { console.warn('[singlesRequestNotifications] mark failed:', e); }
            }
        }),
    );
    return count;
}
