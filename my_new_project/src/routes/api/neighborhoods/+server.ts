import { json } from '@sveltejs/kit';
import { getNeighborhoods, createNeighborhoodRequest } from '$lib/server/db';
import type { RequestHandler } from './$types';

// ---- GET: approved neighborhoods (for merging into the picker / map) ----
export const GET: RequestHandler = async () => {
    const list = await getNeighborhoods('approved');
    return json(list);
};

// ---- POST: a resident proposes a new neighborhood with a precise map pin ----
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();

    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ success: false, message: 'נתונים לא תקינים' }, { status: 400 });
    }

    const name = String(body.name ?? '').trim();
    const city = String(body.city ?? '').trim();
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!name || !city) {
        return json({ success: false, message: 'חסר שם שכונה או עיר' }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return json({ success: false, message: 'נא לסמן את מיקום השכונה על המפה' }, { status: 400 });
    }

    const created = await createNeighborhoodRequest({
        name,
        city,
        lat,
        lng,
        user_id: session?.user?.id ?? undefined,
    });

    return json({ success: true, id: created.id });
};
