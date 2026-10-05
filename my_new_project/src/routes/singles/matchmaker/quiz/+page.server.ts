import { redirect } from '@sveltejs/kit';
import { resolveQuizActor, getSuggestionsByUser } from '$lib/server/quizSuggestions';
import type { PageServerLoad } from './$types';

// אזור השדכנים לשאלון ההתאמה: עיון בכל השאלות והצעת שינויים. שדכן מאושר או סופר-אדמין בלבד.
export const load: PageServerLoad = async (event) => {
    const actor = await resolveQuizActor(event);
    if (!actor) throw redirect(302, '/login?next=' + encodeURIComponent('/singles/matchmaker/quiz'));
    if (!actor.isMatchmaker && !actor.isSuperAdmin) throw redirect(302, '/singles');

    const mine = await getSuggestionsByUser(actor.uid).catch(() => []);
    return {
        isSuperAdmin: actor.isSuperAdmin,
        mine: mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
};
