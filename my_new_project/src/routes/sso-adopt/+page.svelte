<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';

	let { data } = $props();

	let formEl: HTMLFormElement | undefined = $state();
	let redirectInput: HTMLInputElement | undefined = $state();

	// מצמיד את סימון מסך הפתיחה ליעד הנחיתה (new = מצטרף חדש, back = חוזר)
	function withWelcome(dest: string, kind: string): string {
		try {
			const u = new URL(dest, window.location.origin);
			u.searchParams.set('welcome', kind);
			return `${u.pathname}${u.search}${u.hash}`;
		} catch {
			return `/?welcome=${kind}`;
		}
	}

	onMount(() => {
		// מקים סשן קהילה מתוך העוגייה המשותפת gofreeil-auth — דרך action שרתי,
		// כי ה-signIn של @auth/sveltekit/client שבור לספק credentials עם id מותאם.
		// אם אין סשן משותף תקף — ה-action מפנה ל-/login ולא ננסה שוב (sso_adopt_tried).
		if (redirectInput) {
			redirectInput.value = withWelcome(data.redirect || '/', data.welcome ?? 'back');
		}
		formEl?.requestSubmit();
	});
</script>

<svelte:head>
	<title>מתחבר…</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4 text-center" dir="rtl">
	<div class="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center shadow-xl">
		<span class="text-2xl">🕊️</span>
	</div>
	<p class="text-white font-bold text-lg">{$_('account.sso_identifying')}</p>
	<span class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
	<!-- ההתחברות עצמה: POST ל-action השרתי -->
	<form bind:this={formEl} method="POST">
		<input type="hidden" name="providerId" value="gofreeil-sso" />
		<input bind:this={redirectInput} type="hidden" name="redirectTo" value={data.redirect || '/'} />
		<button type="submit" class="text-xs text-gray-500 underline hover:text-gray-300">
			{$_('account.sso_continue_manual', { default: 'לא הועברת? לחץ כאן להמשך' })}
		</button>
	</form>
</div>
