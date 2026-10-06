import { json } from '@sveltejs/kit';
import { resolveQuizActor } from '$lib/server/quizSuggestions';
import { getFeedbackByMatchmaker, saveFeedback, clearFeedback, type FeedbackInput } from '$lib/server/matchFeedback';
import type { RequestHandler } from './$types';

// פידבק שדכן/ית על ציון ההתאמה של זוג: "מתאים / אולי / לא מתאים" + מה הכי השפיע + הערה.
// הנתונים מזינים את מסך "למידת ההתאמה" של סופר-אדמין, שבו מכיילים את מנוע הציון.

export const GET: RequestHandler = async (event) => {
    const actor = await resolveQuizActor(event);
    if (!actor) return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    if (!actor.isMatchmaker && !actor.isSuperAdmin) {
        return json({ success: false, message: 'האזור זמין לשדכנים מאושרים בלבד' }, { status: 403 });
    }
    try {
        return json({ success: true, feedback: await getFeedbackByMatchmaker(actor.uid) });
    } catch (e) {
        console.error('[match-feedback GET]', e);
        return json({ success: false, message: 'שגיאת שרת - נסו שוב' }, { status: 500 });
    }
};

export const POST: RequestHandler = async (event) => {
    const actor = await resolveQuizActor(event);
    if (!actor) return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    if (!actor.isMatchmaker && !actor.isSuperAdmin) {
        return json({ success: false, message: 'האזור זמין לשדכנים מאושרים בלבד' }, { status: 403 });
    }

    let body: Partial<FeedbackInput> & { clear?: boolean } = {};
    try { body = await event.request.json(); } catch { /* גוף ריק */ }

    try {
        if (body.clear) {
            const aId = String(body.aId ?? '').trim(), bId = String(body.bId ?? '').trim();
            if (!aId || !bId || aId === bId) return json({ success: false, message: 'פרמטרים שגויים' }, { status: 400 });
            await clearFeedback(actor, aId, bId);
            return json({ success: true, cleared: true });
        }
        const res = await saveFeedback(actor, { aId: body.aId, bId: body.bId, verdict: body.verdict, reasons: body.reasons, note: body.note });
        if (!res.ok) return json({ success: false, message: res.message }, { status: res.status });
        return json({ success: true, feedback: res.feedback });
    } catch (e) {
        console.error('[match-feedback POST]', e);
        return json({ success: false, message: 'שגיאת שרת - נסו שוב' }, { status: 500 });
    }
};
