import type { PageServerLoad, Actions } from './$types';
import { ensureShopAdsAdmin, loadShopAdsAdmin, shopAdsActions } from '$lib/server/shopAdsAdmin';

// הטעינה והפעולות משותפות עם הקומה של הפרסומות המיובאות ב-/admin/ads-review
export const load: PageServerLoad = async (event) => {
    const session = await ensureShopAdsAdmin(event);
    return { shop: await loadShopAdsAdmin(session?.user?.id ?? 'super_admin') };
};

export const actions: Actions = shopAdsActions;
