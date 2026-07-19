import { createItem, updateItem, deleteItem, getItemsByUserId, getMessagesByUserId, getAllSuperAdmins, getNeighborhoods, approveNeighborhood, rejectNeighborhood, reopenNeighborhood } from './db';

/** נרמול שם מיקום לזיהוי התאמה - מסיר "שכונת"/"שכונה" מובילה ורווחים כפולים */
function normalizeLoc(s: string): string {
    return s.trim().replace(/\s+/g, ' ').replace(/^(שכונת|שכונה)\s+/, '').toLowerCase();
}

export interface LocationDecisionInput {
    decision: 'approve' | 'reject';
    location: string;
    city?: string;
    requesterId?: string | null;
    /** הודעת האדמין שממנה בוצעה ההחלטה (אם ידועה) - תסומן כטופלה גם אם ההתאמה בשם נכשלת */
    adminMsgId?: string;
}

/**
 * סגירה אחידה של בקשת מיקום/שכונה - נקראת מכל מסלול אישור/דחייה
 * (פאנל האדמין "שכונות ממתינות" וכפתורי הכרטיס בפרופיל) כדי שהתוצאה תהיה זהה:
 * 1. הודעת החלטה למבקש (נשלחת פעם אחת - לא משוכפלת אם המסלול השני כבר שלח)
 * 2. סגירת פריטי הבקשה של המבקש (מאפשר לו בקשה עתידית)
 * 3. רשומת השכונה הממתינה (פין על המפה) מסונכרנת - מאושרת/נדחית יחד עם הבקשה,
 *    כך שאישור/דחייה מכרטיס ההודעה בפרופיל מסיר אותה גם מ"שכונות ממתינות" באדמין (ולהפך)
 * 4. הודעות הבקשה בתיבות הסופר-אדמינים מסומנות "טופל" ונשארות כהיסטוריה - לא נמחקות
 */
export async function finalizeLocationDecision(input: LocationDecisionInput): Promise<void> {
    const { decision, location, city, requesterId, adminMsgId } = input;
    const normalized = normalizeLoc(location);

    // 1. הודעת החלטה למבקש
    if (requesterId) {
        try {
            const existing = await getMessagesByUserId(requesterId);
            const alreadyNotified = (existing ?? []).some((m) => {
                try {
                    const ef = JSON.parse(m.extra_fields || '{}') ?? {};
                    return ef?.type === 'location_request_decision' &&
                        String(ef?.decision ?? '') === decision &&
                        normalizeLoc(String(ef?.requested_location ?? '')) === normalized;
                } catch { return false; }
            });
            if (!alreadyNotified) {
                await createItem({
                    category:    'message',
                    label:       decision === 'approve'
                        ? `✅ בקשתך אושרה: "${location}" נוסף לרשימה`
                        : `❌ בקשתך להוספת "${location}" לא אושרה`,
                    description: decision === 'approve'
                        ? `המנהל אישר את בקשתך — "${location}"${city ? ` (${city})` : ''} נוסף לרשימת השכונות וכעת ניתן לבחור בו בפרופיל ובפרסום.`
                        : `המנהל בחן את בקשתך להוסיף את "${location}" והחליט שלא להוסיף אותו כרגע. אפשר לבחור שכונה קיימת או לפנות אלינו דרך "כתוב למערכת" בפרופיל.`,
                    icon:        decision === 'approve' ? '✅' : '❌',
                    color:       decision === 'approve' ? 'green' : 'red',
                    user_id:     requesterId,
                    extra_fields: {
                        type:               'location_request_decision',
                        decision,
                        requested_location: location,
                        decided_at:         new Date().toISOString(),
                    },
                });
            }
        } catch (e) {
            console.warn('[locationDecision] notify requester failed:', e);
        }

        // 2. סגירת פריטי הבקשה של המבקש (כדי שבדיקת הכפילויות תאפשר בקשה עתידית)
        try {
            const reqItems = await getItemsByUserId(requesterId);
            const open = (reqItems ?? []).filter(it =>
                it.category === 'location_request' &&
                (it.status ?? 'pending') !== 'handled' &&
                normalizeLoc(it.label ?? '').includes(normalized));
            await Promise.all(open.map(it => updateItem(it.id, { status: 'handled' })));
        } catch (e) {
            console.warn('[locationDecision] close request items failed:', e);
        }
    }

    // 3. סנכרון רשומת השכונה הממתינה (פין) - כדי שההחלטה תיושם בשני המקומות:
    //    בין אם אושר/נדחה מכרטיס ההודעה בפרופיל ובין אם מ"שכונות ממתינות" באדמין,
    //    הרשומה עוברת לאותו סטטוס ולא נשארת "ממתינה" במקום השני. idempotent -
    //    אם המסלול השני כבר עדכן את הרשומה, לא נמצאת שכונה ממתינה ולא קורה כלום.
    try {
        const pending = await getNeighborhoods('pending');
        const matches = pending.filter(n =>
            normalizeLoc(n.name) === normalized &&
            (!city || !n.city || n.city.trim() === city.trim()));
        await Promise.all(matches.map(n =>
            decision === 'approve'
                ? approveNeighborhood(n.id, 'sync:locationDecision')
                : rejectNeighborhood(n.id, 'sync:locationDecision')));
    } catch (e) {
        console.warn('[locationDecision] sync neighborhood record failed:', e);
    }

    // 4. סימון הודעות הבקשה בתיבות האדמינים כ"טופל" - נשארות בהיסטוריה במקום להימחק
    try {
        const admins = await getAllSuperAdmins();
        const decisionWord = decision === 'approve' ? 'אושר' : 'נדחה';
        for (const admin of admins) {
            let msgs;
            try { msgs = await getMessagesByUserId(admin.id); } catch { continue; }
            const related = (msgs ?? []).filter((m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { /* הודעה ישנה */ }
                if (ef?.handled) return false;
                if (adminMsgId && m.id === adminMsgId) return true;
                const t = String(ef?.type ?? '');
                if (t !== 'location_request' && t !== 'neighborhood_request') return false;
                return normalizeLoc(String(ef?.requested_location ?? '')) === normalized;
            });
            await Promise.all(related.map(async (m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch {}
                await updateItem(m.id, {
                    label: `${decision === 'approve' ? '✅' : '❌'} טופל (${decisionWord}) · ${(m.label ?? '').replace(/^[✅❌📍]+\s*(טופל\s*\([^)]*\)\s*·\s*)?/, '')}`,
                    icon:  decision === 'approve' ? '✅' : '❌',
                    color: decision === 'approve' ? 'green' : 'red',
                    extra_fields: {
                        ...ef,
                        handled:    true,
                        decision,
                        handled_at: new Date().toISOString(),
                    },
                });
            }));
        }
    } catch (e) {
        console.warn('[locationDecision] mark admin messages handled failed:', e);
    }
}

export interface LocationUndoInput {
    /** ההחלטה שמבטלים - כפי שנשמרה על הודעת האדמין (extra_fields.decision) */
    decision: 'approve' | 'reject';
    location: string;
    city?: string;
    requesterId?: string | null;
    /** הודעת האדמין שממנה בוצע הביטול - תשוחזר גם אם ההתאמה בשם נכשלת */
    adminMsgId?: string;
    /** מזהה האדמין המבטל - נשמר על רשומת השכונה לתיעוד */
    undoneBy: string;
}

/**
 * ביטול החלטה על בקשת מיקום/שכונה - "לחצתי אישור בטעות". מחזיר את המצב לרגע
 * שלפני ההחלטה, בסדר הפוך ל-finalizeLocationDecision:
 * 1. רשומת השכונה חוזרת ל-pending (יורדת מהבורר/המפה, חוזרת ל"שכונות ממתינות" באדמין)
 * 2. הודעת ההחלטה ("בקשתך אושרה/נדחתה") נמחקת מתיבת המבקש - שלא יסתמך על מידע שגוי
 * 3. פריטי הבקשה של המבקש חוזרים ל-pending (הבקשה שוב "בטיפול")
 * 4. הודעות "טופל" בתיבות הסופר-אדמינים חוזרות למצב פעיל - עם כפתורי אשר/דחה
 */
export async function undoLocationDecision(input: LocationUndoInput): Promise<void> {
    const { decision, location, city, requesterId, adminMsgId, undoneBy } = input;
    const normalized = normalizeLoc(location);

    // 1. רשומת השכונה: אושרה → מאושרת, נדחתה → דחויה. מחזירים את התואמת ל-pending.
    try {
        const decided = await getNeighborhoods(decision === 'approve' ? 'approved' : 'rejected');
        const matches = decided.filter(n =>
            normalizeLoc(n.name) === normalized &&
            (!city || !n.city || n.city.trim() === city.trim()));
        await Promise.all(matches.map(n => reopenNeighborhood(n.id, `undo:${undoneBy}`)));
    } catch (e) {
        console.warn('[locationDecision] undo reopen neighborhood failed:', e);
    }

    if (requesterId) {
        // 2. מחיקת הודעת ההחלטה מתיבת המבקש (נוצרה ב-finalize; אם המנהל יחליט שוב - תישלח חדשה)
        try {
            const msgs = await getMessagesByUserId(requesterId);
            const decisionMsgs = (msgs ?? []).filter((m) => {
                try {
                    const ef = JSON.parse(m.extra_fields || '{}') ?? {};
                    return ef?.type === 'location_request_decision' &&
                        String(ef?.decision ?? '') === decision &&
                        normalizeLoc(String(ef?.requested_location ?? '')) === normalized;
                } catch { return false; }
            });
            await Promise.all(decisionMsgs.map(m => deleteItem(m.id)));
        } catch (e) {
            console.warn('[locationDecision] undo delete requester notice failed:', e);
        }

        // 3. פתיחת פריטי הבקשה של המבקש מחדש (רק כאלה שנסגרו ע"י החלטה - לא withdrawn)
        try {
            const reqItems = await getItemsByUserId(requesterId);
            const closed = (reqItems ?? []).filter((it) => {
                if (it.category !== 'location_request') return false;
                if ((it.status ?? 'pending') !== 'handled') return false;
                if (!normalizeLoc(it.label ?? '').includes(normalized)) return false;
                try { return !(JSON.parse(it.extra_fields || '{}') ?? {})?.withdrawn; } catch { return true; }
            });
            await Promise.all(closed.map(it => updateItem(it.id, { status: 'pending' })));
        } catch (e) {
            console.warn('[locationDecision] undo reopen request items failed:', e);
        }
    }

    // 4. שחזור הודעות "טופל" בתיבות הסופר-אדמינים - חוזרות לפעילות עם כפתורי אשר/דחה
    try {
        const admins = await getAllSuperAdmins();
        for (const admin of admins) {
            let msgs;
            try { msgs = await getMessagesByUserId(admin.id); } catch { continue; }
            const related = (msgs ?? []).filter((m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { /* הודעה ישנה */ }
                if (!ef?.handled) return false;
                if (adminMsgId && m.id === adminMsgId) return true;
                const t = String(ef?.type ?? '');
                if (t !== 'location_request' && t !== 'neighborhood_request') return false;
                return normalizeLoc(String(ef?.requested_location ?? '')) === normalized;
            });
            await Promise.all(related.map(async (m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch {}
                const { handled, decision: _d, handled_at, ...rest } = ef;
                void handled; void _d; void handled_at;
                await updateItem(m.id, {
                    // אותו regex שמסיר את הקידומת בעת הסימון "טופל" - משחזר את התווית המקורית
                    label: `📍 ${(m.label ?? '').replace(/^[✅❌📍]+\s*(טופל\s*\([^)]*\)\s*·\s*)?/, '')}`,
                    icon:  '📍',
                    color: 'yellow',
                    extra_fields: {
                        ...rest,
                        undone_at: new Date().toISOString(),
                        undone_by: undoneBy,
                    },
                });
            }));
        }
    } catch (e) {
        console.warn('[locationDecision] undo restore admin messages failed:', e);
    }
}

/**
 * סגירת בקשות המיקום הפתוחות של המשתמש עצמו - כשהוא פתר את מיקומו לבד:
 * בחר שכונה קיימת מהרשימה, או עדכן ("סופרסד") בקשה קודמת בבקשה חדשה ומתוקנת.
 *
 * זה מה שמשחרר את החסימה: בעבר בקשה פתוחה אחת חסמה כל בקשה/שינוי עתידי
 * (dedupe "כבר בטיפול"), כך שאם המנהל לא טיפל - המשתמש נתקע. כאן אנחנו:
 *   1. מסמנים את פריטי הבקשה שלו כ"טופל" (withdrawn) → הבדיקה כבר לא חוסמת
 *   2. דוחים רשומות שכונה ממתינות שלו → יורדות מ"שכונות ממתינות" באדמין
 *   3. מסמנים את הודעות הבקשה בתיבות האדמינים כ"טופל" → התור מתנקה
 * בלי לשלוח למשתמש הודעת "נדחה" - הוא פתר בעצמו, לא נדחה.
 *
 * מחזיר את שם הבקשה שנסגרה (אם הייתה) כדי שאפשר יהיה להודיע למשתמש, אחרת null.
 */
export async function withdrawOpenLocationRequests(
    userId: string,
    opts: { city?: string; reason?: 'chose_existing' | 'superseded' } = {},
): Promise<string | null> {
    const { reason = 'chose_existing' } = opts;
    const noteLabel = reason === 'superseded' ? 'המבקש עדכן את בקשתו' : 'המשתמש בחר שכונה קיימת';
    let withdrawnLabel: string | null = null;
    // שמות (מנורמלים) של הבקשות שנסגרו - כדי לדחות *רק* את רשומת הפין התואמת
    const withdrawnNorms = new Set<string>();

    // 1. סגירת פריטי הבקשה של המשתמש (מסיר את החסימה - הבדיקה מתעלמת מ-handled)
    try {
        const items = await getItemsByUserId(userId);
        const open = (items ?? []).filter(it =>
            it.category === 'location_request' &&
            (it.status ?? 'pending') !== 'handled');
        for (const it of open) {
            const label = (it.label ?? '').replace(/^בקשה להוספת מיקום:\s*/, '').trim();
            if (label) {
                withdrawnNorms.add(normalizeLoc(label));
                if (!withdrawnLabel) withdrawnLabel = label;
            }
        }
        await Promise.all(open.map((it) => {
            let ef: Record<string, unknown> = {};
            try { ef = JSON.parse(it.extra_fields || '{}') ?? {}; } catch {}
            return updateItem(it.id, {
                status: 'handled',
                extra_fields: { ...ef, withdrawn: true, withdrawn_reason: reason, withdrawn_at: new Date().toISOString() },
            });
        }));
    } catch (e) {
        console.warn('[locationDecision] withdraw request items failed:', e);
    }

    if (!withdrawnLabel) return null; // לא הייתה בקשה פתוחה - אין מה לנקות בהמשך

    // 2. דחיית *רק* רשומת הפין של הבקשה שנסגרה - לפי שם (לא לפי עיר). כך פין
    //    תיקון-מפה נפרד של אותו משתמש לא נדחה בטעות, ופין לא נשאר יתום אם
    //    העיר בפרופיל השתנתה בינתיים. מסיר אותה מ"שכונות ממתינות" באדמין.
    try {
        const pending = await getNeighborhoods('pending');
        const mine = pending.filter(n =>
            (n.user_id ?? '') === userId &&
            withdrawnNorms.has(normalizeLoc(n.name)));
        await Promise.all(mine.map(n => rejectNeighborhood(n.id, `withdraw:${reason}`)));
    } catch (e) {
        console.warn('[locationDecision] withdraw neighborhood records failed:', e);
    }

    // 3. סימון הודעות הבקשה בתיבות האדמינים כ"טופל" - התור מתנקה, ההיסטוריה נשמרת
    try {
        const admins = await getAllSuperAdmins();
        for (const admin of admins) {
            let msgs;
            try { msgs = await getMessagesByUserId(admin.id); } catch { continue; }
            const related = (msgs ?? []).filter((m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { return false; }
                if (ef?.handled) return false;
                if (String(ef?.type ?? '') !== 'location_request') return false;
                return String(ef?.requested_by_id ?? '') === userId;
            });
            await Promise.all(related.map(async (m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch {}
                await updateItem(m.id, {
                    label: `✅ טופל (${noteLabel}) · ${(m.label ?? '').replace(/^[✅❌📍]+\s*(טופל\s*\([^)]*\)\s*·\s*)?/, '')}`,
                    icon:  '✅',
                    color: 'green',
                    extra_fields: { ...ef, handled: true, decision: 'withdrawn', withdrawn_reason: reason, handled_at: new Date().toISOString() },
                });
            }));
        }
    } catch (e) {
        console.warn('[locationDecision] mark admin messages withdrawn failed:', e);
    }

    return withdrawnLabel;
}
