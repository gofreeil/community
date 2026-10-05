<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';
    import { KIND_LABELS, STATUS_LABELS, GENDER_LABELS } from '$lib/quizSuggestionsShared';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let filter = $state<'pending' | 'accepted' | 'done' | 'rejected'>('pending');
    const counts = $derived({
        pending: data.suggestions.filter((s) => s.status === 'pending').length,
        accepted: data.suggestions.filter((s) => s.status === 'accepted').length,
        done: data.suggestions.filter((s) => s.status === 'done').length,
        rejected: data.suggestions.filter((s) => s.status === 'rejected').length,
    });
    const shown = $derived(data.suggestions.filter((s) => s.status === filter));
    let busyId = $state('');

    const dateOf = (iso: string) => (iso ? new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '');
</script>

<svelte:head><title>הצעות לשאלון ההתאמה | ניהול</title></svelte:head>

<div class="max-w-3xl mx-auto px-4 py-5 md:py-8" dir="rtl">
    <a href="/admin" class="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm">→ חזרה ללוח הניהול</a>
    <h1 class="text-2xl md:text-3xl font-black text-white mt-2 mb-1">📝 הצעות שדכנים לשאלון ההתאמה</h1>
    <p class="text-gray-400 text-sm mb-4">
        עריכות, הסרות, הערות ושאלות חדשות שהשדכנים שלחו. "אושרה" = בכוונה ליישם; "יושמה" = כבר בקוד. התגובה שתכתבו תופיע אצל השדכן/ית.
    </p>

    <div class="flex gap-1.5 mb-4 overflow-x-auto" role="tablist">
        {#each [['pending', 'ממתינות'], ['accepted', 'אושרו'], ['done', 'יושמו'], ['rejected', 'נדחו']] as [id, label]}
            <button type="button" role="tab" aria-selected={filter === id} onclick={() => (filter = id as typeof filter)}
                class="shrink-0 rounded-full border px-3 py-1.5 text-xs md:text-sm font-bold
                    {filter === id ? 'bg-pink-500 border-pink-300 text-white' : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}">
                {label} · {counts[id as keyof typeof counts]}
            </button>
        {/each}
    </div>

    {#if form?.error}<p class="mb-3 rounded-xl border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm font-bold text-red-300">{form.error}</p>{/if}

    {#if shown.length === 0}
        <p class="text-gray-400 text-sm text-center py-10">אין הצעות בקטגוריה הזו.</p>
    {/if}

    <div class="space-y-3">
        {#each shown as s (s.id)}
            <article class="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div class="flex flex-wrap items-center gap-2 text-xs mb-2">
                    <span class="font-black text-white text-sm">{KIND_LABELS[s.kind]}</span>
                    <span class="rounded-full border border-white/15 px-2 py-0.5 text-gray-300">{GENDER_LABELS[s.gender]}</span>
                    <span class="text-gray-400">{s.sectionTitle}</span>
                    <span class="text-gray-500 mr-auto">{s.authorName} · {dateOf(s.createdAt)}</span>
                </div>

                {#if s.originalText}
                    <p class="text-xs text-gray-400 mb-1">השאלה הנוכחית</p>
                    <p class="text-sm text-gray-200 rounded-lg bg-black/20 px-3 py-2 mb-2">{s.originalText}</p>
                {/if}
                <p class="text-xs text-pink-200 mb-1">{s.kind === 'add' ? 'השאלה המוצעת' : 'ההצעה'}</p>
                <p class="text-sm text-white whitespace-pre-wrap rounded-lg bg-pink-500/10 border border-pink-400/20 px-3 py-2">{s.text}</p>

                {#if s.adminNote && s.status !== 'pending'}
                    <p class="mt-2 text-xs text-gray-300">התגובה שלך: {s.adminNote}</p>
                {/if}

                <form method="POST" action="?/decide" class="mt-3 space-y-2"
                    use:enhance={() => { busyId = s.id; return async ({ update }) => { await update({ reset: false }); busyId = ''; }; }}>
                    <input type="hidden" name="id" value={s.id} />
                    <textarea name="note" rows="2" maxlength="600" placeholder="תגובה לשדכן/ית (לא חובה)"
                        class="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-gray-500 text-sm resize-none focus:outline-none focus:border-pink-400/60">{s.adminNote}</textarea>
                    <div class="grid grid-cols-3 gap-2">
                        <button name="status" value="accepted" disabled={busyId === s.id}
                            class="rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold text-sm py-2">✅ אשר</button>
                        <button name="status" value="done" disabled={busyId === s.id}
                            class="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-sm py-2">🛠️ יושמה</button>
                        <button name="status" value="rejected" disabled={busyId === s.id}
                            class="rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-sm py-2">✖️ דחה</button>
                    </div>
                    <p class="text-[11px] text-gray-500">מצב נוכחי: {STATUS_LABELS[s.status]}</p>
                </form>
            </article>
        {/each}
    </div>
</div>
