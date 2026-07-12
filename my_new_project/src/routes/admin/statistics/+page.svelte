<script lang="ts">
	import { goto } from '$app/navigation';
	import ServerHealthGauges from '$lib/components/ServerHealthGauges.svelte';

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

	// "2026-07" → { year: 2026, monthIdx: 6 }
	function parseMonth(m: string): { year: number; monthIdx: number } | null {
		const match = m.match(/^(\d{4})-(\d{2})$/);
		if (!match) return null;
		const year = Number(match[1]);
		const monthIdx = Number(match[2]) - 1;
		if (monthIdx < 0 || monthIdx > 11) return null;
		return { year, monthIdx };
	}

	// חודש נוכחי (לסימון "בתהליך" - הספירה עוד נצברת)
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonthIdx = now.getMonth();

	// קיבוץ לפי שנה: לכל שנה מערך של 12 מונים (null = אין נתון)
	const years = $derived.by(() => {
		const byYear = new Map<number, (number | null)[]>();
		for (const s of data.stats ?? []) {
			const p = parseMonth(s.month);
			if (!p) continue;
			if (!byYear.has(p.year)) byYear.set(p.year, Array(12).fill(null));
			byYear.get(p.year)![p.monthIdx] = s.count;
		}
		return [...byYear.entries()]
			.sort((a, b) => b[0] - a[0])
			.map(([year, months]) => {
				const total = months.reduce<number>((sum, c) => sum + (c ?? 0), 0);
				const activeMonths = months.filter((c) => c != null).length;
				// חודש השיא של השנה
				let peakIdx = -1;
				let peakCount = -1;
				months.forEach((c, i) => {
					if (c != null && c > peakCount) {
						peakCount = c;
						peakIdx = i;
					}
				});
				// שנה שכבר הסתיימה לגמרי → סיכום סופי; השנה הנוכחית עדיין נצברת
				const completed = year < currentYear;
				const avg = activeMonths > 0 ? Math.round(total / activeMonths) : 0;
				return { year, months, total, activeMonths, peakIdx, peakCount, completed, avg };
			});
	});

	const grandTotal = $derived(years.reduce((sum, y) => sum + y.total, 0));
	const fmt = (n: number) => n.toLocaleString('he-IL');

	// ---- סיכום הפריטים שהועלו לאתר ----
	// שם עברי לכל קטגוריה (ה-slug ב-DB לא תמיד אינטואיטיבי, למשל realestate=אירוח לשבת)
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
		// קטגוריות שנמצאו בפועל אך אינן ברשימה הרשמית — מתווספות בסוף
		for (const c of itemsSummary.byCategory) {
			if (!consumed.has(c.category)) rows.push({ label: catLabel(c.category), count: c.count });
		}
		return rows.sort((a, b) => b.count - a.count);
	});
	const maxCat = $derived(Math.max(1, ...categoryRows.map((c) => c.count)));

	// פריטים שנוספו לפי חודש (השנה הנוכחית) — לגרף עמודות בכרטיס התוכן
	const itemsByMonth = $derived.by(() => {
		const m = new Map<string, number>();
		for (const r of itemsSummary.byMonth) m.set(r.month, r.count);
		return Array.from({ length: 12 }, (_, i) => {
			const key = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
			return m.get(key) ?? 0;
		});
	});
	const maxItemsMonth = $derived(Math.max(1, ...itemsByMonth));

	// ---- סדרות חודשיות של השנה הנוכחית (לגרף המסכם + הגרפים המפורטים) ----
	const monthsOfYear = (byMonth: { month: string; count: number }[]): number[] => {
		const m = new Map(byMonth.map((r) => [r.month, r.count]));
		return Array.from({ length: 12 }, (_, i) => m.get(`${currentYear}-${String(i + 1).padStart(2, '0')}`) ?? 0);
	};

	// כניסות של השנה הנוכחית (12 חודשים)
	const visitsSeries = $derived.by(() => {
		const cy = years.find((y) => y.year === currentYear);
		return Array.from({ length: 12 }, (_, i) => cy?.months[i] ?? 0);
	});
	const regSeries = $derived(monthsOfYear(data.registrations?.byMonth ?? []));

	const maxReg = $derived(Math.max(1, ...regSeries));

	// יוני לא נכלל בגרף המסכם: היו בו הרשמות מוקדמות אך זו לא ההתחלה האמיתית (=יולי).
	const SUMMARY_EXCLUDE_MONTH = 5; // יוני (0=ינואר)

	// שלוש הסדרות לגרף המסכם — כל אחת בצבע משלה, בקנה-מידה יחסי לעצמה,
	// עם קישור לגרף המפורט שמתחת. הנתונים של יוני מאופסים והמקסימום מחושב מחדש.
	const summarySeries = $derived(
		[
			{ key: 'visits', label: 'כניסות',        href: '#visits',        base: visitsSeries, bar: 'from-sky-600 to-sky-400',        dot: 'bg-sky-400',     text: 'text-sky-300' },
			{ key: 'items',  label: 'פריטים שהועלו', href: '#items',         base: itemsByMonth, bar: 'from-emerald-600 to-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-300' },
			{ key: 'reg',    label: 'נרשמים',        href: '#registrations', base: regSeries,    bar: 'from-violet-600 to-fuchsia-400',  dot: 'bg-violet-400',  text: 'text-violet-300' },
		].map((s) => {
			const data = s.base.map((v, i) => (i === SUMMARY_EXCLUDE_MONTH ? 0 : v));
			return { key: s.key, label: s.label, href: s.href, bar: s.bar, dot: s.dot, text: s.text, data, max: Math.max(1, ...data) };
		})
	);

	// כל חודשי השנה מוצגים בגרף המסכם (ינואר–דצמבר)
	const activeMonthIdxs = Array.from({ length: 12 }, (_, i) => i);

	// קנה-מידה משותף לכל שלוש הסדרות — כך שגובה כל מלבן משקף את המספר בפועל
	// (206 גבוה, 29 ו-19 נמוכים בהתאמה), לא נורמליזציה נפרדת לכל מדד.
	const summaryMax = $derived(Math.max(1, ...summarySeries.flatMap((s) => s.data)));
</script>

<svelte:head>
	<title>סטטיסטיקה - כניסות לאתר</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white" dir="rtl">
	<div class="max-w-3xl mx-auto px-4 py-8">

		<!-- כותרת -->
		<div class="flex items-center justify-between mb-8">
			<h1 class="text-3xl font-black">📈 סטטיסטיקה</h1>
			<button
				onclick={() => goto('/admin')}
				class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
			>
				→ ללוח הניהול
			</button>
		</div>

		<!-- גרף מסכם: כניסות + פריטים + נרשמים, עם קישורים לפירוט -->
		<div class="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 mb-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
				<h2 class="text-lg font-black">📊 סקירה כללית · {currentYear}</h2>
			</div>
			<!-- מקרא עם קישורים לגרפים המפורטים שמתחת -->
			<div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-4">
				{#each summarySeries as s}
					<a href={s.href} class="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
						<span class="w-2.5 h-2.5 rounded-sm {s.dot}"></span>
						<span class="font-bold">{s.label}</span>
						<span class="text-gray-500">↓</span>
					</a>
				{/each}
			</div>
			<!-- עמודות לכל חודש: 3 מלבנים זה-לצד-זה עם מספר מעל כל אחד (יוני מאופס) -->
			<div class="flex items-end gap-1 sm:gap-2 h-56 border-b border-white/10 pb-px">
				{#each activeMonthIdxs as mi}
					<div class="flex-1 flex items-end justify-center gap-px h-full min-w-0" title={`${MONTH_NAMES[mi]} · כניסות ${fmt(summarySeries[0].data[mi])} · פריטים ${fmt(summarySeries[1].data[mi])} · נרשמים ${fmt(summarySeries[2].data[mi])}`}>
						{#each summarySeries as s}
							{@const val = s.data[mi]}
							<div class="flex flex-col items-center justify-end h-full w-1/3">
								<div class="mb-0.5 text-[9px] sm:text-[10px] font-black tabular-nums leading-none {s.text} {val === 0 ? 'opacity-0' : ''}">{fmt(val)}</div>
								<div class="w-full rounded-t bg-gradient-to-t {s.bar} shadow-sm transition-all duration-500 hover:brightness-125" style="height: {val === 0 ? 0 : Math.max(2, (val / summaryMax) * 82)}%"></div>
							</div>
						{/each}
					</div>
				{/each}
			</div>
			<div class="flex gap-1 sm:gap-2 mt-2">
				{#each activeMonthIdxs as mi}
					<div class="flex-1 text-center text-[9px] sm:text-[11px] font-bold {mi === currentMonthIdx ? 'text-white' : 'text-gray-400'}">{MONTH_SHORT[mi]}</div>
				{/each}
			</div>
		</div>

		<!-- סיכום התוכן שהועלה לאתר: סה״כ + פילוח לפי קטגוריה -->
		{#if itemsSummary.total > 0}
			<div id="items" class="scroll-mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
				<h2 class="text-lg font-black mb-3">📦 תוכן שהועלה לאתר</h2>

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

				<!-- קריאות עזרה מהקהילה — משולב עם הפרטים, בלי מסגרת, נבדל בצבע אמבר -->
				<div class="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
					<span class="flex items-center gap-1.5 font-black text-amber-300"><span>🆘</span> קריאות לעזרה מהקהילה</span>
					<span class="text-gray-400">סה״כ <b class="text-white tabular-nums">{fmt(data.helpCalls?.total ?? 0)}</b></span>
					<span class="text-gray-400">נענו <b class="text-emerald-300 tabular-nums">{fmt(data.helpCalls?.answered ?? 0)}</b></span>
					<span class="text-gray-400">ממתינות <b class="text-amber-300 tabular-nums">{fmt((data.helpCalls?.total ?? 0) - (data.helpCalls?.answered ?? 0))}</b></span>
				</div>

				<!-- סה״כ פריטים — בתחתית הכרטיס -->
				<div class="mt-3 pt-3 border-t border-white/10 text-sm text-gray-400 text-left">
					סה״כ <b class="text-emerald-300 text-base">{fmt(itemsSummary.total)}</b> פריטים פעילים
				</div>
			</div>
		{/if}

		<!-- נרשמים חדשים לפי חודש (גרף מפורט, צבע סגול) -->
		<div id="registrations" class="scroll-mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
				<h2 class="text-lg font-black">🧑‍🤝‍🧑 נרשמים חדשים</h2>
				<div class="text-sm text-gray-400">סה״כ <b class="text-violet-300 text-base">{fmt(data.registrations?.total ?? 0)}</b> משתמשים</div>
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

		{#if years.length === 0}
			<div class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
				עדיין אין נתוני כניסות - הספירה מתחילה מהיום, והנתונים יופיעו כאן תוך יום.
			</div>
		{:else}
			<!-- גרף + טבלה של 12 חודשים לכל שנה -->
			{#each years as y, yi}
				{@const maxCount = Math.max(1, ...y.months.map((c) => c ?? 0))}
				<div id={yi === 0 ? 'visits' : undefined} class="scroll-mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
					<!-- זה-לצד-זה: גרף משמאל, פירוט חודשי מימין (בדסקטופ); נערם בנייד -->
					<div class="flex flex-col lg:flex-row-reverse gap-4 lg:gap-4 lg:items-start">
						<!-- גרף עמודות חודשי -->
						<div class="lg:flex-1 min-w-0">
						<!-- כותרת "כניסות לאתר" מעל הגרף, במקביל לראש החודשים -->
						<div class="text-lg font-black text-center mb-2">כניסות לאתר</div>
						<div class="flex items-end gap-1 sm:gap-2 h-56 border-b border-white/10 pb-px">
							{#each MONTH_NAMES as name, i}
								{@const c = y.months[i]}
								{@const isCurrent = y.year === currentYear && i === currentMonthIdx}
								<div class="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={c == null ? `${name}: אין נתון` : `${name}: ${fmt(c)} כניסות`}>
									<div class="text-[9px] sm:text-[11px] leading-none mb-1 tabular-nums whitespace-nowrap {c == null ? 'text-transparent' : isCurrent ? 'text-sky-300 font-black' : 'text-gray-400'}">
										{c == null ? '0' : fmt(c)}
									</div>
									<div
										class="w-full rounded-t-md transition-all duration-500 hover:brightness-125 {c == null
											? 'bg-white/[0.04]'
											: isCurrent
												? 'bg-gradient-to-t from-sky-500 to-cyan-300 shadow-[0_0_14px_rgba(56,189,248,0.55)]'
												: 'bg-gradient-to-t from-sky-600/70 to-sky-400/90'}"
										style="height: {c == null ? 0 : Math.max(3, (c / maxCount) * 85)}%"
									></div>
								</div>
							{/each}
						</div>
						<div class="flex gap-1 sm:gap-2 mt-2">
							{#each MONTH_SHORT as short, i}
								{@const isCurrent = y.year === currentYear && i === currentMonthIdx}
								<div class="flex-1 text-center text-[9px] sm:text-[11px] leading-tight whitespace-nowrap {isCurrent ? 'text-sky-300 font-bold' : 'text-gray-500'}">
									{short}
								</div>
							{/each}
						</div>

						{#if yi === 0}
							<!-- סיכום שנתי — בתוך עמודת הגרף, כדי שהכל יתאים לגובה הטבלה -->
							<div class="mt-3 flex justify-end">
								<div class="flex items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 text-sm">
									<span class="flex items-center gap-1.5 font-black text-sky-200"><span>📊</span> סיכום שנתי</span>
									<span class="font-black text-white tabular-nums">{fmt(grandTotal)}</span>
								</div>
							</div>
						{/if}
					</div>
						<!-- פירוט חודשי — צמוד לגרף (מימין בדסקטופ), צר כדי לפנות מקום לגרף -->
						<div class="lg:w-40 lg:shrink-0">
						<table class="w-full text-sm">
						<tbody>
							{#each MONTH_NAMES as name, i}
								{@const isCurrent = y.year === currentYear && i === currentMonthIdx}
								<tr class="border-b border-white/5 last:border-0 {isCurrent ? 'bg-sky-500/10' : ''}">
									<td class="py-1 {isCurrent ? 'font-bold text-sky-200' : ''}">
										{name}
										{#if isCurrent}<span class="text-xs text-sky-400/80 mr-1">(בתהליך)</span>{/if}
									</td>
									<td class="py-1 text-left font-bold {y.months[i] == null ? 'text-gray-600' : 'text-white'}">
										{y.months[i] == null ? '—' : fmt(y.months[i]!)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
						</div>
					</div>
				</div>
			{/each}
		{/if}

		<!-- באנר סטטוס השרת (לוח מכוונים) — תחתית הדף -->
		<div class="mt-8">
			<ServerHealthGauges initial={data.serverHealth} monthlyVisits={data.monthlyVisits} live={false} />
		</div>
	</div>
</div>
