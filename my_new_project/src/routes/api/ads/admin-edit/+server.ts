import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveRole } from '$lib/server/adsAdmin';
import { saveAdFromBuilderInPlace, type AdBuilderPayload } from '$lib/server/adsStore';
import { toExternalUrl } from '$lib/urlNormalize';

// ============================================================
// POST /api/ads/admin-edit
// שמירת עריכה מהסטודיו על פרסומת קיימת, *במקום* - בלי ליצור גרסה
// שממתינה לאישור. הסטודיו פונה לכאן כשהגיעו אליו מ"ערוך" בטבלת התזמון
// שב-/admin/ads-review (?edit=<id>&inplace=ad).
// סופר-אדמין בלבד. פרסומת מוצר של החנות נשמרת דרך /api/ads/shop-edit.
// ============================================================

export const POST: RequestHandler = async (event) => {
    const role = await resolveRole(event).catch(() => '');
    if (role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

    const body = await event.request.json().catch(() => null) as (AdBuilderPayload & { id?: string }) | null;
    const id = String(body?.id ?? '').trim();
    if (!body || !id) throw error(400, 'חסר מזהה פרסומת');

    const website = typeof body.landing?.website === 'string' ? body.landing.website : '';
    if (body.landing && website) body.landing.website = toExternalUrl(website) || website;

    const ad = await saveAdFromBuilderInPlace(id, body);
    if (!ad) throw error(404, 'הפרסומת לא נמצאה');

    return json({ ok: true, id: ad.id, title: ad.title });
};
