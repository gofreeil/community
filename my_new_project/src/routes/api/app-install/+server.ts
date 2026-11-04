// רישום התקנת אפליקציה (נקרא מ-InstallApp). כשל לא מפריע לגלישה.
import type { RequestHandler } from './$types';
import { strapiPost } from '$lib/server/strapiClient';

const BOT_UA = /bot|crawl|spider|headless|lighthouse/i;

export const POST: RequestHandler = async ({ request }) => {
    const ua = request.headers.get('user-agent') ?? '';
    if (!ua || BOT_UA.test(ua)) return new Response(null, { status: 204 });
    try {
        const b = await request.json();
        await strapiPost('/api/app-installs/track', {
            site: 'community',
            deviceId: String(b.deviceId ?? ''),
            platform: b.platform,
            source: b.source,
            userAgent: ua
        });
    } catch (e) {
        console.warn('[app-install] failed:', e);
    }
    return new Response(null, { status: 204 });
};
