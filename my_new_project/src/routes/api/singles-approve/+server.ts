import { json } from '@sveltejs/kit';
import { getItemsByCategory, updateItem } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    }

    let body: { request_item_id?: string; action?: string } = {};
    try { body = await event.request.json(); } catch { /* empty */ }

    const request_item_id = String(body?.request_item_id ?? '').trim();
    const action = String(body?.action ?? '').trim();
    if (!request_item_id || !['approved', 'rejected'].includes(action)) {
        return json({ success: false, message: 'פרמטרים שגויים' }, { status: 400 });
    }

    try {
        const requests = await getItemsByCategory('singles_request');
        const req = requests.find(r => r.id === request_item_id);
        if (!req) {
            return json({ success: false, message: 'הבקשה לא נמצאה' }, { status: 404 });
        }

        let ef: Record<string, unknown> = {};
        try { ef = JSON.parse(req.extra_fields || '{}'); } catch { /* empty */ }

        if (ef.owner_user_id !== (session.user!.id as string)) {
            return json({ success: false, message: 'אין לך הרשאה לאשר בקשה זו' }, { status: 403 });
        }

        await updateItem(request_item_id, {
            extra_fields: { ...ef, status: action, decided_at: new Date().toISOString() },
        });

        return json({ success: true });
    } catch (e) {
        console.error('[singles-approve POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
