import { json } from '@sveltejs/kit';
import { createItem, getUserById, getAllSuperAdmins } from '$lib/server/db';
import { getSinglesAccessStatus, SINGLES_ACCESS_ROLES, type SinglesAccessRole } from '$lib/server/singlesAccess';
import type { RequestHandler } from './$types';

const ROLE_LABEL: Record<SinglesAccessRole, string> = {
    single: 'פנוי/ה שמחפש/ת',
    parent: 'הורה / קרוב משפחה',
    matchmaker: 'שדכן/ית',
};

// בקשת גישה לצפייה בלוח הפנויים/פנויות (הורים/שדכנים שאין להם כרטיס משלהם).
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר כדי לבקש גישה' }, { status: 401 });
    }

    const requesterId = session.user.id as string;

    let body: { role?: string; agreed?: boolean } = {};
    try { body = await event.request.json(); } catch { /* empty */ }

    const role = String(body?.role ?? '').trim() as SinglesAccessRole;
    if (!SINGLES_ACCESS_ROLES.includes(role)) {
        return json({ success: false, message: 'יש לבחור מי מבקש/ת לצפות' }, { status: 400 });
    }
    if (body?.agreed !== true) {
        return json({ success: false, message: 'יש לאשר את ההתחייבות לדיסקרטיות' }, { status: 400 });
    }

    try {
        const requester = await getUserById(requesterId);
        if (requester?.banned) {
            return json({ success: false, message: 'החשבון שלך חסום' }, { status: 403 });
        }

        // כבר יש גישה / בקשה פתוחה — לא יוצרים כפילות.
        const existing = await getSinglesAccessStatus(requesterId, false);
        if (existing === 'granted') return json({ success: true, already: 'granted' });
        if (existing === 'pending') return json({ success: true, already: 'pending' });

        await createItem({
            category: 'singles_access',
            label: 'בקשת גישה ללוח פנויים',
            user_id: requesterId,
            phone: requester?.phone || '',
            contact: requester?.nickname || requester?.name || '',
            icon: '🔑',
            color: 'pink',
            extra_fields: {
                role,
                role_label: ROLE_LABEL[role],
                agreed_terms: true,
                status: 'pending',
                requested_at: new Date().toISOString(),
                requester_snapshot: {
                    nickname: requester?.nickname || requester?.name || '',
                    gender: requester?.gender || '',
                    city: requester?.city || '',
                    neighborhood: requester?.neighborhood || '',
                    email: requester?.email || '',
                },
            },
        });

        // התראה לסופר-אדמינים — אותו דפוס כמו אישור כרטיסים.
        try {
            const admins = await getAllSuperAdmins();
            await Promise.all(
                admins
                    .filter((a) => a.id)
                    .map((a) =>
                        createItem({
                            category: 'message',
                            label: '🔑 בקשת גישה חדשה ללוח פנויים',
                            description: `${ROLE_LABEL[role]} (${requester?.nickname || requester?.name || 'משתמש'}) מבקש/ת גישה לצפייה בלוח. אישור בדף: /admin/singles-review`,
                            contact: '',
                            user_id: a.id,
                            icon: '🔑',
                            color: 'pink',
                            extra_fields: { type: 'singles_access', read: false, link: '/admin/singles-review' },
                        }),
                    ),
            );
        } catch (e) {
            console.warn('[singles-access] notify admins failed:', e instanceof Error ? e.message : e);
        }

        return json({ success: true });
    } catch (e) {
        console.error('[singles-access POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
