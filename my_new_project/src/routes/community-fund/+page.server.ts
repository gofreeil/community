import type { PageServerLoad } from './$types';
import { getItemsByCategoryAndStatus } from '$lib/server/db';

export const load: PageServerLoad = async () => {
    // משאלות שאושרו ע"י סופר-אדמין - נטענות בשרת כדי שהכותל יוצג כבר ברינדור הראשון.
    // .catch → הדף לא נופל אם Strapi לא זמין; פרטיות: טקסט + תאריך בלבד, בלי שמות/מזהים.
    const wishes = await getItemsByCategoryAndStatus('wish', 'active').catch(() => []);
    return {
        wishes: wishes.map((it) => ({
            text:      it.description || it.label,
            createdAt: it.created_at,
        })),
    };
};
