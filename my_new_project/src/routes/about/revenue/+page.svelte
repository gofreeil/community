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

		const anim = { animateRotate: true, animateScale: true, duration: 1100, easing: 'easeOutQuart' as const };
		const instances: Record<string, any> = {};

		function observeChart(id: string, config: any) {
			const canvas = document.getElementById(id);
			if (!canvas) return;
			const obs = new IntersectionObserver((entries) => {
				const entry = entries[0];
				if (entry.isIntersecting) {
					if (instances[id]) { instances[id].destroy(); }
					instances[id] = new Chart(canvas, config);
				} else {
					if (instances[id]) { instances[id].destroy(); delete instances[id]; }
				}
			}, { threshold: 0.25 });
			obs.observe(canvas);
		}

		observeChart('ownersChart', {
			type: 'doughnut',
			data: {
				labels: ['ישיר לארנק', 'קרן פרסום', ''],
				datasets: [{ data: [40, 10, 50], backgroundColor: ['#93c5fd','#3b82f6','#1c2030'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: {
				rotation: 108,
				responsive: true, maintainAspectRatio: false,
				animation: anim,
				plugins: {
					legend: { display: false },
					datalabels: {
						color: '#fff',
						font: { weight: 'bold' as const, size: 13 },
						formatter: (value: number, ctx: any) => ctx.dataIndex < 2 ? value + '%' : '',
					}
				}
			}
		});

		observeChart('charityChart', {
			type: 'doughnut',
			data: {
				labels: ['יוצאים לחירות', 'קופת הצדקה', 'הגרלת הקהילה', ''],
				datasets: [{ data: [10, 9, 1, 80], backgroundColor: ['#6ee7b7','#34d399','#10b981','#1c2030'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: {
				rotation: 288,
				responsive: true, maintainAspectRatio: false,
				animation: anim,
				plugins: {
					legend: { display: false },
					datalabels: {
						color: '#fff',
						font: { weight: 'bold' as const, size: 13 },
						formatter: (value: number, ctx: any) => ctx.dataIndex < 3 ? value + '%' : '',
					}
				}
			}
		});

		observeChart('coordinatorChart', {
			type: 'doughnut',
			data: {
				labels: ['ישיר לארנק', 'תגמול קבוצתי', 'מועדון השקעות', 'רכישות בקהילה', ''],
				datasets: [{ data: [10, 5, 5, 10, 70], backgroundColor: ['#fbbf24','#f59e0b','#d97706','#b45309','#1c2030'], borderWidth: 2, borderColor: '#0f172a' }]
			},
			options: {
				rotation: 0,
				responsive: true, maintainAspectRatio: false,
				animation: anim,
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

	<!-- TAB BAR -->
	<div class="flex gap-2 mb-8 p-1.5 rounded-2xl backdrop-blur-lg"
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
					הפלטפורמה הקהילתית הראשונה בישראל המחברת בין התושבים אל כל היתרונות, השירותים והמשאבים של השכונה בה הם מתגוררים!
				</p>
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-0 mt-2">
					{#each [
						['🤲','נגישות מלאה של כל צרכי התושב בכף היד'],
						['🤝','קידום החברה לחברה סולידרית בעלת ערך גבוה של ואהבת לרעך כמוך'],
						['💪','הוזלת יוקר המחיה, שיפור הביטחון, חיזוק הכח של התושב מול הרשויות'],
						['💰','משתפת 50% מהרווחים של הפלטפורמה חזרה לקהילה']
					] as [ico,txt], i}
						<div class="px-3 py-3 text-center flex flex-col items-center gap-1.5" style="border: 0.5px solid rgba(255,255,255,0.12);">
							<div class="text-xl">{ico}</div>
							<p class="text-xs sm:text-sm leading-snug font-semibold text-indigo-100">{txt}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- מה זה + שירותי השכונה — מסגרת אחת -->
		<div class="mb-10 rounded-3xl p-7" style="background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid rgba(139,92,246,0.2);">

			<!-- מה זה? — שורה אחת ארוכה -->
			<h2 class="text-2xl font-black mb-4 text-purple-300">קהילה בשכונה</h2>
			<p class="text-base md:text-lg text-gray-200 leading-relaxed mb-7">
				הפלטפורמה מרכזת את כל מה שקורה בשכונה שלך: גמ"חים, עסקים מקומיים, מניינים, חוגים, אירועים, חפצים למסירה ועוד - הכל במקום אחד נגיש ונוח.
			</p>

			<!-- קו מפריד -->
			<div class="mb-7 mr-0 ml-auto" style="height:1px; width:66%; background:rgba(139,92,246,0.25);"></div>

			<!-- שירותי השכונה -->
			<h2 class="text-xl font-black mb-5 text-white">כל שירותי השכונה במקום אחד</h2>
			<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
				{#each [
					['🎁','גמ"חים','השאלת פריטים וציוד בחינם'],
					['📦','מסירות חינם','רהיטים ובגדים ממשפחות לשכנים'],
					['👶','בייביסיטינג','שמרטפים מאומתים מהשכונה'],
					['✡️','מניינים','לוח מניינים יומי לכל בתי הכנסת'],
					['🏪','עסקים מקומיים','חנויות, מסעדות ושירותים'],
					['🎨','חוגים ושיעורים','פעילויות לילדים ומבוגרים'],
					['🏠','צימרים','השכרה קצרת טווח בקהילה'],
					['💑','פנויים ופנויות','היכרויות שכונתיות'],
					['🚗','טרמפים','נסיעות משותפות בין שכנים'],
					['🔍','אבידות ומציאות','לוח לדיווח ואיתור חפצים'],
					['📅','אירועים','לוח אירועים שכונתי'],
					['💼','דרושים','לוח דרושים מקומי']
				] as [ico,title,desc]}
					<div class="service-cell p-4 flex flex-col gap-1.5 transition-all hover:bg-white/5">
						<span class="text-2xl">{ico}</span>
						<div class="font-black text-sm md:text-base text-indigo-200">{title}</div>
						<p class="text-gray-400 text-xs md:text-sm leading-relaxed">{desc}</p>
					</div>
				{/each}
			</div>

			<!-- מה הפלטפורמה מאפשרת -->
			<ul class="space-y-4 mb-6 mt-8">
				{#each [
					['מאפשרת למפרסמים להגיע בדיוק לקהל היעד הנחוץ להם','#60a5fa'],
					['מאפשרת ואף מעודדת אותך להיות חלק מהבעלים שלה','#facc15'],
					['מאפשרת ואף מעודדת אותך להיות רכז שכונה ולהיות שותף ברווחים שהפלטפורמה מייצרת בכל חודש','#f59e0b'],
					['מאפשרת צימצום עוני וסיוע לחלשים, כך שכאשר אתה משתמש בפלטפורמה אתה גם נהנה מהיתרונות שלה חינם וגם מסייע כלכלית לחלשים !','#34d399']
				] as [txt, clr]}
					<li class="flex items-start gap-3 text-base md:text-lg text-gray-100 leading-relaxed">
						<span class="mt-1 text-lg font-black flex-shrink-0" style="color:{clr};">✦</span>
						<span>{txt}</span>
					</li>
				{/each}
			</ul>
			<div class="pt-5">
				<div style="width:50%; height:1px; background:rgba(255,255,255,0.1); margin-bottom:1.25rem;"></div>
				<p class="text-indigo-200 text-base md:text-lg leading-relaxed mb-2">בתיקווה לחברה מתוקנת יותר וחופשיה יותר</p>
				<p class="text-2xl md:text-3xl font-black" style="color:#facc15;">כוחנו באחדותו!</p>
			</div>
		</div>

		<!-- ערכים -->
		<div class="mb-10">
			<h2 class="text-xl font-black mb-5 text-white">הערכים שמנחים אותנו</h2>
			<div class="grid grid-cols-5 gap-0">
				{#each [['🎯','נגישות','כל צרכי התושב תחת קורת גג אחת'],['🤝','ערבות הדדית','הנגשת צרכי הפרט אל הקהילה בלחיצת כפתור'],['💰','מודל כלכלי חדש','50% מהרווחים חולקים חזרה אל הקהילה כהכרת הטוב למי שקידם אותה'],['💪','העצמה קהילתית','מאפשרים שיח נגיש, קבלת החלטות משותפות, מקדמים חברה שמחה וסולידרית'],['🦅','עצמאות','מפעילים מיזמים המקדמים אותנו לעצמאות חברתית ואף לשליטה על מוסדות המדינה']] as [ico,title,desc]}
					<div class="px-2 py-4 flex flex-col gap-1.5 text-center" style="border-bottom:1px solid rgba(255,255,255,0.08); border-right:1px solid rgba(255,255,255,0.08);">
						<div class="text-xl">{ico}</div>
						<div class="font-black text-white text-xs">{title}</div>
						<p class="text-gray-400 text-[10px] leading-tight hidden md:block">{desc}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- תת-כותרת מודל כלכלי -->
		<p class="text-lg md:text-xl font-bold text-white leading-relaxed mt-6 mb-2">
			מיזם פועל לפי מודל כלכלי / חברתי ייחודי שבו חצי מהרווחים משותפים חזרה אל הקהילה! <button
				onclick={() => setTab('rewards')}
				class="inline items-baseline gap-1 font-bold text-yellow-300 hover:text-yellow-200 underline underline-offset-4 decoration-yellow-400/60 hover:decoration-yellow-300 transition-colors duration-200"
			>הכר את שיטת התגמול ←</button>
		</p>

	</div><!-- /about tab -->

	<!-- REWARDS TAB -->
	<div class:hidden={activeTab !== 'rewards'}>

	<!-- HERO -->
	<div class="relative rounded-3xl px-8 py-14 text-center mb-10 shadow-2xl overflow-hidden"
		style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%);">
		<div class="absolute inset-0 pointer-events-none"
			style="background: radial-gradient(ellipse at 70% 30%, rgba(124,58,237,0.35) 0%, transparent 60%);"></div>
		<div class="relative z-10">
			<h1 class="text-4xl md:text-6xl font-black leading-tight mb-4" style="color:#facc15;">
				🏆 שיטת התגמול של קהילה בשכונה
			</h1>
			<p class="text-indigo-200 text-base md:text-lg max-w-2xl mx-auto">
				{data.hero_subtitle}
			</p>

			<!-- 1. תקציר חלוקת הרווחים — בתוך ה-hero -->
			<div class="mt-10 pt-8 border-t border-white/10">
				<h2 class="text-xl font-black mb-1">
					תקציר חלוקת הרווחים
				</h2>
				<p class="text-indigo-200 text-sm mb-6 text-center">מהרווח הנקי — כל שקל מתחלק בין שלושה גורמים:</p>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{#each data.distribution as card}
						<a href={card.link}
							class="rounded-2xl p-4 text-center relative overflow-hidden shadow-xl block hover:scale-105 hover:brightness-110 transition-all duration-200"
							style="background: linear-gradient(135deg, {card.from}, {card.to});">
							<div class="text-5xl mb-1">{card.emoji}</div>
							<div class="text-6xl font-black leading-none mb-1">{card.pct}</div>
							<div class="text-xl font-bold mb-2">{card.title}</div>
							<div class="text-base opacity-90 leading-relaxed">{card.desc}</div>
							<div class="mt-2 text-sm font-black opacity-70">← לפירוט מלא</div>
						</a>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 2. ערוצי ההכנסה -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0"
				style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity:0.85;">1</span>
			ערוצי ההכנסה
		</h2>
		<p class="text-gray-300 text-base md:text-lg mb-6 max-w-2xl">מקורות ההכנסה של הפלטפורמה מגיעים מפרסומים ומשיתופי פעולה:</p>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
			{#each data.channels as ch}
				<div class="p-5 flex flex-col gap-1.5 transition-all hover:bg-white/5"
					style="border-bottom:1px solid rgba(255,255,255,0.08); border-right:1px solid rgba(255,255,255,0.08);">
					<div class="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-1"
						style="background: {ch.bg}; color: {ch.color};">{ch.icon}</div>
					<h3 class="font-black text-lg">{ch.title}</h3>
					<p class="text-gray-400 text-sm leading-relaxed">{ch.desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- 3. עלויות -->
	<div class="mb-12">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0"
				style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity:0.85;">2</span>
			העלויות - חברת הניהול
		</h2>
		<p class="text-gray-400 text-sm mb-6 max-w-2xl">החברה מתוגמלת אך ורק מתוך הרווחים ולא במשכורת או בתשלום חודשי — להלן ההוצאות</p>
		<div class="rounded-2xl p-8" style="background: linear-gradient(135deg,#1a1035,#0f172a); border: 1px solid rgba(234,179,8,0.25);">
			<div class="grid md:grid-cols-2 gap-8 items-center">
				<div class="flex items-stretch gap-2">
					<!-- שורות עלויות -->
					<div class="flex-1 flex flex-col gap-1.5">
						{#each data.costs as row}
							<div class="flex justify-between items-center px-3 py-2 rounded-lg border-r-4 border-yellow-400"
								style="background: rgba(255,255,255,0.04);">
								<span class="font-semibold text-xs">{row.name}</span>
								<span class="font-black text-yellow-300 text-sm">{row.pct}</span>
							</div>
						{/each}
					</div>
					<!-- סוגריים מסולסלים } -->
					<div class="self-stretch w-5 flex-shrink-0">
						<svg class="w-full h-full" viewBox="0 0 20 100" preserveAspectRatio="none">
							<path d="M 15,2 C 5,2 5,2 5,12 L 5,44 C 5,48 0,50 0,50 C 0,50 5,52 5,56 L 5,88 C 5,98 5,98 15,98"
								fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
					<!-- סיכום -->
					<div class="self-stretch flex flex-col items-center justify-center gap-0.5 w-14 flex-shrink-0">
						<span class="font-black text-yellow-300 text-2xl leading-none">35%</span>
						<span class="font-bold text-gray-400 text-[10px] text-center leading-tight">סה"כ<br/>עלויות</span>
					</div>
				</div>
				<!-- גרף עלויות HTML/CSS — פינות מעוגלות מושלמות בכל צדדים -->
				<div class="flex flex-col gap-5 w-full justify-center py-2">
					<!-- סרגל מוערם -->
					<div class="rounded-2xl overflow-hidden flex w-full" style="height: 90px;" dir="ltr">
						<!-- כסף לחלוקה 65% -->
						<div class="flex flex-col items-center justify-center gap-0.5" style="width: 65%; background: #facc15;">
							<span class="text-2xl font-black text-black leading-none">65%</span>
							<span class="text-sm font-bold text-black opacity-80">כסף לחלוקה</span>
						</div>
						<!-- הוצאות 35% -->
						<div class="flex flex-col items-center justify-center gap-0.5 text-white" style="width: 35%; background: #334155;">
							<span class="text-2xl font-black leading-none">35%</span>
							<span class="text-sm font-bold opacity-80">הוצאות</span>
						</div>
					</div>
					<!-- מקרא -->
					<div class="flex items-center justify-center gap-6 text-sm" dir="rtl">
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 rounded-md" style="background: #334155;"></div>
							<span class="text-gray-300">הוצאות</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 rounded-md" style="background: #facc15;"></div>
							<span class="text-gray-300">הרווחים מתחלקים אוטומטית — לבעלים, לרכזים ולצדקה</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 4. הכנסה לרכזי השטח פירוט -->
	<div id="section-4" class="mb-12 scroll-target">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0"
				style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity:0.85;">3</span>
			הכנסה לרכזי השטח — פירוט
		</h2>
		<!-- רשימה + גרף -->
		<div class="grid grid-cols-2 gap-4 mb-6 items-center">

			<!-- רשימה אנכית -->
			<div class="flex flex-col gap-2">
				<!-- 10% ישיר -->
				<div class="rounded-lg p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(245,158,11,0.45);">
					<div class="w-10 h-10 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0"
						style="background: rgba(245,158,11,0.25); color: #fbbf24;">10%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">ישיר לארנק</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">מכל הכנסה שמייצרת השכונה שלך</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">💰</span>
				</div>

				<!-- 5% עקיף -->
				<div class="rounded-lg p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#92400e,#1e293b); border: 1px solid rgba(217,119,6,0.4);">
					<div class="w-10 h-10 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0"
						style="background: rgba(217,119,6,0.2); color: #f59e0b;">5%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">תגמול קבוצתי</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">מתחלק מקופת כלל השכונות לרכזי הרשת</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">🤝</span>
				</div>

				<!-- 5% השקעות -->
				<div class="rounded-lg p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(180,83,9,0.4);">
					<div class="w-10 h-10 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0"
						style="background: rgba(180,83,9,0.2); color: #d97706;">5%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">מועדון ההשקעות</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">זכות להשקיע במועדון — תשואה עתידית</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">📈</span>
				</div>

				<!-- 10% קניות -->
				<div class="rounded-lg p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(245,158,11,0.4);">
					<div class="w-10 h-10 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0"
						style="background: rgba(245,158,11,0.2); color: #fbbf24;">10%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">רכישות בקהילה</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">זכות לרכוש אצל בעלי המקצוע הכשירים</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">🛍️</span>
				</div>
			</div>

			<!-- גרף עוגה -->
			<div class="rounded-2xl p-3 flex flex-col items-center" style="background:#0f172a; border:1px solid rgba(245,158,11,0.2);">
				<h3 class="font-black text-amber-400 mb-2 text-xs">התפלגות 30% לרכז</h3>
				<div class="h-56 w-full"><canvas id="coordinatorChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#78350f,#1a1035); border: 2px solid rgba(245,158,11,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🏆</span>
				<div>
					<div class="font-black text-white text-base md:text-lg">סה"כ תגמול לרכז שכונה</div>
					<div class="text-xs md:text-sm text-gray-400">10% ישיר + 5% קבוצתי + 5% השקעות + 10% קניות</div>
				</div>
			</div>
			<div class="text-4xl font-black text-amber-300">30%</div>
		</div>
	</div>

	<!-- 5. הכנסה לבעלים -->
	<div id="section-5" class="mb-8 scroll-target">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0"
				style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity:0.85;">4</span>
			הכנסה לבעלים
		</h2>
		<div class="grid grid-cols-2 gap-6 mb-6 items-center">

			<!-- ימין: כרטיסים -->
			<div class="flex flex-col gap-3">
				<!-- 40% ישיר -->
				<div class="rounded-2xl p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#1e3a8a,#1e293b); border: 1px solid rgba(59,130,246,0.45);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
						style="background: rgba(59,130,246,0.2); color: #93c5fd;">40%</div>
					<div class="flex-1">
						<div class="font-black text-white text-sm md:text-base mb-0.5">ישיר לארנק</div>
						<p class="text-gray-300 text-xs md:text-sm leading-relaxed">מההכנסות שמייצרות כל השכונות — נכנס ישירות לארנק הבעלים</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">💰</span>
				</div>
				<!-- 10% פרסום -->
				<div class="rounded-2xl p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#1d4ed8,#1e293b); border: 1px solid rgba(37,99,235,0.4);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
						style="background: rgba(37,99,235,0.2); color: #60a5fa;">10%</div>
					<div class="flex-1">
						<div class="font-black text-white text-sm md:text-base mb-0.5">קרן פרסום</div>
						<p class="text-gray-300 text-xs md:text-sm leading-relaxed">יופקד לפרסום הפלטפורמה — בכפוף להסכמת ולהצבעת הבעלים</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">📣</span>
				</div>
			</div>

			<!-- שמאל: גרף עגול -->
			<div class="rounded-2xl p-4 flex flex-col items-center relative" style="background:#0f172a; border:1px solid rgba(59,130,246,0.2);">
				<h3 class="absolute top-3 right-3 font-black text-blue-400 text-xs text-right leading-tight">התפלגות 50%<br/>לבעלים</h3>
				<div class="h-48 w-full"><canvas id="ownersChart"></canvas></div>
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
			<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0"
				style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity:0.85;">5</span>
			חברה, צדקה וחסד
		</h2>
		<div class="grid grid-cols-2 gap-6 mb-6 items-center">

			<!-- רשימה -->
			<div class="flex flex-col gap-3">

				<!-- 10% יוצאים לחירות -->
				<div class="rounded-2xl p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#064e3b,#1e293b); border: 1px solid rgba(16,185,129,0.45);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
						style="background: rgba(16,185,129,0.2); color: #6ee7b7;">10%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">יוצאים לחירות</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">לעמותת יוצאים לחירות</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">🕊️</span>
				</div>

				<!-- 9% קופת הצדקה -->
				<div class="rounded-2xl p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#065f46,#1e293b); border: 1px solid rgba(5,150,105,0.4);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
						style="background: rgba(5,150,105,0.2); color: #34d399;">9%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">קופת הצדקה הקהילתית</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">לסיוע למשפחות ולנזקקים בשכונות הרשת</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">❤️</span>
				</div>

				<!-- 1% הגרלה -->
				<div class="rounded-2xl p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#064e3b,#1e293b); border: 1px solid rgba(16,185,129,0.3);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
						style="background: rgba(16,185,129,0.15); color: #10b981;">1%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">הגרלת הקהילה</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">יחולק בהגרלה למשתמש אחד בחודש ששיפר את חיי הקהילה</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">🎲</span>
				</div>
			</div>

			<!-- גרף -->
			<div class="rounded-2xl p-4 flex flex-col items-center relative" style="background:#0f172a; border:1px solid rgba(16,185,129,0.2);">
				<h3 class="absolute top-3 right-3 font-black text-emerald-400 text-xs text-right leading-tight">התפלגות 20%<br/>לצדקה וחסד</h3>
				<div class="h-48 w-full"><canvas id="charityChart"></canvas></div>
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
			<div class="flex flex-col gap-1.5">
				{#each [
					['💰','10% ישיר לארנק','מכל הכנסה שמייצרת השכונה שלך','#fbbf24','rgba(251,191,36,0.15)'],
					['🤝','5% תגמול קבוצתי','מתחלק מקופת כלל השכונות לרכזי הרשת','#f59e0b','rgba(245,158,11,0.12)'],
					['📈','5% מועדון ההשקעות','זכות להשקיע בפלטפורמה — תשואה עתידית','#d97706','rgba(217,119,6,0.12)'],
					['🛍️','10% רכישות בקהילה','זכות לרכוש שירותים ומוצרים אצל בעלי מקצוע כשירים','#b45309','rgba(180,83,9,0.12)']
				] as [ico,title,desc,color,bg]}
					<div class="rounded-lg p-2.5 flex gap-2.5 items-center" style="background:{bg}; border:1px solid {color}40;">
						<div class="w-10 h-10 rounded-md flex items-center justify-center text-lg flex-shrink-0" style="background:{color}20;">{ico}</div>
						<div class="flex-1">
							<div class="font-bold text-white text-xs">{title}</div>
							<p class="text-gray-400 text-[10px] leading-tight">{desc}</p>
						</div>
						<div class="text-base font-black flex-shrink-0" style="color:{color};">{title.split('%')[0].replace(/\D/,'')}%</div>
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
				class="flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-black text-base transition-all duration-200 hover:scale-105 hover:brightness-110 shadow-lg w-64"
				style="background:linear-gradient(135deg,#1e3a8a,#3b82f6); border:2px solid rgba(147,197,253,0.35);">
				<span class="text-xl">📈</span>
				<span>רכישת מניות</span>
			</button>
			<button
				onclick={() => setTab('coordinator')}
				class="flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-black text-base transition-all duration-200 hover:scale-105 hover:brightness-110 shadow-lg w-64"
				style="background:linear-gradient(135deg,#78350f,#f59e0b); border:2px solid rgba(251,191,36,0.35);">
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

	:global(#section-4:target h2),
	:global(#section-5:target h2),
	:global(#section-6:target h2) {
		animation: flash-title 4s ease-out forwards;
	}

	.service-cell {
		position: relative;
	}
	.service-cell::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 14%;
		right: 0;
		height: 1px;
		background: rgba(255,255,255,0.08);
	}
	.service-cell::before {
		content: '';
		position: absolute;
		right: 0;
		top: 14%;
		bottom: 0;
		width: 1px;
		background: rgba(255,255,255,0.08);
	}
</style>
