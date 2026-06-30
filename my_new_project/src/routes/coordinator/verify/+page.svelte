<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>אימות רכז</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center px-4 py-12" dir="rtl">
	<div class="w-full max-w-sm bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
		<div class="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600"></div>
		<div class="p-8">
			<div class="text-center mb-6">
				<div class="flex justify-center mb-4">
					<div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl">
						<span class="text-2xl">🔐</span>
					</div>
				</div>
				<h1 class="text-xl font-black text-white mb-1">אימות רכז</h1>
				<p class="text-gray-400 text-sm">הזן את הקוד מאפליקציית האימות (Google Authenticator)</p>
			</div>

			{#if form?.error}
				<div role="alert" class="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-center">
					<p class="text-red-400 text-sm font-medium">{form.error}</p>
				</div>
			{/if}

			<form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; }; }}>
				<input type="hidden" name="redirect" value={data.redirect} />
				<input
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					pattern="[0-9]*"
					maxlength="6"
					required
					autofocus
					placeholder="000000"
					class="w-full text-center tracking-[0.5em] text-2xl font-bold bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3
					       text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors mb-3"
				/>
				<p class="text-gray-500 text-xs text-center mb-5">המכשיר הזה ייזכר — לא תתבקש שוב כאן.</p>
				<button
					type="submit"
					disabled={loading}
					class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500
					       text-white font-bold shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
				>
					{#if loading}מאמת…{:else}אמת והמשך{/if}
				</button>
			</form>
		</div>
	</div>
</div>
