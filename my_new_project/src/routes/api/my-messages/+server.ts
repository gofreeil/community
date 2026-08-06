import { json, type RequestHandler } from '@sveltejs/kit';
import { getMessagesByUserId, getItemsByCategoryAndStatus } from '$lib/server/db';
import { reconcileAdMessages } from '$lib/server/adNotifications';

// מחזיר את ההודעות החיות (items category='message') של המשתמש המחובר.
// משמש את הבאדג' ב-Header לספירת הודעות שלא טופלו - אותה מערכת כמו תיבת ההודעות בפרופיל
// (להבדיל מ-/api/messages הישן שפנה ל-collection 'messages' שלא נפרס ולכן תמיד החזיר ריק).
export const GET: RequestHandler = async ({ locals }) => {
    const session = await locals.auth?.();
    if (!session?.user?.id) return json([]);
    try {
        let msgs = await getMessagesByUserId(String(session.user.id));
        // בקשת פרסום שכבר הוכרעה לא תיספר בבאדג' כאילו היא עדיין ממתינה -
        // אותו יישור בדיוק שנעשה בתיבה עצמה, כדי שהמספר והתיבה לא יסתרו זה את זה
        try { msgs = await reconcileAdMessages(msgs); }
        catch (e) { console.warn('[my-messages] reconcileAdMessages failed:', e); }

        // התראות "כרטיס פנויים ממתין לאישור" נחשבות טופלו ברגע שאין כרטיסים ממתינים -
        // אז הן לא נספרות בבאדג' (עוברות להיסטוריה בדף הפרופיל עם וי ירוק).
        const hasSinglesReview = msgs.some((m) => {
            try { return JSON.parse(m.extra_fields || '{}')?.type === 'singles_review'; } catch { return false; }
        });
        let pendingSingles = 1; // ברירת מחדל: לא להסתיר אם לא הצלחנו לבדוק
        if (hasSinglesReview) {
            try { pendingSingles = (await getItemsByCategoryAndStatus('singles', 'pending')).length; } catch { /* שקט */ }
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
            if (pendingSingles === 0 && ef?.type === 'singles_review') return false;
            return true;
        });

        return json(visible.map(m => ({ id: m.id, label: m.label, created_at: m.created_at })));
    } catch (e) {
        console.warn('[my-messages] fetch failed:', e);
        return json([]);
    }
};
