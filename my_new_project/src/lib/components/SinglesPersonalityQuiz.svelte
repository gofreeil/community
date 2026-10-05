<script lang="ts">
    // שאלון אישיות והתאמה (רמה 3 בכרטיס הפנויים). הערך הוא מחרוזת JSON אחת
    // (QuizState) שנשמרת ב-extra_fields.ai_quiz - כמו כל שדה אחר בטופס.
    import { untrack } from 'svelte';
    import {
        SECTIONS, TRAITS, parseQuiz, serializeQuiz, sectionProgress, totalProgress, topTraits, computeTraits,
        type Answers, type Question,
    } from '$lib/singlesQuestionnaire';

    let { value = $bindable('') }: { value?: string } = $props();

    let answers = $state<Answers>(untrack(() => parseQuiz(value).answers));
    let step = $state(0);

    const section = $derived(SECTIONS[step]);
    const total = $derived(totalProgress(answers));
    const traits = $derived(computeTraits(answers));
    const highlights = $derived(topTraits(traits, 5));

    function set(q: Question, v: number | string | string[]) {
        answers = { ...answers, [q.id]: v };
        value = serializeQuiz({ v: 1, answers, traits: {}, updatedAt: '' });
    }

    function togglePick(q: Extract<Question, { kind: 'pick' }>, id: string) {
        const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
        if (cur.includes(id)) set(q, cur.filter((x) => x !== id));
        else if (cur.length < q.max) set(q, [...cur, id]);
    }

    function go(n: number) {
        step = Math.max(0, Math.min(SECTIONS.length - 1, n));
        if (typeof window !== 'undefined') document.getElementById('quiz-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const btn = 'rounded-lg border text-sm font-bold transition-all py-2';
    const on = 'bg-fuchsia-500 border-fuchsia-300 text-white scale-105';
    const off = 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10';
</script>

<div id="quiz-top" class="scroll-mt-24">
    <!-- התקדמות כוללת -->
    <div class="mb-3">
        <div class="flex items-center justify-between text-xs text-fuchsia-200 mb-1">
            <span>ענית על {total.done} מתוך {total.total}</span>
            <span class="font-black">{total.pct}%</span>
        </div>
        <div class="h-2 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full bg-gradient-to-l from-fuchsia-500 to-purple-500 transition-all" style="width:{total.pct}%"></div>
        </div>
    </div>

    <!-- ניווט פרקים -->
    <div class="flex gap-1.5 overflow-x-auto pb-2 mb-3" role="tablist">
        {#each SECTIONS as s, i}
            {@const p = sectionProgress(s, answers)}
            <button type="button" role="tab" aria-selected={i === step} onclick={() => go(i)}
                class="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold border transition-all
                    {i === step ? 'bg-fuchsia-500 border-fuchsia-300 text-white' : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}">
                {s.icon} {s.title}{#if p.done === p.total} ✓{/if}
            </button>
        {/each}
    </div>

    <div class="rounded-xl border border-fuchsia-400/25 bg-fuchsia-950/20 p-3 md:p-4">
        <h3 class="text-base md:text-lg font-black text-white">{section.icon} {section.title}</h3>
        <p class="text-fuchsia-200/80 text-xs md:text-sm mb-3">{section.intro}</p>
        {#if section.scale}
            <div class="flex justify-between text-[11px] text-gray-400 mb-2 px-1">
                <span>1 = {section.scale.low}</span><span>5 = {section.scale.high}</span>
            </div>
        {/if}

        <div class="space-y-4">
            {#each section.questions as q, qi (q.id)}
                <div class="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                    {#if q.kind === 'rate'}
                        <p class="text-sm text-gray-100 font-bold mb-1.5">{qi + 1}. {q.text}</p>
                        <div class="grid grid-cols-7 gap-1">
                            {#each [1, 2, 3, 4, 5, 6, 7] as n}
                                <button type="button" onclick={() => set(q, n)} aria-pressed={answers[q.id] === n}
                                    class="{btn} {answers[q.id] === n ? on : off}">{n}</button>
                            {/each}
                        </div>
                        <div class="flex justify-between text-[11px] text-gray-400 mt-1">
                            <span>{TRAITS[q.trait].low}</span><span>{TRAITS[q.trait].high}</span>
                        </div>
                    {:else if q.kind === 'react'}
                        <p class="text-sm text-gray-100 font-bold mb-1.5">{qi + 1}. {q.text}</p>
                        <div class="grid grid-cols-5 gap-1">
                            {#each [1, 2, 3, 4, 5] as n}
                                <button type="button" onclick={() => set(q, n)} aria-pressed={answers[q.id] === n}
                                    class="{btn} {answers[q.id] === n ? on : off}">{n}</button>
                            {/each}
                        </div>
                    {:else if q.kind === 'choice'}
                        <p class="text-sm text-gray-100 font-bold mb-1.5">{qi + 1}. {q.text}</p>
                        <div class="space-y-1.5">
                            {#each q.options as o}
                                <button type="button" onclick={() => set(q, o.id)} aria-pressed={answers[q.id] === o.id}
                                    class="w-full text-right rounded-lg border px-3 py-2 text-sm transition-all
                                        {answers[q.id] === o.id ? 'bg-fuchsia-500/30 border-fuchsia-300 text-white font-bold' : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}">
                                    {o.text}
                                </button>
                            {/each}
                        </div>
                    {:else if q.kind === 'pick'}
                        {@const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : []}
                        <p class="text-sm text-gray-100 font-bold mb-1.5">{q.text} <span class="text-fuchsia-300 font-normal text-xs">({cur.length}/{q.max})</span></p>
                        <div class="flex flex-wrap gap-1.5">
                            {#each q.options as o}
                                <button type="button" onclick={() => togglePick(q, o.id)} aria-pressed={cur.includes(o.id)}
                                    disabled={!cur.includes(o.id) && cur.length >= q.max}
                                    class="rounded-full border px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-35
                                        {cur.includes(o.id) ? on : off}">
                                    {o.text}
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <label class="block text-sm text-gray-100 font-bold mb-1.5" for="quiz-{q.id}">{qi + 1}. {q.text}</label>
                        <textarea id="quiz-{q.id}" rows="2" maxlength="600"
                            value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                            oninput={(e) => set(q, (e.target as HTMLTextAreaElement).value)}
                            placeholder={q.placeholder ?? ''}
                            class="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-gray-600 text-sm resize-none focus:outline-none focus:border-fuchsia-400/60"></textarea>
                    {/if}
                </div>
            {/each}
        </div>

        <div class="flex gap-2 mt-4">
            {#if step > 0}
                <button type="button" onclick={() => go(step - 1)}
                    class="flex-1 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-gray-200 font-bold py-2.5 text-sm">→ הקודם</button>
            {/if}
            {#if step < SECTIONS.length - 1}
                <button type="button" onclick={() => go(step + 1)}
                    class="flex-1 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-2.5 text-sm">הבא ←</button>
            {/if}
        </div>
    </div>

    <!-- סיכום חי: מה השאלון "מבין" עליך עד עכשיו -->
    {#if highlights.length}
        <div class="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <p class="text-xs font-bold text-fuchsia-200 mb-2">🔍 מה עולה עד כה (רק ה-AI והשדכנים רואים)</p>
            <div class="space-y-1.5">
                {#each highlights as h}
                    <div>
                        <div class="flex justify-between text-[11px] text-gray-300">
                            <span>{TRAITS[h.id].label}</span>
                            <span>{h.score >= 50 ? TRAITS[h.id].high : TRAITS[h.id].low}</span>
                        </div>
                        <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div class="h-full bg-fuchsia-400" style="width:{h.score}%"></div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
