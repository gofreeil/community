import { json, type RequestHandler } from '@sveltejs/kit';
import { getMessagesByUserId, getItemsByCategoryAndStatus } from '$lib/server/db';

// מחזיר את ההודעות החיות (items category='message') של המשתמש המחובר.
// משמש את הבאדג' ב-Header לספירת הודעות שלא טופלו - אותה מערכת כמו תיבת ההודעות בפרופיל
// (להבדיל מ-/api/messages הישן שפנה ל-collection 'messages' שלא נפרס ולכן תמיד החזיר ריק).
export const GET: RequestHandler = async ({ locals }) => {
    const session = await locals.auth?.();
    if (!session?.user?.id) return json([]);
    try {
        const msgs = await getMessagesByUserId(String(session.user.id));

        // התראות "כרטיס פנויים ממתין לאישור" נחשבות טופלו ברגע שאין כרטיסים ממתינים -
        // אז הן לא נספרות בבאדג' (עוברות להיסטוריה בדף הפרופיל עם וי ירוק).
        const hasSinglesReview = msgs.some((m) => {
            try { return JSON.parse(m.extra_fields || '{}')?.type === 'singles_review'; } catch { return false; }
        });
        let pendingSingles = 1; // ברירת מחדל: לא להסתיר אם לא הצלחנו לבדוק
        if (hasSinglesReview) {
            try { pendingSingles = (await getItemsByCategoryAndStatus('singles', 'pending')).length; } catch { /* שקט */ }
        }

        const visible = msgs.filter((m) => {
            if (pendingSingles === 0) {
                try { if (JSON.parse(m.extra_fields || '{}')?.type === 'singles_review') return false; } catch { /* keep */ }
            }
            return true;
        });

        return json(visible.map(m => ({ id: m.id, label: m.label, created_at: m.created_at })));
    } catch (e) {
        console.warn('[my-messages] fetch failed:', e);
        return json([]);
    }
};
