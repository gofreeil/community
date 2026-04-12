import { fail } from '@sveltejs/kit';
import { forgotPassword } from '$lib/server/strapiClient';
import { getUserByEmail, banUser, createItem, findAdminForNeighborhood } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

const MAX_ATTEMPTS = 3;
const COOKIE_NAME  = 'fp_attempts';

interface AttemptData {
    email: string;
    count: number;
    locked: boolean;
}

function getAttempts(cookies: import('@sveltejs/kit').Cookies, email: string): AttemptData {
    try {
        const raw = cookies.get(COOKIE_NAME);
        if (!raw) return { email, count: 0, locked: false };
        const data = JSON.parse(raw) as AttemptData;
        if (data.email !== email) return { email, count: 0, locked: false };
        return data;
    } catch {
        return { email, count: 0, locked: false };
    }
}

function saveAttempts(cookies: import('@sveltejs/kit').Cookies, data: AttemptData) {
    cookies.set(COOKIE_NAME, JSON.stringify(data), {
        path:     '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge:   60 * 60, // שעה
    });
}

function clearAttempts(cookies: import('@sveltejs/kit').Cookies) {
    cookies.delete(COOKIE_NAME, { path: '/' });
}

export const load: PageServerLoad = async ({ cookies }) => {
    const raw = cookies.get(COOKIE_NAME);
    if (raw) {
        try {
            const data = JSON.parse(raw) as AttemptData;
            if (data.locked) return { locked: true, email: data.email };
        } catch {}
    }
    return {};
};

export const actions: Actions = {
    // שלב 1: בדיקת אימייל
    checkEmail: async ({ request, cookies }) => {
        const formData = await request.formData();
        const email = (formData.get('email') as string)?.trim().toLowerCase();

        if (!email || !email.includes('@')) {
            return fail(400, { error: 'יש להזין כתובת אימייל תקינה' });
        }

        // בדיקה אם נעול
        const attempts = getAttempts(cookies, email);
        if (attempts.locked) {
            return fail(403, { locked: true, email });
        }

        try {
            const user = await getUserByEmail(email);
            if (user?.security_question) {
                return { hasQuestion: true, email, question: user.security_question };
            }
            // אין שאלה — שולחים מייל ישירות
            await forgotPassword(email);
            clearAttempts(cookies);
            return { success: true };
        } catch {
            return { success: true };
        }
    },

    // שלב 2: אימות תשובה לשאלת ביטחון
    verifyAnswer: async ({ request, cookies }) => {
        const formData = await request.formData();
        const email  = (formData.get('email')  as string)?.trim().toLowerCase();
        const answer = (formData.get('answer') as string)?.trim().toLowerCase();

        if (!email || !answer) {
            return fail(400, { error: 'יש למלא את כל השדות', hasQuestion: true, email });
        }

        const attempts = getAttempts(cookies, email);

        // כבר נעול
        if (attempts.locked) {
            return fail(403, { locked: true, email });
        }

        try {
            const user = await getUserByEmail(email);
            if (!user) {
                await forgotPassword(email).catch(() => {});
                clearAttempts(cookies);
                return { success: true };
            }

            const correct = user.security_answer?.trim().toLowerCase() === answer;

            if (!correct) {
                const newCount = attempts.count + 1;
                const remaining = MAX_ATTEMPTS - newCount;

                if (newCount >= MAX_ATTEMPTS) {
                    // נועלים את המשתמש
                    saveAttempts(cookies, { email, count: newCount, locked: true });

                    try {
                        await banUser(user.id);
                    } catch (e) {
                        console.warn('[forgot-password] banUser failed:', e);
                    }

                    // שולחים הודעה לרכז השכונה / סופר אדמין
                    try {
                        const admin = await findAdminForNeighborhood(user.neighborhood ?? '');
                        if (admin?.id) {
                            const isNeighborhoodAdmin = admin.role === 'neighborhood_admin';
                            await createItem({
                                category:    'admin_alert',
                                label:       `חשבון ננעל — ${user.name ?? user.email}`,
                                description: `המשתמש ${user.name ?? ''} (${user.email}) ניסה ${MAX_ATTEMPTS} פעמים לאמת שאלת ביטחון ונכשל.\nהחשבון ננעל אוטומטית.\n\nשכונה: ${user.neighborhood ?? '—'}\n\nנדרש בירור ידני לפתיחת החשבון.`,
                                icon:        '🔒',
                                color:       'red',
                                user_id:     admin.id,
                                extra_fields: {
                                    locked_user_id:    user.id,
                                    locked_user_email: user.email,
                                    locked_user_name:  user.name,
                                    neighborhood:      user.neighborhood,
                                    recipient_type:    isNeighborhoodAdmin ? 'neighborhood_admin' : 'super_admin',
                                },
                            });
                        }
                    } catch (e) {
                        console.warn('[forgot-password] admin alert failed:', e);
                    }

                    return fail(403, { locked: true, email });
                }

                saveAttempts(cookies, { email, count: newCount, locked: false });
                return fail(400, {
                    error: `התשובה אינה נכונה. נותרו ${remaining} ניסיון${remaining === 1 ? '' : 'ות'}`,
                    hasQuestion: true,
                    email,
                    question: user.security_question,
                });
            }

            // תשובה נכונה
            clearAttempts(cookies);
            await forgotPassword(email);
            return { success: true };

        } catch (e) {
            console.warn('[forgot-password] verifyAnswer error:', e);
            return { success: true };
        }
    },
};
