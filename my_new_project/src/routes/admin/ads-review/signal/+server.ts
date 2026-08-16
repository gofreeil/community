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
 */
export const GET: RequestHandler = async (event) => {
    await ensureAdsAdmin(event);

    const [pending, approved] = await Promise.all([listPending(), listApproved()]);
    const newest = [...pending, ...approved]
        .reduce((max, a) => (a.submittedAt > max ? a.submittedAt : max), '');

    return json(
        { sig: `${pending.length}|${approved.length}|${newest}` },
        { headers: { 'cache-control': 'no-store' } },
    );
};
