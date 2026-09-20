import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getUserById,
    getUserByEmail,
    getItemsByCategory,
    getItemsByCategoryAndStatus,
    updateItem,
    adminDeleteItem,
    getDbItemById,
    createItem,
} from '$lib/server/db';
import { dbItemToProfile } from '$lib/singlesMap';
import { withSinglesImageUrls } from '$lib/server/singlesImages';
import { decideSinglesAccess } from '$lib/server/singlesAccess';
import { decideMatchmakerRequest } from '$lib/server/matchmaker';
import { decideSinglesCard } from '$lib/server/singlesCardReview';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const [pendingItems, activeItems, accessItems, matchmakerItems] = await Promise.all([
        getItemsByCategoryAndStatus('singles', 'pending').catch(() => []),
        getItemsByCategoryAndStatus('singles', 'active').catch(() => []),
        getItemsByCategory('singles_access').catch(() => []),
        getItemsByCategory('matchmaker_request').catch(() => []),
    ]);

    // ממפה לפרופיל (שם, גיל, עיר, מגדר, תמונות) ומשאיר את התמונות הגולמיות לבדיקה
    // תמונות ככתובות (singlesImages.ts) ולא base64 - 2MB/7 שניות → עשרות KB
    const pending = pendingItems.map((it) => ({ ...withSinglesImageUrls(dbItemToProfile(it)), createdAt: it.created_at }));
    const active = activeItems.map((it) => ({ ...withSinglesImageUrls(dbItemToProfile(it)), createdAt: it.created_at }));

    // בקשות גישה לצפייה בלוח (הורים/שדכנים) שממתינות לאישור
    const accessRequests = accessItems
        .map((it) => {
            let ef: Record<string, unknown> = {};
            try { ef = it.extra_fields ? JSON.parse(it.extra_fields) : {}; } catch { ef = {}; }
            const snap = (ef.requester_snapshot ?? {}) as Record<string, unknown>;
            return {
                id: it.id,
                userId: it.user_id ?? '',
                status: String(ef.status ?? 'pending'),
                role: String(ef.role ?? ''),
                roleLabel: String(ef.role_label ?? ''),
                nickname: String(snap.nickname ?? it.contact ?? ''),
                city: String(snap.city ?? ''),
                neighborhood: String(snap.neighborhood ?? ''),
                email: String(snap.email ?? ''),
                phone: it.phone ?? '',
                requestedAt: String(ef.requested_at ?? it.created_at ?? ''),
            };
        })
        .filter((r) => r.status === 'pending')
        .sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));

    // בקשות להיות "שדכן מערכת" שממתינות לאישור
    const matchmakerRequests = matchmakerItems
        .map((it) => {
            let ef: Record<string, unknown> = {};
            try { ef = it.extra_fields ? JSON.parse(it.extra_fields) : {}; } catch { ef = {}; }
            const snap = (ef.requester_snapshot ?? {}) as Record<string, unknown>;
            const gender = String(snap.gender ?? '');
            return {
                id: it.id,
                userId: it.user_id ?? '',
                status: String(ef.status ?? 'pending'),
                nickname: String(snap.nickname ?? it.contact ?? ''),
                gender,
                genderLabel: gender === 'female' ? '👩 אישה' : gender === 'male' ? '👨 גבר' : '',
                city: String(snap.city ?? ''),
                neighborhood: String(snap.neighborhood ?? ''),
                email: String(snap.email ?? ''),
                phone: it.phone ?? '',
                requestedAt: String(ef.requested_at ?? it.created_at ?? ''),
            };
        })
        .filter((r) => r.status === 'pending')
        .sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));

    return { pending, active, accessRequests, matchmakerRequests };
};

export const actions: Actions = {
    approve: async (event) => {
        await ensureSuperAdmin(event);
        const id = (await event.request.formData()).get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            const r = await decideSinglesCard(id, 'approved');
            if (!r.ok) return fail(404, { error: r.alreadyDecided ? 'הכרטיס כבר הוכרע (אולי מההתראה בפרופיל)' : 'הכרטיס לא נמצא' });
            return { success: true, message: 'הכרטיס אושר ופורסם בלוח ✅' };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    reject: async (event) => {
        await ensureSuperAdmin(event);
        const id = (await event.request.formData()).get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            // החזרה ל-rejected: לא מוצג בלוח, אך לא נמחק (המשתמש יכול לערוך ולשלוח שוב)
            const r = await decideSinglesCard(id, 'rejected');
            if (!r.ok) return fail(404, { error: r.alreadyDecided ? 'הכרטיס כבר הוכרע (אולי מההתראה בפרופיל)' : 'הכרטיס לא נמצא' });
            return { success: true, message: 'הכרטיס נדחה - לא יוצג בלוח 🚫' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    unapprove: async (event) => {
        await ensureSuperAdmin(event);
        const id = (await event.request.formData()).get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            await updateItem(id, { status: 'pending' });
            return { success: true, message: 'הכרטיס הוחזר לממתינים ⏳' };
        } catch (e) {
            return fail(500, { error: `שגיאה: ${e instanceof Error ? e.message : e}` });
        }
    },

    remove: async (event) => {
        const session = await ensureSuperAdmin(event);
        const id = (await event.request.formData()).get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        try {
            await adminDeleteItem(id, session?.user?.id ?? 'admin');
            return { success: true, message: 'הכרטיס נמחק לצמיתות 🗑️' };
        } catch (e) {
            return fail(500, { error: `שגיאה במחיקה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // ── בקשות גישה לצפייה בלוח (הורים/שדכנים) ──
    // הלוגיקה (סטטוס, הודעה למבקש, סימון התראות המנהלים כטופלו) חיה ב-decideSinglesAccess,
    // כדי שכפתור "אשר גישה" על כרטיס ההתראה בפרופיל יעשה בדיוק את אותו הדבר.
    accessDecision: async (event) => {
        await ensureSuperAdmin(event);
        const fd = await event.request.formData();
        const id = fd.get('id') as string;
        const decision = fd.get('decision') as string;
        if (!id || !['approved', 'rejected'].includes(decision)) {
            return fail(400, { error: 'פרמטרים שגויים' });
        }
        try {
            const res = await decideSinglesAccess(id, decision as 'approved' | 'rejected');
            if (!res.ok) return fail(404, { error: 'הבקשה לא נמצאה' });
            return {
                success: true,
                message: decision === 'approved' ? 'הגישה אושרה ✅' : 'הבקשה נדחתה 🚫',
            };
        } catch (e) {
            return fail(500, { error: `שגיאה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // ── בקשות להיות "שדכן מערכת" ──
    matchmakerDecision: async (event) => {
        await ensureSuperAdmin(event);
        const fd = await event.request.formData();
        const id = fd.get('id') as string;
        const decision = fd.get('decision') as string;
        if (!id || !['approved', 'rejected'].includes(decision)) {
            return fail(400, { error: 'פרמטרים שגויים' });
        }
        try {
            const res = await decideMatchmakerRequest(id, decision as 'approved' | 'rejected');
            if (!res.ok) return fail(404, { error: 'הבקשה לא נמצאה' });
            return {
                success: true,
                message: decision === 'approved' ? 'השדכן/ית אושר/ה 💘' : 'הבקשה נדחתה 🚫',
            };
        } catch (e) {
            return fail(500, { error: `שגיאה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
