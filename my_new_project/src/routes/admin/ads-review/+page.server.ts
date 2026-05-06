import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireSuperAdmin } from '$lib/server/auth';
import { getUserById, getUserByEmail } from '$lib/server/db';
import { listPending, listApproved, approveAd, rejectAd } from '$lib/server/adsStore';

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
    const [pending, approved] = await Promise.all([listPending(), listApproved()]);
    return { pending, approved };
};

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
};
