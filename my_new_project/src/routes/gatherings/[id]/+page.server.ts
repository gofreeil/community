import type { PageServerLoad, Actions } from './$types';
import { fail, error, redirect } from '@sveltejs/kit';
import {
    getGatheringById, updateGathering, deleteGathering, getUserById, createItem,
    type GatheringFood, type GatheringAttendee, type DbUser,
} from '$lib/server/db';

/** טוען את המשתמש המחובר; null = לא מחובר/לא רשום (אין כרטיס). */
async function loadMember(event: Parameters<PageServerLoad>[0] | any): Promise<DbUser | null> {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) return null;
    try {
        const jwt = event.cookies.get('strapi_jwt');
        return (await getUserById(session.user.id, jwt ?? undefined)) ?? null;
    } catch { return null; }
}

function canManage(user: DbUser | null, gathering: { manager_ids: string[] }): boolean {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return gathering.manager_ids.includes(user.id);
}

export const load: PageServerLoad = async (event) => {
    const user = await loadMember(event);
    const gathering = await getGatheringById(event.params.id);
    if (!gathering) throw error(404, 'הסעודה לא נמצאה');

    const isMember  = !!user;
    const isManager = canManage(user, gathering);
    const myAttendance = user ? gathering.attendees.find((a) => a.user_id === user.id) ?? null : null;

    return { user, gathering, isMember, isManager, myAttendance };
};

/** עוטף פעולה: דורש חבר רשום + מחזיר {user, gathering}. */
async function requireMember(event: any) {
    const user = await loadMember(event);
    if (!user) return { fail: fail(401, { error: 'יש להתחבר כדי לבצע פעולה זו' }) } as const;
    const gathering = await getGatheringById(event.params.id);
    if (!gathering) return { fail: fail(404, { error: 'הסעודה לא נמצאה' }) } as const;
    return { user, gathering } as const;
}

export const actions: Actions = {
    // ── שיבוץ עצמי ליד מאכל (אני מביא את זה) ──
    claimFood: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;

        const fd = await event.request.formData();
        const foodId = fd.get('food_id')?.toString() ?? '';
        const food_items = gathering.food_items.map((f) => {
            if (f.id !== foodId) return f;
            if (f.claimed_by_id && f.claimed_by_id !== user.id) return f; // כבר תפוס
            return { ...f, claimed_by_id: user.id, claimed_by_name: user.name || user.nickname || 'חבר' };
        });
        await updateGathering(gathering.id, { food_items });
        return { success: true, action: 'claimed' };
    },

    // ── ביטול שיבוץ (שלי, או מנהל מסיר כל שיבוץ) ──
    unclaimFood: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;
        const manager = canManage(user, gathering);

        const fd = await event.request.formData();
        const foodId = fd.get('food_id')?.toString() ?? '';
        const food_items = gathering.food_items.map((f) => {
            if (f.id !== foodId) return f;
            if (f.claimed_by_id !== user.id && !manager) return f; // רק שלי או מנהל
            return { ...f, claimed_by_id: null, claimed_by_name: null };
        });
        await updateGathering(gathering.id, { food_items });
        return { success: true, action: 'unclaimed' };
    },

    // ── אישור הגעה / עדכון מספר אנשים ──
    rsvp: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;

        const fd = await event.request.formData();
        const count = Math.max(1, parseInt(fd.get('count')?.toString() ?? '1') || 1);
        const note  = fd.get('note')?.toString().trim() ?? '';

        const me: GatheringAttendee = {
            user_id:      user.id,
            name:         user.name || user.nickname || 'חבר',
            gender:       user.gender ?? '',
            avatar_url:   user.avatar_url ?? null,
            city:         user.city ?? '',
            neighborhood: user.neighborhood ?? '',
            count,
            note,
        };
        const others = gathering.attendees.filter((a) => a.user_id !== user.id);
        await updateGathering(gathering.id, { attendees: [...others, me] });
        return { success: true, action: 'rsvp' };
    },

    // ── ביטול הגעה ──
    cancelRsvp: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;
        const attendees = gathering.attendees.filter((a) => a.user_id !== user.id);
        // משחרר גם מאכלים ששובצו לי
        const food_items = gathering.food_items.map((f) =>
            f.claimed_by_id === user.id ? { ...f, claimed_by_id: null, claimed_by_name: null } : f);
        await updateGathering(gathering.id, { attendees, food_items });
        return { success: true, action: 'cancelled' };
    },

    // ── מנהל מוסיף מאכל לרשימה ──
    addFood: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;
        if (!canManage(user, gathering)) return fail(403, { error: 'רק מנהלי הסעודה יכולים לערוך את הרשימה' });

        const fd = await event.request.formData();
        const name = fd.get('name')?.toString().trim() ?? '';
        const qty  = fd.get('qty')?.toString().trim()  ?? '';
        if (!name) return fail(400, { error: 'יש להזין שם מאכל' });

        const newItem: GatheringFood = {
            id: `f${Date.now()}`, name, qty, claimed_by_id: null, claimed_by_name: null,
        };
        await updateGathering(gathering.id, { food_items: [...gathering.food_items, newItem] });
        return { success: true, action: 'foodAdded' };
    },

    // ── מנהל מוחק מאכל מהרשימה ──
    removeFood: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;
        if (!canManage(user, gathering)) return fail(403, { error: 'אין הרשאה' });

        const fd = await event.request.formData();
        const foodId = fd.get('food_id')?.toString() ?? '';
        const food_items = gathering.food_items.filter((f) => f.id !== foodId);
        await updateGathering(gathering.id, { food_items });
        return { success: true, action: 'foodRemoved' };
    },

    // ── מנהל מעדכן פרטי הסעודה ──
    updateDetails: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;
        if (!canManage(user, gathering)) return fail(403, { error: 'אין הרשאה' });

        const fd = await event.request.formData();
        const title       = fd.get('title')?.toString().trim()       ?? gathering.title;
        const date        = fd.get('date')?.toString().trim()        ?? gathering.date;
        const time        = fd.get('time')?.toString().trim()        ?? '';
        const location    = fd.get('location')?.toString().trim()    ?? '';
        const description = fd.get('description')?.toString().trim()  ?? '';
        const image       = fd.get('image')?.toString()              ?? gathering.image;
        if (!title || !date) return fail(400, { error: 'כותרת ותאריך חובה' });

        await updateGathering(gathering.id, { title, date, time, location, description, image });
        return { success: true, action: 'detailsUpdated' };
    },

    // ── מנהל/יוצר ממנה מגיע נוסף למנהל + שולח לו הודעה אישית לפרופיל ──
    addManager: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;
        if (!canManage(user, gathering)) return fail(403, { error: 'אין הרשאה' });

        const fd = await event.request.formData();
        const targetId = fd.get('user_id')?.toString() ?? '';
        if (!targetId || gathering.manager_ids.includes(targetId)) return fail(400, { error: 'כבר מנהל' });

        await updateGathering(gathering.id, { manager_ids: [...gathering.manager_ids, targetId] });

        // הודעה אישית למנהל החדש (מופיעה ב/messages ובפרופיל שלו).
        // try/catch - כשל בהודעה לא יבטל את המינוי.
        try {
            const target   = gathering.attendees.find((a) => a.user_id === targetId);
            const byName   = user.name || user.nickname || 'מנהל הסעודה';
            const link     = `https://community.gofreeil.com/gatherings/${gathering.id}`;
            await createItem({
                category:    'message',
                label:       '👤 מונית למנהל/ת סעודה',
                description: `שלום ${target?.name || ''}! 🍽️\n\n${byName} מינה אותך למנהל/ת של הסעודה "${gathering.title}".\n\nכמנהל/ת תוכל/י לערוך את פרטי הסעודה, לנהל את רשימת המאכלים ולמנות מנהלים נוספים.\n\nלדף הסעודה:\n${link}`,
                contact:     byName,
                user_id:     targetId,
                icon:        '👤',
                color:       'amber',
                extra_fields: {
                    type: 'gathering_manager',
                    gathering_id: gathering.id,
                    gathering_title: gathering.title,
                    link,
                    sender_name: byName,
                },
            });
        } catch (e) {
            console.error('[gathering] manager notification failed:', e instanceof Error ? e.message : e);
        }

        return { success: true, action: 'managerAdded' };
    },

    // ── הסרת מנהל (לא ניתן להסיר את היוצר) ──
    removeManager: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;
        if (!canManage(user, gathering)) return fail(403, { error: 'אין הרשאה' });

        const fd = await event.request.formData();
        const targetId = fd.get('user_id')?.toString() ?? '';
        if (targetId === gathering.creator_id) return fail(400, { error: 'לא ניתן להסיר את מקים הסעודה' });
        const manager_ids = gathering.manager_ids.filter((id) => id !== targetId);
        await updateGathering(gathering.id, { manager_ids });
        return { success: true, action: 'managerRemoved' };
    },

    // ── מחיקת הסעודה (יוצר / מנהל-על) ──
    deleteGathering: async (event) => {
        const ctx = await requireMember(event);
        if ('fail' in ctx) return ctx.fail;
        const { user, gathering } = ctx;
        const isCreator = gathering.creator_id === user.id;
        if (!isCreator && user.role !== 'super_admin') return fail(403, { error: 'רק מקים הסעודה יכול למחוק אותה' });
        await deleteGathering(gathering.id);
        throw redirect(303, '/gatherings');
    },
};
