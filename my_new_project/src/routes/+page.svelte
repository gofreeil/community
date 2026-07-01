<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";
    import JerusalemMap from "$lib/components/JerusalemMap.svelte";
    import NewsTicker from "$lib/components/NewsTicker.svelte";
    import LostAndFound from "$lib/components/LostAndFound.svelte";
    import CoaliEmbed from "$lib/components/CoaliEmbed.svelte";
    import ReferendumBanner from "$lib/components/ReferendumBanner.svelte";
    import StackedWindows from "$lib/components/StackedWindows.svelte";
    import { triggerAdPopup } from "$lib/adPopupStore";
    import { ads } from "$lib/adsData";
    import { communityHelpCount } from "$lib/communityHelpStore";
    import JsonLd from "$lib/components/JsonLd.svelte";
    import { websiteSchema, organizationSchema, faqSchema, SITE_URL } from "$lib/seo";

    // Structured data לדף הבית - WebSite+חיפוש, Organization, ושאלות נפוצות.
    // עונה ישירות על "מה זה קהילה בשכונה" עבור Google ו-AI.
    const homeFaq = faqSchema([
        { q: 'מה זה קהילה בשכונה?', a: 'קהילה בשכונה היא פלטפורמה שכונתית חינמית שמרכזת במקום אחד את כל יתרונות השכונה: יד שנייה ומסירה, דירות ואירוח, שידוכים, חוגים, גמ"חים, בייבי סיטר, טרמפים, אבדות ומציאות, אירועים והנחות מקומיות — לכל שכונה ויישוב בישראל.' },
        { q: 'איך מוצאים יד שנייה ופריטים למסירה בשכונה?', a: 'בלוח "למסירה" אפשר למצוא ולפרסם פריטי יד שנייה וחינם מהשכנים — ריהוט, מוצרי חשמל, בגדים, צעצועים ועוד, מסוננים לפי השכונה שלך.' },
        { q: 'יש באתר שידוכים, חוגים ודירות?', a: 'כן. יש לוח שידוכים (פנויים ופנויות), לוח חוגים ארצי, לוח אירוח לשבת ודירות, וכן בייבי סיטר, טרמפים, גמ"חים, אבדות ומציאות ועוד.' },
        { q: 'האם השימוש בקהילה בשכונה בחינם?', a: 'כן, השימוש חינמי לחלוטין לכל תושב, בכל שכונה ויישוב בישראל.' },
    ]);

    const currentYear = new Date().getFullYear();

    // Mock - חצי עליון: רמות יד פעילות שעדיין לא קיבלו מענה.
    const raisedHandsMock = [
        { icon: '👴', title: 'מבוגר זקוק לעזרה בקניות שבועיות',         date: '13 במאי 2026' },
        { icon: '🚗', title: 'דרוש סיוע בהתנעת רכב ברחוב הרב הרצוג',   date: '13 במאי 2026' },
        { icon: '🆘', title: 'בקשת עזרה: ליווי לבדיקה רפואית',          date: '12 במאי 2026' },
    ];

    // Mock - חצי תחתון: משאלות מכותל המשאלות / קופת השכונה שהוגשמו.
    const fulfilledWishesMock = [
        { icon: '🎒', title: 'מומשה משאלה: ילקוט וציוד לכיתה א׳ למשפחת כהן',   date: '12 במאי 2026' },
        { icon: '🍞', title: 'גויס סל מזון לחג למשפחת לוי מקופת השכונה',         date: '9 במאי 2026' },
        { icon: '👰', title: 'מומשה משאלה: השלמת הוצאות חתונה לכלה יתומה',     date: '6 במאי 2026' },
        { icon: '💊', title: 'נתרמו 1,200₪ מקופת השכונה לתרופות דחופות',          date: '3 במאי 2026' },
    ];

    import { citiesAndNeighborhoods, citiesData } from "$lib/neighborhoodsData";
    import { neighborhoodState } from "$lib/neighborhoodState.svelte";
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let showNeighborhoodsMenu = $state(false);
    let searchQuery = $state('');
    let farmBannerClicked = $state(false);
    // איזו עיר מציגה כעת רמז "לחץ על השכונה" (אחרי שהמשתמש לחץ על שם העיר עצמו)
    let hintCity = $state<string | null>(null);
    let hintTimer: ReturnType<typeof setTimeout> | null = null;

    function showCityHint(city: string) {
        hintCity = city;
        if (hintTimer) clearTimeout(hintTimer);
        hintTimer = setTimeout(() => { hintCity = null; }, 4000);
    }

    // CoaliEmbed מוצג רק לקרית משה בירושלים; לכל השאר - ReferendumBanner (דוגמא)
    const showCoali = $derived(
        neighborhoodState.neighborhood === "קרית משה" &&
        neighborhoodState.city === "ירושלים"
    );

    // איחוד כל הערים - אם עיר מופיעה פעמיים בנתונים, נאחד את השכונות שלה (ללא כפילויות),
    // וממזגים גם שכונות שאושרו ע"י אדמין (data.approvedNeighborhoods) כדי שיופיעו בבורר.
    const allCitiesMerged = $derived.by(() => {
        const map = new Map<string, string[]>();
        for (const entry of citiesData) {
            const existing = map.get(entry.city) ?? [];
            const combined = [...existing, ...entry.neighborhoods];
            // הסר כפילויות תוך שמירה על סדר
            const unique = Array.from(new Set(combined));
            map.set(entry.city, unique);
        }
        const approved = (data as any).approvedNeighborhoods as Array<{ name: string; city: string }> | undefined;
        for (const n of approved ?? []) {
            if (!n?.name || !n?.city) continue;
            const existing = map.get(n.city) ?? [];
            if (!existing.includes(n.name)) map.set(n.city, [...existing, n.name]);
        }
        // מיון אלפביתי בעברית
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'he'));
    });

    // חיפוש ערים ושכונות לפי query
    // אם ה-query תואם שם עיר - מציגים את כל השכונות שלה.
    // אם ה-query תואם שמות שכונות בתוך עיר (אבל לא את העיר עצמה) - מציגים רק את השכונות התואמות.
    const filteredCities = $derived.by(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return allCitiesMerged;
        const out: [string, string[]][] = [];
        for (const [city, ns] of allCitiesMerged) {
            if (city.toLowerCase().includes(q)) {
                out.push([city, ns]);
            } else {
                const matching = ns.filter(n => n.toLowerCase().includes(q));
                if (matching.length > 0) out.push([city, matching]);
            }
        }
        return out;
    });

    // ספירת ערים ושכונות לתצוגה ב-placeholder
    const totalCities = allCitiesMerged.length;
    const totalNeighborhoods = allCitiesMerged.reduce((sum, [, n]) => sum + n.length, 0);

    // ===== מועדפות שכונה (localStorage) =====
    const FAV_KEY = 'favorite_neighborhoods_v1';
    type Fav = { city: string; neighborhood: string };
    let favorites = $state<Fav[]>([]);

    function favKey(c: string, n: string) { return `${c}|${n}`; }

    function loadFavorites() {
        try {
            const raw = localStorage.getItem(FAV_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) favorites = parsed.filter(f => f?.city && f?.neighborhood);
            }
        } catch {}
    }

    function saveFavorites() {
        try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch {}
    }

    function isFavorite(c: string, n: string): boolean {
        return favorites.some(f => f.city === c && f.neighborhood === n);
    }

    function toggleFavorite(c: string, n: string, e?: Event) {
        e?.stopPropagation();
        e?.preventDefault();
        if (isFavorite(c, n)) {
            favorites = favorites.filter(f => !(f.city === c && f.neighborhood === n));
        } else {
            favorites = [...favorites, { city: c, neighborhood: n }];
        }
        saveFavorites();
    }

    onMount(() => {
        // אתחל עם נתוני פרופיל מהשרת (או localStorage כ-fallback)
        neighborhoodState.init(data.userNeighborhood, data.userCity);
        loadFavorites();
    });

    function handleToggleMenu() {
        showNeighborhoodsMenu = !showNeighborhoodsMenu;
    }

    function selectNeighborhood(neighborhood: string, city: string) {
        neighborhoodState.select(neighborhood, city);
        showNeighborhoodsMenu = false;
        searchQuery = '';
        hintCity = null;
        if (hintTimer) clearTimeout(hintTimer);
    }

    function closeMenu() {
        showNeighborhoodsMenu = false;
        searchQuery = '';
        hintCity = null;
        if (hintTimer) clearTimeout(hintTimer);
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

    // אירועי דוגמה (mock) - מוצגים כל עוד אין אירוע אמיתי בשכונה
    function isoPlusDays(days: number): string {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }
    const mockEvents: EventCard[] = [
        { title: '🎤 הרצאה בנושא חינוך ילדים',     location: 'בית הכנסת המרכזי', date: isoPlusDays(2),  startTime: '20:00', endTime: '21:00', bgColor: COLOR_MAP.green.bg,  textColor: COLOR_MAP.green.text,  subColor: COLOR_MAP.green.sub  },
        { title: '🏃 מרוץ קהילתי - 5 ק"מ',          location: 'גן הציבורי',         date: isoPlusDays(5),  startTime: '07:30', endTime: '08:30', bgColor: COLOR_MAP.blue.bg,   textColor: COLOR_MAP.blue.text,   subColor: COLOR_MAP.blue.sub   },
        { title: '🎉 ערב הוקרה למתנדבי השכונה',     location: 'מתנ"ס שכונתי',       date: isoPlusDays(8),  startTime: '19:30', endTime: '20:30', bgColor: COLOR_MAP.purple.bg, textColor: COLOR_MAP.purple.text, subColor: COLOR_MAP.purple.sub },
        { title: '🌱 יום ניקיון ושיפור פני השכונה', location: 'כיכר השכונה',         date: isoPlusDays(14), startTime: '09:00', endTime: '10:00', bgColor: COLOR_MAP.orange.bg, textColor: COLOR_MAP.orange.text, subColor: COLOR_MAP.orange.sub },
    ];

    const realEvents: EventCard[] = $derived(
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

    const events: EventCard[] = $derived(realEvents.length > 0 ? realEvents : mockEvents);

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
    <title>קהילה בשכונה — יד שנייה, דירות, שידוכים, חוגים וכל יתרונות השכונה</title>
    <meta name="description" content="קהילה בשכונה — כל יתרונות השכונה במקום אחד: יד שנייה ולמסירה, דירות ואירוח לשבת, שידוכים, חוגים, גמ״חים, בייבי סיטר, טרמפים, אבדות ומציאות והטבות מקומיות. חינם, לכל שכונה ויישוב בישראל." />
    <meta name="keywords" content="קהילה בשכונה, יד 2, יד שנייה, דירות, שידוכים, חוגים, גמח, בייבי סיטר, טרמפים, אבדות ומציאות, אירוח לשבת, אירועים, שכונה" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href={SITE_URL} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="קהילה בשכונה" />
    <meta property="og:title" content="קהילה בשכונה — כל יתרונות השכונה במקום אחד" />
    <meta property="og:description" content="יד שנייה, דירות, שידוכים, חוגים, גמ״חים, בייבי סיטר, טרמפים, אבדות ומציאות ועוד — חינם, לכל שכונה ויישוב בישראל." />
    <meta property="og:image" content="https://community.gofreeil.com/images/community-logo1.png" />
    <meta property="og:image:width" content="1024" />
    <meta property="og:image:height" content="1024" />
    <meta property="og:url" content="https://community.gofreeil.com" />
    <meta property="og:locale" content="he_IL" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="קהילה בשכונה — כל יתרונות השכונה במקום אחד" />
    <meta name="twitter:description" content="יד שנייה, דירות, שידוכים, חוגים, גמ״חים, בייבי סיטר, טרמפים ועוד — חינם, לכל שכונה בישראל." />
    <meta name="twitter:image" content="https://community.gofreeil.com/images/community-logo1.png" />
</svelte:head>

<JsonLd schema={[websiteSchema(), organizationSchema(), homeFaq]} />

<div class="pb-0 md:pb-8 pt-4 md:pt-8" onclick={() => calMenuOpen = null}>
    <!-- כותרת SEO ראשית (נסרקת ע"י גוגל/AI, מוסתרת ויזואלית) -->
    <h1 class="sr-only">קהילה בשכונה — יד שנייה ולמסירה, דירות ואירוח לשבת, שידוכים, חוגים, גמ״חים, בייבי סיטר, טרמפים ואבדות ומציאות בשכונה ובכל יישוב בישראל</h1>
    <!-- Title Section - centered across full width -->
    <section class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-3 md:mb-8 relative neighborhoods-menu-container">
            <!-- Mobile: title with button on left side -->
            <div class="md:hidden mb-2">
                <div class="relative group text-center mb-0 w-full">
                    <h2
                        class="text-[1.6rem] md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default leading-tight w-full line-clamp-2 break-words"
                    >
                        שכונת {neighborhoodState.neighborhood}
                    </h2>
                </div>
                <div class="relative flex items-center w-full">
                    <div class="absolute left-0 z-50">
                        <button
                            onclick={handleToggleMenu}
                            class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-md font-bold text-xs shadow-lg transition-all hover:scale-105 whitespace-nowrap relative z-50 pointer-events-auto"
                        >
                            לכל השכונות
                        </button>
                    </div>
                    <div
                        class="relative group w-full text-center pointer-events-none"
                    >
                        <h2
                            class="text-[1.6rem] md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default leading-[1.3]"
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
                    לכלל השכונות
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
                        <!-- חיפוש + סגור - תמיד באותה שורה -->
                        <div class="flex flex-row items-center gap-2 flex-1">
                            <div class="relative flex-1">
                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm pointer-events-none">🔎</span>
                                <input
                                    type="text"
                                    placeholder={`חיפוש עיר או שכונה... (${totalCities} ערים, ${totalNeighborhoods} שכונות)`}
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

                    {#if favorites.length > 0 && searchQuery.trim() === ''}
                        <div class="mb-3 rounded-lg p-2 border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-yellow-500/5">
                            <h4 class="text-amber-300 text-xs md:text-sm font-bold mb-1.5 flex items-center gap-1.5">
                                <span>⭐</span>
                                <span>השכונות המועדפות שלי</span>
                                <span class="text-amber-400/70 font-normal">({favorites.length})</span>
                            </h4>
                            <div class="flex flex-wrap gap-1">
                                {#each favorites as fav (favKey(fav.city, fav.neighborhood))}
                                    <span class="inline-flex items-stretch rounded overflow-hidden bg-gray-700/60 hover:bg-purple-600/80 transition-colors">
                                        <button
                                            onclick={() => selectNeighborhood(fav.neighborhood, fav.city)}
                                            class="text-white text-[11px] md:text-xs px-2 py-0.5"
                                            title="{fav.neighborhood}, {fav.city}"
                                        >
                                            {fav.neighborhood}
                                            <span class="text-amber-400/60 mr-1">· {fav.city}</span>
                                        </button>
                                        <button
                                            onclick={(e) => toggleFavorite(fav.city, fav.neighborhood, e)}
                                            class="px-1.5 text-yellow-400 hover:text-red-400 text-sm border-r border-black/20"
                                            aria-label="הסר ממועדפות"
                                            title="הסר ממועדפות"
                                        >★</button>
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if searchQuery.trim() === '' && favorites.length === 0}
                        <div class="text-center text-gray-400 py-6 text-sm">
                            הקלד שם עיר או שכונה בשורת החיפוש
                        </div>
                    {:else if searchQuery.trim() === ''}
                        <!-- יש מועדפות, אבל לא חיפש - לא נציג את כל הערים -->
                    {:else if filteredCities.length === 0}
                        <div class="text-center text-gray-400 py-6 text-sm">
                            לא נמצאו ערים או שכונות תואמות "{searchQuery}"
                        </div>
                    {:else}
                        <div class="cities-masonry">
                            {#each filteredCities as [city, neighborhoods]}
                                <div class="city-card bg-gray-800/70 rounded-lg p-2 border mb-2 transition-colors
                                    {hintCity === city ? 'border-amber-500/60 ring-1 ring-amber-500/40' : 'border-purple-500/10'}">
                                    <button
                                        type="button"
                                        onclick={() => showCityHint(city)}
                                        class="w-full text-purple-400 hover:text-purple-300 font-bold mb-1.5 text-xs md:text-sm border-b border-purple-500/20 pb-1 text-right cursor-help"
                                        aria-label="לחץ על השכונה הרצויה בתוך {city}"
                                    >
                                        {city}
                                    </button>
                                    {#if hintCity === city}
                                        <div class="mb-1.5 px-2 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] md:text-xs font-bold flex items-center gap-1.5"
                                             style="animation: hintFadeIn 0.25s ease-out;">
                                            <span>👇</span>
                                            <span>לחץ בתוך העיר הזו על השכונה הרצויה לך</span>
                                        </div>
                                    {/if}
                                    <div class="flex flex-wrap gap-1">
                                        {#each neighborhoods as neighborhood}
                                            {@const fav = isFavorite(city, neighborhood)}
                                            <span class="neighborhood-link inline-flex items-stretch rounded overflow-hidden transition-all
                                                {hintCity === city ? 'ring-1 ring-amber-400/50' : ''}
                                                {fav ? 'bg-amber-500/15 ring-1 ring-amber-500/40' : 'bg-gray-700/50'}">
                                                <button
                                                    onclick={() => selectNeighborhood(neighborhood, city)}
                                                    class="text-white text-[11px] md:text-xs px-2 py-0.5 hover:bg-purple-600 transition-colors"
                                                >
                                                    {neighborhood}
                                                </button>
                                                <button
                                                    onclick={(e) => toggleFavorite(city, neighborhood, e)}
                                                    class="px-1 text-sm leading-none border-r border-black/20 transition-colors
                                                        {fav ? 'text-yellow-400 hover:text-red-400' : 'text-gray-500 hover:text-yellow-400'}"
                                                    aria-label="{fav ? 'הסר ממועדפות' : 'הוסף למועדפות'}"
                                                    title="{fav ? 'הסר ממועדפות' : 'הוסף למועדפות'}"
                                                >{fav ? '★' : '☆'}</button>
                                            </span>
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
    <div class="max-w-7xl mx-auto px-4 -mt-4 mb-1 md:mb-4">
        <NewsTicker />
    </div>

    <!-- Map + Referendum + Sidebar (unified desktop layout) -->
    <section class="max-w-7xl mx-auto px-4 mt-3 md:mt-4 mb-8">
        <!-- Desktop: left column (map+referendum) + right column (3 boards) -->
        <div class="hidden lg:flex gap-4">
            <!-- Left column (3/4): Map on top, Referendum below -->
            <div class="lg:w-3/4 flex flex-col gap-3">
                <div>
                    <JerusalemMap bind:showNeighborhoodsMenu dbItems={data.dbItems} />
                </div>
                <StackedWindows {showCoali} />
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
                    <LostAndFound items={data.dbItems.filter(i => i.category === 'lost_and_found' && i.city === neighborhoodState.city)} />
                </div>

                <!-- 3. Community Help -->
                <div class="flex-1 min-h-0 rounded-2xl bg-[#0f172a] border border-2 border-rose-500/30 overflow-hidden shadow-2xl flex flex-col">
                    <div class="bg-gradient-to-r from-rose-600 to-pink-600 p-3 flex-shrink-0">
                        <h3 class="text-sm font-bold text-white flex items-center gap-2">
                            <span class="text-base">🤝</span>
                            העזרה לקהילה
                        </h3>
                        <p class="text-[11px] text-rose-100/90 mt-1 leading-tight">
                            הקהילה עזרה לפתור {$communityHelpCount} קריאות בשנת {currentYear}
                        </p>
                    </div>
                    <div class="p-2 flex-1 overflow-hidden flex flex-col gap-1.5 relative">
                        <!-- חצי עליון: רמות יד פעילות שעדיין לא קיבלו מענה -->
                        <div class="flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5">
                            <div class="flex items-center gap-1.5 px-0.5 flex-shrink-0">
                                <span class="text-[10px] font-bold text-red-300 uppercase tracking-wide">✋ רמות יד פעילות</span>
                                <div class="flex-1 h-px bg-red-500/30"></div>
                            </div>
                            <div class="flex-1 min-h-0 overflow-hidden flex flex-col gap-1">
                                {#each raisedHandsMock as h}
                                    <div class="flex gap-2 items-start bg-red-500/10 rounded-lg p-1.5 border border-red-500/20">
                                        <span class="text-base flex-shrink-0 leading-none mt-0.5">{h.icon}</span>
                                        <div class="min-w-0 flex-1">
                                            <p class="text-white text-[11px] font-bold leading-tight">{h.title}</p>
                                            <p class="text-red-200/70 text-[10px] mt-0.5">{h.date}</p>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <!-- חצי תחתון: משאלות לב שמולאו -->
                        <div class="flex-1 min-h-0 overflow-hidden flex flex-col gap-1.5">
                            <div class="flex items-center gap-1.5 px-0.5 flex-shrink-0">
                                <span class="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">💚 משאלות שהוגשמו מהכותל / קופת השכונה</span>
                                <div class="flex-1 h-px bg-emerald-500/30"></div>
                            </div>
                            <div class="flex-1 min-h-0 overflow-hidden flex flex-col gap-1">
                                {#each fulfilledWishesMock as h}
                                    <div class="flex gap-2 items-start bg-white/5 rounded-lg p-1.5 border border-white/8">
                                        <span class="text-base flex-shrink-0 leading-none mt-0.5">{h.icon}</span>
                                        <div class="min-w-0 flex-1">
                                            <p class="text-white text-[11px] font-bold leading-tight">{h.title}</p>
                                            <p class="text-rose-200/70 text-[10px] mt-0.5">{h.date}</p>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                        <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-12 rounded-b-lg" style="background: linear-gradient(to bottom, transparent, #0f172a 90%);"></div>
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
                    <LostAndFound items={data.dbItems.filter(i => i.category === 'lost_and_found' && i.city === neighborhoodState.city)} />
                </div>
            </div>
            <StackedWindows {showCoali} />
        </div>
    </section>

    <!-- Emergency Team Banner -->
    <section class="max-w-6xl mx-auto px-4 mt-6 md:mt-0">
        <!-- Desktop: 3 columns, Mobile: horizontal scroll -->
        <div class="hidden md:grid md:grid-cols-3 gap-6">
            <!-- כותל המשאלות -->
            <a
                href="/community-fund"
                class="em-card group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col cursor-pointer"
            >
                <!-- Background image -->
                <div
                    class="em-zoom absolute inset-0 bg-cover bg-center transition-transform duration-300"
                    style="background-image: url('/images/2.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="em-zoom absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300"
                ></div>
                <div
                    class="relative z-10 p-6 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="em-emoji text-4xl mb-2 block transition-transform duration-300"
                            >🙏</span
                        >
                        <h3
                            class="em-title text-xl font-black mb-2 transition-colors duration-300"
                        >
                            <span class="em-label-default">כותל המשאלות</span>
                            <span class="em-label-hover">עניי עירך קודמין</span>
                        </h3>
                        <div
                            class="em-btn bg-blue-600/50 hover:bg-blue-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full text-center mt-auto"
                        >
                            וקופת השכונה
                        </div>
                    </div>
                </div>
            </a>

            <!-- פנה לוועד השכונה -->
            <div
                class="em-card group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col"
            >
                <!-- Background image -->
                <div
                    class="em-zoom absolute inset-0 bg-cover bg-center transition-transform duration-300"
                    style="background-image: url('/images/vaad-shchuna.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="em-zoom absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300"
                ></div>
                <div
                    class="relative z-10 p-6 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="em-emoji text-4xl mb-2 block transition-transform duration-300"
                            >🏛️</span
                        >
                        <h3
                            class="em-title text-xl font-black mb-2 transition-colors duration-300"
                        >
                            ועד השכונה
                        </h3>
                        <p
                            class="text-sm mb-4 text-purple-100 transition-opacity duration-300 flex-grow"
                        >
                            יש לך הצעה? רוצה לשפר את השכונה?
                        </p>
                        <button
                            class="em-btn bg-purple-600/50 hover:bg-purple-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full mt-auto"
                        >
                            פנה לועד השכונה
                        </button>
                    </div>
                </div>
            </div>

            <!-- כיתת כוננות -->
            <a
                href="/emergency-team"
                class="em-card group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col cursor-pointer"
            >
                <!-- Background image -->
                <div
                    class="em-zoom absolute inset-0 bg-cover bg-center transition-transform duration-300"
                    style="background-image: url('/images/konanut.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="em-zoom absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300"
                ></div>
                <div
                    class="relative z-10 p-6 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="em-emoji text-4xl mb-2 block transition-transform duration-300"
                            >🚨</span
                        >
                        <h3
                            class="em-title text-xl font-black mb-2 transition-colors duration-300"
                        >
                            <span class="em-label-default">כיתת כוננות</span>
                            <span class="em-label-hover">חזק את ביטחון השכונה</span>
                        </h3>
                        <p
                            class="text-xs mb-3 text-yellow-100"
                        >
                            <span class="font-bold">{data.emergencyTeamCount}</span> חברים פעילים
                        </p>
                        <div
                            class="em-btn bg-red-600/50 hover:bg-red-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full mt-auto text-center"
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
                            <h3 class="text-sm font-black leading-tight">כותל המשאלות</h3>
                        </div>
                        <div
                            class="bg-blue-600/50 text-white px-1 py-1 rounded text-xs font-bold text-center w-full"
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
                            <h3 class="text-sm font-black leading-tight">ועד השכונה</h3>
                        </div>
                        <button
                            class="bg-purple-600/50 text-white px-1 py-1 rounded text-xs font-bold w-full hover:bg-purple-600/70"
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
                            <h3 class="text-sm font-black leading-tight">כיתת כוננות</h3>
                            <p class="text-xs text-yellow-100 mt-0.5">{data.emergencyTeamCount} חברים</p>
                        </div>
                        <div
                            class="bg-red-600/50 text-white px-1 py-1 rounded text-xs font-bold w-full text-center"
                        >
                            הצטרף
                        </div>
                    </div>
                </a>
            </div>
        </div>

        <!-- Direct Agriculture Banner -->
        <button
            type="button"
            onclick={() => farmBannerClicked = true}
            class="flex group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-green-500/30 transition-all duration-500 hover:-translate-y-1 mt-3 md:mt-6 mx-2 md:mx-0 mb-2 md:mb-0 cursor-pointer min-h-[90px] md:min-h-[110px] items-stretch w-full text-right"
            class:farm-banner-disabled={farmBannerClicked}
        >
            <!-- Background gradient -->
            <div class="absolute inset-0 bg-gradient-to-l from-green-950 via-emerald-900 to-emerald-800"></div>

            <!-- Image (extends slightly into text area - only small overlap) -->
            <div
                class="absolute inset-y-0 left-0 w-3/4 md:w-2/3 z-10 bg-cover bg-center transition-transform duration-300 group-hover:scale-105 farm-image-fade"
                style="background-image: url('/images/Copilot_20260514_012104.png');"
            ></div>

            <!-- Content (right side in RTL, floats over image) -->
            <div class="relative z-20 ml-auto px-4 md:px-8 py-3 md:py-4 flex flex-col justify-center">
                <div class="mb-1 md:mb-2 flex items-center gap-2">
                    <h3 class="text-lg md:text-3xl font-black text-white group-hover:text-yellow-200 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                        חקלאות ישירה
                    </h3>
                    <span class="text-lg md:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" aria-label="בשלבי בניה">🔒</span>
                </div>
                <p class="text-[11px] md:text-base text-green-100 leading-tight md:leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] whitespace-nowrap">
                    חיבור ישיר בין חקלאים לצרכנים ללא פערי תיווך
                </p>
                <p
                    class="mt-1 md:mt-2 text-[11px] md:text-sm font-bold text-yellow-200 leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-all duration-300"
                    class:farm-construction-pulse={farmBannerClicked}
                >
                    🔒 בשלבי בניה והתארגנות
                </p>
            </div>
        </button>
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

    /* Masonry layout לבחירת ערים - ערים קטנות מתחבאות תחת הגדולות */
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

    /* כפתורי שכונות - קישור פעיל ברור: hover מגדיל, מבליט וצובע */
    .neighborhood-link {
        cursor: pointer;
        position: relative;
    }
    .neighborhood-link:hover {
        transform: scale(1.08);
        background: linear-gradient(135deg, #9333ea, #c026d3);
        box-shadow: 0 4px 12px -2px rgba(168, 85, 247, 0.55);
        text-decoration: underline;
        text-decoration-color: rgba(255, 255, 255, 0.7);
        text-underline-offset: 2px;
    }
    .neighborhood-link:active {
        transform: scale(0.95);
    }
    /* ===== כרטיסי "כיתת כוננות / כותל המשאלות / ועד השכונה" — אפקטי hover מפורשים.
       Tailwind v4 לא מקמפל group-hover:*, לכן ה-hover מוגדר ב-CSS ישיר. ===== */
    .em-card:hover .em-zoom   { transform: scale(1.1); }
    .em-card:hover .em-emoji  { transform: scale(1.25) rotate(12deg); }
    .em-card:hover .em-title  { color: #fef08a; }
    .em-card:hover .em-btn    { transform: scale(1.05); }
    .em-label-hover           { display: none; }
    .em-card:hover .em-label-default { display: none; }
    .em-card:hover .em-label-hover   { display: inline; }
    .em-card:hover .em-reveal { opacity: 1; }
    /* פעימה עדינה לציון שאלו קישורים פעילים - נפעלת רק כש-card מסומן ברמז */
    .city-card.\[ring-amber-500\/40\] .neighborhood-link,
    .city-card[class*="ring-amber"] .neighborhood-link {
        animation: nbPulse 1.6s ease-in-out infinite;
    }
    @keyframes nbPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
        50%      { box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.35); }
    }
    /* מצב "בשלבי בניה" - הופך את הבאנר לשחור-לבן בלחיצה */
    .farm-banner-disabled {
        filter: grayscale(100%);
        cursor: default;
    }
    .farm-banner-disabled:hover {
        transform: none !important;
    }
    @keyframes farmConstructionPulse {
        0%   { transform: scale(1);    opacity: 1; }
        25%  { transform: scale(1.15); opacity: 0.9; }
        50%  { transform: scale(0.97); opacity: 1; }
        75%  { transform: scale(1.08); opacity: 0.95; }
        100% { transform: scale(1);    opacity: 1; }
    }
    .farm-construction-pulse {
        animation: farmConstructionPulse 0.9s ease-in-out 1 both;
        color: #fde047 !important;
        font-size: 1.05em;
    }
    /* באנר חקלאות ישירה - אלכסון 135° ימין-עליון → שמאל-תחתון, גם במובייל וגם בדסקטופ */
    .farm-image-fade {
        -webkit-mask-image: linear-gradient(135deg, black 0%, black 25%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.2) 65%, transparent 75%);
                mask-image: linear-gradient(135deg, black 0%, black 25%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.2) 65%, transparent 75%);
    }

    @keyframes hintFadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
    }
</style>
