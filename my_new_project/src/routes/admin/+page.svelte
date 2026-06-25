<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { DiscountCode } from '$lib/discountCodes';

	let { data, form } = $props();

	let activeTab = $state<'users' | 'items' | 'discounts'>('users');

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

	// מינוי אדמין - מודל
	let showRoleModal = $state(false);
	let roleModalUser = $state<{ id: string; name: string | null; role: string; neighborhood: string } | null>(null);
	let newRole = $state('user');
	let newNeighborhood = $state('');

	// מינוי רכז - מודל
	let showCoordModal  = $state(false);
	let coordModalUser  = $state<{ id: string; name: string | null; coordinator_of: string[]; neighborhood?: string | null; city?: string | null } | null>(null);
	let coordNeighborhoods = $state(''); // שכונות מופרדות בשורות

	// מקום המגורים להצגה: השכונה שסומנה, אך אם סומן "מרכז" או שאין שכונה - העיר שסומנה
	function residenceLabel(neighborhood?: string | null, city?: string | null): string {
		const n = neighborhood?.trim();
		const c = city?.trim();
		if (n && n !== 'מרכז') return n;
		return c ?? '';
	}

	function openCoordModal(user: { id: string; name: string | null; coordinator_of: string[]; neighborhood?: string | null; city?: string | null }) {
		coordModalUser = user;
		// ברירת מחדל: אם כבר רכז - השכונות הקיימות; אחרת מקום המגורים מהפרופיל (שכונה או עיר)
		coordNeighborhoods = user.coordinator_of.length > 0
			? user.coordinator_of.join('\n')
			: residenceLabel(user.neighborhood, user.city);
		showCoordModal = true;
	}

	// מקום המגורים להצגה במודל הרכז
	const coordResidence = $derived(coordModalUser ? residenceLabel(coordModalUser.neighborhood, coordModalUser.city) : '');

	function openRoleModal(user: typeof roleModalUser) {
		roleModalUser = user;
		newRole = user?.role ?? 'user';
		newNeighborhood = user?.neighborhood ?? '';
		showRoleModal = true;
	}

	// סינון משתמשים
	const filteredUsers = $derived(() => {
		let list = data.users ?? [];
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			list = list.filter(u =>
				(u.name?.toLowerCase().includes(q)) ||
				(u.email?.toLowerCase().includes(q)) ||
				(u.id?.toLowerCase().includes(q)) ||
				(u.neighborhood?.toLowerCase().includes(q))
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
		const q = searchQuery.toLowerCase();
		return list.filter(u =>
			(u.name?.toLowerCase().includes(q)) ||
			(u.email?.toLowerCase().includes(q)) ||
			((u as any).coordinator_of as string[]).some(n => n.toLowerCase().includes(q))
		);
	});

	// סינון פריטים
	const filteredItems = $derived(() => {
		if (!searchQuery) return data.items ?? [];
		const q = searchQuery.toLowerCase();
		return (data.items ?? []).filter(i =>
			i.label?.toLowerCase().includes(q) ||
			i.description?.toLowerCase().includes(q) ||
			i.category?.toLowerCase().includes(q)
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
	<div class="max-w-6xl mx-auto px-4 py-8">

		<!-- כותרת -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-3xl font-black">
					לוח ניהול
				</h1>
				<p class="text-gray-400 mt-1">ניהול משתמשים, תוכן והרשאות</p>
			</div>
			<div class="flex gap-2">
				<button
					onclick={() => goto('/admin/ads-review')}
					class="relative px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 hover:bg-amber-500/25 transition-all cursor-pointer font-bold flex items-center gap-1.5"
				>
					📢 אישור פרסומות
					{#if (data.pendingAdsCount ?? 0) > 0}
						<span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-black text-[11px] font-black shadow-lg animate-pulse">
							{data.pendingAdsCount}
						</span>
					{/if}
				</button>
				<button
					onclick={() => goto('/')}
					class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
				>
					חזרה לאתר
				</button>
			</div>
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

		<!-- טאבים -->
		<div class="flex gap-2 mb-6">
			<button
				onclick={() => (activeTab = 'users')}
				class="px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer {activeTab === 'users'
					? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
					: 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}"
			>
				👥 משתמשים ({data.users?.length ?? 0})
			</button>
			<button
				onclick={() => (activeTab = 'items')}
				class="px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer {activeTab === 'items'
					? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
					: 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}"
			>
				📋 פרסומים ({data.items?.length ?? 0})
			</button>
			<button
				onclick={() => (activeTab = 'discounts')}
				class="px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer {activeTab === 'discounts'
					? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
					: 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}"
			>
				🎟️ קודי הנחה ({discountCodes.length})
			</button>
		</div>

		<!-- חיפוש -->
		<div class="mb-6 flex gap-3 flex-wrap">
			<input
				type="text"
				placeholder="חיפוש..."
				bind:value={searchQuery}
				class="flex-1 min-w-[200px] bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white
				       placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
			/>
			{#if activeTab === 'users'}
				<select
					bind:value={roleFilter}
					class="bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white cursor-pointer
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
				<section id="coord-requests" class="mb-6 scroll-mt-4">
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
											<div class="text-base text-gray-400 truncate">📞 {req.phone || '-'}</div>
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

								<!-- ניסיון ומוטיבציה -->
								{#if req.experience || req.motivation}
									<div class="text-sm text-gray-400 space-y-1 border-t border-white/5 pt-2">
										{#if req.experience}<p><span class="text-gray-500">ניסיון:</span> {req.experience}</p>{/if}
										{#if req.motivation}<p><span class="text-gray-500">מוטיבציה:</span> {req.motivation}</p>{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- סקציית שכונות חדשות שהוצעו ע"י תושבים (עם פין על המפה) - ממתינות לאישור -->
			{#if (data.pendingNeighborhoods ?? []).length > 0}
				<section id="pending-neighborhoods" class="mb-6 scroll-mt-4">
					<div class="flex items-center gap-2 mb-3">
						<span class="text-2xl">📍</span>
						<h2 class="text-lg font-black text-amber-300">שכונות ממתינות לאישור</h2>
						<span class="text-xs font-bold bg-amber-500/15 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-full">
							{data.pendingNeighborhoods.length}
						</span>
						<p class="text-xs text-gray-500 hidden md:block mr-2">תושבים שסימנו שכונה חדשה על המפה</p>
					</div>

					<div class="grid gap-2 md:gap-3">
						{#each data.pendingNeighborhoods as nb (nb.id)}
							<div class="bg-amber-500/5 rounded-2xl border border-amber-500/30 p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all hover:border-amber-500/50">
								<!-- שם השכונה והעיר -->
								<div class="flex items-center gap-3 flex-1 min-w-0">
									<div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 text-lg ring-2 ring-amber-400/40">
										📍
									</div>
									<div class="min-w-0">
										<div class="text-lg font-bold truncate text-white">{nb.name}</div>
										<div class="text-base text-gray-400 truncate">🏙️ {nb.city || '—'}</div>
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

								<!-- פעולות -->
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
						{/each}
					</div>
				</section>
			{/if}

			<!-- סקציית רכזי שכונות - מנהלי תוכן בשכונה שלהם -->
			<section id="coordinators" class="mb-6 scroll-mt-4">
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
					<div class="grid gap-2 md:gap-3">
						{#each coordinatorUsers() as user (user.id)}
							{@const coordList = ((user as any).coordinator_of as string[]) ?? []}
							<div class="bg-amber-500/5 rounded-2xl border border-amber-500/30 p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all hover:border-amber-500/50">
								<!-- אווטר + שם (לחיץ - פרופיל מלא) -->
								<a href="/admin/users/{user.id}" title="צפה בפרופיל המלא" class="user-link flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
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
										<div class="text-base text-gray-400 truncate">{user.email ?? '-'}</div>
									</div>
								</a>

								<!-- שכונות שהוא רכז עליהן -->
								<div class="flex flex-wrap gap-1 max-w-full sm:max-w-[260px]">
									{#each coordList as n}
										<span class="text-sm font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">
											{n}
										</span>
									{/each}
								</div>

								<!-- פעולות -->
								<div class="flex gap-2 flex-shrink-0 flex-wrap">
									<button
										onclick={() => openCoordModal({ id: user.id, name: user.name, coordinator_of: coordList, neighborhood: user.neighborhood, city: (user as any).city })}
										class="px-3 py-1.5 text-sm rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-all cursor-pointer font-bold"
										title="ערוך שכונות שהוא רכז עליהן"
									>
										✏️ ערוך שכונות
									</button>
									<form method="POST" action="?/setCoordinator" use:enhance>
										<input type="hidden" name="userId" value={user.id} />
										<input type="hidden" name="neighborhoods" value="" />
										<button
											type="submit"
											class="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
											onclick={(e) => { if (!confirm(`להסיר את הרכזות מ-${user.name ?? user.id}?`)) e.preventDefault(); }}
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

			<!-- כותרת לרשימה הראשית -->
			<div class="flex items-center gap-2 mb-3 mt-2">
				<span class="text-xl">👥</span>
				<h2 class="text-lg font-black text-white">כל המשתמשים</h2>
				<span class="text-xs font-bold bg-white/10 text-gray-300 border border-white/20 px-2 py-0.5 rounded-full">
					{filteredUsers().length}
				</span>
			</div>

			<div class="space-y-3">
				{#each filteredUsers() as user (user.id)}
					{@const badge = roleBadge(user.role)}
					{@const isCoord = (user as any).coordinator_of?.length > 0}
					{@const hasHigherRole = user.role === 'super_admin' || user.role === 'neighborhood_admin'}
					<div class="bg-[#0f172a] rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:border-white/20">
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
								</div>
								<div class="text-base text-gray-400 truncate">{user.email ?? '-'}</div>
							</div>
						</a>

						<!-- שכונה -->
						<div class="text-base text-gray-400 min-w-[100px]">
							{user.neighborhood || '-'}
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
									🏘️ רכז · {(user as any).coordinator_of.join(', ')}
								</span>
							{/if}
						</div>

						<!-- פעולות -->
						<div class="flex gap-2 flex-shrink-0 flex-wrap">
							<!-- שינוי תפקיד -->
							<button
								onclick={() => openRoleModal({ id: user.id, name: user.name, role: user.role, neighborhood: user.neighborhood })}
								class="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-gray-300 border border-white/10
								       hover:bg-white/10 transition-all cursor-pointer"
								title="שנה תפקיד"
							>
								🛡️ תפקיד
							</button>

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

		<!-- טאב פרסומים -->
		{#if activeTab === 'items'}
			<div class="space-y-3">
				{#each filteredItems() as item (item.id)}
					<div class="bg-[#0f172a] rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:border-white/20">
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

<!-- מודל שינוי תפקיד -->
{#if showRoleModal && roleModalUser}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
		onclick={() => (showRoleModal = false)}
		role="presentation"
	>
		<div
			class="bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl w-full max-w-md p-6"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-xl font-bold mb-4">🛡️ שינוי תפקיד</h2>
			<p class="text-gray-400 mb-4">
				משתמש: <span class="text-white font-bold">{roleModalUser.name ?? roleModalUser.id}</span>
			</p>

			<form method="POST" action="?/setRole" use:enhance={() => {
				return async ({ result, update }) => {
					showRoleModal = false;
					await update();
				};
			}}>
				<input type="hidden" name="userId" value={roleModalUser.id} />

				<label class="block text-sm font-medium text-gray-400 mb-2">תפקיד</label>
				<select
					name="role"
					bind:value={newRole}
					class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white mb-4
					       focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
				>
					<option value="user">משתמש רגיל</option>
					<option value="neighborhood_admin">אדמין שכונתי</option>
					<option value="super_admin">מנהל ראשי</option>
				</select>

				{#if newRole === 'neighborhood_admin'}
					<label class="block text-sm font-medium text-gray-400 mb-2">שכונה</label>
					<input
						name="neighborhood"
						type="text"
						bind:value={newNeighborhood}
						placeholder="שם השכונה..."
						class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white mb-4
						       placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
					/>
				{/if}

				<div class="flex gap-3 mt-4">
					<button
						type="submit"
						class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold
						       hover:from-blue-500 hover:to-purple-500 transition-all cursor-pointer"
					>
						שמור
					</button>
					<button
						type="button"
						onclick={() => (showRoleModal = false)}
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
