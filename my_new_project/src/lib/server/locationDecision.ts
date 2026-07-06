import { createItem, updateItem, getItemsByUserId, getMessagesByUserId, getAllSuperAdmins } from './db';

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
 * 3. הודעות הבקשה בתיבות הסופר-אדמינים מסומנות "טופל" ונשארות כהיסטוריה - לא נמחקות
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

    // 3. סימון הודעות הבקשה בתיבות האדמינים כ"טופל" - נשארות בהיסטוריה במקום להימחק
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
