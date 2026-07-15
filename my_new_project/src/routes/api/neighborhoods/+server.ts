import { json } from '@sveltejs/kit';
import { getNeighborhoods, createNeighborhoodRequest, createItem, getUserById, getAllSuperAdmins, getMessagesByUserId } from '$lib/server/db';
import type { RequestHandler } from './$types';

// נרמול שם מיקום לזיהוי כפילויות - זהה ל-normalizeLoc שבשאר המערכת (locationDecision).
const normalizeLoc = (s: string) =>
    s.trim().replace(/\s+/g, ' ').replace(/^(שכונת|שכונה)\s+/, '').toLowerCase();

// נרמול טלפון לפורמט מקומי אחיד (0XXXXXXXXX) - כדי שאותו מספר לא ייראה כשני מספרים
// שונים (972545942952 מול 0545942952) ולא ייצור שתי בקשות/הודעות נפרדות.
function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('972')) return '0' + digits.slice(3);
    if (digits.startsWith('0'))   return digits;
    if (digits.length === 9)      return '0' + digits; // נייד בלי אפס מוביל
    return digits;
}

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
    // פורמט אחיד לטלפון - בין אם הגיע מהטופס (מקומי) ובין אם מהפרופיל (בינלאומי)
    requesterPhone = normalizePhone(requesterPhone);

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

    // הודעה לכל סופר-אדמין - שהבקשה תופיע גם בתיבת ההודעות שלו, לא רק בפאנל
    // (המסלול הזה, פין-על-המפה, לא שלח שום התראה עד היום - בניגוד למסלול הפרופיל)
    try {
        const admins = await getAllSuperAdmins();
        const requesterLine = requesterName || requesterPhone
            ? `👤 מבקש: ${requesterName || 'ללא שם'}${requesterPhone ? ` · ${requesterPhone}` : ''}\n`
            : `👤 המבקש לא היה מחובר ולא השאיר פרטים\n`;
        const normName = normalizeLoc(name);
        await Promise.all(admins.map(async (admin) => {
            // דדופ פר-אדמין: אם כבר יש לו הודעת "בקשת שכונה" *פתוחה* (לא "טופל") לאותה
            // שכונה+עיר - לא שולחים כפילות. חוסם את שני התרחישים שגרמו לכפל בפועל:
            //   1. שני מסלולים ששולחים POST לכאן (פין-פרופיל + בקשת-רכז) לאותה שכונה.
            //   2. שליחה חוזרת של אותו טופס.
            // תואם ל-normalizeLoc שבו משתמשת החלטת האדמין (locationDecision) לסימון "טופל".
            try {
                const inbox = await getMessagesByUserId(admin.id);
                const dup = (inbox ?? []).some((m) => {
                    let ef: Record<string, unknown> = {};
                    try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { return false; }
                    return String(ef?.type ?? '') === 'neighborhood_request' &&
                        !ef?.handled &&
                        normalizeLoc(String(ef?.requested_location ?? '')) === normName &&
                        String(ef?.requested_city ?? '').trim() === city.trim();
                });
                if (dup) return;
            } catch { /* אם הבדיקה נכשלה - עדיף לשלוח מאשר להחסיר בקשה */ }
            await createItem({
                category:    'message',
                label:       `📍 בקשת שכונה חדשה: ${name} (${city})`,
                description:
                    `התקבלה בקשה להוספת השכונה "${name}" ב${city} עם פין על המפה.\n\n` +
                    requesterLine +
                    `🗺️ ${lat}, ${lng}\nhttps://www.google.com/maps?q=${lat},${lng}\n\n` +
                    `אשר/דחה בעמוד הניהול תחת "שכונות ממתינות לאישור".`,
                icon:        '📍',
                color:       'yellow',
                user_id:     admin.id,
                extra_fields: {
                    type:               'neighborhood_request',
                    requested_location: name,
                    requested_city:     city,
                    requested_lat:      lat,
                    requested_lng:      lng,
                    requester_name:     requesterName,
                    requester_phone:    requesterPhone,
                    // מזהה המבקש - נדרש כדי שכפתורי אשר/דחה בכרטיס ההודעה בפרופיל
                    // יוכלו להודיע למבקש ולסגור את בקשתו (סנכרון מלא בין המקומות)
                    requested_by_id:    session?.user?.id ?? '',
                    requested_at:       new Date().toISOString(),
                },
            });
        }));
    } catch (e) {
        console.warn('[api/neighborhoods] notify super_admins failed:', e);
    }

    // אישור הקליטה מוצג למבקש מיד בממשק (pin_saved) - בלי הודעה בתיבת ההודעות,
    // כדי לא להציף אותה. לתיבה מגיעה רק הודעת ההחלטה כשהמנהל מאשר/דוחה.

    return json({ success: true, id: created.id });
};
