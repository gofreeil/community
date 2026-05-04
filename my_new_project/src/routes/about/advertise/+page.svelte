<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { citiesData, LS_KEY, DEFAULT_NEIGHBORHOOD } from "$lib/neighborhoodsData";
    import { coinAnim } from "$lib/coinAnimationState.svelte";

    const packages = [
        {
            name: "באנר צד",
            icon: "📌",
            location: "מופיע בגירסת הדסקטופ",
            color: "from-blue-600 to-cyan-600",
            border: "border-blue-500/40",
            bg: "bg-blue-900/10",
            features: ["חשיפה גבוהה בכל עמוד", "קהל מקומי ממוקד", "לינק לאתר שלך"],
            image: "/images/advertisement-page/Desktop-advertisement.png",
        },
        {
            name: "כרטיס תוכן",
            icon: "🖼️",
            location: "בתוכן עמוד הבית",
            color: "from-purple-600 to-pink-600",
            border: "border-purple-500/40",
            bg: "bg-purple-900/10",
            features: ["הופעה על המפה בדיוק בשכונה", "הופעה ברשימת התצוגה", "דף פרטי עם הפרטים"],
            image: "/images/advertisement-page/neighborhood-map.png",
        },
        {
            name: "פרסומת נייד",
            icon: "📱",
            location: "באנר במסך מלא",
            color: "from-green-600 to-emerald-600",
            border: "border-green-500/40",
            bg: "bg-green-900/10",
            features: ["פרסומת ל4 שניות כאשר הגולש לוחץ על היתרונות באתר", "כולל דף נחיתה", "קישור ישיר לאתר המפרסם"],
            image: "/images/advertisement-page/mobile.png",
            imageScale: 1.45,
            imageOrigin: "65% 0%",
        },
    ];

    // ---- City selection (price × number of active neighborhoods in city) ----
    const defaultCity = citiesData.find(c => c.neighborhoods.includes(DEFAULT_NEIGHBORHOOD))?.city ?? citiesData[0].city;
    let selectedCities = $state<Set<string>>(new Set([defaultCity]));
    let isNational = $state(false);
    let showPicker = $state(false);
    let citySearchQuery = $state('');
    let showAllCities = $state(false);
    let citySearchInput: HTMLInputElement | null = $state(null);
    let pickerPanel: HTMLDivElement | null = $state(null);

    // Popular cities — quick-pick chips for the most common selections
    const popularCities = ['ירושלים', 'תל אביב יפו', 'חיפה', 'באר שבע', 'נתניה', 'ראשון לציון'];

    // ---- Guided tutorial pointer ----
    type TutorialStep = 'pick-city' | 'pick-row' | 'pick-plan' | 'done';
    let tutorialStep = $state<TutorialStep>('pick-city');
    let showCheckmark = $state(false);
    let highlightedRow = $state<number | null>(null);
    let confirmingRow = $state<number | null>(null);
    let calculatorEl: HTMLDivElement | null = $state(null);
    let pricingHeadingEl: HTMLHeadingElement | null = $state(null);

    function advanceFromCity() {
        if (tutorialStep !== 'pick-city') return;
        showCheckmark = true;
        setTimeout(() => {
            showCheckmark = false;
            tutorialStep = 'pick-row';
            // Slow scroll to the publication-type table
            slowScrollTo(pricingHeadingEl, 2200);
        }, 900);
    }

    function highlightRow(num: number) {
        highlightedRow = num;
        if (tutorialStep === 'pick-row') tutorialStep = 'pick-plan';
    }

    function advanceFromPlan() {
        if (tutorialStep === 'pick-row' || tutorialStep === 'pick-plan') tutorialStep = 'done';
    }

    let filteredCities = $derived.by(() => {
        const q = citySearchQuery.trim();
        if (!q) return [];
        // Rank: 1) starts with query, 2) word boundary match, 3) contains
        const matches = citiesData.filter(c => c.city.includes(q));
        return matches
            .map(c => {
                const name = c.city;
                let score = 2;
                if (name.startsWith(q))               score = 0;
                else if (name.includes(' ' + q))      score = 1;
                return { c, score };
            })
            .sort((a, b) => a.score - b.score)
            .map(x => x.c)
            .slice(0, 30);
    });

    // Auto-focus search input whenever the picker opens
    $effect(() => {
        if (showPicker && citySearchInput) {
            queueMicrotask(() => citySearchInput?.focus());
        }
    });

    // Smooth-scroll the picker panel into view when results appear or grid is shown
    $effect(() => {
        // Track these so the effect re-runs when they change
        const _resultCount = filteredCities.length;
        const _showAll = showAllCities;
        if (!showPicker || !pickerPanel) return;
        if (_resultCount === 0 && !_showAll) return;
        // Wait for layout to settle, then scroll the panel's bottom into view
        queueMicrotask(() => {
            pickerPanel?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    });

    // Pre-selected item info coming from /add/[category] flow
    let pendingItemLabel    = $state('');
    let pendingItemCategory = $state('');

    onMount(() => {
        if (!browser) return;

        // Read last neighborhood chosen on the home page — map to its city
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
            try {
                const { neighborhood } = JSON.parse(saved);
                if (neighborhood) {
                    const found = citiesData.find(c => c.neighborhoods.includes(neighborhood));
                    if (found) selectedCities = new Set([found.city]);
                }
            } catch {}
        }

        // Auto-select pricing row from /add/[category] redirect
        try {
            const pending = localStorage.getItem('pending_ad');
            if (pending) {
                const { priceRow, categoryLabel, itemLabel } = JSON.parse(pending);
                if (typeof priceRow === 'number' && priceRow >= 1 && priceRow <= 9) {
                    planMap = new Map([[priceRow, 'half']]);
                }
                if (categoryLabel) pendingItemCategory = String(categoryLabel);
                if (itemLabel)     pendingItemLabel     = String(itemLabel);
                localStorage.removeItem('pending_ad');
            }
        } catch {}
    });

    function setNational() {
        if (isNational) {
            // Toggle off — return to "בחר עיר / שכונה" state
            isNational = false;
            return;
        }
        isNational = true;
        selectedCities = new Set();
    }

    // Format numbers with thousands separator for readability
    function fmt(n: number): string {
        return n.toLocaleString('en-US');
    }

    function toggleCity(cityName: string) {
        const next = new Set(selectedCities);
        if (next.has(cityName)) {
            if (next.size > 1) next.delete(cityName); // keep at least one
        } else {
            next.add(cityName);
        }
        selectedCities = next;
        isNational = false;
    }

    function removeCity(cityName: string) {
        const next = new Set(selectedCities);
        next.delete(cityName);
        selectedCities = next;
    }

    function addCityFromSearch(cityName: string) {
        const next = new Set(selectedCities);
        next.add(cityName);
        selectedCities = next;
        isNational = false;
        citySearchQuery = '';
        showPicker = false; // auto-close after selection — user can reopen to add more
        advanceFromCity();
    }

    function onSearchKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && filteredCities.length > 0) {
            e.preventDefault();
            const first = filteredCities.find(c => !selectedCities.has(c.city));
            if (first) addCityFromSearch(first.city);
        } else if (e.key === 'Escape') {
            citySearchQuery = '';
        }
    }

    let neighborhoodLabel = $derived(
        isNational
            ? "ארצי — כל הארץ"
            : selectedCities.size === 0
                ? "בחר עיר / שכונה"
                : selectedCities.size === 1
                    ? [...selectedCities][0]
                    : `${[...selectedCities][0]} +${selectedCities.size - 1}`
    );

    // ---- Toast ----
    let toastVisible = $state(false);
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    function showToast() {
        toastVisible = true;
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toastVisible = false; }, 5000);
    }

    // ---- Email confirmation ----
    let userEmail      = $state('');
    let emailSending   = $state(false);
    let emailSent      = $state(false);
    let emailError     = $state('');

    async function sendOrderEmail() {
        if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
            emailError = 'נא להזין כתובת אימייל תקינה';
            return;
        }
        emailError   = '';
        emailSending = true;

        try {
            const res = await fetch('/api/send-order-email', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email:             userEmail,
                    selectedItems,
                    neighborhoodLabel,
                    neighborhoodCount,
                    totalPayment,
                    totalMonthly,
                }),
            });

            const data = await res.json();
            if (data.success) {
                emailSent = true;
                // השרת כבר הוסיף את המעשר — מפעיל אנימציה עם הנתונים שחזרו
                const tithe = Math.round(totalPayment * 0.1);
                if (tithe > 0) {
                    coinAnim.trigger(tithe, totalPayment, data.fundTotal ?? tithe);
                }
            } else {
                emailError = data.message || 'שגיאה בשליחת המייל';
            }
        } catch {
            emailError = 'בעיית תקשורת — נסה שוב';
        } finally {
            emailSending = false;
        }
    }

    const rows = [
        { num: 1, type: "פרסומת ארוכה",  half: 5,   total: 30,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע ל-6 שניות ונעלם 12 שניות" },
        { num: 2, type: "עסק",            half: 25,  total: 150, single: 35, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 3, type: "חוג",            half: 10,  total: 60,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 4, type: "צימר / סאבלט",  half: 45,  total: 270, single: 60, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 5, type: "דרושים לעבודה", half: 5,   total: 30,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע רק ברשימה" },
        { num: 6, type: "פנויים פנויות", half: 20,  total: 120, single: 30, reach: "כולל רשימה ארצית",  details: "מופיע רק ברשימה" },
        { num: 8, type: "בייבי סיטר",    half: 8,   total: 48,  single: 20, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 9, type: "אולמות",         half: 45,  total: 270, single: 60, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
    ];

    // ---- Calculator state: each row can be 'half' | 'single' | unset ----
    type Plan = 'half' | 'single';
    let planMap = $state<Map<number, Plan>>(new Map());

    function setPlan(num: number, plan: Plan) {
        const next = new Map(planMap);
        if (next.get(num) === plan) {
            next.delete(num);           // clicking active side = turn off
            planMap = next;
            return;
        }
        next.set(num, plan);
        highlightedRow = num;           // ensure visual marker stays on this row
        showToast();                    // remind user which neighborhood they're advertising in
        advanceFromPlan();
        planMap = next;

        // Step 3 confirmation: checkmark animation, then full row outline + slow scroll to calculator
        confirmingRow = num;
        setTimeout(() => {
            confirmingRow = null;
            slowScrollTo(calculatorEl, 2200);
        }, 700);
    }

    // Custom slow scroll — browser's `behavior: 'smooth'` is ~500ms, too quick for this flow
    function slowScrollTo(el: HTMLElement | null, duration: number) {
        if (!el) return;
        const startY = window.scrollY;
        const targetY = el.getBoundingClientRect().top + window.scrollY - 16;
        const distance = targetY - startY;
        if (Math.abs(distance) < 4) return;
        const startTime = performance.now();
        // easeInOutCubic — gentle accelerate/decelerate
        const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        function step(now: number) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            window.scrollTo(0, startY + distance * ease(t));
            if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // Price multiplier = total neighborhoods in selected cities
    const totalNeighborhoodsCount = citiesData.reduce((s, c) => s + c.neighborhoods.length, 0);
    let neighborhoodCount = $derived(
        isNational
            ? totalNeighborhoodsCount
            : Math.max(1, citiesData
                .filter(c => selectedCities.has(c.city))
                .reduce((s, c) => s + c.neighborhoods.length, 0))
    );

    // Jerusalem-only discount: flat 10 ₪ per neighborhood per ad type (overrides row prices in the calculator)
    const JERUSALEM_FLAT = 10;
    let isJerusalemOnly = $derived(
        !isNational && selectedCities.size === 1 && selectedCities.has('ירושלים')
    );

    // "פנויים פנויות" (num=6) is a flat national listing — price is NOT multiplied by neighborhood count
    const FLAT_NATIONAL_NUMS = new Set([6]);

    let selectedItems = $derived(
        rows
            .filter(r => planMap.has(r.num))
            .map(r => {
                const plan = planMap.get(r.num)!;
                const monthsCount = plan === 'half' ? 6 : 1;
                const eMonthly = isJerusalemOnly ? JERUSALEM_FLAT : (plan === 'half' ? r.half  : r.single);
                const eTotal   = isJerusalemOnly ? JERUSALEM_FLAT : (plan === 'half' ? r.total : r.single);
                const flatNational = FLAT_NATIONAL_NUMS.has(r.num);
                const multiplier = flatNational ? 1 : neighborhoodCount;
                return { ...r, plan, monthsCount, eMonthly, eTotal, flatNational, multiplier };
            })
    );

    // Totals: per-item price × per-item multiplier (flat-national rows use 1)
    let totalPayment = $derived(selectedItems.reduce((s, r) => s + r.eTotal   * r.multiplier, 0));
    let totalMonthly = $derived(selectedItems.reduce((s, r) => s + r.eMonthly * r.multiplier, 0));

    let halfItems        = $derived(selectedItems.filter(r => r.plan === 'half'));
    let singleItems      = $derived(selectedItems.filter(r => r.plan === 'single'));
    let hasSelection     = $derived(planMap.size > 0);

    // תמונת רקע לכל שכונה — מוצגת בכפתור הבחירה כשבוחרים שכונה בודדת
    const neighborhoodImages: Record<string, string> = {
        'קרית משה':    '/images/kiryat-moshe-vaad.jfif',
        'רחביה':       '/images/neighborhoods/rehavia.jpg',
        'גבעת שאול':   '/images/neighborhoods/givat-shaul.jpg',
        'רמות':        '/images/neighborhoods/ramot.jpg',
        'גילה':        '/images/neighborhoods/gilo.jpg',
        'קטמון':       '/images/neighborhoods/katamon.jpg',
        'בקעה':        '/images/neighborhoods/baka.jpg',
        'מעלות דפנה':  '/images/neighborhoods/maalot-dafna.jpg',
        'רמת אביב':    '/images/neighborhoods/ramat-aviv.jpg',
        'פלורנטין':    '/images/neighborhoods/florentin.jpg',
        'נווה צדק':    '/images/neighborhoods/neve-tzedek.jpg',
        'יפו העתיקה':  '/images/neighborhoods/jaffa.jpg',
        'רמת החייל':   '/images/neighborhoods/ramat-hahail.jpg',
        'כרמל צרפתי':  '/images/neighborhoods/french-carmel.jpg',
        'נווה שאנן':   '/images/neighborhoods/neve-shaanan.jpg',
        'בת גלים':     '/images/neighborhoods/bat-galim.jpg',
        'חשמונאים':    '/images/kiryat-moshe-vaad.jfif',
    };

    // City images — keyed by city name
    const cityImages: Record<string, string> = {
        'ירושלים':       '/images/kiryat-moshe-vaad.jfif',
        'תל אביב':       '/images/neighborhoods/florentin.jpg',
        'חיפה':          '/images/neighborhoods/french-carmel.jpg',
    };

    let neighborhoodImage = $derived(
        !isNational && selectedCities.size === 1
            ? (cityImages[[...selectedCities][0]] ?? null)
            : null
    );

    // Build mailto body
    let mailtoBody = $derived(
        `ערים: ${neighborhoodLabel} (×${neighborhoodCount} שכונות)%0A` +
        selectedItems.map(r =>
            `${r.type}${r.flatNational ? ' (ארצי)' : ''} — ${r.plan === 'half' ? `חצי שנה ₪${r.eTotal * r.multiplier}` : `חודש בודד ₪${r.eTotal * r.multiplier}`}`
        ).join('%0A') + `%0A%0Aסה״כ: ₪${fmt(totalPayment)}`
    );
</script>

<svelte:head>
    <title>פרסום באתר | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    <!-- Success banner from /add/[category] flow -->
    {#if pendingItemLabel}
        <div class="mb-8 rounded-2xl border-2 border-green-500/40 bg-green-900/20 p-5 text-center"
             style="animation: slideDown 0.4s ease-out;">
            <div class="text-3xl mb-2">✅</div>
            <p class="text-green-300 font-black text-base mb-1">
                "{pendingItemLabel}" נשמר בהצלחה!
            </p>
            <p class="text-gray-400 text-sm">
                הפריט כבר מופיע ברשימת השכונה.
                כעת בחר תוכנית פרסום כדי לשפר את החשיפה שלו ↓
            </p>
        </div>
    {/if}

    <!-- Header -->
    <div class="text-center mb-10 md:mb-14">
        <div class="text-5xl mb-4">📢</div>
        <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-4">
            {pendingItemLabel ? 'שדרג את החשיפה שלך' : 'פרסם באתר הקהילה'}
        </h1>
        <p class="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            היחשף לתושבי השכונה ישירות — קהל מקומי, ממוקד ומעורב
        </p>
    </div>

    <!-- Packages -->
    <h2 class="text-xl md:text-2xl font-black text-white mb-4 text-center">אפשרויות הפרסום</h2>
    <div class="grid grid-cols-3 gap-2 md:gap-4 mb-12">
        {#each packages as pkg}
            <div class="rounded-xl border {pkg.border} {pkg.bg} p-2.5 md:p-5 flex flex-col md:flex-row-reverse md:items-stretch md:gap-5">
                <div class="md:flex-1 flex flex-col">
                    <h3 class="text-xs md:text-lg font-black text-white mb-2 md:mb-3 leading-tight">{pkg.name}</h3>
                    <p class="text-[10px] md:text-sm text-gray-400 mb-3 md:mb-5 leading-tight">{pkg.location}</p>
                    <ul class="space-y-1 md:space-y-1.5">
                        {#each pkg.features as feature}
                            <li class="text-[10px] md:text-sm text-gray-300 flex items-start gap-1 md:gap-1.5 leading-tight">
                                <span class="text-green-400 flex-shrink-0">✓</span>
                                {feature}
                            </li>
                        {/each}
                    </ul>
                </div>
                {#if pkg.image}
                    <div class="hidden md:block md:flex-1 md:rounded-lg md:overflow-hidden">
                        <img src={pkg.image} alt={pkg.name} class="w-full h-full object-cover object-right-top" style={pkg.imageScale ? `transform: scale(${pkg.imageScale}); transform-origin: ${pkg.imageOrigin ?? 'top right'};` : ''} loading="lazy" />
                    </div>
                {/if}
            </div>
        {/each}
    </div>

    <!-- Pricing Table heading -->
    <h2 bind:this={pricingHeadingEl} class="text-xl md:text-4xl font-black text-white mb-6 md:mb-8 text-center scroll-mt-4">מחירון</h2>

    <!-- Neighborhood picker trigger -->
    <p class="text-gray-300 text-base font-bold text-center mb-3 flex items-center justify-center gap-2 relative">
        <span class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
              style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75">1</span>
        תחילה בחר עיר / שכונה
        {#if tutorialStep === 'pick-city' && !showPicker}
            <span class="tutorial-finger pointer-events-none select-none text-base md:text-lg drop-shadow-[0_0_5px_rgba(245,158,11,0.45)]"
                  aria-hidden="true">👇</span>
        {/if}
    </p>
    <div class="relative">
    <button
        type="button"
        onclick={() => showPicker = !showPicker}
        class="w-full rounded-2xl border-2 px-6 py-5 text-center transition-all cursor-pointer mb-4 relative overflow-hidden
            {showPicker
                ? 'border-amber-500/60 shadow-lg shadow-amber-500/10'
                : neighborhoodImage
                    ? 'border-amber-500/40 hover:border-amber-400/70'
                    : 'bg-white/5 border-white/10 hover:border-amber-400/40 hover:bg-amber-900/10'}"
        style={neighborhoodImage
            ? `background-image: url('${neighborhoodImage}'); background-size: cover; background-position: center;`
            : ""}
    >
        {#if neighborhoodImage}
            <!-- dark overlay so text stays readable -->
            <div class="absolute inset-0 bg-black/55 rounded-2xl"></div>
        {/if}
        <div class="relative z-10">
            <div class="text-xl md:text-2xl font-black text-amber-400 mb-1 leading-tight drop-shadow-lg" title={neighborhoodLabel}>
                {neighborhoodLabel}
            </div>
            {#if isNational || selectedCities.size > 0}
                <div class="text-xs md:text-sm font-bold mb-1 {neighborhoodImage ? 'text-amber-200' : 'text-amber-400/90'}">
                    סה"כ {fmt(neighborhoodCount)} שכונות
                </div>
            {/if}
            <div class="text-xs md:text-sm flex items-center justify-center
                {neighborhoodImage ? 'text-gray-200' : 'text-gray-400'}">
                <span>העיר המסומנת, לחץ לשינוי!</span>
            </div>
        </div>
    </button>
    </div>

    <!-- City Picker Panel -->
    {#if showPicker}
        <div bind:this={pickerPanel}
             class="mb-8 rounded-2xl border border-amber-500/30 bg-gray-950/95 backdrop-blur p-5 shadow-2xl"
             style="animation: slideDown 0.2s ease-out;">
            <!-- National option + selected city chips on the same row -->
            <div class="mb-3 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onclick={setNational}
                    title={isNational ? 'לחץ לביטול' : 'בחר ארצי'}
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all font-bold text-sm
                        {isNational
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 hover:text-white'}"
                >
                    <span>🌍</span>
                    <span>ארצי — כל הארץ</span>
                    <span class="text-[11px] font-normal text-gray-500">({fmt(totalNeighborhoodsCount)} שכונות)</span>
                    <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-500/50 text-amber-300 text-xs font-black"
                          style="animation: dealPulse 2s ease-in-out infinite;">
                        🎉 מבצע! 5,000 ₪ לחודש
                    </span>
                    {#if isNational}
                        <span class="text-purple-300 text-[11px] font-bold">✓ ביטול ✕</span>
                    {/if}
                </button>

                <!-- Selected city chips — inline next to the national button -->
                {#if !isNational && selectedCities.size > 0}
                    {#each [...selectedCities] as cityName}
                        {@const chipCount = citiesData.find(c => c.city === cityName)?.neighborhoods.length ?? 0}
                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-bold">
                            {cityName}
                            <span class="text-[11px] font-normal text-amber-300/80">({fmt(chipCount)} שכונות)</span>
                            <button
                                type="button"
                                onclick={() => removeCity(cityName)}
                                class="w-5 h-5 rounded-full bg-amber-500/25 hover:bg-red-500/60 text-amber-300 hover:text-white transition-colors leading-none flex items-center justify-center text-xs font-black"
                                aria-label="הסר {cityName}"
                            >×</button>
                        </span>
                    {/each}
                {/if}
            </div>

            <!-- Search row: input + "כל הערים" toggle on the side -->
            <div class="flex gap-2 mb-3">
                <div class="relative flex-1">
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>
                    <input
                        bind:this={citySearchInput}
                        type="text"
                        bind:value={citySearchQuery}
                        onkeydown={onSearchKeydown}
                        placeholder={selectedCities.size > 0 && !isNational ? 'הוסף עיר נוספת...' : 'חפש עיר / יישוב...'}
                        class="w-full pr-10 pl-9 py-3 rounded-xl bg-white/5 border-2 border-white/10 focus:border-amber-500/60 focus:bg-white/8 outline-none text-white text-sm font-medium placeholder:text-gray-500 transition-all"
                    />
                    {#if citySearchQuery}
                        <button
                            type="button"
                            onclick={() => citySearchQuery = ''}
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-base leading-none"
                            aria-label="נקה חיפוש"
                        >×</button>
                    {/if}
                </div>
                <button
                    type="button"
                    onclick={() => showAllCities = !showAllCities}
                    title={showAllCities ? 'הסתר רשימה מלאה' : 'דפדף בכל הערים'}
                    class="flex-shrink-0 px-3 rounded-xl border-2 transition-all text-xs font-bold whitespace-nowrap
                        {showAllCities
                            ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                            : 'border-white/10 bg-white/3 text-gray-300 hover:border-amber-400/40 hover:text-amber-300'}"
                >
                    🏙️ כל הערים
                </button>
            </div>

            <!-- Search results (live) -->
            {#if citySearchQuery.trim()}
                {#if filteredCities.length === 0}
                    <p class="text-gray-500 text-sm text-center py-4">לא נמצאו תוצאות עבור "{citySearchQuery}"</p>
                {:else}
                    <div class="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-black/20 mb-3">
                        {#each filteredCities as cityEntry, idx}
                            {@const selected = !isNational && selectedCities.has(cityEntry.city)}
                            <button
                                type="button"
                                onclick={() => addCityFromSearch(cityEntry.city)}
                                disabled={selected}
                                class="w-full flex items-center justify-between px-4 py-2.5 text-right border-b border-white/5 last:border-b-0 transition-colors
                                    {selected
                                        ? 'bg-amber-500/10 text-amber-300/60 cursor-default'
                                        : idx === 0
                                            ? 'text-gray-100 bg-amber-500/5 hover:bg-amber-500/15 hover:text-white'
                                            : 'text-gray-200 hover:bg-amber-500/10 hover:text-white'}"
                            >
                                <span class="font-bold text-sm flex items-center gap-2">
                                    {cityEntry.city}
                                    {#if !selected && idx === 0}
                                        <span class="text-[10px] text-amber-400/70 font-normal">↵ לבחירה מהירה</span>
                                    {/if}
                                </span>
                                <span class="text-xs {selected ? 'text-amber-400/70' : 'text-gray-500'}">
                                    {selected ? 'נבחר ✓' : `${cityEntry.neighborhoods.length} שכונות`}
                                </span>
                            </button>
                        {/each}
                    </div>
                {/if}
            {:else if !isNational && selectedCities.size === 0}
                <!-- Popular cities quick-pick — only when nothing is selected and no search active -->
                <div class="mb-3">
                    <p class="text-xs text-gray-500 mb-2 font-bold">⚡ ערים פופולריות:</p>
                    <div class="flex flex-wrap gap-2">
                        {#each popularCities as city}
                            <button
                                type="button"
                                onclick={() => addCityFromSearch(city)}
                                class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-300 transition-all"
                            >{city}</button>
                        {/each}
                    </div>
                </div>
            {/if}

            {#if showAllCities}
                <div class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                    {#each citiesData as cityEntry}
                        {@const selected = !isNational && selectedCities.has(cityEntry.city)}
                        <button
                            type="button"
                            onclick={() => toggleCity(cityEntry.city)}
                            class="flex flex-col items-start px-4 py-3 rounded-xl border-2 transition-all text-right
                                {selected
                                    ? 'border-amber-500 bg-amber-500/15 text-white'
                                    : 'border-white/10 bg-white/3 text-gray-400 hover:border-amber-400/40 hover:text-gray-200'}"
                        >
                            <div class="flex items-center justify-between w-full">
                                <span class="font-black text-base">{cityEntry.city}</span>
                                {#if selected}<span class="text-amber-400 text-base">✓</span>{/if}
                            </div>
                            <span class="text-sm mt-0.5 {selected ? 'text-amber-400/80' : 'text-gray-400'}">
                                {cityEntry.neighborhoods.length} שכונות
                            </span>
                        </button>
                    {/each}
                </div>
            {/if}

            <!-- Explanation + Confirm (sentence on the right in RTL, button on the left) -->
            <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
                <p class="text-gray-300 text-sm md:text-base font-medium leading-snug">
                    המחיר מחושב לפי מספר השכונות<br/>הפעילות בכל עיר.
                </p>
                <button
                    type="button"
                    onclick={() => { showPicker = false; citySearchQuery = ''; showAllCities = false; advanceFromCity(); }}
                    class="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-sm shadow-lg shadow-amber-500/30 hover:scale-[1.02] transition-all flex items-center gap-2"
                >
                    ✓ אישור
                    {#if isNational}
                        <span class="text-[11px] font-bold opacity-80">· ארצי ({fmt(totalNeighborhoodsCount)})</span>
                    {:else if selectedCities.size > 0}
                        <span class="text-[11px] font-bold opacity-80">· {selectedCities.size === 1 ? `${[...selectedCities][0]}` : `${selectedCities.size} ערים`} ({fmt(neighborhoodCount)})</span>
                    {/if}
                </button>
            </div>
        </div>
    {/if}

    <!-- Pricing Table — step 2 (right in RTL) + step 3 (left in RTL) -->
    <div class="flex flex-row justify-between items-center gap-3 mb-6 px-1">
        <!-- Step 2 — right in RTL (first child) -->
        <p class="text-gray-200 text-sm md:text-base font-bold leading-snug flex items-center gap-2 rounded-xl px-2 py-1 opacity-90">
            <span class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
                  style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75">2</span>
            בחר את סוג הפרסום
            {#if tutorialStep === 'pick-row'}
                <span class="tutorial-finger pointer-events-none select-none text-base md:text-lg drop-shadow-[0_0_5px_rgba(245,158,11,0.45)]"
                      aria-hidden="true">👇</span>
            {/if}
        </p>
        <!-- Step 3 — left in RTL (last child) -->
        <p class="text-gray-200 text-sm md:text-base font-bold leading-snug flex items-center gap-2 rounded-xl px-2 py-1 transition-opacity
                  {tutorialStep === 'pick-row' ? 'opacity-50' : 'opacity-90'}">
            <span class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
                  style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75">3</span>
            בחר את פרק הזמן
            {#if tutorialStep === 'pick-plan'}
                <span class="tutorial-finger pointer-events-none select-none text-base md:text-lg drop-shadow-[0_0_5px_rgba(245,158,11,0.45)]"
                      aria-hidden="true">👇</span>
            {/if}
        </p>
    </div>

    <!-- Mobile cards (visible only on small screens) -->
    <div class="md:hidden space-y-3 mb-6">
        {#each rows as row, rowIdx}
            {@const plan = planMap.get(row.num)}
            {@const highlighted = !plan && highlightedRow === row.num}
            <div role="button"
                 tabindex="0"
                 onclick={() => highlightRow(row.num)}
                 onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); highlightRow(row.num); } }}
                 class="rounded-2xl border transition-all px-4 py-3 relative cursor-pointer
                {plan === 'half'   ? 'border-amber-500/50 bg-amber-500/10'
                 : plan === 'single' ? 'border-blue-500/50 bg-blue-500/10'
                 : highlighted     ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/20 scale-[1.01]'
                 :                    'border-white/10 bg-white/3 hover:border-white/25'}
                {plan && confirmingRow !== row.num ? 'ring-2 ring-amber-400 ring-offset-0' : ''}">
                {#if confirmingRow === row.num}
                    <span class="confirm-check-pop pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                          aria-hidden="true">
                        <span class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-400 text-black font-black text-3xl shadow-[0_0_30px_rgba(245,158,11,0.9)]">
                            ✓
                        </span>
                    </span>
                {/if}
                <!-- Row: name + toggle -->
                <div class="flex items-center justify-between gap-3 mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="text-xs font-black text-gray-400 flex-shrink-0">#{row.num}</span>
                        <span class="font-black text-white text-base truncate">{row.type}</span>
                    </div>
                    <!-- Toggle -->
                    <div
                        class="relative inline-flex h-9 rounded-full flex-shrink-0 transition-all duration-300"
                        style="padding: 2px;
                               background: {plan === 'half' ? 'rgba(245,158,11,0.2)' : plan === 'single' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.12)'};
                               border: 1.5px solid {plan === 'half' ? 'rgba(245,158,11,0.7)' : plan === 'single' ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.3)'};"
                    >
                        <button
                            type="button"
                            onclick={() => setPlan(row.num, 'half')}
                            class="toggle-segment relative z-10 rounded-full px-3 text-xs font-black transition-all duration-200 whitespace-nowrap leading-none flex items-center"
                            style="background: {plan === 'half' ? '#f59e0b' : 'transparent'}; color: {plan === 'half' ? '#000' : plan ? '#9ca3af' : '#e5e7eb'};"
                        >½שנה</button>
                        {#if !plan}
                            <span class="self-center text-white/50 text-xs font-black mx-0.5 flex-shrink-0 leading-none">/</span>
                        {/if}
                        <button
                            type="button"
                            onclick={() => setPlan(row.num, 'single')}
                            class="toggle-segment relative z-10 rounded-full px-3 text-xs font-black transition-all duration-200 whitespace-nowrap leading-none flex items-center"
                            style="background: {plan === 'single' ? '#3b82f6' : 'transparent'}; color: {plan === 'single' ? '#fff' : plan ? '#9ca3af' : '#e5e7eb'};"
                        >חודש</button>
                    </div>
                </div>
                <!-- Prices row -->
                <div class="flex gap-4 text-sm mt-1">
                    <div class="flex items-baseline gap-1">
                        <span class="text-gray-300 text-sm font-semibold">חצי שנה —</span>
                        <span class="font-black text-amber-400 text-sm">₪{fmt(row.half)}</span>
                        <span class="text-gray-300 text-sm font-semibold">/חודש</span>
                    </div>
                    <div class="flex items-baseline gap-1">
                        <span class="text-gray-300 text-sm font-semibold">חודש בודד —</span>
                        <span class="font-black text-white text-sm">₪{fmt(row.single)}</span>
                    </div>
                </div>
                <!-- Details -->
                <p class="text-sm text-gray-300 mt-1.5 font-medium">{row.reach} · {row.details}</p>
            </div>
        {/each}
    </div>

    <!-- Desktop table (hidden on mobile) -->
    <div class="hidden md:block mb-6 overflow-x-auto rounded-2xl border border-white/10 relative">
        <table class="w-full text-base text-right">
            <thead>
                <tr class="bg-amber-500/20 border-b border-amber-500/30">
                    <th class="px-4 py-4 font-black text-amber-400 text-center">#</th>
                    <th class="px-4 py-4 font-black text-amber-400">סוג</th>
                    <th class="px-4 py-4 font-black text-amber-400 whitespace-nowrap text-center">
                        לחודש ₪<br/><span class="text-sm font-normal text-amber-400/70">(חצי שנה)</span>
                    </th>
                    <th class="px-4 py-4 font-black text-amber-400 whitespace-nowrap text-center">
                        לחודש<br/><span class="text-sm font-normal text-amber-400/70">בודד</span>
                    </th>
                    <th class="px-4 py-4 font-black text-amber-400">פריסה</th>
                    <th class="px-4 py-4 font-black text-amber-400">פרטים</th>
                    <!-- Toggle column header — last = left side in RTL -->
                    <th class="px-4 py-4 text-center bg-white/8 border-r border-white/10">
                        <div class="flex flex-col items-center gap-1">
                            <span class="text-xs font-bold text-amber-400/80">½שנה</span>
                            <div class="flex items-center gap-1">
                                <div class="h-px w-4 bg-amber-500/50"></div>
                                <div class="w-2 h-2 rounded-full bg-white/30"></div>
                                <div class="h-px w-4 bg-blue-400/40"></div>
                            </div>
                            <span class="text-xs font-bold text-blue-400/80">חודש</span>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each rows as row, i}
                    {@const plan = planMap.get(row.num)}
                    {@const highlighted = !plan && highlightedRow === row.num}
                    <tr onclick={() => highlightRow(row.num)}
                        class="border-b border-white/5 transition-all cursor-pointer relative
                        {plan === 'half'   ? 'bg-amber-500/10'
                         : plan === 'single' ? 'bg-blue-500/10'
                         : highlighted     ? 'bg-amber-500/15 partial-highlight'
                         : i % 2 === 0      ? 'bg-white/3 hover:bg-white/5'
                         :                    'bg-white/5 hover:bg-white/8'}
                        {plan && confirmingRow !== row.num ? 'outline outline-2 outline-amber-400 outline-offset-[-2px]' : ''}">

                        <td class="px-4 py-4 text-center font-bold
                            {plan ? 'text-amber-400' : highlighted ? 'text-amber-300' : 'text-gray-400'}">{row.num}</td>

                        <td class="px-4 py-4 font-bold relative group/typecell
                            {plan === 'half' ? 'text-amber-300' : plan === 'single' ? 'text-blue-300' : 'text-white'}">
                            {row.type}
                            {#if row.num === 1}
                                <!-- Tooltip: "פרסומת ארוכה" = הפרסומות שבצד ימין -->
                                <div class="pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2
                                            opacity-0 group-hover/typecell:opacity-100 transition-opacity duration-200
                                            bg-gray-900 border border-purple-500/60 text-white text-xs font-medium
                                            px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                                    📢 הפרסומות שבצד ימין
                                    <div class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                                                border-x-4 border-x-transparent border-t-4 border-t-gray-900"></div>
                                </div>
                            {/if}
                        </td>

                        <td class="px-4 py-4 text-center">
                            <span class="font-bold text-white text-sm">₪{fmt(row.half)}</span>
                            <span class="block font-black text-base {plan === 'half' ? 'text-amber-300' : 'text-amber-400'}">סה"כ ₪{fmt(row.total)}</span>
                        </td>

                        <td class="px-4 py-4 text-center">
                            <span class="font-bold {plan === 'single' ? 'text-blue-300' : 'text-gray-300'}">₪{fmt(row.single)}</span>
                        </td>

                        <td class="px-4 py-4 text-gray-300 text-sm">{row.reach}</td>
                        <td class="px-4 py-4 text-gray-400 text-sm">{row.details}</td>

                        <!-- 3-state toggle — last column = left side in RTL -->
                        <td class="px-3 py-3 text-center border-r border-white/10 relative"
                            style="background: {plan === 'half' ? 'rgba(245,158,11,0.12)' : plan === 'single' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)'}">

                            {#if confirmingRow === row.num}
                                <span class="confirm-check-pop pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
                                      aria-hidden="true">
                                    <span class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-400 text-black font-black text-2xl shadow-[0_0_24px_rgba(245,158,11,0.9)]">
                                        ✓
                                    </span>
                                </span>
                            {/if}

                            <div class="flex justify-center" role="presentation" onclick={(e) => e.stopPropagation()}>
                                <div
                                    class="relative inline-flex h-9 rounded-full transition-all duration-300"
                                    style="
                                        padding: 2px;
                                        background: {plan === 'half' ? 'rgba(245,158,11,0.2)' : plan === 'single' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.12)'};
                                        border: 1.5px solid {plan === 'half' ? 'rgba(245,158,11,0.7)' : plan === 'single' ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.3)'};
                                    "
                                >
                                    <!-- Half-year segment (right in RTL = first child) -->
                                    <button
                                        type="button"
                                        onclick={() => setPlan(row.num, 'half')}
                                        class="toggle-segment relative z-10 rounded-full px-3 text-xs font-black transition-all duration-200 whitespace-nowrap leading-none flex items-center"
                                        style="background: {plan === 'half' ? '#f59e0b' : 'transparent'}; color: {plan === 'half' ? '#000' : plan ? '#9ca3af' : '#e5e7eb'};"
                                        title="חצי שנה"
                                    >½שנה</button>

                                    {#if !plan}
                                        <span class="self-center text-white/50 text-xs font-black mx-0.5 flex-shrink-0 leading-none">/</span>
                                    {/if}

                                    <!-- Single-month segment (left in RTL = second child) -->
                                    <button
                                        type="button"
                                        onclick={() => setPlan(row.num, 'single')}
                                        class="toggle-segment relative z-10 rounded-full px-3 text-xs font-black transition-all duration-200 whitespace-nowrap leading-none flex items-center"
                                        style="background: {plan === 'single' ? '#3b82f6' : 'transparent'}; color: {plan === 'single' ? '#fff' : plan ? '#9ca3af' : '#e5e7eb'};"
                                        title="חודש בודד"
                                    >חודש</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- ===== Calculator Banner ===== -->
    {#if hasSelection}
        <div bind:this={calculatorEl}
             class="mb-12 rounded-2xl border-2 border-white/20 bg-gradient-to-br from-gray-900 to-gray-950 p-6 md:p-8 shadow-2xl scroll-mt-4"
             style="animation: slideDown 0.3s ease-out;">

            <!-- Title -->
            <div class="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span class="text-3xl">🧮</span>
                <h2 class="text-xl md:text-2xl font-black text-white">מחשבון פרסום</h2>
                <span class="bg-white/10 border border-white/20 text-gray-300 text-xs font-black px-2 py-0.5 rounded-full">
                    {planMap.size} נבחרו
                </span>
                {#if neighborhoodCount > 1}
                    <span class="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black px-2 py-0.5 rounded-full">
                        × {fmt(neighborhoodCount)} שכונות
                    </span>
                {/if}
                {#if isJerusalemOnly}
                    <span class="bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-black px-2 py-0.5 rounded-full">
                        🎉 הנחת ירושלים — ₪{JERUSALEM_FLAT}/שכונה
                    </span>
                {/if}
            </div>

            <!-- Selected items breakdown -->
            <div class="bg-black/40 rounded-xl border border-white/10 mb-6 overflow-hidden">
                <div class="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">פרסומות שנבחרו</p>
                    <div class="flex gap-3 text-[10px]">
                        {#if halfItems.length > 0}
                            <span class="text-amber-400 font-bold">🟡 {halfItems.length} חצי שנה</span>
                        {/if}
                        {#if singleItems.length > 0}
                            <span class="text-blue-400 font-bold">🔵 {singleItems.length} חודש בודד</span>
                        {/if}
                    </div>
                </div>
                <ul class="divide-y divide-white/5">
                    {#each selectedItems as item}
                        <li class="flex items-center justify-between px-4 py-3 gap-3">
                            <div class="flex items-center gap-2 min-w-0">
                                <button
                                    type="button"
                                    onclick={() => { const n = new Map(planMap); n.delete(item.num); planMap = n; }}
                                    class="text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                                    aria-label="הסר"
                                >✕</button>
                                <span class="font-bold text-sm truncate
                                    {item.plan === 'half' ? 'text-amber-200' : 'text-blue-200'}">{item.type}</span>
                            </div>
                            <div class="flex items-center gap-3 flex-shrink-0">
                                <!-- Plan badge -->
                                <span class="text-[10px] font-black px-2 py-0.5 rounded-full
                                    {item.plan === 'half'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}">
                                    {item.plan === 'half' ? '½ שנה' : 'חודש'}
                                </span>
                                <!-- Price -->
                                <div class="flex flex-col items-end gap-0.5">
                                    <span class="font-black text-sm {item.plan === 'half' ? 'text-amber-400' : 'text-blue-400'}">
                                        ₪{fmt(item.eTotal * item.multiplier)}
                                    </span>
                                    {#if item.flatNational}
                                        <span class="text-gray-600 text-[10px] whitespace-nowrap">
                                            ארצי • {item.plan === 'half' ? 'ל-6 חודשים' : 'לחודש'}
                                        </span>
                                    {:else if neighborhoodCount > 1}
                                        <span class="text-gray-600 text-[10px] whitespace-nowrap">
                                            ₪{fmt(item.eTotal)} × {fmt(neighborhoodCount)}
                                        </span>
                                    {:else}
                                        <span class="text-gray-600 text-xs">
                                            {item.plan === 'half' ? 'ל-6 חודשים' : 'לחודש'}
                                        </span>
                                    {/if}
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Total -->
            <div class="rounded-2xl border-2 border-white/20 bg-white/5 p-6 text-center mb-6">
                <p class="text-gray-300 text-base md:text-lg mb-3 font-bold">סה"כ לתשלום</p>
                <!-- Per-item math breakdown — rate × neighborhoods × months -->
                <div class="space-y-1.5 mb-4">
                    {#each selectedItems as item}
                        <p class="text-gray-100 text-base md:text-lg font-bold leading-snug">
                            <span class="{item.plan === 'half' ? 'text-amber-300' : 'text-blue-300'}">{item.type}:</span>
                            <span class="text-white">₪{fmt(item.eMonthly)}</span>
                            {#if item.flatNational}
                                <span class="text-gray-300 font-medium">לחודש</span>
                                <span class="text-gray-400 text-xs mx-1">(ארצי)</span>
                                {#if !isJerusalemOnly && item.monthsCount > 1}
                                    <span class="text-gray-400 mx-0.5">×</span>
                                    <span class="text-white">{item.monthsCount}</span>
                                    <span class="text-gray-300 font-medium">{item.monthsCount === 1 ? 'חודש' : 'חודשים'}</span>
                                {/if}
                            {:else}
                                <span class="text-gray-300 font-medium">לשכונה</span>
                                <span class="text-gray-400 mx-0.5">×</span>
                                <span class="text-white">{fmt(neighborhoodCount)}</span>
                                <span class="text-gray-300 font-medium">{neighborhoodCount === 1 ? 'שכונה' : 'שכונות'}</span>
                                {#if !isJerusalemOnly}
                                    <span class="text-gray-400 mx-0.5">×</span>
                                    <span class="text-white">{item.monthsCount}</span>
                                    <span class="text-gray-300 font-medium">{item.monthsCount === 1 ? 'חודש' : 'חודשים'}</span>
                                {/if}
                            {/if}
                            <span class="text-gray-400 mx-1">=</span>
                            <span class="{item.plan === 'half' ? 'text-amber-300' : 'text-blue-300'} font-black">₪{fmt(item.eTotal * item.multiplier)}</span>
                        </p>
                    {/each}
                </div>
                <p class="text-5xl md:text-6xl font-black text-white mb-2">₪{fmt(totalPayment)}</p>
                <p class="text-gray-500 text-sm">
                    {#if halfItems.length > 0 && singleItems.length > 0}
                        כולל {halfItems.length} חבילות חצי שנה + {singleItems.length} חודשים בודדים
                    {:else if halfItems.length > 0}
                        חבילת חצי שנה • שווה ₪{fmt(totalMonthly)} לחודש
                    {:else}
                        {singleItems.length} פרסומות לחודש אחד
                    {/if}
                </p>
            </div>

            <!-- Breakdown cards (only if both plan types selected) -->
            {#if halfItems.length > 0 && singleItems.length > 0}
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                        <p class="text-[10px] text-amber-400/70 font-bold uppercase mb-1">חצי שנה</p>
                        <p class="text-xl font-black text-amber-400">₪{fmt(halfItems.reduce((s,r) => s + r.eTotal * r.multiplier, 0))}</p>
                        <p class="text-[10px] text-gray-500">{halfItems.length} פרסומות × 6 חודשים{neighborhoodCount > 1 ? ` × ${fmt(neighborhoodCount)}` : ''}</p>
                    </div>
                    <div class="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                        <p class="text-[10px] text-blue-400/70 font-bold uppercase mb-1">חודש בודד</p>
                        <p class="text-xl font-black text-blue-400">₪{fmt(singleItems.reduce((s,r) => s + r.eTotal * r.multiplier, 0))}</p>
                        <p class="text-[10px] text-gray-500">{singleItems.length} פרסומות × חודש{neighborhoodCount > 1 ? ` × ${fmt(neighborhoodCount)}` : ''}</p>
                    </div>
                </div>
            {/if}

            <!-- ===== Email confirmation section ===== -->
            {#if emailSent}
                <!-- Success state -->
                <div class="rounded-2xl border-2 border-green-500/40 bg-green-900/20 p-5 text-center mb-4"
                     style="animation: slideDown 0.3s ease-out;">
                    <div class="text-3xl mb-2">✅</div>
                    <p class="text-green-300 font-black text-base mb-1">המייל נשלח בהצלחה!</p>
                    <p class="text-gray-400 text-sm">
                        שלחנו אישור הזמנה לכתובת
                        <span class="text-green-400 font-bold">{userEmail}</span>
                    </p>
                    <p class="text-gray-500 text-xs mt-2">ניצור איתך קשר תוך 24 שעות לתיאום הסופי</p>
                </div>
            {:else}
                <!-- Email input -->
                <div class="rounded-2xl border border-white/15 bg-white/3 p-5 mb-4"
                     style="animation: slideDown 0.25s ease-out;">
                    <p class="text-gray-300 text-sm font-bold mb-3 text-center flex items-center justify-center gap-2">
                        <span class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
                              style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75">4</span>
                        📧 קבל אישור הזמנה למייל
                    </p>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input
                            type="email"
                            bind:value={userEmail}
                            placeholder="your@email.com"
                            dir="ltr"
                            class="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3
                                   text-white placeholder:text-gray-600 text-sm
                                   focus:outline-none focus:border-amber-500/60 focus:bg-amber-900/10
                                   transition-all"
                            onkeydown={(e) => { if (e.key === 'Enter') sendOrderEmail(); }}
                        />
                        <button
                            type="button"
                            onclick={sendOrderEmail}
                            disabled={emailSending}
                            class="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3
                                   font-black text-sm transition-all shadow-lg
                                   {emailSending
                                       ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                       : 'bg-amber-500 hover:bg-amber-400 text-black hover:scale-105 shadow-amber-500/20'}"
                        >
                            {#if emailSending}
                                <span class="inline-block w-4 h-4 border-2 border-gray-500 border-t-amber-400 rounded-full"
                                      style="animation: spin 0.7s linear infinite;"></span>
                                שולח…
                            {:else}
                                ✉️ שלח אישור — ₪{fmt(totalPayment)}
                            {/if}
                        </button>
                    </div>
                    {#if emailError}
                        <p class="text-red-400 text-xs mt-2 text-center font-bold">{emailError}</p>
                    {/if}
                </div>
            {/if}

            <!-- CTA buttons -->
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                    href="https://wa.me/972500000000?text=שלום, אני מעוניין לפרסם: {selectedItems.map(r => r.type).join(', ')}. סה״כ ₪{fmt(totalPayment)}."
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="שלח הזמנת פרסום בוואטסאפ (נפתח בחלון חדש)"
                    class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 shadow-lg shadow-green-500/20"
                >
                    💬 שלח בוואטסאפ
                </a>
            </div>

            <!-- Clear -->
            <div class="text-center mt-4">
                <button
                    type="button"
                    onclick={() => planMap = new Map()}
                    class="text-xs text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2"
                >נקה בחירה</button>
            </div>
        </div>

    {:else}
        <!-- Empty state -->
        <div class="mb-12 rounded-2xl border-2 border-dashed border-white/10 bg-white/2 p-5 text-center">
            <p class="text-gray-500 text-sm">
                🧮 בחר את סוג הפרסום ותקופתו כדי לראות את
                <span class="text-white font-bold">סיכום המחיר!</span>
            </p>
        </div>
    {/if}

    <!-- Secure Payment -->
    <div class="mt-8 rounded-2xl bg-white/3 border border-white/10 p-6 md:p-8" dir="rtl">
        <h2 class="text-xl md:text-2xl font-black text-white mb-2 text-center flex items-center justify-center gap-2">
            <span class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
                  style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75">4</span>
            🔒 תשלום מאובטח
        </h2>
        <p class="text-gray-400 text-sm text-center mb-6">
            התשלום מתבצע בצורה מאובטחת דרך חברת הסליקה — פרטי האשראי שלך לא מגיעים אלינו
        </p>

        <div class="flex flex-wrap justify-center gap-3 mb-6">
            {#each ["Visa", "Mastercard", "American Express", "Bit", "PayPal"] as method}
                <div class="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm font-bold text-gray-300">{method}</div>
            {/each}
        </div>

        <div class="rounded-xl border-2 border-dashed border-blue-500/40 bg-blue-900/10 p-6 text-center">
            <div class="text-3xl mb-3">💳</div>
            <h3 class="text-white font-black mb-1">סליקה מאובטחת</h3>
            <p class="text-gray-400 text-sm mb-4">מחוברים לחברת סליקה מורשית — עסקה מאובטחת ב-SSL</p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://meshulam.co.il" target="_blank" rel="noopener noreferrer"
                   aria-label="לדף התשלום – משולם (נפתח בחלון חדש)"
                   class="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105">
                    🔗 לדף התשלום — משולם
                </a>
                <a href="https://grow.co.il" target="_blank" rel="noopener noreferrer"
                   aria-label="לדף התשלום – Grow (נפתח בחלון חדש)"
                   class="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105">
                    🔗 לדף התשלום — Grow
                </a>
            </div>
            <p class="text-gray-600 text-xs mt-4">* לאחר השלמת הרכישה נצור איתכם קשר לתיאום פרסום תוך 24 שעות</p>
        </div>

        <div class="flex flex-wrap justify-center gap-4 mt-5">
            {#each [
                { icon: "🔒", label: "SSL מאובטח" },
                { icon: "✅", label: "PCI DSS תקן" },
                { icon: "🏦", label: "בנק ישראל מורשה" },
                { icon: "↩️", label: "החזר כספי תוך 14 יום" },
            ] as badge}
                <div class="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                </div>
            {/each}
        </div>
    </div>

    <!-- Contact CTA -->
    <div class="mt-6 rounded-2xl bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-2 border-amber-500/40 p-4 md:p-6 text-center">
        <h2 class="text-lg md:text-xl font-black text-amber-400 mb-3">ליצירת קשר אנושי</h2>
        <div class="flex flex-col sm:flex-row gap-2 justify-center">
            <a href="mailto:ads@shchuna.co.il"
               class="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 shadow-lg shadow-amber-500/30">
                ✉️ שלח מייל
            </a>
            <a href="https://wa.me/972500000000" target="_blank" rel="noopener noreferrer"
               aria-label="צור קשר בוואטסאפ (נפתח בחלון חדש)"
               class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 shadow-lg shadow-green-500/30">
                💬 וואטסאפ
            </a>
        </div>
        <p class="text-gray-500 text-xs mt-3">ads@shchuna.co.il</p>
    </div>
</div>

<!-- Tutorial checkmark splash -->
{#if showCheckmark}
    <div class="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
         aria-hidden="true">
        <div class="w-32 h-32 rounded-full bg-green-500/30 border-4 border-green-400 flex items-center justify-center backdrop-blur"
             style="animation: checkPop 0.9s ease-out;">
            <span class="text-7xl">✓</span>
        </div>
    </div>
{/if}

<!-- Toast: neighborhood reminder -->
{#if toastVisible}
    <div
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-max max-w-xs md:max-w-sm"
        style="animation: slideUp 0.3s ease-out;"
        dir="rtl"
    >
        <div class="rounded-2xl bg-gray-900 border border-amber-500/50 shadow-2xl px-5 py-4 flex items-start gap-3">
            <span class="text-2xl flex-shrink-0">📍</span>
            <div class="flex-1 min-w-0">
                <p class="text-white font-bold text-sm leading-snug">
                    מפרסם ב: <span class="text-amber-400">{neighborhoodLabel}</span>
                </p>
                <p class="text-gray-400 text-xs mt-0.5">רוצה לפרסם בשכונות נוספות?</p>
                <button
                    type="button"
                    onclick={() => { toastVisible = false; showPicker = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    class="text-amber-400 text-xs hover:text-amber-300 transition-colors mt-1 underline underline-offset-2 font-bold"
                >שנה שכונות ←</button>
            </div>
            <button
                type="button"
                onclick={() => toastVisible = false}
                class="text-gray-600 hover:text-white transition-colors text-sm flex-shrink-0 mt-0.5"
                aria-label="סגור"
            >✕</button>
        </div>
    </div>
{/if}

<style>
    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 16px); }
        to   { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    @keyframes tapBounce {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-3px); }
    }
    @keyframes softFloat {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-4px); }
    }
    @keyframes gentleHover {
        0%, 100% { transform: translateY(0) scale(1); }
        50%      { transform: translateY(-5px) scale(1.03); }
    }
    /* Use a class so Svelte keeps the keyframe (inline-style refs may be tree-shaken) */
    :global(.tutorial-finger) {
        display: inline-block;
        animation: gentleHover 2.6s ease-in-out infinite !important;
        will-change: transform;
    }
    /* Toggle button hover feedback */
    :global(.toggle-segment) {
        cursor: pointer;
    }
    :global(.toggle-segment:hover) {
        transform: scale(1.08);
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.45);
    }
    :global(.toggle-segment:active) {
        transform: scale(0.95);
    }
    @keyframes dealPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        50%      { transform: scale(1.05); box-shadow: 0 0 8px 1px rgba(245, 158, 11, 0.4); }
    }
    @keyframes checkPop {
        0%   { opacity: 0; transform: scale(0.4); }
        45%  { opacity: 1; transform: scale(1.15); }
        70%  { transform: scale(0.95); }
        100% { opacity: 0; transform: scale(1); }
    }

    /* Step 2 partial highlight — outlines all cells in the row except the toggle column (last td) */
    :global(tr.partial-highlight > td) {
        box-shadow: inset 0 2px 0 #fbbf24, inset 0 -2px 0 #fbbf24;
    }
    :global(tr.partial-highlight > td:first-child) {
        box-shadow: inset 0 2px 0 #fbbf24, inset 0 -2px 0 #fbbf24, inset -2px 0 0 #fbbf24;
    }
    :global(tr.partial-highlight > td:nth-last-child(2)) {
        box-shadow: inset 0 2px 0 #fbbf24, inset 0 -2px 0 #fbbf24, inset 2px 0 0 #fbbf24;
    }
    :global(tr.partial-highlight > td:last-child) {
        box-shadow: none;
    }

    /* Step 3 checkmark pop — plays once when a plan is selected, then fades */
    @keyframes confirmCheckPop {
        0%   { opacity: 0; transform: scale(0); }
        35%  { opacity: 1; transform: scale(1.35); }
        60%  { opacity: 1; transform: scale(1); }
        85%  { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.05); }
    }
    :global(.confirm-check-pop > span) {
        animation: confirmCheckPop 0.7s ease-out forwards;
    }
</style>
