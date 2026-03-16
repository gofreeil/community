<script lang="ts">
	import { enhance } from '$app/forms';
	import { signOut } from '@auth/sveltekit/client';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { CityEntry } from '$lib/neighborhoodsData';
	import { t, locale } from 'svelte-i18n';
	import { get } from 'svelte/store';

	let { data, form } = $props();

	// tFn: פונקציית תרגום reactive — לא משתמשים ב-$t ישירות כי Prettier מוחק אותו
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe(l => (_loc = l)));
	const tFn = (k: string) => (_loc, get(t)(k));

	const DRAFT_KEY = 'profile_draft';

	let isEditing   = $state(!data.user?.name || data.user.name.length < 2);
	let saveSuccess = $state(false);
	let avatarPreview = $state<string | null>(data.user?.avatar_url ?? null);
	let avatarBase64  = $state('');

	let name          = $state(data.user?.name          ?? '');
	let email         = $state(data.user?.email         ?? '');
	let nickname      = $state(data.user?.nickname      ?? '');
	let phone         = $state(data.user?.phone         ?? '');
	let city          = $state(data.user?.city          ?? '');
	let neighborhood  = $state(data.user?.neighborhood  ?? '');
	let business      = $state(data.user?.business      ?? '');
	let family_status = $state(data.user?.family_status ?? '');
	let gender        = $state(data.user?.gender        ?? '');
	let notifications  = $state(data.user?.notifications !== 0);
	let termsAccepted  = $state(false);

	// טען טיוטה מ-localStorage — תמיד, כדי לשחזר שינויים שלא נשמרו
	onMount(() => {
		try {
			const saved = localStorage.getItem(DRAFT_KEY);
			if (saved) {
				const draft = JSON.parse(saved);
				if (draft.name)          name          = draft.name;
				if (draft.email)         email         = draft.email;
				if (draft.nickname)      nickname      = draft.nickname;
				if (draft.phone)         phone         = draft.phone;
				if (draft.city)          city          = draft.city;
				if (draft.neighborhood)  neighborhood  = draft.neighborhood;
				if (draft.business)      business      = draft.business;
				if (draft.family_status) family_status = draft.family_status;
				if (draft.gender)        gender        = draft.gender;
				if (draft.notifications !== undefined) notifications = draft.notifications;
			}
		} catch {}
	});

	// שמור טיוטה ב-localStorage בכל שינוי
	$effect(() => {
		try {
			localStorage.setItem(DRAFT_KEY, JSON.stringify({
				name, email, nickname, phone, city, neighborhood, business, family_status, gender, notifications
			}));
		} catch {}
	});

	function clearDraft() {
		try { localStorage.removeItem(DRAFT_KEY); } catch {}
	}

	// טולטיפ כפתור עריכה
	let showEditTooltip = $state(false);
	let editTooltipX    = $state(0);
	let editTooltipY    = $state(0);

	function handleEditMouseMove(e: MouseEvent) {
		editTooltipX = e.clientX + 14;
		editTooltipY = e.clientY + 20;
	}

	let availableNeighborhoods = $derived(
		(data.citiesData as CityEntry[]).find((c) => c.city === city)?.neighborhoods ?? []
	);

	let avatarLetter = $derived(
		(data.user?.name ?? data.user?.email ?? 'U').charAt(0).toUpperCase()
	);

	// מעגל מילוי פרופיל — דינמי: כל שדה שווה 100/מספר_שדות
	const ringCircumference = 2 * Math.PI * 43; // r=43, SVG 92×92

	let profileFields = $derived([
		!!avatarPreview,
		!!name,
		!!email,
		!!nickname,
		!!phone,
		!!city,
		!!neighborhood,
		!!gender,
		!!business,
		!!family_status,
		!!notifications,
	]);

	let profileCompletion = $derived(
		Math.round(profileFields.filter(Boolean).length / profileFields.length * 100)
	);

	let ringColor = $derived(
		profileCompletion < 40 ? '#ef4444' :
		profileCompletion < 70 ? '#eab308' : '#22c55e'
	);

	// טיפ למעגל — המפתח של השדה הבא שלא מולא
	const ringTipKeys = [
		'tip_avatar', 'tip_name', 'tip_email', 'tip_nickname',
		'tip_phone', 'tip_city', 'tip_neighborhood', 'tip_gender',
		'tip_business', 'tip_family_status', 'tip_notifications',
	] as const;
	let nextTipKey = $derived(
		profileCompletion >= 100
			? 'profile_complete'
			: ringTipKeys[profileFields.findIndex(f => !f)] ?? 'profile_complete'
	);

	let showRingTooltip = $state(false);
	let ringTipX = $state(0);
	let ringTipY = $state(0);
	function handleRingMouseMove(e: MouseEvent) {
		ringTipX = e.clientX + 14;
		ringTipY = e.clientY + 20;
	}

	function handleImageChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			avatarPreview = ev.target?.result as string;
			avatarBase64  = ev.target?.result as string;
		};
		reader.readAsDataURL(file);
	}
</script>

<svelte:head>
	<title>{tFn("profile_title")}</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8" dir="rtl">

	<!-- ===== ברוך הבא — הרשמה חדשה ===== -->
	{#if page.url.searchParams.get('new') === '1'}
		<div class="mb-6 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-purple-500/30 px-6 py-5 text-center shadow-lg">
			<p class="text-2xl mb-1">🎉</p>
			<h2 class="text-white font-black text-lg mb-1">{tFn("welcome_community")}</h2>
			<p class="text-gray-300 text-sm">{tFn("registration_complete")}</p>
		</div>
	{/if}

	<!-- ===== קומה 1: האזור האישי ===== -->
	<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 mb-6 shadow-xl">
		<!-- כותרת + כפתור התנתקות -->
		<div class="flex items-center justify-between mb-5">
			<div class="flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
				<h2 class="text-base font-black text-white">{tFn("section_personal_area")}</h2>
			</div>
			<button
				onclick={() => signOut({ callbackUrl: '/' })}
				class="text-sm font-bold text-gray-400 hover:text-red-400 transition-colors cursor-pointer px-4 py-2 rounded-xl hover:bg-red-500/10 border border-white/10 hover:border-red-500/30"
				title={tFn("logout_btn")}
			>
				{tFn("logout_btn")}
			</button>
		</div>
		<div class="flex items-center gap-5">

			<!-- אווטר + מעגל מילוי -->
			<div class="relative flex-shrink-0 mb-3 cursor-pointer"
				onmouseenter={() => (showRingTooltip = true)}
				onmouseleave={() => (showRingTooltip = false)}
				onmousemove={handleRingMouseMove}
				role="img"
				aria-label={tFn(nextTipKey)}
			>
				{#if avatarPreview}
					<img src={avatarPreview} alt={tFn("profile_photo")}
						class="w-20 h-20 rounded-full border-2 border-purple-500/40 shadow-xl object-cover" />
				{:else}
					<div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-700
					            flex items-center justify-center border-2 border-purple-500/40 shadow-xl">
						<span class="text-3xl font-black text-white">{avatarLetter}</span>
					</div>
				{/if}

				<!-- מעגל SVG -->
				<svg width="92" height="92"
					class="absolute pointer-events-none"
					style="top: -6px; left: -6px; transform: rotate(-90deg)">
					<circle cx="46" cy="46" r="43" fill="none"
						stroke="rgba(255,255,255,0.08)" stroke-width="3.5" />
					<circle cx="46" cy="46" r="43" fill="none"
						stroke={ringColor}
						stroke-width="3.5"
						stroke-linecap="round"
						stroke-dasharray={ringCircumference}
						stroke-dashoffset={ringCircumference * (1 - profileCompletion / 100)}
						style="transition: stroke-dashoffset 0.6s ease, stroke 0.4s ease" />
				</svg>

				<!-- אחוז מילוי -->
				<div class="absolute -bottom-4 left-1/2 -translate-x-1/2
				            bg-[#0f172a] border rounded-full px-1.5 py-0.5
				            text-[10px] font-bold whitespace-nowrap z-10"
					style="color: {ringColor}; border-color: {ringColor}55">
					{profileCompletion}%
				</div>

				<!-- אייקון ספק -->
				<span class="absolute top-0 left-0 text-base leading-none">
					{data.user?.provider === 'google' ? '🔵' : data.user?.provider === 'facebook' ? '🟦' : '👤'}
				</span>
			</div>


			<div class="min-w-0 flex-1">
				<h1 class="text-2xl font-black text-white truncate">
					{data.user?.nickname || data.user?.name || ''}
				</h1>
				{#if data.user?.email}
					<p class="text-gray-400 text-sm mt-0.5">{data.user.email}</p>
				{/if}
				{#if data.user?.neighborhood || data.user?.city}
					<p class="text-purple-400 text-sm mt-1">
						📍 {[data.user?.neighborhood, data.user?.city].filter(Boolean).join(', ')}
					</p>
				{/if}
				<div class="flex gap-3 mt-2 flex-wrap">
					{#if data.items.length > 0}
						<span class="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full font-bold">
							{data.items.length} {tFn("publications_count")}
						</span>
					{/if}
					{#if data.user?.business}
						<span class="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold">
							🏢 {data.user.business}
						</span>
					{/if}
				</div>
			</div>
			<!-- הארנק שלי — ממורכז -->
			<div class="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group select-none">
				<div class="w-52 overflow-hidden rounded-[2.5rem] shadow-xl border-2 border-white/10 group-hover:scale-105 transition-transform duration-200">
					<img src="/images/wallet.png" alt="המזומן שלי" class="w-full h-auto block" />
				</div>
				<span class="text-xs text-gray-300 font-bold">המזומן שלי</span>
			</div>

		</div>
	</div>

	<!-- ===== קומה 2: פרטי פרופיל ===== -->
	<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 mb-6 shadow-xl">

		<div class="flex items-center justify-between mb-6">
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
				{tFn("section_profile_details")}
			</h2>
			<button
				onclick={() => { isEditing = !isEditing; saveSuccess = false; }}
				class="text-sm font-bold px-4 py-2 rounded-xl transition-all cursor-pointer
				       {isEditing
				         ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
				         : 'bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 border border-purple-500/30'}"
			>
				{isEditing ? tFn('cancel') : tFn('edit_btn')}
			</button>
		</div>


		{#if saveSuccess}
			<div class="mb-5 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center">
				<p class="text-green-400 text-sm font-bold">{tFn("profile_updated")}</p>
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
				<p class="text-red-400 text-sm">{form.error}</p>
			</div>
		{/if}

		<form
			method="POST"
			action="?/updateProfile"
			enctype="multipart/form-data"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						isEditing = false;
						saveSuccess = true;
						clearDraft();
						setTimeout(() => (saveSuccess = false), 4000);
					} else {
						await update();
					}
				};
			}}
		>
			<!-- שדה נסתר לתמונה -->
			<input type="hidden" name="avatar_base64" value={avatarBase64} />

			<div class="grid grid-cols-1 md:grid-cols-2 gap-5">

				<!-- תמונת פרופיל -->
				{#if isEditing}
				<div class="md:col-span-2 flex items-center gap-5">
					<div class="relative flex-shrink-0">
						{#if avatarPreview}
							<img src={avatarPreview} alt={tFn("profile_photo")}
								class="w-20 h-20 rounded-full object-cover border-4 border-purple-500/40" />
						{:else}
							<div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-700
							            flex items-center justify-center border-4 border-purple-500/40">
								<span class="text-3xl font-black text-white">{avatarLetter}</span>
							</div>
						{/if}
					</div>
					<div>
						<p class="text-xs text-gray-400 font-bold mb-2">{tFn("profile_photo")}</p>
						<label class="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10
						              hover:border-purple-500/40 rounded-xl px-4 py-2 text-sm text-gray-300
						              transition-all inline-block">
							{tFn("choose_photo")}
							<input type="file" accept="image/*" class="hidden" onchange={handleImageChange} />
						</label>
					</div>
				</div>
				{/if}

				<!-- שם מלא -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("full_name_label")}</label>
					{#if isEditing}
						<input name="name" type="text" bind:value={name} placeholder={tFn("full_name_placeholder")} required
							class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none" />
					{:else}
						<p class="text-white font-medium py-3 px-1">{name || '—'}</p>
					{/if}
				</div>

				<!-- אימייל -->
				<div>
					<label for="email" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("email")}</label>
					{#if isEditing}
						<input id="email" name="email" type="email" bind:value={email}
							autocomplete="email"
							class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none" />
					{:else}
						<p class="text-white font-medium py-3 px-1">{email || '—'}</p>
					{/if}
				</div>

			<!-- כינוי -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("nickname_label")}</label>
					{#if isEditing}
						<input name="nickname" type="text" bind:value={nickname} placeholder={tFn("nickname_placeholder")}
							class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none" />
					{:else}
						<p class="text-white font-medium py-3 px-1">{nickname || '—'}</p>
					{/if}
				</div>

				<!-- מגדר -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("gender_label")}</label>
					{#if isEditing}
						<div class="flex gap-3">
							<button type="button"
								onclick={() => gender = 'male'}
								class="flex-1 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer
								       {gender === 'male'
								         ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
								         : 'bg-white/5 border-white/10 text-gray-400 hover:border-blue-500/30 hover:text-blue-300'}"
							>
								{tFn('male')}
							</button>
							<button type="button"
								onclick={() => gender = 'female'}
								class="flex-1 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer
								       {gender === 'female'
								         ? 'bg-pink-600/30 border-pink-500/60 text-pink-300'
								         : 'bg-white/5 border-white/10 text-gray-400 hover:border-pink-500/30 hover:text-pink-300'}"
							>
								{tFn('female')}
							</button>
						</div>
						<input type="hidden" name="gender" value={gender} />
					{:else}
						<p class="text-white font-medium py-3 px-1">
							{gender === 'male' ? tFn('male') : gender === 'female' ? tFn('female') : '—'}
						</p>
					{/if}
				</div>

			<!-- טלפון -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("phone_label")}</label>
					{#if isEditing}
						<input name="phone" type="tel" bind:value={phone} placeholder="050-0000000"
							class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none" />
					{:else}
						<p class="text-white font-medium py-3 px-1">{phone || '—'}</p>
					{/if}
				</div>

				<!-- עיר -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("city_label")}</label>
					{#if isEditing}
						<select name="city" bind:value={city} onchange={() => (neighborhood = '')}
							class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none appearance-none">
							<option value="">{tFn("choose_city")}</option>
							{#each (data.citiesData as CityEntry[]) as c}
								<option value={c.city}>{c.city}</option>
							{/each}
						</select>
					{:else}
						<p class="text-white font-medium py-3 px-1">{city || '—'}</p>
					{/if}
				</div>

				<!-- שכונה -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("neighborhood_label")}</label>
					{#if isEditing}
						<select name="neighborhood" bind:value={neighborhood} disabled={!city}
							class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none appearance-none
							       disabled:opacity-40 disabled:cursor-not-allowed">
							<option value="">{tFn("choose_neighborhood")}</option>
							{#each availableNeighborhoods as n}
								<option value={n}>{n}</option>
							{/each}
						</select>
					{:else}
						<p class="text-white font-medium py-3 px-1">{neighborhood || '—'}</p>
					{/if}
				</div>

				<!-- עסק -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("business_label")}</label>
					{#if isEditing}
						<input name="business" type="text" bind:value={business} placeholder={tFn("business_placeholder")}
							class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none" />
					{:else}
						<p class="text-white font-medium py-3 px-1">{business || '—'}</p>
					{/if}
				</div>

				<!-- סטטוס משפחתי -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("family_status_label")}</label>
					{#if isEditing}
						<select name="family_status" bind:value={family_status}
							class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none appearance-none">
							<option value="single_m">{tFn("status_single_m")}</option>
							<option value="single_f">{tFn("status_single_f")}</option>
							<option value="family">{tFn("status_family")}</option>
						</select>
					{:else}
						<p class="text-white font-medium py-3 px-1">
							{family_status === 'single_m' ? tFn('status_single_m')
							 : family_status === 'single_f' ? tFn('status_single_f')
							 : family_status === 'family'   ? tFn('status_family')
							 : '—'}
						</p>
					{/if}
					<p class="text-gray-600 text-xs mt-1 px-1">{tFn("not_shown_public")}</p>
				</div>

				<!-- התראות -->
				<div class="md:col-span-2">
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">{tFn("notifications_label")}</label>
					{#if isEditing}
						<label class="flex items-center gap-3 cursor-pointer group">
							<div class="relative" dir="ltr">
								<input type="checkbox" bind:checked={notifications}
									class="sr-only peer" />
								<div class="w-11 h-6 bg-gray-700 rounded-full peer-checked:bg-purple-600
								            transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5
								            after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
								            peer-checked:after:translate-x-5"></div>
							</div>
							<span class="text-sm text-gray-300 group-hover:text-white transition-colors">
								מסכים לקבל התראות מחברי השכונה בשעת צרה
							</span>
						</label>
						<input type="hidden" name="notifications" value={notifications ? 'true' : 'false'} />
					{:else}
						<p class="text-white font-medium py-1 px-1 flex items-center gap-2">
							{#if notifications}
								<span class="text-green-400">✅</span> {tFn("notifications_yes")}
							{:else}
								<span class="text-gray-500">❌</span> {tFn("notifications_no")}
							{/if}
						</p>
					{/if}
				</div>

			</div>

			{#if isEditing}
				<div class="mt-6">
					<label class="flex items-start gap-3 cursor-pointer mb-4">
						<input type="checkbox" bind:checked={termsAccepted}
							class="mt-1 w-4 h-4 accent-purple-500 cursor-pointer flex-shrink-0" />
						<span class="text-sm text-gray-300">
							{tFn("terms_agree_prefix")}
							<a href="/terms" target="_blank" class="text-purple-400 hover:underline">{tFn("terms")}</a>
							ו<a href="/privacy" target="_blank" class="text-purple-400 hover:underline">{tFn("privacy")}</a>
								{tFn("terms_agree_suffix")}
							
						</span>
					</label>
					<button type="submit"
						disabled={!termsAccepted}
						class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
						       text-white font-bold px-7 py-3 rounded-xl shadow-lg transition-all hover:-translate-y-0.5
						       cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
					>
						{tFn("save_changes")}
					</button>
				</div>
			{/if}
		</form>
	</div>

	<!-- ===== קומה 3: המידע שלי ===== -->
	<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 shadow-xl">
		<h2 class="text-xl font-black text-white flex items-center gap-2 mb-6">
			<span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
			{tFn("section_my_info")}
			{#if data.items.length > 0}
				<span class="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
					{data.items.length}
				</span>
			{/if}
		</h2>

		{#if data.items.length === 0}
			<div class="text-center py-12">
				<span class="text-6xl block mb-4">📭</span>
				<p class="text-gray-400 mb-6 text-sm">{tFn("no_items")}</p>
				<a href="/"
					class="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
					       text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:-translate-y-0.5">
					{tFn("publish_first")}
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each data.items as item}
					<a href="/items/{item.id}"
						class="bg-white/5 rounded-2xl border border-white/10 p-4
						       hover:border-purple-500/30 hover:bg-white/8 transition-all group block">
						<div class="flex items-start gap-3">
							<span class="text-3xl flex-shrink-0 mt-0.5">{item.icon ?? '📋'}</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2 flex-wrap mb-1">
									<h3 class="text-white font-bold text-sm truncate group-hover:text-purple-300 transition-colors">
										{item.label}
									</h3>
									<span class="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0
									  {item.status === 'active'
									    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
									    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}">
										{item.status === 'active' ? tFn('status_active') : item.status}
									</span>
								</div>
								{#if item.description}
									<p class="text-gray-400 text-xs line-clamp-2">{item.description}</p>
								{/if}
								<div class="flex items-center gap-3 mt-1.5">
									{#if item.neighborhood}
										<span class="text-purple-400/70 text-xs">📍 {item.neighborhood}</span>
									{/if}
									<span class="text-gray-600 text-xs">
										{new Date(item.created_at).toLocaleDateString('he-IL')}
									</span>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>

</div>

{#if showEditTooltip}
	<div class="fixed z-[9999] pointer-events-none"
		style="left: {editTooltipX}px; top: {editTooltipY}px;">
		<div class="bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap border border-white/10">
			{tFn("edit_tooltip")}
		</div>
	</div>
{/if}

{#if showRingTooltip}
	<div class="fixed z-[9999] pointer-events-none"
		style="left: {ringTipX}px; top: {ringTipY}px;">
		<div class="text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap border
		            {profileCompletion >= 100
		              ? 'bg-green-900/90 text-green-300 border-green-500/30'
		              : 'bg-gray-900/95 text-yellow-300 border-yellow-500/30'}">
			{tFn(nextTipKey)}
		</div>
	</div>
{/if}