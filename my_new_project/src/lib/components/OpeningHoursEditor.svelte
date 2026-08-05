<script lang="ts">
    // עורך שעות פתיחה קומפקטי - עובד מול מחרוזת מסודרת (serializeOpeningHours).
    // בשימוש בדף הפריט (CategoryDetailsEditor). מחזיר את הערך דרך onchange.
    import { untrack } from 'svelte';
    import { _ } from 'svelte-i18n';
    import {
        emptyOpeningHours,
        parseOpeningHours,
        serializeOpeningHours,
        nextRangeAfter,
        DAY_SHORT,
        type OpeningHours,
    } from '$lib/openingHours';
    import { trOr } from '$lib/categoryFields';

    let { value = '', onchange }: { value?: string; onchange: (v: string) => void } = $props();

    // אובייקט העבודה - מאותחל מהערך הנכנס פעם אחת (untrack: מכאן והלאה
    // העריכה מקומית, והערך חוזר החוצה דרך onchange)
    let oh = $state<OpeningHours>(untrack(() => parseOpeningHours(value)) ?? emptyOpeningHours());

    function commit() {
        onchange(serializeOpeningHours(oh));
    }
    function toggleDay(idx: number) {
        oh.days[idx].open = !oh.days[idx].open;
        commit();
    }
    function setUniform(u: boolean) {
        oh.uniform = u;
        if (u) {
            const first = oh.days.find(d => d.open) ?? oh.days[0];
            for (const d of oh.days) d.ranges = first.ranges.map(r => ({ ...r }));
        }
        commit();
    }
    // ---- טווחים אחידים (uniform) ----
    function setUniformRange(rIdx: number, which: 'from' | 'to', val: string) {
        for (const d of oh.days) if (d.ranges[rIdx]) d.ranges[rIdx][which] = val;
        commit();
    }
    function addUniformRange() {
        const rep = oh.days.find(d => d.open) ?? oh.days[0];
        const next = nextRangeAfter(rep.ranges[rep.ranges.length - 1]);
        for (const d of oh.days) d.ranges.push({ ...next });
        commit();
    }
    function removeUniformRange(rIdx: number) {
        for (const d of oh.days) if (d.ranges.length > 1) d.ranges.splice(rIdx, 1);
        commit();
    }
    // ---- טווחים לכל יום ----
    function setDayRange(idx: number, rIdx: number, which: 'from' | 'to', val: string) {
        const r = oh.days[idx].ranges[rIdx];
        if (r) { r[which] = val; commit(); }
    }
    function addDayRange(idx: number) {
        const ranges = oh.days[idx].ranges;
        ranges.push(nextRangeAfter(ranges[ranges.length - 1]));
        commit();
    }
    function removeDayRange(idx: number, rIdx: number) {
        if (oh.days[idx].ranges.length > 1) { oh.days[idx].ranges.splice(rIdx, 1); commit(); }
    }

    const repDay = $derived(oh.days.find(d => d.open) ?? oh.days[0]);
</script>

<div class="rounded-xl border border-white/10 bg-[#0a0f1a] p-2.5 space-y-2.5" dir="rtl">
    <!-- בחירת ימים פתוחים -->
    <div class="flex flex-wrap gap-1.5">
        {#each DAY_SHORT as label, idx}
            <button type="button" onclick={() => toggleDay(idx)}
                class="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all {oh.days[idx].open
                    ? 'bg-indigo-600 text-white border-transparent'
                    : 'bg-white/5 text-gray-400 border-white/15 border-dashed hover:bg-white/10'}">
                {trOr($_, `labels.day_short_${idx}`, label)}
            </button>
        {/each}
    </div>

    <!-- מתג: שעות זהות לכל הימים / שעה לכל יום -->
    <div class="flex rounded-full bg-white/5 border border-white/10 p-0.5 text-xs w-full max-w-[280px]">
        <button type="button" onclick={() => setUniform(true)}
            class="flex-1 px-3 py-1.5 rounded-full font-bold transition-all {oh.uniform ? 'bg-indigo-600 text-white' : 'text-gray-400'}">אותן שעות בכל הימים</button>
        <button type="button" onclick={() => setUniform(false)}
            class="flex-1 px-3 py-1.5 rounded-full font-bold transition-all {!oh.uniform ? 'bg-indigo-600 text-white' : 'text-gray-400'}">שעות שונות לפי יום</button>
    </div>

    {#if oh.uniform}
        <!-- טווחי שעות משותפים -->
        <div class="space-y-1.5">
            {#each repDay.ranges as r, rIdx}
                <div class="flex items-center gap-2">
                    <input type="time" dir="ltr" value={r.from} onchange={(e) => setUniformRange(rIdx, 'from', (e.currentTarget as HTMLInputElement).value)}
                        class="bg-[#0f172a] border border-white/15 rounded-md text-xs text-white px-2 py-1 w-[100px]" />
                    <span class="text-gray-400">–</span>
                    <input type="time" dir="ltr" value={r.to} onchange={(e) => setUniformRange(rIdx, 'to', (e.currentTarget as HTMLInputElement).value)}
                        class="bg-[#0f172a] border border-white/15 rounded-md text-xs text-white px-2 py-1 w-[100px]" />
                    {#if repDay.ranges.length > 1}
                        <button type="button" onclick={() => removeUniformRange(rIdx)} aria-label="הסר טווח"
                            class="text-red-400 hover:text-red-300 text-lg leading-none px-1">×</button>
                    {/if}
                </div>
            {/each}
            <button type="button" onclick={addUniformRange}
                class="text-xs font-bold text-indigo-300 hover:text-indigo-200">＋ הוספת טווח שעות</button>
        </div>
    {:else}
        <!-- טווחים נפרדים לכל יום פתוח -->
        <div class="space-y-2">
            {#each DAY_SHORT as label, idx}
                {#if oh.days[idx].open}
                    <div class="bg-[#0f172a] rounded-lg p-2 border border-white/10">
                        <p class="text-xs font-bold text-indigo-200 mb-1.5">{trOr($_, `labels.day_short_${idx}`, label)}</p>
                        <div class="space-y-1.5">
                            {#each oh.days[idx].ranges as r, rIdx}
                                <div class="flex items-center gap-2">
                                    <input type="time" dir="ltr" value={r.from} onchange={(e) => setDayRange(idx, rIdx, 'from', (e.currentTarget as HTMLInputElement).value)}
                                        class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 w-[100px]" />
                                    <span class="text-gray-400">–</span>
                                    <input type="time" dir="ltr" value={r.to} onchange={(e) => setDayRange(idx, rIdx, 'to', (e.currentTarget as HTMLInputElement).value)}
                                        class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 w-[100px]" />
                                    {#if oh.days[idx].ranges.length > 1}
                                        <button type="button" onclick={() => removeDayRange(idx, rIdx)} aria-label="הסר טווח"
                                            class="text-red-400 hover:text-red-300 text-lg leading-none px-1">×</button>
                                    {/if}
                                </div>
                            {/each}
                            <button type="button" onclick={() => addDayRange(idx)}
                                class="text-xs font-bold text-indigo-300 hover:text-indigo-200">＋ טווח נוסף</button>
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    {/if}
</div>
