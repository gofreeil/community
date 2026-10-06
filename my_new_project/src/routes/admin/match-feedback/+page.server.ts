import { error } from '@sveltejs/kit';
import { resolveQuizActor } from '$lib/server/quizSuggestions';
import { getAllFeedback } from '$lib/server/matchFeedback';
import { summarizeFeedback } from '$lib/matchFeedbackShared';
import type { PageServerLoad } from './$types';

// "למידת ההתאמה": מה השדכנים אמרו על ציוני המערכת, איפה המנוע טועה, ואילו חלקים מבדילים.
// הסטטיסטיקה מחושבת בשרת (summarizeFeedback) - הלקוח מקבל רק תוצאות + הדירוגים האחרונים.
export const load: PageServerLoad = async (event) => {
    const actor = await resolveQuizActor(event);
    if (!actor?.isSuperAdmin) throw error(403, 'נדרשת הרשאת מנהל ראשי');

    const all = await getAllFeedback();
    return {
        summary: summarizeFeedback(all),
        recent: all.slice(0, 60),
    };
};
