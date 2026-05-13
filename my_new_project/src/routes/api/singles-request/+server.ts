import { json } from '@sveltejs/kit';
import { createItem, getItemsByCategory, getUserById } from '$lib/server/db';
import type { RequestHandler } from './$types';

const MAX_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר כדי לבקש טלפון' }, { status: 401 });
    }

    const requesterId = session.user.id as string;
    const requester = await getUserById(requesterId);
    if (requester?.banned) {
        return json({ success: false, message: 'החשבון שלך חסום' }, { status: 403 });
    }

    let body: { target_item_id?: string } = {};
    try { body = await event.request.json(); } catch { /* empty */ }

    const target_item_id = String(body?.target_item_id ?? '').trim();
    if (!target_item_id) {
        return json({ success: false, message: 'חסר מזהה פריט' }, { status: 400 });
    }

    try {
        const singles = await getItemsByCategory('singles');
        const target = singles.find(i => i.id === target_item_id);
        if (!target) {
            return json({ success: false, message: 'הפרופיל לא נמצא' }, { status: 404 });
        }

        const owner_user_id = target.user_id;
        if (!owner_user_id) {
            return json({ success: false, message: 'הפרופיל אינו משוייך לחשבון' }, { status: 400 });
        }
        if (owner_user_id === requesterId) {
            return json({ success: false, message: 'אי-אפשר לבקש מהפרופיל שלך' }, { status: 400 });
        }

        const allRequests = await getItemsByCategory('singles_request');

        const cutoff = Date.now() - DAY_MS;
        const recentByUser = allRequests.filter(r => {
            if (r.user_id !== requesterId) return false;
            try {
                const ef = JSON.parse(r.extra_fields || '{}');
                return new Date(ef.requested_at).getTime() >= cutoff;
            } catch { return false; }
        });
        if (recentByUser.length >= MAX_PER_DAY) {
            return json({ success: false, message: `הגעת למכסה היומית (${MAX_PER_DAY} בקשות ב-24 שעות)` }, { status: 429 });
        }

        const alreadySent = allRequests.some(r => {
            if (r.user_id !== requesterId) return false;
            try { return JSON.parse(r.extra_fields || '{}').target_item_id === target_item_id; } catch { return false; }
        });
        if (alreadySent) {
            return json({ success: false, message: 'כבר שלחת בקשה לפרופיל זה' }, { status: 409 });
        }

        let targetExtra: Record<string, unknown> = {};
        try { targetExtra = JSON.parse(target.extra_fields || '{}'); } catch { /* empty */ }

        await createItem({
            category: 'singles_request',
            label: 'בקשת טלפון',
            user_id: requesterId,
            phone: requester?.phone || '',
            contact: requester?.nickname || requester?.name || '',
            extra_fields: {
                target_item_id,
                owner_user_id,
                requester_snapshot: {
                    nickname:    requester?.nickname || requester?.name || '',
                    gender:      requester?.gender || '',
                    age:         (() => {
                        const bd = requester?.birth_date;
                        if (!bd) return '';
                        const y = new Date(bd).getFullYear();
                        const now = new Date().getFullYear();
                        return y && y < now ? String(now - y) : '';
                    })(),
                    neighborhood: requester?.neighborhood || '',
                    city:         requester?.city || '',
                },
                target_label: target.label,
                target_gender: targetExtra.gender ?? '',
                status: 'pending',
                requested_at: new Date().toISOString(),
            },
        });

        return json({ success: true });
    } catch (e) {
        console.error('[singles-request POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
