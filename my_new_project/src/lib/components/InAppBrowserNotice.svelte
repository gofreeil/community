<script lang="ts">
	// שובר-תקלות לדפי login/register: כשהאתר נפתח בתוך אפליקציה (WebView),
	// "המשך עם Google" נכשל (גוגל חוסמת) — מציגים הנחיה לפתוח בדפדפן אמיתי
	// + כפתור העתקת קישור. מרונדר רק כשבאמת מזוהה דפדפן פנימי.
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { t, locale } from 'svelte-i18n';
	import { isInAppBrowser } from '$lib/inAppBrowser';

	let show    = $state(false);
	let copied  = $state(false);
	let showUrl = $state(false);
	let pageUrl = $state('');

	onMount(() => {
		show = isInAppBrowser();
		pageUrl = window.location.href;
	});

	// tFn: תרגום reactive - $t אסור ב-Svelte 5
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe(l => (_loc = l)));
	const tFn = (k: string) => { void _loc; return get(t)(k); };

	// העתקה בשיטה הישנה (execCommand) - עובדת גם ב-WebView שחוסם את Clipboard API
	function legacyCopy(text: string): boolean {
		try {
			const ta = document.createElement('textarea');
			ta.value = text;
			ta.setAttribute('readonly', '');
			ta.style.cssText = 'position:fixed;opacity:0';
			document.body.appendChild(ta);
			ta.focus();
			ta.select();
			ta.setSelectionRange(0, text.length);
			const ok = document.execCommand('copy');
			document.body.removeChild(ta);
			return ok;
		} catch {
			return false;
		}
	}

	async function copyLink() {
		const url = window.location.href;
		let ok = false;
		try {
			await navigator.clipboard.writeText(url);
			ok = true;
		} catch {
			ok = legacyCopy(url);
		}
		if (ok) {
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} else {
			// גם ההעתקה הישנה נחסמה - מציגים את הקישור כטקסט לסימון ידני (long-press)
			showUrl = true;
		}
	}
</script>

{#if show}
	<div role="alert" class="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 leading-relaxed">
		<p class="font-semibold mb-1">{tFn('account.inapp_title')}</p>
		<p class="text-amber-300/90">{tFn('account.inapp_warning')}</p>
		<button
			type="button"
			onclick={copyLink}
			class="mt-2 font-semibold underline underline-offset-4 hover:text-amber-100 transition-colors cursor-pointer"
		>
			{copied ? tFn('account.inapp_copied') : tFn('account.inapp_copy_link')}
		</button>
		{#if showUrl}
			<p class="mt-2 text-amber-300/90">
				{tFn('account.inapp_copy_manual')}
				<span dir="ltr" class="select-all break-all underline">{pageUrl}</span>
			</p>
		{/if}
	</div>
{/if}
