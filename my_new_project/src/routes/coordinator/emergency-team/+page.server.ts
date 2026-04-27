import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserById, getItemsByCategory, createItem, adminDeleteItem } from '$lib/server/db';
import { strapiPut } from '$lib/server/strapiClient.js';

async function requireCoordinator(event: Parameters<PageServerLoad>[0]) {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator/emergency-team');

    const jwt = event.cookies.get('strapi_jwt');
    const user = await getUserById(session.user.id, jwt ?? undefined);
    if (!user) throw error(403, 'משתמש לא נמצא');

    const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
    const isAdmin       = user.role === 'neighborhood_admin' || user.role === 'super_admin';
    if (!isCoordinator && !isAdmin) throw error(403, 'דף זה זמין רק לרכזי שכונות');

    const myNeighborhoods = (user.coordinator_of?.length ? user.coordinator_of : [user.neighborhood].filter(Boolean));
    return { session, user, myNeighborhoods, isAdmin };
}

export const load: PageServerLoad = async (event) => {
    const { user, myNeighborhoods } = await requireCoordinator(event);

    let members: Awaited<ReturnType<typeof getItemsByCategory>> = [];
    try {
        const all = await getItemsByCategory('emergency_team');
        members = all.filter(m => myNeighborhoods.includes(m.neighborhood));
    } catch (e) {
        console.warn('[coordinator/emergency-team] load failed:', e);
    }

    return { user, members, myNeighborhoods };
};

export const actions: Actions = {
    add: async (event) => {
        const { session, myNeighborhoods } = await requireCoordinator(event);

        const fd           = await event.request.formData();
        const name         = fd.get('name')?.toString().trim()         ?? '';
        const phone        = fd.get('phone')?.toString().trim()        ?? '';
        const role         = fd.get('role')?.toString().trim()         ?? '';
        const notes        = fd.get('notes')?.toString().trim()        ?? '';
        const neighborhood = fd.get('neighborhood')?.toString().trim() ?? myNeighborhoods[0] ?? '';

        if (!name)         return fail(400, { error: 'יש למלא שם החבר' });
        if (!phone)        return fail(400, { error: 'יש למלא טלפון' });
        if (!neighborhood) return fail(400, { error: 'יש לבחור שכונה' });
        if (!myNeighborhoods.includes(neighborhood))
            return fail(403, { error: 'אין לך הרשאה לשכונה זו' });

        try {
            await createItem({
                category:    'emergency_team',
                label:       name,
                description: notes,
                phone,
                contact:     name,
                icon:        '🚨',
                color:       'red',
                neighborhood,
                extra_fields: { role: role || 'חבר' },
                user_id:     session.user.id,
            });
        } catch (e) {
            console.error('[emergency-team] add failed:', e);
            return fail(500, { error: 'שגיאה בהוספה, נסה שוב' });
        }
        return { success: true, action: 'added' };
    },

    update: async (event) => {
        const { myNeighborhoods } = await requireCoordinator(event);

        const fd    = await event.request.formData();
        const id    = fd.get('id')?.toString().trim() ?? '';
        const name  = fd.get('name')?.toString().trim()  ?? '';
        const phone = fd.get('phone')?.toString().trim() ?? '';
        const role  = fd.get('role')?.toString().trim()  ?? '';
        const notes = fd.get('notes')?.toString().trim() ?? '';

        if (!id)    return fail(400, { error: 'מזהה חסר' });
        if (!name)  return fail(400, { error: 'יש למלא שם' });
        if (!phone) return fail(400, { error: 'יש למלא טלפון' });

        try {
            // ודא שייכות לשכונה שהרכז מנהל
            const all = await getItemsByCategory('emergency_team');
            const existing = all.find(m => m.id === id);
            if (!existing) return fail(404, { error: 'לא נמצא' });
            if (!myNeighborhoods.includes(existing.neighborhood))
                return fail(403, { error: 'אין הרשאה' });

            await strapiPut(`/api/items/${id}`, {
                data: {
                    label:        name,
                    contact:      name,
                    phone,
                    description:  notes,
                    extra_fields: { role: role || 'חבר' },
                },
            });
        } catch (e) {
            console.error('[emergency-team] update failed:', e);
            return fail(500, { error: 'שגיאה בעדכון' });
        }
        return { success: true, action: 'updated' };
    },

    delete: async (event) => {
        const { session, myNeighborhoods } = await requireCoordinator(event);

        const fd = await event.request.formData();
        const id = fd.get('id')?.toString().trim() ?? '';
        if (!id) return fail(400, { error: 'מזהה חסר' });

        try {
            const all = await getItemsByCategory('emergency_team');
            const existing = all.find(m => m.id === id);
            if (!existing) return fail(404, { error: 'לא נמצא' });
            if (!myNeighborhoods.includes(existing.neighborhood))
                return fail(403, { error: 'אין הרשאה' });

            await adminDeleteItem(id, session.user.id);
        } catch (e) {
            console.error('[emergency-team] delete failed:', e);
            return fail(500, { error: 'שגיאה במחיקה' });
        }
        return { success: true, action: 'deleted' };
    },
};
