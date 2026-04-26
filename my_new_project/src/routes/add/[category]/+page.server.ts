import { error, redirect } from '@sveltejs/kit';
import { categoryConfig } from '$lib/categoryFields';
import type { PageServerLoad } from './$types';

// קטגוריות שיש להן טופס ייעודי משלהן — מפנים אליהן במקום להציג את הטופס הגנרי
const DEDICATED_ROUTES: Record<string, string> = {
    gemachim: '/gmachim/add',
};

export const load: PageServerLoad = async (event) => {
    // אם לקטגוריה יש טופס ייעודי — הפנה אליו
    const dedicated = DEDICATED_ROUTES[event.params.category];
    if (dedicated) throw redirect(302, dedicated);

    // ---- Auth אופציונלי — הטופס נגיש לכולם, ההרשמה נדרשת רק בשליחה ----
    const session = await event.locals.auth();

    // ---- טעינת קונפיגורציית קטגוריה ----
    const config = categoryConfig[event.params.category];
    if (!config) {
        error(404, `קטגוריה "${event.params.category}" לא קיימת`);
    }

    return {
        categoryId: event.params.category,
        config,
        userId: session?.user?.id ?? null,
    };
};
