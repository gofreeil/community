<script lang="ts">
    import type { PageData, ActionData } from './$types';
    import { enhance } from '$app/forms';
    import { AD_SLOT_COUNT } from '$lib/adSlots';
    import {
        SHOP_URL, SERIES_COUNT, SLOTS_PER_VIEW, SLOTS_PER_SERIES,
        seriesOf, seriesSlots,
        GRADIENT_COUNT, shopAdGradient, SHOP_AD_ZOOM_MIN, SHOP_AD_ZOOM_MAX,
    } from '$lib/shopAds';
    import ShopAdPreviewCard from '$lib/components/ShopAdPreviewCard.svelte';

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

    // ----- עריכה ידנית של כרטיס -----
    // הטופס נפתח על הערכים שמוצגים כרגע בכרטיס, והתצוגה המקדימה מתעדכנת
    // תוך כדי הקלדה - עוד לפני השמירה, וודאי לפני שזה עולה לאתרים.
    const GRADIENTS = Array.from({ length: GRADIENT_COUNT }, (_, i) => i);
    let editing = $state<string | null>(null);
    let edit = $state({ title: '', subtitle: '', cta: '', hoverText: '', gradientIndex: 0, fitX: 50, fitY: 45, fitZ: 0.6 });

    // ----- מידות המשבצת והתמונה, לחישוב זום אמיתי -----
    // המשבצת בטור היא 144x450. z נמדד יחסית ל-cover: k = max(W/w, H/h) * z,
    // ולכן "כל התמונה נכנסת" הוא z = min(W/w,H/h) / max(W/w,H/h). לתמונה
    // מרובעת זה 0.32 - מתחת לרצפה של 0.4 שכל אתרי הרשת אוכפים, ולכן
    // המחשבון נעצר ברצפה ומראה בכנות כמה באמת נראה.
    const SLOT_W = 144;
    const SLOT_H = 450;
    /** המידות הטבעיות של תמונת המוצר שנמדדה (0 = טרם נמדדה) */
    let imgW = $state(0);
    let imgH = $state(0);

    /** מודד את התמונה של הכרטיס שנפתח לעריכה */
    function measure(src: string) {
        imgW = 0;
        imgH = 0;
        if (typeof Image === 'undefined' || !src) return;
        const probe = new Image();
        probe.onload = () => { imgW = probe.naturalWidth; imgH = probe.naturalHeight; };
        probe.src = src;
    }

    /** הזום שבו כל התמונה נכנסת למשבצת (לפני הרצפה של 0.4) */
    let containZoom = $derived(
        imgW && imgH
            ? Math.min(SLOT_W / imgW, SLOT_H / imgH) / Math.max(SLOT_W / imgW, SLOT_H / imgH)
            : 0,
    );
    /** כמה מרוחב התמונה ומגובהה באמת נראה בזום הנוכחי, באחוזים */
    let coverage = $derived.by(() => {
        if (!imgW || !imgH) return null;
        const k = Math.max(SLOT_W / imgW, SLOT_H / imgH) * edit.fitZ;
        return {
            w: Math.min(100, Math.round((SLOT_W / (imgW * k)) * 100)),
            h: Math.min(100, Math.round((SLOT_H / (imgH * k)) * 100)),
        };
    });
    /** התאמה אוטומטית: הכי הרבה מהמוצר שאפשר להראות, וממורכז */
    function autoFit() {
        if (!containZoom) return;
        edit.fitZ = Math.round(Math.max(SHOP_AD_ZOOM_MIN, Math.min(SHOP_AD_ZOOM_MAX, containZoom)) * 100) / 100;
        edit.fitX = 50;
        edit.fitY = 50;
    }

    /** מאיזה צבע בפלטה הכרטיס צבוע - כדי שהבורר ייפתח על הצבע הנוכחי */
    function gradientIndexOf(gradient: string, fallback: number): number {
        const i = GRADIENTS.findIndex(n => shopAdGradient(n, 'tailwind') === gradient);
        return i >= 0 ? i : fallback % GRADIENT_COUNT;
    }

    function openEdit(d: (typeof data.drafts)[number], index: number) {
        editing = d.product;
        edit = {
            title: d.title,
            subtitle: d.subtitle,
            cta: d.cta,
            hoverText: d.hoverText,
            gradientIndex: gradientIndexOf(d.gradient, index),
            fitX: d.fit.x,
            fitY: d.fit.y,
            fitZ: d.fit.z,
        };
        measure(d.mainImage);
    }

    /** הכרטיס כפי שהוא ברגע זה: בעריכה - מה שבטופס, אחרת - מה שנשמר */
    function shown(d: (typeof data.drafts)[number]) {
        if (editing !== d.product) return d;
        return {
            ...d,
            title: edit.title,
            subtitle: edit.subtitle,
            cta: edit.cta,
            gradient: shopAdGradient(edit.gradientIndex, 'tailwind'),
            fit: { x: edit.fitX, y: edit.fitY, z: edit.fitZ },
        };
    }

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
            <legend class="text-xs font-bold text-gray-400 mb-2">
                <span class="flex items-center gap-2">
                    האתרים שבהם הפרסומת תופיע
                    <button type="button" onclick={() => (sites = data.sites.map(s => s.id))}
                            class="px-2 py-0.5 rounded-md bg-white/5 border border-white/15 text-[11px] font-bold text-gray-300 hover:bg-white/10"
                            title="סימון כל אתרי הרשת">
                        כולם
                    </button>
                </span>
            </legend>
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

    <!-- ===== הטיוטה: הכרטיסים כפי שייראו בטור ===== -->
    <section class="mb-6">
        <div class="flex flex-wrap items-baseline gap-2 mb-1">
            <h2 class="text-lg font-black text-white">טיוטת הפרסומות ({data.drafts.length})</h2>
            <span class="text-xs text-gray-500">כך בדיוק ייראה הכרטיס בטור - בגודל אמיתי</span>
        </div>
        <p class="text-xs text-gray-400 mb-3">
            שום דבר מזה לא עלה לאוויר עד שתלחץ "סנכרן עכשיו".
        </p>
        {#if data.drafts.length === 0}
            <p class="text-sm text-gray-400">
                אין מוצרים מתאימים. מוצר נכנס לפרסום אם הוא מאושר בחנות, יש לו תמונה, יש מלאי, והתצוגה שלו "מופיע".
            </p>
        {:else}
            <div class="flex flex-wrap gap-4 items-start">
                {#each data.drafts as d, i (d.product)}
                    {@const v = shown(d)}
                    <figure class="m-0">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="text-[11px] font-black text-white bg-white/10 rounded-full px-2 py-0.5">
                                מקום {d.slot || '-'}
                            </span>
                            {#if d.edited}
                                <span class="text-[11px] font-bold text-amber-300" title="הכרטיס נערך ידנית">✎ נערך</span>
                            {:else}
                                <span class="text-[11px] text-gray-500 truncate max-w-[5rem]">{d.store}</span>
                            {/if}
                        </div>
                        <ShopAdPreviewCard
                            title={v.title}
                            subtitle={v.subtitle}
                            cta={v.cta}
                            gradient={v.gradient}
                            mainImage={v.mainImage}
                            fit={v.fit}
                        />
                        <figcaption class="w-36 mt-1.5 text-[11px] text-gray-500 leading-snug">
                            <button type="button" onclick={() => (editing === d.product ? (editing = null) : openEdit(d, i))}
                                    class="w-full px-2 py-1 rounded-md bg-white/5 border border-white/15 text-gray-200 font-bold hover:bg-white/10">
                                {editing === d.product ? 'סגור' : '✎ ערוך'}
                            </button>
                            <a href={d.href} target="_blank" rel="noopener noreferrer"
                               class="block text-blue-300 hover:text-blue-200 mt-1">לדף המוצר ↗</a>
                        </figcaption>
                    </figure>

                    {#if editing === d.product}
                        <!-- לוח העריכה נפתח ליד הכרטיס, והכרטיס מתעדכן תוך כדי
                             הקלדה. השמירה נשמרת בהגדרות בלבד - היא עולה לאתרים
                             רק בסנכרון הבא. -->
                        <form method="POST" action="?/saveDraft"
                              use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; editing = null; }; }}
                              class="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 w-full sm:w-80">
                            <input type="hidden" name="product" value={d.product} />
                            <h3 class="text-sm font-black text-amber-200 mb-2">עריכת הכרטיס</h3>

                            <label class="block mb-2">
                                <span class="block text-[11px] font-bold text-gray-400 mb-1">כותרת (עד 42 תווים)</span>
                                <input name="title" bind:value={edit.title} maxlength="42"
                                       class="w-full rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5 text-white text-sm" />
                            </label>
                            <label class="block mb-2">
                                <span class="block text-[11px] font-bold text-gray-400 mb-1">תת-כותרת (עד 60)</span>
                                <input name="subtitle" bind:value={edit.subtitle} maxlength="60"
                                       class="w-full rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5 text-white text-sm" />
                            </label>
                            <label class="block mb-2">
                                <span class="block text-[11px] font-bold text-gray-400 mb-1">רצועה תחתונה (עד 48)</span>
                                <input name="cta" bind:value={edit.cta} maxlength="48"
                                       class="w-full rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5 text-white text-sm" />
                            </label>
                            <label class="block mb-2">
                                <span class="block text-[11px] font-bold text-gray-400 mb-1">טקסט בריחוף (עד 160)</span>
                                <textarea name="hoverText" bind:value={edit.hoverText} maxlength="160" rows="2"
                                          class="w-full rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5 text-white text-sm"></textarea>
                            </label>

                            <span class="block text-[11px] font-bold text-gray-400 mb-1">צבע</span>
                            <div class="flex flex-wrap gap-1.5 mb-3">
                                {#each GRADIENTS as g}
                                    <button type="button" onclick={() => (edit.gradientIndex = g)}
                                            class="w-8 h-8 rounded-lg bg-gradient-to-br {shopAdGradient(g, 'tailwind')} border-2
                                                   {edit.gradientIndex === g ? 'border-white' : 'border-transparent'}"
                                            aria-label="צבע {g + 1}"></button>
                                {/each}
                            </div>
                            <input type="hidden" name="gradientIndex" value={edit.gradientIndex} />

                            <!-- כוונון התמונה. אי אפשר להחליף אותה (היא נמשכת
                                 מהמוצר בחנות), אבל אפשר להחליט איזה חלק ממנה
                                 ייראה במשבצת הצרה. -->
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-[11px] font-bold text-gray-400">כוונון התמונה</span>
                                <button type="button" onclick={autoFit} disabled={!containZoom}
                                        class="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold hover:bg-emerald-500/30 disabled:opacity-40"
                                        title="מחשב את הזום שבו נראה הכי הרבה מהמוצר, וממרכז אותו">
                                    ✨ התאם למוצר
                                </button>
                            </div>
                            {#if imgW && imgH}
                                <p class="text-[11px] text-gray-500 mb-2">
                                    התמונה {imgW}×{imgH}, המשבצת {SLOT_W}×{SLOT_H}.
                                    {#if coverage}
                                        נראה ממנה <strong class="{coverage.w < 70 ? 'text-amber-300' : 'text-emerald-300'}">{coverage.w}%</strong> מהרוחב
                                        ו-<strong class="{coverage.h < 70 ? 'text-amber-300' : 'text-emerald-300'}">{coverage.h}%</strong> מהגובה.
                                    {/if}
                                    {#if containZoom && containZoom < SHOP_AD_ZOOM_MIN}
                                        <br />כל התמונה לא נכנסת למשבצת (צריך זום {containZoom.toFixed(2)}, והמינימום הוא {SHOP_AD_ZOOM_MIN}).
                                    {/if}
                                </p>
                            {/if}
                            <label class="block mb-2">
                                <span class="block text-[11px] font-bold text-gray-400 mb-1">
                                    זום ({edit.fitZ.toFixed(2)}) — קטן = רואים יותר מהמוצר
                                </span>
                                <input type="range" name="fitZ" bind:value={edit.fitZ}
                                       min={SHOP_AD_ZOOM_MIN} max={SHOP_AD_ZOOM_MAX} step="0.05"
                                       class="w-full accent-amber-500" />
                            </label>
                            <label class="block mb-2">
                                <span class="block text-[11px] font-bold text-gray-400 mb-1">
                                    מיקום אופקי ({edit.fitX}%)
                                </span>
                                <input type="range" name="fitX" bind:value={edit.fitX} min="0" max="100" step="1"
                                       class="w-full accent-amber-500" />
                            </label>
                            <label class="block mb-3">
                                <span class="block text-[11px] font-bold text-gray-400 mb-1">
                                    מיקום אנכי ({edit.fitY}%)
                                </span>
                                <input type="range" name="fitY" bind:value={edit.fitY} min="0" max="100" step="1"
                                       class="w-full accent-amber-500" />
                            </label>

                            <div class="flex flex-wrap gap-2">
                                <button type="submit" disabled={busy}
                                        class="px-3 py-1.5 rounded-lg bg-amber-500/25 border border-amber-500/50 text-amber-100 text-xs font-bold hover:bg-amber-500/35 disabled:opacity-50">
                                    💾 שמור עריכה
                                </button>
                                <button type="button" onclick={() => (editing = null)}
                                        class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-gray-300 text-xs font-bold hover:bg-white/10">
                                    ביטול
                                </button>
                            </div>
                            <p class="text-[11px] text-gray-500 mt-2">
                                העריכה נשמרת כאן; היא עולה לאתרים בסנכרון הבא.
                            </p>
                        </form>
                    {/if}
                {/each}
            </div>
            {#if data.drafts.some(d => d.edited)}
                <form method="POST" action="?/resetDraft" class="mt-3 flex flex-wrap items-center gap-2"
                      use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; }; }}>
                    <span class="text-xs text-gray-500">להחזיר כרטיס לברירת המחדל מהמוצר:</span>
                    <select name="product" class="rounded-lg bg-black/30 border border-white/10 px-2 py-1 text-white text-xs">
                        {#each data.drafts.filter(d => d.edited) as d (d.product)}
                            <option value={d.product}>{d.title}</option>
                        {/each}
                    </select>
                    <button type="submit" disabled={busy}
                            class="px-3 py-1 rounded-lg bg-white/5 border border-white/15 text-gray-300 text-xs font-bold hover:bg-white/10 disabled:opacity-50">
                        ↺ אפס
                    </button>
                </form>
            {/if}
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
