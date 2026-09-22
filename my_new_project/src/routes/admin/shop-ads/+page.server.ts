import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
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
    saveShopAdOverride,
    type SiteSyncResult,
} from '$lib/server/shopAdsStore';
import { SHOP_AD_SITES, preferredSlots, sameSeries, seriesOf, normalizeOverride } from '$lib/shopAds';

/** ניהול פרסומות החנות שמור לסופר-אדמין: הוא כותב לכל אתרי הרשת */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSuperAdmin(event: any) {
    const { session, role } = await ensureAdsAdmin(event);
    if (role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');
    return session;
}

export const load: PageServerLoad = async (event) => {
    await ensureSuperAdmin(event);
    const session = await event.locals.auth().catch(() => null);

    // Lazy cron: אם הסנכרון פעיל והאחרון ישן - מרעננים בכניסה למסך.
    // (המסלול הקבוע הוא /api/shop-ads/sync, שרץ בתזמון.)
    const autoRun = await syncShopAdsIfStale(session?.user?.id ?? 'super_admin').catch((e) => {
        console.warn('[admin/shop-ads] lazy sync failed:', e instanceof Error ? e.message : e);
        return null;
    });

    const config = await readShopAdsConfig();
    const wanted = preferredSlots(config);
    const [productsRes, placementRes] = await Promise.allSettled([
        fetchNewestShopProducts(wanted.length),
        getShopAdsPlacement(config),
    ]);
    const products = productsRes.status === 'fulfilled' ? productsRes.value : [];

    return {
        config,
        wanted,
        // הטיוטה: הכרטיסים כפי שייכתבו, לתצוגה מקדימה לפני הסנכרון
        drafts: buildShopAdDrafts(products, wanted, config.overrides),
        sameSeries: sameSeries(preferredSlots(config)),
        sites: SHOP_AD_SITES,
        products,
        placement: placementRes.status === 'fulfilled' ? placementRes.value : [],
        shopError: productsRes.status === 'rejected'
            ? (productsRes.reason instanceof Error ? productsRes.reason.message : String(productsRes.reason))
            : '',
        autoRun: autoRun ? autoRun.results : null,
    };
};

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

export const actions: Actions = {
    /** שמירת ההגדרות (בלי לסנכרן) */
    save: async (event) => {
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
            success: true,
            message: sameSeries(slots)
                ? `ההגדרות נשמרו. סדרה ${seriesOf(cfg.firstSlot)}: מקומות ${slots.join(', ')}.`
                : `ההגדרות נשמרו. המקומות: ${slots.join(', ')} - שים לב, הם אינם סדרה אחת.`,
        };
    },

    /** סנכרון עכשיו - מפרסם/מעדכן את המוצרים בכל האתרים שבהגדרה */
    sync: async (event) => {
        const session = await ensureSuperAdmin(event);
        let r;
        try {
            r = await syncShopAds({ decidedBy: session?.user?.id ?? 'super_admin' });
        } catch (e) {
            console.warn('[admin/shop-ads] sync failed:', e instanceof Error ? e.message : e);
            return fail(502, { error: `הסנכרון נכשל: ${e instanceof Error ? e.message : e}` });
        }
        if (r.products.length === 0) {
            return fail(400, { error: 'לא נמצאו מוצרים מתאימים בחנות (מוצר צריך תמונה, מלאי ותצוגה "מופיע")' });
        }
        const s = summarize(r.results);
        return s.success ? { success: true, message: s.message } : fail(502, { error: s.message });
    },

    /** עריכה ידנית של כרטיס מוצר - נשמרת לפי מזהה המוצר */
    saveDraft: async (event) => {
        await ensureSuperAdmin(event);
        const fd = await event.request.formData();
        const productId = String(fd.get('product') ?? '').trim();
        if (!productId) return fail(400, { error: 'חסר מזהה מוצר' });
        const num = (key: string) => {
            const raw = fd.get(key);
            const n = Number(raw);
            return raw !== null && raw !== '' && Number.isFinite(n) ? n : undefined;
        };
        const patch = normalizeOverride({
            title:         fd.get('title'),
            subtitle:      fd.get('subtitle'),
            cta:           fd.get('cta'),
            hoverText:     fd.get('hoverText'),
            gradientIndex: num('gradientIndex'),
            fit:           { x: num('fitX') ?? 50, y: num('fitY') ?? 45, z: num('fitZ') ?? 0.6 },
        });
        try {
            await saveShopAdOverride(productId, patch);
        } catch (e) {
            return fail(502, { error: `שמירת העריכה נכשלה: ${e instanceof Error ? e.message : e}` });
        }
        return { success: true, message: 'העריכה נשמרה. כדי שתעלה לאתרים - לחץ "סנכרן עכשיו".' };
    },

    /** ביטול העריכה - הכרטיס חוזר להיגזר מהמוצר */
    resetDraft: async (event) => {
        await ensureSuperAdmin(event);
        const fd = await event.request.formData();
        const productId = String(fd.get('product') ?? '').trim();
        if (!productId) return fail(400, { error: 'חסר מזהה מוצר' });
        try {
            await saveShopAdOverride(productId, null);
        } catch (e) {
            return fail(502, { error: `הביטול נכשל: ${e instanceof Error ? e.message : e}` });
        }
        return { success: true, message: 'העריכה בוטלה - הכרטיס חזר לברירת המחדל מהמוצר.' };
    },
    /** הורדת כל פרסומות המוצרים מהרשת */
    removeAll: async (event) => {
        await ensureSuperAdmin(event);
        let results;
        try {
            results = await removeShopAds();
        } catch (e) {
            return fail(502, { error: `ההורדה נכשלה: ${e instanceof Error ? e.message : e}` });
        }
        const removed = results.reduce((n, r) => n + r.removed, 0);
        const failed = results.filter(r => !r.ok);
        return {
            success: true,
            message: `הורדו ${removed} פרסומות מוצרים${failed.length ? ` | נכשל: ${failed.map(f => f.label).join(', ')}` : ''}`,
        };
    },
};
