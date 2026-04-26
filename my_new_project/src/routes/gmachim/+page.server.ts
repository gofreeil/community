import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// אין רשימת גמ"חים כפולה — מפנים לאתר הארצי שהוא מקור האמת לרשימה.
// הטופס להוספת גמ"ח חדש ממשיך לעבוד מכאן: /gmachim/add
const NATIONAL_URL = 'https://national-gemach.vercel.app';

export const load: PageServerLoad = async () => {
    throw redirect(308, NATIONAL_URL);
};
