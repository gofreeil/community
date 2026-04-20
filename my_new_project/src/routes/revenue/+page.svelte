<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type TabId = 'about' | 'rewards' | 'owners' | 'coordinator';
	let activeTab = $state<TabId>('about');

	function setTab(id: TabId) {
		activeTab = id;
		if (typeof window !== 'undefined') {
			history.replaceState(null, '', '#' + id);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	onMount(async () => {
		if (typeof window === 'undefined') return;
		const hash = window.location.hash.replace('#', '') as TabId;
		if (['about','rewards','owners','coordinator'].includes(hash)) activeTab = hash as TabId;
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
			options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', reverse: true, labels: { padding: 12, font: { size: 12 } } }, datalabels: datalabelsOpts } }
		});

		new Chart(document.getElementById('ownersChart'), {
			type: 'doughnut',
			data: {
				labels: ['ישיר לארנק', 'קרן פרסום', ''],
				datasets: [{ data: [40, 10, 50], backgroundColor: ['#93c5fd','#3b82f6','rgba(15,23,42,0.6)'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: {
				rotation: 18,
				responsive: true, maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 }, boxWidth: 12,
						filter: (item: any) => item.index < 2
					}},
					datalabels: {
						color: '#fff',
						font: { weight: 'bold' as const, size: 13 },
						formatter: (value: number, ctx: any) => ctx.dataIndex < 2 ? value + '%' : '',
					}
				}
			}
		});

		new Chart(document.getElementById('charityChart'), {
			type: 'doughnut',
			data: {
				labels: ['יוצאים לחירות', 'קופת הצדקה', 'הגרלת הקהילה', ''],
				datasets: [{ data: [10, 9, 1, 80], backgroundColor: ['#6ee7b7','#34d399','#10b981','rgba(15,23,42,0.6)'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: {
				rotation: 198,
				responsive: true, maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 }, boxWidth: 12,
						filter: (item: any) => item.index < 3
					}},
					datalabels: {
						color: '#fff',
						font: { weight: 'bold' as const, size: 13 },
						formatter: (value: number, ctx: any) => ctx.dataIndex < 3 ? value + '%' : '',
					}
				}
			}
		});

		new Chart(document.getElementById('coordinatorChart'), {
			type: 'doughnut',
			data: {
				labels: ['ישיר לארנק', 'תגמול קבוצתי', 'מועדון השקעות', 'רכישות בקהילה', ''],
				datasets: [{ data: [10, 5, 5, 10, 70], backgroundColor: ['#fbbf24','#f59e0b','#d97706','#b45309','rgba(15,23,42,0.6)'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: {
				rotation: -90,
				responsive: true, maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom', labels: { padding: 10, font: { size: 11 }, boxWidth: 12,
						filter: (item: any) => item.index < 4
					}},
					datalabels: {
						color: '#fff',
						font: { weight: 'bold' as const, size: 13 },
						formatter: (value: number, ctx: any) => ctx.dataIndex < 4 ? value + '%' : '',
					}
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

	<!-- TAB BAR -->
	<div class="flex gap-2 mb-8 p-1.5 rounded-2xl sticky top-[68px] z-40 backdrop-blur-lg"
		style="background: rgba(7,11,20,0.85); border: 1px solid rgba(255,255,255,0.1);">
		{#each ([['about','🏘️','אודותינו'],['rewards','💰','שיטת התגמול'],['owners','🏛️','היה מהבעלים'],['coordinator','👥','היה רכז']] as const) as [id, icon, label]}
			<button
				onclick={() => setTab(id as TabId)}
				class="flex-1 flex items-center justify-center gap-2 px-2 py-3 rounded-xl font-black text-xs md:text-sm transition-all duration-200"
				style={activeTab === id
					? 'background: linear-gradient(135deg,#2563eb,#7c3aed); color:#fff; box-shadow: 0 4px 15px rgba(37,99,235,0.4);'
					: 'color:#94a3b8;'}>
				{icon} {label}
			</button>
		{/each}
	</div>

	<!-- ABOUT TAB -->
	<div class:hidden={activeTab !== 'about'}>

		<!-- Hero -->
		<div class="relative rounded-3xl px-8 py-14 text-center mb-10 shadow-2xl overflow-hidden"
			style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4c1d95 100%);">
			<div class="absolute inset-0 pointer-events-none"
				style="background:radial-gradient(ellipse at 60% 20%,rgba(139,92,246,0.4) 0%,transparent 60%),radial-gradient(ellipse at 20% 80%,rgba(59,130,246,0.25) 0%,transparent 50%);"></div>
			<div class="relative z-10">
				<img src="/images/community-neighborhood.png" alt="קהילה בשכונה" class="mx-auto mb-6 w-full md:w-[40rem] lg:w-[64rem] object-contain rounded-3xl" />
				<h1 class="text-4xl md:text-5xl font-black leading-tight mb-4" style="color:#facc15;">קהילה בשכונה</h1>
				<p class="text-indigo-100 text-base md:text-lg max-w-2xl mx-auto mb-10 font-bold">
					הפלטפורמה הקהילתית הראשונה בישראל המחברת בין התושבים אל כל השירותים, היתרונות והמשאבים של השכונה — במקום אחד!
				</p>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					{#each [['🏘️','שכונות','בכל הארץ','#a78bfa'],['🤝','100%','שירות חינם לתושבים','#34d399'],['💰','50%','מהרווחים חוזרים לקהילה','#facc15'],['❤️','קהילה','מחוברת ותומכת','#f472b6']] as [ico,val,lbl,clr]}
						<div class="rounded-xl p-4 text-center" style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);">
							<div class="text-xl mb-1">{ico}</div>
							<div class="text-xl font-black" style="color:{clr};">{val}</div>
							<div class="text-xs text-indigo-200 mt-1">{lbl}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- מה זה? -->
		<div class="mb-10 rounded-3xl p-7" style="background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid rgba(139,92,246,0.2);">
			<h2 class="text-2xl font-black mb-4 text-purple-300">אז מה זה בדיוק "קהילה בשכונה"?</h2>
			<div class="grid md:grid-cols-2 gap-5 text-sm text-gray-200 leading-relaxed">
				<p><span class="text-white font-black">קהילה בשכונה</span> היא פלטפורמה דיגיטלית המרכזת את כל מה שקורה בשכונה שלך — גמ"חים, עסקים מקומיים, מניינים, חוגים, אירועים, מסירות חינם ועוד — הכל במקום אחד נגיש ונוח.</p>
				<p>המיזם פועל לפי <span class="text-yellow-300 font-black">מודל כלכלי-חברתי ייחודי</span> שבו חצי מהרווחים חוזרים אל הקהילה: 30% לרכזי השכונות, 20% לצדקה ולחסד.</p>
			</div>
		</div>

		<!-- שירותי השכונה -->
		<div class="mb-10">
			<h2 class="text-xl font-black mb-5 text-white">כל שירותי השכונה במקום אחד</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
				{#each [
					['🎁','גמ"חים','השאלת פריטים וציוד בחינם','#a78bfa','rgba(139,92,246,0.15)'],
					['📦','מסירות חינם','רהיטים ובגדים ממשפחות לשכנים','#fb923c','rgba(251,146,60,0.15)'],
					['👶','בייביסיטינג','שמרטפים מאומתים מהשכונה','#f472b6','rgba(244,114,182,0.15)'],
					['✡️','מניינים','לוח מניינים יומי לכל בתי הכנסת','#60a5fa','rgba(96,165,250,0.15)'],
					['🏪','עסקים מקומיים','חנויות, מסעדות ושירותים','#34d399','rgba(52,211,153,0.15)'],
					['🎨','חוגים ושיעורים','פעילויות לילדים ומבוגרים','#facc15','rgba(250,204,21,0.15)'],
					['🏠','צימרים','השכרה קצרת טווח בקהילה','#c084fc','rgba(192,132,252,0.15)'],
					['💑','פנויים ופנויות','היכרויות שכונתיות','#fb7185','rgba(251,113,133,0.15)'],
					['🚗','טרמפים','נסיעות משותפות בין שכנים','#38bdf8','rgba(56,189,248,0.15)'],
					['🔍','אבידות ומציאות','לוח לדיווח ואיתור חפצים','#4ade80','rgba(74,222,128,0.15)'],
					['📅','אירועים','לוח אירועים שכונתי','#fbbf24','rgba(251,191,36,0.15)'],
					['💼','דרושים','לוח דרושים מקומי','#818cf8','rgba(129,140,248,0.15)']
				] as [ico,title,desc,color,bg]}
					<div class="rounded-2xl p-4 flex flex-col gap-1.5 transition-all hover:-translate-y-0.5" style="background:{bg}; border:1px solid {color}30;">
						<span class="text-2xl">{ico}</span>
						<div class="font-black text-xs" style="color:{color};">{title}</div>
						<p class="text-gray-400 text-[11px] leading-relaxed">{desc}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- למי זה מתאים -->
		<div class="mb-10">
			<h2 class="text-xl font-black mb-5 text-white">למי זה מתאים?</h2>
			<div class="grid md:grid-cols-3 gap-4">
				{#each [
					['👤','תושבי השכונה','#3b82f6','#1e3a8a',['גישה לכל שירותי השכונה בחינם','חיבור לשכנים ולקהילה','עזרה וחסד בהישג יד']],
					['🏪','בעלי עסקים','#f59e0b','#78350f',['פרסום איכותי לקהל ממוקד','חשיפה לתושבי השכונה','תשלום הוגן וקל לכל כיס']],
					['🏘️','רכזי שכונות','#10b981','#064e3b',['הכנסה נאה מ-30% מהרווחים','ניהול פשוט דרך לוח ניהול','הכרה וסמכות בקהילה']]
				] as [ico,title,color,dark,points]}
					<div class="rounded-2xl p-5" style="background:linear-gradient(135deg,{dark},#1e293b); border:1px solid {color}40;">
						<div class="flex items-center gap-2 mb-3"><span class="text-2xl">{ico}</span><h3 class="font-black" style="color:{color};">{title}</h3></div>
						<ul class="space-y-1.5">
							{#each points as pt}<li class="flex items-center gap-2 text-xs text-gray-200"><span style="color:{color};">✓</span>{pt}</li>{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>

		<!-- ערכים -->
		<div class="mb-10">
			<h2 class="text-xl font-black mb-5 text-white">הערכים שמנחים אותנו</h2>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				{#each [['🤝','ערבות הדדית','כל אחד תורם וכל אחד מקבל'],['🔍','שקיפות מלאה','המודל הכלכלי פתוח — כולם יודעים לאן כל שקל'],['🏛️','ביזור הכח','50% מהרווחים חוזרים לאנשים'],['❤️','צדקה וחסד','20% לצדקה קבועה — חברה טובה דואגת לנצרכיה']] as [ico,title,desc]}
					<div class="rounded-2xl p-4 text-center" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
						<div class="text-3xl mb-2">{ico}</div>
						<div class="font-black text-white text-sm mb-1">{title}</div>
						<p class="text-gray-400 text-xs leading-relaxed">{desc}</p>
					</div>
				{/each}
			</div>
		</div>

	</div><!-- /about tab -->

	<!-- REWARDS TAB -->
	<div class:hidden={activeTab !== 'rewards'}>

	<!-- HERO -->
	<div class="relative rounded-3xl px-8 py-14 text-center mb-10 shadow-2xl overflow-hidden"
		style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%);">
		<!-- מספר 1 — פינה עליונה ימנית -->
		<span class="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-lg font-black text-[#1a1035] z-20 shadow-lg"
			style="background: linear-gradient(135deg,#facc15,#f59e0b);">1</span>
		<div class="absolute inset-0 pointer-events-none"
			style="background: radial-gradient(ellipse at 70% 30%, rgba(124,58,237,0.35) 0%, transparent 60%);"></div>
		<div class="relative z-10">
			<h1 class="text-4xl md:text-6xl font-black leading-tight mb-4" style="color:#facc15;">
				🏆 שיטת התגמול של קהילה בשכונה
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

			<!-- 1. תקציר חלוקת הרווחים — בתוך ה-hero -->
			<div class="mt-10 pt-8 border-t border-white/10">
				<h2 class="text-xl font-black mb-1">
					תקציר חלוקת הרווחים
				</h2>
				<p class="text-indigo-200 text-sm mb-6 text-center">מהרווח הנקי — כל שקל מתחלק בין שלושה גורמים:</p>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
					{#each data.distribution as card}
						<a href={card.link}
							class="rounded-2xl p-7 text-center relative overflow-hidden shadow-xl block hover:scale-105 hover:brightness-110 transition-all duration-200"
							style="background: linear-gradient(135deg, {card.from}, {card.to});">
							<div class="text-4xl mb-2">{card.emoji}</div>
							<div class="text-5xl font-black leading-none mb-2">{card.pct}</div>
							<div class="text-lg font-bold mb-2">{card.title}</div>
							<div class="text-sm opacity-90 leading-relaxed">{card.desc}</div>
							<div class="mt-3 text-xs font-black opacity-70">← לפירוט מלא</div>
						</a>
					{/each}
				</div>
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

	<!-- 4. הכנסה לרכזי השטח פירוט -->
	<div id="section-4" class="mb-12 scroll-target">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background: linear-gradient(135deg,#fbbf24,#d97706);">4</span>
			הכנסה לרכזי השטח — פירוט
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">תגמול לרכזי השטח בשקלים חדשים — סה"כ 30% מהרווחים</p>

		<!-- רשימה + גרף -->
		<div class="grid md:grid-cols-2 gap-6 mb-6 items-center">

			<!-- רשימה אנכית -->
			<div class="flex flex-col gap-3">
				<!-- 10% ישיר -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(245,158,11,0.45);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(245,158,11,0.25); color: #fbbf24;">10%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>💰</span>
							<span class="font-black text-white text-sm">ישיר לארנק</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(245,158,11,0.3);color:#fbbf24;">ישיר</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">מכל הכנסה שמייצרת השכונה שלך</p>
					</div>
				</div>

				<!-- 5% עקיף -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#92400e,#1e293b); border: 1px solid rgba(217,119,6,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(217,119,6,0.2); color: #f59e0b;">5%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>🤝</span>
							<span class="font-black text-white text-sm">תגמול קבוצתי</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(217,119,6,0.25);color:#f59e0b;">עקיף</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">מתחלק מקופת כלל השכונות לרכזי הרשת</p>
					</div>
				</div>

				<!-- 5% השקעות -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(180,83,9,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(180,83,9,0.2); color: #d97706;">5%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>📈</span>
							<span class="font-black text-white text-sm">מועדון ההשקעות</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(180,83,9,0.25);color:#d97706;">זכות</span>
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
			<div class="rounded-2xl p-6 flex flex-col items-center" style="background:#0f172a; border:1px solid rgba(245,158,11,0.2);">
				<h3 class="font-black text-amber-400 mb-4 text-sm">התפלגות 30% לרכז</h3>
				<div class="h-64 w-full"><canvas id="coordinatorChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#78350f,#1a1035); border: 2px solid rgba(245,158,11,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🏆</span>
				<div>
					<div class="font-black text-white text-base">סה"כ תגמול לרכז שכונה</div>
					<div class="text-xs text-gray-400">10% ישיר + 5% קבוצתי + 5% השקעות + 10% קניות</div>
				</div>
			</div>
			<div class="text-4xl font-black text-amber-300">30%</div>
		</div>
	</div>

	<!-- 5. הכנסה לבעלים -->
	<div id="section-5" class="mb-8 scroll-target">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-white"
				style="background: linear-gradient(135deg,#3b82f6,#1d4ed8);">5</span>
			הכנסה לבעלים
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">תגמול בעלי הפלטפורמה — סה"כ 50% מהרווחים</p>

		<div class="grid md:grid-cols-2 gap-6 mb-6 items-center">

			<!-- רשימה אנכית -->
			<div class="flex flex-col gap-3">
				<!-- 40% ישיר -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#1e3a8a,#1e293b); border: 1px solid rgba(59,130,246,0.45);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(59,130,246,0.2); color: #93c5fd;">40%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>💰</span>
							<span class="font-black text-white text-sm">ישיר לארנק</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(59,130,246,0.25);color:#93c5fd;">ישיר</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">מההכנסות שמייצרות כל השכונות — נכנס ישירות לארנק הבעלים</p>
					</div>
				</div>

				<!-- 10% פרסום -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#1d4ed8,#1e293b); border: 1px solid rgba(37,99,235,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(37,99,235,0.2); color: #60a5fa;">10%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>📣</span>
							<span class="font-black text-white text-sm">קרן פרסום</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(37,99,235,0.25);color:#60a5fa;">מינימום</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">יופקד לפרסום הפלטפורמה — בכפוף להסכמת ולהצבעת הבעלים</p>
					</div>
				</div>
			</div>

			<!-- גרף -->
			<div class="rounded-2xl p-6 flex flex-col items-center" style="background:#0f172a; border:1px solid rgba(59,130,246,0.2);">
				<h3 class="font-black text-blue-400 mb-4 text-sm">התפלגות 50% לבעלים</h3>
				<div class="h-64 w-full"><canvas id="ownersChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#1e3a8a,#1a1035); border: 2px solid rgba(59,130,246,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🏛️</span>
				<div>
					<div class="font-black text-white text-base">סה"כ תגמול לבעלי הפלטפורמה</div>
					<div class="text-xs text-gray-400">40% ישיר לארנק + 10% קרן פרסום</div>
				</div>
			</div>
			<div class="text-4xl font-black text-blue-300">50%</div>
		</div>
	</div>

	<!-- 6. חברה צדקה וחסד -->
	<div id="section-6" class="mb-8 scroll-target">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-white"
				style="background: linear-gradient(135deg,#10b981,#059669);">6</span>
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
						style="background: rgba(16,185,129,0.2); color: #6ee7b7;">10%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>🕊️</span>
							<span class="font-black text-white text-sm">יוצאים לחירות</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(16,185,129,0.25);color:#6ee7b7;">עמותה</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">לפעילויות המקדמות חירות ושיפור החברה בישראל</p>
					</div>
				</div>

				<!-- 9% קופת הצדקה -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#065f46,#1e293b); border: 1px solid rgba(5,150,105,0.4);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(5,150,105,0.2); color: #34d399;">9%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>❤️</span>
							<span class="font-black text-white text-sm">קופת הצדקה הקהילתית</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(5,150,105,0.25);color:#34d399;">קהילה</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">לסיוע למשפחות ולנזקקים בשכונות הרשת</p>
					</div>
				</div>

				<!-- 1% הגרלה -->
				<div class="rounded-2xl p-4 flex gap-4 items-center"
					style="background: linear-gradient(135deg,#064e3b,#1e293b); border: 1px solid rgba(16,185,129,0.3);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
						style="background: rgba(16,185,129,0.15); color: #10b981;">1%</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span>🎲</span>
							<span class="font-black text-white text-sm">הגרלת הקהילה</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-black" style="background:rgba(16,185,129,0.2);color:#10b981;">הגרלה</span>
						</div>
						<p class="text-gray-300 text-xs leading-relaxed">יחולק בהגרלה למשתמש ששיפר את פני הקהילה</p>
					</div>
				</div>
			</div>

			<!-- גרף -->
			<div class="rounded-2xl p-6 flex flex-col items-center" style="background:#0f172a; border:1px solid rgba(16,185,129,0.2);">
				<h3 class="font-black text-emerald-400 mb-4 text-sm">התפלגות 20% לצדקה וחסד</h3>
				<div class="h-64 w-full"><canvas id="charityChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#064e3b,#1a1035); border: 2px solid rgba(16,185,129,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🤲</span>
				<div>
					<div class="font-black text-white text-base">סה"כ לחברה, צדקה וחסד</div>
					<div class="text-xs text-gray-400">10% יוצאים לחירות + 9% קופת צדקה + 1% הגרלה</div>
				</div>
			</div>
			<div class="text-4xl font-black text-emerald-300">20%</div>
		</div>
	</div>

	</div><!-- /rewards tab -->

	<!-- OWNERS TAB -->
	<div class:hidden={activeTab !== 'owners'}>

		<!-- HERO בעלים -->
		<div class="relative rounded-3xl px-8 py-14 text-center mb-10 shadow-2xl overflow-hidden"
			style="background: linear-gradient(135deg,#1e1b4b 0%,#1e3a8a 50%,#1e293b 100%);">
			<div class="absolute inset-0 pointer-events-none"
				style="background: radial-gradient(ellipse at 30% 30%, rgba(59,130,246,0.3) 0%, transparent 60%);"></div>
			<div class="relative z-10">
				<h1 class="text-3xl md:text-5xl font-black leading-tight mb-4" style="color:#93c5fd;">
					🏛️ היה מהבעלים של קהילה בשכונה
				</h1>
				<p class="text-blue-100 text-base md:text-lg max-w-2xl mx-auto mb-10">
					הפלטפורמה פועלת לפי מודל ייחודי של כלכלה מבוזרת וחברתית המחזירה חצי מהרווחים שלה אל הקהילה!
				</p>
				<!-- סטטיסטיקות מהירות -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					{#each [['50%','חוזר לקהילה','#34d399'],['20,000','מניות סה״כ','#60a5fa'],['200₪','ליחידה','#facc15'],['2,000','מקס למשפחה','#f472b6']] as [val,lbl,clr]}
						<div class="rounded-xl p-4 text-center" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);">
							<div class="text-3xl font-black" style="color:{clr};">{val}</div>
							<div class="text-xs text-blue-200 mt-1">{lbl}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- 1. ביזור לעומת ריכוז -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">1</span>
				ביזור לעומת ריכוז
			</h2>
			<p class="text-gray-400 text-sm mb-6 max-w-2xl">במקום שכל הרווחים יגיעו לבעל אחד — המודל שלנו מבזר את הבעלות והרווחים</p>
			<div class="grid md:grid-cols-2 gap-5">
				<!-- ריכוז -->
				<div class="rounded-2xl p-6" style="background:linear-gradient(135deg,#450a0a,#1e293b); border:1px solid rgba(239,68,68,0.3);">
					<div class="flex items-center gap-3 mb-4">
						<span class="text-3xl">❌</span>
						<h3 class="font-black text-red-400 text-lg">מודל ריכוזי (פייסבוק, טיקטוק...)</h3>
					</div>
					<ul class="space-y-2 text-sm text-gray-300">
						<li class="flex gap-2"><span class="text-red-400">•</span> כל הרווחים לבעל הפלטפורמה בלבד</li>
						<li class="flex gap-2"><span class="text-red-400">•</span> כח ריכוזי בידי קבוצה קטנה</li>
						<li class="flex gap-2"><span class="text-red-400">•</span> אין ייצוג לקהילה בהחלטות</li>
					</ul>
				</div>
				<!-- ביזור -->
				<div class="rounded-2xl p-6" style="background:linear-gradient(135deg,#064e3b,#1e293b); border:1px solid rgba(16,185,129,0.3);">
					<div class="flex items-center gap-3 mb-4">
						<span class="text-3xl">✅</span>
						<h3 class="font-black text-emerald-400 text-lg">המודל המבוזר שלנו</h3>
					</div>
					<ul class="space-y-2 text-sm text-gray-300">
						<li class="flex gap-2"><span class="text-emerald-400">•</span> 50% מהרווחים חוזרים אל הקהילה</li>
						<li class="flex gap-2"><span class="text-emerald-400">•</span> עד 20,000 מניות — עד 2,000 למשפחה</li>
						<li class="flex gap-2"><span class="text-emerald-400">•</span> שאיפה: בעלי מניות בכל שכונה בארץ</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- 2. החלטות משותפות -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">2</span>
				החלטות משותפות
			</h2>
			<p class="text-gray-400 text-sm mb-6 max-w-2xl">הבעלים מחליטים יחד בהצבעה על כל ההחלטות המנהליות</p>
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
				{#each [['📣','אופן הפרסום'],['📜','תנאי השימוש'],['💲','מחירון'],['⚙️','ביצוע שדרוגים'],['🚫','מדיניות צנזורה'],['📋','החלטות מנהליות']] as [ico, lbl]}
					<div class="rounded-xl p-4 flex items-center gap-3"
						style="background:rgba(255,255,255,0.04); border:1px solid rgba(59,130,246,0.2);">
						<span class="text-2xl">{ico}</span>
						<span class="font-bold text-sm text-blue-100">{lbl}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- 3. צורת המודל -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">3</span>
				צורת המודל
			</h2>
			<div class="rounded-2xl p-7" style="background:linear-gradient(135deg,#1e1b4b,#1e3a8a); border:1px solid rgba(147,197,253,0.2);">
				<div class="grid md:grid-cols-2 gap-6 text-sm text-blue-100 leading-relaxed">
					<div>
						<p class="mb-3">המודל לוקח את האלמנטים החיוביים הן מהשיטה <span class="text-yellow-300 font-black">הקפיטליסטית</span> (שוק חופשי) והן מהשיטה <span class="text-yellow-300 font-black">הקומוניסטית</span> (הגבלת רכישה) — כך שהפלטפורמה תהיה באמת שייכת לעם תמיד.</p>
						<p>מבוסס על רעיון <span class="text-yellow-300 font-black">הנחלות בארץ ישראל</span> — שומר על חופש ועצמאות מחד, ולא מאפשר ריכוזיות בידיים מעטות מאידך.</p>
					</div>
					<div class="flex flex-col gap-3">
						<div class="rounded-xl p-4 text-center" style="background:rgba(255,255,255,0.06);">
							<div class="text-4xl mb-1">⚖️</div>
							<div class="font-black text-white">נוסחה הוגנת ומאוזנת</div>
							<div class="text-xs text-blue-300 mt-1">לבעלים, לרכזים ולמשתמשים</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 4. יתרונות לכל הצדדים -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">4</span>
				יתרונות לכל הצדדים
			</h2>
			<div class="grid sm:grid-cols-2 gap-4">
				{#each [
					['👤','א. למשתמשי הקצה','#3b82f6','rgba(59,130,246,0.15)','כל יתרונות השכונה תחת קורת גג אחת — לשימוש אישי ללא תשלום.'],
					['🏪','ב. לבעלי עסקים','#f59e0b','rgba(245,158,11,0.15)','פרסום איכותי וממוקד תמורת תשלום הוגן וקל לכל כיס.'],
					['❤️','ג. לצדקה ולחברה','#10b981','rgba(16,185,129,0.15)','קופת צדקה קבועה, עמותת יוצאים לחירות, הגרלה חודשית למסייע לקהילה.'],
					['🏘️','ד. לרכזי השכונות','#f472b6','rgba(244,114,182,0.15)','חלק נכבד מהרווחים למפעילי האתר בכל שכונה ושכונה.']
				] as [ico, title, color, bg, desc]}
					<div class="rounded-2xl p-5 flex gap-4 items-start"
						style="background:{bg}; border:1px solid {color}40;">
						<span class="text-3xl mt-0.5">{ico}</span>
						<div>
							<div class="font-black text-base mb-1" style="color:{color};">{title}</div>
							<p class="text-gray-300 text-sm leading-relaxed">{desc}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 5. עלות רכישה -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">5</span>
				עלות רכישה
			</h2>
			<div class="grid md:grid-cols-2 gap-5">
				<!-- מחיר -->
				<div class="rounded-2xl p-8 text-center" style="background:linear-gradient(135deg,#1e3a8a,#1e1b4b); border:2px solid rgba(147,197,253,0.4);">
					<div class="text-6xl font-black text-yellow-300 mb-2">200₪</div>
					<div class="text-xl font-black text-white mb-1">ליחידה אחת</div>
					<div class="text-gray-400 text-sm">ההוצאה הראשונה היא גם האחרונה — לאחר מכן הכל מתוך הרווחים</div>
				</div>
				<!-- פרטים -->
				<div class="flex flex-col gap-3">
					{#each [
						['💬','קבוצת ווצאפ','בעלי היחידות מתנהלים ומצביעים יחד בקבוצה ייעודית'],
						['©️','זכויות יוצרים','אם מדינות נוספות ירצו לפתוח את האפליקציה — ישלמו לבעלי הזכויות'],
						['🔄','מכירה חופשית','ניתן למכור את היחידות למי שתרצו, בכפוף להגבלת 2,000 ליחידת משפחה'],
						['🔒','הגבלת ריכוז','עד 2,000 יחידות למשפחה גרעינית אחת — לשמר כח ביזור']
					] as [ico, title, desc]}
						<div class="rounded-xl p-4 flex gap-3 items-start"
							style="background:rgba(255,255,255,0.04); border:1px solid rgba(59,130,246,0.2);">
							<span class="text-xl mt-0.5">{ico}</span>
							<div>
								<div class="font-black text-blue-200 text-sm">{title}</div>
								<div class="text-gray-400 text-xs mt-0.5">{desc}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- 6. הוצאות שותפות -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">6</span>
				הוצאות שותפות
			</h2>
			<div class="rounded-2xl p-7 flex flex-col md:flex-row gap-6 items-center"
				style="background:linear-gradient(135deg,#1a1035,#1e293b); border:1px solid rgba(250,204,21,0.25);">
				<div class="text-center flex-shrink-0">
					<div class="text-6xl font-black text-yellow-300">35%</div>
					<div class="text-sm text-gray-400 mt-1">מההכנסות לתפעול</div>
				</div>
				<div class="text-sm text-gray-300 leading-relaxed">
					<p class="mb-3">חברת ניהול מטפלת בשרתים, אבטחת מידע, שירות לקוחות ותפעול שוטף. <span class="text-yellow-300 font-bold">ללא משכורות קבועות</span> וללא הפתעות — רק 35% מההכנסות.</p>
					<p>החברה היא חלק בלתי נפרד מהפלטפורמה — <span class="text-yellow-300 font-bold">ההוצאה הראשונה היא גם האחרונה.</span> לאחר מכן כל ההוצאות מתוך הרווחים בלבד.</p>
				</div>
			</div>
		</div>


	</div><!-- /owners tab -->

	<!-- COORDINATOR TAB -->
	<div class:hidden={activeTab !== 'coordinator'}>

		<!-- Hero -->
		<div class="relative rounded-3xl px-8 py-14 text-center mb-10 shadow-2xl overflow-hidden"
			style="background:linear-gradient(135deg,#78350f 0%,#92400e 45%,#1e293b 100%);">
			<div class="absolute inset-0 pointer-events-none"
				style="background:radial-gradient(ellipse at 50% 30%,rgba(245,158,11,0.35) 0%,transparent 60%);"></div>
			<div class="relative z-10">
				<span class="inline-block text-5xl mb-4">🏘️</span>
				<h1 class="text-3xl md:text-5xl font-black leading-tight mb-4" style="color:#fbbf24;">
					היה רכז בשכונתך
				</h1>
				<p class="text-amber-100 text-base md:text-lg max-w-2xl mx-auto mb-10">
					הפעל את הקהילה בשכונה שלך, קבל הכרה ותגמול נדיב — ותיהנה מ-30% מכל רווחי השכונה שלך
				</p>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					{#each [['30%','מהרווחים לרכז','#fbbf24'],['10%','ישיר לארנק','#f59e0b'],['5%','תגמול קבוצתי','#d97706'],['15%','זכויות השקעה ורכישה','#b45309']] as [val,lbl,clr]}
						<div class="rounded-xl p-4 text-center" style="background:rgba(0,0,0,0.3); border:1px solid rgba(245,158,11,0.3);">
							<div class="text-2xl font-black" style="color:{clr};">{val}</div>
							<div class="text-xs text-amber-200 mt-1">{lbl}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- מה תפקיד הרכז? -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background:linear-gradient(135deg,#fbbf24,#d97706);">1</span>
				מה תפקיד הרכז?
			</h2>
			<p class="text-gray-400 text-sm mb-6 max-w-2xl">הרכז הוא הגורם האנושי המרכזי שמחיה את הקהילה הדיגיטלית בשטח</p>
			<div class="grid sm:grid-cols-2 gap-4">
				{#each [
					['📣','ניהול תוכן','עדכון לוחות, פרסום אירועים, ניהול מסירות וגמ"חים'],
					['🤝','גיוס עסקים','פנייה לבעלי עסקים מקומיים לפרסם בפלטפורמה'],
					['👥','חיבור תושבים','עידוד שיתוף ופעילות בקהילה — ויצירת אווירה חמה'],
					['📊','דיווח ושקיפות','עדכון שוטף על פעילות ורווחים לכל חברי הקהילה']
				] as [ico,title,desc]}
					<div class="rounded-2xl p-5 flex gap-4 items-start"
						style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2);">
						<span class="text-3xl">{ico}</span>
						<div>
							<div class="font-black text-amber-300 mb-1">{title}</div>
							<p class="text-gray-300 text-sm leading-relaxed">{desc}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- התגמול המפורט -->
		<div class="mb-10" id="coordinator-detail" style="scroll-margin-top:110px;">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background:linear-gradient(135deg,#fbbf24,#d97706);">2</span>
				פירוט התגמול
			</h2>
			<p class="text-gray-400 text-sm mb-6 max-w-2xl">30% מכלל רווחי השכונה שלך — מחולקים בצורה הוגנת</p>
			<div class="flex flex-col gap-3">
				{#each [
					['💰','10% ישיר לארנק','מכל הכנסה שמייצרת השכונה שלך','#fbbf24','rgba(251,191,36,0.15)'],
					['🤝','5% תגמול קבוצתי','מתחלק מקופת כלל השכונות לרכזי הרשת','#f59e0b','rgba(245,158,11,0.12)'],
					['📈','5% מועדון ההשקעות','זכות להשקיע בפלטפורמה — תשואה עתידית','#d97706','rgba(217,119,6,0.12)'],
					['🛍️','10% רכישות בקהילה','זכות לרכוש שירותים ומוצרים אצל בעלי מקצוע כשירים','#b45309','rgba(180,83,9,0.12)']
				] as [ico,title,desc,color,bg]}
					<div class="rounded-2xl p-4 flex gap-4 items-center" style="background:{bg}; border:1px solid {color}40;">
						<div class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style="background:{color}20;">{ico}</div>
						<div class="flex-1">
							<div class="font-black text-white">{title}</div>
							<p class="text-gray-300 text-xs mt-0.5">{desc}</p>
						</div>
						<div class="text-2xl font-black flex-shrink-0" style="color:{color};">{title.split('%')[0].replace(/\D/,'')}%</div>
					</div>
				{/each}
			</div>
			<!-- סיכום -->
			<div class="mt-4 rounded-2xl p-5 flex items-center justify-between"
				style="background:linear-gradient(135deg,#78350f,#1a1035); border:2px solid rgba(245,158,11,0.5);">
				<div class="flex items-center gap-3">
					<span class="text-2xl">🏆</span>
					<div>
						<div class="font-black text-white">סה"כ תגמול לרכז שכונה</div>
						<div class="text-xs text-gray-400">10% ישיר + 5% קבוצתי + 5% השקעות + 10% קניות</div>
					</div>
				</div>
				<div class="text-4xl font-black text-amber-300">30%</div>
			</div>
		</div>

		<!-- דרישות -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background:linear-gradient(135deg,#fbbf24,#d97706);">3</span>
				מה נדרש ממך?
			</h2>
			<div class="grid sm:grid-cols-3 gap-4 mt-6">
				{#each [
					['🕐','זמינות','מספר שעות בשבוע לניהול ועדכון הפלטפורמה'],
					['🏘️','היכרות עם השכונה','חיבור אמיתי לתושבים ולרוח המקום'],
					['📱','שימוש בסיסי בטכנולוגיה','יכולת עדכון פשוטה — אין צורך בידע מקצועי']
				] as [ico,title,desc]}
					<div class="rounded-2xl p-5 text-center" style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2);">
						<div class="text-4xl mb-3">{ico}</div>
						<div class="font-black text-amber-300 mb-2">{title}</div>
						<p class="text-gray-400 text-sm">{desc}</p>
					</div>
				{/each}
			</div>
		</div>

	</div><!-- /coordinator tab -->

	<!-- CTA משותף — מופיע בכל הטאבים -->
	<div class="mt-10 mb-2 rounded-2xl px-6 py-8 text-center"
		style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%); border:1px solid rgba(255,255,255,0.12); box-shadow:0 0 40px rgba(124,58,237,0.15);">
		<h2 class="text-xl md:text-2xl font-black mb-1">רוצה להיות חלק מההצלחה?</h2>
		<p class="text-gray-300 text-sm mb-6 max-w-lg mx-auto">הצטרף אלינו כמשקיע או כרכז שכונה — ותיהנה מפירות הקהילה</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
			<button
				onclick={() => setTab('owners')}
				class="flex items-center gap-2 px-7 py-3 rounded-xl font-black text-base transition-all duration-200 hover:scale-105 hover:brightness-110 shadow-lg"
				style="background:linear-gradient(135deg,#1e3a8a,#3b82f6); border:2px solid rgba(147,197,253,0.35);">
				<span class="text-xl">📈</span>
				<span>רכישת מניות</span>
			</button>
			<button
				onclick={() => setTab('coordinator')}
				class="flex items-center gap-2 px-7 py-3 rounded-xl font-black text-base transition-all duration-200 hover:scale-105 hover:brightness-110 shadow-lg"
				style="background:linear-gradient(135deg,#78350f,#f59e0b); border:2px solid rgba(251,191,36,0.35);">
				<span class="text-xl">👥</span>
				<span>הצטרף לצוות הרכזים</span>
			</button>
		</div>
	</div>

</div>

<style>
	/* גובה scroll — נייד 110px, דסקטופ 150px */
	:global(.scroll-target) {
		scroll-margin-top: 110px;
	}
	@media (min-width: 768px) {
		:global(.scroll-target) {
			scroll-margin-top: 150px;
		}
	}

	:global(#section-4:target h2),
	:global(#section-5:target h2),
	:global(#section-6:target h2) {
		animation: flash-title 4s ease-out forwards;
	}

	@keyframes flash-title {
		0%   { color: #fff;    text-shadow: none; }
		10%  { color: #facc15; text-shadow: 0 0 40px rgba(250,204,21,1), 0 0 80px rgba(250,204,21,0.6); }
		30%  { color: #facc15; text-shadow: 0 0 40px rgba(250,204,21,1), 0 0 80px rgba(250,204,21,0.6); }
		45%  { color: #fff;    text-shadow: none; }
		55%  { color: #facc15; text-shadow: 0 0 30px rgba(250,204,21,0.85), 0 0 60px rgba(250,204,21,0.4); }
		70%  { color: #facc15; text-shadow: 0 0 30px rgba(250,204,21,0.85), 0 0 60px rgba(250,204,21,0.4); }
		85%  { color: #fff;    text-shadow: none; }
		100% { color: #fff;    text-shadow: none; }
	}
</style>
