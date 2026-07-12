import type { PageServerLoad } from './$types';
import { getUserById } from '$lib/server/db';

// פרסום גמ"ח דו-שלבי (כמו קטגוריות המפה): הטופס כאן אוסף את שלב-המפה בלבד
// ושומר דרך /api/items (category 'gemachim'), ואז מפנה ל-/items/[id]?builder=1
// להשלמת הפרטים בדף הגמ"ח. אין כאן form action - השמירה נעשית מהלקוח.
export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    let userCity: string | null = null;
    let userNeighborhood: string | null = null;
    let userPhone: string | null = null;
    if (session?.user?.id) {
        try {
            const user = await getUserById(session.user.id);
            userCity         = user?.city         || null;
            userNeighborhood = user?.neighborhood || null;
            userPhone        = user?.phone        || null;
        } catch {}
    }

    return {
        userId: session?.user?.id ?? null,
        userCity,
        userNeighborhood,
        userPhone,
    };
};
