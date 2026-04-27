import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserById, getItemsByCategory, createItem, adminDeleteItem } from '$lib/server/db';
import { strapiPut } from '$lib/server/strapiClient.js';

async function requireCoordinator(event: Parameters<PageServerLoad>[0]) {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator/polls');

    const jwt = event.cookies.get('strapi_jwt');
    const user = await getUserById(session.user.id, jwt ?? undefined);
    if (!user) throw error(403, 'משתמש לא נמצא');

    const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
    const isAdmin       = user.role === 'neighborhood_admin' || user.role === 'super_admin';
    if (!isCoordinator && !isAdmin) throw error(403, 'דף זה זמין רק לרכזי שכונות');

    const myNeighborhoods = (user.coordinator_of?.length ? user.coordinator_of : [user.neighborhood].filter(Boolean));
    return { session, user, myNeighborhoods, isAdmin };
}

interface PollExtra {
    options: { key: string; label: string }[];
    status: 'active' | 'closed';
}

function parsePollExtra(extraFields: string): PollExtra {
    try {
        const ef = JSON.parse(extraFields);
        return {
            options: Array.isArray(ef.options) ? ef.options : [],
            status:  ef.status === 'closed' ? 'closed' : 'active',
        };
    } catch {
        return { options: [], status: 'active' };
    }
}

function getVoteChoice(extraFields: string): { poll_id: string; choice: string } | null {
    try {
        const ef = JSON.parse(extraFields);
        if (typeof ef.poll_id === 'string' && typeof ef.choice === 'string') return { poll_id: ef.poll_id, choice: ef.choice };
        return null;
    } catch { return null; }
}

export const load: PageServerLoad = async (event) => {
    const { user, myNeighborhoods } = await requireCoordinator(event);

    let polls: Awaited<ReturnType<typeof getItemsByCategory>> = [];
    let votes: Awaited<ReturnType<typeof getItemsByCategory>> = [];

    try {
        const [allPolls, allVotes] = await Promise.all([
            getItemsByCategory('poll'),
            getItemsByCategory('poll_vote'),
        ]);
        polls = allPolls.filter(p => myNeighborhoods.includes(p.neighborhood));
        votes = allVotes;
    } catch (e) {
        console.warn('[coordinator/polls] load failed:', e);
    }

    // ערכן ספירות הקול ע"י משאל
    const pollsWithCounts = polls.map(p => {
        const extra = parsePollExtra(p.extra_fields);
        const myVotes = votes.filter(v => {
            const c = getVoteChoice(v.extra_fields);
            return c?.poll_id === p.id;
        });
        const counts: Record<string, number> = {};
        for (const opt of extra.options) counts[opt.key] = 0;
        for (const v of myVotes) {
            const c = getVoteChoice(v.extra_fields);
            if (c && counts[c.choice] !== undefined) counts[c.choice]++;
        }
        return {
            id:       p.id,
            label:    p.label,
            description: p.description,
            neighborhood: p.neighborhood,
            options:  extra.options,
            status:   extra.status,
            counts,
            total:    myVotes.length,
        };
    });

    return { user, polls: pollsWithCounts, myNeighborhoods };
};

export const actions: Actions = {
    create: async (event) => {
        const { session, myNeighborhoods } = await requireCoordinator(event);

        const fd           = await event.request.formData();
        const question     = fd.get('question')?.toString().trim()   ?? '';
        const description  = fd.get('description')?.toString().trim() ?? '';
        const neighborhood = fd.get('neighborhood')?.toString().trim() ?? myNeighborhoods[0] ?? '';
        const optionsRaw   = fd.getAll('option').map(v => v.toString().trim()).filter(Boolean);

        if (!question)     return fail(400, { error: 'יש למלא את השאלה' });
        if (optionsRaw.length < 2) return fail(400, { error: 'נדרשות לפחות 2 אפשרויות' });
        if (optionsRaw.length > 6) return fail(400, { error: 'מקסימום 6 אפשרויות' });
        if (!neighborhood) return fail(400, { error: 'יש לבחור שכונה' });
        if (!myNeighborhoods.includes(neighborhood))
            return fail(403, { error: 'אין הרשאה לשכונה זו' });

        const options = optionsRaw.map((label, i) => ({ key: `opt${i + 1}`, label }));

        try {
            await createItem({
                category:    'poll',
                label:       question,
                description,
                neighborhood,
                icon:        '🗳️',
                color:       'purple',
                extra_fields: { options, status: 'active' },
                user_id:     session.user.id,
            });
        } catch (e) {
            console.error('[polls] create failed:', e);
            return fail(500, { error: 'שגיאה ביצירת המשאל' });
        }
        return { success: true, action: 'created' };
    },

    close: async (event) => {
        const { myNeighborhoods } = await requireCoordinator(event);

        const fd = await event.request.formData();
        const id = fd.get('id')?.toString().trim() ?? '';
        if (!id) return fail(400, { error: 'מזהה חסר' });

        try {
            const all = await getItemsByCategory('poll');
            const existing = all.find(p => p.id === id);
            if (!existing) return fail(404, { error: 'לא נמצא' });
            if (!myNeighborhoods.includes(existing.neighborhood))
                return fail(403, { error: 'אין הרשאה' });

            const extra = parsePollExtra(existing.extra_fields);
            await strapiPut(`/api/items/${id}`, {
                data: { extra_fields: { ...extra, status: 'closed' } },
            });
        } catch (e) {
            console.error('[polls] close failed:', e);
            return fail(500, { error: 'שגיאה בסגירה' });
        }
        return { success: true, action: 'closed' };
    },

    delete: async (event) => {
        const { session, myNeighborhoods } = await requireCoordinator(event);

        const fd = await event.request.formData();
        const id = fd.get('id')?.toString().trim() ?? '';
        if (!id) return fail(400, { error: 'מזהה חסר' });

        try {
            const all = await getItemsByCategory('poll');
            const existing = all.find(p => p.id === id);
            if (!existing) return fail(404, { error: 'לא נמצא' });
            if (!myNeighborhoods.includes(existing.neighborhood))
                return fail(403, { error: 'אין הרשאה' });

            await adminDeleteItem(id, session.user.id);
        } catch (e) {
            console.error('[polls] delete failed:', e);
            return fail(500, { error: 'שגיאה במחיקה' });
        }
        return { success: true, action: 'deleted' };
    },
};
