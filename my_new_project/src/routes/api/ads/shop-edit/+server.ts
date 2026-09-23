import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveRole } from '$lib/server/adsAdmin';
import { saveShopAdFromBuilder, type BuilderPayload } from '$lib/server/shopAdsStore';

// ============================================================
// POST /api/ads/shop-edit
// שמירת עריכה מהבילדר על פרסומת מוצר קיימת, *במקום* - בלי ליצור
// גרסה חדשה שממתינה לאישור (המסלול הרגיל של מפרסם). זה הנתיב שהבילדר
// פונה אליו כשהגיעו אליו מ-/admin/shop-ads עם ?edit=<id>&inplace=1.
//
// סופר-אדמין בלבד, ובנוסף שומר הסף שב-saveShopAdFromBuilder: רשומה
// שאינה פרסומת מוצר לא נגעת - כך שגם טעות במסך לא תיגע בפרסומת של
// מפרסם משלם.
// ============================================================

export const POST: RequestHandler = async (event) => {
    const role = await resolveRole(event).catch(() => '');
    if (role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

    const body = await event.request.json().catch(() => null) as (BuilderPayload & { id?: string }) | null;
    const id = String(body?.id ?? '').trim();
    if (!body || !id) throw error(400, 'חסר מזהה פרסומת');

    const session = await event.locals.auth().catch(() => null);
    const editedBy = (session?.user?.id as string | undefined) ?? 'super_admin';

    const result = await saveShopAdFromBuilder(id, body, editedBy);
    if (!result) throw error(404, 'הפרסומת לא נמצאה, או שאינה פרסומת של מוצר מהחנות');

    return json({ ok: true, ...result });
};
