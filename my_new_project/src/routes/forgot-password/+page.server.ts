import { fail } from '@sveltejs/kit';
import { forgotPassword } from '$lib/server/strapiClient';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({});

export const actions: Actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const email = (formData.get('email') as string)?.trim().toLowerCase();

        if (!email || !email.includes('@')) {
            return fail(400, { error: 'יש להזין כתובת אימייל תקינה' });
        }

        try {
            await forgotPassword(email);
            return { success: true };
        } catch {
            // לא חושפים אם המייל קיים או לא — תמיד מחזירים הצלחה
            return { success: true };
        }
    },
};
