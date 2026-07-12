import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * ניתוק אמיתי. signOut של Auth.js מוחק רק את עוגיית הסשן המקומית —
 * עוגיות strapi_jwt (מקומית) ו-gofreeil-auth (משותפת ל-.gofreeil.com) נשארו,
 * ו-ssoAutoAdopt חיבר את המשתמש מחדש אוטומטית בניווט הבא ("אי-אפשר להתנתק").
 * הקליינט קורא לכאן לפני signOut כדי למחוק את כולן.
 */
export const POST: RequestHandler = async ({ cookies }) => {
    cookies.delete('strapi_jwt', { path: '/' });
    cookies.delete('strapi_handoff', { path: '/' });
    // העוגייה המשותפת נכתבת עם domain בפרודקשן — המחיקה חייבת domain זהה.
    // מוחקים גם וריאנט host-only ליתר ביטחון (dev / עוגיות ישנות).
    cookies.delete('gofreeil-auth', { path: '/', domain: '.gofreeil.com' });
    cookies.delete('gofreeil-auth', { path: '/' });
    // חוסם re-adopt מיידי אם אתר-אח פעיל ישתול שוב את העוגייה המשותפת בטאב אחר
    cookies.set('sso_adopt_tried', '1', {
        path: '/', httpOnly: true, sameSite: 'lax', secure: true, maxAge: 60 * 60,
    });
    return json({ ok: true });
};
