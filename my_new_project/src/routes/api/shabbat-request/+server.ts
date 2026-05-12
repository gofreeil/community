import { json } from '@sveltejs/kit';
import { createItem, getItemsByCategory, getUserById } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר כדי לשלוח בקשה' }, { status: 401 });
    }

    let body: { host_item_id?: string; message?: string } = {};
    try { body = await event.request.json(); } catch { /* empty */ }

    const host_item_id = String(body?.host_item_id ?? '').trim();
    if (!host_item_id) {
        return json({ success: false, message: 'חסר מזהה מארח' }, { status: 400 });
    }

    try {
        const realestateItems = await getItemsByCategory('realestate');
        const hostItem = realestateItems.find(i => i.id === host_item_id);
        if (!hostItem) {
            return json({ success: false, message: 'פריט מארח לא נמצא' }, { status: 404 });
        }

        try {
            const ef = JSON.parse(hostItem.extra_fields || '{}');
            if (!String(ef.offer_type ?? '').includes('מציע')) {
                return json({ success: false, message: 'פריט זה אינו הזמנת אירוח' }, { status: 400 });
            }
        } catch { /* treat as not host */ }

        const host_user_id = hostItem.user_id;
        if (!host_user_id) {
            return json({ success: false, message: 'המארח אינו משוייך לחשבון' }, { status: 400 });
        }

        if (host_user_id === (session.user!.id as string)) {
            return json({ success: false, message: 'אינך יכול לשלוח בקשה לעצמך' }, { status: 400 });
        }

        const existingRequests = await getItemsByCategory('shabbat_request');
        const alreadySent = existingRequests.some(r => {
            if (r.user_id !== (session.user!.id as string)) return false;
            try { return JSON.parse(r.extra_fields || '{}').host_item_id === host_item_id; } catch { return false; }
        });
        if (alreadySent) {
            return json({ success: false, message: 'כבר שלחת בקשת אירוח למארח זה' }, { status: 409 });
        }

        const guest = await getUserById(session.user.id as string);
        await createItem({
            category: 'shabbat_request',
            label: 'בקשת אירוח',
            user_id: session.user.id as string,
            phone: guest?.phone || '',
            contact: guest?.nickname || guest?.name || '',
            extra_fields: {
                host_item_id,
                host_user_id,
                message: String(body?.message ?? '').trim(),
                status: 'pending',
                requested_at: new Date().toISOString(),
            },
        });

        return json({ success: true });
    } catch (e) {
        console.error('[shabbat-request POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
