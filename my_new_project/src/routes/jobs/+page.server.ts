import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// הלוח הישן /jobs הוסר — מפנים לוח דרושים הארצי
export const load: PageServerLoad = async () => {
    redirect(308, '/national/jobs');
};
