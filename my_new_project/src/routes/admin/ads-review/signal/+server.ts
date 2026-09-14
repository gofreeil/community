import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listPending, listApproved } from '$lib/server/adsStore';
import { ensureAdsAdmin } from '$lib/server/adsAdmin';

/**
 * חתימה קלה על מצב הפרסומות, לרענון האוטומטי של דף האישור.
 *
 * קודם הדף קרא ל-invalidateAll() כל 30 שניות - וכל קריאה כזו החזירה מחדש
 * את *כל* הפרסומות הממתינות והמאושרות, על התמונות המוטבעות שבהן (מגה-בייטים).
 * אדמין שהשאיר את הטאב פתוח שרף כך מכסת Origin Transfer בקצב אבסורדי.
 *
 * עכשיו הדף מושך מכאן חתימה של כמה עשרות בייטים, ומרענן באמת רק כשהיא
 * השתנתה. הרשימות עצמן ממילא יושבות ב-cache של adsStore, ולכן החישוב כאן
 * לא מוסיף פנייה ל-Strapi.
 *
 * החתימה כוללת גם את התקופה של כל מאושרת (תפוגה/השהיה), כדי שקציבה או
 * השהיה שנעשו ממכשיר אחר יתעדכנו בטאב הפתוח ולא רק כניסה/יציאה של פרסומת.
 */
export const GET: RequestHandler = async (event) => {
    await ensureAdsAdmin(event);

    const [pending, approved] = await Promise.all([listPending(), listApproved()]);
    const newest = [...pending, ...approved]
        .reduce((max, a) => (a.submittedAt > max ? a.submittedAt : max), '');
    // חותם קצר של התקופות: סכום הזמנים משתנה עם כל שינוי תפוגה/השהיה
    const periods = approved.reduce((sum, a) =>
        sum + (a.expiresAt ? Math.floor(new Date(a.expiresAt).getTime() / 1000) : 0) + (a.paused ? 1 : 0), 0);

    return json(
        { sig: `${pending.length}|${approved.length}|${newest}|${periods}` },
        { headers: { 'cache-control': 'no-store' } },
    );
};
