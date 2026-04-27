<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type ConditionFilter = 'all' | 'מצוין' | 'טוב' | 'בינוני' | 'לתיקון';
    let conditionFilter = $state<ConditionFilter>('all');
    let search = $state('');
    let debouncedSearch = $state('');

    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    $effect(() => {
        const v = search;
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { debouncedSearch = v.trim().toLowerCase(); }, 300);
    });

    function getField(extraFields: string, key: string): string {
        try { return JSON.parse(extraFields)?.[key] ?? ''; }
        catch { return ''; }
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
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

    function conditionBadgeClass(c: string): string {
        switch (c) {
            case 'מצוין':  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            case 'טוב':    return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
            case 'בינוני': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'לתיקון': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            default:       return 'bg-white/10 text-gray-300 border-white/10';
        }
    }

    let filtered = $derived.by(() => {
        let list = data.items;
        if (conditionFilter !== 'all') {
            list = list.filter(i => getField(i.extra_fields, 'condition') === conditionFilter);
        }
        if (debouncedSearch) {
            list = list.filter(i =>
                i.label.toLowerCase().includes(debouncedSearch) ||
                i.description.toLowerCase().includes(debouncedSearch) ||
                i.address.toLowerCase().includes(debouncedSearch)
            );
        }
        return list;
    });

    const conditions: { key: ConditionFilter; label: string; icon: string }[] = [
        { key: 'all',     label: 'הכל',    icon: '🌍' },
        { key: 'מצוין',  label: 'מצוין',  icon: '✨' },
        { key: 'טוב',    label: 'טוב',    icon: '👍' },
        { key: 'בינוני', label: 'בינוני', icon: '🆗' },
        { key: 'לתיקון', label: 'לתיקון', icon: '🔧' },
    ];
</script>

<svelte:head>
    <title>למסירה | קהילה בשכונה</title>
    <meta name="description" content="פריטים למסירה חינם בקהילה — ספות, מוצרי חשמל, ספרים, בגדים ועוד" />
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-28 px-4" dir="rtl">
    <div class="max-w-5xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">📦</span>
            <h1 class="text-3xl font-black text-white mb-2">למסירה</h1>
            <p class="text-gray-400">פריטים שעוברים מיד ליד — חינם, בקהילה</p>
        </div>

        <div class="mb-5 sticky top-0 z-20 bg-[#070b14]/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-white/5">
            <div class="relative">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">🔎</span>
                <input
                    type="search"
                    bind:value={search}
                    placeholder="חיפוש פריט..."
                    aria-label="חיפוש פריטים"
                    class="w-full bg-white/5 border border-white/10 rounded-full pe-10 ps-4 py-2.5 text-white placeholder:text-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                />
                {#if search}
                    <button
                        type="button"
                        onclick={() => { search = ''; debouncedSearch = ''; }}
                        aria-label="נקה חיפוש"
                        class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-lg"
                    >×</button>
                {/if}
            </div>
        </div>

        <div class="flex justify-center gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4">
            {#each conditions as c}
                <button
                    onclick={() => conditionFilter = c.key}
                    class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 {conditionFilter === c.key ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                >
                    <span>{c.icon}</span>
                    {c.label}
                </button>
            {/each}
        </div>

        <div class="text-center mb-5">
            <p class="text-gray-500 text-sm">📦 {filtered.length} פריטים זמינים</p>
            {#if data.currentUserId}
                <a href="/giveaways/my" class="inline-block text-orange-400 hover:text-orange-300 text-sm mt-1 transition-colors">הפריטים שלי ←</a>
            {/if}
        </div>

        {#if filtered.length === 0}
            <div class="text-center py-16 rounded-2xl bg-[#0f172a] border border-white/5">
                <span class="text-6xl mb-4 block">📭</span>
                {#if data.items.length === 0}
                    <p class="text-gray-300 text-lg font-bold mb-1">אין כרגע פריטים למסירה</p>
                    <p class="text-gray-500 text-sm mb-4">היה הראשון להציע משהו לקהילה!</p>
                {:else}
                    <p class="text-gray-300 text-lg font-bold mb-1">לא נמצאו תוצאות</p>
                    <p class="text-gray-500 text-sm mb-4">נסה לחפש משהו אחר או לנקות את הפילטרים</p>
                {/if}
                <a
                    href="/giveaways/add"
                    class="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold px-6 py-3 rounded-full shadow-lg transition-all"
                >
                    ➕ פרסם פריט
                </a>
            </div>
        {:else}
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {#each filtered as item (item.id)}
                    {@const condition = getField(item.extra_fields, 'condition')}
                    {@const isMine    = data.currentUserId && item.user_id === data.currentUserId}
                    <div class="rounded-2xl bg-[#0f172a] border border-white/10 overflow-hidden shadow-xl hover:shadow-2xl hover:border-orange-500/30 transition-all hover:-translate-y-1 flex flex-col">
                        <a href="/items/{item.id}" class="block aspect-square bg-gradient-to-br from-orange-900/30 to-amber-900/30 flex items-center justify-center relative">
                            <span class="text-6xl" aria-hidden="true">{item.icon || '📦'}</span>
                            {#if condition}
                                <span class="absolute top-2 end-2 px-2 py-1 rounded-full text-[10px] font-bold border {conditionBadgeClass(condition)}">
                                    {condition}
                                </span>
                            {/if}
                            {#if isMine}
                                <span class="absolute top-2 start-2 px-2 py-1 rounded-full text-[10px] font-bold bg-orange-600 text-white">שלי</span>
                            {/if}
                        </a>
                        <div class="p-3 flex-1 flex flex-col">
                            <a href="/items/{item.id}" class="block">
                                <h3 class="text-white font-bold text-sm mb-1 line-clamp-2 hover:text-orange-300 transition-colors">{item.label}</h3>
                            </a>
                            {#if item.address}
                                <p class="text-gray-400 text-xs flex items-center gap-1 mb-1">
                                    <span>📍</span>
                                    <span class="truncate">{item.address}</span>
                                </p>
                            {/if}
                            {#if item.created_at}
                                <p class="text-gray-500 text-xs flex items-center gap-1 mb-2">
                                    <span>🕐</span>
                                    <span>{timeAgo(item.created_at)}</span>
                                </p>
                            {/if}
                            {#if item.phone}
                                <div class="mt-auto flex gap-1.5 pt-2">
                                    <a
                                        href={waLink(item.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="פנייה בוואטסאפ"
                                        class="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 rounded-lg transition-colors text-xs"
                                    >💬 פנייה</a>
                                    <a
                                        href="tel:{item.phone}"
                                        aria-label="התקשרות"
                                        class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white py-1.5 px-3 rounded-lg transition-colors text-xs"
                                    >📞</a>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        {#if filtered.length > 0}
            <div class="text-center mt-10">
                <a
                    href="/giveaways/add"
                    class="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-orange-500/30 transition-all hover:scale-105"
                >
                    <span class="text-lg">➕</span>
                    פרסם פריט
                </a>
            </div>
        {/if}

        <div class="text-center mt-10">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
