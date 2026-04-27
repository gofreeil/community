<script lang="ts">
    import type { ActionData, PageData } from './$types';
    import { enhance } from '$app/forms';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    type Tab = 'active' | 'history';
    let tab = $state<Tab>('active');

    function getField(extraFields: string, key: string): string {
        try { return JSON.parse(extraFields)?.[key] ?? ''; }
        catch { return ''; }
    }

    function timeAgo(iso: string): string {
        if (!iso) return '';
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'הרגע';
        if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
        if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
        if (diff < 86400 * 30) return `לפני ${Math.floor(diff / 86400)} ימים`;
        return new Date(iso).toLocaleDateString('he-IL');
    }

    let active   = $derived(data.items.filter(i => i.status === 'active'));
    let history  = $derived(data.items.filter(i => i.status !== 'active'));
    let visible  = $derived(tab === 'active' ? active : history);
</script>

<svelte:head>
    <title>הפריטים שלי | למסירה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-3xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">📦</span>
            <h1 class="text-3xl font-black text-white mb-2">הפריטים שלי</h1>
            <p class="text-gray-400">ניהול הפריטים שפרסמת למסירה</p>
        </div>

        <div class="flex justify-center gap-2 mb-6">
            <button
                onclick={() => tab = 'active'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {tab === 'active' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🟢 פעילים ({active.length})
            </button>
            <button
                onclick={() => tab = 'history'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {tab === 'history' ? 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                ✓ היסטוריה ({history.length})
            </button>
        </div>

        {#if form?.taken}
            <p class="text-emerald-300 text-sm text-center bg-emerald-900/20 border border-emerald-500/30 rounded-lg py-2 mb-4">
                ✅ הפריט סומן כנמסר
            </p>
        {/if}
        {#if form?.removed}
            <p class="text-amber-300 text-sm text-center bg-amber-900/20 border border-amber-500/30 rounded-lg py-2 mb-4">
                🗑 הפריט הוסר
            </p>
        {/if}
        {#if form?.error}
            <p class="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-lg py-2 mb-4">
                {form.error}
            </p>
        {/if}

        {#if visible.length === 0}
            <div class="text-center py-16 rounded-2xl bg-[#0f172a] border border-white/5">
                <span class="text-6xl mb-4 block">📭</span>
                {#if tab === 'active'}
                    <p class="text-gray-300 text-lg font-bold mb-1">אין פריטים פעילים</p>
                    <p class="text-gray-500 text-sm mb-4">פרסם פריט חדש לקהילה</p>
                    <a
                        href="/giveaways/add"
                        class="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold px-6 py-3 rounded-full shadow-lg transition-all"
                    >
                        ➕ פרסם פריט
                    </a>
                {:else}
                    <p class="text-gray-300 text-lg font-bold">אין פריטים בהיסטוריה עדיין</p>
                {/if}
            </div>
        {:else}
            <div class="space-y-3">
                {#each visible as item (item.id)}
                    {@const condition = getField(item.extra_fields, 'condition')}
                    {@const isHist    = item.status !== 'active'}
                    <div class="rounded-2xl bg-[#0f172a] border {isHist ? 'border-white/5 opacity-70' : 'border-white/10'} p-4 flex flex-col sm:flex-row gap-4">
                        <a href="/items/{item.id}" class="flex-shrink-0 w-full sm:w-24 aspect-square rounded-xl bg-gradient-to-br from-orange-900/30 to-amber-900/30 flex items-center justify-center">
                            <span class="text-5xl" aria-hidden="true">{item.icon || '📦'}</span>
                        </a>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start gap-2 mb-2">
                                <a href="/items/{item.id}" class="flex-1 min-w-0">
                                    <h3 class="text-white font-bold text-lg {isHist ? 'line-through text-gray-400' : ''} hover:text-orange-300 transition-colors truncate">
                                        {item.label}
                                    </h3>
                                </a>
                                {#if condition}
                                    <span class="px-2 py-1 rounded-full text-[10px] font-bold bg-white/10 text-gray-300 border border-white/10 flex-shrink-0">
                                        {condition}
                                    </span>
                                {/if}
                            </div>
                            {#if item.description}
                                <p class="text-gray-400 text-sm line-clamp-2 mb-2">{item.description}</p>
                            {/if}
                            <div class="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                                {#if item.address}
                                    <span class="flex items-center gap-1">📍 {item.address}</span>
                                {/if}
                                <span class="flex items-center gap-1">🕐 {timeAgo(item.created_at)}</span>
                                {#if isHist}
                                    <span class="flex items-center gap-1 text-amber-400">✓ נמסר / הוסר</span>
                                {/if}
                            </div>
                            {#if !isHist}
                                <div class="flex flex-wrap gap-2">
                                    <form method="POST" action="?/markTaken" use:enhance class="inline">
                                        <input type="hidden" name="item_id" value={item.id} />
                                        <input type="hidden" name="item_user_id" value={item.user_id} />
                                        <button
                                            type="submit"
                                            class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            ✓ סמן כנמסר
                                        </button>
                                    </form>
                                    <form
                                        method="POST"
                                        action="?/remove"
                                        use:enhance={({ cancel }) => {
                                            if (!confirm('להסיר את הפריט?')) cancel();
                                        }}
                                        class="inline"
                                    >
                                        <input type="hidden" name="item_id" value={item.id} />
                                        <input type="hidden" name="item_user_id" value={item.user_id} />
                                        <button
                                            type="submit"
                                            class="bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            🗑 הסר
                                        </button>
                                    </form>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <div class="text-center mt-8">
            <a href="/giveaways" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לרשימה הציבורית</a>
        </div>
    </div>
</div>
