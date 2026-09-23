<script lang="ts">
    import type { PageData, ActionData } from './$types';
    import { SHOP_URL } from '$lib/shopAds';
    import ShopAdsManager from '$lib/components/ShopAdsManager.svelte';

    let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
    <title>פרסומות חנות החירות - מנהל ראשי</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-10" dir="rtl">
    <header class="mb-5 md:mb-6 flex flex-wrap items-start gap-3 justify-between">
        <div class="min-w-0">
            <h1 class="text-2xl md:text-3xl font-black text-white mb-1">🛒 מוצרים חדשים כפרסומת ברשת</h1>
            <p class="text-xs md:text-sm text-gray-400">
                המוצרים האחרונים שאושרו בחנות החירות עולים אוטומטית לטור הפרסומות בכל אתרי הרשת,
                בסדרה {data.shop.wanted.join(', ')}. מקום שכבר נמכר למפרסם - המוצר עובר למקום הפנוי הבא.
            </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
            <a href="/admin/ads-review"
               class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10">
                ← אישור פרסומות
            </a>
            <a href={SHOP_URL} target="_blank" rel="noopener noreferrer"
               class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10">
                לחנות ↗
            </a>
        </div>
    </header>

    <ShopAdsManager shop={data.shop} {form} />
</div>
