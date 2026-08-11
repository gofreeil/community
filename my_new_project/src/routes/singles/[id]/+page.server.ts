import { error, redirect } from '@sveltejs/kit';
import { getDbItemById } from '$lib/server/db';
import { mockSingles } from '$lib/singlesMock';
import { dbItemToProfile } from '$lib/singlesMap';
import { getSinglesAccessStatus } from '$lib/server/singlesAccess';
import { isSuperAdmin } from '$lib/server/auth';
import { BOT_UA_RX } from '$lib/server/botUa';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const ua = event.request.headers.get('user-agent') ?? '';
    const isBot = BOT_UA_RX.test(ua);

    // משתמשים רגילים חייבים להיות מחוברים, אבל סקרפרים מקבלים גישה ל-OG
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id && !isBot) {
        throw redirect(302, '/login?redirect=' + encodeURIComponent(event.url.pathname));
    }

    const id = event.params.id;
    const origin = event.url.origin;

    // שליפת הפריט בנפרד — כדי שה-catch לא יבלע redirect של שער הגישה.
    let dbItem = null;
    try { dbItem = await getDbItemById(id); } catch { dbItem = null; }

    if (dbItem && dbItem.category === 'singles') {
        // שער גישה: רק בעלים / סופר-אדמין / מי שאושרה לו גישה. בוטים מקבלים OG בלבד.
        const viewerId = session?.user?.id as string | undefined;
        const isOwner = !!viewerId && dbItem.user_id === viewerId;
        if (!isBot && !isOwner && !isSuperAdmin(session)) {
            const access = await getSinglesAccessStatus(viewerId, false);
            // תקלת Strapi זמנית ≠ אין גישה: לא זורקים משתמש מאושר מהלוח
            if (access === 'unavailable') throw error(503, 'תקלה זמנית בטעינת ההרשאות - נסה שוב בעוד רגע');
            if (access !== 'granted') throw redirect(302, '/singles');
        }
        // ממפים את הפריט האמיתי למבנה single שהדף יודע להציג
        return { single: dbItemToProfile(dbItem), dbItem, isBot, origin };
    }

    const single = mockSingles.find((s) => s.id === id);
    if (!single) throw error(404, 'הפרופיל לא נמצא');

    return { single, dbItem: null, isBot, origin };
};
