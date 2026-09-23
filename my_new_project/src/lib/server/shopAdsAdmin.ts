/**
 * ניהול פרסומות החנות - הטעינה והפעולות, משותפים לשני המסכים שמציגים אותו:
 * /admin/shop-ads, וה"קומה" של הפרסומות המיובאות בתוך /admin/ads-review.
 * שמות הפעולות (shopSave וכו') מקודמים ב-shop כדי לא להתנגש בפעולות של
 * ads-review. כל תשובה מסומנת shop: true - ככה כל מסך יודע להציג אותה
 * ליד הקומה של החנות ולא בראש הדף.
 */
import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { ensureAdsAdmin } from '$lib/server/adsAdmin';
import {
    readShopAdsConfig,
    writeShopAdsConfig,
    fetchNewestShopProducts,
    getShopAdsPlacement,
    syncShopAds,
    removeShopAds,
    syncShopAdsIfStale,
    buildShopAdDrafts,
    readShopAdMasters,
    clearShopAdEdit,
    type SiteSyncResult,
} from '$lib/server/shopAdsStore';
import { SHOP_AD_SITES, preferredSlots, sameSeries, seriesOf } from '$lib/shopAds';

/** ניהול פרסומות החנות שמור לסופר-אדמין: הוא כותב לכל אתרי הרשת */
async function ensureSuperAdmin(event: RequestEvent) {
    const { session, role } = await ensureAdsAdmin(event);
    if (role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');
    return session;
}

/** הנתונים של מסך הניהול. ההרשאה נבדקת אצל הקורא. */
export async function loadShopAdsAdmin(userId: string) {
    // Lazy cron: אם הסנכרון פעיל והאחרון ישן - מרעננים בכניסה למסך.
    // (המסלול הקבוע הוא /api/shop-ads/sync, שרץ בתזמון.)
    const autoRun = await syncShopAdsIfStale(userId).catch((e) => {
        console.warn('[shop-ads admin] lazy sync failed:', e instanceof Error ? e.message : e);
        return null;
    });

    const config = await readShopAdsConfig();
    const wanted = preferredSlots(config);
    const [productsRes, placementRes] = await Promise.allSettled([
        fetchNewestShopProducts(wanted.length),
        getShopAdsPlacement(config),
    ]);
    const products = productsRes.status === 'fulfilled' ? productsRes.value : [];
    // הכרטיסים שנערכו בבילדר - הטיוטה מציגה אותם ולא את הנגזר מהמוצר
    const masters = await readShopAdMasters();

    return {
        config,
        wanted,
        // הטיוטה: הכרטיסים כפי שייכתבו, לתצוגה מקדימה לפני הסנכרון
        drafts: buildShopAdDrafts(products, wanted, masters),
        sameSeries: sameSeries(preferredSlots(config)),
        sites: SHOP_AD_SITES,
        products,
        placement: placementRes.status === 'fulfilled' ? placementRes.value : [],
        shopError: productsRes.status === 'rejected'
            ? (productsRes.reason instanceof Error ? productsRes.reason.message : String(productsRes.reason))
            : '',
        autoRun: autoRun ? autoRun.results : null,
    };
}

export type ShopAdsAdminData = Awaited<ReturnType<typeof loadShopAdsAdmin>>;

/** סיכום קצר של תוצאות הסנכרון להודעה במסך */
function summarize(results: SiteSyncResult[]): { success: boolean; message: string } {
    const ok = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    if (ok.length === 0) {
        return { success: false, message: `הסנכרון נכשל בכל האתרים: ${failed.map(f => f.label).join(', ')}` };
    }
    const okText = ok.map(r => `${r.label} (${r.slots.join(', ') || '-'})`).join(' · ');
    const failText = failed.length > 0 ? ` | נכשל: ${failed.map(f => f.label).join(', ')}` : '';
    return { success: true, message: `סונכרן: ${okText}${failText}` };
}

export const shopAdsActions = {
    /** שמירת ההגדרות (בלי לסנכרן) */
    shopSave: async (event: RequestEvent) => {
        await ensureSuperAdmin(event);
        const fd = await event.request.formData();
        const current = await readShopAdsConfig();
        const num = (key: string, fallback: number) => {
            const v = Number(fd.get(key));
            return Number.isFinite(v) ? v : fallback;
        };
        const sites = fd.getAll('sites').map(String).filter(Boolean);
        const cfg = await writeShopAdsConfig({
            ...current,
            enabled:   fd.get('enabled') === '1',
            count:     num('count', current.count),
            firstSlot: num('firstSlot', current.firstSlot),
            step:      num('step', current.step),
            sites:     sites.length > 0 ? sites : current.sites,
        });
        const slots = preferredSlots(cfg);
        return {
            shop: true,
            success: true,
            message: sameSeries(slots)
                ? `ההגדרות נשמרו. סדרה ${seriesOf(cfg.firstSlot)}: מקומות ${slots.join(', ')}.`
                : `ההגדרות נשמרו. המקומות: ${slots.join(', ')} - שים לב, הם אינם סדרה אחת.`,
        };
    },

    /** סנכרון עכשיו - מפרסם/מעדכן את המוצרים בכל האתרים שבהגדרה */
    shopSync: async (event: RequestEvent) => {
        const session = await ensureSuperAdmin(event);
        let r;
        try {
            r = await syncShopAds({ decidedBy: session?.user?.id ?? 'super_admin' });
        } catch (e) {
            console.warn('[shop-ads admin] sync failed:', e instanceof Error ? e.message : e);
            return fail(502, { shop: true, error: `הסנכרון נכשל: ${e instanceof Error ? e.message : e}` });
        }
        if (r.products.length === 0) {
            return fail(400, { shop: true, error: 'לא נמצאו מוצרים מתאימים בחנות (מוצר צריך תמונה, מלאי ותצוגה "מופיע")' });
        }
        const s = summarize(r.results);
        return s.success
            ? { shop: true, success: true, message: s.message }
            : fail(502, { shop: true, error: s.message });
    },

    /** ביטול עריכה: הכרטיס חוזר להיגזר מהמוצר בסנכרון הבא */
    shopResetEdit: async (event: RequestEvent) => {
        await ensureSuperAdmin(event);
        const fd = await event.request.formData();
        const id = String(fd.get('id') ?? '').trim();
        if (!id) return fail(400, { shop: true, error: 'חסר מזהה פרסומת' });
        const ok = await clearShopAdEdit(id).catch(() => false);
        if (!ok) return fail(404, { shop: true, error: 'הפרסומת לא נמצאה' });
        return { shop: true, success: true, message: 'העריכה בוטלה. הסנכרון הבא יגזור את הכרטיס מחדש מהמוצר.' };
    },

    /** הורדת כל פרסומות המוצרים מהרשת */
    shopRemoveAll: async (event: RequestEvent) => {
        await ensureSuperAdmin(event);
        let results;
        try {
            results = await removeShopAds();
        } catch (e) {
            return fail(502, { shop: true, error: `ההורדה נכשלה: ${e instanceof Error ? e.message : e}` });
        }
        const removed = results.reduce((n, r) => n + r.removed, 0);
        const failed = results.filter(r => !r.ok);
        return {
            shop: true,
            success: true,
            message: `הורדו ${removed} פרסומות מוצרים${failed.length ? ` | נכשל: ${failed.map(f => f.label).join(', ')}` : ''}`,
        };
    },
};

export { ensureSuperAdmin as ensureShopAdsAdmin };
