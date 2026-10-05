<script lang="ts">
    // שאלון אישיות והתאמה (רמה 3 בכרטיס הפנויים). שונה לגברים ולנשים (ניסוח, בנק מה-מרתיע/מושך,
    // תרחישים ושאלות המשך). הערך הוא מחרוזת JSON אחת (תשובות + פרופיל מחושב)
    // שנשמרת ב-extra_fields.ai_quiz - כמו כל שדה אחר בטופס.
    import { untrack } from 'svelte';
    import {
        TRAITS, quizFor, fmt, toG, parseAnswers, serializeQuiz, computeProfile, sectionProgress, totalProgress,
        topTraits, describeGap, type Answers, type G, type Question,
    } from '$lib/singlesQuestionnaire';

    let { value = $bindable(''), gender = '' }: { value?: string; gender?: string } = $props();

    const g = $derived(toG(gender));
    let answers = $state<Answers>(untrack(() => parseAnswers(value)));
    let step = $state(0);

    const sections = $derived(g ? quizFor(g, answers) : []);
    const section = $derived(sections[Math.min(step, Math.max(0, sections.length - 1))]);
    const total = $derived(totalProgress(sections, answers));
    const profile = $derived(computeProfile(g, answers));
    const selfTop = $derived(topTraits(profile.self, 5));
    const seeksTop = $derived(topTraits(profile.seeks, 5));
    const seeksGap = $derived(profile.gaps.find((x) => x.kind === 'seeks'));
    const partnerG = $derived<G>(g === 'm' ? 'f' : 'm');

    function commit() {
        value = serializeQuiz(answers, g);
    }

    function set(q: Question, v: number | string | string[]) {
        answers = { ...answers, [q.id]: v };
        commit();
    }

    // החלפת מין בטופס משנה אילו שאלות רלוונטיות - מעדכנים את הפרופיל השמור בהתאם
    $effect(() => {
        void g;
        untrack(() => { if (Object.keys(answers).length) commit(); });
    });

    function togglePick(q: Extract<Question, { kind: 'pick' }>, id: string) {
        const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
        if (cur.includes(id)) set(q, cur.filter((x) => x !== id));
        else if (cur.length < q.max) set(q, [...cur, id]);
    }

    function go(n: number) {
        step = Math.max(0, Math.min(sections.length - 1, n));
        if (typeof window !== 'undefined') document.getElementById('quiz-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const btn = 'rounded-lg border text-sm font-bold transition-all py-2';
    const on = 'bg-fuchsia-500 border-fuchsia-300 text-white scale-105';
    const off = 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10';
</script>

<div id="quiz-top" class="scroll-mt-24">
    {#if !g}
        <div class="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-center">
            <p class="text-amber-200 font-bold text-sm">השאלון מותאם למין - בחרו "גבר" או "אישה" ברמה 1 כדי להתחיל.</p>
        </div>
    {:else if section}
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
            {#each sections as s, i (s.id)}
                {@const p = sectionProgress(s, answers)}
                <button type="button" role="tab" aria-selected={s.id === section.id} onclick={() => go(i)}
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold border transition-all
                        {s.id === section.id ? 'bg-fuchsia-500 border-fuchsia-300 text-white' : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}">
                    {s.icon} {fmt(s.title, g)}{#if p.done === p.total} ✓{/if}
                </button>
            {/each}
        </div>

        <div class="rounded-xl border border-fuchsia-400/25 bg-fuchsia-950/20 p-3 md:p-4">
            <h3 class="text-base md:text-lg font-black text-white">{section.icon} {fmt(section.title, g)}</h3>
            <p class="text-fuchsia-200/80 text-xs md:text-sm mb-3">{fmt(section.intro, g)}</p>
            {#if section.scale}
                <div class="flex justify-between text-[11px] text-gray-400 mb-2 px-1">
                    <span>1 = {section.scale.low}</span><span>5 = {section.scale.high}</span>
                </div>
            {/if}

            <div class="space-y-4">
                {#each section.questions as q, qi (q.id)}
                    <div class="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                        {#if q.kind === 'rate'}
                            {@const subj = q.about === 'self' ? g : partnerG}
                            <p class="text-sm text-gray-100 font-bold mb-1.5">{qi + 1}. {fmt(q.text, g)}</p>
                            <div class="grid grid-cols-7 gap-1">
                                {#each [1, 2, 3, 4, 5, 6, 7] as n}
                                    <button type="button" onclick={() => set(q, n)} aria-pressed={answers[q.id] === n}
                                        class="{btn} {answers[q.id] === n ? on : off}">{n}</button>
                                {/each}
                            </div>
                            <div class="flex justify-between gap-3 text-[11px] text-gray-400 mt-1">
                                <span>1 · {fmt(TRAITS[q.trait].low, subj)}</span><span class="text-left">{fmt(TRAITS[q.trait].high, subj)} · 7</span>
                            </div>
                        {:else if q.kind === 'react'}
                            <p class="text-sm text-gray-100 font-bold mb-1.5">{qi + 1}. {fmt(q.text, g)}</p>
                            <div class="grid grid-cols-5 gap-1">
                                {#each [1, 2, 3, 4, 5] as n}
                                    <button type="button" onclick={() => set(q, n)} aria-pressed={answers[q.id] === n}
                                        class="{btn} {answers[q.id] === n ? on : off}">{n}</button>
                                {/each}
                            </div>
                        {:else if q.kind === 'choice'}
                            <p class="text-sm text-gray-100 font-bold mb-1.5">{qi + 1}. {fmt(q.text, g)}</p>
                            <div class="space-y-1.5">
                                {#each q.options as o}
                                    <button type="button" onclick={() => set(q, o.id)} aria-pressed={answers[q.id] === o.id}
                                        class="w-full text-right rounded-lg border px-3 py-2 text-sm transition-all
                                            {answers[q.id] === o.id ? 'bg-fuchsia-500/30 border-fuchsia-300 text-white font-bold' : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}">
                                        {fmt(o.text, g)}
                                    </button>
                                {/each}
                            </div>
                        {:else if q.kind === 'pick'}
                            {@const cur = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : []}
                            <p class="text-sm text-gray-100 font-bold mb-1.5">{fmt(q.text, g)} <span class="text-fuchsia-300 font-normal text-xs">({cur.length}/{q.max})</span></p>
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
                            <label class="block text-sm text-gray-100 font-bold mb-1.5" for="quiz-{q.id}">{qi + 1}. {fmt(q.text, g)}</label>
                            <textarea id="quiz-{q.id}" rows="2" maxlength="600"
                                value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                                oninput={(e) => set(q, (e.target as HTMLTextAreaElement).value)}
                                placeholder={fmt(q.placeholder ?? '', g)}
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
                {#if step < sections.length - 1}
                    <button type="button" onclick={() => go(step + 1)}
                        class="flex-1 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-2.5 text-sm">הבא ←</button>
                {/if}
            </div>
        </div>

        {#if profile.quality.straightlining}
            <p class="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                שמנו לב שענית כמעט אותו דבר על רוב שאלות "מה מפריע / מה מושך". כדאי לחזור ולבדוק - התשובות המגוונות הן שמביאות להתאמה טובה.
            </p>
        {/if}

        <!-- סיכום חי: מה השאלון "מבין" עד עכשיו - נראה רק לך -->
        {#if total.done >= 12 && (selfTop.length || seeksTop.length)}
            <div class="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                <p class="text-xs font-bold text-fuchsia-200">🔍 מה עולה עד כה (רק אתם, ה-AI והשדכנים המאושרים רואים)</p>
                {#each [{ title: 'מי אני', rows: selfTop, subj: g }, { title: 'מה אני מחפש', rows: seeksTop, subj: partnerG }] as grp}
                    {#if grp.rows.length}
                        <div>
                            <p class="text-[11px] font-black text-white mb-1">{grp.title}</p>
                            <div class="space-y-1.5">
                                {#each grp.rows as h}
                                    <div>
                                        <div class="flex justify-between gap-2 text-[11px] text-gray-300">
                                            <span>{TRAITS[h.id].label}</span>
                                            <span class="text-left">{fmt(h.score >= 50 ? TRAITS[h.id].high : TRAITS[h.id].low, grp.subj ?? 'm')}</span>
                                        </div>
                                        <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                            <div class="h-full bg-fuchsia-400" style="width:{h.score}%"></div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/each}
                {#if seeksGap}
                    <p class="text-[11px] text-fuchsia-100/90 border-t border-white/10 pt-2">💡 נקודה למחשבה: {describeGap(seeksGap, g)}</p>
                {/if}
            </div>
        {/if}
    {/if}
</div>
