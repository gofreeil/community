import { redirect } from '@sveltejs/kit';
import { resolveQuizActor } from '$lib/server/quizSuggestions';
import { listApprovedMatchmakers } from '$lib/server/matchmaker';
import type { PageServerLoad } from './$types';

// "צוות השדכנים": רשימת השדכנים המאושרים. שדכן מאושר או סופר-אדמין בלבד.
// הטלפון מוצג רק לסופר-אדמין.
export const load: PageServerLoad = async (event) => {
    const actor = await resolveQuizActor(event);
    if (!actor) throw redirect(302, '/login?redirect=' + encodeURIComponent('/singles/matchmaker/team'));
    if (!actor.isMatchmaker && !actor.isSuperAdmin) throw redirect(302, '/singles');

    const team = await listApprovedMatchmakers();
    return {
        isSuperAdmin: actor.isSuperAdmin,
        meId: actor.uid,
        team: team.map((m) => ({ ...m, phone: actor.isSuperAdmin ? m.phone : '' })),
    };
};
