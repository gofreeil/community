import { error } from '@sveltejs/kit';
import { getDbItemById } from '$lib/server/db';
import { mockSingles } from '$lib/singlesMock';
import { dbItemToProfile } from '$lib/singlesMap';
import { withSinglesImageUrls, stripSinglesItemImages } from '$lib/server/singlesImages';
import { BOT_UA_RX } from '$lib/server/botUa';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const ua = event.request.headers.get('user-agent') ?? '';
    const isBot = BOT_UA_RX.test(ua);

    // קישור ישיר לכרטיס פתוח לכולם - הצפייה חופשית, אינטראקציה מחייבת התחברות
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    const isLoggedIn = !!session?.user?.id;

    const id = event.params.id;
    const origin = event.url.origin;

    let dbItem = null;
    try { dbItem = await getDbItemById(id); } catch { dbItem = null; }

    if (dbItem && dbItem.category === 'singles') {
        // ממפים את הפריט האמיתי למבנה single שהדף יודע להציג
        // תמונות ככתובות ולא base64 בנתוני הדף - ראה singlesImages.ts
        return { single: withSinglesImageUrls(dbItemToProfile(dbItem)), dbItem: stripSinglesItemImages(dbItem), isBot, origin, isLoggedIn };
    }

    const single = mockSingles.find((s) => s.id === id);
    if (!single) throw error(404, 'הפרופיל לא נמצא');

    return { single, dbItem: null, isBot, origin, isLoggedIn };
};
