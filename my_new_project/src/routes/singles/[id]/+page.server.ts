import { error } from '@sveltejs/kit';
import { getDbItemById } from '$lib/server/db';
import { mockSingles } from '$lib/singlesMock';
import { dbItemToProfile } from '$lib/singlesMap';
import { withSinglesImageUrls, stripSinglesItemImages } from '$lib/server/singlesImages';
import { withCharterAutoDetectOne, ownerEmail } from '$lib/server/charterSignatures';
import { BOT_UA_RX } from '$lib/server/botUa';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const ua = event.request.headers.get('user-agent') ?? '';
    const isBot = BOT_UA_RX.test(ua);

    // קישור ישיר לכרטיס פתוח לכולם - הצפייה חופשית, אינטראקציה מחייבת התחברות
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    const isLoggedIn = !!session?.user?.id;
    const viewerId = session?.user?.id as string | undefined;

    const id = event.params.id;
    const origin = event.url.origin;

    let dbItem = null;
    try { dbItem = await getDbItemById(id); } catch { dbItem = null; }

    if (dbItem && dbItem.category === 'singles') {
        // ממפים את הפריט האמיתי למבנה single שהדף יודע להציג
        // תמונות ככתובות ולא base64 בנתוני הדף - ראה singlesImages.ts
        // isOwner: הכפתור "צור כרטיס פנוי משלך" מוצג לכל צופה חוץ מבעל הכרטיס
        const isOwner = !!viewerId && dbItem.user_id === viewerId;
        const single = await withCharterAutoDetectOne(
            withSinglesImageUrls(dbItemToProfile(dbItem)),
            await ownerEmail(dbItem.user_id),
        );
        return { single, dbItem: stripSinglesItemImages(dbItem), isBot, origin, isLoggedIn, isOwner };
    }

    const single = mockSingles.find((s) => s.id === id);
    if (!single) throw error(404, 'הפרופיל לא נמצא');

    return { single, dbItem: null, isBot, origin, isLoggedIn, isOwner: false };
};
