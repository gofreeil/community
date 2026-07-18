import { json } from '@sveltejs/kit';
import { createItem, getUserById, getAllSuperAdmins } from '$lib/server/db';
import { getMatchmakerStatus, MATCHMAKER_REQUEST_CATEGORY } from '$lib/server/matchmaker';
import type { RequestHandler } from './$types';

// בקשה להיות "שדכן מערכת": משתמש (גבר או אישה) מבקש הרשאת שדכנות.
// הבקשה נשמרת כפריט pending, ונשלחת התראה לסופר-אדמין כמו בבקשת רכז שכונה —
// עד שהסופר-אדמין מאשר בפאנל /admin/singles-review.
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר כדי לבקש' }, { status: 401 });
    }

    const requesterId = session.user.id as string;
    const isSuperAdmin = session.user.role === 'super_admin';

    try {
        const requester = await getUserById(requesterId);
        if (requester?.banned) {
            return json({ success: false, message: 'החשבון שלך חסום' }, { status: 403 });
        }

        // כבר מאושר / כבר יש בקשה פתוחה — לא יוצרים כפילות.
        const existing = await getMatchmakerStatus(requesterId, isSuperAdmin);
        if (existing === 'approved') return json({ success: true, already: 'approved' });
        if (existing === 'pending') return json({ success: true, already: 'pending' });

        const requesterName = requester?.nickname || requester?.name || 'משתמש';

        await createItem({
            category: MATCHMAKER_REQUEST_CATEGORY,
            label: 'בקשה להיות שדכן מערכת',
            user_id: requesterId,
            phone: requester?.phone || '',
            contact: requesterName,
            icon: '💘',
            color: 'pink',
            extra_fields: {
                status: 'pending',
                requested_at: new Date().toISOString(),
                requester_snapshot: {
                    nickname: requesterName,
                    gender: requester?.gender || '',
                    city: requester?.city || '',
                    neighborhood: requester?.neighborhood || '',
                    email: requester?.email || '',
                },
            },
        });

        // התראה לסופר-אדמינים — אותו דפוס כמו בקשת רכז שכונה ובקשת גישה ללוח.
        try {
            const admins = await getAllSuperAdmins();
            await Promise.all(
                admins
                    .filter((a) => a.id)
                    .map((a) =>
                        createItem({
                            category: 'message',
                            label: '💘 בקשה חדשה להיות שדכן מערכת',
                            description: `${requesterName} מבקש/ת להיות שדכן/ית מערכת (הרשאת שידוכים). אישור בדף: /admin/singles-review`,
                            contact: '',
                            user_id: a.id,
                            icon: '💘',
                            color: 'pink',
                            extra_fields: { type: 'matchmaker_request', read: false, link: '/admin/singles-review' },
                        }),
                    ),
            );
        } catch (e) {
            console.warn('[matchmaker-request] notify admins failed:', e instanceof Error ? e.message : e);
        }

        return json({ success: true });
    } catch (e) {
        console.error('[matchmaker-request POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
