<script lang="ts">
	// דף השגיאה המותאם של האתר — מוצג בתוך ה-layout (Header/Footer/פרסומות נשארים)
	// במקום עמוד "500 Internal Error" הגולמי של SvelteKit. תומך עברית/אנגלית/רוסית.
	import { page } from "$app/state";
	import { _ } from "svelte-i18n";

	// 404 = עמוד לא נמצא, 403 = אין הרשאה, כל השאר = תקלת שרת (500)
	let status = $derived(page.status ?? 500);
	let kind = $derived(status === 404 ? "404" : status === 403 ? "403" : "500");
	let emoji = $derived(status === 404 ? "🧭" : status === 403 ? "🔒" : "🌩️");

	// מזהה תקלה שהוחזר מ-handleError (אם קיים) — לשיוך מול לוג התמיכה
	let ref = $derived((page.error as { ref?: string } | null)?.ref ?? "");

	function reload() {
		if (typeof location !== "undefined") location.reload();
	}
</script>

<svelte:head>
	<title>{status} | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16">
	<div class="text-7xl md:text-8xl mb-6 select-none" aria-hidden="true">{emoji}</div>

	<p class="text-xs font-bold tracking-[0.3em] text-purple-400/80 mb-3 uppercase">
		{$_("errors.code_label")} · {status}
	</p>

	<h1 class="text-2xl md:text-4xl font-black text-white mb-4">
		{$_(`errors.title_${kind}`)}
	</h1>

	<p class="text-gray-400 max-w-md leading-relaxed mb-8 text-sm md:text-base">
		{$_(`errors.body_${kind}`)}
	</p>

	<div class="flex items-center gap-3 flex-wrap justify-center">
		{#if kind === "500"}
			<button
				type="button"
				onclick={reload}
				class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
				       text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
			>
				{$_("errors.try_again")}
			</button>
		{/if}
		<a
			href="/"
			class="border border-white/15 hover:border-white/30 text-gray-200 hover:text-white
			       font-bold px-6 py-3 rounded-xl transition-all hover:bg-white/5"
		>
			{$_("errors.back_home")}
		</a>
	</div>

	{#if ref}
		<p class="text-gray-600 text-xs mt-8 font-mono">{$_("errors.ref_prefix")}: {ref}</p>
	{/if}
</div>
