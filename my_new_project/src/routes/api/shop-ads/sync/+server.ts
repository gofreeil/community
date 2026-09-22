import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readShopAdsConfig, syncShopAds } from '$lib/server/shopAdsStore';
import { resolveRole } from '$lib/server/adsAdmin';

// ============================================================
// סנכרון פרסומות המוצרים של חנות החירות לכל אתרי הרשת.
// רץ בתזמון (vercel cron, ראה vercel.json) וגם ידנית ממסך הניהול.
//
// מי מורשה: בקשת התזמון של Vercel, שנושאת Authorization: Bearer <CRON_SECRET>
// (מוגדר כמשתנה סביבה בפרויקט), או סופר-אדמין מחובר. בלי CRON_SECRET
// מוגדר - רק סופר-אדמין, כדי שלא ייפתח נתיב כתיבה פתוח לכל העולם.
// ============================================================

async function authorize(event: Parameters<RequestHandler>[0]): Promise<void> {
    const secret = process.env.CRON_SECRET ?? '';
    const header = event.request.headers.get('authorization') ?? '';
    if (secret && header === `Bearer ${secret}`) return;

    const role = await resolveRole(event).catch(() => '');
    if (role === 'super_admin') return;

    throw error(403, 'אין הרשאה');
}

async function run(event: Parameters<RequestHandler>[0]) {
    await authorize(event);
    const config = await readShopAdsConfig();
    if (!config.enabled) {
        return json({ skipped: true, reason: 'הסנכרון האוטומטי כבוי' });
    }
    const result = await syncShopAds({ decidedBy: 'cron', config });
    return json({
        syncedAt: result.syncedAt,
        wanted:   result.wanted,
        products: result.products.map(p => ({ id: p.documentId, name: p.name })),
        results:  result.results,
    });
}

export const GET: RequestHandler  = (event) => run(event);
export const POST: RequestHandler = (event) => run(event);
