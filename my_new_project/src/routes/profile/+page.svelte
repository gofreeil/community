<script lang="ts">
	import { enhance } from '$app/forms';
	import { signOut } from '@auth/sveltekit/client';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { CityEntry } from '$lib/neighborhoodsData';
	import { t, locale } from 'svelte-i18n';
	import { get } from 'svelte/store';
	import { neighborhoodState } from '$lib/neighborhoodState.svelte';

	let { data, form } = $props();

	// tFn: פונקציית תרגום reactive — לא משתמשים ב-$t ישירות כי Prettier מוחק אותו
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe(l => (_loc = l)));
	const tFn = (k: string) => { void _loc; return get(t)(k); };

	const DRAFT_KEY = 'profile_draft';

	let isEditing   = $state(!data.user?.name || data.user.name.length < 2);
	let showLevels    = $state(false);
	let showMessages  = $state(false);
	let showMyInfo    = $state(false);
	let messages = $state([
		{ from: 'מערכת', text: 'ברוך הבא לקהילה! השלם את הפרופיל שלך.', time: 'לפני 2 ימים', read: false },
		{ from: 'מנהל', text: 'הצטרפות שלך אושרה. כעת תוכל לפרסם תוכן.', time: 'לפני 5 ימים', read: false },
		{ from: 'מערכת', text: 'יש עדכון חדש זמין בפרופיל שלך.', time: 'לפני שבוע', read: false },
	]);
	let unreadCount = $derived(messages.filter(m => !m.read).length);
	let secTipShow    = $state(false);
	let secTipX       = $state(0);
	let secTipY       = $state(0);
	let secTipIsOpen  = $state(false);
	function handleSecMouseMove(e: MouseEvent, isOpen: boolean) { secTipX = e.clientX; secTipY = e.clientY; secTipIsOpen = isOpen; }
	let levelTipX     = $state(0);
	let levelTipY     = $state(0);
	function handleLevelMouseMove(e: MouseEvent) { levelTipX = e.clientX; levelTipY = e.clientY; }
	function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }
	function scrollToMessages() {
		document.getElementById('sec-messages')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
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
	const birthParts  = (data.user?.birth_date ?? '').split('-');
	let birthYear     = $state(birthParts[0] ?? '');
	let birthMonth    = $state(birthParts[1] ? String(parseInt(birthParts[1])) : '');
	let birthDay      = $state(birthParts[2] ? String(parseInt(birthParts[2])) : '');
	let notifications  = $state(data.user?.notifications !== 0);
	let termsAccepted  = $state(false);
	let showTermsError = $state(false);

	// ===== חיתוך תמונה =====
	const CROP_VP    = 280;
	let showCrop     = $state(false);
	let cropSrc      = $state('');
	let cropScale    = $state(1);
	let cropMinScale = $state(0.5);
	let cropOffsetX  = $state(0);
	let cropOffsetY  = $state(0);
	let cropNatW     = $state(0);
	let cropNatH     = $state(0);

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

	// דרגה 1 = צופה (נרשם בלבד)
	// דרגה 2 = משתמש (מילא את כל שדות הפרופיל)
	let userLevel = $derived(
		(name && email && nickname && phone && city && neighborhood && gender && family_status)
			? 2 : 1
	);

	// טיפ למעגל — המפתח של השדה הבא שלא מולא
	const ringTipKeys = [
		'tip_avatar', 'tip_name', 'tip_email', 'tip_nickname',
		'tip_phone', 'tip_city', 'tip_neighborhood', 'tip_gender',
		'tip_business', 'tip_family_status', 'tip_birth_date', 'tip_notifications',
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
			cropSrc     = ev.target?.result as string;
			cropOffsetX = 0;
			cropOffsetY = 0;
			showCrop    = true;
		};
		reader.readAsDataURL(file);
	}

	function onCropLoad(e: Event) {
		const img    = e.target as HTMLImageElement;
		cropNatW     = img.naturalWidth;
		cropNatH     = img.naturalHeight;
		const minS   = Math.max(CROP_VP / cropNatW, CROP_VP / cropNatH);
		cropMinScale = minS;
		cropScale    = minS;
		cropOffsetX  = 0;
		cropOffsetY  = 0;
	}

	function cropInteraction(node: HTMLElement) {
		let dragging = false, sx = 0, sy = 0, sox = 0, soy = 0;

		function wheel(ev: WheelEvent) {
			ev.preventDefault();
			const f = ev.deltaY > 0 ? 0.92 : 1.09;
			cropScale = Math.max(cropMinScale, Math.min(cropScale * f, cropMinScale * 6));
		}
		function mdown(ev: MouseEvent) {
			dragging = true; sx = ev.clientX; sy = ev.clientY; sox = cropOffsetX; soy = cropOffsetY;
		}
		function mmove(ev: MouseEvent) {
			if (!dragging) return;
			cropOffsetX = sox + ev.clientX - sx;
			cropOffsetY = soy + ev.clientY - sy;
		}
		function mup() { dragging = false; }
		function tstart(ev: TouchEvent) {
			ev.preventDefault();
			dragging = true; sx = ev.touches[0].clientX; sy = ev.touches[0].clientY;
			sox = cropOffsetX; soy = cropOffsetY;
		}
		function tmove(ev: TouchEvent) {
			ev.preventDefault();
			if (!dragging) return;
			cropOffsetX = sox + ev.touches[0].clientX - sx;
			cropOffsetY = soy + ev.touches[0].clientY - sy;
		}
		function tend() { dragging = false; }

		node.addEventListener('wheel',      wheel,  { passive: false });
		node.addEventListener('mousedown',  mdown);
		node.addEventListener('mousemove',  mmove);
		node.addEventListener('mouseup',    mup);
		node.addEventListener('mouseleave', mup);
		node.addEventListener('touchstart', tstart, { passive: false });
		node.addEventListener('touchmove',  tmove,  { passive: false });
		node.addEventListener('touchend',   tend);

		return {
			destroy() {
				node.removeEventListener('wheel',      wheel);
				node.removeEventListener('mousedown',  mdown);
				node.removeEventListener('mousemove',  mmove);
				node.removeEventListener('mouseup',    mup);
				node.removeEventListener('mouseleave', mup);
				node.removeEventListener('touchstart', tstart);
				node.removeEventListener('touchmove',  tmove);
				node.removeEventListener('touchend',   tend);
			}
		};
	}

	async function confirmCrop() {
		const OUT    = 400;
		const canvas = document.createElement('canvas');
		canvas.width  = OUT;
		canvas.height = OUT;
		const ctx = canvas.getContext('2d')!;

		ctx.beginPath();
		ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
		ctx.clip();

		const img = new Image();
		img.src = cropSrc;
		await new Promise<void>(r => { if (img.complete) r(); else img.onload = () => r(); });

		const factor  = OUT / CROP_VP;
		const scaledW = cropNatW * cropScale;
		const scaledH = cropNatH * cropScale;
		const drawX   = (CROP_VP / 2 + cropOffsetX - scaledW / 2) * factor;
		const drawY   = (CROP_VP / 2 + cropOffsetY - scaledH / 2) * factor;

		ctx.drawImage(img, drawX, drawY, scaledW * factor, scaledH * factor);

		const result  = canvas.toDataURL('image/jpeg', 0.92);
		avatarPreview = result;
		avatarBase64  = result;
		showCrop      = false;
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
	<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 shadow-xl mb-6">
		<!-- כותרת + כפתור התנתקות -->
		<div class="flex items-center justify-between mb-5">
			<div class="flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-yellow-500 text-black text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
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
		<div class="flex items-stretch justify-between gap-5">

			<!-- אווטר + מעגל מילוי -->
			<div class="flex-shrink-0 flex flex-col items-center justify-between min-h-[120px]">
				<div class="relative cursor-pointer"
					onmouseenter={() => (showRingTooltip = true)}
					onmouseleave={() => (showRingTooltip = false)}
					onmousemove={handleRingMouseMove}
					role="img"
					aria-label={tFn(nextTipKey)}
				>
					{#if avatarPreview}
						<img src={avatarPreview} alt={tFn("profile_photo")}
							class="w-24 h-24 rounded-full border-2 border-purple-500/40 shadow-xl object-cover" />
					{:else}
						<div class="w-24 h-24 rounded-full bg-gray-700
						            flex items-center justify-center border-2 border-gray-600 shadow-xl">
							<svg viewBox="0 0 24 24" class="w-12 h-12 text-gray-400" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
									<circle cx="12" cy="8" r="4"/>
									<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
								</svg>
						</div>
					{/if}

					<!-- עיגול הודעות — שמאל מטה -->
					<button onclick={scrollToMessages}
					class="absolute -bottom-1 -left-1 px-2 h-[22px]
					       bg-orange-500 border-2 border-[#0f172a] rounded-full
					       flex items-center justify-center cursor-pointer
					       text-white text-[11px] font-black leading-none shadow-lg
					       hover:bg-orange-400 transition-colors whitespace-nowrap">
					{unreadCount} הודעות
				</button>
				</div>

				<!-- תווית מתחת לתמונה -->
				<button onclick={scrollToMessages} class="text-xs text-orange-400 font-bold hover:text-orange-300 transition-colors cursor-pointer bg-transparent border-0 p-0">הודעות אישיות</button>
			</div>


			<!-- הארנק שלי — ממורכז -->
			<a href="/receipts" class="flex-shrink-0 flex flex-col items-center justify-between cursor-pointer group select-none no-underline">
				<div class="w-52 group-hover:scale-105 transition-transform duration-200 -mt-8" style="-webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 80%); mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 80%);">
					<img src="/images/wallet.png" alt="המזומן שלי" class="w-full h-auto block" />
				</div>
				<span class="text-xs text-gray-300 font-bold">היתרה שלי: <span class="text-green-400">{(data.user as {balance?:number})?.balance ?? 0}₪</span></span>
			</a>

			<div class="min-w-0 flex flex-col justify-between">
				<div class="flex flex-col gap-0.5">
					<h1 class="text-2xl font-black text-white truncate">
						{data.user?.nickname || data.user?.name || ''}
					</h1>
					{#if data.user?.email}
						<p class="text-gray-400 text-sm">{data.user.email}</p>
					{/if}
					{#if neighborhood || city}
						<p class="text-purple-400 text-sm mb-16">
							📍 {[neighborhood, city].filter(Boolean).join(', ')}
						</p>
					{/if}
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-white/50 text-xs font-bold">דרגה:</span>
					{#if userLevel >= 2}
						<span class="text-emerald-400 text-xs font-black">
							משתמש
						</span>
					{:else}
						<span class="text-gray-400 text-xs font-black">
							צופה
						</span>
					{/if}
				</div>
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

		</div>
	</div>

	<!-- ===== קומה 2: פרטי פרופיל ===== -->
	<div class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 mb-6 shadow-xl overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-16 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/4 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/10">

		<div
			class="flex items-center justify-between cursor-pointer select-none {isEditing ? 'mb-6' : ''}"
			onclick={() => { if (isEditing) { isEditing = false; saveSuccess = false; } else { isEditing = true; } }}
			onmouseenter={() => { secTipShow = true; secTipIsOpen = isEditing; }}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, isEditing)}
			role="button"
			tabindex={0}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (isEditing) { isEditing = false; saveSuccess = false; } else { isEditing = true; } } }}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-yellow-500 text-black text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
				{tFn("section_profile_details")}
			</h2>
			<div class="flex items-center gap-2">
				<span class="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full font-bold">{profileCompletion}% הושלם</span>
				<svg class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {isEditing ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
			</div>
		</div>

		{#if saveSuccess}
			<p class="text-green-400 text-sm font-bold mt-2 text-center">{tFn("profile_updated")}</p>
		{/if}

		{#if isEditing}

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
						// סנכרן שכונה ועיר לstate המשותף → מעדכן דף הבית + מפה
						if (neighborhood && city) {
							neighborhoodState.select(neighborhood, city);
						}
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
							<div class="w-20 h-20 rounded-full bg-gray-700
							            flex items-center justify-center border-4 border-gray-600">
								<svg viewBox="0 0 24 24" class="w-12 h-12 text-gray-400" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
								<circle cx="12" cy="8" r="4"/>
								<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
							</svg>
							</div>
						{/if}
					</div>
					<div>
						<p class="text-xs text-gray-400 font-bold mb-2">{tFn("profile_photo")}</p>
						<div class="flex flex-wrap gap-2">
							<label class="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10
							              hover:border-purple-500/40 rounded-xl px-4 py-2 text-sm text-gray-300
							              transition-all inline-block">
								{tFn("choose_photo")}
								<input type="file" accept="image/*" class="hidden" onchange={handleImageChange} />
							</label>
							{#if data.oauth_image && (data.user?.provider === 'google' || data.user?.provider === 'facebook')}
								<button type="button"
									onclick={() => { avatarPreview = data.oauth_image; avatarBase64 = data.oauth_image ?? ''; }}
									class="cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-400/60 rounded-xl px-4 py-2 text-sm text-blue-300 transition-all inline-flex items-center gap-1.5"
								>
									{#if data.user?.provider === 'google'}
										<img src="https://www.google.com/favicon.ico" class="w-3.5 h-3.5" alt="G" />
										קח מגוגל
									{:else}
										<img src="https://www.facebook.com/favicon.ico" class="w-3.5 h-3.5" alt="F" />
										קח מפייסבוק
									{/if}
								</button>
							{/if}
						</div>
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

				<!-- עיר + שכונה — תמיד ביחד -->
				<div class="md:col-span-2 grid grid-cols-2 gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3">
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
				</div>

				<!-- עסק -->
				<div class="md:col-span-2">
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

				<!-- תאריך לידה -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{tFn("birth_date_label")}</label>
					{#if isEditing}
						<div class="flex gap-2">
							<select name="birth_day" bind:value={birthDay}
								class="flex-1 bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-3 text-white text-sm outline-none appearance-none text-center">
								<option value="">{tFn("birth_day")}</option>
								{#each Array.from({length: 31}, (_, i) => i + 1) as d}
									<option value={String(d)}>{d}</option>
								{/each}
							</select>
							<select name="birth_month" bind:value={birthMonth}
								class="flex-[2] bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-3 text-white text-sm outline-none appearance-none text-center">
								<option value="">{tFn("birth_month")}</option>
								{#each tFn("months_list").split(",") as month, i}
									<option value={String(i + 1)}>{month}</option>
								{/each}
							</select>
							<select name="birth_year" bind:value={birthYear}
								class="flex-[1.5] bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-3 text-white text-sm outline-none appearance-none text-center">
								<option value="">{tFn("birth_year")}</option>
								{#each Array.from({length: 100}, (_, i) => new Date().getFullYear() - i) as y}
									<option value={String(y)}>{y}</option>
								{/each}
							</select>
						</div>
					{:else}
						<p class="text-white font-medium py-3 px-1">{birthDay && birthMonth && birthYear ? `${birthDay} / ${tFn("months_list").split(",")[parseInt(birthMonth)-1]} / ${birthYear}` : '—'}</p>
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
				<div class="mt-4 flex flex-col gap-3 items-end">
					<label class="flex items-center gap-3 cursor-pointer">
						<input type="checkbox" bind:checked={termsAccepted}
							onchange={() => { if (termsAccepted) showTermsError = false; }}
							class="w-4 h-4 accent-purple-500 cursor-pointer flex-shrink-0" />
						<span class="text-sm text-gray-300">
							{tFn("terms_agree_prefix")}
							<a href="/terms" target="_blank" class="text-purple-400 hover:underline">{tFn("terms")}</a>
							ו<a href="/privacy" target="_blank" class="text-purple-400 hover:underline">{tFn("privacy")}</a>
							{tFn("terms_agree_suffix")}
						</span>
					</label>
					{#if showTermsError}
						<p class="text-red-400 text-xs font-bold">יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני השמירה</p>
					{/if}
					{#if form?.error}
						<p class="text-red-400 text-xs font-bold">{form.error}</p>
					{/if}
					<button type="submit"
						onclick={(e) => { if (!termsAccepted) { e.preventDefault(); showTermsError = true; } }}
						class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
						       text-white font-black px-8 py-3 rounded-2xl shadow-xl text-sm transition-all hover:-translate-y-0.5
						       cursor-pointer"
					>
						{tFn("save_changes")}
					</button>
				</div>
			{/if}
		</form>
		{/if}
	</div>

	<!-- ===== קומה 3: דרגה והרשאות ===== -->
	<div class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 shadow-xl mb-6 overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-16 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/4 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/10 group/sec3">
		<div
			class="relative flex items-center justify-between cursor-pointer select-none transition-all
			       {showLevels ? 'mb-5' : ''}"
			onclick={() => { if (showLevels) { showLevels = false; } else { showLevels = true; } }}
			onmouseenter={() => { secTipShow = true; secTipIsOpen = showMyInfo; }}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, showMyInfo)}
			role="button"
			tabindex={0}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') showLevels = !showLevels; }}
		>
			<h2 class="relative text-xl font-black text-white flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-yellow-500 text-black text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
				דרגה והרשאות
			</h2>
			<!-- סיכום דרגה נוכחית -->
			<div class="flex items-center gap-2">
				{#if userLevel >= 2}
					<span class="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full font-bold">דרגה נוכחית — משתמש</span>
				{:else}
					<span class="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">דרגה נוכחית — צופה</span>
				{/if}
				<svg class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {showLevels ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
			</div>
		</div>

		{#if showLevels}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">

			<!-- דרגה 1: צופה -->
			<div class="relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all
			            {userLevel >= 1
			              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
			              : 'border-white/10 bg-white/3 opacity-60'}">
				{#if userLevel >= 1}
					<div class="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-emerald-500 border-[3px] border-[#0f172a] flex items-center justify-center shadow-lg shadow-emerald-500/50 z-10">
						<span class="text-white font-black text-lg leading-none">✓</span>
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
					             {userLevel >= 1 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-400'}">1</span>
					<span class="font-black text-white text-base">צופה</span>
					{#if userLevel === 1}
						<span class="mr-auto text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">הדרגה שלך</span>
					{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center gap-1.5">
						<span class="text-emerald-400 text-sm">✓</span>
						<span class="text-gray-300 text-xs font-bold">כניסה וצפיה באתר</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-red-400 text-sm">✕</span>
						<span class="text-gray-200 text-xs">משתתף במשאלי עם שכונתיים</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-red-400 text-sm">✕</span>
						<span class="text-gray-200 text-xs">העלאת תוכן</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-red-400 text-sm">✕</span>
						<span class="text-gray-200 text-xs">ניהול תוכן</span>
					</div>
				</div>
			</div>

			<!-- דרגה 2: משתמש -->
			<div class="relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all
			            {userLevel >= 2
			              ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
			              : 'border-white/10 bg-white/3 opacity-60'}">
				{#if userLevel >= 2}
					<div class="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-purple-500 border-[3px] border-[#0f172a] flex items-center justify-center shadow-lg shadow-purple-500/50 z-10">
						<span class="text-white font-black text-lg leading-none">✓</span>
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
					             {userLevel >= 2 ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400'}">2</span>
					<span class="font-black text-white text-base">משתמש</span>
					{#if userLevel === 2}
						<span class="mr-auto text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">הדרגה שלך</span>
					{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center gap-1.5">
						<span class="text-purple-400 text-sm">✓</span>
						<span class="text-gray-300 text-xs font-bold">כניסה וצפיה באתר</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-purple-400 text-sm">✓</span>
						<span class="text-gray-300 text-xs font-bold">העלאת תוכן</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-purple-400 text-sm">✓</span>
						<span class="text-gray-300 text-xs font-bold">משתתף במשאלי עם שכונתיים</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-red-400 text-sm">✕</span>
						<span class="text-gray-200 text-xs">ניהול תוכן</span>
					</div>
				</div>
				{#if userLevel < 2}
					<p class="text-yellow-500/70 text-[11px]">נדרש: מילוי כל שדות הפרופיל</p>
				{/if}
			</div>

			<!-- דרגה 3: רכז שכונה -->
			<div class="relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all
			            {userLevel >= 3
			              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
			              : 'border-white/10 bg-white/3 opacity-60'}">
				{#if userLevel >= 3}
					<div class="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-blue-500 border-[3px] border-[#0f172a] flex items-center justify-center shadow-lg shadow-blue-500/50 z-10">
						<span class="text-white font-black text-lg leading-none">✓</span>
					</div>
				{/if}
				<div class="flex items-center gap-2">
					<span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
					             {userLevel >= 3 ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'}">3</span>
					<span class="font-black text-white text-base">רכז שכונה</span>
					{#if userLevel === 3}
						<span class="mr-auto text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">הדרגה שלך</span>
					{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center gap-1.5">
						<span class="text-blue-400 text-sm">✓</span>
						<span class="text-gray-300 text-xs font-bold">כניסה וצפיה באתר</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-blue-400 text-sm">✓</span>
						<span class="text-gray-300 text-xs font-bold">העלאת תוכן</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-blue-400 text-sm">✓</span>
						<span class="text-gray-300 text-xs font-bold">משתתף במשאלי עם שכונתיים</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-blue-400 text-sm">✓</span>
						<span class="text-gray-300 text-xs font-bold">ניהול תוכן</span>
					</div>
				</div>
			</div>

		</div>
		{/if}
	</div>

	<!-- ===== קומה 4: הודעות אישיות ===== -->
	<div id="sec-messages" class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 shadow-xl mb-6 overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-16 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/4 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/10">
		<div
			class="relative flex items-center justify-between cursor-pointer select-none {showMessages ? 'mb-6' : ''}"
			onclick={() => { if (showMessages) { showMessages = false; } else { showMessages = true; } }}
			role="button" tabindex={0}
			onmouseenter={() => { secTipShow = true; secTipIsOpen = showMessages; }}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, showMessages)}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (showMessages) { showMessages = false; } else { showMessages = true; } } }}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-yellow-500 text-black text-xs font-black flex items-center justify-center flex-shrink-0">4</span>
				הודעות אישיות
			</h2>
			<div class="flex items-center gap-2">
				<span class="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full font-bold">{unreadCount} הודעות שלא נקראו</span>
				<svg class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {showMessages ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
			</div>
		</div>

		{#if showMessages}
		<div class="flex flex-col gap-3">
			{#each messages as msg}
				<div class="flex items-start gap-3 bg-white/5 rounded-2xl border {msg.read ? 'border-white/5' : 'border-orange-500/20'} px-4 py-3 transition-all hover:border-white/15">
					<div class="w-2 h-2 rounded-full {msg.read ? 'bg-white/10' : 'bg-orange-500'} mt-1.5 flex-shrink-0"></div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between gap-2 mb-0.5">
							<span class="text-white text-xs font-black">{msg.from}</span>
							<span class="text-gray-600 text-[10px] flex-shrink-0">{msg.time}</span>
						</div>
						<p class="text-gray-300 text-xs">{msg.text}</p>
					</div>
				</div>
			{/each}
		</div>
		{/if}
	</div>
	<!-- ===== קומה 5: המידע שלי ===== -->
	<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 shadow-xl">
		<div
			class="flex items-center justify-between cursor-pointer select-none {showMyInfo ? 'mb-6' : ''}"
			onclick={() => { if (showMyInfo) { showMyInfo = false; } else { showMyInfo = true; } }}
			onmouseenter={() => { secTipShow = true; secTipIsOpen = showMyInfo; }}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, showMyInfo)}
			role="button" tabindex={0}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (showMyInfo) scrollToTop(); else showMyInfo = true; } }}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span class="w-6 h-6 rounded-full bg-yellow-500 text-black text-xs font-black flex items-center justify-center flex-shrink-0">5</span>
				{tFn("section_my_info")} והמלצות מערכת
				{#if data.items.length > 0}
					<span class="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
						{data.items.length}
					</span>
				{/if}
			</h2>
			<svg class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {showMyInfo ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
		</div>

		{#if showMyInfo}
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
		{/if}
	</div>


</div>

{#if secTipShow}
	<div class="fixed z-[9999] pointer-events-none"
		style="left: {secTipX + 14}px; top: {secTipY + 14}px;">
		<div class="bg-gray-900/95 backdrop-blur-sm
		            text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl
		            border border-white/10 whitespace-nowrap">
			{secTipIsOpen ? "גלול מעלה" : "לפרטים — גלול מטה"}
		</div>
	</div>
{/if}
