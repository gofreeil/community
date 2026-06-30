import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions, RequestEvent } from './$types';
import {
    getUserById,
    getUserByEmail,
    getUserByAnyId,
    getItemsByUserId,
    getMessagesByUserId,
    createItem,
} from '$lib/server/db';

/** מאמת שהמשתמש המחובר הוא סופר־אדמין (ישירות מ-DB + fallback לפי אימייל למיזוג OAuth+credentials) */
async function requireSuperAdmin(event: RequestEvent): Promise<{ id: string; name?: string | null; email?: string | null }> {
    const session = await event.locals.auth();
    if (!session?.user?.id) throw error(403, 'נדרשת הרשאת מנהל ראשי');

    let isSuperAdmin = session.user.role === 'super_admin';
    if (!isSuperAdmin) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            isSuperAdmin = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!isSuperAdmin) throw error(403, 'נדרשת הרשאת מנהל ראשי');

    return { id: session.user.id, name: session.user.name, email: session.user.email };
}

function parseEF(s: string | null | undefined): Record<string, unknown> {
    try { return JSON.parse(s || '{}'); } catch { return {}; }
}

/** בונה את שרשור השיחה: כל ההודעות שהמשתמש קיבל (יוצאות) + תשובות שלו לאדמין (נכנסות) */
async function loadThread(adminId: string, userId: string) {
    try {
        const [toUser, toAdmin] = await Promise.all([
            getMessagesByUserId(userId),
            getMessagesByUserId(adminId),
        ]);

        // כל ההודעות שהמשתמש קיבל - מוצגות כבועות "יוצאות" (אל המשתמש).
        // הודעת צ'אט מהאדמין: רק הטקסט. התראת מערכת/הודעה מאחר: שם השולח + כותרת.
        const out = toUser.map((m) => {
            const ef = parseEF(m.extra_fields);
            const fromAdmin = ef.chat === true && ef.sender_id === adminId;
            return {
                id: m.id,
                text: m.description,
                title: fromAdmin ? '' : (m.label || ''),
                sender_name: fromAdmin ? '' : String(ef.sender_name || 'מערכת'),
                created_at: m.created_at,
                direction: 'out' as const,
            };
        });

        // תשובות מהמשתמש הזה אל האדמין
        const incoming = toAdmin
            .filter((m) => parseEF(m.extra_fields).sender_id === userId)
            .map((m) => ({
                id: m.id,
                text: m.description,
                title: '',
                sender_name: '',
                created_at: m.created_at,
                direction: 'in' as const,
            }));

        return [...out, ...incoming].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
    } catch (e) {
        console.warn('[admin/users] loadThread failed:', e);
        return [];
    }
}

export const load: PageServerLoad = async (event) => {
    const admin = await requireSuperAdmin(event);

    const userId = event.params.id;
    const user = await getUserByAnyId(userId);
    if (!user) throw error(404, 'המשתמש לא נמצא');

    let items: Awaited<ReturnType<typeof getItemsByUserId>> = [];
    try {
        // הודעות אישיות (category 'message') אינן פרסומים - הן מוצגות בצ'אט בלבד
        items = (await getItemsByUserId(userId)).filter((it) => it.category !== 'message');
    } catch (e) {
        console.warn('[admin/users] getItemsByUserId failed:', e);
    }

    const thread = await loadThread(admin.id, user.id);

    return { profileUser: user, items, thread, adminId: admin.id };
};

export const actions: Actions = {
    // שליחת הודעה אישית פנימית מהאדמין למשתמש (נשמרת כפריט category 'message')
    sendMessage: async (event) => {
        const admin = await requireSuperAdmin(event);

        const form = await event.request.formData();
        const text = form.get('text')?.toString().trim() ?? '';
        if (!text) return fail(400, { chatError: 'אי אפשר לשלוח הודעה ריקה' });
        if (text.length > 4000) return fail(400, { chatError: 'ההודעה ארוכה מדי' });

        const target = await getUserByAnyId(event.params.id);
        if (!target) return fail(404, { chatError: 'המשתמש לא נמצא' });

        // שם וטלפון האדמין (כדי שהמשתמש יוכל להשיב בוואטסאפ/טלפון מתיבת ההודעות)
        let adminProfile = null;
        try { adminProfile = await getUserById(admin.id); } catch { /* ignore */ }
        const adminName = adminProfile?.name || admin.name || 'הנהלת הקהילה';

        try {
            await createItem({
                category: 'message',
                label: `💬 הודעה מ${adminName}`,
                description: text,
                icon: '💬',
                color: 'purple',
                user_id: target.id,
                extra_fields: {
                    chat: true,
                    sender_id: admin.id,
                    sender_name: adminName,
                    sender_phone: adminProfile?.phone || '',
                    sent_at: new Date().toISOString(),
                    read: false,
                },
            });
            return { chatSuccess: true };
        } catch (e) {
            console.warn('[admin/users] sendMessage failed:', e);
            return fail(500, { chatError: 'שגיאה בשליחת ההודעה, נסה שוב' });
        }
    },
};
