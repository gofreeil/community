import { getAllItems, getUserById } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // קבל עיר ושכונה מהפרופיל של המשתמש המחובר
    let userNeighborhood: string | null = null;
    let userCity:         string | null = null;

    if (session?.user?.id) {
        try {
            const user = await getUserById(session.user.id);
            if (user?.neighborhood) userNeighborhood = user.neighborhood;
            if (user?.city)         userCity         = user.city;
        } catch {}
    }

    try {
        const dbItems = await getAllItems();
        return { dbItems, userNeighborhood, userCity };
    } catch (e) {
        console.warn('[home] getAllItems failed:', e instanceof Error ? e.message : e);
        return { dbItems: [], userNeighborhood, userCity };
    }
};
