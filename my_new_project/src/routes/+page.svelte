<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";
    import JerusalemMap from "$lib/components/JerusalemMap.svelte";
    import NewsTicker from "$lib/components/NewsTicker.svelte";
    import LostAndFound from "$lib/components/LostAndFound.svelte";
    import FacebookComments from "$lib/components/FacebookComments.svelte";
    import CoaliEmbed from "$lib/components/CoaliEmbed.svelte";
    import ReferendumBanner from "$lib/components/ReferendumBanner.svelte";
    import { triggerAdPopup } from "$lib/adPopupStore";
    import { ads } from "$lib/adsData";

    import { citiesAndNeighborhoods, citiesData } from "$lib/neighborhoodsData";
    import { neighborhoodState } from "$lib/neighborhoodState.svelte";
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let showNeighborhoodsMenu = $state(false);
    let searchQuery = $state('');

    // CoaliEmbed מוצג רק לקרית משה בירושלים; לכל השאר — ReferendumBanner (דוגמא)
    const showCoali = $derived(
        neighborhoodState.neighborhood === "קרית משה" &&
        neighborhoodState.city === "ירושלים"
    );

    // איחוד כל הערים — אם עיר מופיעה פעמיים בנתונים, נאחד את השכונות שלה (ללא כפילויות)
    const allCitiesMerged = (() => {
        const map = new Map<string, string[]>();
        for (const entry of citiesData) {
            const existing = map.get(entry.city) ?? [];
            const combined = [...existing, ...entry.neighborhoods];
            // הסר כפילויות תוך שמירה על סדר
            const unique = Array.from(new Set(combined));
            map.set(entry.city, unique);
        }
        // מיון אלפביתי בעברית
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'he'));
    })();

    // חיפוש ערים לפי query
    const filteredCities = $derived.by(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return allCitiesMerged;
        return allCitiesMerged.filter(([city]) =>
            city.toLowerCase().includes(q)
        );
    });

    // ספירת ערים ושכונות לתצוגה ב-placeholder
    const totalCities = allCitiesMerged.length;
    const totalNeighborhoods = allCitiesMerged.reduce((sum, [, n]) => sum + n.length, 0);

    onMount(() => {
        // אתחל עם נתוני פרופיל מהשרת (או localStorage כ-fallback)
        neighborhoodState.init(data.userNeighborhood, data.userCity);
    });

    function handleToggleMenu() {
        showNeighborhoodsMenu = !showNeighborhoodsMenu;
    }

    function selectNeighborhood(neighborhood: string, city: string) {
        neighborhoodState.select(neighborhood, city);
        showNeighborhoodsMenu = false;
        searchQuery = '';
    }

    function closeMenu() {
        showNeighborhoodsMenu = false;
        searchQuery = '';
    }

    // --- Calendar sync (ICS + Google Calendar) ---
    interface CalEvent {
        title: string;
        location: string;
        date: string;      // e.g. '2026-03-15'
        startTime: string;  // e.g. '20:00'
        endTime: string;    // e.g. '21:30'
        description?: string;
    }

    type EventCard = CalEvent & { bgColor: string; textColor: string; subColor: string };

    // מיפוי צבע → קלאסים (Tailwind safelist-friendly)
    const COLOR_MAP: Record<string, { bg: string; text: string; sub: string }> = {
        green:  { bg: 'bg-green-600/20',  text: 'text-green-400',  sub: 'text-green-300/70'  },
        blue:   { bg: 'bg-blue-600/20',   text: 'text-blue-400',   sub: 'text-blue-300/70'   },
        purple: { bg: 'bg-purple-600/20', text: 'text-purple-400', sub: 'text-purple-300/70' },
        orange: { bg: 'bg-orange-600/20', text: 'text-orange-400', sub: 'text-orange-300/70' },
        pink:   { bg: 'bg-pink-600/20',   text: 'text-pink-400',   sub: 'text-pink-300/70'   },
        red:    { bg: 'bg-red-600/20',    text: 'text-red-400',    sub: 'text-red-300/70'    },
        yellow: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', sub: 'text-yellow-300/70' },
        teal:   { bg: 'bg-teal-600/20',   text: 'text-teal-400',   sub: 'text-teal-300/70'   },
    };

    function addOneHour(time: string): string {
        const m = /^(\d{1,2}):(\d{2})/.exec(time);
        if (!m) return time;
        let h = parseInt(m[1], 10) + 1;
        if (h >= 24) h = 23;
        return `${String(h).padStart(2, '0')}:${m[2]}`;
    }

    // רק אירועים עתידיים, ממופים לפורמט ה־UI
    const todayIso = new Date().toISOString().split('T')[0];
    const events: EventCard[] = $derived(
        (data.events ?? [])
            .filter(ev => ev.date >= todayIso)
            .slice(0, 4)
            .map(ev => {
                const c = COLOR_MAP[ev.color] ?? COLOR_MAP.blue;
                const startTime = ev.time || '00:00';
                const titleWithIcon = ev.title.match(/^\p{Emoji}/u) ? ev.title : `${ev.icon || '📅'} ${ev.title}`;
                return {
                    title:     titleWithIcon,
                    location:  ev.location,
                    date:      ev.date,
                    startTime,
                    endTime:   addOneHour(startTime),
                    bgColor:   c.bg,
                    textColor: c.text,
                    subColor:  c.sub,
                };
            })
    );

    let calMenuOpen = $state<number | null>(null);


    function toICSDate(date: string, time: string): string {
        return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
    }

    function downloadICS(ev: CalEvent) {
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//קהילה בשכונה//Events//HE',
            'BEGIN:VEVENT',
            `DTSTART:${toICSDate(ev.date, ev.startTime)}`,
            `DTEND:${toICSDate(ev.date, ev.endTime)}`,
            `SUMMARY:${ev.title}`,
            `LOCATION:${ev.location}`,
            `DESCRIPTION:אירוע קהילתי מ"קהילה בשכונה"`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ev.title.replace(/[^\w\u0590-\u05FF ]/g, '')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        calMenuOpen = null;
    }

    function openGoogleCalendar(ev: CalEvent) {
        const start = toICSDate(ev.date, ev.startTime);
        const end = toICSDate(ev.date, ev.endTime);
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${start}/${end}&location=${encodeURIComponent(ev.location)}&details=${encodeURIComponent('אירוע קהילתי מ"קהילה בשכונה"')}`;
        window.open(url, '_blank');
        calMenuOpen = null;
    }

    function handleCalClick(index: number, e: MouseEvent) {
        e.stopPropagation();
        calMenuOpen = calMenuOpen === index ? null : index;
    }
</script>

<svelte:head>
    <title>קהילה בשכונה</title>
</svelte:head>

<div class="pb-0 md:pb-8 pt-4 md:pt-8" onclick={() => calMenuOpen = null}>
    <!-- Title Section - centered across full width -->
    <section class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-8 relative neighborhoods-menu-container">
            <!-- Mobile: title with button on left side -->
            <div class="md:hidden mb-2">
                <div class="relative group text-center mb-1 w-full">
                    <h2
                        class="text-[2.2rem] md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default leading-tight w-full"
                    >
                        יתרונות שכונת {neighborhoodState.neighborhood}
                    </h2>
                </div>
                <div class="relative flex items-center w-full">
                    <div class="absolute left-0 z-50">
                        <button
                            onclick={handleToggleMenu}
                            class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-md font-bold text-xs shadow-lg transition-all hover:scale-105 whitespace-nowrap relative z-50 pointer-events-auto"
                        >
                            🏘️ כל השכונות
                        </button>
                    </div>
                    <div
                        class="relative group w-full text-center pointer-events-none"
                    >
                        <h2
                            class="text-[2.2rem] md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default leading-tight"
                        >
                            {neighborhoodState.city}
                        </h2>
                    </div>
                </div>
            </div>

            <!-- Desktop: original layout -->
            <div class="hidden md:flex items-center justify-center gap-4">
                <div class="relative group">
                    <h2
                        class="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default"
                    >
                        יתרונות שכונת {neighborhoodState.neighborhood}, {neighborhoodState.city}
                    </h2>
                    <!-- Tooltip -->
                    <div
                        class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-[9999] pointer-events-none"
                    >
                        <div
                            class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-xl whitespace-nowrap"
                        >
                            גלה את כל מה שהשכונה שלך מציעה
                            <div
                                class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"
                            ></div>
                        </div>
                    </div>
                </div>
                <button
                    onclick={handleToggleMenu}
                    class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all hover:scale-105"
                >
                    🏘️ לכלל השכונות
                </button>
            </div>

            <!-- Neighborhoods Menu -->
            {#if showNeighborhoodsMenu}
                <!-- Backdrop -->
                <div
                    class="fixed inset-0 bg-black/50 z-[9998]"
                    role="presentation"
                    onclick={closeMenu}
                ></div>

                <!-- Menu -->
                <div
                    class="fixed md:absolute top-20 md:top-full left-1/2 transform -translate-x-1/2 mt-0 md:mt-4 bg-gray-900 rounded-xl shadow-2xl p-3 md:p-4 z-[9999] max-w-5xl w-[95vw] md:w-full max-h-[80vh] overflow-y-auto"
                >
                    <!-- Header עם חיפוש (קפוא בראש התפריט) -->
                    <div class="sticky top-0 z-10 -mx-3 md:-mx-4 -mt-3 md:-mt-4 px-3 md:px-4 pt-3 md:pt-4 pb-2 mb-3 bg-gray-900 border-b border-purple-500/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <h3 class="text-white text-base md:text-lg font-bold whitespace-nowrap text-center sm:text-right">
                            🏘️ בחר עיר ושכונה
                        </h3>
                        <!-- חיפוש + סגור — תמיד באותה שורה -->
                        <div class="flex flex-row items-center gap-2 flex-1">
                            <div class="relative flex-1">
                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm pointer-events-none">🔎</span>
                                <input
                                    type="text"
                                    placeholder={`חיפוש עיר... (${totalCities} ערים, ${totalNeighborhoods} שכונות)`}
                                    bind:value={searchQuery}
                                    class="w-full bg-gray-800 border border-purple-500/40 text-white rounded-lg pr-9 pl-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                />
                            </div>
                            <button
                                onclick={closeMenu}
                                class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap shrink-0"
                                aria-label="סגור"
                            >
                                ✕ סגור
                            </button>
                        </div>
                    </div>

                    {#if filteredCities.length === 0}
                        <div class="text-center text-gray-400 py-6 text-sm">
                            לא נמצאו ערים תואמות "{searchQuery}"
                        </div>
                    {:else}
                        <div class="cities-masonry">
                            {#each filteredCities as [city, neighborhoods]}
                                <div class="city-card bg-gray-800/70 rounded-lg p-2 border border-purple-500/10 mb-2">
                                    <h4 class="text-purple-400 font-bold mb-1.5 text-xs md:text-sm border-b border-purple-500/20 pb-1">
                                        {city}
                                    </h4>
                                    <div class="flex flex-wrap gap-1">
                                        {#each neighborhoods as neighborhood}
                                            <button
                                                onclick={() => selectNeighborhood(neighborhood, city)}
                                                class="text-white text-[11px] md:text-xs bg-gray-700/50 hover:bg-purple-600 px-2 py-0.5 rounded transition-colors"
                                            >
                                                {neighborhood}
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </section>

    <!-- News Ticker - under title -->
    <div class="max-w-7xl mx-auto px-4 -mt-4 mb-4">
        <NewsTicker />
    </div>

    <!-- Map + Referendum + Sidebar (unified desktop layout) -->
    <section class="max-w-7xl mx-auto px-4 mt-4">
        <!-- Desktop: left column (map+referendum) + right column (3 boards) -->
        <div class="hidden lg:flex gap-4">
            <!-- Left column (3/4): Map on top, Referendum below -->
            <div class="lg:w-3/4 flex flex-col gap-3">
                <div>
                    <JerusalemMap bind:showNeighborhoodsMenu dbItems={data.dbItems} />
                </div>
                {#if showCoali}
                    <CoaliEmbed />
                {:else}
                    <ReferendumBanner />
                {/if}
            </div>

            <!-- Right column (1/4): boards constrained to left column height -->
            <div class="lg:w-1/4 relative">
                <div class="absolute top-0 right-0 left-0 bottom-0 flex flex-col gap-2 overflow-hidden">
                    <!-- 1. Events Board -->
                    <div class="flex-1 min-h-0 rounded-2xl bg-[#0f172a] border border-2 border-green-500/30 shadow-2xl flex flex-col overflow-hidden">
                    <div class="bg-gradient-to-r from-green-600 to-teal-600 p-3 flex items-center justify-between flex-shrink-0 relative">
                        <a href="/events" class="absolute inset-0 z-0" aria-hidden="true"></a>
                        <a href="/events" class="text-sm font-bold text-white flex items-center gap-2 hover:text-yellow-200 transition-colors relative z-10">
                            <span class="text-base">🗓️</span>
                            לוח אירועים
                        </a>
                        <a href="/events#add" class="inline-flex items-center bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors border border-white/20 relative z-10">
                            + הוסף
                        </a>
                    </div>
                    <div class="p-3 flex-1 overflow-hidden flex flex-col justify-evenly relative">
                        {#if events.length === 0}
                            <div class="flex-1 flex items-center justify-center text-center px-2">
                                <p class="text-gray-400 text-xs">אין אירועים קרובים<br/><a href="/events#add" class="text-yellow-400 hover:text-white underline">הצע אירוע</a></p>
                            </div>
                        {/if}
                        {#each events as ev, i}
                            {@const day = ev.date.split('-')[2]}
                            {@const months = ['', 'ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']}
                            {@const month = months[parseInt(ev.date.split('-')[1])]}
                            <div class="relative flex gap-3 items-center bg-white/5 rounded-xl p-3 border border-white/8 cursor-pointer hover:bg-white/10 transition-all group">
                                <button
                                    onclick={(e) => handleCalClick(i, e)}
                                    class="flex flex-col items-center {ev.bgColor} rounded-lg px-2 py-1.5 min-w-[44px] text-center flex-shrink-0 active:opacity-70 transition-opacity"
                                    title="הוסף ליומן"
                                >
                                    <span class="{ev.textColor} font-bold text-base leading-none">{day}</span>
                                    <span class="{ev.subColor} text-[10px] leading-none mt-0.5">{month}</span>
                                    <svg class="w-3.5 h-3.5 mt-1 {ev.textColor} opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                </button>
                                <div class="min-w-0 flex-1">
                                    <p class="text-white text-sm font-bold leading-tight">{ev.title}</p>
                                    <p class="text-gray-400 text-xs mt-0.5">{ev.location}, {ev.startTime}</p>
                                </div>
                                <!-- Calendar dropdown -->
                                {#if calMenuOpen === i}
                                    <div class="absolute left-0 top-full mt-1 z-50 bg-[#1e293b] border border-white/20 rounded-xl shadow-2xl p-2 flex flex-col gap-1 min-w-[180px]">
                                        <button onclick={() => openGoogleCalendar(ev)} class="flex items-center gap-2 text-xs text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors text-right w-full">
                                            <span class="text-base">📅</span> Google Calendar
                                        </button>
                                        <button onclick={() => downloadICS(ev)} class="flex items-center gap-2 text-xs text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors text-right w-full">
                                            <span class="text-base">📲</span> Apple / Outlook (.ics)
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                        <!-- fade-out overlay -->
                        <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-20 rounded-b-xl" style="background: linear-gradient(to bottom, transparent, #0f172a 90%);"></div>
                    </div>
                    <div class="px-3 pb-2 flex-shrink-0">
                        <a href="/events" class="block text-center text-yellow-400 hover:text-white text-xs font-bold transition-colors underline underline-offset-2 py-1">
                            לכל האירועים...
                        </a>
                    </div>
                    </div>

                <!-- 2. Lost and Found -->
                <div class="flex-1 min-h-0 overflow-hidden">
                    <LostAndFound items={data.dbItems.filter(i => i.category === 'lost_and_found')} />
                </div>

                <!-- 3. Community Feed -->
                <div class="flex-1 min-h-0 rounded-2xl bg-[#0f172a] border border-2 border-amber-500/30 overflow-hidden shadow-2xl flex flex-col">
                    <div class="bg-gradient-to-r from-amber-600 to-orange-600 p-3 flex items-center justify-between flex-shrink-0">
                        <h3 class="text-sm font-bold text-white flex items-center gap-2">
                            <span class="text-base">📢</span>
                            הלוחות הארציים
                        </h3>
                        <span class="text-[10px] text-amber-200/70 font-bold">LIVE</span>
                    </div>
                    <div class="p-2 flex-1 overflow-hidden flex flex-col justify-evenly text-xs">
                        <a href="/singles" class="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/8 hover:bg-white/10 transition-all">
                            <span class="flex-shrink-0 text-base">💑</span>
                            <p class="text-white font-bold">לוח פנויים פנויות</p>
                        </a>
                        <a href="/lost-and-found" class="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/8 hover:bg-white/10 transition-all">
                            <span class="flex-shrink-0 text-base">🔍</span>
                            <p class="text-white font-bold">לוח אבדות ומציאות</p>
                        </a>
                        <a href="/rides" class="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/8 hover:bg-white/10 transition-all">
                            <span class="flex-shrink-0 text-base">🚗</span>
                            <p class="text-white font-bold">לוח טרמפים</p>
                        </a>
                        <a href="/events" class="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/8 hover:bg-white/10 transition-all">
                            <span class="flex-shrink-0 text-base">🗓️</span>
                            <p class="text-white font-bold">לוח אירועים</p>
                        </a>
                        <a href="https://national-gemach.vercel.app" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/8 hover:bg-white/10 transition-all">
                            <span class="flex-shrink-0 text-base">🤝</span>
                            <p class="text-white font-bold">לוח גמ"חים <span class="text-amber-300/70 text-[10px] font-normal">(אתר ארצי ↗)</span></p>
                        </a>
                        <a href="/jobs" class="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/8 hover:bg-white/10 transition-all">
                            <span class="flex-shrink-0 text-base">💼</span>
                            <p class="text-white font-bold">לוח דורשים לעבודה</p>
                        </a>
                        <a href="/giveaways" class="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/8 hover:bg-white/10 transition-all">
                            <span class="flex-shrink-0 text-base">📦</span>
                            <p class="text-white font-bold">לוח למסירה</p>
                        </a>
                        <a href="https://index-chi-sage.vercel.app/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/8 hover:bg-white/10 transition-all">
                            <span class="flex-shrink-0 text-base">👨‍💼</span>
                            <p class="text-white font-bold">בעלי מקצוע כשירים <span class="text-amber-300/70 text-[10px] font-normal">(אתר חיצוני ↗)</span></p>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        </div>

        <!-- Mobile: Map, then Events+LostAndFound side by side, then Referendum -->
        <div class="lg:hidden flex flex-col gap-4">
            <JerusalemMap bind:showNeighborhoodsMenu dbItems={data.dbItems} />
            <div class="grid grid-cols-2 gap-2">
                <!-- Left: Events Board -->
                <div class="rounded-2xl bg-[#0f172a] border border-blue-500/30 overflow-hidden shadow-2xl flex flex-col h-full">
                    <div class="bg-gradient-to-r from-green-600 to-teal-600 p-2 flex items-center justify-between flex-shrink-0 h-12 relative">
                        <a href="/events" class="absolute inset-0 z-0" aria-hidden="true"></a>
                        <a href="/events" class="text-sm font-bold text-white flex items-center gap-1 hover:text-yellow-200 transition-colors relative z-10">
                            <span class="text-base">🗓️</span>
                            לוח אירועים
                        </a>
                        <a href="/events#add" class="inline-flex items-center self-center bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-2 py-1 rounded-full transition-colors border border-white/20 flex-shrink-0 relative z-10">
                            + הוסף
                        </a>
                    </div>
                    <div class="p-1.5 overflow-hidden flex flex-col gap-1 relative flex-1 min-h-0">
                        {#if events.length === 0}
                            <div class="flex-1 flex items-center justify-center text-center px-1">
                                <p class="text-gray-400 text-[10px]">אין אירועים<br/><a href="/events#add" class="text-yellow-400 underline">הצע אירוע</a></p>
                            </div>
                        {/if}
                        {#each events as ev, i}
                            {@const day = ev.date.split('-')[2]}
                            {@const months = ['', 'ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']}
                            {@const month = months[parseInt(ev.date.split('-')[1])]}
                            <div class="relative flex gap-1.5 items-center bg-white/5 rounded-lg p-1.5 border border-white/8 cursor-pointer">
                                <!-- Date + cal button stacked on left -->
                                <button
                                    onclick={(e) => handleCalClick(100 + i, e)}
                                    class="flex flex-col items-center {ev.bgColor} rounded-md px-1 py-1 min-w-[32px] text-center flex-shrink-0 active:opacity-70 transition-opacity"
                                    title="הוסף ליומן"
                                >
                                    <span class="{ev.textColor} font-bold text-xs leading-none">{day}</span>
                                    <span class="{ev.subColor} text-[8px] leading-none">{month}</span>
                                    <svg class="w-2.5 h-2.5 mt-0.5 {ev.textColor} opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                </button>
                                <!-- Text: full width -->
                                <div class="min-w-0 flex-1">
                                    <p class="text-white text-[11px] font-bold leading-tight truncate">{ev.title}</p>
                                    <p class="text-gray-400 text-[9px] truncate">{ev.location}, {ev.startTime}</p>
                                </div>
                                {#if calMenuOpen === 100 + i}
                                    <div class="absolute left-0 top-full mt-1 z-50 bg-[#1e293b] border border-white/20 rounded-xl shadow-2xl p-2 flex flex-col gap-1 min-w-[160px]">
                                        <button onclick={() => openGoogleCalendar(ev)} class="flex items-center gap-2 text-xs text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors text-right w-full">
                                            <span>📅</span> Google Calendar
                                        </button>
                                        <button onclick={() => downloadICS(ev)} class="flex items-center gap-2 text-xs text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors text-right w-full">
                                            <span>📲</span> Apple / Outlook
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                        <!-- fade-out overlay on last event -->
                        <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-12 rounded-b-lg" style="background: linear-gradient(to bottom, transparent, #0f172a 90%);"></div>
                    </div>
                    <a href="/events" class="block text-center text-yellow-400 hover:text-white text-[10px] font-bold transition-colors underline underline-offset-2 py-1.5 flex-shrink-0">
                        לכל האירועים...
                    </a>
                </div>
                <!-- Right: Lost and Found -->
                <div class="h-full">
                    <LostAndFound items={data.dbItems.filter(i => i.category === 'lost_and_found')} />
                </div>
            </div>
            {#if showCoali}
                <CoaliEmbed />
            {:else}
                <ReferendumBanner />
            {/if}
        </div>
    </section>

    <!-- Facebook Comments Section -->
    <section class="max-w-6xl mx-auto px-4 mt-6 mb-8">
        <div
            class="rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 backdrop-blur-sm p-3 md:p-6"
            title="שאל שאלה, הבע דעתך והצטרף לשיח בשכונה"
        >
            <h3
                class="text-lg md:text-2xl font-bold text-white mb-3 md:mb-6 text-center flex items-center justify-center gap-2"
            >
                <svg
                    class="w-5 h-5 md:w-8 md:h-8 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                    />
                </svg>
                שיח פתוח
            </h3>
            <FacebookComments numPosts={10} />
        </div>
    </section>

    <!-- Emergency Team Banner -->
    <section class="max-w-6xl mx-auto px-4 mt-6 md:mt-0">
        <!-- Desktop: 3 columns, Mobile: horizontal scroll -->
        <div class="hidden md:grid md:grid-cols-3 gap-6">
            <!-- כותל המשאלות -->
            <a
                href="/community-fund"
                class="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col cursor-pointer"
            >
                <!-- Background image -->
                <div
                    class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                    style="background-image: url('/images/2.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300 group-hover:scale-110"
                ></div>
                <div
                    class="relative z-10 p-6 transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="text-4xl mb-2 block transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"
                            >🙏</span
                        >
                        <h3
                            class="text-xl font-black mb-2 transition-all duration-300 group-hover:text-yellow-200"
                        >
                            <span class="group-hover:hidden">כותל המשאלות</span>
                            <span class="hidden group-hover:inline"
                                >עניי עירך קודמין</span
                            >
                        </h3>
                        <div
                            class="bg-blue-600/50 hover:bg-blue-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full group-hover:scale-105 group-hover:shadow-lg text-center mt-auto"
                        >
                            וקופת השכונה
                        </div>
                    </div>
                </div>
            </a>

            <!-- פנה לוועד השכונה -->
            <div
                class="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col"
            >
                <!-- Background image -->
                <div
                    class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                    style="background-image: url('/images/vaad-shchuna.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300 group-hover:scale-110"
                ></div>
                <div
                    class="relative z-10 p-6 transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="text-4xl mb-2 block transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"
                            >🏛️</span
                        >
                        <h3
                            class="text-xl font-black mb-2 transition-all duration-300 group-hover:text-yellow-200"
                        >
                            ועד השכונה
                        </h3>
                        <p
                            class="text-sm mb-4 text-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-grow"
                        >
                            יש לך הצעה? רוצה לשפר את השכונה?
                        </p>
                        <button
                            class="bg-purple-600/50 hover:bg-purple-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full group-hover:scale-105 group-hover:shadow-xl mt-auto"
                        >
                            פנה לועד השכונה
                        </button>
                    </div>
                </div>
            </div>

            <!-- כיתת כוננות -->
            <a
                href="/emergency-team"
                class="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col cursor-pointer"
            >
                <!-- Background image -->
                <div
                    class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                    style="background-image: url('/images/konanut.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300 group-hover:scale-110"
                ></div>
                <div
                    class="relative z-10 p-6 transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="text-4xl mb-2 block transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"
                            >🚨</span
                        >
                        <h3
                            class="text-xl font-black mb-2 transition-all duration-300 group-hover:text-yellow-200"
                        >
                            <span class="group-hover:hidden">כיתת כוננות</span>
                            <span class="hidden group-hover:inline"
                                >חזק את ביטחון השכונה</span
                            >
                        </h3>
                        <p
                            class="text-xs mb-3 text-yellow-100 transition-colors duration-300 group-hover:text-white group-hover:font-bold"
                        >
                            <span class="font-bold">{data.emergencyTeamCount}</span> חברים פעילים
                        </p>
                        <div
                            class="bg-red-600/50 group-hover:bg-red-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full group-hover:scale-105 group-hover:shadow-xl mt-auto text-center"
                        >
                            הצטרף עכשיו
                        </div>
                    </div>
                </div>
            </a>
        </div>

        <!-- Mobile: 3 cards in one row, equal width -->
        <div class="md:hidden">
            <div class="grid grid-cols-3 gap-2 h-28">
                <!-- כותל המשאלות - Mobile -->
                <a
                    href="/community-fund"
                    class="relative overflow-hidden rounded-lg h-full block cursor-pointer"
                >
                    <!-- Background image -->
                    <div
                        class="absolute inset-0 bg-cover bg-center"
                        style="background-image: url('/images/2.png');"
                    ></div>
                    <!-- Dark gradient overlay -->
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30"
                    ></div>
                    <div class="relative z-10 p-2 h-full flex flex-col justify-between">
                        <div class="text-center text-white">
                            <span class="text-xl mb-1 block">🙏</span>
                            <h3 class="text-xs font-black leading-tight">כותל המשאלות</h3>
                        </div>
                        <div
                            class="bg-blue-600/50 text-white px-1 py-1 rounded text-[10px] font-bold text-center w-full"
                        >
                            וקופת השכונה
                        </div>
                    </div>
                </a>

                <!-- פנה לוועד השכונה - Mobile -->
                <div class="relative overflow-hidden rounded-lg h-full">
                    <!-- Background image -->
                    <div
                        class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                        style="background-image: url('/images/vaad-shchuna.png');"
                    ></div>
                    <!-- Dark gradient overlay -->
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300 group-hover:scale-110"
                    ></div>
                    <div class="relative z-10 p-2 h-full flex flex-col justify-between">
                        <div class="text-center text-white">
                            <span class="text-xl mb-1 block">🏛️</span>
                            <h3 class="text-xs font-black leading-tight">ועד השכונה</h3>
                        </div>
                        <button
                            class="bg-purple-600/50 text-white px-1 py-1 rounded text-[10px] font-bold w-full hover:bg-purple-600/70"
                        >
                            פנה לועד השכונה
                        </button>
                    </div>
                </div>

                <!-- כיתת כוננות - Mobile -->
                <a href="/emergency-team" class="relative overflow-hidden rounded-lg h-full block cursor-pointer">
                    <!-- Background image -->
                    <div
                        class="absolute inset-0 bg-cover bg-center"
                        style="background-image: url('/images/konanut.png');"
                    ></div>
                    <!-- Dark gradient overlay -->
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30"
                    ></div>
                    <div class="relative z-10 p-2 h-full flex flex-col justify-between">
                        <div class="text-center text-white">
                            <span class="text-xl mb-1 block">🚨</span>
                            <h3 class="text-xs font-black leading-tight">כיתת כוננות</h3>
                            <p class="text-[10px] text-yellow-100 mt-0.5">{data.emergencyTeamCount} חברים</p>
                        </div>
                        <div
                            class="bg-red-600/50 text-white px-1 py-1 rounded text-[10px] font-bold w-full text-center"
                        >
                            הצטרף
                        </div>
                    </div>
                </a>
            </div>
        </div>
    </section>
</div>

<style>
    /* Base styles handled in app.css */

    /* Remove all spacing under title on mobile */
    @media (max-width: 768px) {
        .text-center.mb-8 {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
        }

        .neighborhoods-menu-container {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
        }

        section {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
        }

        .space-y-12 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0 !important;
        }
    }

    /* Masonry layout לבחירת ערים — ערים קטנות מתחבאות תחת הגדולות */
    .cities-masonry {
        column-count: 3;
        column-gap: 0.4rem;
    }
    @media (min-width: 768px) {
        .cities-masonry {
            column-count: 5;
            column-gap: 0.5rem;
        }
    }
    .cities-masonry .city-card {
        break-inside: avoid;
        page-break-inside: avoid;
        -webkit-column-break-inside: avoid;
        display: inline-block;
        width: 100%;
    }
</style>
