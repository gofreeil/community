<script lang="ts">
	import { onMount } from 'svelte';

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
				labels: ['תפעול טכני', 'פיתוח', 'שיווק ותמיכה', 'משפטי וחשבונאות', 'רווח נקי'],
				datasets: [{ data: [12, 10, 8, 5, 65], backgroundColor: ['#60a5fa','#a78bfa','#fb923c','#f472b6','#facc15'], borderWidth: 0 }]
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
				איך הקהילה מייצרת ערך — ומחזירה אותו לחברים
			</h1>
			<p class="text-indigo-200 text-base md:text-lg max-w-2xl mx-auto">
				מודל שקוף שבו כל שקל שנכנס מתחלק בין בעלים, צדקה ורכזים — וכולם מרוויחים יחד עם הקהילה.
			</p>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-9">
				{#each [{ num: '8', lbl: 'ערוצי הכנסה' }, { num: '35%', lbl: 'עלויות תפעול' }, { num: '65%', lbl: 'רווח נקי לחלוקה' }, { num: '3', lbl: 'נהנים בכל עסקה' }] as s}
					<div class="rounded-2xl p-5 backdrop-blur-sm" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);">
						<div class="text-3xl font-black text-yellow-300">{s.num}</div>
						<div class="text-xs text-indigo-200 mt-1.5 font-semibold">{s.lbl}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- 8 ערוצי הכנסה -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">💰</span>
			8 ערוצי ההכנסה
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">מקורות ההכנסה של הפלטפורמה — כולם מבוססים על ערך אמיתי לתושבים ולעסקים המקומיים.</p>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each [
				{ icon: '📣', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', title: 'פרסומות ממומנות', desc: 'עסקים מקומיים מפרסמים שירותים לתושבי השכונה במחיר הוגן.', tag: 'ערוץ ראשי' },
				{ icon: '🤝', bg: 'rgba(16,185,129,0.15)', color: '#34d399', title: 'עמלת שירותים', desc: 'עמלה קטנה על השארת פרטים לבעלי מקצוע בשכונה.', tag: 'עמלה' },
				{ icon: '🎫', bg: 'rgba(234,179,8,0.15)', color: '#facc15', title: 'כרטיסים לאירועים', desc: 'מכירת כרטיסים לאירועים שכונתיים — הרצאות, מופעים, סיורים.', tag: 'עמלה' },
				{ icon: '🏠', bg: 'rgba(236,72,153,0.15)', color: '#f472b6', title: 'השכרת צימרים', desc: 'קומיסיון על השכרות קצרות טווח שמתאמים דרך הפלטפורמה.', tag: 'עמלה' },
				{ icon: '👶', bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', title: 'בייביסיטינג', desc: 'התאמת שמרטפים למשפחות — עמלת תיווך לכל שיבוץ.', tag: 'עמלה' },
				{ icon: '🎓', bg: 'rgba(249,115,22,0.15)', color: '#fb923c', title: 'חוגים ושיעורים', desc: 'פלטפורמה לרישום לחוגים בשכונה — עמלה קטנה על כל רישום.', tag: 'עמלה' },
				{ icon: '🚗', bg: 'rgba(14,165,233,0.15)', color: '#38bdf8', title: 'טרמפים משותפים', desc: 'תמורה סמלית על ארגון נסיעות משותפות — חוסך ומקרב.', tag: 'סמלי' },
				{ icon: '⭐', bg: 'rgba(244,63,94,0.15)', color: '#fb7185', title: 'חבילות Premium', desc: 'מנוי פרימיום לעסקים: בולטות, דוחות, כלי ניהול מתקדמים.', tag: 'מנוי' },
			] as ch}
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

	<!-- עלויות -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">⚙️</span>
			מבנה עלויות — 35%
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">35% מההכנסות מופנים לתפעול ואחזקה — כל השאר (65%) יוצא לחלוקה.</p>
		<div class="rounded-2xl p-8" style="background: linear-gradient(135deg,#1a1035,#0f172a); border: 1px solid rgba(234,179,8,0.25);">
			<div class="grid md:grid-cols-2 gap-8 items-center">
				<div class="flex flex-col gap-3">
					{#each [{ name: 'תפעול טכני (שרתים, דומיין, API)', pct: '12%' }, { name: 'פיתוח ותחזוקה שוטפת', pct: '10%' }, { name: 'שיווק ותמיכה', pct: '8%' }, { name: 'משפטי, חשבונאות ומיסוי', pct: '5%' }] as row}
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

	<!-- חלוקת רווחים -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">🤲</span>
			חלוקת הרווחים
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">מהרווח הנקי (65% מהברוטו) — כל שקל מתחלק בין שלושה גורמים:</p>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
			{#each [
				{ emoji: '🏛️', pct: '50%', title: 'בעלי הפלטפורמה', desc: 'תמורה על ההשקעה, הסיכון וההובלה של המיזם לאורך זמן.', from: '#1e3a8a', to: '#3b82f6' },
				{ emoji: '❤️', pct: '20%', title: 'צדקה ונזקקים', desc: 'חלק קבוע שיוצא לפעילות חברתית ולסיוע למשפחות בשכונה.', from: '#064e3b', to: '#10b981' },
				{ emoji: '👥', pct: '30%', title: 'רכזי השכונות', desc: 'תגמול למי שמפעילים בפועל את הקהילה ומייצרים פעילות בשטח.', from: '#78350f', to: '#f59e0b' },
			] as card}
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

	<!-- זרימת כסף -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">🔁</span>
			זרימת הכסף
		</h2>
		<p class="text-gray-400 text-sm mb-6">מההכנסה הראשונית ועד לחלוקה הסופית:</p>
		<div class="rounded-2xl p-8" style="background: #0f172a; border: 1px solid rgba(255,255,255,0.08);">
			<div class="flex flex-wrap items-stretch justify-between gap-3">
				{#each [
					{ ico: '💳', t: 'הכנסה גולמית', s: '100%', border: 'rgba(124,58,237,0.3)' },
					{ ico: '⚙️', t: 'עלויות תפעול', s: '35%', border: 'rgba(239,68,68,0.3)' },
					{ ico: '💰', t: 'רווח נקי', s: '65%', border: 'rgba(250,204,21,0.4)' },
					{ ico: '🤲', t: 'חלוקה', s: 'לשלושה גורמים', border: 'rgba(16,185,129,0.4)' },
				] as node, i}
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

	<!-- גרפים -->
	<div class="mb-8">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#facc15,#f59e0b);">📊</span>
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
