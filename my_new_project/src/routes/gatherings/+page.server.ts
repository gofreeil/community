import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getGatherings, createGathering, getUserById } from '$lib/server/db';
import type { GatheringFood } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    let user = null;
    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            user = await getUserById(session.user.id, jwt ?? undefined);
        } catch {}
    }

    // נגיש רק לחברים רשומים (יש להם כרטיס). אנונימי - רואה מסך הזמנה להתחבר.
    const isMember = !!user;
    const city = user?.city ?? '';

    const gatherings = isMember
        ? await getGatherings(city || undefined).catch((e) => {
            console.error('[gatherings] getGatherings failed:', e instanceof Error ? e.message : e);
            return [];
        })
        : [];

    return { user, isMember, gatherings };
};

export const actions: Actions = {
    // ── חבר רשום מקים סעודה חדשה → נפתח דף ייעודי לסעודה ──
    create: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'יש להתחבר כדי להקים סעודה' });

        const jwt  = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt ?? undefined);
        if (!user) return fail(401, { error: 'רק חברים רשומים יכולים להקים סעודה' });

        const fd          = await event.request.formData();
        const title       = fd.get('title')?.toString().trim()       ?? '';
        const date        = fd.get('date')?.toString().trim()        ?? '';
        const time        = fd.get('time')?.toString().trim()        ?? '';
        const location    = fd.get('location')?.toString().trim()    ?? '';
        const description = fd.get('description')?.toString().trim()  ?? '';
        const icon        = fd.get('icon')?.toString().trim()        || '🍽️';
        const foodRaw     = fd.get('food_items')?.toString()         ?? '[]';

        if (!title || !date) return fail(400, { error: 'כותרת ותאריך חובה' });

        // רשימת מאכלים התחלתית (טקסט שורה-בשורה) → מבנה פנימי
        let food_items: GatheringFood[] = [];
        try {
            const names = JSON.parse(foodRaw) as { name: string; qty: string }[];
            food_items = names
                .filter((f) => f.name?.trim())
                .map((f, i) => ({
                    id: `f${Date.now()}_${i}`,
                    name: f.name.trim(),
                    qty: (f.qty ?? '').trim(),
                    claimed_by_id: null,
                    claimed_by_name: null,
                }));
        } catch {}

        const created = await createGathering({
            title, date, time, location, description, icon,
            host_name:    user.name || user.nickname || '',
            city:         user.city,
            neighborhood: user.neighborhood,
            creator_id:   session.user.id,
            manager_ids:  [session.user.id],
            food_items,
            attendees:    [],
            status:       'approved',
        });

        throw redirect(303, `/gatherings/${created.id}`);
    },
};
