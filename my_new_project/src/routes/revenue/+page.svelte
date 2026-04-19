<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	onMount(async () => {
		if (typeof window === 'undefined') return;
		if (!(window as any).Chart) {
			await new Promise<void>((resolve) => {
				const s = document.createElement('script');
				s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
				s.onload = () => resolve();
				document.head.appendChild(s);
			});
		}
		if (!(window as any).ChartDataLabels) {
			await new Promise<void>((resolve) => {
				const s = document.createElement('script');
				s.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js';
				s.onload = () => resolve();
				document.head.appendChild(s);
			});
		}
		(window as any).Chart.register((window as any).ChartDataLabels);
		const Chart = (window as any).Chart;
		Chart.defaults.font.family = 'Assistant, sans-serif';
		Chart.defaults.color = '#cbd5e1';

		const datalabelsOpts = {
			color: '#fff',
			font: { weight: 'bold' as const, size: 14 },
			formatter: (value: number) => value + '%'
		};

		new Chart(document.getElementById('costsChart'), {
			type: 'doughnut',
			data: {
				labels: ['כסף לחלוקה', 'הוצאות'],
				datasets: [{ data: [65, 35], backgroundColor: ['#facc15','#1e293b'], borderWidth: 0 }]
			},
			options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } }, datalabels: datalabelsOpts } }
		});

		new Chart(document.getElementById('ownersChart'), {
			type: 'doughnut',
			data: {
				labels: ['ישיר לארנק', 'קרן פרסום'],
				datasets: [{ data: [40, 10], backgroundColor: ['#60a5fa','#a78bfa'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 }, boxWidth: 12 } }, datalabels: datalabelsOpts } }
		});

		new Chart(document.getElementById('charityChart'), {
			type: 'doughnut',
			data: {
				labels: ['יוצאים לחירות', 'קופת הצדקה', 'הגרלת הקהילה'],
				datasets: [{ data: [10, 9, 1], backgroundColor: ['#34d399','#a78bfa','#fbbf24'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 }, boxWidth: 12 } }, datalabels: datalabelsOpts } }
		});

		new Chart(document.getElementById('coordinatorChart'), {
			type: 'doughnut',
			data: {
				labels: ['ישיר לארנק', 'תגמול קבוצתי', 'מועדון השקעות', 'רכישות בקהילה'],
				datasets: [{ data: [10, 5, 5, 10], backgroundColor: ['#a78bfa','#60a5fa','#34d399','#fbbf24'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 }, boxWidth: 12 } }, datalabels: datalabelsOpts } }
		});
	});
</script>

<svelte:head>
	<title>שיטת התגמול | קהילה בשכונה</title>
</svelte:head>

<div class="text-white" dir="rtl">

	<!-- כפתור חזרה -->
	<a href="/receipts" class="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm font-bold mb-6 transition-colors group">
		<svg class="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="9 18 15 12 9 6"/>
		</svg>
		חזרה לארנק
	</a>

	<!-- HERO -->
	<div class="relative rounded-3xl px-8 py-14 text-center mb-10 shadow-2xl overflow-hidden"
		style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%);">
		<div class="absolute inset-0 pointer-events-none"
			style="background: radial-gradient(ellipse at 70% 30%, rgba(124,58,237,0.35) 0%, transparent 60%);"></div>
		<div class="relative z-10">
			<span class="inline-block px-4 py-1.5 rounded-full text-xs font-black mb-4"
				style="background: rgba(250,204,21,0.15); border: 1px solid rgba(250,204,21,0.35); color: #facc15;">
				🏆 שיטת התגמול של קהילה בשכונה
			</span>
			<h1 class="text-3xl md:text-5xl font-black leading-tight mb-4">
				{data.hero_title}
			</h1>
			<p class="text-indigo-200 text-base md:text-lg max-w-2xl mx-auto">
				{data.hero_subtitle}
			</p>
			<div class="flex flex-wrap items-stretch justify-between gap-3 mt-9">
				{#each data.flow_nodes as node, i}
					{#if i > 0}
						<div class="self-center text-yellow-400 font-black text-2xl">←</div>
					{/if}
					<div class="flex-1 min-w-[120px] rounded-xl p-4 text-center backdrop-blur-sm"
						style="background: rgba(255,255,255,0.06); border: 1px solid {node.border};">
						<div class="text-3xl mb-1">{node.ico}</div>
						<div class="font-bold text-sm mb-0.5">{node.t}</div>
						<div class="text-xs text-indigo-200">{node.s}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 1. חלוקת הרווחים -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">1</span>
			חלוקת הרווחים
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">מהרווח הנקי — כל שקל מתחלק בין שלושה גורמים:</p>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
			{#each data.distribution as card}
				<div class="rounded-2xl p-7 text-center relative overflow-hidden shadow-xl"
					style="background: linear-gradient(135deg, {card.from}, {card.to});">
					<div class="text-4xl mb-2">{card.emoji}</div>
					<div class="text-5xl font-black leading-none mb-2">{card.pct}</div>
					<div class="text-lg font-bold mb-2">{card.title}</div>
					<div class="text-sm opacity-90 leading-relaxed">{card.desc}</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- 2. ערוצי ההכנסה -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">2</span>
			ערוצי ההכנסה
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">מקורות ההכנסה של הפלטפורמה מגיעים מפרסומים ומשיתופי פעולה</p>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each data.channels as ch}
				<div class="rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-yellow-400/40"
					style="background: linear-gradient(135deg,#111827,#1e293b); border: 1px solid rgba(255,255,255,0.08);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
						style="background: {ch.bg}; color: {ch.color};">{ch.icon}</div>
					<h3 class="font-black text-base mb-1.5">{ch.title}</h3>
					<p class="text-gray-400 text-xs leading-relaxed">{ch.desc}</p>
					<span class="inline-block mt-3 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
						style="background: rgba(250,204,21,0.12); color: #facc15;">{ch.tag}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- 3. עלויות -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">3</span>
			העלויות / חברת הניהול 35%
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">החברה מתוגמלת אך ורק מתוך הרווחים ולא במשכורת או בתשלום חודשי — להלן ההוצאות</p>
		<div class="rounded-2xl p-8" style="background: linear-gradient(135deg,#1a1035,#0f172a); border: 1px solid rgba(234,179,8,0.25);">
			<div class="grid md:grid-cols-2 gap-8 items-center">
				<div class="flex flex-col gap-3">
					{#each data.costs as row}
						<div class="flex justify-between items-center px-4 py-3 rounded-xl border-r-4 border-yellow-400"
							style="background: rgba(255,255,255,0.04);">
							<span class="font-semibold text-sm">{row.name}</span>
							<span class="font-black text-yellow-300 text-lg">{row.pct}</span>
						</div>
					{/each}
				</div>
				<div class="h-72"><canvas id="costsChart"></canvas></div>
			</div>
		</div>
	</div>

	<!-- 4. הכנסה לרכזי השטח פירוט -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">4</span>
			הכנסה לרכזי השטח — פירוט
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">תגמול לרכזי השטח בשקלים חדשים — סה"כ 30% מהרווחים</p>

		<!-- רשימה + גרף -->
		<div class="grid md:grid-cols-2 gap-6 mb-6 items-center">

			<!-- רשימה אנכית -->
			<div class="flex flex-col gap-3">
				<!-- 10% ישיר -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#1a1035,#312e81); border: 1px solid rgba(124,58,237,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(124,58,237,0.25); color: #a78bfa;">10%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>💰</span>
							<span class="font-black text-white text-sm">ישיר לארנק</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(124,58,237,0.3);color:#a78bfa;">ישיר</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">מכל הכנסה שמייצרת השכונה שלך</p>
					</div>
				</div>

				<!-- 5% עקיף -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#1e3a8a,#1e293b); border: 1px solid rgba(59,130,246,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(59,130,246,0.2); color: #60a5fa;">5%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>🤝</span>
							<span class="font-black text-white text-sm">תגמול קבוצתי</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(59,130,246,0.25);color:#60a5fa;">עקיף</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">מתחלק מקופת כלל השכונות לרכזי הרשת</p>
					</div>
				</div>

				<!-- 5% השקעות -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#064e3b,#1e293b); border: 1px solid rgba(16,185,129,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(16,185,129,0.2); color: #34d399;">5%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>📈</span>
							<span class="font-black text-white text-sm">מועדון ההשקעות</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(16,185,129,0.25);color:#34d399;">זכות</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">זכות להשקיע במועדון — תשואה עתידית</p>
					</div>
				</div>

				<!-- 10% קניות -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(245,158,11,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(245,158,11,0.2); color: #fbbf24;">10%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>🛍️</span>
							<span class="font-black text-white text-sm">רכישות בקהילה</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(245,158,11,0.25);color:#fbbf24;">זכות</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">זכות לרכוש אצל בעלי המקצוע הכשירים</p>
					</div>
				</div>
			</div>

			<!-- גרף עוגה -->
			<div class="rounded-2xl p-6 flex flex-col items-center" style="background:#0f172a; border:1px solid rgba(255,255,255,0.08);">
				<h3 class="font-black text-yellow-300 mb-4 text-sm">התפלגות 30% לרכז</h3>
				<div class="h-64 w-full"><canvas id="coordinatorChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#1a1035,#312e81); border: 2px solid rgba(250,204,21,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🏆</span>
				<div>
					<div class="font-black text-white text-base">סה"כ תגמול לרכז שכונה</div>
					<div class="text-xs text-gray-400">10% ישיר + 5% קבוצתי + 5% השקעות + 10% קניות</div>
				</div>
			</div>
			<div class="text-4xl font-black text-yellow-300">30%</div>
		</div>
	</div>

	<!-- 5. הכנסה לבעלים -->
	<div class="mb-8">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">5</span>
			הכנסה לבעלים
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">תגמול בעלי הפלטפורמה — סה"כ 50% מהרווחים</p>

		<div class="grid md:grid-cols-2 gap-6 mb-6 items-center">

			<!-- רשימה אנכית -->
			<div class="flex flex-col gap-3">
				<!-- 40% ישיר -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#1e3a8a,#1e293b); border: 1px solid rgba(59,130,246,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(59,130,246,0.2); color: #60a5fa;">40%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>💰</span>
							<span class="font-black text-white text-sm">ישיר לארנק</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(59,130,246,0.25);color:#60a5fa;">ישיר</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">מההכנסות שמייצרות כל השכונות — נכנס ישירות לארנק הבעלים</p>
					</div>
				</div>

				<!-- 10% פרסום -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#1a1035,#312e81); border: 1px solid rgba(124,58,237,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(124,58,237,0.25); color: #a78bfa;">10%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>📣</span>
							<span class="font-black text-white text-sm">קרן פרסום</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(124,58,237,0.3);color:#a78bfa;">מינימום</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">יופקד לפרסום הפלטפורמה — בכפוף להסכמת ולהצבעת הבעלים</p>
					</div>
				</div>
			</div>

			<!-- גרף -->
			<div class="rounded-2xl p-6 flex flex-col items-center" style="background:#0f172a; border:1px solid rgba(255,255,255,0.08);">
				<h3 class="font-black text-yellow-300 mb-4 text-sm">התפלגות 50% לבעלים</h3>
				<div class="h-64 w-full"><canvas id="ownersChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#1e3a8a,#1a1035); border: 2px solid rgba(250,204,21,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🏛️</span>
				<div>
					<div class="font-black text-white text-base">סה"כ תגמול לבעלי הפלטפורמה</div>
					<div class="text-xs text-gray-400">40% ישיר לארנק + 10% קרן פרסום</div>
				</div>
			</div>
			<div class="text-4xl font-black text-yellow-300">50%</div>
		</div>
	</div>

	<!-- 6. חברה צדקה וחסד -->
	<div class="mb-8">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">6</span>
			חברה, צדקה וחסד
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">20% מהרווחים מוקדשים לפעולות חברתיות — כי קהילה אמיתית מחזירה לחברה</p>

		<div class="grid md:grid-cols-2 gap-6 mb-6 items-center">

			<!-- רשימה -->
			<div class="flex flex-col gap-3">

				<!-- 10% יוצאים לחירות -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#064e3b,#1e293b); border: 1px solid rgba(16,185,129,0.45);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(16,185,129,0.2); color: #34d399;">10%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>🕊️</span>
							<span class="font-black text-white text-sm">יוצאים לחירות</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(16,185,129,0.25);color:#34d399;">עמותה</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">לפעילויות המקדמות חירות ושיפור החברה בישראל</p>
					</div>
				</div>

				<!-- 9% קופת הצדקה -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#1a1035,#312e81); border: 1px solid rgba(167,139,250,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(167,139,250,0.2); color: #a78bfa;">9%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>❤️</span>
							<span class="font-black text-white text-sm">קופת הצדקה הקהילתית</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(167,139,250,0.25);color:#a78bfa;">קהילה</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">לסיוע למשפחות ולנזקקים בשכונות הרשת</p>
					</div>
				</div>

				<!-- 1% הגרלה -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(251,191,36,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(251,191,36,0.2); color: #fbbf24;">1%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>🎲</span>
							<span class="font-black text-white text-sm">הגרלת הקהילה</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(251,191,36,0.25);color:#fbbf24;">הגרלה</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">יחולק בהגרלה למשתמש ששיפר את פני הקהילה</p>
					</div>
				</div>
			</div>

			<!-- גרף -->
			<div class="rounded-2xl p-6 flex flex-col items-center" style="background:#0f172a; border:1px solid rgba(255,255,255,0.08);">
				<h3 class="font-black text-yellow-300 mb-4 text-sm">התפלגות 20% לצדקה וחסד</h3>
				<div class="h-64 w-full"><canvas id="charityChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#064e3b,#1a1035); border: 2px solid rgba(250,204,21,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🤲</span>
				<div>
					<div class="font-black text-white text-base">סה"כ לחברה, צדקה וחסד</div>
					<div class="text-xs text-gray-400">10% יוצאים לחירות + 9% קופת צדקה + 1% הגרלה</div>
				</div>
			</div>
			<div class="text-4xl font-black text-yellow-300">20%</div>
		</div>
	</div>

</div>
