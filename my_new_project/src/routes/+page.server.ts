import { getAllItems, getUserById, getEvents } from '$lib/server/db';
import { isAdmin } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // קבל עיר ושכונה מהפרופיל של המשתמש המחובר
    let userNeighborhood: string | null = null;
    let userCity:         string | null = null;

    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(session.user.id, jwt);
            if (user?.neighborhood) userNeighborhood = user.neighborhood;
            if (user?.city)         userCity         = user.city;
        } catch {}
    }

    const [dbItemsRes, eventsRes] = await Promise.allSettled([
        getAllItems(),
        getEvents(userNeighborhood ?? undefined),
    ]);

    const dbItems = dbItemsRes.status === 'fulfilled' ? dbItemsRes.value : [];
    const events  = eventsRes.status === 'fulfilled'  ? eventsRes.value  : [];

    if (dbItemsRes.status === 'rejected') {
        console.warn('[home] getAllItems failed:', dbItemsRes.reason instanceof Error ? dbItemsRes.reason.message : dbItemsRes.reason);
    }
    if (eventsRes.status === 'rejected') {
        console.warn('[home] getEvents failed:', eventsRes.reason instanceof Error ? eventsRes.reason.message : eventsRes.reason);
    }

    // ספירות שכונתיות לכפתורים בדף הבית (מתוך dbItems שכבר נטענו)
    const inMyNeighborhood = (i: { neighborhood: string }) =>
        !userNeighborhood || i.neighborhood === userNeighborhood;
    const emergencyTeamCount = dbItems.filter(i => i.category === 'emergency_team' && inMyNeighborhood(i)).length;
    const vaadMembersCount   = dbItems.filter(i => i.category === 'vaad_member'   && inMyNeighborhood(i)).length;

    return {
        dbItems,
        events,
        userNeighborhood,
        userCity,
        emergencyTeamCount,
        vaadMembersCount,
        isAdmin: isAdmin(session),
        userRole: session?.user?.role ?? 'user',
    };
};
