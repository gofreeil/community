<script lang="ts">
    // הפרופיל המסכם של שאלון ההתאמה: כל המדדים במקום אחד.
    // מוצג בסוף השאלון (לבעל/ת הכרטיס) ובכרטיס הפנוי/ה לשדכנים מאושרים.
    import { fmt } from '$lib/singlesQuestionnaire';
    import type { ProfileSummary } from '$lib/singlesProfileSummary';

    let { summary, audience = 'self' }: { summary: ProfileSummary; audience?: 'self' | 'matchmaker' } = $props();

    /** קצוות הסקאלה מוצגים בשתי הנטיות (חם/חמה) - אותה ציר מתאר גם את מי שאני וגם את מי שאני מחפש/ת */
    const pole = (w: string) => {
        const m = fmt(w, 'm'), f = fmt(w, 'f');
        return m === f ? m : `${m}/${f}`;
    };

    const RELIABILITY = {
        high: { text: 'דיוק גבוה', cls: 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10' },
        medium: { text: 'דיוק בינוני', cls: 'text-amber-200 border-amber-400/40 bg-amber-500/10' },
        low: { text: 'דיוק נמוך - חסר מידע', cls: 'text-red-200 border-red-400/40 bg-red-500/10' },
    } as const;
    const rel = $derived(RELIABILITY[summary.reliability]);
</script>

<div class="space-y-4" dir="rtl">
    <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full border px-2.5 py-0.5 text-[11px] font-bold {rel.cls}">{rel.text}</span>
        <span class="text-[11px] text-gray-400">נענו {summary.completeness}% מהשאלון</span>
    </div>

    {#if summary.selfWords.length || summary.seeksWords.length}
        <div class="space-y-2">
            {#if summary.selfWords.length}
                <div>
                    <p class="text-[11px] font-black text-fuchsia-200 mb-1">{audience === 'self' ? 'מי אני - במילים קצרות' : 'מי הוא/היא - במילים קצרות'}</p>
                    <div class="flex flex-wrap gap-1.5">
                        {#each summary.selfWords as w}
                            <span class="rounded-full bg-fuchsia-500/20 border border-fuchsia-300/40 px-2.5 py-1 text-xs font-bold text-white">{w}</span>
                        {/each}
                    </div>
                </div>
            {/if}
            {#if summary.seeksWords.length}
                <div>
                    <p class="text-[11px] font-black text-cyan-200 mb-1">{audience === 'self' ? 'מה אני מחפש/ת' : 'מה מחפש/ת'}</p>
                    <div class="flex flex-wrap gap-1.5">
                        {#each summary.seeksWords as w}
                            <span class="rounded-full bg-cyan-500/15 border border-cyan-300/40 px-2.5 py-1 text-xs font-bold text-white">{w}</span>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    {#if summary.groups.length}
        <div class="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-4">
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-300">
                <span class="inline-flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-full bg-fuchsia-400"></span>{audience === 'self' ? 'מי אני' : 'מי הוא/היא'}</span>
                <span class="inline-flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-full border-2 border-cyan-300"></span>{audience === 'self' ? 'מה אני מחפש/ת' : 'מה מחפש/ת'}</span>
            </div>
            {#each summary.groups as grp (grp.title)}
                <div>
                    <p class="text-[11px] font-black text-white mb-2">{grp.title}</p>
                    <div class="space-y-3">
                        {#each grp.rows as r (r.id)}
                            <div>
                                <p class="text-[11px] text-gray-200 font-bold mb-1">{r.label}</p>
                                <div class="relative h-2 rounded-full bg-white/10">
                                    <span class="absolute top-[-2px] bottom-[-2px] w-px bg-white/25" style="inset-inline-start: 50%"></span>
                                    {#if r.self !== undefined}
                                        <span class="absolute top-0 bottom-0 rounded-full bg-fuchsia-500/35" style="inset-inline-start: 0; width: {r.self}%"></span>
                                    {/if}
                                    {#if r.seeks !== undefined}
                                        <span class="absolute top-1/2 w-3 h-3 -mt-1.5 rounded-full border-2 border-cyan-300 bg-[#0b1020]" style="inset-inline-start: {r.seeks}%; margin-inline-start: -6px" title="מה מחפש/ת: {r.seeks}"></span>
                                    {/if}
                                    {#if r.self !== undefined}
                                        <span class="absolute top-1/2 w-3 h-3 -mt-1.5 rounded-full bg-fuchsia-400 ring-2 ring-[#0b1020]" style="inset-inline-start: {r.self}%; margin-inline-start: -6px" title="מי אני: {r.self}"></span>
                                    {/if}
                                </div>
                                <div class="flex justify-between gap-2 text-[10px] text-gray-500 mt-1">
                                    <span>{pole(r.lowWord)}</span><span>{pole(r.highWord)}</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <div class="space-y-3">
        {#if summary.conflict}
            <p class="text-xs text-gray-200"><span class="font-black text-white">כשיש מחלוקת: </span>{summary.conflict}</p>
        {/if}
        {#each [
            { title: 'מה הכי חשוב בזוגיות', items: summary.values, cls: 'bg-emerald-500/15 border-emerald-300/40' },
            { title: 'סימנים אדומים', items: summary.redFlags, cls: 'bg-red-500/15 border-red-300/40' },
            { title: 'איך מרגישים אהוב/ה', items: summary.loveLanguages, cls: 'bg-pink-500/15 border-pink-300/40' },
        ] as grp}
            {#if grp.items.length}
                <div>
                    <p class="text-[11px] font-black text-white mb-1">{grp.title}</p>
                    <div class="flex flex-wrap gap-1.5">
                        {#each grp.items as it}
                            <span class="rounded-full border px-2.5 py-1 text-[11px] font-bold text-gray-100 {grp.cls}">{it}</span>
                        {/each}
                    </div>
                </div>
            {/if}
        {/each}
    </div>

    {#if audience === 'self' && summary.insights.length}
        <div class="rounded-xl border border-fuchsia-300/25 bg-fuchsia-500/10 p-3 space-y-1.5">
            <p class="text-[11px] font-black text-fuchsia-100">💡 נקודות למחשבה</p>
            {#each summary.insights as t}
                <p class="text-[11px] text-fuchsia-50/90 leading-relaxed">{t}</p>
            {/each}
        </div>
    {/if}

    {#each audience === 'self' ? summary.notes : [] as n}
        <p class="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">{n}</p>
    {/each}
</div>
