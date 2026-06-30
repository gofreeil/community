<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let copied = $state(false);

	function copySecret() {
		if (!data.secret) return;
		navigator.clipboard?.writeText(data.secret);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head>
	<title>הגדרת אימות דו-שלבי</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center px-4 py-12" dir="rtl">
	<div class="w-full max-w-md bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
		<div class="h-1.5 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600"></div>
		<div class="p-8">
			<div class="text-center mb-6">
				<div class="flex justify-center mb-4">
					<div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center shadow-xl">
						<span class="text-2xl">🔐</span>
					</div>
				</div>
				<h1 class="text-xl font-black text-white mb-1">אימות דו-שלבי למנהל</h1>
				<p class="text-gray-400 text-sm">הגנה נוספת על אזור הניהול</p>
			</div>

			{#if data.configured || form?.ok}
				<div class="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-4 text-center mb-4">
					<p class="text-green-400 font-bold mb-1">✅ 2FA פעיל</p>
					<p class="text-gray-400 text-sm">
						{form?.message ?? 'אימות דו-שלבי מוגדר לחשבונך. בכניסה ממכשיר חדש תתבקש קוד מאפליקציית האימות.'}
					</p>
				</div>

				{#if !form?.disabled}
					<details class="rounded-xl bg-[#1e293b] border border-white/10 px-4 py-3">
						<summary class="text-gray-400 text-sm cursor-pointer">ביטול אימות דו-שלבי</summary>
						<form method="POST" action="?/disable" use:enhance class="mt-3 flex gap-2">
							<input
								name="code"
								inputmode="numeric"
								maxlength="6"
								placeholder="קוד נוכחי"
								class="flex-1 text-center tracking-widest font-bold bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
							/>
							<button type="submit" class="px-4 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 font-bold text-sm hover:bg-red-500/30 cursor-pointer">
								כבה
							</button>
						</form>
						{#if form && !form.ok}
							<p class="mt-2 text-sm text-red-400">{form.message}</p>
						{/if}
					</details>
				{/if}
			{:else}
				<ol class="text-gray-300 text-sm space-y-4">
					<li>
						<span class="font-bold text-white">1. סרוק את הקוד</span> ב-Google Authenticator
						(או Authy / Microsoft Authenticator):
						<div class="flex justify-center my-3">
							<img src={data.qrDataUrl} alt="QR" class="rounded-xl border border-white/10 bg-white p-2" width="200" height="200" />
						</div>
						<p class="text-gray-500 text-xs text-center">אין מצלמה? הזן ידנית את המפתח:</p>
						<button
							type="button"
							onclick={copySecret}
							class="w-full mt-2 font-mono text-amber-300 text-sm bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 break-all hover:border-amber-400/50 cursor-pointer"
						>
							{data.secret}
							<span class="text-gray-500 text-xs">{copied ? '✓ הועתק' : '(לחץ להעתקה)'}</span>
						</button>
					</li>

					<li>
						<span class="font-bold text-white">2. הזן את הקוד הנוכחי</span> מהאפליקציה כדי להפעיל:
						<form method="POST" action="?/enable" use:enhance class="mt-2 flex gap-2">
							<input type="hidden" name="secret" value={data.secret} />
							<input
								name="code"
								inputmode="numeric"
								autocomplete="one-time-code"
								maxlength="6"
								placeholder="000000"
								class="flex-1 text-center tracking-widest font-bold bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
							/>
							<button type="submit" class="px-4 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold text-sm hover:bg-amber-500/30 cursor-pointer">
								הפעל
							</button>
						</form>
						{#if form?.done && !form.ok}
							<p class="mt-2 text-sm text-red-400">{form.message}</p>
						{/if}
						<p class="text-amber-300/70 text-xs mt-2">💡 הסוד נשמר מאובטח בחשבונך — אין צורך להגדיר דבר ב-Vercel.</p>
					</li>
				</ol>
			{/if}

			<div class="text-center mt-6">
				<a href="/admin" class="text-gray-500 hover:text-gray-400 text-sm">← חזרה לניהול</a>
			</div>
		</div>
	</div>
</div>
