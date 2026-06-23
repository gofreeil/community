import { error, redirect } from '@sveltejs/kit';
import { getDbItemById } from '$lib/server/db';
import { mockSingles } from '$lib/singlesMock';
import type { PageServerLoad } from './$types';

// בוטים של רשתות חברתיות וסקרפרים שצריכים לראות תגי OG בלי לוגין
const BOT_UA_RX = /(WhatsApp|TelegramBot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|Pinterest|redditbot|Googlebot|bingbot|YandexBot|DuckDuckBot|Applebot|baiduspider|Embedly|ia_archiver|vkShare|W3C_Validator|Snapchat|Bytespider|TikTokBot)/i;

export const load: PageServerLoad = async (event) => {
    const ua = event.request.headers.get('user-agent') ?? '';
    const isBot = BOT_UA_RX.test(ua);

    // משתמשים רגילים חייבים להיות מחוברים, אבל סקרפרים מקבלים גישה ל-OG
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id && !isBot) {
        throw redirect(302, '/login?next=' + encodeURIComponent(event.url.pathname));
    }

    const id = event.params.id;
    const origin = event.url.origin;

    try {
        const dbItem = await getDbItemById(id);
        if (dbItem && dbItem.category === 'singles') {
            return { single: null, dbItem, isBot, origin };
        }
    } catch {
        // ignore - ניפול ל-mock
    }

    const single = mockSingles.find((s) => s.id === id);
    if (!single) throw error(404, 'הפרופיל לא נמצא');

    return { single, dbItem: null, isBot, origin };
};
