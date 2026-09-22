<script lang="ts">
    import type { PageData, ActionData } from './$types';
    import { enhance } from '$app/forms';
    import { AD_SLOT_COUNT } from '$lib/adSlots';
    import {
        SHOP_URL, SERIES_COUNT, SLOTS_PER_VIEW, SLOTS_PER_SERIES,
        seriesOf, seriesSlots,
    } from '$lib/shopAds';

    let { data, form }: { data: PageData; form: ActionData } = $props();

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
        const c = data.config;
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

    /** המוצר שהוצב במקום מסוים באתר מסוים - לטבלת המצב */
    function placedFor(siteId: string, productDocId: string) {
        const site = data.placement.find(p => p.site === siteId);
        return site?.ads.find(a => a.product === productDocId);
    }
    function siteError(siteId: string): string {
        return data.placement.find(p => p.site === siteId)?.error ?? '';
    }
    const fmt = (iso?: string) =>
        iso ? new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : 'מעולם לא';
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
                בסדרה {data.wanted.join(', ')}. מקום שכבר נמכר למפרסם - המוצר עובר למקום הפנוי הבא.
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

    {#if form?.message}
        <div class="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {form.message}
        </div>
    {/if}
    {#if form?.error}
        <div class="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {form.error}
        </div>
    {/if}
    {#if data.shopError}
        <div class="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            לא הצלחנו לקרוא את המוצרים מהחנות: {data.shopError}
        </div>
    {/if}
    {#if data.autoRun}
        <div class="mb-4 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
            סנכרון אוטומטי רץ עכשיו: {data.autoRun.filter(r => r.ok).map(r => r.label).join(', ') || 'ללא'}
        </div>
    {/if}

    <!-- ===== ההגדרות ===== -->
    <form method="POST" action="?/save" use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; }; }}
          class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 mb-5">
        <h2 class="text-lg font-black text-white mb-3">הגדרות</h2>

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
                    <option value={n}>{n} {n === SLOTS_PER_SERIES ? '(כל הסדרה)' : ''}</option>
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
            <legend class="text-xs font-bold text-gray-400 mb-2">האתרים שבהם הפרסומת תופיע</legend>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                {#each data.sites as site (site.id)}
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
            <span class="text-xs text-gray-500">סנכרון אחרון: {fmt(data.config.syncedAt)}</span>
        </div>
    </form>

    <!-- ===== פעולות ===== -->
    <div class="flex flex-wrap gap-2 mb-5">
        <form method="POST" action="?/sync" use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; }; }}>
            <button type="submit" disabled={busy}
                    class="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 text-sm font-bold hover:bg-blue-500/30 disabled:opacity-50">
                🔄 סנכרן עכשיו
            </button>
        </form>
        <form method="POST" action="?/removeAll"
              onsubmit={(e) => { if (!confirm('להוריד את כל פרסומות המוצרים מכל אתרי הרשת?')) e.preventDefault(); }}
              use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; }; }}>
            <button type="submit" disabled={busy}
                    class="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm font-bold hover:bg-red-500/25 disabled:opacity-50">
                🗑 הורד את כולן
            </button>
        </form>
    </div>

    <!-- ===== המוצרים ===== -->
    <section class="mb-6">
        <h2 class="text-lg font-black text-white mb-3">המוצרים שיעלו ({data.products.length})</h2>
        {#if data.products.length === 0}
            <p class="text-sm text-gray-400">
                אין מוצרים מתאימים. מוצר נכנס לפרסום אם הוא מאושר בחנות, יש לו תמונה, יש מלאי, והתצוגה שלו "מופיע".
            </p>
        {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {#each data.products as p, i (p.documentId)}
                    <article class="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                        <div class="aspect-[4/3] bg-black/40 overflow-hidden">
                            <img src={p.image} alt={p.name} class="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div class="p-3">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-[11px] font-black text-white bg-white/10 rounded-full px-2 py-0.5">
                                    מקום {data.wanted[i] ?? '-'}
                                </span>
                                <span class="text-[11px] text-gray-500">{p.store}</span>
                            </div>
                            <h3 class="text-sm font-bold text-white leading-tight mb-1">{p.name}</h3>
                            <p class="text-xs text-emerald-300 font-bold">₪{p.price}</p>
                        </div>
                    </article>
                {/each}
            </div>
        {/if}
    </section>

    <!-- ===== המצב בכל אתר ===== -->
    <section>
        <h2 class="text-lg font-black text-white mb-3">המקום בפועל בכל אתר</h2>
        <div class="overflow-x-auto rounded-2xl border border-white/10">
            <table class="w-full text-sm">
                <thead class="bg-white/5 text-gray-400">
                    <tr>
                        <th class="text-right font-bold px-3 py-2">אתר</th>
                        {#each data.products as p (p.documentId)}
                            <th class="text-right font-bold px-3 py-2 whitespace-nowrap">{p.name}</th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each data.sites.filter(s => sites.includes(s.id)) as site (site.id)}
                        <tr class="border-t border-white/5">
                            <td class="px-3 py-2 text-gray-200 whitespace-nowrap">
                                {site.label}
                                {#if siteError(site.id)}
                                    <span class="block text-[11px] text-red-300">{siteError(site.id)}</span>
                                {/if}
                            </td>
                            {#each data.products as p (p.documentId)}
                                {@const placed = placedFor(site.id, p.documentId)}
                                <td class="px-3 py-2">
                                    {#if placed}
                                        <span class="inline-block rounded-full px-2 py-0.5 text-[11px] font-black
                                                     {placed.slot === data.wanted[data.products.indexOf(p)]
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
</div>
