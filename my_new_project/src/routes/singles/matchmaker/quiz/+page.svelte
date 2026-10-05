<script lang="ts">
    import { untrack } from 'svelte';
    import type { PageData } from './$types';
    import { buildSections, TRAITS } from '$lib/singlesQuestionnaireData';
    import { fmt, type G, type Question } from '$lib/singlesQuestionnaire';
    import {
        KIND_LABELS, STATUS_LABELS, GENDER_LABELS, MAX_SUGGESTION_TEXT,
        type QuizSuggestion, type SuggestionKind,
    } from '$lib/quizSuggestionsShared';

    let { data }: { data: PageData } = $props();

    let tab = $state<'m' | 'f' | 'mine'>('m');
    let mine = $state<QuizSuggestion[]>(untrack(() => data.mine));

    const banks = { m: buildSections('m'), f: buildSections('f') };
    const countOf = (g: G) =>
        banks[g].flatMap((s) => s.questions).filter((q) => !q.g || q.g === g).length;

    const KIND_NAMES: Record<Question['kind'], string> = {
        rate: 'דירוג 1-7', react: 'דירוג 1-5', choice: 'בחירה', pick: 'בחירת כמה', text: 'שאלה פתוחה',
    };
    const FORM_KINDS: SuggestionKind[] = ['edit', 'remove', 'comment'];

    // ── טופס הצעה פתוח (אחד בכל רגע) ──
    let openKey = $state('');
    let formKind = $state<SuggestionKind>('edit');
    let formText = $state('');
    let sending = $state(false);
    let formError = $state('');
    let toast = $state('');

    function openForm(key: string, kind: SuggestionKind) {
        openKey = openKey === key ? '' : key;
        formKind = kind;
        formText = '';
        formError = '';
    }

    async function send(g: G, qid: string, sectionId: string) {
        if (sending) return;
        formError = '';
        if (formText.trim().length < 3) { formError = 'כתבו כמה מילים לפחות'; return; }
        sending = true;
        try {
            const res = await fetch('/api/quiz-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind: formKind, qid, gender: g, sectionId, text: formText }),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok || !out?.success) { formError = out?.message ?? 'השליחה נכשלה - נסו שוב'; return; }
            mine = [out.suggestion as QuizSuggestion, ...mine];
            openKey = '';
            toast = 'ההצעה נשלחה למנהל ✓';
            setTimeout(() => (toast = ''), 3500);
        } catch {
            formError = 'בעיית תקשורת - נסו שוב';
        } finally {
            sending = false;
        }
    }

    const dateOf = (iso: string) => (iso ? new Date(iso).toLocaleDateString('he-IL') : '');
    const statusClass = (s: string) =>
        s === 'accepted' || s === 'done' ? 'bg-green-500/15 text-green-300 border-green-500/30'
        : s === 'rejected' ? 'bg-red-500/15 text-red-300 border-red-500/30'
        : 'bg-amber-500/15 text-amber-200 border-amber-500/30';
    const mineFor = (qid: string, g: G) => mine.filter((s) => s.qid === qid && (s.gender === g || s.gender === 'both'));

    function whenText(q: Question): string {
        if (!q.when) return '';
        const t = (TRAITS as Record<string, { label: string }>)[q.when.id.replace(/^r_/, '')]?.label ?? q.when.id;
        return q.when.gte !== undefined ? `מופיעה רק אם דירוג "${t}" הוא ${q.when.gte} ומעלה` : `מופיעה רק אם דירוג "${t}" הוא ${q.when.lte} ומטה`;
    }

    const inputCls = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-pink-400/60';
</script>

<svelte:head><title>שאלון ההתאמה - הצעות שדכנים | קהילה בשכונה</title></svelte:head>

<div class="max-w-3xl mx-auto px-4 py-5 md:py-8" dir="rtl">
    <a href="/singles/matchmaker" class="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm">→ חזרה לכלי השדכן</a>
    <h1 class="text-2xl md:text-3xl font-black text-white mt-2 mb-1">שאלון ההתאמה - עיון והצעות</h1>
    <p class="text-gray-400 text-sm mb-4">
        כאן כל השאלות שהמשתמשים עונים עליהן ברמה 3 של הכרטיס, בנוסח גברים ובנוסח נשים. אפשר להציע עריכת ניסוח, הסרה, הערה או שאלה חדשה.
        כל הצעה מגיעה למנהל, והוא מחליט.
    </p>

    <div class="sticky top-0 z-10 -mx-4 px-4 py-2 bg-[#0f172a]/95 backdrop-blur flex gap-2 border-b border-white/10" role="tablist">
        {#each [['m', `👨 גברים · ${countOf('m')}`], ['f', `👩 נשים · ${countOf('f')}`], ['mine', `📋 ההצעות שלי · ${mine.length}`]] as [id, label]}
            <button type="button" role="tab" aria-selected={tab === id} onclick={() => (tab = id as typeof tab)}
                class="flex-1 rounded-lg border px-2 py-2 text-xs md:text-sm font-bold transition-all
                    {tab === id ? 'bg-pink-500 border-pink-300 text-white' : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}">
                {label}
            </button>
        {/each}
    </div>

    {#if tab === 'mine'}
        <div class="mt-4 space-y-3">
            {#if mine.length === 0}
                <p class="text-gray-400 text-sm text-center py-8">עדיין לא שלחתם הצעות. עברו על השאלות ולחצו "הצע שינוי".</p>
            {/if}
            {#each mine as s (s.id)}
                <div class="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div class="flex flex-wrap items-center gap-2 text-xs mb-1.5">
                        <span class="font-bold text-white">{KIND_LABELS[s.kind]}</span>
                        <span class="text-gray-400">{s.sectionTitle} · {GENDER_LABELS[s.gender]} · {dateOf(s.createdAt)}</span>
                        <span class="rounded-full border px-2 py-0.5 font-bold {statusClass(s.status)}">{STATUS_LABELS[s.status]}</span>
                    </div>
                    {#if s.originalText}<p class="text-xs text-gray-400 mb-1">על השאלה: {s.originalText}</p>{/if}
                    <p class="text-sm text-gray-100 whitespace-pre-wrap">{s.text}</p>
                    {#if s.adminNote}<p class="text-xs text-pink-200 mt-2 border-t border-white/10 pt-2">תגובת המנהל: {s.adminNote}</p>{/if}
                </div>
            {/each}
        </div>
    {:else}
        {@const g = tab as G}
        <div class="mt-4 space-y-3">
            {#each banks[g] as s (s.id)}
                {@const qs = s.questions.filter((q) => !q.g || q.g === g)}
                <details class="rounded-2xl border border-white/10 bg-white/[0.03]" open={s.id === 'self'}>
                    <summary class="cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-2">
                        <span class="font-black text-white">{s.icon} {fmt(s.title, g)}</span>
                        <span class="text-xs text-gray-400">{qs.length} שאלות</span>
                    </summary>
                    <div class="px-3 pb-3 md:px-4">
                        <p class="text-xs text-gray-400 mb-3">{fmt(s.intro, g)}</p>
                        {#if s.scale}<p class="text-[11px] text-gray-500 mb-2">1 = {s.scale.low} · 5 = {s.scale.high}</p>{/if}

                        <ol class="space-y-2.5">
                            {#each qs as q, i (q.id)}
                                {@const key = `${g}:${q.id}`}
                                {@const prior = mineFor(q.id, g)}
                                <li class="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <div class="flex items-start gap-2">
                                        <span class="text-pink-300 font-black text-sm min-w-[1.5rem]">{i + 1}</span>
                                        <p class="flex-1 min-w-0 text-sm font-bold text-gray-100">{fmt(q.text, g)}</p>
                                        <span class="shrink-0 text-[10px] text-gray-400 border border-white/15 rounded-full px-2 py-0.5">{KIND_NAMES[q.kind]}</span>
                                    </div>

                                    {#if q.kind === 'rate'}
                                        {@const subj = q.about === 'self' ? g : g === 'm' ? 'f' : 'm'}
                                        <div class="flex justify-between gap-3 text-[11px] text-gray-400 mt-2">
                                            <span>1 · {fmt(TRAITS[q.trait].low, subj)}</span>
                                            <span class="text-left">{fmt(TRAITS[q.trait].high, subj)} · 7</span>
                                        </div>
                                    {:else if q.kind === 'choice'}
                                        <ul class="mt-2 space-y-1 pr-5 list-disc text-[13px] text-gray-300">
                                            {#each q.options as o}<li>{fmt(o.text, g)}</li>{/each}
                                        </ul>
                                    {:else if q.kind === 'pick'}
                                        <div class="flex flex-wrap gap-1.5 mt-2">
                                            {#each q.options as o}<span class="text-[11px] border border-white/15 rounded-full px-2 py-0.5 text-gray-300">{o.text}</span>{/each}
                                        </div>
                                    {/if}
                                    {#if q.when}<p class="mt-2 text-[11px] rounded-md bg-amber-500/10 text-amber-200 px-2 py-1">{whenText(q)}</p>{/if}

                                    {#each prior as p (p.id)}
                                        <p class="mt-2 text-[11px] flex flex-wrap gap-1.5 items-center">
                                            <span class="rounded-full border px-2 py-0.5 font-bold {statusClass(p.status)}">{STATUS_LABELS[p.status]}</span>
                                            <span class="text-gray-400">ההצעה שלך ({KIND_LABELS[p.kind]}): {p.text.length > 60 ? p.text.slice(0, 60) + '…' : p.text}</span>
                                        </p>
                                    {/each}

                                    <button type="button" onclick={() => openForm(key, 'edit')}
                                        class="mt-2 text-xs font-bold text-pink-200 hover:text-white border border-pink-400/40 rounded-lg px-3 py-1.5 bg-pink-500/10">
                                        💬 הצע שינוי
                                    </button>

                                    {#if openKey === key}
                                        {@render form(g, q.id, s.id)}
                                    {/if}
                                </li>
                            {/each}
                        </ol>

                        <button type="button" onclick={() => openForm(`${g}:add:${s.id}`, 'add')}
                            class="mt-3 w-full text-sm font-bold text-pink-200 border border-dashed border-pink-400/40 rounded-xl py-2 hover:bg-pink-500/10">
                            ➕ הצע שאלה חדשה לפרק הזה
                        </button>
                        {#if openKey === `${g}:add:${s.id}`}
                            <div class="mt-2">{@render form(g, '', s.id)}</div>
                        {/if}
                    </div>
                </details>
            {/each}
        </div>
    {/if}
</div>

{#snippet form(g: G, qid: string, sectionId: string)}
    <div class="mt-2 rounded-xl border border-pink-400/30 bg-pink-500/10 p-3 space-y-2">
        {#if formKind !== 'add'}
            <div class="flex flex-wrap gap-1.5">
                {#each FORM_KINDS as k}
                    <button type="button" onclick={() => (formKind = k)} aria-pressed={formKind === k}
                        class="rounded-full border px-3 py-1 text-xs font-bold {formKind === k ? 'bg-pink-500 border-pink-300 text-white' : 'bg-white/5 border-white/15 text-gray-300'}">
                        {KIND_LABELS[k]}
                    </button>
                {/each}
            </div>
        {:else}
            <p class="text-xs font-bold text-pink-100">{KIND_LABELS.add}</p>
        {/if}
        <textarea rows="3" bind:value={formText} maxlength={MAX_SUGGESTION_TEXT} class="{inputCls} resize-none"
            placeholder={formKind === 'edit' ? 'הנוסח החדש שאתם מציעים, ולמה'
                : formKind === 'remove' ? 'למה כדאי להסיר את השאלה?'
                : formKind === 'add' ? 'נוסח השאלה החדשה, סוג התשובה (דירוג / בחירה / פתוחה) ומה היא בודקת'
                : 'ההערה שלכם'}></textarea>
        {#if formError}<p class="text-xs font-bold text-red-300">{formError}</p>{/if}
        <div class="flex gap-2">
            <button type="button" disabled={sending} onclick={() => send(g, qid, sectionId)}
                class="flex-1 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:bg-gray-600 text-white font-black text-sm py-2">
                {sending ? 'שולח...' : 'שלח למנהל'}
            </button>
            <button type="button" onclick={() => (openKey = '')} class="rounded-lg border border-white/20 text-gray-300 text-sm px-4">ביטול</button>
        </div>
    </div>
{/snippet}

{#if toast}
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] rounded-2xl bg-gray-900 border border-green-500/50 shadow-2xl px-5 py-3 text-sm font-bold text-green-300" role="status">{toast}</div>
{/if}
