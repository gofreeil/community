import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
    getUserById,
    getUserByEmail,
    getItemsByCategory,
    getItemsByCategoryAndStatus,
    createItem,
    updateItem,
    adminDeleteItem,
} from '$lib/server/db';
import { dbItemToProfile } from '$lib/singlesMap';

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
    const pending = pendingItems.map((it) => ({ ...dbItemToProfile(it), createdAt: it.created_at }));
    const active = activeItems.map((it) => ({ ...dbItemToProfile(it), createdAt: it.created_at }));

    // בקשות גישה לצפייה בלוח (הורים/שדכנים) שממתינות לאישור
    const accessRequests = accessItems
        .map((it) => {
            let ef: Record<string, unknown> = {};
            try { ef = it.extra_fields ? JSON.parse(it.extra_fields) : {}; } catch { ef = {}; }
            const snap = (ef.requester_snapshot ?? {}) as Record<string, unknown>;
            return {
                id: it.id,
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
            await updateItem(id, { status: 'active' });
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
            await updateItem(id, { status: 'rejected' });
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
    accessDecision: async (event) => {
        await ensureSuperAdmin(event);
        const fd = await event.request.formData();
        const id = fd.get('id') as string;
        const decision = fd.get('decision') as string;
        if (!id || !['approved', 'rejected'].includes(decision)) {
            return fail(400, { error: 'פרמטרים שגויים' });
        }
        try {
            const req = (await getItemsByCategory('singles_access')).find((r) => r.id === id);
            if (!req) return fail(404, { error: 'הבקשה לא נמצאה' });
            let ef: Record<string, unknown> = {};
            try { ef = req.extra_fields ? JSON.parse(req.extra_fields) : {}; } catch { ef = {}; }

            await updateItem(id, {
                extra_fields: { ...ef, status: decision, decided_at: new Date().toISOString() },
            });

            // עדכון למבקש (הודעה בתוך האתר). אישור → הגישה נפתחה; דחייה → הודעה מנומסת.
            // פנוי/ה שביקש/ה צפייה בלבד ונדחה/תה — נוסח אישי: הזמנה לפרסם כרטיס + ליווי השדכנים.
            const isSingleRejection = decision === 'rejected' && String(ef.role ?? '') === 'single';
            const singleRejectionText = [
                'תודה על התעניינותך בלוח הפנויים/פנויות 💗',
                'כדי לשמור על הפרטיות וההדדיות של חברי הלוח, הצפייה בכרטיסים פתוחה רק למי שמפרסמים כרטיס משלהם — ולכן לא נוכל לאשר גישת צפייה בלבד.',
                'נשמח שתצטרף/י בדרך המלאה: פרסום כרטיס אישי משלך — עם אישורו, הלוח ייפתח לך אוטומטית לצפייה. יצירת כרטיס: /add/singles',
                'בנוסף, השדכנים והשדכניות של המערכת מלווים את הלוח באופן אישי — כשיראו לנכון, ישלחו לך הצעות אישיות לצפייה בכרטיסים ספציפיים מהצד השני, להיכרות ולבחינת ההתאמה.',
                'מחכים לכרטיס שלך 💞',
            ].join('\n\n');
            if (req.user_id) {
                try {
                    await createItem({
                        category: 'message',
                        label: decision === 'approved'
                            ? '✅ הגישה ללוח הפנויים אושרה'
                            : 'לגבי בקשת הגישה ללוח הפנויים',
                        description: decision === 'approved'
                            ? 'בקשתך אושרה — לוח הפנויים/פנויות פתוח לצפייה. כניסה: /singles'
                            : isSingleRejection
                                ? singleRejectionText
                                : 'לאחר בדיקה, בקשת הגישה ללוח לא אושרה כרגע. אפשר לפנות אלינו דרך "כתוב למערכת" בדף הפרופיל.',
                        contact: '',
                        user_id: req.user_id,
                        icon: decision === 'approved' ? '✅' : '💬',
                        color: 'pink',
                        extra_fields: { type: 'singles_access_decision', read: false, link: isSingleRejection ? '/add/singles' : '/singles' },
                    });
                } catch (e) {
                    console.warn('[singles-review] notify requester failed:', e instanceof Error ? e.message : e);
                }
            }

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
            const req = (await getItemsByCategory('matchmaker_request')).find((r) => r.id === id);
            if (!req) return fail(404, { error: 'הבקשה לא נמצאה' });
            let ef: Record<string, unknown> = {};
            try { ef = req.extra_fields ? JSON.parse(req.extra_fields) : {}; } catch { ef = {}; }

            await updateItem(id, {
                extra_fields: { ...ef, status: decision, decided_at: new Date().toISOString() },
            });

            // עדכון למבקש (הודעה בתוך האתר)
            if (req.user_id) {
                try {
                    await createItem({
                        category: 'message',
                        label: decision === 'approved'
                            ? '💘 אושרת כשדכן/ית מערכת'
                            : 'לגבי בקשת השדכנות',
                        description: decision === 'approved'
                            ? 'הבקשה שלך אושרה — קיבלת הרשאת שדכן/ית מערכת. נכנסים לכלי השדכנות דרך "כלים לשדכן" בלוח הפנויים/פנויות: /singles/matchmaker'
                            : 'לאחר בדיקה, בקשת השדכנות לא אושרה כרגע. אפשר לפנות אלינו דרך "כתוב למערכת" בדף הפרופיל.',
                        contact: '',
                        user_id: req.user_id,
                        icon: decision === 'approved' ? '💘' : '💬',
                        color: 'pink',
                        extra_fields: {
                            type: 'matchmaker_decision',
                            read: false,
                            link: decision === 'approved' ? '/singles/matchmaker' : '/singles',
                        },
                    });
                } catch (e) {
                    console.warn('[singles-review] notify matchmaker failed:', e instanceof Error ? e.message : e);
                }
            }

            return {
                success: true,
                message: decision === 'approved' ? 'השדכן/ית אושר/ה 💘' : 'הבקשה נדחתה 🚫',
            };
        } catch (e) {
            return fail(500, { error: `שגיאה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
