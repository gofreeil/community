import { json, type RequestHandler } from '@sveltejs/kit';
import { getMessagesByUserId, getItemsByCategoryAndStatus, getItemsByCategory } from '$lib/server/db';
import { MATCHMAKER_REQUEST_CATEGORY } from '$lib/server/matchmaker';
import { MSG_TYPE_LINKS } from '$lib/notificationKind';
import { reconcileAdMessages } from '$lib/server/adNotifications';
import { reconcileCoordinatorMessages } from '$lib/server/coordinatorNotifications';
import { isSinglesReviewHandled, toPendingSinglesRefs, type PendingSinglesRef } from '$lib/singlesReviewHandled';

// מחזיר את ההודעות החיות (items category='message') של המשתמש המחובר.
// משמש את הבאדג' ב-Header לספירת הודעות שלא טופלו - אותה מערכת כמו תיבת ההודעות בפרופיל
// (להבדיל מ-/api/messages הישן שפנה ל-collection 'messages' שלא נפרס ולכן תמיד החזיר ריק).
const efType = (m: { extra_fields?: string | null }): string => {
    try { return String(JSON.parse(m.extra_fields || '{}')?.type ?? ''); } catch { return ''; }
};

export const GET: RequestHandler = async ({ locals }) => {
    const session = await locals.auth?.();
    if (!session?.user?.id) return json([]);
    try {
        let msgs = await getMessagesByUserId(String(session.user.id));
        // בקשת פרסום שכבר הוכרעה לא תיספר בבאדג' כאילו היא עדיין ממתינה -
        // אותו יישור בדיוק שנעשה בתיבה עצמה, כדי שהמספר והתיבה לא יסתרו זה את זה
        try { msgs = await reconcileAdMessages(msgs); }
        catch (e) { console.warn('[my-messages] reconcileAdMessages failed:', e); }
        // ובאותה מידה בקשת רכז שכבר אושרה/נדחתה - שהבאדג' לא יראה מספר
        // שהתיבה עצמה כבר לא מציגה
        try { msgs = await reconcileCoordinatorMessages(msgs); }
        catch (e) { console.warn('[my-messages] reconcileCoordinatorMessages failed:', e); }

        // התראות "כרטיס פנויים ממתין לאישור" נחשבות טופלו ברגע שאין כרטיסים ממתינים -
        // אז הן לא נספרות בבאדג' (עוברות להיסטוריה בדף הפרופיל עם וי ירוק).
        const hasSinglesReview = msgs.some((m) => {
            try { return JSON.parse(m.extra_fields || '{}')?.type === 'singles_review'; } catch { return false; }
        });
        // כל התראה נבדקת מול הכרטיס שלה (singlesReviewHandled) - כרטיס חדש אחד לא
        // מחזיר את ההתראות הישנות לספירה. null = לא הצלחנו לבדוק → לא מסתירים.
        let pendingSingles: PendingSinglesRef[] | null = null;
        if (hasSinglesReview) {
            try { pendingSingles = toPendingSinglesRefs(await getItemsByCategoryAndStatus('singles', 'pending')); } catch { /* שקט */ }
        }

        // בקשת גישה ללוח הפנויים / בקשת שדכנות שכבר הוכרעה: התראה ישנה (בלי
        // request_id) לא סומנה כ-handled, ודף הפרופיל מוריד אותה להיסטוריה ברגע
        // שאין בקשה ממתינה מסוגה. בלי אותה בדיקה כאן הבאדג' הציג מספר שהתיבה
        // עצמה כבר לא מראה - בדיוק הפער שגרם ל"יש התראה ואין מה לפתוח".
        // הקריאות נעשות רק כשבאמת יש התראה כזו, כדי לא להוסיף round-trip לכולם.
        const hasAccess = msgs.some((m) => efType(m) === 'singles_access');
        const hasMatchmaker = msgs.some((m) => efType(m) === 'matchmaker_request');
        const countPendingReq = (items: { extra_fields?: string | null }[]) =>
            items.filter((r) => {
                try { return String(JSON.parse(r.extra_fields || '{}').status ?? 'pending') === 'pending'; }
                catch { return false; }
            }).length;
        let accessPending: number | null = null;
        let matchmakerPending: number | null = null;
        if (hasAccess || hasMatchmaker) {
            const [accessRes, mmRes] = await Promise.allSettled([
                hasAccess ? getItemsByCategory('singles_access') : Promise.resolve([]),
                hasMatchmaker ? getItemsByCategory(MATCHMAKER_REQUEST_CATEGORY) : Promise.resolve([]),
            ]);
            if (hasAccess && accessRes.status === 'fulfilled') accessPending = countPendingReq(accessRes.value);
            if (hasMatchmaker && mmRes.status === 'fulfilled') matchmakerPending = countPendingReq(mmRes.value);
        }

        const now = Date.now();
        const visible = msgs.filter((m) => {
            // מצב שנשמר חוצה-מכשירים (extra_fields/status) — כדי שהבאדג' יהיה זהה בכל מכשיר:
            // הודעה שנקראה/הוסתרה/בארכיון/בנודניק לא נספרת.
            if (m.status === 'archived') return false;
            let ef: Record<string, unknown> = {};
            try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { /* הודעה ישנה */ }
            if (ef?.read || ef?.dismissed) return false;
            // בקשת מיקום/שכונה שכבר טופלה (אושרה/נדחתה) - כמו בדף הפרופיל, לא נספרת בבאדג'
            if (ef?.handled) return false;
            const sn = Number(ef?.snooze_until);
            if (Number.isFinite(sn) && sn > now) return false;
            if (pendingSingles && ef?.type === 'singles_review') {
                const createdMs = new Date(m.created_at ?? '').getTime() || 0;
                if (isSinglesReviewHandled(String(ef?.item_id ?? ''), createdMs, pendingSingles)) return false;
            }
            if (ef?.type === 'singles_access' && accessPending === 0) return false;
            if (ef?.type === 'matchmaker_request' && matchmakerPending === 0) return false;
            return true;
        });

        // type/icon/link נחשפים כדי שההדר יוכל גם להפריד בין התראות מערכת לפרטיות
        // וגם להציג בלחיצה *על מה* ההתראות, בלי לשלוף שוב את כל ההודעות
        return json(visible.map(m => {
            let ef: Record<string, unknown> = {};
            try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { /* הודעה ישנה */ }
            const type = String(ef?.type ?? '');
            return {
                id: m.id,
                label: m.label,
                created_at: m.created_at,
                type,
                icon: m.icon ?? '',
                link: String(ef?.link ?? '') || MSG_TYPE_LINKS[type] || '',
            };
        }));
    } catch (e) {
        console.warn('[my-messages] fetch failed:', e);
        return json([]);
    }
};
