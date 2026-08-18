<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let loading = $state(false);
	let sendingCode = $state(false);
	let verifyingCode = $state(false);

	// מסלול המייל נפתח אחרי שליחה מוצלחת, ונשאר פתוח גם אחרי ניסיון קוד שגוי
	const emailSent = $derived(!!form?.sent);
</script>

<svelte:head>
	<title>אימות מנהל</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center px-4 py-12" dir="rtl">
	<div class="w-full max-w-sm bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
		<div class="h-1.5 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600"></div>
		<div class="p-8">
			<div class="text-center mb-6">
				<div class="flex justify-center mb-4">
					<div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center shadow-xl">
						<span class="text-2xl">🔐</span>
					</div>
				</div>
				<h1 class="text-xl font-black text-white mb-1">אימות מנהל</h1>
				<p class="text-gray-400 text-sm">הזן את הקוד מאפליקציית האימות (Google Authenticator)</p>
			</div>

			{#if form?.error}
				<div role="alert" class="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-center">
					<p class="text-red-400 text-sm font-medium">{form.error}</p>
				</div>
			{/if}

			<form method="POST" action="?/totp" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; }; }}>
				<input type="hidden" name="redirect" value={data.redirect} />
				<!-- svelte-ignore a11y_autofocus -->
				<!-- autofocus מכוון: השדה הראשי בדף, והמשתמש הגיע במפורש להקליד קוד -->
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
					       text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors mb-3"
				/>
				<p class="text-gray-500 text-xs text-center mb-5">המכשיר הזה ייזכר — לא תתבקש שוב כאן.</p>
				<button
					type="submit"
					disabled={loading}
					class="w-full py-3.5 px-6 rounded-2xl login-grad hover:brightness-110
					       text-white font-bold shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
				>
					{#if loading}מאמת…{:else}אמת והמשך{/if}
				</button>
			</form>

			<!-- מסלול חילוץ: אין גישה לטלפון → קוד חד-פעמי למייל -->
			<div class="mt-6 pt-5 border-t border-white/10">
				{#if emailSent}
					<p class="text-emerald-400 text-sm text-center font-medium mb-3">
						📧 קוד חילוץ נשלח אל <span dir="ltr" class="font-bold">{form?.maskedEmail ?? 'המייל הרשום'}</span> — תקף ל-10 דקות.
					</p>
					<form method="POST" action="?/emailCode" use:enhance={() => { verifyingCode = true; return async ({ update }) => { await update(); verifyingCode = false; }; }}>
						<input type="hidden" name="redirect" value={data.redirect} />
						<input
							name="code"
							inputmode="numeric"
							autocomplete="one-time-code"
							pattern="[0-9]*"
							maxlength="8"
							required
							placeholder="00000000"
							class="w-full text-center tracking-[0.35em] text-xl font-bold bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5
							       text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors mb-3"
						/>
						<button
							type="submit"
							disabled={verifyingCode}
							class="w-full py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg transition-all
							       cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{#if verifyingCode}מאמת…{:else}אמת קוד מהמייל{/if}
						</button>
					</form>
					<form method="POST" action="?/sendCode" use:enhance={() => { sendingCode = true; return async ({ update }) => { await update(); sendingCode = false; }; }} class="mt-2 text-center">
						<button type="submit" disabled={sendingCode} class="text-xs text-gray-400 hover:text-white underline underline-offset-2 cursor-pointer disabled:opacity-60">
							{#if sendingCode}שולח…{:else}לא הגיע? שלח קוד חדש{/if}
						</button>
					</form>
				{:else if data.canEmail}
					<p class="text-gray-500 text-xs text-center mb-3">אין גישה לטלפון? אפשר לקבל קוד חילוץ חד-פעמי למייל של המנהל.</p>
					<form method="POST" action="?/sendCode" use:enhance={() => { sendingCode = true; return async ({ update }) => { await update(); sendingCode = false; }; }}>
						<button
							type="submit"
							disabled={sendingCode}
							class="w-full py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 font-bold
							       transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{#if sendingCode}שולח קוד למייל…{:else}📧 שלח קוד חילוץ למייל{/if}
						</button>
					</form>
				{/if}
				<p class="text-gray-600 text-[11px] text-center mt-3 leading-relaxed">
					דרך נוספת: מנהל ראשי אחר יכול לאפס את האימות שלך מדף המשתמש שלך בפאנל הניהול.
				</p>
			</div>
		</div>
	</div>
</div>
