<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
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
				labels: [$_('aboutRevenue.chartDirectWallet'), $_('aboutRevenue.chartAdFund'), ''],
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
				labels: [$_('aboutRevenue.chartFreedom'), $_('aboutRevenue.chartCharityFund'), $_('aboutRevenue.chartLottery'), ''],
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
				labels: [$_('aboutRevenue.chartDirectWallet'), $_('aboutRevenue.chartGroupReward'), $_('aboutRevenue.chartInvestClub'), $_('aboutRevenue.chartPurchases'), ''],
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
	<title>אודות קהילה בשכונה | כל יתרונות השכונה במקום אחד</title>
	<meta name="description" content="קהילה בשכונה — הפלטפורמה הקהילתית הראשונה בישראל המחברת את התושבים לכל השירותים, היתרונות והמשאבים של השכונה. הכירו את התנועה, שיטת התגמול והרכזים, והצטרפו אלינו." />
	<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
	<link rel="canonical" href="https://community.gofreeil.com/about/revenue" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="קהילה בשכונה" />
	<meta property="og:title" content="אודות קהילה בשכונה" />
	<meta property="og:description" content="הפלטפורמה הקהילתית הראשונה בישראל המחברת את התושבים לכל יתרונות השכונה — יד שנייה, שידוכים, גמ״חים, חוגים ועוד. הכירו את התנועה והצטרפו אלינו." />
	<meta property="og:image" content="https://community.gofreeil.com/images/community-logo1.png" />
	<meta property="og:image:width" content="1024" />
	<meta property="og:image:height" content="1024" />
	<meta property="og:url" content="https://community.gofreeil.com/about/revenue" />
	<meta property="og:locale" content="he_IL" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="אודות קהילה בשכונה" />
	<meta name="twitter:description" content="הפלטפורמה הקהילתית הראשונה בישראל המחברת את התושבים לכל יתרונות השכונה. הכירו את התנועה והצטרפו אלינו." />
	<meta name="twitter:image" content="https://community.gofreeil.com/images/community-logo1.png" />
</svelte:head>

<div class="text-white" dir="rtl">

	<!-- TAB BAR -->
	<div class="flex gap-2 mb-6 p-1.5 rounded-2xl backdrop-blur-lg"
		style="background: rgba(7,11,20,0.85); border: 1px solid rgba(255,255,255,0.1);">
		{#each ([['about','🏘️','aboutRevenue.tabAbout'],['rewards','💰','aboutRevenue.tabRewards'],['owners','🏛️','aboutRevenue.tabOwners'],['coordinator','👥','aboutRevenue.tabCoordinator']] as const) as [id, icon, label]}
			<button
				onclick={() => setTab(id as TabId)}
				class="flex-1 flex items-center justify-center gap-2 px-2 py-3 rounded-xl font-black text-xs md:text-sm transition-all duration-200"
				style={activeTab === id
					? 'background: linear-gradient(135deg,#2563eb,#7c3aed); color:#fff; box-shadow: 0 4px 15px rgba(37,99,235,0.4);'
					: 'color:#94a3b8;'}>
				{icon} {$_(label)}
			</button>
		{/each}
	</div>

	<!-- ABOUT TAB -->
	<div class:hidden={activeTab !== 'about'}>

		<!-- Hero -->
		<div class="relative rounded-3xl px-8 py-10 text-center mb-8 shadow-2xl overflow-hidden"
			style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4c1d95 100%);">
			<div class="absolute inset-0 pointer-events-none"
				style="background:radial-gradient(ellipse at 60% 20%,rgba(139,92,246,0.4) 0%,transparent 60%),radial-gradient(ellipse at 20% 80%,rgba(59,130,246,0.25) 0%,transparent 50%);"></div>
			<div class="relative z-10">
				<img src="/images/community-neighborhood.png" alt={$_('aboutRevenue.heroImageAlt')} class="mx-auto mb-6 w-full md:w-[40rem] lg:w-[64rem] object-contain rounded-3xl" />
				<h1 class="text-4xl md:text-5xl font-black leading-tight mb-4" style="color:#facc15;">{$_('aboutRevenue.heroTitle')}</h1>
				<p class="text-indigo-100 text-base md:text-lg max-w-2xl mx-auto mb-6 font-bold">
					{$_('aboutRevenue.heroSubtitle')}
				</p>
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-0 mt-2">
					{#each [
						['🤲','aboutRevenue.heroFeature1'],
						['🤝','aboutRevenue.heroFeature2'],
						['💪','aboutRevenue.heroFeature3'],
						['💰','aboutRevenue.heroFeature4']
					] as [ico,txt], i}
						<div class="px-3 py-3 text-center flex flex-col items-center gap-1.5" style="border: 0.5px solid rgba(255,255,255,0.12);">
							<div class="text-xl">{ico}</div>
							<p class="text-xs sm:text-sm leading-snug font-semibold text-indigo-100">{$_(txt)}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- מה זה + שירותי השכונה - מסגרת אחת -->
		<div class="mb-8 rounded-3xl p-6" style="background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid rgba(139,92,246,0.2);">

			<!-- מה זה? - שורה אחת ארוכה -->
			<h2 class="text-2xl font-black mb-3 text-purple-300">{$_('aboutRevenue.whatTitle')}</h2>
			<p class="text-base md:text-lg text-gray-200 leading-relaxed mb-5">
				{$_('aboutRevenue.whatText')}
			</p>

			<!-- קו מפריד -->
			<div class="mb-5 mr-0 ml-auto" style="height:1px; width:66%; background:rgba(139,92,246,0.25);"></div>

			<!-- שירותי השכונה -->
			<h2 class="text-xl font-black mb-4 text-white">{$_('aboutRevenue.servicesTitle')}</h2>
			<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
				{#each [
					['🎁','aboutRevenue.svc1Title','aboutRevenue.svc1Desc'],
					['📦','aboutRevenue.svc2Title','aboutRevenue.svc2Desc'],
					['👶','aboutRevenue.svc3Title','aboutRevenue.svc3Desc'],
					['✡️','aboutRevenue.svc4Title','aboutRevenue.svc4Desc'],
					['🏪','aboutRevenue.svc5Title','aboutRevenue.svc5Desc'],
					['🎨','aboutRevenue.svc6Title','aboutRevenue.svc6Desc'],
					['🏠','aboutRevenue.svc7Title','aboutRevenue.svc7Desc'],
					['💑','aboutRevenue.svc8Title','aboutRevenue.svc8Desc'],
					['🚗','aboutRevenue.svc9Title','aboutRevenue.svc9Desc'],
					['🔍','aboutRevenue.svc10Title','aboutRevenue.svc10Desc'],
					['📅','aboutRevenue.svc11Title','aboutRevenue.svc11Desc'],
					['💼','aboutRevenue.svc12Title','aboutRevenue.svc12Desc']
				] as [ico,title,desc]}
					<div class="service-cell p-4 flex flex-col gap-1.5 transition-all hover:bg-white/5">
						<span class="text-2xl">{ico}</span>
						<div class="font-black text-sm md:text-base text-indigo-200">{$_(title)}</div>
						<p class="text-gray-400 text-xs md:text-sm leading-relaxed">{$_(desc)}</p>
					</div>
				{/each}
			</div>

			<!-- מה הפלטפורמה מאפשרת -->
			<ul class="space-y-3 mb-5 mt-6">
				{#each [
					['aboutRevenue.enable1','#60a5fa'],
					['aboutRevenue.enable2','#facc15'],
					['aboutRevenue.enable3','#f59e0b'],
					['aboutRevenue.enable4','#34d399']
				] as [txt, clr]}
					<li class="flex items-start gap-3 text-base md:text-lg text-gray-100 leading-relaxed">
						<span class="mt-1 text-lg font-black flex-shrink-0" style="color:{clr};">✦</span>
						<span>{$_(txt)}</span>
					</li>
				{/each}
			</ul>
			<div class="pt-4">
				<div style="width:50%; height:1px; background:rgba(255,255,255,0.1); margin-bottom:1rem;"></div>
				<p class="text-indigo-200 text-base md:text-lg leading-relaxed mb-2">{$_('aboutRevenue.hopeText')}</p>
				<p class="text-2xl md:text-3xl font-black" style="color:#facc15;">{$_('aboutRevenue.unityText')}</p>
			</div>
		</div>

		<!-- ערכים -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-4 text-white">{$_('aboutRevenue.valuesTitle')}</h2>
			<div class="grid grid-cols-5 gap-0">
				{#each [['🎯','aboutRevenue.value1Title','aboutRevenue.value1Desc'],['🤝','aboutRevenue.value2Title','aboutRevenue.value2Desc'],['💰','aboutRevenue.value3Title','aboutRevenue.value3Desc'],['💪','aboutRevenue.value4Title','aboutRevenue.value4Desc'],['🦅','aboutRevenue.value5Title','aboutRevenue.value5Desc']] as [ico,title,desc]}
					<div class="px-3 py-5 flex flex-col gap-2 text-center" style="border-bottom:1px solid rgba(255,255,255,0.08); border-right:1px solid rgba(255,255,255,0.08);">
						<div class="text-2xl md:text-3xl">{ico}</div>
						<div class="font-black text-white text-xs md:text-base">{$_(title)}</div>
						<p class="text-gray-400 text-sm leading-snug hidden md:block">{$_(desc)}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- תת-כותרת מודל כלכלי -->
		<p class="text-lg md:text-xl font-bold text-white leading-relaxed mt-4 mb-2">
			{$_('aboutRevenue.modelIntro')} <button
				onclick={() => setTab('rewards')}
				class="inline items-baseline gap-1 font-bold text-yellow-300 hover:text-yellow-200 underline underline-offset-4 decoration-yellow-400/60 hover:decoration-yellow-300 transition-colors duration-200"
			>{$_('aboutRevenue.modelIntroCta')}</button>
		</p>

	</div><!-- /about tab -->

	<!-- REWARDS TAB -->
	<div class:hidden={activeTab !== 'rewards'}>

	<!-- HERO -->
	<div class="relative rounded-3xl px-8 py-10 text-center mb-8 shadow-2xl overflow-hidden"
		style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%);">
		<div class="absolute inset-0 pointer-events-none"
			style="background: radial-gradient(ellipse at 70% 30%, rgba(124,58,237,0.35) 0%, transparent 60%);"></div>
		<div class="relative z-10">
			<h1 class="text-4xl md:text-6xl font-black leading-tight mb-4" style="color:#facc15;">
				🏆 {$_('aboutRevenue.rewardsHeroTitle')}
			</h1>
			<p class="text-indigo-200 text-base md:text-lg max-w-2xl mx-auto">
				{data.hero_subtitle}
			</p>

			<!-- 1. תקציר חלוקת הרווחים - בתוך ה-hero -->
			<div class="mt-8 pt-6 border-t border-white/10">
				<h2 class="text-xl font-black mb-1">
					{$_('aboutRevenue.summaryTitle')}
				</h2>
				<p class="text-indigo-200 text-sm mb-6 text-center">{$_('aboutRevenue.summarySubtitle')}</p>
				<div class="grid grid-cols-3 gap-2 sm:gap-4">
					{#each data.distribution as card}
						<a href={card.link}
							class="rounded-2xl p-2 sm:p-4 text-center relative overflow-hidden shadow-xl flex flex-col hover:scale-105 hover:brightness-110 transition-all duration-200"
							style="background: linear-gradient(135deg, {card.from}, {card.to});">
							<div class="text-3xl sm:text-5xl mb-1">{card.emoji}</div>
							<div class="text-3xl sm:text-6xl font-black leading-none mb-1">{card.pct}</div>
							<div class="text-sm sm:text-xl font-bold mb-1 sm:mb-2">{card.title}</div>
							<div class="text-xs sm:text-base opacity-90 leading-relaxed">{card.desc}</div>
							<div class="mt-auto pt-2 text-[10px] sm:text-sm font-black">
								<span class="inline-block px-2 py-0.5 rounded-full bg-black/30 text-yellow-200">{$_('aboutRevenue.fullDetail')}</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- 2. ערוצי ההכנסה -->
	<div class="mb-8">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0"
				style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity:0.85;">1</span>
			{$_('aboutRevenue.channelsTitle')}
		</h2>
		<p class="text-gray-300 text-base md:text-lg mb-4 max-w-2xl">{$_('aboutRevenue.channelsSubtitle')}</p>
		<div class="grid grid-cols-6 sm:grid-cols-2 lg:grid-cols-5">
			{#each data.channels as ch, i}
				<div class="col-span-2 sm:col-span-1 {i === 3 ? 'col-start-2 sm:col-start-auto' : ''} p-2 sm:p-5 flex flex-col gap-1.5 transition-all hover:bg-white/5"
					style="border-bottom:1px solid rgba(255,255,255,0.08); border-right:1px solid rgba(255,255,255,0.08);">
					<div class="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl sm:text-3xl mb-1"
						style="background: {ch.bg}; color: {ch.color};">{ch.icon}</div>
					<h3 class="font-black text-sm sm:text-lg">{ch.title}</h3>
					<p class="text-gray-400 text-[11px] sm:text-sm leading-relaxed">{ch.desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- 3. עלויות -->
	<div class="mb-8">
		<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
			<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black text-black flex-shrink-0"
				style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity:0.85;">2</span>
			{$_('aboutRevenue.costsTitle')}
		</h2>
		<div class="rounded-2xl p-8 mt-6" style="background: linear-gradient(135deg,#1a1035,#0f172a); border: 1px solid rgba(234,179,8,0.25);">
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
						<span class="font-bold text-gray-400 text-[10px] text-center leading-tight">{$_('aboutRevenue.costsTotal1')}<br/>{$_('aboutRevenue.costsTotal2')}</span>
					</div>
				</div>
				<!-- גרף עלויות HTML/CSS - פינות מעוגלות מושלמות בכל צדדים -->
				<div class="flex flex-col gap-5 w-full justify-center py-2">
					<!-- סרגל מוערם -->
					<div class="rounded-2xl overflow-hidden flex w-full" style="height: 90px;" dir="ltr">
						<!-- כסף לחלוקה 65% -->
						<div class="flex flex-col items-center justify-center gap-0.5" style="width: 65%; background: #facc15;">
							<span class="text-2xl font-black text-black leading-none">65%</span>
							<span class="text-sm font-bold text-black opacity-80">{$_('aboutRevenue.barDistributable')}</span>
						</div>
						<!-- הוצאות 35% -->
						<div class="flex flex-col items-center justify-center gap-0.5 text-white" style="width: 35%; background: #334155;">
							<span class="text-2xl font-black leading-none">35%</span>
							<span class="text-sm font-bold opacity-80">{$_('aboutRevenue.barExpenses')}</span>
						</div>
					</div>
					<!-- מקרא -->
					<div class="flex items-center justify-center gap-6 text-sm" dir="rtl">
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 rounded-md" style="background: #334155;"></div>
							<span class="text-gray-300">{$_('aboutRevenue.legendExpenses')}</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 rounded-md" style="background: #facc15;"></div>
							<span class="text-gray-300">{$_('aboutRevenue.legendProfits')}</span>
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
			{$_('aboutRevenue.coordIncomeTitle')}
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
						<div class="font-black text-white text-xs md:text-base mb-0.5">{$_('aboutRevenue.coordDirectTitle')}</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">{$_('aboutRevenue.coordDirectDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">💰</span>
				</div>

				<!-- 5% עקיף -->
				<div class="rounded-lg p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#92400e,#1e293b); border: 1px solid rgba(217,119,6,0.4);">
					<div class="w-10 h-10 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0"
						style="background: rgba(217,119,6,0.2); color: #f59e0b;">5%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">{$_('aboutRevenue.coordGroupTitle')}</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">{$_('aboutRevenue.coordGroupDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">🤝</span>
				</div>

				<!-- 5% השקעות -->
				<div class="rounded-lg p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(180,83,9,0.4);">
					<div class="w-10 h-10 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0"
						style="background: rgba(180,83,9,0.2); color: #d97706;">5%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">{$_('aboutRevenue.coordInvestTitle')}</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">{$_('aboutRevenue.coordInvestDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">📈</span>
				</div>

				<!-- 10% קניות -->
				<div class="rounded-lg p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#78350f,#1e293b); border: 1px solid rgba(245,158,11,0.4);">
					<div class="w-10 h-10 rounded-md flex items-center justify-center text-sm font-black flex-shrink-0"
						style="background: rgba(245,158,11,0.2); color: #fbbf24;">10%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">{$_('aboutRevenue.coordPurchaseTitle')}</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">{$_('aboutRevenue.coordPurchaseDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">🛍️</span>
				</div>
			</div>

			<!-- גרף עוגה -->
			<div class="rounded-2xl p-3 flex flex-col items-center" style="background:#0f172a; border:1px solid rgba(245,158,11,0.2);">
				<h3 class="font-black text-amber-400 mb-2 text-xs">{$_('aboutRevenue.coordChartTitle')}</h3>
				<div class="h-56 w-full"><canvas id="coordinatorChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#78350f,#1a1035); border: 2px solid rgba(245,158,11,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🏆</span>
				<div>
					<div class="font-black text-white text-base md:text-lg">{$_('aboutRevenue.coordTotalTitle')}</div>
					<div class="text-xs md:text-sm text-gray-400">{$_('aboutRevenue.coordTotalBreakdown')}</div>
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
			{$_('aboutRevenue.ownersIncomeTitle')}
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
						<div class="font-black text-white text-sm md:text-base mb-0.5">{$_('aboutRevenue.ownersDirectTitle')}</div>
						<p class="text-gray-300 text-xs md:text-sm leading-relaxed">{$_('aboutRevenue.ownersDirectDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">💰</span>
				</div>
				<!-- 10% פרסום -->
				<div class="rounded-2xl p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#1d4ed8,#1e293b); border: 1px solid rgba(37,99,235,0.4);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
						style="background: rgba(37,99,235,0.2); color: #60a5fa;">10%</div>
					<div class="flex-1">
						<div class="font-black text-white text-sm md:text-base mb-0.5">{$_('aboutRevenue.adFundTitle')}</div>
						<p class="text-gray-300 text-xs md:text-sm leading-relaxed">{$_('aboutRevenue.adFundDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">📣</span>
				</div>
			</div>

			<!-- שמאל: גרף עגול -->
			<div class="rounded-2xl p-4 flex flex-col items-center relative" style="background:#0f172a; border:1px solid rgba(59,130,246,0.2);">
				<h3 class="absolute top-3 right-3 font-black text-blue-400 text-xs text-right leading-tight">{$_('aboutRevenue.ownersChartTitle1')}<br/>{$_('aboutRevenue.ownersChartTitle2')}</h3>
				<div class="h-48 w-full"><canvas id="ownersChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#1e3a8a,#1a1035); border: 2px solid rgba(59,130,246,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🏛️</span>
				<div>
					<div class="font-black text-white text-lg md:text-xl">{$_('aboutRevenue.ownersTotalTitle')}</div>
					<div class="text-sm text-gray-400">{$_('aboutRevenue.ownersTotalBreakdown')}</div>
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
			{$_('aboutRevenue.charityTitle')}
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
						<div class="font-black text-white text-xs md:text-base mb-0.5">{$_('aboutRevenue.freedomTitle')}</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">{$_('aboutRevenue.freedomDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">🕊️</span>
				</div>

				<!-- 9% קופת הצדקה -->
				<div class="rounded-2xl p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#065f46,#1e293b); border: 1px solid rgba(5,150,105,0.4);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
						style="background: rgba(5,150,105,0.2); color: #34d399;">9%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">{$_('aboutRevenue.charityFundTitle')}</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">{$_('aboutRevenue.charityFundDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">❤️</span>
				</div>

				<!-- 1% הגרלה -->
				<div class="rounded-2xl p-3 flex gap-3 items-center"
					style="background: linear-gradient(135deg,#064e3b,#1e293b); border: 1px solid rgba(16,185,129,0.3);">
					<div class="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
						style="background: rgba(16,185,129,0.15); color: #10b981;">1%</div>
					<div class="flex-1">
						<div class="font-black text-white text-xs md:text-base mb-0.5">{$_('aboutRevenue.lotteryTitle')}</div>
						<p class="text-gray-300 text-[10px] md:text-sm leading-tight">{$_('aboutRevenue.lotteryDesc')}</p>
					</div>
					<span class="text-2xl md:text-3xl leading-none flex-shrink-0">🎲</span>
				</div>
			</div>

			<!-- גרף -->
			<div class="rounded-2xl p-4 flex flex-col items-center relative" style="background:#0f172a; border:1px solid rgba(16,185,129,0.2);">
				<h3 class="absolute top-3 right-3 font-black text-emerald-400 text-xs text-right leading-tight">{$_('aboutRevenue.charityChartTitle1')}<br/>{$_('aboutRevenue.charityChartTitle2')}</h3>
				<div class="h-48 w-full"><canvas id="charityChart"></canvas></div>
			</div>
		</div>

		<!-- סיכום -->
		<div class="rounded-2xl p-5 flex items-center justify-between"
			style="background: linear-gradient(135deg,#064e3b,#1a1035); border: 2px solid rgba(16,185,129,0.5);">
			<div class="flex items-center gap-3">
				<span class="text-2xl">🤲</span>
				<div>
					<div class="font-black text-white text-lg md:text-xl">{$_('aboutRevenue.charityTotalTitle')}</div>
					<div class="text-sm text-gray-400">{$_('aboutRevenue.charityTotalBreakdown')}</div>
				</div>
			</div>
			<div class="text-4xl font-black text-emerald-300">20%</div>
		</div>
	</div>

	<!-- תת-כותרת היה מהבעלים -->
	<p class="text-lg md:text-xl font-bold leading-relaxed mt-4 mb-2">
		<button
			onclick={() => setTab('owners')}
			class="inline items-baseline gap-1 font-bold text-yellow-300 hover:text-yellow-200 underline underline-offset-4 decoration-yellow-400/60 hover:decoration-yellow-300 transition-colors duration-200"
		>{$_('aboutRevenue.ownersCta')}</button>
	</p>

	</div><!-- /rewards tab -->

	<!-- OWNERS TAB -->
	<div class:hidden={activeTab !== 'owners'}>

		<!-- HERO בעלים -->
		<div class="relative rounded-3xl px-8 py-10 text-center mb-8 shadow-2xl overflow-hidden"
			style="background: linear-gradient(135deg,#1e1b4b 0%,#1e3a8a 50%,#1e293b 100%);">
			<div class="absolute inset-0 pointer-events-none"
				style="background: radial-gradient(ellipse at 30% 30%, rgba(59,130,246,0.3) 0%, transparent 60%);"></div>
			<div class="relative z-10">
				<h1 class="text-3xl md:text-5xl font-black leading-tight mb-4" style="color:#93c5fd;">
					🏛️ {$_('aboutRevenue.ownersHeroTitle')}
				</h1>
				<p class="text-blue-100 text-base md:text-lg max-w-2xl mx-auto mb-6">
					{$_('aboutRevenue.ownersHeroSubtitle')}
				</p>
				<!-- סטטיסטיקות מהירות -->
				<div class="grid grid-cols-2 md:grid-cols-5 gap-2">
					{#each [
						['♾️','aboutRevenue.stat1Val','aboutRevenue.stat1Lbl','#a78bfa'],
						['💰','aboutRevenue.stat2Val','aboutRevenue.stat2Lbl','#34d399'],
						['🌐','aboutRevenue.stat3Val','aboutRevenue.stat3Lbl','#60a5fa'],
						['📣','aboutRevenue.stat4Val','aboutRevenue.stat4Lbl','#facc15'],
						['🗳️','aboutRevenue.stat5Val','aboutRevenue.stat5Lbl','#f472b6']
					] as [ico,val,lbl,clr]}
						<div class="rounded-xl p-3 text-center" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);">
							<div class="text-3xl mb-1">{ico}</div>
							<div class="text-lg font-black leading-tight" style="color:{clr};">{$_(val)}</div>
							<div class="text-sm text-blue-200 mt-0.5 leading-tight">{$_(lbl)}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- 1. ביזור לעומת ריכוז -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">1</span>
				{$_('aboutRevenue.decentTitle')}
			</h2>
			<p class="text-gray-300 text-lg mb-4 max-w-3xl leading-relaxed">
				{$_('aboutRevenue.decent1')}<span class="text-yellow-300 font-black">{$_('aboutRevenue.decentStrong1')}</span>{$_('aboutRevenue.decent2')}<span class="text-yellow-300 font-black">{$_('aboutRevenue.decentStrong2')}</span><br/>
				{$_('aboutRevenue.decent3')}<span class="text-blue-300 font-bold">{$_('aboutRevenue.decentStrong3')}</span>
			</p>
			<div class="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 py-2">
				<!-- ריכוז -->
				<div class="pb-6 md:pb-0 md:pl-8">
					<div class="flex items-center gap-3 mb-4">
						<span class="text-3xl">❌</span>
						<h3 class="font-black text-red-400 text-lg">{$_('aboutRevenue.centralTitle')}</h3>
					</div>
					<ul class="space-y-2 text-lg text-gray-300">
						<li class="flex gap-2"><span class="text-red-400">•</span> {$_('aboutRevenue.central1')}</li>
						<li class="flex gap-2"><span class="text-red-400">•</span> {$_('aboutRevenue.central2')}</li>
						<li class="flex gap-2"><span class="text-red-400">•</span> {$_('aboutRevenue.central3')}</li>
					</ul>
				</div>
				<!-- ביזור -->
				<div class="pt-6 md:pt-0 md:pr-8">
					<div class="flex items-center gap-3 mb-4">
						<span class="text-3xl">✅</span>
						<h3 class="font-black text-emerald-400 text-lg">{$_('aboutRevenue.decentModelTitle')}</h3>
					</div>
					<ul class="space-y-2 text-lg text-gray-300">
						<li class="flex gap-2"><span class="text-emerald-400">•</span> {$_('aboutRevenue.decentList1')}</li>
						<li class="flex gap-2"><span class="text-emerald-400">•</span> {$_('aboutRevenue.decentList2')}</li>
						<li class="flex gap-2"><span class="text-emerald-400">•</span> {$_('aboutRevenue.decentList3')}</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- 2. החלטות משותפות -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">2</span>
				{$_('aboutRevenue.decisionsTitle')}
			</h2>
			<p class="text-gray-400 text-lg mb-4 max-w-2xl">{$_('aboutRevenue.decisionsSubtitle')}</p>
			<div class="grid grid-cols-2 sm:grid-cols-3">
				{#each [['📣','aboutRevenue.decision1'],['📜','aboutRevenue.decision2'],['💲','aboutRevenue.decision3'],['⚙️','aboutRevenue.decision4'],['🚫','aboutRevenue.decision5'],['📋','aboutRevenue.decision6']] as [ico, lbl], i}
					<div class="py-5 px-5 flex items-center gap-3 relative">
						{#if i < 3}
							<div class="absolute bottom-0 right-[10%] left-[10%] h-px bg-white/10"></div>
						{/if}
						{#if i % 3 !== 2}
							<div class="absolute top-[10%] bottom-[10%] left-0 w-px bg-white/10 hidden sm:block"></div>
						{/if}
						<span class="text-2xl">{ico}</span>
						<span class="font-bold text-lg text-blue-100">{$_(lbl)}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- 3. צורת המודל + יתרונות לכל הצדדים -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">3</span>
				{$_('aboutRevenue.shapeTitle')}
			</h2>
			<p class="text-xl md:text-2xl font-black text-blue-100 leading-relaxed mb-5">
				{$_('aboutRevenue.shape1')}<span class="text-yellow-300 font-black">{$_('aboutRevenue.shapeCapitalist')}</span>{$_('aboutRevenue.shape2')}<span class="text-yellow-300 font-black">{$_('aboutRevenue.shapeCommunist')}</span>{$_('aboutRevenue.shape3')}<span class="text-yellow-300 font-black">{$_('aboutRevenue.shapeHomesteads')}</span>{$_('aboutRevenue.shape4')}
			</p>

			<div class="grid grid-cols-1 sm:grid-cols-2">
				{#each [
					['👤','aboutRevenue.benefit1Title','#3b82f6','aboutRevenue.benefit1Desc'],
					['🏪','aboutRevenue.benefit2Title','#f59e0b','aboutRevenue.benefit2Desc'],
					['❤️','aboutRevenue.benefit3Title','#10b981','aboutRevenue.benefit3Desc'],
					['🏘️','aboutRevenue.benefit4Title','#f472b6','aboutRevenue.benefit4Desc']
				] as [ico, title, color, desc], i}
					<div class="py-5 px-4 flex gap-4 items-start relative">
						{#if i < 3}
							<div class="absolute bottom-0 right-[5%] left-[5%] h-px bg-white/10 sm:hidden"></div>
						{/if}
						{#if i < 2}
							<div class="absolute bottom-0 right-[5%] left-[5%] h-px bg-white/10 hidden sm:block"></div>
						{/if}
						{#if i % 2 === 0}
							<div class="absolute top-[10%] bottom-[10%] left-0 w-px bg-white/10 hidden sm:block"></div>
						{/if}
						<div class="flex-1">
							<div class="font-black text-base mb-1" style="color:{color};">{$_(title)}</div>
							<p class="text-gray-300 text-lg leading-relaxed">{$_(desc)}</p>
						</div>
						<span class="text-3xl mt-0.5 flex-shrink-0">{ico}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- 4. עלות רכישה -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">4</span>
				{$_('aboutRevenue.purchaseCostTitle')}
			</h2>
			<div class="grid md:grid-cols-2 gap-5">
				<!-- מחיר -->
				<div class="rounded-2xl p-8 text-center flex flex-col items-center justify-center h-full" style="background:linear-gradient(135deg,#1e3a8a,#1e1b4b); border:2px solid rgba(147,197,253,0.4);">
					<div class="text-6xl font-black text-yellow-300 mb-2">200₪</div>
					<div class="text-xl font-black text-white mb-1">{$_('aboutRevenue.priceUnit')}</div>
					<div class="text-gray-400 text-lg">{$_('aboutRevenue.priceNote')}</div>
				</div>
				<!-- פרטים -->
				<div class="flex flex-col gap-2">
					{#each [
						['💬','aboutRevenue.buy1Title','aboutRevenue.buy1Desc'],
						['©️','aboutRevenue.buy2Title','aboutRevenue.buy2Desc'],
						['🔄','aboutRevenue.buy3Title','aboutRevenue.buy3Desc'],
						['🔒','aboutRevenue.buy4Title','aboutRevenue.buy4Desc']
					] as [ico, title, desc]}
						<div class="rounded-xl px-3 py-2 flex gap-2.5 items-center"
							style="background:rgba(255,255,255,0.04); border:1px solid rgba(59,130,246,0.2);">
							<div class="flex-1">
								<div class="font-black text-blue-200 text-base leading-tight">{$_(title)}</div>
								<div class="text-gray-400 text-sm leading-tight mt-0.5">{$_(desc)}</div>
							</div>
							<span class="text-lg flex-shrink-0">{ico}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- 5. הוצאות שוטפות -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background: linear-gradient(135deg,#facc15,#f59e0b);">5</span>
				{$_('aboutRevenue.expensesTitle')}
			</h2>
			<div class="rounded-2xl p-7 flex flex-col md:flex-row gap-6 items-center"
				style="background:linear-gradient(135deg,#1a1035,#1e293b); border:1px solid rgba(250,204,21,0.25);">
				<div class="text-center flex-shrink-0">
					<div class="text-6xl font-black text-yellow-300">35%</div>
					<div class="text-lg text-gray-400 mt-1">{$_('aboutRevenue.expensesOf')}</div>
				</div>
				<div class="text-lg text-gray-300 leading-relaxed">
					<p class="mb-3">{$_('aboutRevenue.expensesP1a')}<span class="text-yellow-300 font-bold">{$_('aboutRevenue.expensesP1Strong')}</span>{$_('aboutRevenue.expensesP1b')}</p>
					<p>{$_('aboutRevenue.expensesP2a')}<span class="text-yellow-300 font-bold">{$_('aboutRevenue.expensesP2Strong')}</span>{$_('aboutRevenue.expensesP2b')}</p>
				</div>
			</div>
		</div>

		<!-- תת-כותרת היה רכז -->
		<p class="text-lg md:text-xl font-bold text-white leading-relaxed mt-4 mb-2">
			{$_('aboutRevenue.coordCtaText')}<button
				onclick={() => setTab('coordinator')}
				class="inline items-baseline gap-1 font-bold text-yellow-300 hover:text-yellow-200 underline underline-offset-4 decoration-yellow-400/60 hover:decoration-yellow-300 transition-colors duration-200"
			>{$_('aboutRevenue.coordCtaLink')}</button>
		</p>

	</div><!-- /owners tab -->

	<!-- COORDINATOR TAB -->
	<div class:hidden={activeTab !== 'coordinator'}>

		<!-- Hero -->
		<div class="relative rounded-3xl px-8 py-10 text-center mb-8 shadow-2xl overflow-hidden"
			style="background:linear-gradient(135deg,#78350f 0%,#92400e 45%,#1e293b 100%);">
			<div class="absolute inset-0 pointer-events-none"
				style="background:radial-gradient(ellipse at 50% 30%,rgba(245,158,11,0.35) 0%,transparent 60%);"></div>
			<div class="relative z-10">
				<img src="/images/committee.png" alt={$_('aboutRevenue.coordHeroAlt')} class="mx-auto mb-6 w-full max-w-md md:max-w-2xl lg:max-w-4xl object-contain rounded-3xl" style="box-shadow: 0 0 60px 15px rgba(251,191,36,0.35), 0 0 120px 30px rgba(245,158,11,0.2); border: 1px solid rgba(251,191,36,0.3);" />
				<h1 class="text-3xl md:text-5xl font-black leading-tight mb-4" style="color:#fbbf24;">
					{$_('aboutRevenue.coordHeroTitle')}
				</h1>
				<p class="text-amber-100 text-base md:text-lg max-w-2xl mx-auto mb-6">
					{$_('aboutRevenue.coordHeroSubtitle')}
				</p>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					{#each [
						['💰','30%','aboutRevenue.cstat1Lbl','#fbbf24'],
						['🎛️','','aboutRevenue.cstat2Lbl','#f59e0b'],
						['🌟','','aboutRevenue.cstat3Lbl','#d97706'],
						['🚀','','aboutRevenue.cstat4Lbl','#b45309']
					] as [ico,val,lbl,clr]}
						<div class="rounded-xl p-5 text-center flex flex-col items-center justify-between gap-2" style="background:rgba(0,0,0,0.3); border:1px solid rgba(245,158,11,0.3);">
							<div class="text-4xl md:text-5xl leading-none">{ico}</div>
							<div class="flex flex-col items-center gap-2">
								{#if val}
									<div class="text-3xl md:text-4xl font-black leading-none" style="color:{clr};">{val}</div>
								{/if}
								<div class="text-sm md:text-base text-amber-200 leading-snug font-bold">{$_(lbl)}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- תפקידי הרכז וחובותיו -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background:linear-gradient(135deg,#fbbf24,#d97706);">1</span>
				{$_('aboutRevenue.dutiesTitle')}
			</h2>

			<div class="rounded-2xl p-5 mt-6 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-amber-500/20"
				style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2);">
				<!-- חובה בפעילות בשטח -->
				<div class="pb-5 md:pb-0 md:pl-5">
					<div class="flex items-center gap-3 mb-4">
						<span class="text-3xl">🏘️</span>
						<div class="font-black text-amber-300 text-lg">{$_('aboutRevenue.fieldDutyTitle')}</div>
					</div>
					<ul class="space-y-3">
						{#each [
							'aboutRevenue.fieldDuty1',
							'aboutRevenue.fieldDuty2',
							'aboutRevenue.fieldDuty3',
							'aboutRevenue.fieldDuty4'
						] as item}
							<li class="flex gap-2 text-gray-300 text-base leading-relaxed">
								<span class="text-amber-400 mt-1 flex-shrink-0">✦</span>
								<span>{$_(item)}</span>
							</li>
						{/each}
					</ul>
				</div>

				<!-- חובה מוסרית ערכית -->
				<div class="pt-5 md:pt-0 md:pr-5">
					<div class="flex items-center gap-3 mb-4">
						<span class="text-3xl">🕊️</span>
						<div class="font-black text-amber-300 text-lg">{$_('aboutRevenue.moralDutyTitle')}</div>
					</div>
					<ul class="space-y-3">
						<li class="flex gap-2 text-gray-300 text-base leading-relaxed">
							<span class="text-amber-400 mt-1 flex-shrink-0">✦</span>
							<span>
								{$_('aboutRevenue.moral1a')}
								<a href="/about/charter" class="font-black text-yellow-300 hover:text-yellow-200 underline underline-offset-4 decoration-yellow-400/60 hover:decoration-yellow-300 transition-colors">{$_('aboutRevenue.moralCharterLink')}</a>{$_('aboutRevenue.moral1b')}
							</span>
						</li>
						<li class="flex gap-2 text-gray-300 text-base leading-relaxed">
							<span class="text-amber-400 mt-1 flex-shrink-0">✦</span>
							<span>{$_('aboutRevenue.moral2')}</span>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- זכויות הרכזים -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background:linear-gradient(135deg,#fbbf24,#d97706);">2</span>
				{$_('aboutRevenue.rightsTitle')}
			</h2>
			<p class="text-gray-400 text-base md:text-lg mb-4 max-w-2xl pr-12">{$_('aboutRevenue.rightsSubtitle')}</p>
			<div class="grid sm:grid-cols-2">
				{#each [
					['💰','aboutRevenue.right1Title','aboutRevenue.right1Desc'],
					['📅','aboutRevenue.right2Title','aboutRevenue.right2Desc'],
					['🏷️','aboutRevenue.right3Title','aboutRevenue.right3Desc'],
					['🚀','aboutRevenue.right4Title','aboutRevenue.right4Desc']
				] as [ico,title,desc], i}
					<div class="p-5 flex gap-4 items-start relative">
						{#if i < 3}
							<div class="absolute bottom-0 right-[5%] left-[5%] h-px bg-amber-500/20 sm:hidden"></div>
						{/if}
						{#if i < 2}
							<div class="absolute bottom-0 right-[5%] left-[5%] h-px bg-amber-500/20 hidden sm:block"></div>
						{/if}
						{#if i % 2 === 0}
							<div class="absolute top-[10%] bottom-[10%] left-0 w-px bg-amber-500/20 hidden sm:block"></div>
						{/if}
						<span class="text-3xl flex-shrink-0">{ico}</span>
						<div>
							<div class="font-black text-amber-300 mb-1 text-lg">{$_(title)}</div>
							<p class="text-gray-300 text-base leading-relaxed">{$_(desc)}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- התגמול המפורט -->
		<div class="mb-8" id="coordinator-detail" style="scroll-margin-top:110px;">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
					style="background:linear-gradient(135deg,#fbbf24,#d97706);">3</span>
				{$_('aboutRevenue.detailTitle')}
			</h2>
			<p class="text-gray-400 text-base md:text-lg mb-4 max-w-2xl pr-12">{$_('aboutRevenue.detailSubtitle')}</p>
			<div class="flex flex-col gap-1.5">
				{#each [
					['💰',$_('aboutRevenue.detail1Title'),$_('aboutRevenue.detail1Desc'),'#fbbf24','rgba(251,191,36,0.15)'],
					['🤝',$_('aboutRevenue.detail2Title'),$_('aboutRevenue.detail2Desc'),'#f59e0b','rgba(245,158,11,0.12)'],
					['📈',$_('aboutRevenue.detail3Title'),$_('aboutRevenue.detail3Desc'),'#d97706','rgba(217,119,6,0.12)'],
					['🛍️',$_('aboutRevenue.detail4Title'),$_('aboutRevenue.detail4Desc'),'#b45309','rgba(180,83,9,0.12)']
				] as [ico,title,desc,color,bg]}
					<div class="rounded-xl p-3 md:p-4 flex gap-3 items-center" style="background:{bg}; border:1px solid {color}40;">
						<div class="w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center text-2xl md:text-3xl flex-shrink-0" style="background:{color}20;">{ico}</div>
						<div class="flex-1 flex flex-col md:flex-row md:items-baseline md:gap-3">
							<div class="font-black text-white text-base md:text-xl flex-shrink-0">{title}</div>
							<p class="text-gray-300 text-sm md:text-base leading-snug">{desc}</p>
						</div>
						<div class="text-xl md:text-3xl font-black flex-shrink-0" style="color:{color};">{title.split('%')[0].replace(/\D/,'')}%</div>
					</div>
				{/each}
			</div>
			<!-- סיכום -->
			<div class="mt-4 rounded-2xl p-6 flex items-center justify-between"
				style="background:linear-gradient(135deg,#78350f,#1a1035); border:2px solid rgba(245,158,11,0.5);">
				<div class="flex items-center gap-4">
					<span class="text-3xl md:text-4xl">🏆</span>
					<div>
						<div class="font-black text-white text-lg md:text-2xl">{$_('aboutRevenue.coordTotalTitle')}</div>
						<div class="text-base md:text-lg text-gray-300">{$_('aboutRevenue.coordSummaryDesc')}</div>
					</div>
				</div>
				<div class="text-4xl md:text-5xl font-black text-amber-300">30%</div>
			</div>
		</div>

	</div><!-- /coordinator tab -->

	<!-- CTA משותף - מופיע בכל הטאבים -->
	<div class="mt-8 mb-2 rounded-2xl px-6 py-6 text-center"
		style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%); border:1px solid rgba(255,255,255,0.12); box-shadow:0 0 40px rgba(124,58,237,0.15);">
		<h2 class="text-xl md:text-2xl font-black mb-1">{$_('aboutRevenue.ctaTitle')}</h2>
		<p class="text-gray-300 text-sm mb-5 max-w-lg mx-auto">{$_('aboutRevenue.ctaSubtitle')}</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
			<button
				onclick={() => setTab('owners')}
				class="flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-black text-base transition-all duration-200 hover:scale-105 hover:brightness-110 shadow-lg w-64"
				style="background:linear-gradient(135deg,#1e3a8a,#3b82f6); border:2px solid rgba(147,197,253,0.35);">
				<span class="text-xl">📈</span>
				<span>{$_('aboutRevenue.ctaShares')}</span>
			</button>
			<button
				onclick={() => window.location.href = '/coordinator/apply'}
				class="flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-black text-base transition-all duration-200 hover:scale-105 hover:brightness-110 shadow-lg w-64"
				style="background:linear-gradient(135deg,#78350f,#f59e0b); border:2px solid rgba(251,191,36,0.35); cursor: pointer;">
				<span>{$_('aboutRevenue.ctaJoin')}</span>
			</button>
		</div>
	</div>

</div>

<style>
	/* גובה scroll - נייד 110px, דסקטופ 150px */
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
