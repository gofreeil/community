import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getEvents, getPendingEvents, createEvent, updateEventStatus, deleteEvent, getUserById } from '$lib/server/db';
import { strapiPut } from '$lib/server/strapiClient.js';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    let user = null;
    try {
        if (session?.user?.id) {
            const jwt = event.cookies.get('strapi_jwt');
            user = await getUserById(session.user.id, jwt ?? undefined);
        }
    } catch {}

    const neighborhood  = user?.neighborhood ?? '';
    const isCoordinator = (user?.coordinator_of?.length ?? 0) > 0;
    const isAdmin       = user?.role === 'neighborhood_admin' || user?.role === 'super_admin';

    const [events, pendingEvents] = await Promise.all([
        getEvents(neighborhood || undefined).catch((e) => {
            console.error('[events] getEvents failed:', e instanceof Error ? e.message : e);
            return [];
        }),
        (isCoordinator || isAdmin)
            ? getPendingEvents(neighborhood).catch((e) => {
                console.error('[events] getPendingEvents failed:', e instanceof Error ? e.message : e);
                return [];
            })
            : Promise.resolve([]),
    ]);

    return { user, events, pendingEvents, isCoordinator, isAdmin };
};

export const actions: Actions = {

    // ── כל משתמש מחובר מציע אירוע → ממתין לאישור רכז ──
    suggestEvent: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'יש להתחבר כדי להציע אירוע' });

        const jwt  = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt ?? undefined);
        if (!user) return fail(401, { error: 'משתמש לא נמצא' });

        const fd          = await event.request.formData();
        const title       = fd.get('title')?.toString().trim()       ?? '';
        const date        = fd.get('date')?.toString().trim()        ?? '';
        const time        = fd.get('time')?.toString().trim()        ?? '';
        const location    = fd.get('location')?.toString().trim()    ?? '';
        const description = fd.get('description')?.toString().trim() ?? '';
        const icon        = fd.get('icon')?.toString().trim()        || '📅';

        if (!title || !date) return fail(400, { error: 'כותרת ותאריך חובה' });

        await createEvent({
            title, date, time, location, description, icon,
            neighborhood:    user.neighborhood,
            city:            user.city,
            created_by_id:   session.user.id,
            submitted_by_id: session.user.id,
            status:          'pending',
            price:           0,
        });
        return { success: true, action: 'suggested' };
    },

    // ── רכז / מנהל מפרסם אירוע מיידית (מאושר אוטומטית) ──
    addEvent: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'לא מחובר' });

        const jwt  = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt ?? undefined);
        if (!user) return fail(401, { error: 'משתמש לא נמצא' });

        const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
        const isAdmin       = user.role === 'neighborhood_admin' || user.role === 'super_admin';
        if (!isCoordinator && !isAdmin) return fail(403, { error: 'אין הרשאה' });

        const fd                = await event.request.formData();
        const title             = fd.get('title')?.toString().trim()             ?? '';
        const date              = fd.get('date')?.toString().trim()              ?? '';
        const time              = fd.get('time')?.toString().trim()              ?? '';
        const location          = fd.get('location')?.toString().trim()          ?? '';
        const icon              = fd.get('icon')?.toString().trim()              || '📅';
        const color             = fd.get('color')?.toString().trim()             || 'blue';
        const description       = fd.get('description')?.toString().trim()       ?? '';
        const neighborhood      = fd.get('neighborhood')?.toString().trim()      || user.neighborhood;
        const price             = parseInt(fd.get('price')?.toString()           ?? '0') || 0;
        const price_description = fd.get('price_description')?.toString().trim() ?? '';

        if (!title || !date) return fail(400, { error: 'כותרת ותאריך חובה' });

        // רכז יכול לפרסם רק בשכונה שלו
        if (isCoordinator && !isAdmin) {
            if (!user.coordinator_of.includes(neighborhood)) {
                return fail(403, { error: 'אין הרשאה לשכונה זו' });
            }
        }

        await createEvent({
            title, date, time, location, icon, color, description,
            neighborhood, city: user.city,
            created_by_id: session.user.id,
            status:        'approved',
            price, price_description,
        });
        return { success: true, action: 'added' };
    },

    // ── רכז מאשר הצעה (ואפשר לקבוע מחיר) ──
    approveEvent: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'לא מחובר' });

        const jwt  = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt ?? undefined);
        const isCoordinator = (user?.coordinator_of?.length ?? 0) > 0;
        const isAdmin       = user?.role === 'neighborhood_admin' || user?.role === 'super_admin';
        if (!isCoordinator && !isAdmin) return fail(403, { error: 'אין הרשאה' });

        const fd                = await event.request.formData();
        const id                = fd.get('id')?.toString().trim()                ?? '';
        const price             = parseInt(fd.get('price')?.toString()           ?? '0') || 0;
        const price_description = fd.get('price_description')?.toString().trim() ?? '';

        if (!id) return fail(400, { error: 'מזהה חסר' });

        await updateEventStatus(id, 'approved');
        if (price > 0 || price_description) {
            await strapiPut(`/api/events/${id}`, { data: { price, price_description } });
        }
        return { success: true, action: 'approved' };
    },

    // ── רכז דוחה הצעה ──
    rejectEvent: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'לא מחובר' });

        const jwt  = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt ?? undefined);
        const isCoordinator = (user?.coordinator_of?.length ?? 0) > 0;
        const isAdmin       = user?.role === 'neighborhood_admin' || user?.role === 'super_admin';
        if (!isCoordinator && !isAdmin) return fail(403, { error: 'אין הרשאה' });

        const fd = await event.request.formData();
        const id = fd.get('id')?.toString().trim() ?? '';
        if (!id) return fail(400, { error: 'מזהה חסר' });

        await updateEventStatus(id, 'rejected');
        return { success: true, action: 'rejected' };
    },

    // ── מחיקה (רכז / מנהל) ──
    deleteEvent: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'לא מחובר' });

        const jwt  = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt ?? undefined);
        const isCoordinator = (user?.coordinator_of?.length ?? 0) > 0;
        const isAdmin       = user?.role === 'neighborhood_admin' || user?.role === 'super_admin';
        if (!isCoordinator && !isAdmin) return fail(403, { error: 'אין הרשאה' });

        const fd = await event.request.formData();
        const id = fd.get('id')?.toString().trim() ?? '';
        if (!id) return fail(400, { error: 'מזהה חסר' });

        await deleteEvent(id);
        return { success: true, action: 'deleted' };
    },
};
