<script lang="ts">
	// ============================================================
	// StatsSummaryChart - "הגרף הראשי" (סקירה כללית): כניסות + פריטים + נרשמים
	// לפי חודש, שלוש סדרות בקנה-מידה משותף. משותף לדף הסטטיסטיקה וללוח הניהול.
	// הנתונים מגיעים מה-load של הדף (מתרעננים בכל כניסה), הרכיב רק מצייר.
	// ============================================================
	// טיפוסים מוגדרים מקומית (לא מיובאים מ-$lib/server — אסור בקוד צד-לקוח)
	type MonthCount = { month: string; count: number };

	// hrefPrefix: '' בדף הסטטיסטיקה (עוגנים באותו דף), '/admin/statistics' בלוח הניהול
	// (המקרא מפנה לגרפים המפורטים שבדף הסטטיסטיקה).
	let { stats = [], itemsSummary, registrations, hrefPrefix = '' }:
		{
			stats?: MonthCount[];
			itemsSummary: { byMonth: MonthCount[] };
			registrations: { byMonth: MonthCount[] };
			hrefPrefix?: string;
		} = $props();

	const MONTH_NAMES = [
		'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
		'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
	];
	const MONTH_SHORT = [
		'ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני',
		'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳',
	];

	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonthIdx = now.getMonth();
	const fmt = (n: number) => n.toLocaleString('he-IL');

	// סדרה של 12 חודשים לשנה הנוכחית מתוך מערך { month:"YYYY-MM", count } כלשהו
	const monthsOfYear = (byMonth: { month: string; count: number }[]): number[] => {
		const m = new Map(byMonth.map((r) => [r.month, r.count]));
		return Array.from({ length: 12 }, (_, i) => m.get(`${currentYear}-${String(i + 1).padStart(2, '0')}`) ?? 0);
	};

	const visitsSeries = $derived(monthsOfYear(stats));
	const itemsByMonth = $derived(monthsOfYear(itemsSummary?.byMonth ?? []));
	const regSeries = $derived(monthsOfYear(registrations?.byMonth ?? []));

	// יוני לא נכלל בגרף המסכם: היו בו הרשמות מוקדמות אך זו לא ההתחלה האמיתית (=יולי).
	// ההתחלה האמיתית היא יולי; תוכן יוני מצורף ליולי (כאילו הועלה ביולי).
	const SUMMARY_MERGE_FROM = 5; // יוני (0=ינואר)
	const SUMMARY_MERGE_INTO = 6; // יולי — סופג את נתוני יוני

	// שלוש הסדרות לגרף המסכם — כל אחת בצבע משלה. נתוני יוני נבלעים ביולי,
	// ויוני עצמו מתאפס.
	const summarySeries = $derived(
		[
			{ key: 'visits', label: 'כניסות',        anchor: '#visits',        base: visitsSeries, bar: 'from-sky-600 to-sky-400',        dot: 'bg-sky-400',     text: 'text-sky-300' },
			{ key: 'items',  label: 'פריטים שהועלו', anchor: '#items',         base: itemsByMonth, bar: 'from-emerald-600 to-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-300' },
			{ key: 'reg',    label: 'נרשמים',        anchor: '#registrations', base: regSeries,    bar: 'from-violet-600 to-fuchsia-400',  dot: 'bg-violet-400',  text: 'text-violet-300' },
		].map((s) => {
			const data = s.base.map((v, i) => {
				if (i === SUMMARY_MERGE_FROM) return 0;                          // יוני מתאפס
				if (i === SUMMARY_MERGE_INTO) return v + s.base[SUMMARY_MERGE_FROM]; // יולי סופג את יוני
				return v;
			});
			return { key: s.key, label: s.label, href: `${hrefPrefix}${s.anchor}`, bar: s.bar, dot: s.dot, text: s.text, data, max: Math.max(1, ...data) };
		})
	);

	// כל חודשי השנה מוצגים בגרף המסכם (ינואר–דצמבר)
	const activeMonthIdxs = Array.from({ length: 12 }, (_, i) => i);

	// קנה-מידה משותף לכל שלוש הסדרות — כך שגובה כל מלבן משקף את המספר בפועל,
	// לא נורמליזציה נפרדת לכל מדד.
	const summaryMax = $derived(Math.max(1, ...summarySeries.flatMap((s) => s.data)));
</script>

<!-- גרף מסכם: כניסות + פריטים + נרשמים, עם קישורים לפירוט -->
<div class="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5">
	<div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
		<h2 class="text-lg font-black">📊 סקירה כללית · {currentYear}</h2>
	</div>
	<!-- מקרא עם קישורים לגרפים המפורטים -->
	<div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-4">
		{#each summarySeries as s}
			<a href={s.href} class="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
				<span class="w-2.5 h-2.5 rounded-sm {s.dot}"></span>
				<span class="font-bold">{s.label}</span>
				<span class="text-gray-500">↓</span>
			</a>
		{/each}
	</div>
	<!-- עמודות לכל חודש: 3 מלבנים חופפים חלקית (הנמוך מקדימה) עם מספר מעל כל אחד -->
	<div class="flex items-end gap-1 sm:gap-2 h-56 border-b border-white/10 pb-px">
		{#each activeMonthIdxs as mi}
			<div class="flex-1 isolate flex items-end justify-center h-full min-w-0" title={`${MONTH_NAMES[mi]} · כניסות ${fmt(summarySeries[0].data[mi])} · פריטים ${fmt(summarySeries[1].data[mi])} · נרשמים ${fmt(summarySeries[2].data[mi])}`}>
				{#each summarySeries as s, si}
					{@const val = s.data[mi]}
					<div class="relative flex flex-col items-center justify-end h-full w-[46%]" style="z-index: {Math.round(999 - val)}; margin-inline-start: {si === 0 ? '0' : '-0.6rem'}">
						<div class="mb-0.5 text-[9px] sm:text-[10px] font-black tabular-nums leading-none {s.text} {val === 0 ? 'opacity-0' : ''}">{fmt(val)}</div>
						<div class="w-full rounded-t bg-gradient-to-t {s.bar} shadow-md ring-1 ring-black/25 transition-all duration-500 hover:brightness-125" style="height: {val === 0 ? 0 : Math.max(2, (val / summaryMax) * 82)}%"></div>
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
