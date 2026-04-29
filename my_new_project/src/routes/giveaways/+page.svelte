<script lang="ts">
    import type { PageData } from './$types';
    import { giveawayCategories, detectCategory, categoryByKey } from '$lib/giveawayCategories';

    let { data }: { data: PageData } = $props();

    type ConditionFilter = 'all' | 'מצוין' | 'טוב' | 'בינוני' | 'לתיקון';
    type SortOption = 'newest' | 'oldest' | 'popular';

    let categoryFilter = $state<string>('all');
    let conditionFilter = $state<ConditionFilter>('all');
    let sortBy = $state<SortOption>('newest');
    let viewMode = $state<'grid' | 'list'>('grid');
    let search = $state('');
    let debouncedSearch = $state('');
    let showSortMenu = $state(false);
    let favorites = $state<Set<string>>(new Set());

    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    $effect(() => {
        const v = search;
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { debouncedSearch = v.trim().toLowerCase(); }, 300);
    });

    // Load favorites from localStorage
    $effect(() => {
        if (typeof window === 'undefined') return;
        try {
            const saved = localStorage.getItem('giveaway_favorites');
            if (saved) favorites = new Set(JSON.parse(saved));
        } catch {}
    });

    function toggleFavorite(id: string, e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const next = new Set(favorites);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        favorites = next;
        try {
            localStorage.setItem('giveaway_favorites', JSON.stringify([...next]));
        } catch {}
    }

    function getField(extraFields: string, key: string): string {
        try { return JSON.parse(extraFields)?.[key] ?? ''; }
        catch { return ''; }
    }

    function getTags(extraFields: string): string[] {
        try {
            const t = JSON.parse(extraFields)?.tags;
            return Array.isArray(t) ? t : [];
        } catch { return []; }
    }

    function itemCategory(item: { label: string; description: string; extra_fields: string }): string {
        return detectCategory({
            label:       item.label,
            description: item.description,
            tags:        getTags(item.extra_fields),
            explicit:    getField(item.extra_fields, 'category'),
        });
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    function shareToWhatsApp(item: { id: string | number; label: string; address?: string; description?: string }) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/items/${item.id}`;
        const lines = [
            `🎁 למסירה: ${item.label}`,
            item.address ? `📍 ${item.address}` : '',
            item.description ? `\n${item.description}` : '',
            `\n🔗 ${url}`,
        ].filter(Boolean);
        const text = lines.join('\n');
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
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
            case 'מצוין':  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            case 'טוב':    return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
            case 'בינוני': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            case 'לתיקון': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
            default:       return 'bg-white/10 text-gray-300 border-white/10';
        }
    }

    let filtered = $derived.by(() => {
        let list = [...data.items];
        if (categoryFilter !== 'all') {
            list = list.filter(i => itemCategory(i) === categoryFilter);
        }
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
        if (sortBy === 'newest') {
            list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortBy === 'oldest') {
            list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else if (sortBy === 'popular') {
            list.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
        }
        return list;
    });

    // Counts per condition for filter chip badges
    let conditionCounts = $derived.by(() => {
        const counts: Record<string, number> = { all: data.items.length };
        for (const i of data.items) {
            const c = getField(i.extra_fields, 'condition');
            if (c) counts[c] = (counts[c] || 0) + 1;
        }
        return counts;
    });

    // Counts per category for filter chip badges
    let categoryCounts = $derived.by(() => {
        const counts: Record<string, number> = { all: data.items.length };
        for (const i of data.items) {
            const c = itemCategory(i);
            counts[c] = (counts[c] || 0) + 1;
        }
        return counts;
    });

    const conditions: { key: ConditionFilter; label: string; icon: string }[] = [
        { key: 'all',     label: 'הכל',    icon: '🌍' },
        { key: 'מצוין',  label: 'מצוין',  icon: '✨' },
        { key: 'טוב',    label: 'טוב',    icon: '👍' },
        { key: 'בינוני', label: 'בינוני', icon: '🆗' },
        { key: 'לתיקון', label: 'לתיקון', icon: '🔧' },
    ];

    const sortOptions: { key: SortOption; label: string; icon: string }[] = [
        { key: 'newest',  label: 'החדשים ביותר', icon: '🆕' },
        { key: 'oldest',  label: 'הישנים ביותר', icon: '📅' },
        { key: 'popular', label: 'פופולריים',    icon: '🔥' },
    ];

    let currentSortLabel = $derived(sortOptions.find(o => o.key === sortBy)?.label ?? '');
</script>

<svelte:head>
    <title>למסירה | קהילה בשכונה</title>
    <meta name="description" content="פריטים למסירה חינם בקהילה — ספות, מוצרי חשמל, ספרים, בגדים ועוד" />
</svelte:head>

<svelte:window onclick={() => showSortMenu = false} />

<div class="min-h-screen bg-[#070b14] pb-28" dir="rtl">

    <!-- Hero Section -->
    <div class="relative overflow-hidden bg-gradient-to-b from-orange-900/30 via-amber-900/20 to-transparent border-b border-white/5">
        <div class="absolute inset-0 opacity-20">
            <div class="absolute top-10 right-10 w-64 h-64 bg-orange-500 rounded-full blur-3xl"></div>
            <div class="absolute bottom-10 left-10 w-72 h-72 bg-amber-500 rounded-full blur-3xl"></div>
        </div>
        <div class="relative max-w-7xl mx-auto px-4 pt-6 pb-4 md:pt-10 md:pb-6">
            <div class="flex items-center justify-center gap-3 md:gap-4 mb-2">
                <span class="text-4xl md:text-5xl">🎁</span>
                <h1 class="text-4xl md:text-6xl font-black bg-gradient-to-l from-orange-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                    למסירה
                </h1>
            </div>
            <img src="/images/delivery.png" alt="" class="w-full max-w-[32rem] md:max-w-[40rem] mx-auto block mb-2" />
            <p class="text-center text-amber-200/80 text-sm md:text-lg font-medium mb-3">
                מוצרים שכונתיים חינם — קח, תן, וחזק את הקהילה
            </p>

            <!-- Stats banner -->
            <div class="flex items-center justify-center gap-2 md:gap-4 text-xs md:text-sm">
                <div class="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
                    <span class="text-base">📦</span>
                    <span class="text-white font-bold">{data.items.length}</span>
                    <span class="text-gray-400">פריטים</span>
                </div>
                <div class="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1.5 backdrop-blur-sm">
                    <span class="text-base">💚</span>
                    <span class="text-emerald-300 font-bold">100% חינם</span>
                </div>
                {#if data.currentUserId}
                    <a href="/giveaways/my" class="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors">
                        <span class="text-base">👤</span>
                        <span class="text-orange-300 font-bold">הפריטים שלי</span>
                    </a>
                {/if}
            </div>
        </div>
    </div>

    <!-- Categories Tiles (Yad2-style) -->
    <div class="max-w-7xl mx-auto px-4 pt-5">
        <div class="flex items-center justify-between mb-3 px-1">
            <h2 class="text-white font-black text-base md:text-lg flex items-center gap-2">
                <span class="text-orange-400">▾</span>
                קטגוריות
            </h2>
            {#if categoryFilter !== 'all'}
                <button
                    onclick={() => categoryFilter = 'all'}
                    class="text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors"
                >× הצג הכל</button>
            {/if}
        </div>
        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {#each giveawayCategories as cat}
                {@const count = categoryCounts[cat.key] ?? 0}
                {@const active = categoryFilter === cat.key}
                <button
                    onclick={() => categoryFilter = cat.key}
                    class="relative group flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all hover:scale-105 hover:-translate-y-0.5 {active ? 'bg-gradient-to-br from-orange-500/30 to-amber-500/20 border-orange-400 shadow-lg shadow-orange-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-orange-500/40'}"
                    title={cat.label}
                >
                    <span class="text-2xl md:text-3xl transition-transform group-hover:scale-110">{cat.icon}</span>
                    <span class="text-[10px] md:text-xs font-bold text-center leading-tight {active ? 'text-orange-200' : 'text-gray-300'}">{cat.label}</span>
                    {#if count > 0 && cat.key !== 'all'}
                        <span class="absolute -top-1 -end-1 bg-orange-500 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md">{count}</span>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Sticky Search & Filter Bar -->
    <div class="sticky top-0 z-30 bg-[#070b14]/95 backdrop-blur-md border-b border-white/10 shadow-lg mt-4">
        <div class="max-w-7xl mx-auto px-4 py-3">
            <!-- Search Row -->
            <div class="flex items-center gap-2 mb-3">
                <div class="relative flex-1">
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">🔎</span>
                    <input
                        type="search"
                        bind:value={search}
                        placeholder="מה מחפשים? ספה, מקרר, ספרים..."
                        aria-label="חיפוש פריטים"
                        class="w-full bg-white/5 border-2 border-white/10 rounded-xl pe-12 ps-4 py-3 text-white placeholder:text-gray-500 focus:border-orange-500 focus:bg-white/10 focus:outline-none transition-all text-base"
                    />
                    {#if search}
                        <button
                            type="button"
                            onclick={() => { search = ''; debouncedSearch = ''; }}
                            aria-label="נקה חיפוש"
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xl bg-white/10 hover:bg-white/20 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        >×</button>
                    {/if}
                </div>
                <a
                    href="/giveaways/add"
                    class="hidden md:inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-105 whitespace-nowrap"
                >
                    <span class="text-lg">➕</span>
                    פרסם פריט
                </a>
            </div>

            <!-- Filter Chips Row -->
            <div class="flex items-center gap-2">
                <div class="flex gap-1.5 overflow-x-auto pb-1 flex-1 hide-scrollbar">
                    {#each conditions as c}
                        {@const count = conditionCounts[c.key] ?? 0}
                        <button
                            onclick={() => conditionFilter = c.key}
                            class="px-3 py-1.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border {conditionFilter === c.key ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/40 border-transparent' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20'}"
                        >
                            <span>{c.icon}</span>
                            <span>{c.label}</span>
                            {#if count > 0 && c.key !== 'all'}
                                <span class="text-[10px] opacity-80 bg-black/20 rounded-full px-1.5 py-0.5">{count}</span>
                            {/if}
                        </button>
                    {/each}
                </div>

                <!-- Sort + view toggle -->
                <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Sort dropdown -->
                    <div class="relative" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
                        <button
                            onclick={() => showSortMenu = !showSortMenu}
                            class="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-full text-xs md:text-sm font-bold transition-colors"
                            aria-label="מיון"
                        >
                            <span>↕️</span>
                            <span class="hidden sm:inline">{currentSortLabel}</span>
                        </button>
                        {#if showSortMenu}
                            <div class="absolute left-0 top-full mt-1 z-50 bg-[#0f172a] border border-white/15 rounded-xl shadow-2xl py-1 min-w-[180px] overflow-hidden">
                                {#each sortOptions as o}
                                    <button
                                        onclick={() => { sortBy = o.key; showSortMenu = false; }}
                                        class="w-full text-right px-4 py-2.5 text-xs md:text-sm hover:bg-white/10 transition-colors flex items-center gap-2 {sortBy === o.key ? 'text-orange-300 bg-orange-500/10' : 'text-white'}"
                                    >
                                        <span>{o.icon}</span>
                                        <span class="flex-1">{o.label}</span>
                                        {#if sortBy === o.key}<span class="text-orange-400">✓</span>{/if}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <!-- View mode toggle (desktop only) -->
                    <div class="hidden md:flex bg-white/5 border border-white/10 rounded-full p-0.5">
                        <button
                            onclick={() => viewMode = 'grid'}
                            class="px-2.5 py-1 rounded-full text-sm transition-all {viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}"
                            aria-label="תצוגת רשת"
                            title="תצוגת רשת"
                        >▦</button>
                        <button
                            onclick={() => viewMode = 'list'}
                            class="px-2.5 py-1 rounded-full text-sm transition-all {viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}"
                            aria-label="תצוגת רשימה"
                            title="תצוגת רשימה"
                        >☰</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Results -->
    <div class="max-w-7xl mx-auto px-4 pt-4">
        <!-- Results count -->
        <div class="flex items-center justify-between mb-4 px-1 gap-2 flex-wrap">
            <p class="text-gray-400 text-xs md:text-sm">
                <span class="text-white font-bold">{filtered.length}</span>
                {filtered.length === data.items.length ? 'פריטים זמינים' : `מתוך ${data.items.length} פריטים`}
                {#if categoryFilter !== 'all'}
                    {@const cat = categoryByKey(categoryFilter)}
                    {#if cat}
                        <span class="text-orange-400/80"> · {cat.icon} {cat.label}</span>
                    {/if}
                {/if}
                {#if debouncedSearch}
                    <span class="text-gray-500"> · חיפוש: "{debouncedSearch}"</span>
                {/if}
            </p>
            {#if categoryFilter !== 'all' || conditionFilter !== 'all' || debouncedSearch}
                <button
                    onclick={() => { categoryFilter = 'all'; conditionFilter = 'all'; search = ''; debouncedSearch = ''; }}
                    class="text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors"
                >
                    × נקה סינון
                </button>
            {/if}
        </div>

        {#if filtered.length === 0}
            <div class="text-center py-16 rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#0a0f1a] border border-white/10">
                <span class="text-7xl mb-4 block">📭</span>
                {#if data.items.length === 0}
                    <p class="text-white text-xl font-bold mb-2">אין כרגע פריטים למסירה</p>
                    <p class="text-gray-400 text-sm mb-6">היה הראשון להציע משהו לקהילה!</p>
                {:else}
                    <p class="text-white text-xl font-bold mb-2">לא נמצאו תוצאות</p>
                    <p class="text-gray-400 text-sm mb-6">נסה לחפש משהו אחר או לנקות את הפילטרים</p>
                {/if}
                <a
                    href="/giveaways/add"
                    class="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-orange-500/30 transition-all hover:scale-105"
                >
                    ➕ פרסם פריט
                </a>
            </div>

        {:else if viewMode === 'list'}
            <!-- List view (desktop) -->
            <div class="flex flex-col gap-3">
                {#each filtered as item (item.id)}
                    {@const condition = getField(item.extra_fields, 'condition')}
                    {@const isMine    = data.currentUserId && item.user_id === data.currentUserId}
                    {@const isFav     = favorites.has(String(item.id))}
                    <div class="group rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#0c1322] border border-white/10 overflow-hidden shadow-lg hover:shadow-2xl hover:border-orange-500/40 transition-all flex flex-row">
                        <a href="/items/{item.id}" class="block w-32 md:w-44 shrink-0 aspect-square bg-gradient-to-br from-orange-900/40 to-amber-900/30 flex items-center justify-center relative">
                            <span class="text-5xl md:text-6xl" aria-hidden="true">{item.icon || '📦'}</span>
                            <span class="absolute bottom-2 start-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-white shadow-lg">חינם</span>
                            {#if isMine}
                                <span class="absolute top-2 start-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-600 text-white shadow">שלי</span>
                            {/if}
                        </a>
                        <div class="flex-1 p-3 md:p-4 flex flex-col min-w-0">
                            <div class="flex items-start justify-between gap-2 mb-1">
                                <a href="/items/{item.id}" class="block min-w-0 flex-1">
                                    <h3 class="text-white font-bold text-base md:text-lg line-clamp-1 hover:text-orange-300 transition-colors">{item.label}</h3>
                                </a>
                                <button
                                    onclick={(e) => toggleFavorite(String(item.id), e)}
                                    aria-label={isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                                    class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-lg transition-all {isFav ? 'text-rose-400' : 'text-gray-500 hover:text-rose-300'}"
                                >{isFav ? '❤️' : '🤍'}</button>
                            </div>
                            {#if item.description}
                                <p class="text-gray-400 text-xs md:text-sm line-clamp-1 mb-2">{item.description}</p>
                            {/if}
                            <div class="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 mb-2">
                                {#if item.address}
                                    <span class="flex items-center gap-1"><span>📍</span>{item.address}</span>
                                {/if}
                                {#if item.created_at}
                                    <span class="flex items-center gap-1"><span>🕐</span>{timeAgo(item.created_at)}</span>
                                {/if}
                                {#if condition}
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border {conditionBadgeClass(condition)}">
                                        {condition}
                                    </span>
                                {/if}
                            </div>
                            <div class="mt-auto flex gap-2">
                                {#if item.phone}
                                    <a
                                        href={waLink(item.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="פנייה בוואטסאפ"
                                        class="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-colors text-sm"
                                    >💬 וואטסאפ</a>
                                    <a
                                        href="tel:{item.phone}"
                                        aria-label="התקשרות"
                                        class="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors text-sm"
                                    >📞 התקשר</a>
                                {/if}
                                <button
                                    type="button"
                                    onclick={() => shareToWhatsApp(item)}
                                    aria-label="שתף בוואטסאפ"
                                    title="שתף בוואטסאפ"
                                    class="flex items-center justify-center bg-emerald-700/40 hover:bg-emerald-600/70 text-emerald-200 hover:text-white border border-emerald-500/30 py-2 px-3 rounded-lg transition-colors text-sm"
                                >📤</button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

        {:else}
            <!-- Grid view -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {#each filtered as item (item.id)}
                    {@const condition = getField(item.extra_fields, 'condition')}
                    {@const isMine    = data.currentUserId && item.user_id === data.currentUserId}
                    {@const isFav     = favorites.has(String(item.id))}
                    {@const cat       = categoryByKey(itemCategory(item))}
                    <div class="group rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#0c1322] border border-white/10 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 hover:border-orange-500/40 transition-all hover:-translate-y-1 flex flex-col">
                        <a href="/items/{item.id}" class="block aspect-square bg-gradient-to-br from-orange-900/40 via-amber-900/30 to-orange-900/40 flex items-center justify-center relative overflow-hidden">
                            <!-- Decorative pattern -->
                            <div class="absolute inset-0 opacity-30">
                                <div class="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl"></div>
                                <div class="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl"></div>
                            </div>
                            <span class="text-7xl md:text-8xl relative z-10 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">{item.icon || '📦'}</span>

                            <!-- FREE price tag (Yad2-style) -->
                            <div class="absolute bottom-2 start-2 z-10">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
                                    <span class="text-sm">💚</span>
                                    חינם
                                </span>
                            </div>

                            <!-- Heart favorite -->
                            <button
                                onclick={(e) => toggleFavorite(String(item.id), e)}
                                aria-label={isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                                class="absolute top-2 end-2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm hover:bg-black/60 text-base transition-all {isFav ? 'text-rose-400 scale-110' : 'text-white/80 hover:text-rose-300'}"
                            >{isFav ? '❤️' : '🤍'}</button>

                            <!-- Condition badge -->
                            {#if condition}
                                <span class="absolute top-2 start-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-sm {conditionBadgeClass(condition)}">
                                    {condition}
                                </span>
                            {/if}

                            <!-- "Mine" badge -->
                            {#if isMine}
                                <span class="absolute top-10 start-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-600 text-white shadow">שלי</span>
                            {/if}
                        </a>

                        <div class="p-2.5 md:p-3 flex-1 flex flex-col">
                            <a href="/items/{item.id}" class="block">
                                <h3 class="text-white font-bold text-sm md:text-base mb-1 line-clamp-2 hover:text-orange-300 transition-colors leading-tight min-h-[2.5em]">{item.label}</h3>
                            </a>

                            {#if cat && cat.key !== 'other' && cat.key !== 'all'}
                                <button
                                    type="button"
                                    onclick={(e) => { e.preventDefault(); e.stopPropagation(); categoryFilter = cat.key; }}
                                    class="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] md:text-xs font-bold bg-white/5 border border-white/10 text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/40 transition-colors mb-1.5"
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                </button>
                            {/if}

                            <div class="flex flex-col gap-0.5 mb-2">
                                {#if item.address}
                                    <p class="text-gray-400 text-[11px] md:text-xs flex items-center gap-1 truncate">
                                        <span class="text-orange-400/70 shrink-0">📍</span>
                                        <span class="truncate">{item.address}</span>
                                    </p>
                                {/if}
                                {#if item.created_at}
                                    <p class="text-gray-500 text-[11px] md:text-xs flex items-center gap-1">
                                        <span class="shrink-0">🕐</span>
                                        <span>{timeAgo(item.created_at)}</span>
                                    </p>
                                {/if}
                            </div>

                            <div class="mt-auto flex gap-1 pt-1 border-t border-white/5">
                                {#if item.phone}
                                    <a
                                        href={waLink(item.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="פנייה בוואטסאפ"
                                        class="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 rounded-lg transition-colors text-[11px] md:text-xs"
                                    >💬 פנייה</a>
                                    <a
                                        href="tel:{item.phone}"
                                        aria-label="התקשרות"
                                        class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white py-1.5 px-2.5 rounded-lg transition-colors text-[11px] md:text-xs"
                                    >📞</a>
                                {/if}
                                <button
                                    type="button"
                                    onclick={() => shareToWhatsApp(item)}
                                    aria-label="שתף בוואטסאפ"
                                    title="שתף בוואטסאפ"
                                    class="{item.phone ? '' : 'flex-1 gap-1 '}flex items-center justify-center bg-emerald-700/40 hover:bg-emerald-600/70 text-emerald-200 hover:text-white border border-emerald-500/30 py-1.5 px-2.5 rounded-lg transition-colors text-[11px] md:text-xs"
                                >
                                    <span aria-hidden="true">📤</span>{#if !item.phone}<span>שתף</span>{/if}
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <!-- Floating Add Button (mobile) -->
        <a
            href="/giveaways/add"
            class="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold px-6 py-3 rounded-full shadow-2xl shadow-orange-500/50 transition-all hover:scale-105 border-2 border-white/20"
        >
            <span class="text-lg">➕</span>
            פרסם פריט
        </a>

        <div class="text-center mt-10 mb-4">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>

<style>
    .hide-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
        display: none;
    }
</style>
