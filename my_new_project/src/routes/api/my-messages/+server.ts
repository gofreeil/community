import { json, type RequestHandler } from '@sveltejs/kit';
import { getMessagesByUserId } from '$lib/server/db';

// מחזיר את ההודעות החיות (items category='message') של המשתמש המחובר.
// משמש את הבאדג' ב-Header לספירת הודעות שלא טופלו - אותה מערכת כמו תיבת ההודעות בפרופיל
// (להבדיל מ-/api/messages הישן שפנה ל-collection 'messages' שלא נפרס ולכן תמיד החזיר ריק).
export const GET: RequestHandler = async ({ locals }) => {
    const session = await locals.auth?.();
    if (!session?.user?.id) return json([]);
    try {
        const msgs = await getMessagesByUserId(String(session.user.id));
        return json(msgs.map(m => ({ id: m.id, label: m.label, created_at: m.created_at })));
    } catch (e) {
        console.warn('[my-messages] fetch failed:', e);
        return json([]);
    }
};
