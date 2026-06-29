<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		// מקים סשן קהילה מתוך העוגייה המשותפת gofreeil-auth. אם אין סשן משותף
		// תקף — Auth.js יפנה לעמוד השגיאה (/login) ולא ינסה שוב (sso_adopt_tried).
		signIn('gofreeil-sso', { callbackUrl: data.redirect || '/' });
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
	<p class="text-white font-bold text-lg">מזהה אותך דרך "יוצאים לחירות"…</p>
	<span class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
</div>
