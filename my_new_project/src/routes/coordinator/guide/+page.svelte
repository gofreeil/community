<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import Ed from './Ed.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// תוכן המדריך - עותק ריאקטיבי עמוק; עריכת הסופר-אדמין משנה אותו ישירות.
	// baseline = הגרסה השמורה האחרונה, לשחזור ב"ביטול". בכוונה נלכד הערך
	// ההתחלתי בלבד - העריכות חיות ב-c עד שמירה/ביטול, בלי תלות ב-data.
	// svelte-ignore state_referenced_locally
	let baseline = structuredClone(data.guide);
	// svelte-ignore state_referenced_locally
	let c = $state(structuredClone(data.guide));

	type TabId = 'path' | 'biz';
	let activeTab = $state<TabId>('path');

	// שורת הלשוניות דביקה מתחת להדר; גובה ההדר משתנה בין מובייל לדסקטופ
	let stickyTop = $state(0);
	onMount(() => {
		const header = document.querySelector('header');
		const updateStickyTop = () => { stickyTop = header ? (header as HTMLElement).offsetHeight : 0; };
		updateStickyTop();
		window.addEventListener('resize', updateStickyTop);
		return () => window.removeEventListener('resize', updateStickyTop);
	});

	onMount(() => {
		const hash = window.location.hash.replace('#', '');
		if (hash === 'biz') activeTab = 'biz';
	});

	function setTab(id: TabId) {
		activeTab = id;
		if (typeof window !== 'undefined') {
			history.replaceState(null, '', '#' + id);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	// ניווט מהיר משלבי ה-hero אל הסקציות
	async function goStage(id: string) {
		if (editMode) return;
		if (activeTab !== 'path') { activeTab = 'path'; await tick(); }
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
	}

	// ארבעת השלבים - צבעי הזהות של כל שלב (הכותרות עצמן נערכות בתוכן)
	const STAGE_META = [
		{ id: 'stage-a', letter: 'א', icon: '🗺️', color: '#60a5fa', grad: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' },
		{ id: 'stage-b', letter: 'ב', icon: '🤝', color: '#34d399', grad: 'linear-gradient(135deg,#064e3b,#10b981)' },
		{ id: 'stage-c', letter: 'ג', icon: '📣', color: '#a78bfa', grad: 'linear-gradient(135deg,#4c1d95,#8b5cf6)' },
		{ id: 'stage-d', letter: 'ד', icon: '💪', color: '#fbbf24', grad: 'linear-gradient(135deg,#78350f,#f59e0b)' },
	] as const;
	let stageTitles = $derived([c.stageA.title, c.stageB.title, c.stageC.title, c.stageD.title]);

	// ===== מצב עריכה (סופר-אדמין בלבד) =====
	let editMode = $state(false);
	let saving = $state(false);
	let savedToast = $state(false);
	let saveError = $state('');

	function cancelEdit() {
		c = structuredClone(baseline);
		editMode = false;
		saveError = '';
	}

	// העתקת הודעת הוואטסאפ המוכנה
	let copied = $state(false);
	async function copyWhatsapp() {
		try {
			await navigator.clipboard.writeText(c.biz.whatsapp.text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch { /* דפדפן ישן - אין הרשאת clipboard */ }
	}
</script>

<!-- הדגשת ממלאי-מקום כמו [שם בעל העסק] בתוך טקסט -->
{#snippet hl(text: string)}
	{#each text.split(/(\[[^\]]*\])/g) as part}
		{#if part.startsWith('[') && part.endsWith(']')}
			<span class="text-amber-300 font-bold">{part}</span>
		{:else}{part}{/if}
	{/each}
{/snippet}

<svelte:head>
	<title>מדריך רכז השכונה | קהילה בשכונה</title>
	<meta name="description" content="המדריך הפנימי לרכזי השכונות של קהילה בשכונה" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="text-white" dir="rtl">

	<!-- TAB BAR (דביק: נשאר על המסך בגלילה, מתחת להדר) -->
	<div class="sticky z-[1000] flex gap-2 mb-6 p-1.5 rounded-2xl backdrop-blur-lg"
		style="top:{stickyTop}px; background: rgba(7,11,20,0.85); border: 1px solid rgba(255,255,255,0.1);">
		{#each ([['path', '🗺️'], ['biz', '🏪']] as const) as [id, icon]}
			<button
				onclick={() => setTab(id as TabId)}
				class="flex-1 flex items-center justify-center gap-2 px-2 py-3 rounded-xl font-black text-xs md:text-sm transition-all duration-200"
				style={activeTab === id
					? 'background: linear-gradient(135deg,#b45309,#f59e0b); color:#fff; box-shadow: 0 4px 15px rgba(245,158,11,0.4);'
					: 'color:#94a3b8;'}>
				{icon}
				<span role="presentation" onclick={(e) => { if (editMode) e.stopPropagation(); }}>
					<Ed obj={c.tabs} k={id} edit={editMode} />
				</span>
			</button>
		{/each}
	</div>

	<!-- ================= טאב מסלול ההקמה ================= -->
	<div class:hidden={activeTab !== 'path'}>

		<!-- Hero -->
		<div class="relative rounded-3xl px-6 md:px-8 py-10 text-center mb-10 shadow-2xl overflow-hidden"
			style="background:linear-gradient(135deg,#78350f 0%,#92400e 45%,#1e293b 100%);">
			<div class="absolute inset-0 pointer-events-none"
				style="background:radial-gradient(ellipse at 50% 20%,rgba(245,158,11,0.35) 0%,transparent 60%),radial-gradient(ellipse at 15% 90%,rgba(124,58,237,0.2) 0%,transparent 50%);"></div>
			<div class="relative z-10">
				<div class="inline-block px-4 py-1.5 rounded-full text-xs md:text-sm font-black mb-4"
					style="background:rgba(0,0,0,0.35); border:1px solid rgba(251,191,36,0.4); color:#fcd34d;">
					📘 <Ed obj={c.hero} k="badge" edit={editMode} />
				</div>
				<h1 class="text-4xl md:text-5xl font-black leading-tight mb-4" style="color:#fbbf24;">
					<Ed obj={c.hero} k="title" edit={editMode} />
				</h1>
				<p class="text-amber-100 text-base md:text-lg max-w-2xl mx-auto mb-8 font-bold">
					<Ed obj={c.hero} k="subtitle" edit={editMode} />
				</p>

				<!-- מפת הדרכים - ארבעת השלבים (לחיצה קופצת לשלב) -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
					{#each STAGE_META as s, i}
						<button
							onclick={() => goStage(s.id)}
							class="rounded-2xl p-4 text-center flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105 hover:brightness-110 {editMode ? '' : 'cursor-pointer'}"
							style="background:rgba(0,0,0,0.3); border:1px solid rgba(245,158,11,0.3);">
							<span class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white shadow-lg"
								style="background:{s.grad}; border:2px solid rgba(255,255,255,0.25);">{s.letter}</span>
							<span class="text-2xl leading-none">{s.icon}</span>
							<span class="text-xs md:text-sm font-bold leading-snug" style="color:{s.color};">{stageTitles[i]}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- ציר ההקמה - קו זמן אנכי עם ארבעת השלבים -->
		<div class="relative">
			<!-- הקו המחבר - גרדיאנט בצבעי השלבים -->
			<div class="absolute top-6 bottom-6 right-[23px] w-0.5 rounded-full pointer-events-none"
				style="background:linear-gradient(180deg,#3b82f6 0%,#10b981 35%,#8b5cf6 70%,#f59e0b 100%); opacity:0.4;"></div>

			<!-- ===== שלב א - העלאת פרטים ===== -->
			<div id="stage-a" class="scroll-target mb-12 flex gap-4">
				<div class="flex-shrink-0 relative z-10">
					<span class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg"
						style="background:{STAGE_META[0].grad}; border:2px solid rgba(255,255,255,0.3); display:flex;">א</span>
				</div>
				<div class="flex-1 min-w-0">
					<div class="text-xs font-black uppercase tracking-wide mb-0.5" style="color:#60a5fa;">
						<Ed obj={c.stageA} k="kicker" edit={editMode} />
					</div>
					<h2 class="text-2xl md:text-3xl font-black text-white mb-4">
						<Ed obj={c.stageA} k="title" edit={editMode} />
					</h2>

					<div class="rounded-2xl p-5 md:p-6" style="background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid rgba(59,130,246,0.25);">
						<p class="text-gray-200 text-base md:text-lg leading-relaxed">
							<Ed obj={c.stageA} k="intro" edit={editMode} />
						</p>

						<!-- מד היעד: 50-100 פרטים -->
						<div class="mt-6 mb-1" dir="ltr">
							<div class="relative h-9">
								<span class="absolute text-[11px] font-bold text-gray-500" style="left:0; top:0;">0</span>
								<span class="absolute -translate-x-1/2 text-[11px] font-black text-blue-300" style="left:41.6%; top:0;">50</span>
								<span class="absolute -translate-x-1/2 text-[11px] font-black text-blue-300" style="left:83.3%; top:0;">100</span>
								<div class="absolute inset-x-0 bottom-0 h-4 rounded-full overflow-hidden" style="background:rgba(255,255,255,0.07);">
									<div class="absolute inset-y-0 rounded-full" style="left:41.6%; width:41.7%; background:linear-gradient(90deg,#3b82f6,#60a5fa); box-shadow:0 0 16px rgba(59,130,246,0.6);"></div>
								</div>
								<div class="absolute bottom-0 h-4 w-0.5 bg-white/40" style="left:41.6%;"></div>
								<div class="absolute bottom-0 h-4 w-0.5 bg-white/40" style="left:83.3%;"></div>
							</div>
							<div class="text-center mt-2 text-sm font-bold text-blue-200" dir="rtl">
								🎯 <Ed obj={c.stageA} k="targetLabel" edit={editMode} />
							</div>
						</div>

						<!-- סוגי הפרטים -->
						<div class="grid grid-cols-2 sm:grid-cols-4 mt-5">
							{#each c.stageA.items as it}
								<div class="stage-cell p-3.5 flex items-center gap-2.5 transition-all hover:bg-white/5">
									<span class="text-xl">{it.icon}</span>
									<span class="font-bold text-sm md:text-base text-blue-100">
										<Ed obj={it} k="label" edit={editMode} />
									</span>
								</div>
							{/each}
						</div>

						<!-- ההמשך -->
						<div class="mt-5 rounded-xl p-4 flex gap-3 items-center"
							style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.35);">
							<span class="text-2xl flex-shrink-0">🚀</span>
							<p class="text-blue-100 font-bold text-sm md:text-base">
								<Ed obj={c.stageA} k="note" edit={editMode} />
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- ===== שלב ב - השתלבות בקהילה ===== -->
			<div id="stage-b" class="scroll-target mb-12 flex gap-4">
				<div class="flex-shrink-0 relative z-10">
					<span class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg"
						style="background:{STAGE_META[1].grad}; border:2px solid rgba(255,255,255,0.3); display:flex;">ב</span>
				</div>
				<div class="flex-1 min-w-0">
					<div class="text-xs font-black uppercase tracking-wide mb-0.5" style="color:#34d399;">
						<Ed obj={c.stageB} k="kicker" edit={editMode} />
					</div>
					<h2 class="text-2xl md:text-3xl font-black text-white mb-4">
						<Ed obj={c.stageB} k="title" edit={editMode} />
					</h2>

					<div class="rounded-2xl p-4 md:p-5 flex items-center gap-4 mb-4"
						style="background:linear-gradient(135deg,#064e3b,#0f172a); border:1px solid rgba(16,185,129,0.35);">
						<span class="text-3xl md:text-4xl flex-shrink-0">💬</span>
						<p class="text-emerald-50 font-bold text-base md:text-lg leading-relaxed">
							<Ed obj={c.stageB} k="intro" edit={editMode} />
						</p>
					</div>

					<!-- שבע זירות הפעילות -->
					<div class="grid md:grid-cols-2 gap-3">
						{#each c.stageB.cards as card}
							<div class="rounded-2xl p-4" style="background:rgba(255,255,255,0.03); border:1px solid {card.color}40; border-right:4px solid {card.color};">
								<div class="flex items-center gap-3 mb-2">
									<div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style="background:{card.color}20;">{card.icon}</div>
									<h3 class="font-black text-base md:text-lg" style="color:{card.color};">
										<Ed obj={card} k="title" edit={editMode} />
									</h3>
								</div>
								<p class="text-gray-300 text-sm md:text-base leading-relaxed mb-2.5">
									<Ed obj={card} k="text" edit={editMode} />
								</p>
								<div class="rounded-lg px-3 py-2 text-xs md:text-sm flex gap-2 items-start" style="background:{card.color}12; color:#e2e8f0;">
									<span class="flex-shrink-0">💡</span>
									<span><Ed obj={card} k="tip" edit={editMode} /></span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- ===== שלב ג - קמפיין במדיה ===== -->
			<div id="stage-c" class="scroll-target mb-12 flex gap-4">
				<div class="flex-shrink-0 relative z-10">
					<span class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg"
						style="background:{STAGE_META[2].grad}; border:2px solid rgba(255,255,255,0.3); display:flex;">ג</span>
				</div>
				<div class="flex-1 min-w-0">
					<div class="text-xs font-black uppercase tracking-wide mb-0.5" style="color:#a78bfa;">
						<Ed obj={c.stageC} k="kicker" edit={editMode} />
					</div>
					<h2 class="text-2xl md:text-3xl font-black text-white mb-4">
						<Ed obj={c.stageC} k="title" edit={editMode} />
					</h2>

					<!-- שני התנאים -->
					<div class="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
						<div class="rounded-2xl p-4 flex items-center gap-3" style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.35);">
							<span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style="background:rgba(59,130,246,0.25); color:#93c5fd;">א</span>
							<p class="text-gray-200 font-bold text-sm md:text-base flex-1">
								<Ed obj={c.stageC} k="condA" edit={editMode} />
							</p>
							<span class="text-emerald-400 text-xl font-black flex-shrink-0">✓</span>
						</div>
						<div class="hidden md:flex items-center justify-center text-2xl font-black text-gray-500">+</div>
						<div class="rounded-2xl p-4 flex items-center gap-3" style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.35);">
							<span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style="background:rgba(16,185,129,0.25); color:#6ee7b7;">ב</span>
							<p class="text-gray-200 font-bold text-sm md:text-base flex-1">
								<Ed obj={c.stageC} k="condB" edit={editMode} />
							</p>
							<span class="text-emerald-400 text-xl font-black flex-shrink-0">✓</span>
						</div>
					</div>

					<!-- המנעול שנפתח -->
					<div class="flex flex-col items-center my-4">
						<div class="w-px h-6" style="background:linear-gradient(180deg,rgba(167,139,250,0),#a78bfa);"></div>
						<div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
							style="background:linear-gradient(135deg,#4c1d95,#7c3aed); border:2px solid rgba(167,139,250,0.5); box-shadow:0 0 25px rgba(124,58,237,0.5);">🔓</div>
					</div>
					<p class="text-center font-black text-purple-200 mb-4 text-base md:text-lg">
						<Ed obj={c.stageC} k="unlockTitle" edit={editMode} />
					</p>

					<!-- מה נפתח -->
					<div class="grid sm:grid-cols-3 gap-3">
						{#each c.stageC.rewards as r}
							<div class="rounded-2xl p-5 text-center flex flex-col items-center gap-2"
								style="background:linear-gradient(135deg,#2e1065,#0f172a); border:1px solid rgba(167,139,250,0.35);">
								<span class="text-4xl">{r.icon}</span>
								<div class="font-black text-purple-200 text-sm md:text-base">
									<Ed obj={r} k="title" edit={editMode} />
								</div>
								<p class="text-gray-400 text-xs md:text-sm leading-relaxed">
									<Ed obj={r} k="text" edit={editMode} />
								</p>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- ===== שלב ד - כוח ארצי ===== -->
			<div id="stage-d" class="scroll-target mb-4 flex gap-4">
				<div class="flex-shrink-0 relative z-10">
					<span class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg"
						style="background:{STAGE_META[3].grad}; border:2px solid rgba(255,255,255,0.3); display:flex;">ד</span>
				</div>
				<div class="flex-1 min-w-0">
					<div class="text-xs font-black uppercase tracking-wide mb-0.5" style="color:#fbbf24;">
						<Ed obj={c.stageD} k="kicker" edit={editMode} />
					</div>
					<h2 class="text-2xl md:text-3xl font-black text-white mb-4">
						<Ed obj={c.stageD} k="title" edit={editMode} />
					</h2>

					<div class="rounded-3xl p-6 md:p-8 text-center overflow-hidden relative"
						style="background:linear-gradient(135deg,#78350f 0%,#1a1035 70%); border:1px solid rgba(245,158,11,0.4);">
						<div class="absolute inset-0 pointer-events-none"
							style="background:radial-gradient(ellipse at 50% 0%,rgba(245,158,11,0.2) 0%,transparent 60%);"></div>
						<div class="relative z-10">
							<div class="flex items-center justify-center gap-2 md:gap-3 mb-4 flex-wrap">
								<span class="text-2xl md:text-3xl">🏘️</span>
								<span class="text-amber-400 font-black text-lg">+</span>
								<span class="text-2xl md:text-3xl">🏘️</span>
								<span class="text-amber-400 font-black text-lg">+</span>
								<span class="text-2xl md:text-3xl">🏘️</span>
								<span class="mx-1 text-amber-300 font-black text-2xl">=</span>
								<span class="text-4xl md:text-5xl">💪</span>
							</div>
							<p class="max-w-2xl mx-auto text-gray-100 text-base md:text-xl font-bold leading-relaxed mb-6">
								<Ed obj={c.stageD} k="text" edit={editMode} />
							</p>
							<div class="grid grid-cols-3 gap-2 max-w-xl mx-auto">
								{#each c.stageD.pillars as p}
									<div class="rounded-xl px-2 py-3 flex flex-col items-center gap-1.5"
										style="background:rgba(0,0,0,0.3); border:1px solid rgba(245,158,11,0.25);">
										<span class="text-2xl">{p.icon}</span>
										<span class="text-amber-200 text-xs md:text-sm font-bold">
											<Ed obj={p} k="label" edit={editMode} />
										</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div><!-- /ציר ההקמה -->

		<!-- ===== שגרת ניהול ובקרה ===== -->
		<div class="mt-12 mb-8">
			<div class="flex items-center gap-3 mb-4">
				<span class="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 shadow-lg"
					style="background:linear-gradient(135deg,#312e81,#6366f1); border:2px solid rgba(255,255,255,0.25);">📅</span>
				<h2 class="text-2xl md:text-3xl font-black text-white">
					<Ed obj={c.routine} k="title" edit={editMode} />
				</h2>
			</div>
			<div class="grid sm:grid-cols-2 gap-3">
				{#each c.routine.items as it}
					<div class="rounded-2xl p-5" style="background:linear-gradient(135deg,#1e1b4b,#0f172a); border:1px solid rgba(99,102,241,0.35);">
						<div class="flex items-center gap-3 mb-2">
							<span class="text-3xl">{it.icon}</span>
							<div>
								<div class="font-black text-white text-base md:text-lg">
									<Ed obj={it} k="title" edit={editMode} />
								</div>
								<div class="text-sm font-bold" style="color:#a5b4fc;">
									<Ed obj={it} k="when" edit={editMode} />
								</div>
							</div>
						</div>
						<p class="text-gray-300 text-sm md:text-base leading-relaxed">
							<Ed obj={it} k="text" edit={editMode} />
						</p>
					</div>
				{/each}
			</div>
		</div>

	</div><!-- /path tab -->

	<!-- ================= טאב ערכת גיוס עסקים ================= -->
	<div class:hidden={activeTab !== 'biz'}>

		<!-- Hero -->
		<div class="relative rounded-3xl px-6 md:px-8 py-10 text-center mb-8 shadow-2xl overflow-hidden"
			style="background:linear-gradient(135deg,#1e3a8a 0%,#0f766e 60%,#1e293b 100%);">
			<div class="absolute inset-0 pointer-events-none"
				style="background:radial-gradient(ellipse at 50% 20%,rgba(45,212,191,0.25) 0%,transparent 60%);"></div>
			<div class="relative z-10">
				<h1 class="text-3xl md:text-5xl font-black leading-tight mb-4" style="color:#5eead4;">
					🏪 <Ed obj={c.tabs} k="biz" edit={editMode} />
				</h1>
				<p class="text-teal-50 text-base md:text-lg max-w-2xl mx-auto font-bold leading-relaxed">
					<Ed obj={c.biz} k="intro" edit={editMode} />
				</p>
			</div>
		</div>

		<!-- 1. הצעת הערך -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-4 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035] flex-shrink-0"
					style="background:linear-gradient(135deg,#5eead4,#0d9488);">1</span>
				<Ed obj={c.biz.value} k="title" edit={editMode} />
			</h2>
			<div class="rounded-2xl p-6 relative mt-6 mb-6" style="background:linear-gradient(135deg,#1e3a8a,#0f172a); border:2px solid rgba(96,165,250,0.4);">
				<span class="absolute -top-4 right-6 text-4xl">💎</span>
				<p class="text-lg md:text-xl font-bold text-blue-100 leading-relaxed pt-2">
					"<Ed obj={c.biz.value} k="quote" edit={editMode} />"
				</p>
			</div>
			<h3 class="text-lg md:text-xl font-black text-white mb-2">
				<Ed obj={c.biz.value} k="whyTitle" edit={editMode} />
			</h3>
			<div class="grid sm:grid-cols-2">
				{#each c.biz.value.reasons as r, i}
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
						<span class="text-3xl mt-0.5 flex-shrink-0">{r.icon}</span>
						<div class="flex-1">
							<div class="font-black text-base mb-1 text-teal-300">
								<Ed obj={r} k="title" edit={editMode} />
							</div>
							<p class="text-gray-300 text-sm md:text-base leading-relaxed">
								<Ed obj={r} k="text" edit={editMode} />
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 2. תסריט שיחה -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-2 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035] flex-shrink-0"
					style="background:linear-gradient(135deg,#5eead4,#0d9488);">2</span>
				<Ed obj={c.biz.script} k="title" edit={editMode} />
			</h2>
			<p class="text-gray-400 text-sm md:text-base mb-4 pr-12">
				⏱️ <Ed obj={c.biz.script} k="note" edit={editMode} />
			</p>

			<div class="rounded-3xl p-4 md:p-6" style="background:#0b1120; border:1px solid rgba(255,255,255,0.1);">
				{#each c.biz.script.lines as line}
					<div class="flex mb-3 {line.who === 'coord' ? 'justify-end' : 'justify-start'}">
						<div class="max-w-[88%] md:max-w-[75%] rounded-2xl px-4 py-3 {line.who === 'coord' ? 'rounded-tl-sm' : 'rounded-tr-sm'}"
							style={line.who === 'coord'
								? 'background:linear-gradient(135deg,#78350f,#92400e); border:1px solid rgba(245,158,11,0.4);'
								: 'background:#1e293b; border:1px solid rgba(255,255,255,0.12);'}>
							<div class="text-[11px] font-black mb-1 {line.who === 'coord' ? 'text-amber-300' : 'text-sky-300'}">
								{line.who === 'coord' ? '🧑‍💼' : '🏪'}
								<Ed obj={c.biz.script} k={line.who === 'coord' ? 'coordName' : 'bizName'} edit={editMode} />
							</div>
							<p class="text-sm md:text-base leading-relaxed {line.who === 'coord' ? 'text-amber-50' : 'text-gray-200'}">
								{#if editMode}
									<Ed obj={line} k="text" edit={true} />
								{:else}
									{@render hl(line.text)}
								{/if}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 3. הודעת המשך בוואטסאפ -->
		<div class="mb-10">
			<h2 class="text-2xl font-black mb-4 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035] flex-shrink-0"
					style="background:linear-gradient(135deg,#5eead4,#0d9488);">3</span>
				<Ed obj={c.biz.whatsapp} k="title" edit={editMode} />
			</h2>
			<div class="rounded-3xl overflow-hidden" style="border:1px solid rgba(37,211,102,0.35);">
				<div class="px-4 py-3 flex items-center justify-between gap-2 flex-wrap" style="background:#075e54;">
					<div class="flex items-center gap-2 font-black text-white text-sm md:text-base">
						<span class="w-8 h-8 rounded-full flex items-center justify-center text-lg" style="background:#25d366;">💬</span>
						וואטסאפ
						<span class="text-xs font-bold text-emerald-200">
							· <Ed obj={c.biz.whatsapp} k="note" edit={editMode} />
						</span>
					</div>
					<button
						onclick={copyWhatsapp}
						class="px-3 py-1.5 rounded-lg text-xs md:text-sm font-black transition-all duration-200 hover:brightness-110"
						style="background:{copied ? '#059669' : '#25d366'}; color:#052e16;">
						{copied ? '✓ הועתק!' : '📋 העתקת ההודעה'}
					</button>
				</div>
				<div class="p-4 md:p-6" style="background:#0b141a;">
					<div class="rounded-2xl rounded-tl-sm p-4 max-w-xl" style="background:#005c4b;">
						<p class="text-emerald-50 text-sm md:text-base leading-relaxed" style="white-space:pre-wrap;">
							{#if editMode}
								<Ed obj={c.biz.whatsapp} k="text" edit={true} />
							{:else}
								{@render hl(c.biz.whatsapp.text)}
							{/if}
						</p>
						<div class="text-left text-[10px] mt-1" style="color:rgba(167,243,208,0.6);">✓✓</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 4. מענה להתנגדויות -->
		<div class="mb-8">
			<h2 class="text-2xl font-black mb-4 flex items-center gap-3">
				<span class="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-[#1a1035] flex-shrink-0"
					style="background:linear-gradient(135deg,#5eead4,#0d9488);">4</span>
				<Ed obj={c.biz.objections} k="title" edit={editMode} />
			</h2>
			{#each c.biz.objections.items as o}
				<div class="grid md:grid-cols-2 gap-3 mb-3">
					<div class="rounded-2xl p-4 flex gap-3" style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3);">
						<span class="text-2xl flex-shrink-0">🙅</span>
						<div class="flex-1">
							<div class="text-xs font-black text-red-300 mb-1">
								<Ed obj={c.biz.objections} k="qLabel" edit={editMode} />
							</div>
							<p class="text-gray-100 font-bold text-sm md:text-base leading-relaxed">
								<Ed obj={o} k="q" edit={editMode} />
							</p>
						</div>
					</div>
					<div class="rounded-2xl p-4 flex gap-3" style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3);">
						<span class="text-2xl flex-shrink-0">💬</span>
						<div class="flex-1">
							<div class="text-xs font-black text-emerald-300 mb-1">
								<Ed obj={c.biz.objections} k="aLabel" edit={editMode} />
							</div>
							<p class="text-gray-300 text-sm md:text-base leading-relaxed">
								<Ed obj={o} k="a" edit={editMode} />
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>

	</div><!-- /biz tab -->

	<!-- CTA - חזרה לאזור הרכזים -->
	<div class="mt-8 mb-2 rounded-2xl px-6 py-6 text-center"
		style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%); border:1px solid rgba(255,255,255,0.12); box-shadow:0 0 40px rgba(124,58,237,0.15);">
		<h2 class="text-xl md:text-2xl font-black mb-1">מוכנים לצאת לדרך?</h2>
		<p class="text-gray-300 text-sm mb-5 max-w-lg mx-auto">כל הכלים, הנתונים והתושבים שלכם מחכים באזור הרכזים</p>
		<a href="/coordinator"
			class="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-black text-base transition-all duration-200 hover:scale-105 hover:brightness-110 shadow-lg"
			style="background:linear-gradient(135deg,#78350f,#f59e0b); border:2px solid rgba(251,191,36,0.35);">
			🏘️ כניסה לאזור הרכזים
		</a>
	</div>

	<!-- ===== גלגל השיניים ומצב העריכה (סופר-אדמין בלבד) ===== -->
	{#if data.isSuper}
		<button
			onclick={() => (editMode ? cancelEdit() : (editMode = true))}
			title={editMode ? 'יציאה ממצב עריכה (בלי לשמור)' : 'עריכת תוכן המדריך (סופר-אדמין)'}
			class="fixed bottom-5 left-5 z-[1100] w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-xl transition-all duration-300 hover:rotate-45"
			style="background:{editMode ? 'linear-gradient(135deg,#b45309,#f59e0b)' : 'rgba(30,41,59,0.92)'}; border:1px solid {editMode ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.2)'};">
			⚙️
		</button>
	{/if}

	{#if editMode}
		<div class="fixed bottom-0 inset-x-0 z-[1090] px-4 py-3 flex items-center justify-center gap-3 flex-wrap backdrop-blur-md"
			style="background:rgba(7,11,20,0.92); border-top:1px solid rgba(245,158,11,0.4);">
			<span class="text-amber-300 text-xs md:text-sm font-bold hidden sm:inline">✏️ מצב עריכה - לחצו על כל טקסט כדי לערוך. השמירה מעדכנת את המדריך לכל הרכזים.</span>
			<form
				method="POST"
				action="?/saveGuide"
				use:enhance={({ formData }) => {
					formData.set('content', JSON.stringify($state.snapshot(c)));
					saving = true;
					saveError = '';
					return async ({ result }) => {
						saving = false;
						if (result.type === 'success') {
							baseline = structuredClone($state.snapshot(c));
							editMode = false;
							savedToast = true;
							setTimeout(() => (savedToast = false), 2500);
						} else if (result.type === 'failure') {
							saveError = (result.data as { error?: string } | undefined)?.error ?? 'השמירה נכשלה - נסו שוב';
						} else {
							saveError = 'השמירה נכשלה - נסו שוב';
						}
					};
				}}>
				<button
					disabled={saving}
					class="px-5 py-2 rounded-xl font-black text-sm transition-all duration-200 hover:brightness-110 disabled:opacity-60"
					style="background:linear-gradient(135deg,#b45309,#f59e0b); border:1px solid rgba(251,191,36,0.5);">
					{saving ? '⏳ שומר...' : '💾 שמירה לכולם'}
				</button>
			</form>
			<button
				onclick={cancelEdit}
				class="px-4 py-2 rounded-xl font-bold text-sm text-gray-300 hover:text-white transition-colors"
				style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15);">
				ביטול
			</button>
			{#if saveError}
				<span class="text-red-400 text-sm font-bold">{saveError}</span>
			{/if}
		</div>
	{/if}

	{#if savedToast}
		<div class="fixed bottom-20 inset-x-0 z-[1095] flex justify-center pointer-events-none">
			<div class="px-5 py-2.5 rounded-xl font-black text-sm shadow-2xl"
				style="background:linear-gradient(135deg,#064e3b,#059669); border:1px solid rgba(110,231,183,0.5);">
				✅ המדריך נשמר - כל הרכזים רואים את הגרסה החדשה
			</div>
		</div>
	{/if}

</div>

<style>
	/* גובה scroll - נייד 110px, דסקטופ 150px (כמו בדף האודות) */
	:global(.scroll-target) {
		scroll-margin-top: 110px;
	}
	@media (min-width: 768px) {
		:global(.scroll-target) {
			scroll-margin-top: 150px;
		}
	}

	/* תאי רשת עם קווי הפרדה עדינים - בסגנון דף האודות */
	.stage-cell {
		position: relative;
	}
	.stage-cell::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 14%;
		right: 0;
		height: 1px;
		background: rgba(255, 255, 255, 0.08);
	}
	.stage-cell::before {
		content: '';
		position: absolute;
		right: 0;
		top: 14%;
		bottom: 0;
		width: 1px;
		background: rgba(255, 255, 255, 0.08);
	}
</style>
