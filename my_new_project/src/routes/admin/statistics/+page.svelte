<script lang="ts">
	import { goto } from '$app/navigation';

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
			.map(([year, months]) => ({
				year,
				months,
				total: months.reduce<number>((sum, c) => sum + (c ?? 0), 0),
			}));
	});

	const grandTotal = $derived(years.reduce((sum, y) => sum + y.total, 0));
	const fmt = (n: number) => n.toLocaleString('he-IL');
</script>

<svelte:head>
	<title>סטטיסטיקה - כניסות לאתר</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white" dir="rtl">
	<div class="max-w-3xl mx-auto px-4 py-8">

		<!-- כותרת -->
		<div class="flex items-center justify-between mb-2">
			<h1 class="text-3xl font-black">📈 סטטיסטיקה</h1>
			<button
				onclick={() => goto('/admin')}
				class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
			>
				→ ללוח הניהול
			</button>
		</div>
		<p class="text-gray-400 mb-8">היסטוריית כניסות חודשיות לאתר · הנתונים מתעדכנים פעם ביום</p>

		{#if years.length === 0}
			<div class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
				עדיין אין נתוני כניסות - הספירה מתחילה מהיום, והנתונים יופיעו כאן תוך יום.
			</div>
		{:else}
			<!-- סיכום שנתי -->
			<div class="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-600/10 to-emerald-500/5 p-5 mb-8">
				<h2 class="text-lg font-black text-emerald-200 mb-3">סיכום שנתי</h2>
				<table class="w-full text-sm">
					<thead>
						<tr class="text-emerald-300/70 border-b border-white/10">
							<th class="text-right py-2 font-bold">שנה</th>
							<th class="text-left py-2 font-bold">סה״כ כניסות</th>
						</tr>
					</thead>
					<tbody>
						{#each years as y}
							<tr class="border-b border-white/5 last:border-0">
								<td class="py-2 font-bold">{y.year}</td>
								<td class="py-2 text-left font-black text-white">{fmt(y.total)}</td>
							</tr>
						{/each}
					</tbody>
					{#if years.length > 1}
						<tfoot>
							<tr class="border-t border-emerald-500/30">
								<td class="py-2 font-black text-emerald-200">סה״כ כללי</td>
								<td class="py-2 text-left font-black text-emerald-200">{fmt(grandTotal)}</td>
							</tr>
						</tfoot>
					{/if}
				</table>
			</div>

			<!-- גרף + טבלה של 12 חודשים לכל שנה -->
			{#each years as y}
				{@const maxCount = Math.max(1, ...y.months.map((c) => c ?? 0))}
				<div class="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
					<h2 class="text-lg font-black mb-4">{y.year}</h2>

					<!-- גרף עמודות חודשי -->
					<div class="mb-6">
						<div class="flex items-end gap-1 sm:gap-2 h-52 border-b border-white/10 pb-px">
							{#each MONTH_NAMES as name, i}
								{@const c = y.months[i]}
								{@const isCurrent = y.year === currentYear && i === currentMonthIdx}
								<div class="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={c == null ? `${name}: אין נתון` : `${name}: ${fmt(c)} כניסות`}>
									<div class="text-[9px] sm:text-[11px] leading-none mb-1 tabular-nums whitespace-nowrap {c == null ? 'text-transparent' : isCurrent ? 'text-emerald-300 font-black' : 'text-gray-400'}">
										{c == null ? '0' : fmt(c)}
									</div>
									<div
										class="w-full rounded-t-md transition-all duration-500 hover:brightness-125 {c == null
											? 'bg-white/[0.04]'
											: isCurrent
												? 'bg-gradient-to-t from-emerald-500 to-teal-300 shadow-[0_0_14px_rgba(16,185,129,0.55)]'
												: 'bg-gradient-to-t from-emerald-600/70 to-emerald-400/90'}"
										style="height: {c == null ? 0 : Math.max(3, (c / maxCount) * 85)}%"
									></div>
								</div>
							{/each}
						</div>
						<div class="flex gap-1 sm:gap-2 mt-2">
							{#each MONTH_SHORT as short, i}
								{@const isCurrent = y.year === currentYear && i === currentMonthIdx}
								<div class="flex-1 text-center text-[9px] sm:text-[11px] leading-tight whitespace-nowrap {isCurrent ? 'text-emerald-300 font-bold' : 'text-gray-500'}">
									{short}
								</div>
							{/each}
						</div>
					</div>

					<table class="w-full text-sm">
						<thead>
							<tr class="text-gray-400 border-b border-white/10">
								<th class="text-right py-2 font-bold">חודש</th>
								<th class="text-left py-2 font-bold">כניסות</th>
							</tr>
						</thead>
						<tbody>
							{#each MONTH_NAMES as name, i}
								{@const isCurrent = y.year === currentYear && i === currentMonthIdx}
								<tr class="border-b border-white/5 last:border-0 {isCurrent ? 'bg-emerald-500/10' : ''}">
									<td class="py-1.5 {isCurrent ? 'font-bold text-emerald-200' : ''}">
										{name}
										{#if isCurrent}<span class="text-xs text-emerald-400/80 mr-1">(בתהליך)</span>{/if}
									</td>
									<td class="py-1.5 text-left font-bold {y.months[i] == null ? 'text-gray-600' : 'text-white'}">
										{y.months[i] == null ? '—' : fmt(y.months[i]!)}
									</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t border-white/15">
								<td class="py-2 font-black">סה״כ {y.year}</td>
								<td class="py-2 text-left font-black">{fmt(y.total)}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			{/each}
		{/if}
	</div>
</div>
