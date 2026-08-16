<script lang="ts">
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { t, locale } from 'svelte-i18n';

	let { data, children } = $props();

	// tFn ריאקטיבי (דפוס האתר; $t אסור ב-Svelte 5)
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe((l) => (_loc = l)));
	const tFn = (k: string, values?: Record<string, string | number>) => {
		void _loc;
		return get(t)(k, values ? { values } : undefined);
	};

	// מספר השלב הנוכחי לפי הנתיב (/onboarding/1|2|3)
	const step = $derived.by(() => {
		const m = $page.url.pathname.match(/\/onboarding\/(\d)/);
		return m ? Number(m[1]) : 1;
	});
</script>

<div class="min-h-[80vh] flex items-center justify-center px-4 py-6" dir="rtl">
	<div class="w-full max-w-md">
		<!-- כרטיס -->
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
			<!-- פס עליון גרדיאנט -->
			<div class="h-1.5 bg-gradient-to-r from-green-500 via-blue-600 to-purple-600"></div>

			<div class="p-6 md:p-8">
				<!-- לוגו + ברכה -->
				<div class="text-center mb-4">
					<div class="flex justify-center mb-3">
						<div class="h-12 w-12 rounded-2xl overflow-hidden bg-white shadow-lg flex items-center justify-center">
							<img src="/images/community-logo1.webp" alt="קהילה בשכונה" class="w-full h-full object-cover scale-[1.2]" />
						</div>
					</div>
					{#if data.name}
						<p class="text-white font-black text-lg leading-tight">{tFn('onboarding.greeting', { name: data.name })}</p>
					{/if}
					<p class="text-gray-400 text-sm mt-0.5">{tFn('onboarding.step_of', { n: step })}</p>
				</div>

				<!-- מד התקדמות: 3 עיגולים ממוספרים -->
				<div class="flex items-center justify-center gap-2 mb-6">
					{#each [1, 2, 3] as s}
						<div class="flex items-center gap-2">
							<div
								class="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors
									{s < step
									? 'bg-green-600 border-green-500 text-white'
									: s === step
										? 'bg-gradient-to-br from-green-600 to-blue-600 border-blue-400 text-white'
										: 'bg-white/5 border-white/15 text-gray-500'}"
							>
								{s < step ? '✓' : s}
							</div>
							{#if s < 3}
								<div class="h-0.5 w-6 rounded {s < step ? 'bg-green-500' : 'bg-white/15'}"></div>
							{/if}
						</div>
					{/each}
				</div>

				{@render children()}
			</div>
		</div>

		<!-- דילוג מהיר לכל האשף -->
		<div class="text-center mt-4">
			<a href="/profile" class="text-gray-500 hover:text-gray-400 text-sm transition-colors">
				{tFn('onboarding.skip')} →
			</a>
		</div>
	</div>
</div>
