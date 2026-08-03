<script lang="ts">
	import { goto } from '$app/navigation';
	import StatsSummaryChart from '$lib/components/StatsSummaryChart.svelte';
	import { mergeJuneIntoJuly } from '$lib/statsMonthMerge';

	let { data } = $props();

	const MONTH_NAMES = [
		'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
		'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
	];

	// שמות מקוצרים לתוויות הגרף (מתחת לעמודות)
	const MONTH_SHORT = [
		'ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני',
		'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳',
	];

	// חודש נוכחי (לסימון "בתהליך" - הספירה עוד נצברת)
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonthIdx = now.getMonth();

	const fmt = (n: number) => n.toLocaleString('he-IL');
	const neighborhoodLabel = $derived(
		((data.neighborhoods ?? []).join(', ') || 'השכונה שלי').replace(/\s*[()]\s*/g, ' ').trim()
	);

	// ---- סיכום הפריטים שהועלו בשכונה ----
	// שם עברי לכל קטגוריה (ה-slug ב-DB לא תמיד אינטואיטיבי)
	const CATEGORY_LABELS: Record<string, string> = {
		giveaway: 'למסירה',
		business: 'בייבי סיטר',
		minyanim: 'יהדות',
		education: 'חוגים',
		realestate: 'אירוח לשבת',
		security: 'צימרים',
		shops: 'חנויות',
		restaurants: 'מזון ומסעדות',
		rides: 'טרמפים ומסירות',
		ride: 'טרמפים ומסירות',
		jobs: 'דרושים',
		job: 'דרושים',
		singles: 'פנויים/פנויות',
		events: 'אירועים',
		event: 'אירועים',
		for_kids: 'לילדים',
		attractions: 'שירות ציבורי',
		halls: 'אולמות וחללים',
		sport: 'ספורט ופנאי',
		'safe-space': 'מרחב מוגן',
		gemachim: 'גמ"חים',
		gmach: 'גמ"חים',
		shabbat_hosting: 'אירוח לשבת',
		lost_and_found: 'אבידות ומציאות',
		nc_marketplace: 'לוח שכונתי',
	};
	const catLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat;

	const itemsSummary = $derived(data.itemsSummary ?? { total: 0, byCategory: [], byMonth: [] });

	// כל הקטגוריות הרשמיות — מוצגות תמיד, גם אם 0. aliases ממזגים slugs חלופיים.
	const CATEGORY_DEFS: { key: string; label: string; aliases: string[] }[] = [
		{ key: 'giveaway',       label: 'למסירה',         aliases: [] },
		{ key: 'business',       label: 'בייבי סיטר',      aliases: [] },
		{ key: 'minyanim',       label: 'יהדות',          aliases: [] },
		{ key: 'education',      label: 'חוגים',          aliases: [] },
		{ key: 'realestate',     label: 'אירוח לשבת',      aliases: ['shabbat_hosting'] },
		{ key: 'security',       label: 'צימרים',         aliases: [] },
		{ key: 'shops',          label: 'חנויות',         aliases: [] },
		{ key: 'restaurants',    label: 'מזון ומסעדות',    aliases: [] },
		{ key: 'rides',          label: 'טרמפים ומסירות',   aliases: ['ride'] },
		{ key: 'jobs',           label: 'דרושים',         aliases: ['job'] },
		{ key: 'singles',        label: 'פנויים/פנויות',    aliases: [] },
		{ key: 'events',         label: 'אירועים',        aliases: ['event'] },
		{ key: 'for_kids',       label: 'לילדים',         aliases: [] },
		{ key: 'attractions',    label: 'שירות ציבורי',    aliases: [] },
		{ key: 'halls',          label: 'אולמות וחללים',    aliases: [] },
		{ key: 'sport',          label: 'ספורט ופנאי',     aliases: [] },
		{ key: 'safe-space',     label: 'מרחב מוגן',       aliases: [] },
		{ key: 'gemachim',       label: 'גמ"חים',         aliases: ['gmach'] },
		{ key: 'lost_and_found', label: 'אבידות ומציאות',   aliases: [] },
	];

	// שורות התצוגה: כל הקטגוריות (כולל 0) + קטגוריות לא-מוכרות שנמצאו בפועל, ממוין יורד.
	const categoryRows = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const c of itemsSummary.byCategory) counts.set(c.category, c.count);
		const consumed = new Set<string>();
		const rows = CATEGORY_DEFS.map((def) => {
			let count = counts.get(def.key) ?? 0;
			consumed.add(def.key);
			for (const a of def.aliases) { count += counts.get(a) ?? 0; consumed.add(a); }
			return { label: def.label, count };
		});
		for (const c of itemsSummary.byCategory) {
			if (!consumed.has(c.category)) rows.push({ label: catLabel(c.category), count: c.count });
		}
		return rows.sort((a, b) => b.count - a.count);
	});
	const maxCat = $derived(Math.max(1, ...categoryRows.map((c) => c.count)));

	// פריטים שנוספו לפי חודש (השנה הנוכחית) — לגרף עמודות בכרטיס התוכן.
	// נתוני יוני מצורפים ליולי (טרום-השקה) כמו בגרף המסכם.
	const itemsByMonth = $derived.by(() => {
		const m = new Map<string, number>();
		for (const r of itemsSummary.byMonth) m.set(r.month, r.count);
		const series = Array.from({ length: 12 }, (_, i) => {
			const key = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
			return m.get(key) ?? 0;
		});
		return mergeJuneIntoJuly(series);
	});
	const maxItemsMonth = $derived(Math.max(1, ...itemsByMonth));

	// נרשמים חדשים בשכונה לפי חודש (השנה הנוכחית)
	const monthsOfYear = (byMonth: { month: string; count: number }[]): number[] => {
		const m = new Map(byMonth.map((r) => [r.month, r.count]));
		return Array.from({ length: 12 }, (_, i) => m.get(`${currentYear}-${String(i + 1).padStart(2, '0')}`) ?? 0);
	};
	// נתוני יוני מצורפים ליולי (טרום-השקה) כמו בגרף המסכם.
	const regSeries = $derived(mergeJuneIntoJuly(monthsOfYear(data.registrations?.byMonth ?? [])));
	const maxReg = $derived(Math.max(1, ...regSeries));

	const hasAnyData = $derived(itemsSummary.total > 0 || (data.registrations?.total ?? 0) > 0);
</script>

<svelte:head>
	<title>סטטיסטיקת שכונה | פאנל רכז</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white" dir="rtl">
	<div class="max-w-3xl mx-auto px-4 py-8">

		<!-- כותרת -->
		<div class="flex items-center justify-between gap-3 mb-2">
			<h1 class="text-3xl font-black">📈 סטטיסטיקת שכונה</h1>
			<button
				onclick={() => goto('/coordinator')}
				class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap"
			>
				→ לפאנל הרכז
			</button>
		</div>
		<p class="text-gray-400 mb-8">
			נתוני <strong class="text-white">{neighborhoodLabel}</strong>
			{#if data.isPreview}<span class="mr-2 text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">תצוגת סופר-אדמין</span>{/if}
		</p>

		<!-- גרף מסכם: פריטים + נרשמים בשכונה (כניסות נמדדות ברמת האתר בלבד ולכן מוסתרות) -->
		<div class="mb-6">
			<StatsSummaryChart itemsSummary={data.itemsSummary} registrations={data.registrations} hideVisits />
		</div>

		<!-- סיכום התוכן שהועלה בשכונה: סה״כ + פילוח לפי קטגוריה -->
		{#if itemsSummary.total > 0}
			<div id="items" class="scroll-mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
				<h2 class="text-lg font-black mb-3">📦 תוכן שהועלה בשכונה</h2>

				<!-- גרף עמודות: פריטים שנוספו לפי חודש (השנה הנוכחית) -->
				<div class="mb-5">
					<p class="text-xs text-gray-500 mb-2">פריטים שנוספו לפי חודש · {currentYear}</p>
					<div class="flex items-end gap-1 sm:gap-2 h-32 border-b border-white/10 pb-px">
						{#each itemsByMonth as cnt, i}
							{@const isCurrent = i === currentMonthIdx}
							<div class="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${MONTH_NAMES[i]}: ${fmt(cnt)} פריטים`}>
								<div class="text-[9px] sm:text-[11px] leading-none mb-1 tabular-nums {cnt === 0 ? 'text-transparent' : isCurrent ? 'text-emerald-300 font-black' : 'text-gray-400'}">
									{cnt === 0 ? '0' : fmt(cnt)}
								</div>
								<div
									class="w-full rounded-t-md transition-all duration-500 hover:brightness-125 {cnt === 0
										? 'bg-white/[0.04]'
										: isCurrent
											? 'bg-gradient-to-t from-emerald-500 to-teal-300 shadow-[0_0_14px_rgba(16,185,129,0.55)]'
											: 'bg-gradient-to-t from-emerald-600/70 to-emerald-400/90'}"
									style="height: {cnt === 0 ? 0 : Math.max(3, (cnt / maxItemsMonth) * 85)}%"
								></div>
							</div>
						{/each}
					</div>
					<div class="flex gap-1 sm:gap-2 mt-2">
						{#each MONTH_SHORT as short, i}
							<div class="flex-1 text-center text-[9px] sm:text-[11px] leading-tight whitespace-nowrap {i === currentMonthIdx ? 'text-emerald-300 font-bold' : 'text-gray-500'}">
								{short}
							</div>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
					{#each categoryRows as c}
						<div class="flex items-center gap-3">
							<span class="w-28 shrink-0 truncate text-sm {c.count === 0 ? 'text-gray-500' : 'text-gray-300'}" title={c.label}>{c.label}</span>
							<div class="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
								<div class="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400" style="width: {c.count === 0 ? 0 : Math.max(4, (c.count / maxCat) * 100)}%"></div>
							</div>
							<span class="w-8 text-left text-sm font-bold tabular-nums {c.count === 0 ? 'text-gray-600' : 'text-white'}">{fmt(c.count)}</span>
						</div>
					{/each}
				</div>

				<!-- קריאות עזרה מהקהילה בשכונה — משולב עם הפרטים, נבדל בצבע אמבר -->
				<div class="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
					<span class="flex items-center gap-1.5 font-black text-amber-300"><span>🆘</span> קריאות לעזרה מהקהילה</span>
					<span class="text-gray-400">סה״כ <b class="text-white tabular-nums">{fmt(data.helpCalls?.total ?? 0)}</b></span>
					<span class="text-gray-400">נענו <b class="text-emerald-300 tabular-nums">{fmt(data.helpCalls?.answered ?? 0)}</b></span>
					<span class="text-gray-400">ממתינות <b class="text-amber-300 tabular-nums">{fmt((data.helpCalls?.total ?? 0) - (data.helpCalls?.answered ?? 0))}</b></span>
				</div>

				<!-- סה״כ פריטים — בתחתית הכרטיס -->
				<div class="mt-3 pt-3 border-t border-white/10 text-sm text-gray-400 text-left">
					סה״כ <b class="text-emerald-300 text-base">{fmt(itemsSummary.total)}</b> פריטים פעילים בשכונה
				</div>
			</div>
		{/if}

		<!-- נרשמים חדשים בשכונה לפי חודש (גרף מפורט, צבע סגול) -->
		<div id="registrations" class="scroll-mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
				<h2 class="text-lg font-black">🧑‍🤝‍🧑 תושבים שנרשמו</h2>
				<div class="text-sm text-gray-400">סה״כ <b class="text-violet-300 text-base">{fmt(data.registrations?.total ?? 0)}</b> תושבים</div>
			</div>
			<p class="text-xs text-gray-500 mb-2">נרשמים לפי חודש · {currentYear}</p>
			<div class="flex items-end gap-1 sm:gap-2 h-32 border-b border-white/10 pb-px">
				{#each regSeries as cnt, i}
					{@const isCurrent = i === currentMonthIdx}
					<div class="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${MONTH_NAMES[i]}: ${fmt(cnt)} נרשמים`}>
						<div class="text-[9px] sm:text-[11px] leading-none mb-1 tabular-nums {cnt === 0 ? 'text-transparent' : isCurrent ? 'text-violet-300 font-black' : 'text-gray-400'}">
							{cnt === 0 ? '0' : fmt(cnt)}
						</div>
						<div
							class="w-full rounded-t-md transition-all duration-500 hover:brightness-125 {cnt === 0
								? 'bg-white/[0.04]'
								: isCurrent
									? 'bg-gradient-to-t from-violet-500 to-fuchsia-300 shadow-[0_0_14px_rgba(167,139,250,0.55)]'
									: 'bg-gradient-to-t from-violet-600/70 to-fuchsia-400/90'}"
							style="height: {cnt === 0 ? 0 : Math.max(3, (cnt / maxReg) * 85)}%"
						></div>
					</div>
				{/each}
			</div>
			<div class="flex gap-1 sm:gap-2 mt-2">
				{#each MONTH_SHORT as short, i}
					<div class="flex-1 text-center text-[9px] sm:text-[11px] leading-tight whitespace-nowrap {i === currentMonthIdx ? 'text-violet-300 font-bold' : 'text-gray-500'}">{short}</div>
				{/each}
			</div>
		</div>

		{#if !hasAnyData}
			<div class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
				עדיין אין נתונים לשכונה זו — פרסומים ותושבים חדשים יופיעו כאן ברגע שיתווספו.
			</div>
		{/if}
	</div>
</div>
