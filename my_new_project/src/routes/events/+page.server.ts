import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getEvents, createEvent, deleteEvent, getUserById } from '$lib/server/db';

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

    const neighborhood = user?.neighborhood ?? '';
    const events = await getEvents(neighborhood || undefined);

    return { user, events };
};

export const actions: Actions = {
    addEvent: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'לא מחובר' });

        const jwt = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt ?? undefined);
        if (!user) return fail(401, { error: 'משתמש לא נמצא' });

        // רק רכז שכונה או מנהל
        const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
        const isAdmin = user.role === 'neighborhood_admin' || user.role === 'super_admin';
        if (!isCoordinator && !isAdmin) return fail(403, { error: 'אין הרשאה' });

        const fd = await event.request.formData();
        const title    = fd.get('title')?.toString().trim() ?? '';
        const date     = fd.get('date')?.toString().trim() ?? '';
        const time     = fd.get('time')?.toString().trim() ?? '';
        const location = fd.get('location')?.toString().trim() ?? '';
        const icon     = fd.get('icon')?.toString().trim() || '📅';
        const color    = fd.get('color')?.toString().trim() || 'blue';
        const neighborhood = fd.get('neighborhood')?.toString().trim() || user.neighborhood;
        const description  = fd.get('description')?.toString().trim() ?? '';

        if (!title || !date) return fail(400, { error: 'כותרת ותאריך חובה' });

        // וידוא שהרכז מנהל את השכונה הזו
        if (isCoordinator && !isAdmin) {
            if (!user.coordinator_of.includes(neighborhood)) {
                return fail(403, { error: 'אין הרשאה לשכונה זו' });
            }
        }

        await createEvent({ title, date, time, location, icon, color, neighborhood, city: user.city, created_by_id: session.user.id, description });
        return { success: true };
    },

    deleteEvent: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'לא מחובר' });

        const jwt = event.cookies.get('strapi_jwt');
        const user = await getUserById(session.user.id, jwt ?? undefined);
        if (!user) return fail(401, { error: 'משתמש לא נמצא' });

        const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
        const isAdmin = user.role === 'neighborhood_admin' || user.role === 'super_admin';
        if (!isCoordinator && !isAdmin) return fail(403, { error: 'אין הרשאה' });

        const fd = await event.request.formData();
        const id = fd.get('id')?.toString().trim() ?? '';
        if (!id) return fail(400, { error: 'מזהה חסר' });

        await deleteEvent(id);
        return { success: true };
    },
};
