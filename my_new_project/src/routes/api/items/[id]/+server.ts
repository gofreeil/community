import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDbItemById, updateItem, deleteItem } from '$lib/server/db';

/**
 * PATCH /api/items/[id]
 *
 * Body: { action: 'freeze' | 'unfreeze' } | { status: string }
 *
 * - הקפאת/הפעלת מודעה. רק הבעלים יכול.
 * - מסלול ה'הסר' מהלוח הציבורי משתמש ב-freeze (לא מחיקה).
 */
export const PATCH: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    const userId = session?.user?.id;
    if (!userId) return json({ success: false, message: 'לא מחובר' }, { status: 401 });

    const id = event.params.id;
    if (!id) return json({ success: false, message: 'חסר מזהה' }, { status: 400 });

    let body: Record<string, unknown> = {};
    try { body = await event.request.json(); } catch {}

    const item = await getDbItemById(id);
    if (!item) return json({ success: false, message: 'פריט לא נמצא' }, { status: 404 });
    if (item.user_id !== userId) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });

    const action = String(body.action ?? '');
    let newStatus: string | null = null;
    if (action === 'freeze') newStatus = 'frozen';
    else if (action === 'unfreeze') newStatus = 'active';
    else if (typeof body.status === 'string') newStatus = body.status;

    if (!newStatus) return json({ success: false, message: 'פעולה לא תקינה' }, { status: 400 });

    try {
        await updateItem(id, { status: newStatus });
        return json({ success: true, status: newStatus });
    } catch (e) {
        console.error('[items/:id PATCH] failed:', e);
        return json({ success: false, message: 'שגיאה בעדכון' }, { status: 500 });
    }
};

/**
 * DELETE /api/items/[id]
 *
 * מחיקה לצמיתות. רק דרך דף הפרופיל.
 * נדרש header X-From-Profile=1 כדי להבטיח שהמחיקה מגיעה מדף הפרופיל.
 */
export const DELETE: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    const userId = session?.user?.id;
    if (!userId) return json({ success: false, message: 'לא מחובר' }, { status: 401 });

    const id = event.params.id;
    if (!id) return json({ success: false, message: 'חסר מזהה' }, { status: 400 });

    // מחיקה לצמיתות מותרת רק מדף הפרופיל
    if (event.request.headers.get('X-From-Profile') !== '1') {
        return json({ success: false, message: 'מחיקה לצמיתות אפשרית רק מדף הפרופיל' }, { status: 403 });
    }

    const item = await getDbItemById(id);
    if (!item) return json({ success: false, message: 'פריט לא נמצא' }, { status: 404 });
    if (item.user_id !== userId) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });

    try {
        await deleteItem(id);
        return json({ success: true });
    } catch (e) {
        console.error('[items/:id DELETE] failed:', e);
        return json({ success: false, message: 'שגיאה במחיקה' }, { status: 500 });
    }
};
