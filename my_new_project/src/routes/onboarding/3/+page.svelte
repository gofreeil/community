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

	// שאלת ביטחון מוכנה (רשימה) + תשובה
	const presetQuestions = $derived(tFn('onboarding.sec_q_options').split(','));
	let securityQuestion = $state(untrack(() => data.profile.security_question) ?? '');
	let securityAnswer = $state('');
	// שאלה נוספת שהמשתמש כותב בעצמו + תשובה
	let customQuestion = $state('');
	let customAnswer = $state('');

	// חובה: אישור תנאי שימוש. רשות: הסכמה להתראות.
	let termsAccepted = $state(false);
	let notifications = $state(true);

	let saving = $state(false);
	let errorMsg = $state('');
	let showTermsError = $state(false);

	async function finish() {
		if (saving) return;
		if (!termsAccepted) { showTermsError = true; return; }
		saving = true;
		errorMsg = '';

		const payload: Record<string, unknown> = { notifications };
		// שאלה מוכנה נשמרת רק עם תשובה
		if (securityQuestion.trim() && securityAnswer.trim()) {
			payload.security_question = securityQuestion.trim();
			payload.security_answer = securityAnswer.trim();
		}
		// שאלה שהמשתמש כתב בעצמו נשמרת רק כשגם השאלה וגם התשובה מולאו
		if (customQuestion.trim() && customAnswer.trim()) {
			payload.security_question_2 = customQuestion.trim();
			payload.security_answer_2 = customAnswer.trim();
		}

		try {
			const res = await fetch('/api/onboarding', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const j = await res.json().catch(() => ({}));
			if (res.ok && j?.ok) {
				// אישור התנאים נשמר בצד-לקוח (כמו בדף הפרופיל)
				try { localStorage.setItem('terms_accepted', '1'); } catch { /* noop */ }
				goto('/profile');
			} else {
				errorMsg = tFn('onboarding.err_save');
			}
		} catch {
			errorMsg = tFn('onboarding.err_save');
		} finally {
			saving = false;
		}
	}
</script>

<div>
	<h2 class="text-white font-bold text-xl mb-1">{tFn('onboarding.s3_title')}</h2>
	<p class="text-gray-400 text-sm mb-5 leading-relaxed">{tFn('onboarding.s3_intro')}</p>

	<!-- שאלת ביטחון מוכנה -->
	<div class="mb-3">
		<label for="ob-secq" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.sec_q')}</label>
		<select id="ob-secq" bind:value={securityQuestion}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition">
			<option value="">{tFn('onboarding.sec_q_choose')}</option>
			{#each presetQuestions as q}<option value={q}>{q}</option>{/each}
		</select>
	</div>
	{#if securityQuestion}
		<div class="mb-4">
			<label for="ob-seca" class="block text-sm font-medium text-gray-300 mb-1">{tFn('onboarding.sec_a')}</label>
			<input id="ob-seca" type="text" bind:value={securityAnswer} placeholder={tFn('onboarding.sec_a_ph')}
				class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
		</div>
	{/if}

	<!-- שאלה נוספת שהמשתמש כותב בעצמו -->
	<div class="rounded-xl border border-white/10 bg-white/5 p-3 mb-4">
		<p class="text-white/70 text-sm font-semibold mb-2">{tFn('onboarding.custom_title')}</p>
		<input type="text" bind:value={customQuestion} placeholder={tFn('onboarding.custom_q_ph')}
			class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition mb-2" />
		{#if customQuestion.trim()}
			<input type="text" bind:value={customAnswer} placeholder={tFn('onboarding.custom_a')}
				class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
		{/if}
	</div>

	<!-- אישור תנאי שימוש (חובה) -->
	<div class="rounded-xl border {showTermsError && !termsAccepted ? 'border-red-500/50 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'} p-3 mb-3">
		<label class="flex items-start gap-2.5 cursor-pointer">
			<input type="checkbox" bind:checked={termsAccepted} oninput={() => (showTermsError = false)}
				class="mt-0.5 w-5 h-5 flex-shrink-0 accent-green-600" />
			<span class="text-white/80 text-sm leading-relaxed">
				{tFn('onboarding.terms_label')}
				<a href="/about/legal" target="_blank" class="text-blue-400 hover:text-blue-300 underline">{tFn('onboarding.terms_link')}</a>
			</span>
		</label>
		{#if showTermsError && !termsAccepted}
			<p class="text-red-400 text-xs mt-2">{tFn('onboarding.terms_error')}</p>
		{/if}
	</div>

	<!-- הסכמה להתראות (רשות) -->
	<label class="flex items-start gap-2.5 cursor-pointer mb-2 px-1">
		<input type="checkbox" bind:checked={notifications} class="mt-0.5 w-5 h-5 flex-shrink-0 accent-green-600" />
		<span class="text-white/70 text-sm leading-relaxed">{tFn('onboarding.notif_label')}</span>
	</label>

	{#if errorMsg}
		<p class="text-red-400 text-sm mt-2">{errorMsg}</p>
	{/if}

	<div class="flex gap-3 mt-6">
		<a href="/onboarding/2"
			class="px-5 py-3 rounded-2xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition text-sm font-semibold">
			←
		</a>
		<button type="button" onclick={finish} disabled={saving || !termsAccepted}
			class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold shadow-lg hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed">
			{saving ? tFn('onboarding.saving') : tFn('onboarding.finish')}
		</button>
	</div>
</div>
