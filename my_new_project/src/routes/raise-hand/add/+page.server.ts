import { redirect, fail } from '@sveltejs/kit';
import { createItem, getUserById, getAllUsersRaw } from '$lib/server/db';
import { extraContactsPatch } from '$lib/extraContacts';
import type { PageServerLoad, Actions } from './$types';

const OPTIONS: Record<string, { text: string; icon: string }> = {
    '1': { text: 'מבוגר זקוק לעזרה',                icon: '👴' },
    '2': { text: 'זקוק לעזרה עם הרכב להתנעה',      icon: '🚗' },
    '3': { text: 'הלך ילד לאיבוד',                   icon: '👶' },
    '4': { text: 'קריאת עזרה',                        icon: '🆘' },
    '5': { text: 'אבד כלב',                           icon: '🐕' },
};

export const load: PageServerLoad = async (event) => {
    const optionId = event.url.searchParams.get('option') ?? '4';
    const option   = OPTIONS[optionId] ?? OPTIONS['4'];

    // עיר המשתמש - שבורר הרחובות בשדה המיקום יציע רחובות מהעיר הנכונה
    let userCity = '';
    try {
        const session = await event.locals.auth();
        if (session?.user?.id) {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(session.user.id, jwt ?? undefined);
            userCity = user?.city ?? '';
        }
    } catch {}

    return { optionId, option, userCity };
};

export const actions: Actions = {
    default: async (event) => {
        const fd          = await event.request.formData();
        const optionId    = fd.get('option_id')?.toString()           ?? '4';
        const description = fd.get('description')?.toString().trim()  ?? '';
        const location    = fd.get('location')?.toString().trim()     ?? '';
        const contact     = fd.get('contact')?.toString().trim()      ?? '';
        const phone       = fd.get('phone')?.toString().trim()        ?? '';
        const image_b64   = fd.get('image_base64')?.toString()        ?? '';
        const latRaw      = fd.get('lat')?.toString().trim()          ?? '';
        const lngRaw      = fd.get('lng')?.toString().trim()          ?? '';
        const lat         = latRaw !== '' && Number.isFinite(+latRaw) ? +latRaw : null;
        const lng         = lngRaw !== '' && Number.isFinite(+lngRaw) ? +lngRaw : null;

        // מגירת "נראה לאחרונה" - פרטי איתור אחרונים (אופציונלי, בעיקר בקריאות אובדן)
        const lsTime      = fd.get('last_seen_time')?.toString().trim()    ?? '';
        const lsPlace     = fd.get('last_seen_place')?.toString().trim()   ?? '';
        const lsDetails   = fd.get('last_seen_details')?.toString().trim() ?? '';
        const lastSeen    = (lsTime || lsPlace || lsDetails)
            ? { ...(lsTime ? { time: lsTime } : {}), ...(lsPlace ? { place: lsPlace } : {}), ...(lsDetails ? { details: lsDetails } : {}) }
            : null;

        // סימון פין על המפה נחשב מיקום תקין גם בלי טקסט
        const hasPin = lat != null && lng != null;

        if (!description)         return fail(400, { error: 'יש לתאר את בקשת העזרה' });
        if (!location && !hasPin) return fail(400, { error: 'יש למלא מיקום או לסמן על המפה' });
        if (!phone)               return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });

        // כתובת לתצוגה: הטקסט אם הוקלד, אחרת ציון שסומן במפה
        const address = location || 'מיקום מסומן על המפה';

        const option = OPTIONS[optionId] ?? OPTIONS['4'];

        let session = null;
        try { session = await event.locals.auth(); } catch {}

        // עיר/שכונה של המבקש - נשמרות על הקריאה כדי שהפין ישויך לשכונה הנכונה
        // ושההודעות יישלחו רק לתושבי אותה שכונה.
        let creatorCity = '';
        let creatorNeighborhood = '';
        let creatorName = '';
        if (session?.user?.id) {
            try {
                const jwt = event.cookies.get('strapi_jwt');
                const u = await getUserById(session.user.id, jwt ?? undefined);
                creatorCity         = u?.city         ?? '';
                creatorNeighborhood = u?.neighborhood ?? '';
                creatorName         = u?.name         ?? '';
            } catch {}
        }

        let created;
        try {
            created = await createItem({
                category:    'raise_hand',
                label:       option.text,
                description,
                contact,
                phone,
                address:     address,
                icon:        option.icon,
                color:       'red',
                neighborhood: creatorNeighborhood,
                city:         creatorCity,
                ...(lat != null && lng != null ? { lat, lng } : {}),
                user_id:     session?.user?.id,
                extra_fields: {
                    option_id: optionId,
                    answered:  false,
                    helpers:   [],
                    ...(image_b64 ? { image: image_b64 } : {}),
                    ...(lastSeen ? { last_seen: lastSeen } : {}),
                    ...extraContactsPatch(fd.get('extra_contacts')),
                },
            });
        } catch (e) {
            console.error('[raise-hand] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירה, נסה שוב' });
        }

        // התראת מצוקה לכל תושבי השכונה שאישרו קבלת התראות בפרופיל (best-effort).
        // כשל בשליחה לא מבטל את הקריאה עצמה - היא כבר נשמרה.
        try {
            const all = await getAllUsersRaw();
            const recipients = all.filter(u =>
                String(u.id) !== String(session?.user?.id) &&   // לא לשולח עצמו
                u.notifications !== 0 &&                          // אישר קבלת התראות
                !u.banned &&
                (creatorCity ? u.city === creatorCity : true) &&  // אותה עיר
                // אותה שכונה (או קריאה/משתמש ללא שכונה מוגדרת - ישוב חד-שכונתי)
                (!creatorNeighborhood || !u.neighborhood || u.neighborhood === creatorNeighborhood)
            );

            const areaLabel = creatorNeighborhood || creatorCity || '';
            const body =
                `${option.icon} קריאת עזרה חדשה בשכונה${areaLabel ? ` (${areaLabel})` : ''}:\n\n` +
                `${option.text}\n${description}\n\n📍 ${address}` +
                (phone ? `\n📞 ${phone}` : '') +
                `\n\nאם ביכולתך לעזור - היכנס לדף הבית ולחץ "אני עוזר".`;

            await Promise.allSettled(recipients.map(u =>
                createItem({
                    category:    'message',
                    label:       `${option.icon} קריאת עזרה בשכונה`,
                    description: body,
                    contact:     creatorName || 'שכן/ה בשכונה',
                    user_id:     u.id,
                    icon:        option.icon,
                    color:       'red',
                    extra_fields: {
                        type:        'distress_alert',
                        sender_name: creatorName || 'שכן/ה בשכונה',
                        item_label:  option.text,
                        help_call_id: created?.id ?? '',
                        read:        false,
                    },
                })
            ));
        } catch (e) {
            console.warn('[raise-hand] neighbor notify failed:', e instanceof Error ? e.message : e);
        }

        throw redirect(302, '/?help_sent=1');
    },
};
