import { redirect } from '@sveltejs/kit';
import { getUserById } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

// מסדרון ההשלמה (onboarding) פתוח רק למשתמש מחובר. טוענים את הפרופיל הקיים
// כדי למלא-מראש שדות (למשתמש גוגל חדש רובם ריקים; שם/תמונה מגיעים מגוגל).
export const load: LayoutServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* עוגייה פגומה */ }
    if (!session?.user?.id) redirect(303, '/login?redirect=/onboarding/1');

    let user: Awaited<ReturnType<typeof getUserById>> = undefined;
    try {
        user = await getUserById(session.user.id as string, event.cookies.get('strapi_jwt'));
    } catch { /* Strapi מהבהב — ממשיכים עם ברירות מחדל ריקות */ }

    return {
        name: (session.user.name as string | undefined) || user?.nickname || user?.name || '',
        avatar: user?.avatar_url || (session.user.image as string | undefined) || null,
        profile: {
            city: user?.city ?? '',
            neighborhood: user?.neighborhood ?? '',
            street: user?.street ?? '',
            address: user?.address ?? '',
            phone: user?.phone ?? '',
            status: user?.status ?? '',
            family_status: user?.family_status ?? '',
            birth_date: user?.birth_date ?? '',
            security_question: user?.security_question ?? '',
        },
    };
};
