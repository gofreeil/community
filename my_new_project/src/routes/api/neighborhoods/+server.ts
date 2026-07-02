import { json } from '@sveltejs/kit';
import { getNeighborhoods, createNeighborhoodRequest, createItem, getUserById } from '$lib/server/db';
import type { RequestHandler } from './$types';

// ---- GET: approved neighborhoods (for merging into the picker / map) ----
export const GET: RequestHandler = async () => {
    const list = await getNeighborhoods('approved');
    return json(list);
};

// ---- POST: a resident proposes a new neighborhood with a precise map pin ----
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();

    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ success: false, message: 'נתונים לא תקינים' }, { status: 400 });
    }

    const name = String(body.name ?? '').trim();
    const city = String(body.city ?? '').trim();
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!name || !city) {
        return json({ success: false, message: 'חסר שם שכונה או עיר' }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return json({ success: false, message: 'נא לסמן את מיקום השכונה על המפה' }, { status: 400 });
    }

    // פרטי קשר של המבקש - כדי שהאדמין יוכל לפתוח איתו צ'אט ישירות מהפאנל.
    // מהטופס (בקשת רכז נשלחת גם בלי חשבון), ואם חסר - מפרופיל המשתמש המחובר.
    let requesterName  = String(body.requester_name  ?? '').trim();
    let requesterPhone = String(body.requester_phone ?? '').trim();
    if ((!requesterName || !requesterPhone) && session?.user?.id) {
        try {
            const u = await getUserById(session.user.id);
            if (!requesterName)  requesterName  = u?.name ?? u?.nickname ?? '';
            if (!requesterPhone) requesterPhone = u?.phone ?? '';
        } catch { /* לא חוסם את הבקשה */ }
    }

    const created = await createNeighborhoodRequest({
        name,
        city,
        lat,
        lng,
        user_id: session?.user?.id ?? undefined,
        requester_name:  requesterName  || undefined,
        requester_phone: requesterPhone || undefined,
    });

    // בקשה זהה כבר קיימת - לא נוצרה כפילות, מחזירים את המצב האמיתי
    if (created.alreadyExisted) {
        return json({
            success: true,
            id: created.id,
            alreadyPending:  created.status === 'pending',
            alreadyApproved: created.status === 'approved',
        });
    }

    // אישור קבוע בתיבת ההודעות - הוכחה שהבקשה נקלטה, כדי שהמשתמש לא ישלח שוב ושוב.
    // (רק למשתמש מחובר; מטופס בקשת רכז אפשר להגיע גם בלי חשבון)
    if (session?.user?.id) {
        try {
            await createItem({
                category:    'message',
                label:       `📍 בקשתך להוספת "${name}" התקבלה`,
                description:
                    `קיבלנו את בקשתך להוסיף את "${name}" (${city}) למפת השכונות.\n` +
                    `הבקשה ממתינה לאישור מנהל — נעדכן אותך כאן ברגע שהשכונה תתווסף. אין צורך לשלוח שוב 🙏`,
                icon:        '📍',
                color:       'green',
                user_id:     session.user.id,
                extra_fields: {
                    type:               'neighborhood_request_ack',
                    requested_location: name,
                    requested_city:     city,
                    requested_at:       new Date().toISOString(),
                },
            });
        } catch (e) {
            console.warn('[api/neighborhoods] user ack message failed:', e);
        }
    }

    return json({ success: true, id: created.id });
};
