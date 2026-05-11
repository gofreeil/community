import { json } from '@sveltejs/kit';
import { createItem, getItemsByCategory, getUserById } from '$lib/server/db';
import type { RequestHandler } from './$types';

// חלון הדיווח: שבת(6) + ראשון–רביעי(0-3)
function isReportWindowOpen(): boolean {
    const day = new Date().getDay();
    return [0, 1, 2, 3, 6].includes(day);
}

export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר כדי לדווח' }, { status: 401 });
    }
    if (!isReportWindowOpen()) {
        return json({ success: false, message: 'ניתן לדווח רק ממוצאי שבת עד יום רביעי' }, { status: 403 });
    }

    let body: { reported_phone?: string; reported_contact?: string } = {};
    try { body = await event.request.json(); } catch { /* empty */ }

    const reported_phone = String(body?.reported_phone ?? '').trim();
    if (!reported_phone) {
        return json({ success: false, message: 'חסר מספר טלפון' }, { status: 400 });
    }

    try {
        // וודא שהמדווח הוא מארח פעיל
        const realestateItems = await getItemsByCategory('realestate');
        const reporterIsHost = realestateItems.some(item => {
            if (item.user_id !== (session.user!.id as string)) return false;
            try {
                const ef = JSON.parse(item.extra_fields || '{}');
                return String(ef.offer_type ?? '').includes('מציע');
            } catch { return false; }
        });
        if (!reporterIsHost) {
            return json({ success: false, message: 'רק מארח שפרסם הזמנה יכול לדווח' }, { status: 403 });
        }

        // בדוק כפילות
        const existingReports = await getItemsByCategory('shabbat_report');
        if (existingReports.some(r =>
            r.user_id === (session.user!.id as string) && r.phone === reported_phone
        )) {
            return json({ success: false, message: 'כבר דיווחת על אורח זה' }, { status: 409 });
        }

        const reporter = await getUserById(session.user.id as string);
        await createItem({
            category: 'shabbat_report',
            label: 'דיווח על אורח',
            phone: reported_phone,
            user_id: session.user.id as string,
            contact: reporter?.nickname || reporter?.name || '',
            extra_fields: {
                reporter_user_id: session.user.id,
                reporter_phone: reporter?.phone || '',
                reported_phone,
                reported_contact: body.reported_contact ?? '',
            },
        });

        return json({ success: true });
    } catch (e) {
        console.error('[shabbat-report POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
