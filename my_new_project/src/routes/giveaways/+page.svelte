<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';
    import { giveawayCategories, detectCategory, categoryByKey } from '$lib/giveawayCategories';
    import { neighborhoodState } from '$lib/neighborhoodState.svelte';
    import { toggleLike } from '$lib/likedItems';

    let { data }: { data: PageData } = $props();

    onMount(() => {
        neighborhoodState.init(data.userNeighborhood, data.userCity);
    });

    type SortOption = 'newest' | 'oldest' | 'popular';

    let categoryFilter = $state<string>('all');
    let priceFilter = $state<'all' | 'free' | 'symbolic'>('all');
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

    function toggleFavorite(item: { id: string | number; label: string; address: string; description: string; extra_fields: string }, e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const id = String(item.id);
        const next = new Set(favorites);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        favorites = next;
        try {
            localStorage.setItem('giveaway_favorites', JSON.stringify([...next]));
        } catch {}
        // שמירת תצלום מלא לדף הפרופיל
        toggleLike({
            type: 'giveaway',
            id,
            label: item.label,
            image: itemImage(item),
            url: `/items/${id}`,
            summary: item.address || item.description?.slice(0, 80) || '',
        });
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

    function itemImages(item: { extra_fields: string }): string[] {
        try {
            const arr = JSON.parse(item.extra_fields)?.images;
            if (Array.isArray(arr)) return arr.filter(s => typeof s === 'string');
        } catch {}
        return [];
    }

    function itemPrice(item: { extra_fields: string }): number {
        try {
            const p = JSON.parse(item.extra_fields)?.price;
            const n = typeof p === 'number' ? p : parseInt(String(p ?? '0'), 10);
            return Number.isFinite(n) && n > 0 ? n : 0;
        } catch { return 0; }
    }

    function itemImage(item: { label: string; description: string; extra_fields: string }): string {
        const list = itemImages(item);
        if (list.length > 0) return list[0];
        const own = getField(item.extra_fields, 'image');
        if (own) return own;
        const cat = categoryByKey(itemCategory(item));
        return cat?.image ?? '';
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
            case 'כחדש':           return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            case 'משומש':          return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
            case 'דורש תיקון קל':  return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            default:               return 'bg-white/10 text-gray-300 border-white/10';
        }
    }

    let filtered = $derived.by(() => {
        let list = [...data.items];
        if (categoryFilter !== 'all') {
            list = list.filter(i => itemCategory(i) === categoryFilter);
        }
        if (priceFilter === 'free') {
            list = list.filter(i => itemPrice(i) === 0);
        } else if (priceFilter === 'symbolic') {
            list = list.filter(i => itemPrice(i) > 0);
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

    // Pagination — only applies to the flat (non-search) view, so the grouped tiers stay intact.
    const PAGE_SIZE = 12;
    let currentPage = $state(1);

    // Reset to page 1 whenever the active filter set changes.
    $effect(() => {
        categoryFilter; priceFilter; sortBy; debouncedSearch;
        currentPage = 1;
    });

    let totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
    let pagedItems = $derived(filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

    function goToPage(p: number) {
        const next = Math.min(Math.max(1, p), totalPages);
        if (next === currentPage) return;
        currentPage = next;
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Counts per category for filter chip badges
    let categoryCounts = $derived.by(() => {
        const counts: Record<string, number> = { all: data.items.length };
        for (const i of data.items) {
            const c = itemCategory(i);
            counts[c] = (counts[c] || 0) + 1;
        }
        return counts;
    });

    const sortOptions: { key: SortOption; label: string; icon: string }[] = [
        { key: 'newest',  label: 'החדשים ביותר', icon: '🆕' },
        { key: 'oldest',  label: 'הישנים ביותר', icon: '📅' },
        { key: 'popular', label: 'פופולריים',    icon: '🔥' },
    ];

    let currentSortLabel = $derived(sortOptions.find(o => o.key === sortBy)?.label ?? '');

    // Location-aware grouping — only when the user is searching for a specific product.
    // Tier 1 = my neighborhood; Tier 2 = my city (excluding my neighborhood); Tier 3 = rest of country (newest→oldest).
    let searching = $derived(debouncedSearch.length > 0);

    let groupNeighborhood = $derived.by(() => {
        if (!searching) return [] as typeof filtered;
        return filtered.filter(i => i.neighborhood === neighborhoodState.neighborhood);
    });

    let groupCity = $derived.by(() => {
        if (!searching) return [] as typeof filtered;
        return filtered.filter(i =>
            i.city === neighborhoodState.city &&
            i.neighborhood !== neighborhoodState.neighborhood
        );
    });

    let groupRest = $derived.by(() => {
        if (!searching) return [] as typeof filtered;
        const list = filtered.filter(i => i.city !== neighborhoodState.city);
        // The user explicitly asked: "rest of the country — newest down to oldest", regardless of the active sort.
        return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
</script>

<svelte:head>
    <title>למסירה | קהילה בשכונה</title>
    <meta name="description" content="פריטים למסירה חינם בקהילה — ספות, מוצרי חשמל, ספרים, בגדים ועוד" />
</svelte:head>

<svelte:window onclick={() => showSortMenu = false} />

<div class="min-h-screen bg-[#070b14] pb-28" dir="rtl">

    <!-- Hero + Categories share an extended orange tint that fades into the search bar -->
    <div class="relative bg-gradient-to-b from-orange-900/30 via-amber-900/20 to-transparent">
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
        <div class="absolute inset-0 opacity-20">
            <div class="absolute top-10 right-10 w-64 h-64 bg-orange-500 rounded-full blur-3xl"></div>
            <div class="absolute bottom-10 left-10 w-72 h-72 bg-amber-500 rounded-full blur-3xl"></div>
        </div>
        <div class="relative max-w-7xl mx-auto px-4 pt-2 pb-1 md:pt-4 md:pb-2">
            <a
                href="/"
                onclick={(e) => { if (typeof history !== 'undefined' && history.length > 1) { e.preventDefault(); history.back(); } }}
                aria-label="חזור אחורה"
                title="חזור אחורה"
                class="absolute top-3 start-3 md:top-5 md:start-5 z-10 inline-flex items-center gap-1.5 bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 text-gray-300 hover:text-white px-3 py-1.5 rounded-full text-xs md:text-sm font-bold backdrop-blur-sm transition-all"
            >
                <span aria-hidden="true">🏠</span>
                <span class="hidden sm:inline">חזור אחורה</span>
                <span aria-hidden="true">→</span>
            </a>
            <h1 class="sr-only">למסירה</h1>
            <!-- Banner image (cropped to top half) with overlaid action buttons -->
            <div class="relative w-[32rem] md:w-[40rem] max-w-full mx-auto">
                <div class="relative aspect-[1330/441] rounded-2xl overflow-hidden bg-gradient-to-br from-orange-900/20 to-amber-900/10">
                    <img
                        src="/images/delivery.png"
                        alt=""
                        width="1330"
                        height="882"
                        fetchpriority="high"
                        decoding="async"
                        class="absolute inset-0 w-full h-full object-cover object-top block"
                    />
                    <!-- Subtle darkening overlay -->
                    <div class="absolute inset-0 bg-black/30 pointer-events-none"></div>
                </div>
                <a
                    href="/giveaways/add"
                    class="absolute -start-2 md:-start-14 top-[40%] -translate-y-1/2 z-10 flex flex-col items-center justify-center gap-1 md:gap-2 bg-gradient-to-br from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold px-2.5 py-2 md:px-5 md:py-4 rounded-xl shadow-lg shadow-orange-500/50 ring-1 ring-orange-300/40 transition-all hover:scale-105 whitespace-nowrap text-xs md:text-base"
                >
                    <span class="text-base md:text-2xl leading-none">➕</span>
                    <span>פרסם פריט</span>
                </a>
                {#if data.currentUserId}
                    <a
                        href="/giveaways/my"
                        class="absolute -end-2 md:-end-14 top-[40%] -translate-y-1/2 z-10 flex flex-col items-center justify-center gap-1 md:gap-2 bg-black/55 backdrop-blur-md border border-orange-400/50 hover:bg-orange-500/40 text-orange-200 hover:text-white font-bold px-2.5 py-2 md:px-5 md:py-4 rounded-xl transition-all hover:scale-105 whitespace-nowrap shadow-lg text-xs md:text-base"
                    >
                        <span class="text-base md:text-2xl leading-none">👤</span>
                        <span>הפריטים שלי</span>
                    </a>
                {/if}
            </div>
        </div>
    </div>

    <!-- Categories Tiles (Yad2-style) -->
    <div class="relative max-w-7xl mx-auto px-4 pt-2">
        <!-- Featured "all" category as wide banner — heading on the right, button centered, count on the left -->
        {#each giveawayCategories.filter(c => c.key === 'all') as cat}
            {@const count = categoryCounts[cat.key] ?? 0}
            {@const active = categoryFilter === cat.key}
            <div class="relative z-20 -mt-5 md:-mt-7 flex items-center justify-center gap-3 mb-5">
                <h2 class="text-white font-black text-base md:text-lg flex items-center gap-2 whitespace-nowrap">
                    <span class="text-orange-400">▾</span>
                    קטגוריות
                </h2>
                <button
                    onclick={() => categoryFilter = cat.key}
                    class="relative group rounded-2xl overflow-hidden border-2 transition-all hover:scale-[1.01] hover:-translate-y-0.5 block w-2/5 sm:w-1/3 md:w-1/4 h-12 md:h-20 {active ? 'border-orange-400 shadow-xl shadow-orange-500/40 ring-2 ring-orange-400/50' : 'border-white/10 hover:border-orange-500/60 shadow-lg'}"
                    title={cat.label}
                >
                    <img
                        src={cat.image}
                        alt={cat.label}
                        loading="lazy"
                        class="absolute inset-0 w-full h-full object-cover object-[center_30%] scale-110 transition-transform duration-500 group-hover:scale-[1.15]"
                    />
                    <!-- Bottom-weighted dark gradient — מדגיש את הכיתוב בתחתית -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent {active ? 'from-orange-900/65 via-orange-900/20' : ''}"></div>

                    <!-- Label aligned to bottom of image -->
                    <div class="absolute inset-x-0 bottom-0 flex items-end justify-center px-3 pb-1 md:pb-1.5">
                        <span class="text-xs md:text-lg font-black text-white drop-shadow-lg leading-none">{cat.label}</span>
                    </div>

                </button>
                {#if count > 0}
                    <span class="text-sm md:text-base font-bold text-orange-200 whitespace-nowrap">{count} פריטים</span>
                {/if}
            </div>
        {/each}

        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-2 md:gap-3">
            {#each giveawayCategories.filter(c => c.key !== 'all') as cat}
                {@const count = categoryCounts[cat.key] ?? 0}
                {@const active = categoryFilter === cat.key}
                {@const borderTune: Record<string, { zoom: string; pos: string }> = {
                    electronics:   { zoom: 'scale-[1.22]', pos: 'object-center' },
                    tools:         { zoom: 'scale-[1.18]', pos: 'object-center' },
                    kitchen:       { zoom: 'scale-[1.20]', pos: 'object-[50%_55%]' },
                    judaica_books: { zoom: 'scale-[1.18]', pos: 'object-[50%_40%]' },
                    garden:        { zoom: 'scale-[1.16]', pos: 'object-center' },
                }}
                {@const tune = borderTune[cat.key] ?? { zoom: 'scale-110', pos: 'object-center' }}
                <button
                    onclick={() => categoryFilter = cat.key}
                    class="relative group rounded-2xl overflow-hidden border-2 transition-all hover:scale-[1.03] hover:-translate-y-0.5 aspect-square {active ? 'border-orange-400 shadow-xl shadow-orange-500/40 ring-2 ring-orange-400/50' : 'border-white/10 hover:border-orange-500/60 shadow-lg'}"
                    title={cat.label}
                >
                    <img
                        src={cat.image}
                        alt={cat.label}
                        loading="lazy"
                        class="absolute inset-0 w-full h-full object-cover {tune.pos} {tune.zoom} transition-transform duration-500 group-hover:scale-[1.18]"
                    />
                    <!-- Dark gradient overlay for readability -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0 {active ? 'from-orange-900/80 via-orange-900/30' : ''}"></div>

                    <!-- Label + count (count to the LEFT of the label in RTL) -->
                    <div class="absolute inset-x-0 bottom-0 p-1.5 md:p-2 flex items-baseline justify-start gap-1.5 min-w-0">
                        <span class="text-[10px] md:text-xs font-black text-white leading-tight truncate">
                            <span class="md:hidden">{cat.mobileLabel ?? cat.label}</span>
                            <span class="hidden md:inline">{cat.label}</span>
                        </span>
                        {#if count > 0}
                            <span class="text-[9px] md:text-[10px] text-orange-200 font-bold whitespace-nowrap">{count}</span>
                        {/if}
                    </div>

                </button>
            {/each}
        </div>
    </div>
    </div>

    <!-- Sticky Search & Filter Bar — single combined row -->
    <div class="sticky top-0 z-30 bg-[#070b14]/95 backdrop-blur-md border-b border-white/10 shadow-lg mt-4">
        <div class="max-w-7xl mx-auto px-4 py-3">
            <div class="flex items-center gap-1.5 md:gap-2">
                <!-- Search input (flex-1, shrinks) -->
                <div class="relative flex-1 min-w-0">
                    <input
                        type="search"
                        bind:value={search}
                        placeholder="מה מחפשים?"
                        aria-label="חיפוש פריטים"
                        dir="rtl"
                        class="w-full bg-white/5 border-2 border-white/10 rounded-full {search ? 'pe-9' : 'pe-3'} ps-3 py-2 text-white placeholder:text-gray-500 focus:border-orange-500 focus:bg-white/10 focus:outline-none transition-all text-sm md:text-base text-right"
                    />
                    {#if search}
                        <button
                            type="button"
                            onclick={() => { search = ''; debouncedSearch = ''; }}
                            aria-label="נקה חיפוש"
                            class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-lg bg-white/10 hover:bg-white/20 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        >×</button>
                    {/if}
                </div>

                <!-- Price filter chips -->
                <button
                    onclick={() => priceFilter = 'all'}
                    class="shrink-0 px-2.5 md:px-3 py-1.5 rounded-full text-[11px] md:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 border {priceFilter === 'all' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/40 border-transparent' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20'}"
                >
                    <span class="hidden md:inline">💰</span><span>הכל</span>
                </button>
                <button
                    onclick={() => priceFilter = 'free'}
                    class="shrink-0 px-2.5 md:px-3 py-1.5 rounded-full text-[11px] md:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 border {priceFilter === 'free' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/40 border-transparent' : 'bg-white/5 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40'}"
                >
                    <span class="hidden md:inline">💚</span><span>חינם</span>
                </button>
                <button
                    onclick={() => priceFilter = 'symbolic'}
                    class="shrink-0 px-2.5 md:px-3 py-1.5 rounded-full text-[11px] md:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 border {priceFilter === 'symbolic' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/40 border-transparent' : 'bg-white/5 text-amber-300 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40'}"
                >
                    <span class="hidden md:inline">🪙</span><span>סמלי</span>
                </button>

                <!-- Sort + view toggle -->
                <div class="flex items-center gap-1 shrink-0">
                    <!-- Sort dropdown -->
                    <div class="relative" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
                        <button
                            onclick={() => showSortMenu = !showSortMenu}
                            class="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-2.5 md:px-3 py-1.5 rounded-full text-[11px] md:text-sm font-bold transition-colors"
                            aria-label="מיון"
                        >
                            <span>↕️</span>
                            <span class="hidden lg:inline">{currentSortLabel}</span>
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
            {#if categoryFilter !== 'all' || priceFilter !== 'all' || debouncedSearch}
                <button
                    onclick={() => { categoryFilter = 'all'; priceFilter = 'all'; search = ''; debouncedSearch = ''; }}
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

        {:else}

        {#snippet listView(items: typeof filtered)}
            <div class="flex flex-col gap-3">
                {#each items as item (item.id)}
                    {@const img   = itemImage(item)}
                    {@const price = itemPrice(item)}
                    {@const isFav = favorites.has(String(item.id))}
                    <div class="group relative rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#0c1322] border border-white/10 overflow-hidden shadow-lg hover:shadow-2xl hover:border-orange-500/40 transition-all flex flex-row">
                        <a href="/items/{item.id}" class="flex flex-row flex-1 min-w-0">
                            <div class="w-32 md:w-44 shrink-0 aspect-square relative overflow-hidden bg-[#0a0f1a]">
                                <img
                                    src={img}
                                    alt={item.label}
                                    loading="lazy"
                                    class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                {#if price > 0}
                                    <span class="absolute bottom-2 start-2 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500 text-white shadow-lg">₪{price}</span>
                                {:else}
                                    <span class="absolute bottom-2 start-2 px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500 text-white shadow-lg">חינם</span>
                                {/if}
                            </div>
                            <div class="flex-1 p-3 md:p-4 flex items-center min-w-0">
                                <h3 class="text-white font-bold text-base md:text-lg line-clamp-2 group-hover:text-orange-300 transition-colors pe-10">{item.label}</h3>
                            </div>
                        </a>
                        <button
                            type="button"
                            onclick={(e) => toggleFavorite(item, e)}
                            aria-label={isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                            class="absolute top-2 end-2 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-lg transition-all {isFav ? 'text-rose-400' : 'text-gray-400 hover:text-rose-300'}"
                        >{isFav ? '❤️' : '🤍'}</button>
                    </div>
                {/each}
            </div>
        {/snippet}

        {#snippet gridView(items: typeof filtered)}
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {#each items as item (item.id)}
                    {@const img   = itemImage(item)}
                    {@const price = itemPrice(item)}
                    {@const isFav = favorites.has(String(item.id))}
                    <div class="group relative rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#0c1322] border border-white/10 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 hover:border-orange-500/40 transition-all hover:-translate-y-1 flex flex-col">
                        <a href="/items/{item.id}" class="flex flex-col flex-1">
                            <div class="aspect-square relative overflow-hidden bg-[#0a0f1a]">
                                <img
                                    src={img}
                                    alt={item.label}
                                    loading="lazy"
                                    class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                {#if price > 0}
                                    <span class="absolute bottom-2 start-2 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500 text-white shadow-lg shadow-amber-500/40">₪{price}</span>
                                {:else}
                                    <span class="absolute bottom-2 start-2 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">חינם</span>
                                {/if}
                            </div>
                            <div class="p-2.5 md:p-3">
                                <h3 class="text-white font-bold text-sm md:text-base line-clamp-2 group-hover:text-orange-300 transition-colors leading-tight">{item.label}</h3>
                            </div>
                        </a>
                        <button
                            type="button"
                            onclick={(e) => toggleFavorite(item, e)}
                            aria-label={isFav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                            class="absolute top-2 end-2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm hover:bg-black/60 text-base transition-all {isFav ? 'text-rose-400 scale-110' : 'text-white/80 hover:text-rose-300'}"
                        >{isFav ? '❤️' : '🤍'}</button>
                    </div>
                {/each}
            </div>
        {/snippet}

        {#snippet sectionHeader(icon: string, title: string, count: number, accent: string)}
            <div class="flex items-center gap-2 mb-3 mt-2">
                <span class="text-xl">{icon}</span>
                <h3 class="text-white font-black text-base md:text-lg">{title}</h3>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full {accent}">{count}</span>
            </div>
        {/snippet}

        {#if searching}
            <!-- Tier 1: my neighborhood -->
            {#if groupNeighborhood.length > 0}
                <section class="mb-4">
                    {@render sectionHeader('🏘️', `השכונה שלי — ${neighborhoodState.neighborhood}`, groupNeighborhood.length, 'bg-orange-500/20 text-orange-300 border border-orange-500/40')}
                    {#if viewMode === 'list'}{@render listView(groupNeighborhood)}{:else}{@render gridView(groupNeighborhood)}{/if}
                </section>
                {#if groupCity.length > 0 || groupRest.length > 0}
                    <hr class="border-0 border-t-2 border-dashed border-orange-500/30 my-6" />
                {/if}
            {/if}

            <!-- Tier 2: my city (excluding neighborhood) -->
            {#if groupCity.length > 0}
                <section class="mb-4">
                    {@render sectionHeader('🏙️', `בעיר שלי — ${neighborhoodState.city}`, groupCity.length, 'bg-blue-500/20 text-blue-300 border border-blue-500/40')}
                    {#if viewMode === 'list'}{@render listView(groupCity)}{:else}{@render gridView(groupCity)}{/if}
                </section>
                {#if groupRest.length > 0}
                    <hr class="border-0 border-t-2 border-dashed border-blue-500/30 my-6" />
                {/if}
            {/if}

            <!-- Tier 3: rest of country (newest → oldest) -->
            {#if groupRest.length > 0}
                <section class="mb-4">
                    {@render sectionHeader('🇮🇱', 'מכל הארץ — מהחדש לישן', groupRest.length, 'bg-white/10 text-gray-300 border border-white/20')}
                    {#if viewMode === 'list'}{@render listView(groupRest)}{:else}{@render gridView(groupRest)}{/if}
                </section>
            {/if}
        {:else if viewMode === 'list'}
            {@render listView(pagedItems)}
        {:else}
            {@render gridView(pagedItems)}
        {/if}

        {/if}

        <!-- Pagination — shows only on the flat (non-search) view when there's more than one page -->
        {#if !searching && totalPages > 1}
            <nav aria-label="ניווט בין דפים" class="mt-8 flex flex-col items-center gap-3">
                <p class="text-gray-300 text-sm md:text-base">
                    עמוד <span class="text-orange-300 font-black">{currentPage}</span>
                    מתוך <span class="text-white font-black">{totalPages}</span>
                </p>
                <div class="flex items-center gap-2 flex-wrap justify-center">
                    <button
                        onclick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-orange-500/20 hover:border-orange-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="הדף הקודם"
                    >→ הקודם</button>

                    {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
                        <button
                            onclick={() => goToPage(p)}
                            aria-current={p === currentPage ? 'page' : undefined}
                            class="min-w-[2rem] px-2.5 py-1.5 rounded-full text-sm font-black transition-all border {p === currentPage ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-lg shadow-orange-500/40' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-orange-500/40'}"
                        >{p}</button>
                    {/each}

                    <button
                        onclick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-orange-500/20 hover:border-orange-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="הדף הבא"
                    >הבא ←</button>
                </div>
            </nav>
        {/if}

        <div class="text-center mt-10 mb-4">
            {#if !searching && totalPages > 1}
                <p class="text-gray-500 text-xs mb-2">עמוד {currentPage} מתוך {totalPages}</p>
            {/if}
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
