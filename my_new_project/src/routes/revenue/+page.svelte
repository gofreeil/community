<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	onMount(async () => {
		// @ts-ignore
		if (typeof window === 'undefined') return;
		// טעינת Chart.js דינמית
		if (!(window as any).Chart) {
			await new Promise<void>((resolve) => {
				const s = document.createElement('script');
				s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
				s.onload = () => resolve();
				document.head.appendChild(s);
			});
		}
		const Chart = (window as any).Chart;
		Chart.defaults.font.family = 'Assistant, sans-serif';
		Chart.defaults.color = '#cbd5e1';

		new Chart(document.getElementById('costsChart'), {
			type: 'doughnut',
			data: {
				labels: ['הוצאות', 'כסף לחלוקה'],
				datasets: [{ data: [35, 65], backgroundColor: ['#1e293b','#facc15'], borderWidth: 0 }]
			},
			options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } } } }
		});

		new Chart(document.getElementById('distChart'), {
			type: 'pie',
			data: {
				labels: ['בעלי הפלטפורמה (50%)', 'צדקה (20%)', 'רכזי שכונות (30%)'],
				datasets: [{ data: [50, 20, 30], backgroundColor: ['#3b82f6','#10b981','#f59e0b'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 12 } } } }
		});

		new Chart(document.getElementById('channelsChart'), {
			type: 'bar',
			data: {
				labels: ['פרסומות', 'שירותים', 'אירועים', 'צימרים', 'בייביסיטר', 'חוגים', 'טרמפים', 'Premium'],
				datasets: [{ label: 'חלק יחסי (%)', data: [28,18,12,10,9,9,4,10], backgroundColor: 'rgba(250,204,21,0.7)', borderColor: '#facc15', borderWidth: 1, borderRadius: 6 }]
			},
			options: {
				responsive: true, maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					x: { ticks: { font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
					y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
				}
			}
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
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-9">
				{#each data.distribution as card}
					<div class="rounded-2xl p-6 text-center backdrop-blur-sm" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);">
						<div class="text-3xl mb-1">{card.emoji}</div>
						<div class="text-4xl font-black text-yellow-300">{card.pct}</div>
						<div class="text-sm font-black text-white mt-1">{card.title}</div>
						<div class="text-xs text-indigo-200 mt-2 leading-relaxed">{card.desc}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 1. זרימת הכסף -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">1</span>
			זרימת הכסף
		</h2>
		<p class="text-gray-400 text-sm mb-6">מההכנסה הראשונית ועד לחלוקה הסופית:</p>
		<div class="rounded-2xl p-8" style="background: #0f172a; border: 1px solid rgba(255,255,255,0.08);">
			<div class="flex flex-wrap items-stretch justify-between gap-3">
				{#each data.flow_nodes as node, i}
					{#if i > 0}
						<div class="self-center text-yellow-400 font-black text-2xl">←</div>
					{/if}
					<div class="flex-1 min-w-[150px] rounded-xl p-5 text-center"
						style="background: linear-gradient(135deg,#1e293b,#111827); border: 1px solid {node.border};">
						<div class="text-3xl mb-2">{node.ico}</div>
						<div class="font-bold text-sm mb-1">{node.t}</div>
						<div class="text-xs text-gray-400">{node.s}</div>
					</div>
				{/each}
			</div>
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

	<!-- 4. גרפים -->
	<div class="mb-8">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">4</span>
			הדמיה גרפית
		</h2>
		<p class="text-gray-400 text-sm mb-6">שני תרשימים שממחישים את המודל:</p>
		<div class="grid md:grid-cols-2 gap-6">
			<div class="rounded-2xl p-6" style="background: linear-gradient(135deg,#111827,#1e293b); border: 1px solid rgba(255,255,255,0.08);">
				<h3 class="font-black text-yellow-300 mb-4">חלוקת הרווח הנקי</h3>
				<div class="h-72"><canvas id="distChart"></canvas></div>
			</div>
			<div class="rounded-2xl p-6" style="background: linear-gradient(135deg,#111827,#1e293b); border: 1px solid rgba(255,255,255,0.08);">
				<h3 class="font-black text-yellow-300 mb-4">הכנסה חזויה לפי ערוץ (דוגמה)</h3>
				<div class="h-72"><canvas id="channelsChart"></canvas></div>
			</div>
		</div>
	</div>

</div>
