<script lang="ts">
	let fullName = $state('');
	let idNumber = $state('');
	let birthDate = $state('');
	let signature = $state('');
	let agreed = $state(false);

	let submitting = $state(false);
	let submitted = $state(false);
	let errorMsg = $state('');

	const today = new Date().toLocaleDateString('he-IL');

	async function handleSubmit() {
		errorMsg = '';
		if (!fullName.trim() || !idNumber.trim() || !birthDate || !signature.trim() || !agreed) {
			errorMsg = 'נא למלא את כל השדות ולסמן את ההסכמה';
			return;
		}
		if (signature.trim() !== fullName.trim()) {
			errorMsg = 'החתימה צריכה להיות זהה לשם המלא';
			return;
		}

		submitting = true;
		try {
			const res = await fetch('/api/charter-signature', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fullName: fullName.trim(),
					idNumber: idNumber.trim(),
					birthDate,
					signature: signature.trim(),
					signedAt: new Date().toISOString()
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || data?.success === false) {
				errorMsg = data?.message || 'שגיאה בשמירת האמנה — נסו שוב';
				return;
			}
			submitted = true;
		} catch {
			errorMsg = 'בעיית תקשורת — נסו שוב';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>אמנת יוצאים לחירות | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8 md:py-12 text-white" dir="rtl">

	<!-- Header -->
	<div class="text-center mb-8">
		<div class="text-5xl mb-3">🕊️</div>
		<h1 class="text-3xl md:text-5xl font-black leading-tight mb-3" style="color:#facc15;">
			אמנת יוצאים לחירות
		</h1>
		<p class="text-indigo-200 text-base md:text-lg max-w-2xl mx-auto">
			אמנה מוסרית-ערכית לרכזי השכונות ולחברי התנועה
		</p>
	</div>

	<!-- Charter content -->
	<div class="rounded-3xl p-7 md:p-9 mb-8 leading-relaxed text-gray-100"
	     style="background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid rgba(139,92,246,0.25);">

		<p class="text-base md:text-lg mb-6">
			אני מצטרף לתנועה החברתית ולעמותת <span class="font-black text-yellow-300">יוצאים לחירות</span> הפועלת לקידום ערבות הדדית בין כל פלגי העם, מתוך אחווה, וחזון לעצמאות ותקומה רוחנית וגשמית של העם. ידוע לי כי:
		</p>

		<ul class="space-y-4 mb-6">
			{#each [
				'אנו שואפים ליצור מציאות חדשה המבוססת על העיקרון של "ואהבת לרעך כמוך", שבה כל אדם תורם את כישוריו ויכולותיו בדרך הייחודית לו, תוך כיבוד רצונו החופשי של האחר כדי לקדם ולחזק את המשילות של העם על כל המוסדות והתאגידים המשפיעים עליו.',
				'אני מצהיר כי אינני חבר בכתות סודיות ובהצטרפותי אינני מתכוון להטות את חזון החירות הנ"ל מכל סיבה שהיא, בין אידיאולוגית, בין בגלל איום או להבדיל שוחד וטובת הנאה כל שהיא.',
				'אני מצהיר כי במקרה וינסו גורמים כל שהם להטות אותי מדרכי אני מחויב לדווח לכך לחברי בהקדם האפשרי בשקיפות מלאה.',
				'כמו כן ידוע לי כי התנועה מגנה בכל תוקף כל צורה של אלימות, לשון הרע או סכסוכים פנימיים, ומתנגדת לכל ניסיון לכפות דעות מחוץ לגבולות הלגיטימיים של שיח מכבד, אני מודע לכך כי הפרה של עקרונות אלו עשויה להוביל להסרת חברותי בעמותה לאלתר.',
				'במקרה של מחלוקת עם חבריי, אני מתחייב לפעול בדרך של כבוד והידברות, ואם לא אצליח לפתור את המחלוקת בכוחות עצמי – אפנה לגורם צד שלישי או לבתי הפיוס של יוצאים לחירות במטרה להגיע לפתרון בדרכי שלום.',
				'בהצטרפותי, אני מתחייב לפעול לקידום ערכים של נתינה ואלטרואיזם, להימנע מאגואיזם, ולעשות כל שביכולתי להוסיף חסד לשיפור המצב הקיים וללחום בגבורה כדי לדחות כל עוול, עד לחזון המלא והמשותף של חיים חופשיים בהרמוניה במהרה בימנו אמן.'
			] as clause}
				<li class="flex gap-3 text-base md:text-lg">
					<span class="text-yellow-400 mt-1 flex-shrink-0">✦</span>
					<span>{clause}</span>
				</li>
			{/each}
		</ul>
	</div>

	<!-- Sign form -->
	{#if submitted}
		<div class="rounded-3xl p-8 text-center"
		     style="background:linear-gradient(135deg,#064e3b,#1e293b); border:2px solid rgba(16,185,129,0.5);">
			<div class="text-5xl mb-3">✅</div>
			<h2 class="text-2xl md:text-3xl font-black text-emerald-300 mb-2">האמנה נחתמה בהצלחה</h2>
			<p class="text-emerald-100 text-base md:text-lg">
				תודה <span class="font-black text-yellow-300">{fullName}</span> — שמך נשמר אצלנו כחתום על אמנת יוצאים לחירות.
			</p>
			<p class="text-gray-300 text-sm mt-4">תאריך חתימה: {today}</p>
		</div>
	{:else}
		<div class="rounded-3xl p-7 md:p-9"
		     style="background:linear-gradient(135deg,#1a1035,#0f172a); border:2px solid rgba(250,204,21,0.35);">
			<h2 class="text-xl md:text-2xl font-black mb-1 text-yellow-300">חתימה על האמנה</h2>
			<p class="text-gray-300 text-sm mb-6">מילוי הפרטים והחתימה למטה מהווה הסכמה לכל סעיפי האמנה</p>

			<div class="grid md:grid-cols-3 gap-4 mb-5">
				<div>
					<label for="fullName" class="block text-sm font-bold text-gray-200 mb-1.5">שם מלא</label>
					<input
						id="fullName"
						type="text"
						bind:value={fullName}
						class="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-yellow-400/60 focus:bg-yellow-900/10 transition-all"
						placeholder="ישראל ישראלי"
					/>
				</div>
				<div>
					<label for="idNumber" class="block text-sm font-bold text-gray-200 mb-1.5">תעודת זהות</label>
					<input
						id="idNumber"
						type="text"
						inputmode="numeric"
						maxlength="9"
						bind:value={idNumber}
						class="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-yellow-400/60 focus:bg-yellow-900/10 transition-all"
						placeholder="9 ספרות"
						dir="ltr"
					/>
				</div>
				<div>
					<label for="birthDate" class="block text-sm font-bold text-gray-200 mb-1.5">תאריך לידה</label>
					<input
						id="birthDate"
						type="date"
						bind:value={birthDate}
						class="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-400/60 focus:bg-yellow-900/10 transition-all"
					/>
				</div>
			</div>

			<!-- Agreement checkbox -->
			<label class="flex items-start gap-3 mb-5 p-4 rounded-xl border border-yellow-500/25 bg-yellow-500/5 cursor-pointer hover:bg-yellow-500/10 transition-colors">
				<input
					type="checkbox"
					bind:checked={agreed}
					class="mt-1 w-5 h-5 flex-shrink-0 accent-yellow-400 cursor-pointer"
				/>
				<span class="text-sm md:text-base text-gray-100 leading-relaxed">
					אני מצהיר/ה כי קראתי את האמנה לעיל, מבין/ה את משמעותה, ומתחייב/ת לפעול לפי עקרונותיה וערכיה.
				</span>
			</label>

			<!-- Signature -->
			<div class="mb-5">
				<label for="signature" class="block text-sm font-bold text-gray-200 mb-1.5">
					חתימה — חתום/י על ידי הקלדת שמך המלא שוב
				</label>
				<input
					id="signature"
					type="text"
					bind:value={signature}
					class="w-full rounded-xl border-2 border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-yellow-100 text-lg font-black focus:outline-none focus:border-yellow-400 focus:bg-yellow-500/10 transition-all"
					style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; letter-spacing: 1px;"
					placeholder="הקלד/י את שמך המלא לחתימה"
				/>
				<p class="text-xs text-gray-500 mt-1.5">תאריך חתימה: {today}</p>
			</div>

			{#if errorMsg}
				<div class="mb-4 rounded-xl p-3 bg-red-500/10 border border-red-500/40 text-red-300 text-sm font-bold text-center">
					{errorMsg}
				</div>
			{/if}

			<button
				type="button"
				onclick={handleSubmit}
				disabled={submitting}
				class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 font-black text-lg transition-all shadow-lg
					{submitting
						? 'bg-gray-700 text-gray-400 cursor-not-allowed'
						: 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black hover:scale-[1.02] shadow-amber-500/30'}"
			>
				{#if submitting}
					<span class="inline-block w-5 h-5 border-2 border-gray-500 border-t-yellow-400 rounded-full"
						style="animation: spin 0.7s linear infinite;"></span>
					שולח חתימה...
				{:else}
					🕊️ חתום על האמנה
				{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
