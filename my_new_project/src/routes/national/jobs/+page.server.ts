import type { PageServerLoad } from './$types';
import { getItemsByCategory } from '$lib/server/db';

// לוח דרושים ארצי — דף ייעודי בהשראת LinkedIn / Indeed / Glassdoor / AllJobs
// בקובץ זה אנחנו טוענים גם פריטים שנוצרו דרך /jobs/add (category='job')
// וגם פריטים שנוצרו דרך /add/jobs (category='jobs') כדי שלא תהיה כפילות/אובדן.
export const load: PageServerLoad = async () => {
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
    return { items };
};
