<svelte:head>
	<title>אודותינו | קהילה בשכונה</title>
</svelte:head>

<div class="text-white min-h-screen flex flex-col items-center justify-center px-4 py-16" dir="rtl">

	<!-- Hero -->
	<div class="text-center mb-14 max-w-2xl">
		<span class="text-5xl mb-5 block">🏘️</span>
		<h1 class="text-4xl md:text-6xl font-black mb-4" style="color:#facc15;">קהילה בשכונה</h1>
		<p class="text-indigo-200 text-base md:text-xl font-semibold leading-relaxed">
			הפלטפורמה הקהילתית הראשונה בישראל המחברת בין התושבים אל כל היתרונות, השירותים והמשאבים של השכונה בה הם מתגוררים!
		</p>
	</div>

	<!-- 4 Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-3xl">

		<a href="/revenue#about"
			class="group rounded-3xl p-7 flex flex-col gap-3 transition-all hover:-translate-y-1 hover:brightness-110 cursor-pointer"
			style="background:linear-gradient(135deg,#1e1b4b,#312e81); border:1px solid rgba(167,139,250,0.35); box-shadow:0 4px 24px rgba(124,58,237,0.15);">
			<span class="text-4xl">🏘️</span>
			<h2 class="text-xl font-black" style="color:#a78bfa;">אודותינו</h2>
			<p class="text-indigo-200 text-sm leading-relaxed">מה זה קהילה בשכונה, מה הפלטפורמה מציעה ולמה היא שונה מכל דבר אחר.</p>
			<span class="text-purple-400 text-sm font-bold group-hover:gap-2 flex items-center gap-1 mt-auto">קרא עוד ←</span>
		</a>

		<a href="/revenue#rewards"
			class="group rounded-3xl p-7 flex flex-col gap-3 transition-all hover:-translate-y-1 hover:brightness-110 cursor-pointer"
			style="background:linear-gradient(135deg,#1c1917,#292524); border:1px solid rgba(250,204,21,0.35); box-shadow:0 4px 24px rgba(250,204,21,0.1);">
			<span class="text-4xl">💰</span>
			<h2 class="text-xl font-black" style="color:#facc15;">שיטת התגמול</h2>
			<p class="text-yellow-100/70 text-sm leading-relaxed">איך הפלטפורמה מרוויחה, כיצד הרווחים מתחלקים ומה מגיע לכל גורם.</p>
			<span class="text-yellow-400 text-sm font-bold flex items-center gap-1 mt-auto">קרא עוד ←</span>
		</a>

		<a href="/revenue#owners"
			class="group rounded-3xl p-7 flex flex-col gap-3 transition-all hover:-translate-y-1 hover:brightness-110 cursor-pointer"
			style="background:linear-gradient(135deg,#1e3a8a,#1e40af); border:1px solid rgba(96,165,250,0.35); box-shadow:0 4px 24px rgba(59,130,246,0.15);">
			<span class="text-4xl">🏛️</span>
			<h2 class="text-xl font-black" style="color:#93c5fd;">היה מהבעלים</h2>
			<p class="text-blue-100/70 text-sm leading-relaxed">רכוש יחידות בפלטפורמה, קבל דיבידנדים מדי חודש והיה חלק מהבעלות.</p>
			<span class="text-blue-400 text-sm font-bold flex items-center gap-1 mt-auto">קרא עוד ←</span>
		</a>

		<a href="/revenue#coordinator"
			class="group rounded-3xl p-7 flex flex-col gap-3 transition-all hover:-translate-y-1 hover:brightness-110 cursor-pointer"
			style="background:linear-gradient(135deg,#064e3b,#065f46); border:1px solid rgba(52,211,153,0.35); box-shadow:0 4px 24px rgba(16,185,129,0.15);">
			<span class="text-4xl">👥</span>
			<h2 class="text-xl font-black" style="color:#34d399;">היה רכז שכונה</h2>
			<p class="text-emerald-100/70 text-sm leading-relaxed">הפוך לרכז בשכונתך, הפעל את הקהילה וקבל 30% מהרווחים החודשיים.</p>
			<span class="text-emerald-400 text-sm font-bold flex items-center gap-1 mt-auto">קרא עוד ←</span>
		</a>

	</div>

</div>
