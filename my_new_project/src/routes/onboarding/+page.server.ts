import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// /onboarding → שלב 1
export const load: PageServerLoad = () => {
    redirect(307, '/onboarding/1');
};
