import { json } from '@sveltejs/kit';
import { resolveQuizActor, createSuggestion, type SuggestionInput } from '$lib/server/quizSuggestions';
import type { RequestHandler } from './$types';

// שדכן מאושר (או סופר-אדמין) שולח הצעה לשאלון ההתאמה: עריכה / הסרה / הערה / שאלה חדשה.
// הצעה נשמרת כפריט pending, וסופר-אדמינים מקבלים התראה (ומכאן SMS מהבאקאנד).
export const POST: RequestHandler = async (event) => {
    const actor = await resolveQuizActor(event);
    if (!actor) return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    if (!actor.isMatchmaker && !actor.isSuperAdmin) {
        return json({ success: false, message: 'האזור זמין לשדכנים מאושרים בלבד' }, { status: 403 });
    }

    let body: Partial<SuggestionInput> = {};
    try { body = await event.request.json(); } catch { /* גוף ריק */ }

    try {
        const res = await createSuggestion(actor, { kind: body.kind, qid: body.qid, gender: body.gender, sectionId: body.sectionId, text: body.text }, event.url.origin);
        if (!res.ok) return json({ success: false, message: res.message }, { status: 400 });
        return json({ success: true, suggestion: res.suggestion });
    } catch (e) {
        console.error('[quiz-suggestions POST]', e);
        return json({ success: false, message: 'שגיאת שרת - נסו שוב' }, { status: 500 });
    }
};
