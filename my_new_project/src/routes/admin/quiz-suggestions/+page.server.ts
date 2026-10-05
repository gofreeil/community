import { error, fail } from '@sveltejs/kit';
import { resolveQuizActor, getAllSuggestions, decideSuggestion } from '$lib/server/quizSuggestions';
import type { SuggestionStatus } from '$lib/quizSuggestionsShared';
import type { PageServerLoad, Actions } from './$types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSuperAdmin(event: any) {
    const actor = await resolveQuizActor(event);
    if (!actor?.isSuperAdmin) throw error(403, 'נדרשת הרשאת מנהל ראשי');
    return actor;
}

export const load: PageServerLoad = async (event) => {
    await ensureSuperAdmin(event);
    return { suggestions: await getAllSuggestions() };
};

export const actions: Actions = {
    decide: async (event) => {
        const actor = await ensureSuperAdmin(event);
        const form = await event.request.formData();
        const id = String(form.get('id') ?? '');
        const status = String(form.get('status') ?? '') as SuggestionStatus;
        const note = String(form.get('note') ?? '');
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            const r = await decideSuggestion(id, status, note, actor.name);
            if (!r.ok) return fail(404, { error: r.message });
            return { success: true, message: 'נשמר ✓' };
        } catch (e) {
            return fail(500, { error: `שגיאה בשמירה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
