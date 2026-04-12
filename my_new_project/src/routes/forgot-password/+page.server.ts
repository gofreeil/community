import { fail } from '@sveltejs/kit';
import { forgotPassword } from '$lib/server/strapiClient';
import { getUserByEmail } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({});

export const actions: Actions = {
    // שלב 1: הזנת אימייל — בודק אם יש שאלת ביטחון
    checkEmail: async ({ request }) => {
        const formData = await request.formData();
        const email = (formData.get('email') as string)?.trim().toLowerCase();

        if (!email || !email.includes('@')) {
            return fail(400, { error: 'יש להזין כתובת אימייל תקינה' });
        }

        try {
            const user = await getUserByEmail(email);
            if (user?.security_question) {
                return { hasQuestion: true, email, question: user.security_question };
            }
            // אין שאלה — שולחים מייל ישירות
            await forgotPassword(email);
            return { success: true };
        } catch {
            return { success: true };
        }
    },

    // שלב 2: אימות תשובה לשאלת ביטחון
    verifyAnswer: async ({ request }) => {
        const formData = await request.formData();
        const email  = (formData.get('email')  as string)?.trim().toLowerCase();
        const answer = (formData.get('answer') as string)?.trim().toLowerCase();

        if (!email || !answer) {
            return fail(400, { error: 'יש למלא את כל השדות' });
        }

        try {
            const user = await getUserByEmail(email);
            if (!user) {
                await forgotPassword(email).catch(() => {});
                return { success: true };
            }

            const correct = user.security_answer?.trim().toLowerCase() === answer;
            if (!correct) {
                return fail(400, {
                    error: 'התשובה אינה נכונה',
                    hasQuestion: true,
                    email,
                    question: user.security_question,
                });
            }

            await forgotPassword(email);
            return { success: true };
        } catch {
            return { success: true };
        }
    },
};
