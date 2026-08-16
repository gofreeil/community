<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { t, locale } from 'svelte-i18n';
	import { citiesAndNeighborhoods, effectiveNeighborhoods } from '$lib/neighborhoodsData';
	import NeighborhoodSelect from '$lib/components/NeighborhoodSelect.svelte';

	let { data } = $props();

	let _loc = $state(get(locale));
	$effect(() => locale.subscribe((l) => (_loc = l)));
	const tFn = (k: string, values?: Record<string, string | number>) => {
		void _loc;
		return get(t)(k, values ? { values } : undefined);
	};

	// ערכי פתיחה מהפרופיל הקיים (רובם ריקים למשתמש חדש); untrack — מכאן בשליטת הגולש
	let city = $state(untrack(() => data.profile.city) ?? '');
	let street = $state(untrack(() => data.profile.street) ?? '');
	let neighborhood = $state(untrack(() => data.profile.neighborhood) ?? '');
	let address = $state(untrack(() => data.profile.address) ?? '');
	let phone = $state(untrack(() => data.profile.phone) ?? '');
	let status = $state(untrack(() => (data.profile.status && data.profile.status !== 'active' ? data.profile.status : '')));
	let avatarPreview = $state<string | null>(untrack(() => data.avatar));
	let avatarDataUrl = $state<string | null>(null); // חדש שהועלה בשלב הזה

	let saving = $state(false);
	let errorMsg = $state('');

	const cityList = Object.keys(citiesAndNeighborhoods).sort((a, b) => a.localeCompare(b, 'he'));
	const hoods = $derived.by(() => {
		if (!city) return [] as string[];
		const list = effectiveNeighborhoods(city, []);
		return list.includes('מרכז') ? list : ['מרכז', ...list];
	});
	// החלפת עיר שאין בה את השכונה הנבחרת → איפוס
	$effect(() => {
		if (city && neighborhood && !hoods.includes(neighborhood)) neighborhood = '';
	});

	// דרגה: כתובת מלאה (עיר + רחוב + שכונה + כתובת) מעלה מ"צופה" ל"משתמש"
	const isUser = $derived(!!(city.trim() && street.trim() && neighborhood.trim() && address.trim()));

	// העלאת תמונה: הקטנה ל-256×256 (cover) → dataURL, בלי ספרייה חיצונית
	async function onFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			const dataUrl = await new Promise<string>((res, rej) => {
				const r = new FileReader();
				r.onload = () => res(r.result as string);
				r.onerror = rej;
				r.readAsDataURL(file);
			});
			const img = new Image();
			img.src = dataUrl;
			await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
			const size = 256;
			const canvas = document.createElement('canvas');
			canvas.width = size; canvas.height = size;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			const scale = Math.max(size / img.width, size / img.height);
			const w = img.width * scale, h = img.height * scale;
			ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
			const out = canvas.toDataURL('image/jpeg', 0.85);
			avatarDataUrl = out;
			avatarPreview = out;
		} catch {
			/* קובץ פגום — מתעלמים */
		}
	}

	function buildPayload() {
		const p: Record<string, unknown> = {};
		if (city.trim()) p.city = city.trim();
		if (street.trim()) p.street = street.trim();
		if (neighborhood.trim()) p.neighborhood = neighborhood.trim();
		if (address.trim()) p.address = address.trim();
		if (phone.trim()) p.phone = phone.trim();
		if (status.trim()) p.status = status.trim();
		if (avatarDataUrl) p.avatar_url = avatarDataUrl;
		return p;
	}

	async function saveAndNext() {
		if (saving) return;
		const payload = buildPayload();
		if (Object.keys(payload).length === 0) { goto('/onboarding/2'); return; }
		saving = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/onboarding', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const j = await res.json().catch(() => ({}));
			if (res.ok && j?.ok) goto('/onboarding/2');
			else errorMsg = j?.error === 'invalid_phone' ? tFn('phone_hint') : tFn('onboarding.err_save');
		} catch {
			errorMsg = tFn('onboarding.err_save');
		} finally {
			saving = false;
		}
	}
</script>

<div>
	<h2 class="text-white font-bold text-xl mb-1">{tFn('onboarding.s1_title')}</h2>
	<p class="text-gray-400 text-sm mb-1 leading-relaxed">{tFn('onboarding.s1_intro')}</p>
	<p class="text-white/40 text-xs mb-4">{tFn('onboarding.optional_hint')}</p>

	<!-- דרגה נוכחית: צופה → משתמש אחרי כתובת מלאה -->
	<div class="rounded-2xl border p-3 mb-2 flex items-center gap-3 transition-colors {isUser ? 'border-green-500/40 bg-green-500/10' : 'border-white/10 bg-white/5'}">
		<span class="text-2xl flex-shrink-0">{isUser ? '🏘️' : '👀'}</span>
		<div class="flex-1 min-w-0">
			<p class="text-[11px] text-white/45">{tFn('onboarding.level_label')}</p>
			<p class="font-bold leading-tight {isUser ? 'text-green-300' : 'text-white'}">{tFn(isUser ? 'onboarding.level_user' : 'onboarding.level_viewer')}</p>
			<p class="text-[11px] text-white/45">{tFn(isUser ? 'onboarding.level_user_desc' : 'onboarding.level_viewer_desc')}</p>
		</div>
	</div>
	{#if isUser}
		<p class="text-green-300 text-sm font-semibold bg-green-500/10 border border-green-500/25 rounded-xl px-3 py-2 mb-5">{tFn('onboarding.level_up_msg')}</p>
	{:else}
		<p class="text-white/45 text-xs mb-5">{tFn('onboarding.level_hint_viewer')}</p>
	{/if}

	<!-- תמונת פרופיל -->
	<div class="flex items-center gap-4 mb-4">
		<div class="h-16 w-16 rounded-full overflow-hidden bg-white/5 border border-white/15 flex items-center justify-center flex-shrink-0">
			{#if avatarPreview}
				<img src={avatarPreview} alt="" class="w-full h-full object-cover" />
			{:else}
				<span class="text-2xl">👤</span>
			{/if}
		</div>
		<div>
			<span class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.photo')}</span>
			<label class="inline-block px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white/80 text-sm font-semibold hover:bg-white/10 transition cursor-pointer">
				{avatarPreview ? tFn('onboarding.photo_change') : tFn('onboarding.photo_choose')}
				<input type="file" accept="image/*" class="hidden" onchange={onFile} />
			</label>
		</div>
	</div>

	<!-- עיר -->
	<div class="mb-3">
		<label for="ob-city" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.city')}</label>
		<select id="ob-city" bind:value={city}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition">
			<option value="">{tFn('onboarding.choose_city')}</option>
			{#each cityList as c}<option value={c}>{c}</option>{/each}
		</select>
	</div>

	<!-- רחוב -->
	<div class="mb-3">
		<label for="ob-street" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.street')}</label>
		<input id="ob-street" type="text" bind:value={street} placeholder={tFn('onboarding.street_ph')}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
	</div>

	<!-- שכונה -->
	<div class="mb-3">
		<label for="ob-hood" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.neighborhood')}</label>
		<NeighborhoodSelect
			id="ob-hood"
			bind:value={neighborhood}
			neighborhoods={hoods}
			disabled={!city}
			buttonClass="w-full text-right bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition disabled:opacity-50 flex items-center justify-between gap-2 cursor-pointer"
		/>
	</div>

	<!-- כתובת (מספר בית) -->
	<div class="mb-3">
		<label for="ob-address" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.address')}</label>
		<input id="ob-address" type="text" bind:value={address} placeholder={tFn('onboarding.address_ph')}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
	</div>

	<!-- טלפון -->
	<div class="mb-3">
		<label for="ob-phone" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.phone')}</label>
		<input id="ob-phone" type="tel" inputmode="tel" bind:value={phone} placeholder={tFn('onboarding.phone_ph')}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
	</div>

	<!-- סטטוס -->
	<div class="mb-2">
		<label for="ob-status" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.status')}</label>
		<input id="ob-status" type="text" bind:value={status} placeholder={tFn('onboarding.status_ph')}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
	</div>

	{#if errorMsg}
		<p class="text-red-400 text-sm mt-2">{errorMsg}</p>
	{/if}

	<!-- כפתורים -->
	<div class="flex gap-3 mt-6">
		<a href="/onboarding/2"
			class="px-5 py-3 rounded-2xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition text-sm font-semibold">
			{tFn('onboarding.skip')}
		</a>
		<button type="button" onclick={saveAndNext} disabled={saving}
			class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold shadow-lg hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed">
			{saving ? tFn('onboarding.saving') : tFn('onboarding.next')}
		</button>
	</div>
</div>
