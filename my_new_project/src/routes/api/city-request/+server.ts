import { json } from '@sveltejs/kit';
import { createItem, getAllSuperAdmins, getMessagesByUserId, getUserById } from '$lib/server/db';
import { citiesAndNeighborhoods } from '$lib/neighborhoodsData';
import type { RequestHandler } from './$types';

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * בקשה להוספת עיר/יישוב שלא ברשימה - נשלחת מהאשף ("העיר שלי לא ברשימה").
 * לא חוסמת את המשתמש: העיר והשכונה שהקליד כבר נשמרות בפרופיל שלו, וכאן רק
 * מודיעים לסופר-אדמינים כדי שיוסיפו אותה לרשימה. best-effort - כשלון לא מציג שגיאה.
 */
export const POST: RequestHandler = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* עוגייה פגומה */ }
    if (!session?.user?.id) return json({ success: false }, { status: 401 });

    let body: Record<string, unknown> = {};
    try { body = (await event.request.json()) ?? {}; } catch { /* גוף ריק */ }

    const city = String(body.city ?? '').trim().slice(0, 80);
    const neighborhood = String(body.neighborhood ?? '').trim().slice(0, 80);
    if (!city) return json({ success: false }, { status: 400 });

    // כבר ברשימה - אין מה לבקש
    if (Object.keys(citiesAndNeighborhoods).some((c) => norm(c) === norm(city))) {
        return json({ success: true, alreadyApproved: true });
    }

    let requesterName = '';
    let requesterPhone = '';
    try {
        const u = await getUserById(session.user.id as string, event.cookies.get('strapi_jwt'));
        requesterName = u?.name ?? u?.nickname ?? '';
        requesterPhone = u?.phone ?? '';
    } catch { /* ממשיכים בלי פרטי קשר */ }

    try {
        const admins = await getAllSuperAdmins();
        const requesterLine = requesterName || requesterPhone
            ? `👤 מבקש: ${requesterName || 'ללא שם'}${requesterPhone ? ` · ${requesterPhone}` : ''}\n`
            : '';
        await Promise.all(admins.map(async (admin) => {
            // דדופ: אם כבר יש לאדמין בקשה פתוחה לאותה עיר - לא שולחים כפילות
            try {
                const inbox = await getMessagesByUserId(admin.id);
                const dup = (inbox ?? []).some((m) => {
                    let ef: Record<string, unknown> = {};
                    try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { return false; }
                    return String(ef?.type ?? '') === 'city_request' && !ef?.handled &&
                        norm(String(ef?.requested_city ?? '')) === norm(city);
                });
                if (dup) return;
            } catch { /* עדיף לשלוח מאשר להחסיר */ }
            await createItem({
                category:    'message',
                label:       `🏙️ בקשת עיר חדשה: ${city}`,
                description:
                    `משתמש לא מצא את העיר "${city}" ברשימה בהרשמה.\n` +
                    (neighborhood ? `שכונה שהקליד: ${neighborhood}\n` : '') +
                    requesterLine +
                    `\nהעיר והשכונה כבר נשמרו בפרופיל שלו. להוספה לרשימה: הוספת שכונה לעיר בעמוד הניהול.`,
                icon:        '🏙️',
                color:       'yellow',
                user_id:     admin.id,
                extra_fields: {
                    type:               'city_request',
                    requested_city:     city,
                    requested_location: neighborhood,
                    requester_name:     requesterName,
                    requester_phone:    requesterPhone,
                    requested_by_id:    session.user.id as string,
                    requested_at:       new Date().toISOString(),
                },
            });
        }));
    } catch (e) {
        console.warn('[api/city-request] notify super_admins failed:', e);
        return json({ success: false });
    }

    return json({ success: true });
};
