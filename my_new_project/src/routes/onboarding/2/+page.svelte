<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { t, locale } from 'svelte-i18n';

	let { data } = $props();

	let _loc = $state(get(locale));
	$effect(() => locale.subscribe((l) => (_loc = l)));
	const tFn = (k: string, values?: Record<string, string | number>) => {
		void _loc;
		return get(t)(k, values ? { values } : undefined);
	};

	let familyStatus = $state(untrack(() => data.profile.family_status) ?? '');
	let birthDate = $state(untrack(() => data.profile.birth_date) ?? '');

	let saving = $state(false);
	let errorMsg = $state('');

	const FAMILY_OPTIONS = [
		{ v: 'single', k: 'onboarding.fs_single' },
		{ v: 'married', k: 'onboarding.fs_married' },
		{ v: 'divorced', k: 'onboarding.fs_divorced' },
		{ v: 'widowed', k: 'onboarding.fs_widowed' },
	];

	async function saveAndNext() {
		if (saving) return;
		const payload: Record<string, unknown> = {};
		if (familyStatus.trim()) payload.family_status = familyStatus.trim();
		if (birthDate.trim()) payload.birth_date = birthDate.trim();
		if (Object.keys(payload).length === 0) { goto('/onboarding/3'); return; }
		saving = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/onboarding', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const j = await res.json().catch(() => ({}));
			if (res.ok && j?.ok) goto('/onboarding/3');
			else errorMsg = tFn('onboarding.err_save');
		} catch {
			errorMsg = tFn('onboarding.err_save');
		} finally {
			saving = false;
		}
	}
</script>

<div>
	<h2 class="text-white font-bold text-xl mb-1">{tFn('onboarding.s2_title')}</h2>
	<p class="text-gray-400 text-sm mb-1 leading-relaxed">{tFn('onboarding.s2_intro')}</p>
	<p class="text-white/40 text-xs mb-5">{tFn('onboarding.optional_hint')}</p>

	<!-- מצב משפחתי -->
	<div class="mb-3">
		<label for="ob-family" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.family_status')}</label>
		<select id="ob-family" bind:value={familyStatus}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition">
			<option value="">{tFn('onboarding.choose_family')}</option>
			{#each FAMILY_OPTIONS as o}<option value={o.v}>{tFn(o.k)}</option>{/each}
		</select>
	</div>

	<!-- תאריך לידה -->
	<div class="mb-2">
		<label for="ob-birth" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.birth_date')}</label>
		<input id="ob-birth" type="date" bind:value={birthDate}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition" />
	</div>

	{#if errorMsg}
		<p class="text-red-400 text-sm mt-2">{errorMsg}</p>
	{/if}

	<div class="flex gap-3 mt-6">
		<a href="/onboarding/3"
			class="px-5 py-3 rounded-2xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition text-sm font-semibold">
			{tFn('onboarding.skip')}
		</a>
		<button type="button" onclick={saveAndNext} disabled={saving}
			class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold shadow-lg hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed">
			{saving ? tFn('onboarding.saving') : tFn('onboarding.next')}
		</button>
	</div>
</div>
