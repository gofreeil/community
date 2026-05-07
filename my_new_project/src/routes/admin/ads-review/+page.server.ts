import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserById, getUserByEmail } from '$lib/server/db';
import {
    listPending,
    listApproved,
    approveAd,
    rejectAd,
    unrejectAd,
    unapproveAd,
    removeAd,
    updateAdFields,
    getAdsStats,
} from '$lib/server/adsStore';

async function ensureSuperAdmin(event: any) {
    const session = await event.locals.auth();
    let isSA = session?.user?.role === 'super_admin';
    if (!isSA && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            isSA = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!isSA) throw error(403, 'נדרשת הרשאת מנהל ראשי');
    return session;
}

export const load: PageServerLoad = async (event) => {
    await ensureSuperAdmin(event);
    const [pending, approved, stats] = await Promise.all([listPending(), listApproved(), getAdsStats()]);
    return { pending, approved, stats };
};

function parseIds(formData: FormData): string[] {
    const raw = formData.getAll('id');
    const single = raw.map(v => String(v)).filter(Boolean);
    if (single.length > 0) return Array.from(new Set(single));
    const csv = formData.get('ids')?.toString() ?? '';
    return Array.from(new Set(csv.split(',').map(s => s.trim()).filter(Boolean)));
}

export const actions: Actions = {
    approve: async (event) => {
        const session = await ensureSuperAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const result = await approveAd(id, session?.user?.id ?? 'super_admin');
        if (!result) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `אושרה ופורסמה: ${result.title}` };
    },

    reject: async (event) => {
        const session = await ensureSuperAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        const reason = (formData.get('reason') as string) || undefined;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const result = await rejectAd(id, session?.user?.id ?? 'super_admin', reason);
        if (!result) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `נדחתה: ${result.title}` };
    },

    bulkApprove: async (event) => {
        const session = await ensureSuperAdmin(event);
        const ids = parseIds(await event.request.formData());
        if (ids.length === 0) return fail(400, { error: 'לא נבחרו פרסומות' });
        let ok = 0;
        for (const id of ids) {
            const r = await approveAd(id, session?.user?.id ?? 'super_admin');
            if (r) ok++;
        }
        return { success: true, message: `אושרו ופורסמו ${ok} פרסומות` };
    },

    bulkReject: async (event) => {
        const session = await ensureSuperAdmin(event);
        const formData = await event.request.formData();
        const ids = parseIds(formData);
        const reason = (formData.get('reason') as string) || undefined;
        if (ids.length === 0) return fail(400, { error: 'לא נבחרו פרסומות' });
        let ok = 0;
        for (const id of ids) {
            const r = await rejectAd(id, session?.user?.id ?? 'super_admin', reason);
            if (r) ok++;
        }
        return { success: true, message: `נדחו ${ok} פרסומות` };
    },

    unreject: async (event) => {
        await ensureSuperAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const r = await unrejectAd(id);
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `הוחזרה לממתינות: ${r.title}` };
    },

    unapprove: async (event) => {
        await ensureSuperAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const r = await unapproveAd(id);
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `הורדה מהאתר: ${r.title}` };
    },

    remove: async (event) => {
        await ensureSuperAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const ok = await removeAd(id);
        if (!ok) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: 'נמחקה לצמיתות' };
    },

    update: async (event) => {
        await ensureSuperAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const r = await updateAdFields(id, {
            title:     (formData.get('title')     as string | null) ?? undefined,
            subtitle:  (formData.get('subtitle')  as string | null) ?? undefined,
            cta:       (formData.get('cta')       as string | null) ?? undefined,
            hoverText: (formData.get('hoverText') as string | null) ?? undefined,
        });
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `עודכנה: ${r.title}` };
    },
};
