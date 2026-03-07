import { handle as authHandle } from './auth';
import type { Handle } from '@sveltejs/kit';

/**
 * עוטפים את ה-handle של Auth ב-try/catch.
 * אם ה-JWT קיים בעוגייה אבל לא תקין (למשל AUTH_SECRET שונה),
 * @auth/sveltekit עלול לזרוק — ואז כל הדפים מקבלים 500.
 * הפתרון: אם handle זורק, נמשיך ב-resolve רגיל (משתמש אנונימי).
 */
export const handle: Handle = async ({ event, resolve }) => {
    try {
        return await authHandle({ event, resolve });
    } catch (err) {
        console.warn('[hooks] auth handle threw — continuing anonymously:', err);
        return await resolve(event);
    }
};
