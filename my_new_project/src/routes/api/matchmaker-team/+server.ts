import { json } from '@sveltejs/kit';
import { resolveQuizActor } from '$lib/server/quizSuggestions';
import { listApprovedMatchmakers } from '$lib/server/matchmaker';
import type { RequestHandler } from './$types';

// "צוות השדכנים": רשימת השדכנים המאושרים, לשדכן מאושר או סופר-אדמין בלבד.
// הטלפון מוחזר רק לסופר-אדמין.
export const GET: RequestHandler = async (event) => {
    const actor = await resolveQuizActor(event);
    if (!actor) return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    if (!actor.isMatchmaker && !actor.isSuperAdmin) {
        return json({ success: false, message: 'אין הרשאה' }, { status: 403 });
    }

    const team = await listApprovedMatchmakers();
    return json(
        {
            success: true,
            meId: actor.uid,
            isSuperAdmin: actor.isSuperAdmin,
            team: team.map((m) => ({ ...m, phone: actor.isSuperAdmin ? m.phone : '' })),
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
    );
};
