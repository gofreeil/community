import type { PageServerLoad } from './$types';
import { getUserByIdRetry, effectiveUserLocation } from '$lib/server/userLocation';
import { loadTierGate } from '$lib/server/tierGate';

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
        // getUserByIdRetry + effectiveUserLocation: כשל Strapi רגעי לא מאפס את הפרופיל,
        // ורכז שכונה בלי עיר בפרופיל מקבל את האזור שהוא מרכז - לא את ברירת המחדל (ירושלים)
        const user = await getUserByIdRetry(session.user.id, event.cookies.get('strapi_jwt'));
        if (user) {
            const loc = effectiveUserLocation(user);
            userCity         = loc.city         || null;
            userNeighborhood = loc.neighborhood || null;
            userPhone        = user.phone       || null;
        }
    }

    return {
        userId: session?.user?.id ?? null,
        userCity,
        userNeighborhood,
        userPhone,
        ...(await loadTierGate(event, 'gemachim')),
    };
};
