<script lang="ts">
	import { onMount } from 'svelte';
	import { neighborhoodState } from '$lib/neighborhoodState.svelte';
	import { getCoordsFor, type Coord } from '$lib/neighborhoodCoords';

	// טיפוס מקומי — לא מייבאים מ-$lib/server (אסור בקומפוננטת client)
	interface Item {
		id: string; label: string; description: string; icon: string;
		city: string; neighborhood: string; phone: string; contact: string;
		category: string; created_at: string; status: string;
		extra_fields?: string;        // JSON string
		view_count?: number;
	}

	let { data } = $props();

	onMount(() => {
		neighborhoodState.init(data.userNeighborhood ?? null, data.userCity ?? null);
	});

	// חיפוש וסינון
	let searchQuery   = $state('');
	let selectedCity  = $state('');
	let foodTypeFilter = $state<'all' | 'fast' | 'restaurant'>('all'); // לקטגוריית restaurants
	let hallUsageFilter = $state<'all' | 'events' | 'classes'>('all'); // לקטגוריית halls
	let topTenOnly    = $state(false);

	function hallMatchesUsage(item: Item, usage: 'events' | 'classes'): boolean {
		try {
			const ef = item.extra_fields ? JSON.parse(item.extra_fields) : {};
			const raw = ef.usage_type ?? '';
			const types: string[] = Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim());
			const haystack = (types.join(' ') + ' ' + (item.label ?? '') + ' ' + (item.description ?? '')).toLowerCase();
			if (usage === 'events') {
				return /אירוע|חתונה|בר.?מצוה|בת.?מצוה|הולדת|הרצא|סדנ/.test(haystack);
			}
			return /חוג|קבוע|שיעור|סטודיו|אימון/.test(haystack);
		} catch {
			return false;
		}
	}

	// מילות-מפתח לזיהוי "מזון מהיר"
	const fastFoodKeywords = [
		'פיצה','פלאפל','שווארמה','המבורגר','בורגר','טוסט','סושי','שניצל','חומוס','פסטה',
		'נקניקיה','כריך','סנדוויץ','קרפ','מאפה','בורקס','דונאט','דונאטס','בייגל','טאקו',
		'fast','pizza','burger','sushi','falafel','shawarma','sandwich'
	];
	function isFastFood(item: Item): boolean {
		try {
			const ef = item.extra_fields ? JSON.parse(item.extra_fields) : {};
			const haystack = [
				ef.food_type ?? '',
				item.label ?? '',
				item.description ?? '',
			].join(' ').toLowerCase();
			return fastFoodKeywords.some((k) => haystack.includes(k.toLowerCase()));
		} catch {
			return false;
		}
	}

	// ====== Mock fallback לאולמות (לפי המדיניות — דוגמאות עד שיש פריטים אמיתיים) ======
	const mockHalls: Item[] = [
		{
			id: 'mock-hall-1', label: 'אולם "היכל שלמה"',
			description: 'אולם אירועים מרכזי לחתונות, בר/בת מצוות וברית. עד 400 איש, חניה צמודה, כשרות מהדרין.',
			icon: '🏛️', city: 'ירושלים', neighborhood: 'קרית משה',
			phone: '02-6512345', contact: 'משה ברנשטיין', category: 'halls',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), status: 'active',
			extra_fields: JSON.stringify({ usage_type: 'אירועים, חתונה, בר מצווה', capacity: '400', price_range: '₪₪₪' }),
			view_count: 318,
		},
		{
			id: 'mock-hall-2', label: 'סטודיו "מרכז התנועה"',
			description: 'חלל לחוגי תנועה ויוגה, ריצוף פרקט, מראות, מקלחות. השכרה לפי שעה לחוגים קבועים.',
			icon: '🎨', city: 'תל אביב', neighborhood: 'פלורנטין',
			phone: '054-7891234', contact: 'גלית', category: 'halls',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), status: 'active',
			extra_fields: JSON.stringify({ usage_type: 'חוג, סטודיו, שיעור קבוע', capacity: '25', price_range: '₪' }),
			view_count: 142,
		},
		{
			id: 'mock-hall-3', label: 'אולם הקהילתי "בית ועד"',
			description: 'אולם רב-תכליתי לאירועים קטנים ובינוניים, הרצאות וסדנאות. תאורה מקצועית ומערכת שמע.',
			icon: '🎉', city: 'בני ברק', neighborhood: '',
			phone: '03-5778899', contact: 'הקהילה', category: 'halls',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), status: 'active',
			extra_fields: JSON.stringify({ usage_type: 'אירועים, הרצאה, סדנה', capacity: '120', price_range: '₪₪' }),
			view_count: 89,
		},
		{
			id: 'mock-hall-4', label: 'חלל יצירה "בית המלאכה"',
			description: 'חלל פתוח לחוגי יצירה, ציור וקדרות לילדים ומבוגרים. מתאים לחוגים קבועים בשעות אחה״צ.',
			icon: '🖌️', city: 'ירושלים', neighborhood: 'בקעה',
			phone: '058-2233445', contact: 'נעמה', category: 'halls',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), status: 'active',
			extra_fields: JSON.stringify({ usage_type: 'חוג, סטודיו, חוג קבוע', capacity: '20', price_range: '₪' }),
			view_count: 64,
		},
		{
			id: 'mock-hall-5', label: 'אולם שמחות "פאר היכלים"',
			description: 'אולם מפואר לחתונות וברי מצוות, תפריט עשיר, צוות מקצועי. אופציה להפרדה / אולם נשים.',
			icon: '💍', city: 'אשדוד', neighborhood: '',
			phone: '08-8645566', contact: 'משרד האולם', category: 'halls',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), status: 'active',
			extra_fields: JSON.stringify({ usage_type: 'אירועים, חתונה, בת מצווה', capacity: '600', price_range: '₪₪₪₪' }),
			view_count: 506,
		},
		{
			id: 'mock-hall-6', label: 'סטודיו פילאטיס "Core"',
			description: 'סטודיו מאובזר במכשירי רפורמר וקאדילק להשכרה למאמני פילאטיס לחוגים קבועים.',
			icon: '🧘', city: 'רעננה', neighborhood: '',
			phone: '052-9911223', contact: 'יעל', category: 'halls',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), status: 'active',
			extra_fields: JSON.stringify({ usage_type: 'חוג, אימון, סטודיו', capacity: '12', price_range: '₪₪' }),
			view_count: 73,
		},
	];

	let effectiveItems = $derived<Item[]>(
		data.categoryId === 'halls' && (data.items as Item[]).length === 0
			? mockHalls
			: (data.items as Item[])
	);

	// ערים ייחודיות מתוך הפריטים
	let availableCities = $derived(
		[...new Set(effectiveItems.map((i) => i.city).filter(Boolean))].sort()
	);

	// פריטים מסוננים
	let filteredItems = $derived.by(() => {
		const items = effectiveItems.filter((item) => {
			const matchSearch =
				!searchQuery ||
				item.label.includes(searchQuery) ||
				(item.description ?? '').includes(searchQuery) ||
				(item.neighborhood ?? '').includes(searchQuery) ||
				(item.city ?? '').includes(searchQuery);
			const matchCity = !selectedCity || item.city === selectedCity;

			// סינון מזון מהיר/מסעדה — רלוונטי רק לקטגוריית restaurants
			let matchFoodType = true;
			if (data.categoryId === 'restaurants' && foodTypeFilter !== 'all') {
				const fast = isFastFood(item);
				matchFoodType = foodTypeFilter === 'fast' ? fast : !fast;
			}

			// סינון שימוש (אירועים/חוגים) — רלוונטי רק לקטגוריית halls
			let matchHallUsage = true;
			if (data.categoryId === 'halls' && hallUsageFilter !== 'all') {
				matchHallUsage = hallMatchesUsage(item, hallUsageFilter);
			}

			return matchSearch && matchCity && matchFoodType && matchHallUsage;
		});

		// טופ 10 — מיון לפי view_count יורד וחיתוך ל-10 ראשונים
		if (topTenOnly) {
			return [...items]
				.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
				.slice(0, 10);
		}
		return items;
	});

	// צבע לפי קטגוריה
	const colorMap: Record<string, string> = {
		singles:     'from-red-600 to-pink-700',
		security:    'from-green-600 to-teal-700',
		attractions: 'from-indigo-600 to-purple-700',
		jobs:        'from-blue-600 to-cyan-700',
		restaurants: 'from-orange-600 to-amber-700',
		halls:       'from-teal-600 to-emerald-700',
	};
	const cardBorderMap: Record<string, string> = {
		singles:     'border-red-500/30 hover:border-red-500/60',
		security:    'border-green-500/30 hover:border-green-500/60',
		attractions: 'border-indigo-500/30 hover:border-indigo-500/60',
		jobs:        'border-blue-500/30 hover:border-blue-500/60',
		restaurants: 'border-orange-500/30 hover:border-orange-500/60',
		halls:       'border-teal-500/30 hover:border-teal-500/60',
	};
	const badgeMap: Record<string, string> = {
		singles:     'bg-red-500/20 text-red-300 border-red-500/30',
		security:    'bg-green-500/20 text-green-300 border-green-500/30',
		attractions: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
		jobs:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
		restaurants: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
		halls:       'bg-teal-500/20 text-teal-300 border-teal-500/30',
	};

	let gradient   = $derived(colorMap[data.categoryId]   ?? 'from-purple-600 to-blue-700');
	let cardBorder = $derived(cardBorderMap[data.categoryId] ?? 'border-purple-500/30 hover:border-purple-500/60');
	let badge      = $derived(badgeMap[data.categoryId]    ?? 'bg-purple-500/20 text-purple-300 border-purple-500/30');

	// ====== חלוקה לסקציות לפי מיקום המשתמש ======
	function haversineKm(a: Coord, b: Coord): number {
		const toRad = (d: number) => (d * Math.PI) / 180;
		const R = 6371;
		const dLat = toRad(b[0] - a[0]);
		const dLon = toRad(b[1] - a[1]);
		const lat1 = toRad(a[0]);
		const lat2 = toRad(b[0]);
		const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
		return 2 * R * Math.asin(Math.sqrt(h));
	}

	// 0 = בשכונה שלי | 1 = בעיר שלי | 2 = בערים סביבי | 3 = ארצי
	const SECTION_TITLES = ['בשכונה שלי', 'בעיר שלי', 'בערים סביבי', 'ארצי'];

	function sectionFor(item: Item, uN: string, uC: string): number {
		const sCoord = getCoordsFor(item.neighborhood, item.city);
		const uCoord = getCoordsFor(uN, uC);
		const dist = haversineKm(sCoord, uCoord);
		if (item.city === uC) {
			if (item.neighborhood === uN || dist < 3) return 0;
			return 1;
		}
		if (dist < 35) return 2;
		return 3;
	}

	type SectionedItem = Item & { _section: number; _dist: number };

	let sectionedItems = $derived.by<SectionedItem[]>(() => {
		const uN = neighborhoodState.neighborhood;
		const uC = neighborhoodState.city;
		const uCoord = getCoordsFor(uN, uC);
		return filteredItems.map((it) => {
			const sCoord = getCoordsFor(it.neighborhood, it.city);
			return {
				...it,
				_section: sectionFor(it, uN, uC),
				_dist: haversineKm(sCoord, uCoord),
			};
		}).sort((a, b) => {
			if (a._section !== b._section) return a._section - b._section;
			return a._dist - b._dist;
		});
	});

	let groupedSections = $derived.by(() => {
		const groups: { section: number; items: SectionedItem[] }[] = [];
		for (const it of sectionedItems) {
			const last = groups[groups.length - 1];
			if (!last || last.section !== it._section) groups.push({ section: it._section, items: [it] });
			else last.items.push(it);
		}
		return groups;
	});
</script>

<svelte:head>
	<title>{data.meta.title} | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen" dir="rtl">

	<!-- ===== Hero Header ===== -->
	<div class="relative overflow-hidden rounded-3xl mb-8 mx-4 md:mx-0">
		<div class="absolute inset-0 bg-gradient-to-br {gradient} opacity-90"></div>
		<div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
		<div class="relative px-6 py-10 md:py-14 text-center">
			<div class="text-6xl md:text-7xl mb-4">{data.config.icon}</div>
			<h1 class="text-3xl md:text-4xl font-black text-white mb-2">{data.meta.title}</h1>
			<p class="text-white/70 text-sm md:text-base mb-4">
				רשימה ארצית · כל הארץ · {effectiveItems.length} מודעות
			</p>
			<div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
				<span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
				<span class="text-white/90 text-sm font-medium">מתעדכן בזמן אמת</span>
			</div>
		</div>
	</div>

	<!-- ===== כפתור הוספה עליון ===== -->
	<div class="flex justify-center mb-6 px-4 md:px-0">
		<a
			href="/add/{data.categoryId}"
			class="inline-flex items-center gap-2 bg-gradient-to-r {gradient} hover:opacity-90 text-white font-bold
			       px-6 py-3 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5"
		>
			<span class="text-lg">＋</span>
			<span>הוסף {data.config.label} משלך</span>
		</a>
	</div>

	{#if data.categoryId === 'halls' && (data.items as Item[]).length === 0}
		<div class="mx-4 md:mx-0 mb-6 bg-teal-500/10 border border-teal-500/30 rounded-2xl px-4 py-3 text-center">
			<p class="text-teal-200 text-xs md:text-sm">
				✨ אלו דוגמאות בלבד — היה הראשון לפרסם אולם או חלל אמיתי בקטגוריה!
			</p>
		</div>
	{/if}

	<!-- ===== סינון + חיפוש ===== -->
	<div class="flex flex-col md:flex-row gap-3 mb-6 px-4 md:px-0">

		<!-- חיפוש חופשי -->
		<div class="flex-1 relative">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="🔍  חיפוש חופשי..."
				class="w-full bg-[#0f172a] border border-white/10 focus:border-purple-500/50 rounded-2xl
				       px-5 py-3 text-white placeholder-gray-500 text-sm outline-none transition-colors"
			/>
			{#if searchQuery}
				<button
					onclick={() => (searchQuery = '')}
					class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors text-lg cursor-pointer"
				>×</button>
			{/if}
		</div>

		<!-- סינון לפי עיר -->
		{#if availableCities.length > 0}
			<select
				bind:value={selectedCity}
				class="bg-[#0f172a] border border-white/10 focus:border-purple-500/50 rounded-2xl
				       px-5 py-3 text-white text-sm outline-none appearance-none transition-colors min-w-[160px]"
			>
				<option value="" style="background:#fff;color:#0f172a;">📍 כל הערים</option>
				{#each availableCities as c}
					<option value={c} style="background:#fff;color:#0f172a;">{c}</option>
				{/each}
			</select>
		{/if}
	</div>

	<!-- ===== סינונים ייחודיים לאולמות/חללים ===== -->
	{#if data.categoryId === 'halls'}
		<div class="flex flex-wrap items-center gap-2 mb-6 px-4 md:px-0">
			<div class="inline-flex bg-[#0f172a] border border-white/10 rounded-2xl p-1">
				<button
					type="button"
					onclick={() => (hallUsageFilter = 'all')}
					class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
					       {hallUsageFilter === 'all' ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow' : 'text-gray-400 hover:text-white'}"
				>🏛️ הכל</button>
				<button
					type="button"
					onclick={() => (hallUsageFilter = 'events')}
					class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
					       {hallUsageFilter === 'events' ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow' : 'text-gray-400 hover:text-white'}"
				>🎉 לאירועים</button>
				<button
					type="button"
					onclick={() => (hallUsageFilter = 'classes')}
					class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
					       {hallUsageFilter === 'classes' ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow' : 'text-gray-400 hover:text-white'}"
				>🎨 לחוגים קבועים</button>
			</div>
		</div>
	{/if}

	<!-- ===== סינונים ייחודיים למסעדות ===== -->
	{#if data.categoryId === 'restaurants'}
		<div class="flex flex-wrap items-center gap-2 mb-6 px-4 md:px-0">
			<!-- סוג מזון -->
			<div class="inline-flex bg-[#0f172a] border border-white/10 rounded-2xl p-1">
				<button
					type="button"
					onclick={() => (foodTypeFilter = 'all')}
					class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
					       {foodTypeFilter === 'all' ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow' : 'text-gray-400 hover:text-white'}"
				><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="הכל" /> הכל</button>
				<button
					type="button"
					onclick={() => (foodTypeFilter = 'fast')}
					class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
					       {foodTypeFilter === 'fast' ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow' : 'text-gray-400 hover:text-white'}"
				>🍔 מזון מהיר</button>
				<button
					type="button"
					onclick={() => (foodTypeFilter = 'restaurant')}
					class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
					       {foodTypeFilter === 'restaurant' ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow' : 'text-gray-400 hover:text-white'}"
				>🍷 מסעדה</button>
			</div>

			<!-- טופ 10 -->
			<button
				type="button"
				onclick={() => (topTenOnly = !topTenOnly)}
				class="px-4 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer
				       {topTenOnly
				         ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400 shadow-lg'
				         : 'bg-[#0f172a] border-white/10 text-gray-300 hover:text-white hover:border-yellow-400/40'}"
			>
				⭐ טופ 10 הפופולריות
			</button>
		</div>
	{/if}

	<!-- ===== תוצאות ===== -->
	{#if filteredItems.length === 0}
		<div class="text-center py-20 px-4">
			{#if data.items.length === 0}
				<div class="text-6xl mb-4">📭</div>
				<h2 class="text-xl font-bold text-white mb-2">אין מודעות עדיין</h2>
				<p class="text-gray-400 text-sm mb-6">היה ראשון לפרסם בקטגוריה זו!</p>
				<a
					href="/add/{data.categoryId}"
					class="inline-block bg-gradient-to-r {gradient} text-white font-bold px-6 py-3 rounded-xl
					       shadow-lg hover:-translate-y-0.5 transition-all"
				>
					{data.config.icon} פרסם מודעה
				</a>
			{:else}
				<div class="text-5xl mb-4">🔎</div>
				<p class="text-gray-400">לא נמצאו תוצאות{searchQuery ? ` לחיפוש "${searchQuery}"` : ''}</p>
				<button
					onclick={() => { searchQuery = ''; selectedCity = ''; foodTypeFilter = 'all'; hallUsageFilter = 'all'; topTenOnly = false; }}
					class="mt-4 text-purple-400 hover:text-purple-300 text-sm underline cursor-pointer"
				>
					נקה סינון
				</button>
			{/if}
		</div>
	{:else}
		<!-- כמות תוצאות -->
		<p class="text-gray-500 text-sm mb-4 px-4 md:px-0">
			מציג <span class="text-white font-bold">{filteredItems.length}</span> מודעות
			{#if topTenOnly}
				<span class="mr-2 text-yellow-400 font-bold">⭐ טופ 10</span>
			{/if}
			{#if searchQuery || selectedCity || foodTypeFilter !== 'all' || hallUsageFilter !== 'all' || topTenOnly}
				<button
					onclick={() => { searchQuery = ''; selectedCity = ''; foodTypeFilter = 'all'; hallUsageFilter = 'all'; topTenOnly = false; }}
					class="mr-2 text-purple-400 hover:text-purple-300 underline cursor-pointer"
				>
					נקה סינון
				</button>
			{/if}
		</p>

		<!-- ===== תוצאות לפי קומות (בשכונה שלי / בעיר שלי / סביבי / ארצי) ===== -->
		{#each groupedSections as group (group.section)}
			<div class="flex items-center gap-3 mt-8 mb-4 first:mt-0 px-4 md:px-0">
				<h2 class="text-white font-black text-xl md:text-2xl whitespace-nowrap">
					{SECTION_TITLES[group.section]}
					{#if group.section === 0 && neighborhoodState.neighborhood}
						<span class="text-teal-300 font-bold">— {neighborhoodState.neighborhood}</span>
					{:else if group.section === 1 && neighborhoodState.city}
						<span class="text-teal-300 font-bold">— {neighborhoodState.city}</span>
					{/if}
				</h2>
				<span class="text-gray-500 text-xs md:text-sm">({group.items.length})</span>
				<div class="flex-1 h-px bg-gradient-to-l from-white/20 via-white/10 to-transparent"></div>
			</div>

		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-4 md:px-0">
			{#each group.items as item, idx}
				<a
					href="/items/{item.id}"
					class="block bg-[#0f172a] rounded-2xl border {cardBorder} p-5 transition-all
					       hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-900/20 group relative"
				>
					{#if topTenOnly && idx < 10}
						<div class="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-[#0f172a]">
							#{idx + 1}
						</div>
					{/if}
					<div class="flex items-start gap-3">
						<span class="text-3xl flex-shrink-0 mt-0.5">{item.icon}</span>
						<div class="min-w-0 flex-1">

							<!-- כותרת + badge -->
							<div class="flex items-start justify-between gap-2 mb-1">
								<h3 class="text-white font-bold text-sm group-hover:text-purple-300 transition-colors truncate">
									{item.label}
								</h3>
								<span class="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold {badge}">
									{#if data.categoryId === 'restaurants'}
										{isFastFood(item) ? '🍔 מהיר' : '🍷 מסעדה'}
									{:else if data.categoryId === 'halls'}
										{hallMatchesUsage(item, 'events') ? '🎉 אירועים' : hallMatchesUsage(item, 'classes') ? '🎨 חוגים' : '🏛️ אולם'}
									{:else}
										{data.config.icon}
									{/if}
								</span>
							</div>

							<!-- תיאור -->
							{#if item.description}
								<p class="text-gray-400 text-xs line-clamp-2 mb-2">{item.description}</p>
							{/if}

							<!-- מיקום -->
							{#if item.neighborhood || item.city}
								<div class="flex items-center gap-1 mb-2">
									<span class="text-purple-400/80 text-xs">📍</span>
									<span class="text-gray-400 text-xs">
										{[item.neighborhood, item.city].filter(Boolean).join(', ')}
									</span>
								</div>
							{/if}

							<!-- טלפון + קשר -->
							<div class="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
								{#if item.phone}
									<span class="text-green-400 text-xs font-medium">📞 {item.phone}</span>
								{/if}
								{#if item.contact}
									<span class="text-gray-400 text-xs truncate">👤 {item.contact}</span>
								{/if}
								<span class="text-gray-600 text-xs mr-auto">
									{new Date(item.created_at).toLocaleDateString('he-IL')}
								</span>
							</div>

						</div>
					</div>
				</a>
			{/each}
		</div>
		{/each}
	{/if}

	<!-- ===== CTA הוספת מודעה ===== -->
	<div class="mt-12 mb-6 text-center px-4 md:px-0">
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-8">
			<p class="text-gray-400 text-sm mb-4">
				יש לך {data.config.icon} {data.config.label}? פרסם בחינם!
			</p>
			<a
				href="/add/{data.categoryId}"
				class="inline-block bg-gradient-to-r {gradient} hover:opacity-90 text-white font-bold
				       px-8 py-3 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5"
			>
				+ הוסף מודעה
			</a>
			<div class="mt-4">
				<a href="/" class="text-gray-600 hover:text-gray-400 text-xs transition-colors">
					← חזרה לדף הבית
				</a>
			</div>
		</div>
	</div>

</div>
