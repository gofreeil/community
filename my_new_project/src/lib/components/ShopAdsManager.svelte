<script lang="ts">
    /**
     * ניהול פרסומות החנות: הגדרות, סנכרון, טיוטת הכרטיסים והמצב בכל אתר.
     * מוצג גם כמסך עצמאי (/admin/shop-ads) וגם כקומה בתוך /admin/ads-review;
     * הפעולות (?/shopSave וכו') קיימות בשני הנתיבים - ראו shopAdsAdmin.ts.
     */
    import { enhance } from '$app/forms';
    import { AD_SLOT_COUNT } from '$lib/adSlots';
    import {
        SERIES_COUNT, SLOTS_PER_VIEW, SLOTS_PER_SERIES,
        seriesOf, seriesSlots,
    } from '$lib/shopAds';
    import ShopAdPreviewCard from '$lib/components/ShopAdPreviewCard.svelte';
    import type { ShopAdsAdminData } from '$lib/server/shopAdsAdmin';

    let { shop, form }: {
        shop: ShopAdsAdminData;
        form?: { shop?: boolean; message?: string; error?: string } | null;
    } = $props();

    /** רק תשובות של הפעולות האלה - לא של שאר הדף שהרכיב יושב בו */
    let shopForm = $derived(form?.shop ? form : null);

    /** ארבע הסדרות של הטור: 1,5,9,13 | 2,6,10,14 | 3,7,11,15 | 4,8,12,16 */
    const SERIES = Array.from({ length: SERIES_COUNT }, (_, i) => i + 1);

    // הטופס נטען מההגדרות השמורות, ונטען מחדש אחרי כל פעולה שמחזירה
    // הגדרות מעודכנות (שמירה/סנכרון) - אחרת המסך היה מציג ערכים ישנים.
    let enabled = $state(false);
    let count   = $state(4);
    let series  = $state(3);
    let sites   = $state<string[]>([]);
    let busy    = $state(false);
    $effect(() => {
        const c = shop.config;
        enabled = c.enabled;
        count = c.count;
        // ההגדרה נשמרת כ"מקום ראשון + קפיצה"; במסך זו פשוט הסדרה
        series = seriesOf(c.firstSlot);
        sites = [...c.sites];
    });

    /** המקומות לפי מה שנבחר עכשיו במסך (לפני שמירה) */
    let previewSlots = $derived(seriesSlots(series).slice(0, count));

    function toggleSite(id: string, on: boolean) {
        sites = on ? [...new Set([...sites, id])] : sites.filter(s => s !== id);
    }

    /**
     * מזהה הרשומה של המוצר באתר "קהילה בשכונה". זו הרשומה שהבילדר עורך,
     * והיא המאסטר של הכרטיס בכל הרשת. ריק = המוצר עוד לא סונכרן, ולכן
     * אין מה לערוך.
     */
    function communityAdId(productDocId: string): string {
        const site = shop.placement.find(p => p.site === 'community');
        return site?.ads.find(a => a.product === productDocId)?.id ?? '';
    }

    /** המוצר שהוצב במקום מסוים באתר מסוים - לטבלת המצב */
    function placedFor(siteId: string, productDocId: string) {
        const site = shop.placement.find(p => p.site === siteId);
        return site?.ads.find(a => a.product === productDocId);
    }
    function siteError(siteId: string): string {
        return shop.placement.find(p => p.site === siteId)?.error ?? '';
    }
    const fmt = (iso?: string) =>
        iso ? new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : 'מעולם לא';

    const withBusy = () => { busy = true; return async ({ update }: { update: () => Promise<void> }) => { await update(); busy = false; }; };
</script>

{#if shopForm?.message}
    <div class="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        {shopForm.message}
    </div>
{/if}
{#if shopForm?.error}
    <div class="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {shopForm.error}
    </div>
{/if}
{#if shop.shopError}
    <div class="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        לא הצלחנו לקרוא את המוצרים מהחנות: {shop.shopError}
    </div>
{/if}
{#if shop.autoRun}
    <div class="mb-4 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
        סנכרון אוטומטי רץ עכשיו: {shop.autoRun.filter(r => r.ok).map(r => r.label).join(', ') || 'ללא'}
    </div>
{/if}

<!-- ===== ההגדרות ===== -->
<form method="POST" action="?/shopSave" use:enhance={withBusy}
      class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 mb-5">
    <h3 class="text-lg font-black text-white mb-3">הגדרות</h3>

    <label class="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" bind:checked={enabled} class="accent-emerald-500 w-4 h-4" />
        <span class="text-sm font-bold text-gray-200">סנכרון אוטומטי פעיל</span>
        <span class="text-xs text-gray-500">(רץ בתזמון, וגם בכניסה למסך הזה אם עברו 6 שעות)</span>
    </label>
    <input type="hidden" name="enabled" value={enabled ? '1' : '0'} />

    <!-- בחירת הסדרה. ההגדרה נשמרת כ"מקום ראשון + קפיצה", אבל מי שמנהל
         חושב בסדרות (3, 7, 11, 15) ולא בשני מספרים שצריך לכפול בראש. -->
    <fieldset class="mb-4">
        <legend class="text-xs font-bold text-gray-400 mb-2">באיזו סדרה יישבו המוצרים</legend>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {#each SERIES as s}
                <label class="cursor-pointer rounded-xl border px-3 py-2.5 transition-colors
                              {series === s
                                 ? 'border-emerald-400/60 bg-emerald-500/15'
                                 : 'border-white/10 bg-black/20 hover:bg-white/5'}">
                    <span class="flex items-center gap-2">
                        <input type="radio" name="series" value={s} bind:group={series} class="accent-emerald-500" />
                        <span class="text-sm font-bold {series === s ? 'text-emerald-100' : 'text-gray-300'}">
                            סדרה {s}
                        </span>
                    </span>
                    <span class="block text-[11px] mt-1 {series === s ? 'text-emerald-300' : 'text-gray-500'}">
                        {seriesSlots(s).join(', ')}
                    </span>
                </label>
            {/each}
        </div>
    </fieldset>
    <!-- מה שנשמר בפועל: המקום הראשון של הסדרה, וקפיצה קבועה של 4 -->
    <input type="hidden" name="firstSlot" value={series} />
    <input type="hidden" name="step" value={SLOTS_PER_VIEW} />

    <label class="block mb-4 max-w-xs">
        <span class="block text-xs font-bold text-gray-400 mb-1">כמה מוצרים מהסדרה</span>
        <select name="count" bind:value={count}
                class="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white text-sm">
            {#each Array.from({ length: SLOTS_PER_SERIES }, (_, i) => i + 1) as n}
                <option value={n} style="background:#fff;color:#111">{n} {n === SLOTS_PER_SERIES ? '(כל הסדרה)' : ''}</option>
            {/each}
        </select>
    </label>

    <!-- הלוח כפי שהוא: ארבע סדרות, ארבעה מקומות בכל אחת. הסדרה שנבחרה
         מסומנת - ככה רואים בעין אחת מה ייתפס. -->
    <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-3 mb-4">
        <p class="text-xs text-gray-400 mb-2">
            בטור {AD_SLOT_COUNT} מקומות. הוא מציג {SLOTS_PER_VIEW} בכל רגע ומחליף כל 7 שניות,
            כך שמכל סדרה נראה תמיד בדיוק מקום אחד - באותו גובה.
        </p>
        <div class="space-y-1">
            {#each SERIES as s}
                <div class="flex items-center gap-2">
                    <span class="w-16 shrink-0 text-[11px] {s === series ? 'text-emerald-300 font-black' : 'text-gray-500'}">
                        סדרה {s}
                    </span>
                    {#each seriesSlots(s) as n, i}
                        <div class="w-14 h-7 rounded-md flex items-center justify-center text-[11px] font-black border
                                    {s === series && i < count
                                        ? 'bg-emerald-500/30 border-emerald-400/60 text-emerald-100'
                                        : 'bg-white/5 border-white/10 text-gray-500'}">
                            {s === series && i < count ? `🛒 ${n}` : n}
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
        <p class="text-sm mt-2 text-emerald-200">
            המוצרים יתפסו את המקומות <strong>{previewSlots.join(', ') || '-'}</strong>.
        </p>
    </div>

    <fieldset class="mb-4">
        <legend class="text-xs font-bold text-gray-400 mb-2">
            <span class="flex items-center gap-2">
                האתרים שבהם הפרסומת תופיע
                <button type="button" onclick={() => (sites = shop.sites.map(s => s.id))}
                        class="px-2 py-0.5 rounded-md bg-white/5 border border-white/15 text-[11px] font-bold text-gray-300 hover:bg-white/10"
                        title="סימון כל אתרי הרשת">
                    כולם
                </button>
            </span>
        </legend>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {#each shop.sites as site (site.id)}
                <label class="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 cursor-pointer">
                    <input type="checkbox" name="sites" value={site.id}
                           checked={sites.includes(site.id)}
                           onchange={(e) => toggleSite(site.id, e.currentTarget.checked)}
                           class="accent-emerald-500" />
                    <span class="text-sm text-gray-200 truncate">{site.label}</span>
                </label>
            {/each}
        </div>
    </fieldset>

    <div class="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy}
                class="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm font-bold hover:bg-emerald-500/30 disabled:opacity-50">
            💾 שמור הגדרות
        </button>
        <span class="text-xs text-gray-500">סנכרון אחרון: {fmt(shop.config.syncedAt)}</span>
    </div>
</form>

<!-- ===== פעולות ===== -->
<div class="flex flex-wrap gap-2 mb-5">
    <form method="POST" action="?/shopSync" use:enhance={withBusy}>
        <button type="submit" disabled={busy}
                class="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 text-sm font-bold hover:bg-blue-500/30 disabled:opacity-50">
            🔄 סנכרן עכשיו
        </button>
    </form>
    <form method="POST" action="?/shopRemoveAll"
          onsubmit={(e) => { if (!confirm('להוריד את כל פרסומות המוצרים מכל אתרי הרשת?')) e.preventDefault(); }}
          use:enhance={withBusy}>
        <button type="submit" disabled={busy}
                class="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm font-bold hover:bg-red-500/25 disabled:opacity-50">
            🗑 הורד את כולן
        </button>
    </form>
</div>

<!-- ===== הטיוטה: הכרטיסים כפי שייראו בטור ===== -->
<section class="mb-6">
    <div class="flex flex-wrap items-baseline gap-2 mb-1">
        <h3 class="text-lg font-black text-white">טיוטת הפרסומות ({shop.drafts.length})</h3>
        <span class="text-xs text-gray-500">כך בדיוק ייראה הכרטיס בטור - בגודל אמיתי</span>
    </div>
    <p class="text-xs text-gray-400 mb-3">
        שום דבר מזה לא עלה לאוויר עד שתלחץ "סנכרן עכשיו".
    </p>
    {#if shop.drafts.length === 0}
        <p class="text-sm text-gray-400">
            אין מוצרים מתאימים. מוצר נכנס לפרסום אם הוא מאושר בחנות, יש לו תמונה, יש מלאי, והתצוגה שלו "מופיע".
        </p>
    {:else}
        <div class="flex flex-wrap gap-4 items-start">
            {#each shop.drafts as d (d.product)}
                {@const adId = communityAdId(d.product)}
                <figure class="m-0">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-[11px] font-black text-white bg-white/10 rounded-full px-2 py-0.5">
                            מקום {d.slot || '-'}
                        </span>
                        {#if d.edited}
                            <span class="text-[11px] font-bold text-amber-300" title="נערך בבילדר - זה מה שמתפרסם בכל הרשת">
                                ✎ נערך
                            </span>
                        {:else}
                            <span class="text-[11px] text-gray-500 truncate max-w-[5rem]">{d.store}</span>
                        {/if}
                    </div>
                    <ShopAdPreviewCard
                        title={d.title}
                        subtitle={d.subtitle}
                        cta={d.cta}
                        gradient={d.gradient}
                        mainImage={d.mainImage}
                        fit={d.fit}
                        bandHeight={d.bandHeight}
                    />
                    <figcaption class="w-36 mt-1.5 text-[11px] text-gray-500 leading-snug">
                        {#if adId}
                            <!-- הבילדר הקיים, על הפרסומת הזו. inplace=1 -
                                 השמירה מעדכנת אותה ולא יוצרת גרסה ממתינה. -->
                            <a href="/about/advertise/builder?edit={adId}&inplace=1"
                               class="block text-center px-2 py-1 rounded-md bg-white/5 border border-white/15 text-gray-200 font-bold hover:bg-white/10 no-underline">
                                ✎ ערוך בבילדר
                            </a>
                            {#if d.edited}
                                <form method="POST" action="?/shopResetEdit" class="mt-1"
                                      onsubmit={(e) => { if (!confirm('לבטל את העריכה ולחזור לכרטיס הנגזר מהמוצר?')) e.preventDefault(); }}
                                      use:enhance={withBusy}>
                                    <input type="hidden" name="id" value={adId} />
                                    <button type="submit" disabled={busy}
                                            class="w-full px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-50">
                                        ↺ בטל עריכה
                                    </button>
                                </form>
                            {/if}
                        {:else}
                            <span class="block text-center text-gray-600">לעריכה - סנכרן קודם</span>
                        {/if}
                        <span class="block mt-1">בריחוף: {d.hoverText}</span>
                        <a href={d.href} target="_blank" rel="noopener noreferrer"
                           class="block text-blue-300 hover:text-blue-200 mt-0.5">לדף המוצר ↗</a>
                    </figcaption>
                </figure>
            {/each}
        </div>
        <p class="text-[11px] text-gray-500 mt-3">
            התוכן נגזר מהמוצר בחנות (שם, מחיר, שם החנות, תמונה). "ערוך בבילדר" פותח את
            אותו בונה פרסומות שהמפרסמים משתמשים בו - ומה שנשמר שם מתפרסם בכל אתרי הרשת
            בסנכרון הבא, במקום הנגזר מהמוצר.
        </p>
    {/if}
</section>

<!-- ===== המצב בכל אתר ===== -->
<section>
    <h3 class="text-lg font-black text-white mb-3">המקום בפועל בכל אתר</h3>
    <div class="overflow-x-auto rounded-2xl border border-white/10">
        <table class="w-full text-sm">
            <thead class="bg-white/5 text-gray-400">
                <tr>
                    <th class="text-right font-bold px-3 py-2">אתר</th>
                    {#each shop.products as p (p.documentId)}
                        <th class="text-right font-bold px-3 py-2 whitespace-nowrap">{p.name}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each shop.sites.filter(s => sites.includes(s.id)) as site (site.id)}
                    <tr class="border-t border-white/5">
                        <td class="px-3 py-2 text-gray-200 whitespace-nowrap">
                            {site.label}
                            {#if siteError(site.id)}
                                <span class="block text-[11px] text-red-300">{siteError(site.id)}</span>
                            {/if}
                        </td>
                        {#each shop.products as p (p.documentId)}
                            {@const placed = placedFor(site.id, p.documentId)}
                            <td class="px-3 py-2">
                                {#if placed}
                                    <span class="inline-block rounded-full px-2 py-0.5 text-[11px] font-black
                                                 {placed.slot === shop.wanted[shop.products.indexOf(p)]
                                                    ? 'bg-emerald-500/20 text-emerald-200'
                                                    : 'bg-amber-500/20 text-amber-200'}">
                                        מקום {placed.slot}
                                    </span>
                                {:else}
                                    <span class="text-gray-600 text-xs">—</span>
                                {/if}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <p class="text-[11px] text-gray-500 mt-2">
        תג כתום = המקום המבוקש היה תפוס והמוצר הועבר למקום הפנוי הבא.
    </p>
</section>
