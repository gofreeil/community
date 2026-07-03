// רישום כניסה לאתר - נקרא פעם אחת לכל session מהדפדפן (+layout.svelte).
// מסנן בוטים לפי User-Agent כדי שהמונה ישקף כניסות אמיתיות.
import type { RequestHandler } from './$types';
import { trackVisit } from '$lib/server/visitStats';

const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|pingdom|uptime|monitor/i;

export const POST: RequestHandler = async ({ request }) => {
    const ua = request.headers.get('user-agent') ?? '';
    if (!ua || BOT_UA.test(ua)) {
        return new Response(null, { status: 204 });
    }

    try {
        await trackVisit();
    } catch (e) {
        // כשל ברישום כניסה לא אמור להפריע לגלישה - נרשם ללוג בלבד
        console.warn('[track-visit] failed:', e);
    }

    return new Response(null, { status: 204 });
};
