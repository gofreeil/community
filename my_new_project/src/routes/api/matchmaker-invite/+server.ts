import { json } from '@sveltejs/kit';
import { getUserByPhone, createItem } from '$lib/server/db';
import { getMatchmakerStatus } from '$lib/server/matchmaker';
import type { RequestHandler } from './$types';

// שדכן מאושר שולח הזמנה למועמד/ת שעדיין אין לו/ה כרטיס: ההזמנה נכנסת לתיבת
// ההודעות של הנמען (item category='message') ומופיעה שם ככרטיס לחיץ שמפנה
// להשלמת הפרופיל (/add/singles) — "השלם את הפרופיל וקבל את הכרטיס".
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    }
    const isSuperAdmin = session.user.role === 'super_admin';

    const status = await getMatchmakerStatus(session.user.id as string, isSuperAdmin);
    if (status !== 'approved') {
        return json({ success: false, message: 'נדרשת הרשאת שדכן מערכת' }, { status: 403 });
    }

    let body: { phone?: string; message?: string } = {};
    try { body = await event.request.json(); } catch { /* empty */ }
    const phone = String(body?.phone ?? '').trim();
    const message = String(body?.message ?? '').trim();
    if (!phone) {
        return json({ success: false, message: 'נא להזין טלפון נמען לשליחה באתר' }, { status: 400 });
    }

    try {
        const user = await getUserByPhone(phone);
        if (!user?.id) {
            // הנמען אינו רשום — אין תיבת הודעות לשלוח אליה. השדכן ישלח בוואטסאפ.
            return json(
                { success: false, code: 'no_user', message: 'אין משתמש רשום עם הטלפון הזה — שלחו בוואטסאפ במקום' },
                { status: 404 },
            );
        }

        // גוף ההודעה: הטקסט של השדכן (בלי נקודתיים תלויות בסוף) + שורת קריאה-לפעולה.
        // הכרטיס עצמו לחיץ (extra_fields.link) ומוביל להשלמת הפרופיל.
        const clean = (message || 'יש עבורך ניסיון התאמה להכרת בן/בת גילך. השלימו את הפרופיל באתר קהילה בשכונה וקבלו את הכרטיס').replace(/[:：]\s*$/, '');
        const description = `${clean}\n👈 לחצו כאן להשלמת הפרופיל וקבלת הכרטיס`;

        await createItem({
            category: 'message',
            label: '💘 יש עבורך ניסיון התאמה',
            description,
            contact: '',
            user_id: user.id,
            icon: '💘',
            color: 'pink',
            extra_fields: {
                type: 'matchmaker_invite',
                read: false,
                link: '/add/singles',
                sender_name: 'שדכני קהילה בשכונה',
            },
        });

        return json({ success: true, name: user.nickname || user.name || '' });
    } catch (e) {
        console.error('[matchmaker-invite POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
