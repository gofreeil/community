import type { PageServerLoad } from './$types';
import { getItemsByCategory, getUserById } from '$lib/server/db';

// לוח דרושים ארצי — דף ייעודי בהשראת LinkedIn / Indeed / Glassdoor / AllJobs
// טוען גם פריטים שנוצרו דרך /jobs/add (category='job')
// וגם פריטים שנוצרו דרך /add/jobs (category='jobs') כדי שלא תהיה כפילות/אובדן.
export const load: PageServerLoad = async (event) => {
    let items: import('$lib/server/db').DbItem[] = [];
    try {
        const [a, b] = await Promise.all([
            getItemsByCategory('job').catch(() => []),
            getItemsByCategory('jobs').catch(() => []),
        ]);
        const seen = new Set<string>();
        items = [...a, ...b].filter((x) => {
            if (seen.has(x.id)) return false;
            seen.add(x.id);
            return true;
        });
    } catch (err) {
        console.error('[national/jobs] load failed:', err);
    }

    let userNeighborhood: string | null = null;
    let userCity: string | null = null;
    try {
        const session = await event.locals.auth();
        const uid = session?.user?.id ?? null;
        if (uid) {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(uid, jwt);
            if (user?.neighborhood) userNeighborhood = user.neighborhood;
            if (user?.city) userCity = user.city;
        }
    } catch {}

    return { items, userNeighborhood, userCity };
};
