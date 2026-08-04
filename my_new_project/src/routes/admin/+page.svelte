<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { DiscountCode } from '$lib/discountCodes';
	import { heMatches } from '$lib/search';
	import { citiesData, effectiveNeighborhoods } from '$lib/neighborhoodsData';
	import ServerHealthGauges from '$lib/components/ServerHealthGauges.svelte';
	import StatsSummaryChart from '$lib/components/StatsSummaryChart.svelte';
	import RequesterContext from '$lib/components/RequesterContext.svelte';
	import RequesterChatButtons from '$lib/components/RequesterChatButtons.svelte';

	let { data, form } = $props();

	let activeTab = $state<'users' | 'items' | 'discounts'>('users');

	// רשימת "כל המשתמשים" מתקפלת - סגורה כברירת מחדל להפחתת עומס על הדף.
	// חיפוש פותח אותה אוטומטית כדי שהתוצאות יופיעו.
	let usersListOpen = $state(false);

	// סיכום ללוח הבקרה (באנר עליון)
	const dash = $derived(data.dashboard ?? { totalUsers: 0, totalItems: 0, totalCoordinators: 0, newUsersThisMonth: 0, newItemsThisMonth: 0, monthlyVisits: 0 });

	// פורמט תאריך+שעה בעברית - כדי שהאדמין ידע איזו בקשה הגיעה אחרונה
	function fmtDateTime(iso: string): string {
		if (!iso) return '';
		const d = new Date(iso);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleString('he-IL', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit',
		});
	}

	// טקסט פתיחה מוכן לפנייה למבקש (וואטסאפ + צ'אט פנימי) - מותאם לסוג הבקשה.
	// ההודעה נבנית פעם אחת וזורמת לשני מסלולי התקשורת דרך RequesterChatButtons.
	function nbWaText(name: string | null | undefined, nbName: string, city: string): string {
		return `שלום${name ? ` ${name}` : ''}, כאן הנהלת קהילה בשכונה 👋 בקשר לבקשתך להוספת "${nbName}"${city ? ` ב${city}` : ''} למפה:`;
	}
	function nbDraft(name: string | null | undefined, nbName: string, city: string): string {
		return `שלום${name ? ` ${name}` : ''}, בקשר לבקשתך להוספת "${nbName}"${city ? ` (${city})` : ''} למפת השכונות: `;
	}
	function coordWaText(name: string | null | undefined, areas: string[]): string {
		return `שלום${name ? ` ${name}` : ''} 👋 כאן הנהלת קהילה בשכונה, בקשר לבקשתך להיות רכז/ת שכונה${areas.length ? ` (${areas.join(', ')})` : ''}:`;
	}
	function coordDraft(name: string | null | undefined): string {
		return `שלום${name ? ` ${name}` : ''}, בקשר לבקשתך להיות רכז/ת שכונה: `;
	}
	function wishWaText(name: string | null | undefined, text: string): string {
		const short = text.length > 60 ? `${text.slice(0, 57)}…` : text;
		return `שלום${name ? ` ${name}` : ''}, כאן הנהלת קהילה בשכונה 👋 בקשר למשאלה ששלחת לכותל המשאלות ("${short}"):`;
	}
	function wishDraft(name: string | null | undefined): string {
		return `שלום${name ? ` ${name}` : ''}, בקשר למשאלה ששלחת לכותל המשאלות: `;
	}

	// ---- סימון ידני "כבר אישרתי" על פרסומים/הודעות (וי ירוק) ----
	// נשמר ב-localStorage של הדפדפן (זיכרון אישי לאדמין, ללא צורך בבאקאנד)
	const APPROVED_KEY = 'admin_approved_items';
	let approvedIds = $state<Set<string>>(new Set());

	onMount(() => {
		try {
			const raw = localStorage.getItem(APPROVED_KEY);
			if (raw) approvedIds = new Set(JSON.parse(raw));
		} catch { /* ignore */ }
	});

	function toggleApproved(id: string) {
		const next = new Set(approvedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		approvedIds = next;
		try {
			localStorage.setItem(APPROVED_KEY, JSON.stringify([...next]));
		} catch { /* ignore */ }
	}

	// ---- עורך קודי הנחה (סופר-אדמין) ----
	// עותק מקומי הניתן לעריכה; נשמר ל-Strapi דרך action saveDiscounts
	let discountCodes = $state<DiscountCode[]>(
		(data.discountCodes ?? []).map((c: DiscountCode) => ({ ...c }))
	);

	function addDiscountCode() {
		discountCodes = [...discountCodes, {
			id: `code_${Date.now()}`,
			label: '',
			code: '',
			kind: 'percent',
			percent: 10,
			requiresCoordinator: false,
			active: true,
			note: '',
		}];
	}

	function removeDiscountCode(idx: number) {
		discountCodes = discountCodes.filter((_, i) => i !== idx);
	}
	let searchQuery = $state('');
	let roleFilter = $state<'all' | 'user' | 'neighborhood_admin' | 'super_admin'>('all');

	// רשימת שמות הערים - ל-datalist של הוספת שכונה ובורר החלפת שכונה לרכז.
	// כולל ערים שהגיעו רק דרך שכונה שאושרה (עיר שלא ברשימה הסטטית).
	const adminCityNames = $derived.by(() => {
		const base = citiesData.map((c) => c.city);
		const extra = ((data as any).approvedNeighborhoods as Array<{ city: string }> | undefined ?? [])
			.map((n) => n.city)
			.filter((c) => c && !base.includes(c));
		return extra.length ? [...base, ...new Set(extra)] : base;
	});

	// הוספת שכונה ידנית ע"י סופר-אדמין (טופס "הוספת שכונה לעיר")
	let addNbCity = $state('');
	let addNbName = $state('');

	// מינוי רכז - מודל
	let showCoordModal  = $state(false);
	let coordModalUser  = $state<{ id: string; name: string | null; coordinator_of: string[]; neighborhood?: string | null; city?: string | null } | null>(null);
	let coordNeighborhoods = $state(''); // שכונות מופרדות בשורות
	// בורר מובנה במודל הרכז: החלפת/הוספת שכונה מהרשימה הרשמית (מונע שגיאות פורמט "שכונה (עיר)")
	let coordPickCity = $state('');
	let coordPickNb   = $state('');
	// מקור-אמת יחיד: הרשימה הסטטית + שכונות שאושרו באדמין, כדי ששכונה שנוספה זה עתה
	// תופיע כאן מיד ולא רק בבוררים שבשאר האתר.
	const coordPickNbOptions = $derived(
		effectiveNeighborhoods(coordPickCity, (data as any).approvedNeighborhoods).filter((n) => n !== 'מרכז'),
	);
	// בונה את מחרוזת האזור בפורמט האחיד: "שכונה (עיר)", או שם העיר בלבד לרכז-עיר
	function coordAreaStr(): string {
		const c = coordPickCity.trim();
		const n = coordPickNb.trim();
		if (!c) return '';
		if (!n || n === 'מרכז') return c;
		return `${n} (${c})`;
	}
	// "החלף" - מגדיר את האזור היחיד (דורס את הקיים). "הוסף" - מוסיף שורה בלי לדרוס.
	function coordReplaceArea() {
		const a = coordAreaStr();
		if (a) coordNeighborhoods = a;
	}
	function coordAddArea() {
		const a = coordAreaStr();
		if (!a) return;
		const lines = coordNeighborhoods.split('\n').map((s) => s.trim()).filter(Boolean);
		if (!lines.includes(a)) lines.push(a);
		coordNeighborhoods = lines.join('\n');
	}

	// מקום המגורים להצגה: השכונה שסומנה, אך אם סומן "מרכז" או שאין שכונה - העיר שסומנה
	function residenceLabel(neighborhood?: string | null, city?: string | null): string {
		const n = neighborhood?.trim();
		const c = city?.trim();
		if (n && n !== 'מרכז') return n;
		return c ?? '';
	}

	// תצוגת אזור רכז: "נאות שקמה (ראשון לציון)" → "ראשון לציון · נאות שקמה"
	// (הפורמט עם הסוגריים נשאר ב-DB - זו המרה לתצוגה בלבד)
	function areaLabel(entry: string): string {
		const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
		return m ? `${m[2].trim()} · ${m[1].trim()}` : entry.trim();
	}

	// ברירת מחדל למינוי רכז: "שכונה (עיר)" - רשומה בלי עיר עמומה בין ערים,
	// ורשומה שהיא שם עיר בלבד ממנה רכז לכל העיר
	function defaultCoordArea(neighborhood?: string | null, city?: string | null): string {
		const n = neighborhood?.trim();
		const c = city?.trim();
		if (n && n !== 'מרכז') return c ? `${n} (${c})` : n;
		return c ?? '';
	}

	function openCoordModal(user: { id: string; name: string | null; coordinator_of: string[]; neighborhood?: string | null; city?: string | null }) {
		coordModalUser = user;
		// ברירת מחדל: אם כבר רכז - השכונות הקיימות; אחרת מקום המגורים מהפרופיל (שכונה+עיר)
		coordNeighborhoods = user.coordinator_of.length > 0
			? user.coordinator_of.join('\n')
			: defaultCoordArea(user.neighborhood, user.city);
		// ברירת מחדל לבורר המובנה: עיר המשתמש מהפרופיל (השכונה נבחרת ידנית)
		coordPickCity = (user.city ?? '').trim();
		coordPickNb   = '';
		showCoordModal = true;
	}

	// מקום המגורים להצגה במודל הרכז
	const coordResidence = $derived(coordModalUser ? residenceLabel(coordModalUser.neighborhood, coordModalUser.city) : '');

	// סינון משתמשים
	const filteredUsers = $derived(() => {
		let list = data.users ?? [];
		if (searchQuery) {
			list = list.filter(u =>
				heMatches(searchQuery, u.name, u.email, u.id, u.neighborhood, (u as any).city)
			);
		}
		if (roleFilter !== 'all') {
			list = list.filter(u => u.role === roleFilter);
		}
		return list;
	});

	// רכזי שכונות - כל משתמש עם coordinator_of שאינו ריק.
	// יוצגו בקבוצה ייחודית בראש הטאב כדי שיהיה קל לסופר־אדמין לראות מי מנהל תוכן באיזו שכונה.
	const coordinatorUsers = $derived(() => {
		const list = (data.users ?? []).filter(u => Array.isArray((u as any).coordinator_of) && (u as any).coordinator_of.length > 0);
		if (!searchQuery) return list;
		return list.filter(u =>
			heMatches(searchQuery, u.name, u.email, ...((u as any).coordinator_of as string[]))
		);
	});

	// סינון פריטים
	const filteredItems = $derived(() => {
		if (!searchQuery) return data.items ?? [];
		return (data.items ?? []).filter(i =>
			heMatches(searchQuery, i.label, i.description, i.category)
		);
	});

	function roleBadge(role: string) {
		switch (role) {
			case 'super_admin': return { text: 'מנהל ראשי', color: 'bg-white/15 text-white border-white/30 font-black' };
			case 'neighborhood_admin': return { text: 'אדמין שכונתי', color: 'bg-white/5 text-gray-200 border-white/20' };
			default: return { text: 'משתמש', color: 'bg-white/5 text-gray-500 border-white/10' };
		}
	}
</script>

<svelte:head>
	<title>ניהול האתר</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white" dir="rtl">
	<div class="max-w-6xl mx-auto px-3 sm:px-4 py-6 md:py-8">

		<!-- חזרה לפרופיל -->
		<a href="/profile" class="inline-block text-gray-500 hover:text-white transition-colors text-sm mb-3">← חזרה לדף הפרופיל</a>

		<!-- כותרת. בנייד: הכותרת בשורה מלאה מעל, והכפתורים כרשת 2 עמודות שוות -->
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
			<div>
				<h1 class="text-3xl font-black">
					לוח ניהול
				</h1>
				<p class="text-gray-400 text-sm md:text-base mt-1">ניהול משתמשים, תוכן והרשאות</p>
			</div>
			<div class="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
				<button
					onclick={() => goto('/admin/2fa-setup')}
					class="relative px-3 md:px-4 py-2.5 md:py-2 rounded-xl border transition-all cursor-pointer font-bold text-sm md:text-base flex items-center justify-center md:justify-start gap-1.5 whitespace-nowrap
						{data.twoFAConfigured
							? 'bg-green-500/15 border-green-500/40 text-green-200 hover:bg-green-500/25'
							: 'bg-red-500/15 border-red-500/50 text-red-200 hover:bg-red-500/25 animate-pulse'}"
					title={data.twoFAConfigured ? 'אימות דו-שלבי פעיל' : 'הפעל אימות דו-שלבי - מומלץ!'}
				>
					🔐 {data.twoFAConfigured ? '2FA פעיל' : 'הפעל 2FA'}
				</button>
				<button
					onclick={() => goto('/admin/singles-review')}
					class="relative px-3 md:px-4 py-2.5 md:py-2 rounded-xl bg-pink-500/15 border border-pink-500/40 text-pink-200 hover:bg-pink-500/25 transition-all cursor-pointer font-bold text-sm md:text-base flex items-center justify-center md:justify-start gap-1.5 whitespace-nowrap"
				>
					💑 אישור פנויים
					{#if (data.pendingSinglesCount ?? 0) > 0}
						<span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-pink-500 text-white text-[11px] font-black shadow-lg animate-pulse">
							{data.pendingSinglesCount}
						</span>
					{/if}
				</button>
				<button
					onclick={() => goto('/admin/ads-review')}
					class="relative px-3 md:px-4 py-2.5 md:py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25 transition-all cursor-pointer font-bold text-sm md:text-base flex items-center justify-center md:justify-start gap-1.5 whitespace-nowrap"
				>
					📢 אישור פרסומות
					{#if (data.pendingAdsCount ?? 0) > 0}
						<span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-black text-[11px] font-black shadow-lg animate-pulse">
							{data.pendingAdsCount}
						</span>
					{/if}
				</button>
				<button
					onclick={() => goto('/admin/statistics')}
					class="relative px-3 md:px-4 py-2.5 md:py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 transition-all cursor-pointer font-bold text-sm md:text-base flex items-center justify-center md:justify-start gap-1.5 whitespace-nowrap"
				>
					📈 סטטיסטיקה
				</button>
				<button
					onclick={() => goto('/admin/news')}
					class="relative px-3 md:px-4 py-2.5 md:py-2 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-200 hover:bg-blue-500/25 transition-all cursor-pointer font-bold text-sm md:text-base flex items-center justify-center md:justify-start gap-1.5 whitespace-nowrap"
					title="עריכת הכותרות שרצות בטיקר בדף הבית"
				>
					📰 חדשות הטיקר
				</button>
				<button
					onclick={() => (activeTab = activeTab === 'discounts' ? 'users' : 'discounts')}
					class="relative px-3 md:px-4 py-2.5 md:py-2 rounded-xl border transition-all cursor-pointer font-bold text-sm md:text-base flex items-center justify-center md:justify-start gap-1.5 whitespace-nowrap
						{activeTab === 'discounts'
							? 'bg-purple-500/30 border-purple-400/60 text-white shadow-lg'
							: 'bg-purple-500/15 border-purple-500/40 text-purple-200 hover:bg-purple-500/25'}"
					title={activeTab === 'discounts' ? 'חזרה לרשימת המשתמשים' : 'עריכת קודי הנחה'}
				>
					🎟️ קודי הנחה ({discountCodes.length})
				</button>
			</div>
		</div>

		<!-- באנר לוח בקרה - סיכום מהיר של הקהילה -->
		<div class="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- משתמשים — סגול, זהה לסדרת "נרשמים" בגרף ובדף הסטטיסטיקה. כל הכרטיס כפתור לדף הפירוט -->
			<a href="/admin/statistics#registrations" class="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/15 to-violet-500/5 p-3 sm:p-4 block hover:border-violet-400/50 transition-all">
				<img
					src="/images/60712_175258.webp"
					alt=""
					class="pointer-events-none absolute left-1.5 sm:left-2 inset-y-0 my-auto h-12 w-12 sm:h-[84px] sm:w-[84px] rounded-xl sm:rounded-2xl object-cover ring-1 ring-white/20 shadow-lg"
				/>
				<div class="relative pe-[54px] sm:pe-[92px]">
					<div class="text-violet-200/80 text-xs sm:text-sm font-bold mb-1">משתמשים</div>
					<div class="text-3xl sm:text-4xl font-black text-white leading-none">{dash.totalUsers}</div>
				</div>
			</a>

			<!-- פרטים במפה — ירוק, זהה לסדרת "פריטים שהועלו" בגרף ובדף הסטטיסטיקה. כל הכרטיס כפתור לדף הפירוט -->
			<a href="/admin/statistics#items" class="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-600/15 to-emerald-500/5 p-3 sm:p-4 block hover:border-emerald-400/50 transition-all">
				<img
					src="/images/Co260712_181739.webp"
					alt=""
					class="pointer-events-none absolute left-1.5 sm:left-2 inset-y-0 my-auto h-12 w-12 sm:h-[84px] sm:w-[84px] rounded-xl sm:rounded-2xl object-cover ring-1 ring-white/20 shadow-lg"
				/>
				<div class="relative pe-[54px] sm:pe-[92px]">
					<div class="text-emerald-200/80 text-xs sm:text-sm font-bold mb-1">פרטים במפה</div>
					<div class="text-3xl sm:text-4xl font-black text-white leading-none">{dash.totalItems}</div>
				</div>
			</a>

			<!-- רכזים — כל הכרטיס כפתור לסקציית רכזי השכונות באותו דף.
			     בלי אימוג'י בכותרת: לכרטיס כבר יש תמונה משלו. -->
			<a href="#coordinators" onclick={() => (activeTab = 'users')} class="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-600/15 to-amber-500/5 p-3 sm:p-4 block hover:border-amber-400/50 transition-all">
				<img
					src="/images/rakaz-shchuna.webp"
					alt=""
					class="pointer-events-none absolute left-1.5 sm:left-2 inset-y-0 my-auto h-12 w-12 sm:h-[84px] sm:w-[84px] rounded-xl sm:rounded-2xl object-cover object-top ring-1 ring-white/20 shadow-lg"
				/>
				<div class="relative pe-[54px] sm:pe-[92px]">
					<div class="text-amber-200/80 text-xs sm:text-sm font-bold mb-1">רכזי שכונות</div>
					<div class="text-3xl sm:text-4xl font-black text-white leading-none">{dash.totalCoordinators}</div>
				</div>
			</a>

			<!-- כניסות החודש — כחול, זהה לסדרת "כניסות" בגרף ובדף הסטטיסטיקה.
			     מונה מ-visit-stat, מתעדכן פעם ביום. לחיצה = דף סטטיסטיקה -->
			<a href="/admin/statistics#visits" class="relative overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-600/15 to-sky-500/5 p-3 sm:p-4 block hover:border-sky-400/50 transition-all">
				<img
					src="/images/60712_183146.webp"
					alt=""
					class="pointer-events-none absolute left-1.5 sm:left-2 inset-y-0 my-auto h-12 w-12 sm:h-[84px] sm:w-[84px] rounded-xl sm:rounded-2xl object-cover ring-1 ring-white/20 shadow-lg"
				/>
				<div class="relative pe-[54px] sm:pe-[92px]">
					<div class="text-sky-200/80 text-xs sm:text-sm font-bold mb-1">כניסות</div>
					<div class="text-3xl sm:text-4xl font-black text-white leading-none">{dash.monthlyVisits}</div>
				</div>
			</a>

			<!-- נכסים להשלמה — פריטים שהמיקום שלהם חסר/לא מזוהה ולכן אינם
			     מופיעים בלוח השכונתי הנכון. אפס = הכל מושלם.
			     אחרון בשורה: זה כרטיס "מה נשאר לעשות", לא מונה סטטיסטי. -->
			<a href="/admin/incomplete" class="relative overflow-hidden rounded-2xl border p-3 sm:p-4 block transition-all
				{data.incompleteCount
					? 'border-orange-500/30 bg-gradient-to-br from-orange-600/15 to-orange-500/5 hover:border-orange-400/60'
					: 'border-emerald-500/25 bg-gradient-to-br from-emerald-600/15 to-emerald-500/5 hover:border-emerald-400/50'}">
				<!-- הכרטיס היחיד עם שורה שלישית - לכן הכיתובים והאימוג'י צמודים
				     יותר, כדי שגובהו יישאר זהה לשאר כרטיסי הבאנר -->
				<div class="relative">
					<div class="flex items-center gap-1.5 text-xs sm:text-sm font-bold leading-tight mb-0.5 {data.incompleteCount ? 'text-orange-200/80' : 'text-emerald-200/80'}">
						<span class="text-xs sm:text-sm">🧩</span> נכסים להשלמה
					</div>
					<div class="text-3xl sm:text-4xl font-black text-white leading-none">{data.incompleteCount}</div>
					<div class="text-[10px] sm:text-[11px] text-gray-400 leading-tight mt-0.5">
						{data.incompleteCount ? 'מיקום חסר או לא מזוהה' : 'כל הפריטים משויכים'}
					</div>
				</div>
			</a>
		</div>

		<!-- מחוג מצב השרת (הקיצור של כל המדים) בצד ימין + "הגרף הראשי" (סקירה כללית) לצידו.
		     שניהם תמונת-מצב מרגע הכניסה: מתרעננים רק כשנכנסים לדף זה או לדף הסטטיסטיקה (בלי פולינג).
		     לחיצה על המחוג → דף הסטטיסטיקה, עם גלילה איטית אל באנר השעונים המלא. -->
		<div class="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-stretch">
			<ServerHealthGauges initial={data.serverHealth} monthlyVisits={dash.monthlyVisits} summaryOnly live={false} mainHref="/admin/statistics?focus=gauges" />
			<StatsSummaryChart stats={data.stats} itemsSummary={data.itemsSummary} registrations={data.registrations} hrefPrefix="/admin/statistics" />
		</div>

		<!-- הודעת הצלחה/שגיאה -->
		{#if form?.success}
			<div class="mb-6 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center">
				<p class="text-green-400 text-sm font-medium">{form.message}</p>
			</div>
		{/if}
		{#if form?.error}
			<div class="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-center">
				<p class="text-red-400 text-sm font-medium">{form.error}</p>
			</div>
		{/if}

		<!-- חיפוש -->
		<div class="mb-6 flex gap-2 sm:gap-3 flex-wrap">
			<input
				type="text"
				placeholder="חיפוש..."
				bind:value={searchQuery}
				class="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white
				       placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
			/>
			{#if activeTab === 'users'}
				<select
					bind:value={roleFilter}
					class="w-full sm:w-auto bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white cursor-pointer
					       focus:outline-none focus:border-purple-500 transition-colors"
				>
					<option value="all">כל התפקידים</option>
					<option value="user">משתמשים</option>
					<option value="neighborhood_admin">אדמינים שכונתיים</option>
					<option value="super_admin">מנהלים ראשיים</option>
				</select>
			{/if}
		</div>

		<!-- טאב משתמשים -->
		{#if activeTab === 'users'}
			<!-- סקציית בקשות להיות רכז - ממתינות לאישור -->
			{#if (data.coordinatorRequests ?? []).length > 0}
				<section id="coord-requests" class="mb-6 scroll-mt-8 md:scroll-mt-32">
					<div class="flex items-center gap-2 mb-3">
						<span class="text-2xl">📨</span>
						<h2 class="text-lg font-black text-blue-300">בקשות להיות רכז</h2>
						<span class="text-xs font-bold bg-blue-500/15 text-blue-200 border border-blue-500/30 px-2 py-0.5 rounded-full">
							{data.coordinatorRequests.length}
						</span>
						<p class="text-xs text-gray-500 hidden md:block mr-2">ממתינות לאישורך</p>
					</div>

					<div class="grid gap-2 md:gap-3">
						{#each data.coordinatorRequests as req (req.id)}
							<div class="bg-blue-500/5 rounded-2xl border border-blue-500/30 p-3 md:p-4 flex flex-col gap-3 transition-all hover:border-blue-500/50">
								<div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
									<!-- פרטי המבקש (לחיץ לפרופיל) -->
									<a href="/admin/users/{req.user_id}" title="צפה בפרופיל המלא" class="user-link flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
										<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-sm font-bold ring-2 ring-blue-400/40">
											{(req.name ?? '?')[0]}
										</div>
										<div class="min-w-0">
											<div class="user-name text-lg font-bold truncate text-white">{req.name || 'ללא שם'}</div>
											<div class="text-base text-gray-400 truncate flex items-center gap-1.5">
												<svg class="w-4 h-4 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.32.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
												<span class="truncate">{req.phone || '-'}</span>
											</div>
										</div>
									</a>

									<!-- שכונות מבוקשות -->
									<div class="flex flex-wrap gap-1 max-w-full sm:max-w-[260px]">
										{#each req.neighborhoods as n}
											<span class="text-sm font-bold bg-blue-500/20 text-blue-200 border border-blue-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">
												{n}
											</span>
										{/each}
									</div>

									<!-- פעולות -->
									<div class="flex gap-2 flex-shrink-0 flex-wrap">
										<form method="POST" action="?/approveCoordRequest" use:enhance>
											<input type="hidden" name="requestId" value={req.id} />
											<button
												type="submit"
												class="px-3 py-1.5 text-sm rounded-lg bg-green-500/15 text-green-300 border border-green-500/40 hover:bg-green-500/25 transition-all cursor-pointer font-bold"
												title="אשר ומנה לרכז של השכונות המבוקשות"
											>
												✅ אשר כרכז
											</button>
										</form>
										<form method="POST" action="?/rejectCoordRequest" use:enhance>
											<input type="hidden" name="requestId" value={req.id} />
											<button
												type="submit"
												class="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
												onclick={(e) => { if (!confirm(`לדחות את בקשת הרכזות של ${req.name ?? ''}?`)) e.preventDefault(); }}
											>
												✖️ דחה
											</button>
										</form>
									</div>
								</div>

								<!-- ניסיון ומוטיבציה - מוצג בפונט גדול לקריאה נוחה -->
								{#if req.experience || req.motivation}
									<div class="text-base md:text-lg text-gray-200 leading-relaxed space-y-2 border-t border-white/5 pt-3">
										{#if req.experience}<p><span class="text-gray-400 font-bold">ניסיון:</span> {req.experience}</p>{/if}
										{#if req.motivation}<p><span class="text-gray-400 font-bold">מוטיבציה:</span> {req.motivation}</p>{/if}
									</div>
								{/if}

								<!-- הקשר המבקש + שני מסלולי צ'אט (סעיפים א+ב) -->
								<div class="flex flex-col gap-2 border-t border-blue-500/15 pt-3">
									<RequesterContext
										userId={req.requester?.userId ?? req.user_id}
										name={req.requester?.name ?? req.name}
										phone={req.requester?.phone ?? req.phone}
										email={req.requester?.email}
										city={req.requester?.city}
										neighborhood={req.requester?.neighborhood}
										business={req.requester?.business}
										sourceLabel={`בקשה להיות רכז שכונה${req.neighborhoods.length ? ` — ${req.neighborhoods.join(', ')}` : ''}`}
									/>
									<RequesterChatButtons
										userId={req.requester?.userId ?? req.user_id}
										phone={req.requester?.phone ?? req.phone}
										waText={coordWaText(req.requester?.name ?? req.name, req.neighborhoods)}
										internalDraft={coordDraft(req.requester?.name ?? req.name)}
									/>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- הוספת שכונה ידנית ע"י הסופר-אדמין - בלי להמתין לבקשת תושב -->
			<section id="add-neighborhood" class="mb-6 scroll-mt-8 md:scroll-mt-32">
				<div class="flex items-center gap-2 mb-3">
					<span class="text-2xl">➕</span>
					<h2 class="text-lg font-black text-emerald-300">הוספת שכונה לעיר</h2>
					<p class="text-xs text-gray-500 hidden md:block mr-2">מוסיפה שכונה מאושרת מיד לבוררים ולמפה</p>
				</div>
				<form
					method="POST"
					action="?/addNeighborhood"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') { addNbName = ''; addNbCity = ''; }
						};
					}}
					class="bg-emerald-500/5 rounded-2xl border border-emerald-500/30 p-3 md:p-4 flex flex-col sm:flex-row gap-2 sm:items-end"
				>
					<div class="flex-1">
						<label for="add-nb-city" class="block text-xs text-gray-400 mb-1">עיר</label>
						<input
							id="add-nb-city"
							name="city"
							list="admin-cities-list"
							bind:value={addNbCity}
							required
							placeholder="בחר/י עיר"
							class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
						/>
						<datalist id="admin-cities-list">
							{#each adminCityNames as c}<option value={c}></option>{/each}
						</datalist>
					</div>
					<div class="flex-1">
						<label for="add-nb-name" class="block text-xs text-gray-400 mb-1">שם השכונה</label>
						<input
							id="add-nb-name"
							name="name"
							bind:value={addNbName}
							required
							placeholder="שם השכונה החדשה"
							class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
						/>
					</div>
					<button
						type="submit"
						disabled={!addNbCity.trim() || !addNbName.trim()}
						class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold hover:from-emerald-500 hover:to-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer whitespace-nowrap"
					>
						➕ הוסף שכונה
					</button>
				</form>
			</section>

			<!-- סקציית שכונות חדשות שהוצעו ע"י תושבים (עם פין על המפה) - ממתינות לאישור -->
			{#if (data.pendingNeighborhoods ?? []).length > 0}
				<section id="pending-neighborhoods" class="mb-6 scroll-mt-8 md:scroll-mt-32">
					<div class="flex items-center gap-2 mb-3">
						<span class="text-2xl">📍</span>
						<h2 class="text-lg font-black text-amber-300">שכונות ממתינות לאישור</h2>
						<span class="text-xs font-bold bg-amber-500/15 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-full">
							{data.pendingNeighborhoods.length}
						</span>
						<p class="text-xs text-gray-500 hidden md:block mr-2">תושבים שסימנו שכונה חדשה על המפה</p>
					</div>

					<div class="grid gap-2 md:gap-3">
						{#each data.pendingNeighborhoods as nb, i (nb.id)}
							<div class="bg-amber-500/5 rounded-2xl border border-amber-500/30 p-3 md:p-4 flex flex-col gap-3 transition-all hover:border-amber-500/50">
								<!-- שורת מידע עליונה: שם/עיר · מפה · אישור/דחייה -->
								<div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
									<!-- שם השכונה והעיר -->
									<div class="flex items-center gap-3 flex-1 min-w-0">
										<div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 text-lg ring-2 ring-amber-400/40">
											📍
										</div>
										<div class="min-w-0">
											<div class="flex items-center gap-2 flex-wrap">
												<div class="text-lg font-bold truncate text-white">{nb.name}</div>
												{#if i === 0}
													<span class="text-[11px] font-bold bg-green-500/20 text-green-300 border border-green-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">🆕 הבקשה האחרונה</span>
												{/if}
											</div>
											<div class="text-base text-gray-400 truncate">🏙️ {nb.city || '—'}</div>
											{#if nb.created_at}
												<div class="text-xs text-amber-200/70 truncate mt-0.5" dir="ltr">🕒 {fmtDateTime(nb.created_at)}</div>
											{/if}
										</div>
									</div>

									<!-- מיקום על המפה -->
									<a
										href="https://www.google.com/maps?q={nb.lat},{nb.lng}"
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm font-bold bg-amber-500/15 text-amber-200 border border-amber-500/40 px-3 py-1.5 rounded-lg hover:bg-amber-500/25 transition-all whitespace-nowrap"
										title="פתח את המיקום ב-Google Maps"
									>
										🗺️ {nb.lat.toFixed(4)}, {nb.lng.toFixed(4)}
									</a>

									<!-- אישור/דחייה -->
									<div class="flex gap-2 flex-shrink-0 flex-wrap">
										<form method="POST" action="?/approveNeighborhood" use:enhance>
											<input type="hidden" name="neighborhoodId" value={nb.id} />
											<button
												type="submit"
												class="px-3 py-1.5 text-sm rounded-lg bg-green-500/15 text-green-300 border border-green-500/40 hover:bg-green-500/25 transition-all cursor-pointer font-bold"
												title="אשר - השכונה תופיע בבוררים ובמפה לכל המשתמשים"
											>
												✅ אשר שכונה
											</button>
										</form>
										<form method="POST" action="?/rejectNeighborhood" use:enhance>
											<input type="hidden" name="neighborhoodId" value={nb.id} />
											<button
												type="submit"
												class="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
												onclick={(e) => { if (!confirm(`לדחות את השכונה "${nb.name}"?`)) e.preventDefault(); }}
											>
												✖️ דחה
											</button>
										</form>
									</div>
								</div>

								<!-- הקשר המבקש + שני מסלולי צ'אט (סעיפים א+ב) -->
								<div class="flex flex-col gap-2 border-t border-amber-500/15 pt-3">
									<RequesterContext
										userId={nb.requester?.userId}
										name={nb.requester?.name}
										phone={nb.requester?.phone}
										email={nb.requester?.email}
										city={nb.requester?.city}
										neighborhood={nb.requester?.neighborhood}
										business={nb.requester?.business}
										sourceLabel={'בקשת שכונה חדשה — סומנה בפין על המפה (טופס פרופיל)'}
									/>
									<RequesterChatButtons
										userId={nb.requester?.userId}
										phone={nb.requester?.phone}
										waText={nbWaText(nb.requester?.name, nb.name, nb.city)}
										internalDraft={nbDraft(nb.requester?.name, nb.name, nb.city)}
									/>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- סקציית משאלות לכותל המשאלות - ממתינות לאישור -->
			{#if (data.pendingWishes ?? []).length > 0}
				<section id="pending-wishes" class="mb-6 scroll-mt-8 md:scroll-mt-32">
					<div class="flex items-center gap-2 mb-3">
						<span class="text-2xl">🙏</span>
						<h2 class="text-lg font-black text-purple-300">משאלות ממתינות לאישור</h2>
						<span class="text-xs font-bold bg-purple-500/15 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded-full">
							{data.pendingWishes.length}
						</span>
						<p class="text-xs text-gray-500 hidden md:block mr-2">משאלות שנשלחו לכותל המשאלות - יוצגו לציבור רק אחרי אישורך</p>
					</div>

					<div class="grid gap-2 md:gap-3">
						{#each data.pendingWishes as wish, i (wish.id)}
							<div class="bg-purple-500/5 rounded-2xl border border-purple-500/30 p-3 md:p-4 flex flex-col gap-3 transition-all hover:border-purple-500/50">
								<!-- שורת מידע עליונה: טקסט המשאלה · אישור/דחייה -->
								<div class="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
									<div class="flex items-start gap-3 flex-1 min-w-0">
										<div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 text-lg ring-2 ring-purple-400/40">
											🙏
										</div>
										<div class="min-w-0">
											{#if i === 0}
												<span class="text-[11px] font-bold bg-green-500/20 text-green-300 border border-green-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">🆕 המשאלה האחרונה</span>
											{/if}
											<p class="text-base md:text-lg text-gray-100 leading-relaxed whitespace-pre-line break-words">{wish.text}</p>
											{#if wish.created_at}
												<div class="text-xs text-purple-200/70 mt-0.5" dir="ltr">🕒 {fmtDateTime(wish.created_at)}</div>
											{/if}
										</div>
									</div>

									<!-- אישור/דחייה -->
									<div class="flex gap-2 flex-shrink-0 flex-wrap">
										<form method="POST" action="?/approveWish" use:enhance>
											<input type="hidden" name="wishId" value={wish.id} />
											<button
												type="submit"
												class="px-3 py-1.5 text-sm rounded-lg bg-green-500/15 text-green-300 border border-green-500/40 hover:bg-green-500/25 transition-all cursor-pointer font-bold"
												title="אשר - המשאלה תוצג בכותל המשאלות לכל הגולשים"
											>
												✅ אשר משאלה
											</button>
										</form>
										<form method="POST" action="?/rejectWish" use:enhance>
											<input type="hidden" name="wishId" value={wish.id} />
											<button
												type="submit"
												class="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
												onclick={(e) => { if (!confirm('לדחות את המשאלה? היא לא תוצג בכותל.')) e.preventDefault(); }}
											>
												✖️ דחה
											</button>
										</form>
									</div>
								</div>

								<!-- הקשר המבקש + שני מסלולי צ'אט - מוצג כשידוע מי שלח -->
								{#if wish.requester?.userId || wish.requester?.name || wish.requester?.phone}
									<div class="flex flex-col gap-2 border-t border-purple-500/15 pt-3">
										<RequesterContext
											userId={wish.requester?.userId}
											name={wish.requester?.name}
											phone={wish.requester?.phone}
											email={wish.requester?.email}
											city={wish.requester?.city}
											neighborhood={wish.requester?.neighborhood}
											business={wish.requester?.business}
											sourceLabel={'משאלה לכותל המשאלות (דף קופת השכונה)'}
										/>
										<RequesterChatButtons
											userId={wish.requester?.userId}
											phone={wish.requester?.phone}
											waText={wishWaText(wish.requester?.name, wish.text)}
											internalDraft={wishDraft(wish.requester?.name)}
										/>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- סקציית רכזי שכונות - מנהלי תוכן בשכונה שלהם -->
			<section id="coordinators" class="mb-6 scroll-mt-8 md:scroll-mt-32">
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2">
						<span class="text-2xl">🏘️</span>
						<h2 class="text-lg font-black text-amber-300">רכזי שכונות</h2>
						<span class="text-xs font-bold bg-amber-500/15 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-full">
							{coordinatorUsers().length}
						</span>
					</div>
					<p class="text-xs text-gray-500 hidden md:block">משתמשים שאושרו לנהל תוכן בשכונה שלהם</p>
				</div>

				{#if coordinatorUsers().length === 0}
					<div class="rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 px-4 py-6 text-center">
						<p class="text-sm text-amber-200/80 font-bold mb-1">{searchQuery ? 'לא נמצאו רכזים תואמים' : 'עוד לא מונו רכזים'}</p>
						<p class="text-xs text-gray-500">רכזים ממונים דרך אישור בקשה בסקציית "בקשות להיות רכז" למעלה (כפתור ✅ אשר כרכז)</p>
					</div>
				{:else}
					<div class="grid gap-1.5 md:gap-2">
						{#each coordinatorUsers() as user (user.id)}
							{@const coordList = ((user as any).coordinator_of as string[]) ?? []}
							{@const stat = (data.coordinatorStats ?? {})[user.id] ?? { residents: 0, items: 0, itemsOnMap: 0 }}
							<div class="bg-amber-500/5 rounded-2xl border border-amber-500/30 px-3 py-2 md:px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 transition-all hover:border-amber-500/50">
								<!-- אווטר + שם (לחיץ - פרופיל מלא). רוחב קבוע ב-sm+ כדי שעמודת השכונות
								     תתחיל תמיד באותו קו אנכי בכל הכרטיסים -->
								<a href="/admin/users/{user.id}" title="צפה בפרופיל המלא" class="user-link flex items-center gap-3 min-w-0 cursor-pointer sm:w-56 sm:flex-shrink-0">
									{#if user.avatar_url}
										<img src={user.avatar_url} alt="" class="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-amber-400/40" />
									{:else}
										<div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 text-sm font-bold ring-2 ring-amber-400/40">
											{(user.name ?? '?')[0]}
										</div>
									{/if}
									<div class="min-w-0">
										<div class="user-name text-lg font-bold truncate flex items-center gap-2 text-white">
											{user.name ?? 'ללא שם'}
											{#if user.banned}
												<span class="text-sm bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">חסום</span>
											{/if}
										</div>
									</div>
								</a>

								<!-- שכונות שהוא רכז עליהן - צמוד לשם בצד ימין -->
								<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 max-w-full sm:max-w-[260px]">
									{#each coordList as n, i}
										<span class="text-sm font-bold text-amber-200 whitespace-nowrap">
											{#if i > 0}<span class="text-amber-500/40 me-2">·</span>{/if}{areaLabel(n)}
										</span>
									{/each}
								</div>

								<!-- סיכום: כמה פריטים כבר על המפה בשכונתו וכמה תושבים רשומים -->
								<div class="flex gap-2 flex-shrink-0 sm:ms-auto">
									<div class="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 min-w-[76px]"
										title="פריטים שכבר מופיעים על המפה בשכונה ({stat.items} סה״כ פרסומים)">
										<span class="text-lg font-black text-emerald-300 leading-none">📍 {stat.itemsOnMap}</span>
										<span class="text-[11px] text-emerald-200/70">על המפה</span>
									</div>
									<div class="flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 px-3 py-1 min-w-[76px]"
										title="תושבים שנרשמו בשכונה שהרכז מנהל">
										<span class="text-lg font-black text-blue-300 leading-none">👥 {stat.residents}</span>
										<span class="text-[11px] text-blue-200/70">רשומים</span>
									</div>
								</div>

								<!-- פעולות: עריכת שכונות והסרה מרכזות (ההסרה מפנה את השכונה לרכז חדש) -->
								<div class="flex gap-2 flex-shrink-0">
									<button
										type="button"
										onclick={() => openCoordModal({ id: user.id, name: user.name, coordinator_of: coordList, neighborhood: user.neighborhood, city: (user as any).city })}
										class="px-3 py-1.5 text-sm rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer font-bold"
										title="עריכת השכונות שהרכז מנהל"
									>
										✏️ ערוך
									</button>
									<form method="POST" action="?/setCoordinator" use:enhance>
										<input type="hidden" name="userId" value={user.id} />
										<input type="hidden" name="neighborhoods" value="" />
										<button
											type="submit"
											class="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer font-bold"
											title="השכונות שלו יתפנו ויוכלו לקבל רכז חדש"
											onclick={(e) => { if (!confirm(`להסיר את ${user.name ?? user.id} מרכזות?\nהשכונות שלו יתפנו ויוכלו לקבל רכז חדש.`)) e.preventDefault(); }}
										>
											🗑 הסר רכזות
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- כותרת לרשימה הראשית - לחיצה פותחת/סוגרת (סגור כברירת מחדל להפחתת עומס) -->
			<button
				type="button"
				onclick={() => (usersListOpen = !usersListOpen)}
				class="w-full flex items-center gap-2 mb-3 mt-2 cursor-pointer text-right hover:opacity-90 transition-opacity"
				aria-expanded={usersListOpen || !!searchQuery}
			>
				<span class="text-xl">👥</span>
				<h2 class="text-lg font-black text-white">כל המשתמשים</h2>
				<span class="text-xs font-bold bg-white/10 text-gray-300 border border-white/20 px-2 py-0.5 rounded-full">
					{filteredUsers().length}
				</span>
				<span class="ms-auto text-gray-400 text-sm transition-transform {usersListOpen || searchQuery ? 'rotate-180' : ''}">▼</span>
			</button>

			{#if usersListOpen || searchQuery}
			<div class="space-y-1.5 md:space-y-2">
				{#each filteredUsers() as user (user.id)}
					{@const badge = roleBadge(user.role)}
					{@const isCoord = (user as any).coordinator_of?.length > 0}
					{@const hasHigherRole = user.role === 'super_admin' || user.role === 'neighborhood_admin'}
					<div class="bg-[#0f172a] rounded-2xl border border-white/10 px-3 py-2 md:px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 transition-all hover:border-white/20">
						<!-- אווטאר + שם (לחיץ - פרופיל מלא) -->
						<a href="/admin/users/{user.id}" title="צפה בפרופיל המלא" class="user-link flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
							{#if user.avatar_url}
								<img src={user.avatar_url} alt="" class="w-10 h-10 rounded-full object-cover flex-shrink-0" />
							{:else}
								<div class="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-300">
									{(user.name ?? '?')[0]}
								</div>
							{/if}
							<div class="min-w-0">
								<div class="user-name text-lg font-bold truncate flex items-center gap-2">
									{user.name ?? 'ללא שם'}
									{#if user.banned}
										<span class="text-sm bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">חסום</span>
									{/if}
									{#if ((user as any).merged_count ?? 1) > 1}
										<span class="text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full whitespace-nowrap" title="אוחד אוטומטית מחשבונות שחולקים אימייל/טלפון">
											🔗 מאוחד · {(user as any).merged_count} חשבונות
										</span>
									{/if}
								</div>
							</div>
						</a>

						<!-- עיר ואז שכונה -->
						<div class="text-base text-gray-400 min-w-[100px]">
							{[(user as any).city, user.neighborhood].filter(Boolean).join(' · ') || '-'}
						</div>

						<!-- תפקיד -->
						<div class="flex flex-col gap-1 items-start">
							<!-- מציגים רק את הדרגה המתקדמת: אם המשתמש רכז ואין לו דרגה גבוהה יותר, מדלגים על תווית "משתמש" -->
							{#if hasHigherRole || !isCoord}
								<span class="text-sm font-bold border px-2.5 py-1 rounded-full whitespace-nowrap {badge.color}">
									{badge.text}
								</span>
							{/if}
							{#if isCoord}
								<span class="text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full whitespace-nowrap">
									🏘️ רכז · {((user as any).coordinator_of as string[]).map(areaLabel).join(', ')}
								</span>
							{/if}
						</div>

						<!-- פעולות -->
						<div class="flex gap-2 flex-shrink-0 flex-wrap">
							<!-- חסימה/ביטול חסימה -->
							{#if user.id !== data.currentUserId}
								{#if user.banned}
									<form method="POST" action="?/unban" use:enhance>
										<input type="hidden" name="userId" value={user.id} />
										<button
											type="submit"
											class="px-3 py-1.5 text-sm rounded-lg bg-green-500/10 text-green-400 border border-green-500/30
											       hover:bg-green-500/20 transition-all cursor-pointer"
										>
											✅ בטל חסימה
										</button>
									</form>
								{:else}
									<form method="POST" action="?/ban" use:enhance>
										<input type="hidden" name="userId" value={user.id} />
										<button
											type="submit"
											class="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/30
											       hover:bg-red-500/20 transition-all cursor-pointer"
											onclick={(e) => { if (!confirm(`לחסום את ${user.name ?? user.id}?`)) e.preventDefault(); }}
										>
											🚫 חסום
										</button>
									</form>
								{/if}

								<!-- מחיקה לצמיתות - כולל כל החשבונות שאוחדו לכרטיס -->
								<form method="POST" action="?/deleteUser" use:enhance>
									<input type="hidden" name="userId" value={user.id} />
									<input type="hidden" name="mergedIds" value={((user as any).merged_ids ?? [user.id]).join(',')} />
									<button
										type="submit"
										class="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/30
										       hover:bg-red-500/20 transition-all cursor-pointer"
										title="מחיקה לצמיתות - אי אפשר לשחזר"
										onclick={(e) => { if (!confirm(`למחוק את ${user.name ?? user.id} לצמיתות?\nהחשבון יימחק מהמערכת ואי אפשר לשחזר.`)) e.preventDefault(); }}
									>
										🗑️ מחק
									</button>
								</form>
							{/if}
						</div>
					</div>
				{:else}
					<div class="text-center text-gray-500 py-12">
						{searchQuery ? 'לא נמצאו משתמשים' : 'אין משתמשים עדיין'}
					</div>
				{/each}
			</div>
			{/if}
		{/if}

		<!-- טאב פרסומים -->
		{#if activeTab === 'items'}
			<div class="space-y-3">
				{#each filteredItems() as item (item.id)}
					{@const isApproved = approvedIds.has(item.id)}
					<div class="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all {isApproved ? 'bg-green-500/5 border-green-500/40' : 'bg-[#0f172a] border-white/10 hover:border-white/20'}">
						<!-- אייקון + שם -->
						<div class="flex items-center gap-3 flex-1 min-w-0">
							<span class="text-2xl flex-shrink-0">{item.icon || '📦'}</span>
							<div class="min-w-0">
								<div class="font-bold truncate">{item.label}</div>
								<div class="text-sm text-gray-400 truncate">{item.description?.slice(0, 80)}</div>
							</div>
						</div>

						<!-- קטגוריה -->
						<span class="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full whitespace-nowrap">
							{item.category}
						</span>

						<!-- שכונה -->
						<div class="text-sm text-gray-400 min-w-[80px]">
							{item.neighborhood || '-'}
						</div>

						<!-- סימון "כבר אישרתי" - וי ירוק (זיכרון אישי לאדמין) -->
						<button
							type="button"
							onclick={() => toggleApproved(item.id)}
							class="px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-bold flex items-center gap-1 whitespace-nowrap {isApproved
								? 'bg-green-500/20 text-green-300 border-green-500/50'
								: 'bg-white/5 text-gray-500 border-white/10 hover:text-green-400 hover:border-green-500/30'}"
							title={isApproved ? 'מסומן כאושר - לחץ לביטול' : 'סמן כ"כבר אישרתי"'}
						>
							{isApproved ? '✅ אושר' : '✓ סמן אושר'}
						</button>

						<!-- מחיקה -->
						<form method="POST" action="?/deleteItem" use:enhance>
							<input type="hidden" name="itemId" value={item.id} />
							<button
								type="submit"
								class="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/30
								       hover:bg-red-500/20 transition-all cursor-pointer"
								onclick={(e) => { if (!confirm(`למחוק "${item.label}"?`)) e.preventDefault(); }}
							>
								🗑️ מחק
							</button>
						</form>
					</div>
				{:else}
					<div class="text-center text-gray-500 py-12">
						{searchQuery ? 'לא נמצאו פרסומים' : 'אין פרסומים עדיין'}
					</div>
				{/each}
			</div>
		{/if}

		<!-- טאב קודי הנחה -->
		{#if activeTab === 'discounts'}
			<section class="mb-6">
				<div class="flex items-center gap-2 mb-2">
					<span class="text-2xl">🎟️</span>
					<h2 class="text-lg font-black text-amber-300">קודי הנחה לדף התשלום</h2>
				</div>
				<p class="text-gray-400 text-sm mb-5 leading-relaxed">
					המילים שהמפרסם מקליד ב"מגירת ההנחה" בדף התשלום, וההנחה שתחול.
					הנחת רכז תחול <strong class="text-amber-200">רק</strong> אם המשתמש מסומן כרכז במערכת.
					"פטור מלא" = הפרסום עולה ללא תשלום.
				</p>

				<form method="POST" action="?/saveDiscounts" use:enhance>
					<input type="hidden" name="codes" value={JSON.stringify(discountCodes)} />

					<div class="space-y-4">
						{#each discountCodes as code, idx (code.id)}
							<div class="rounded-2xl bg-[#0f172a] border border-white/10 p-4 md:p-5">
								<div class="flex items-center justify-between mb-3">
									<span class="text-xs font-bold text-gray-500">קוד #{idx + 1}</span>
									<button
										type="button"
										onclick={() => removeDiscountCode(idx)}
										class="text-red-400 hover:text-red-300 text-sm font-bold cursor-pointer"
									>🗑️ מחק</button>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div>
										<label class="block text-xs text-gray-400 mb-1">שם תצוגה</label>
										<input bind:value={code.label} placeholder="הנחת רכז"
											class="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
									</div>
									<div>
										<label class="block text-xs text-gray-400 mb-1">מילות הקוד (מה שמקלידים)</label>
										<input bind:value={code.code} placeholder="רכז יוצאים לחירות"
											class="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
									</div>
									<div>
										<label class="block text-xs text-gray-400 mb-1">סוג</label>
										<select bind:value={code.kind}
											class="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm cursor-pointer focus:outline-none focus:border-amber-500">
											<option value="percent">אחוז הנחה</option>
											<option value="free">פטור מלא</option>
										</select>
									</div>
									<div>
										<label class="block text-xs text-gray-400 mb-1">אחוז (%)</label>
										<input type="number" min="0" max="100" bind:value={code.percent}
											disabled={code.kind === 'free'}
											class="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-40" />
									</div>
								</div>

								<div class="flex flex-wrap items-center gap-5 mt-3">
									<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
										<input type="checkbox" bind:checked={code.requiresCoordinator}
											class="w-4 h-4 accent-amber-500 cursor-pointer" />
										דורש אישור רכז
									</label>
									<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
										<input type="checkbox" bind:checked={code.active}
											class="w-4 h-4 accent-green-500 cursor-pointer" />
										פעיל
									</label>
								</div>

								<div class="mt-3">
									<label class="block text-xs text-gray-400 mb-1">הערה (פנימית)</label>
									<input bind:value={code.note} placeholder="הערה לעצמך - לא מוצג למשתמש"
										class="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-amber-500" />
								</div>
							</div>
						{/each}
					</div>

					{#if discountCodes.length === 0}
						<div class="text-center text-gray-500 py-8">אין קודי הנחה - הוסף קוד חדש</div>
					{/if}

					<div class="flex flex-wrap gap-3 mt-5">
						<button
							type="button"
							onclick={addDiscountCode}
							class="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 font-bold cursor-pointer"
						>➕ הוסף קוד</button>
						<button
							type="submit"
							class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black hover:scale-105 transition-transform cursor-pointer"
						>💾 שמור שינויים</button>
					</div>
				</form>
			</section>
		{/if}
	</div>
</div>

<!-- מודל מינוי רכז -->
{#if showCoordModal && coordModalUser}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
		onclick={() => (showCoordModal = false)}
		role="presentation"
	>
		<div
			class="bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl w-full max-w-md p-6"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-2xl font-bold mb-1">🏘️ מינוי רכז שכונה</h2>
			<p class="text-gray-300 text-base mb-4">
				משתמש: <span class="text-white font-bold">{coordModalUser.name ?? coordModalUser.id}</span>
			</p>

			<!-- מקום המגורים של המשתמש לפי הפרופיל (שכונה, או העיר אם סומן "מרכז"/אין שכונה) -->
			<div class="mb-4 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
				<span class="text-xl">🏠</span>
				<span class="text-base text-gray-300">מתגורר ב:</span>
				<span class="text-base font-bold text-white">{coordResidence || 'לא צוין בפרופיל'}</span>
			</div>

			<form method="POST" action="?/setCoordinator" use:enhance={() => {
				return async ({ update }) => {
					showCoordModal = false;
					await update();
				};
			}}>
				<input type="hidden" name="userId" value={coordModalUser.id} />

				<label class="block text-base font-medium text-gray-200 mb-1">
					שכונות שהוא רכז עליהן (שורה אחת לכל שכונה)
				</label>
				<p class="text-gray-400 text-sm mb-2">השאר ריק כדי להסיר את הרכזות מהמשתמש</p>
				<textarea
					name="neighborhoods"
					bind:value={coordNeighborhoods}
					rows="4"
					placeholder={coordResidence || 'שם השכונה'}
					class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-base text-white
					       placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors resize-none mb-4"
				></textarea>

				{#if coordNeighborhoods.trim()}
					<div class="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
						<p class="text-amber-300 text-sm font-semibold mb-1.5">שכונות שיוגדרו:</p>
						<div class="flex flex-wrap gap-1.5">
							{#each coordNeighborhoods.split('\n').map(s => s.trim()).filter(Boolean) as n}
								<span class="bg-amber-500/20 text-amber-200 text-sm px-2.5 py-0.5 rounded-full border border-amber-500/30">{n}</span>
							{/each}
						</div>
					</div>
				{:else}
					<div class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
						<p class="text-red-400 text-sm">⚠️ שמירה ריקה תסיר את הרכזות מהמשתמש</p>
					</div>
				{/if}

				<!-- בורר מובנה: החלפת/הוספת שכונה מהרשימה הרשמית (מונע שגיאות פורמט) -->
				<div class="mb-4 rounded-xl bg-white/5 border border-white/10 p-3">
					<p class="text-sm text-gray-300 font-semibold mb-2">🔄 בחירת שכונה מהרשימה</p>
					<div class="flex flex-col sm:flex-row gap-2">
						<input
							list="coord-cities-list"
							bind:value={coordPickCity}
							placeholder="עיר"
							class="flex-1 bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
						/>
						<datalist id="coord-cities-list">
							{#each adminCityNames as c}<option value={c}></option>{/each}
						</datalist>
						<select
							bind:value={coordPickNb}
							class="flex-1 bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
						>
							<option value="">{coordPickNbOptions.length ? 'בחר/י שכונה' : 'רכז/ת של כל העיר'}</option>
							{#each coordPickNbOptions as n}<option value={n}>{n}</option>{/each}
						</select>
					</div>
					<div class="flex gap-2 mt-2">
						<button
							type="button"
							onclick={coordReplaceArea}
							disabled={!coordPickCity.trim()}
							class="flex-1 py-2 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-500/40 text-sm font-bold hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
							title="הגדר את השכונה הזו כאזור היחיד של הרכז (דורס את הקיים)"
						>
							🔄 החלף לשכונה זו
						</button>
						<button
							type="button"
							onclick={coordAddArea}
							disabled={!coordPickCity.trim()}
							class="flex-1 py-2 rounded-lg bg-white/5 text-gray-200 border border-white/15 text-sm font-bold hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
							title="הוסף את השכונה הזו לרשימת השכונות של הרכז"
						>
							➕ הוסף שכונה
						</button>
					</div>
				</div>

				<div class="flex gap-3">
					<button
						type="submit"
						class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold
						       hover:from-amber-500 hover:to-orange-500 transition-all cursor-pointer"
					>
						שמור
					</button>
					<button
						type="button"
						onclick={() => (showCoordModal = false)}
						class="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300
						       hover:bg-white/10 transition-all cursor-pointer"
					>
						ביטול
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* קו תחתון לשם המשתמש בריחוף - group-hover שבור ב-Tailwind v4 */
	.user-link:hover .user-name {
		text-decoration: underline;
	}
</style>
