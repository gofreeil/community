<svelte:head>
	<title>אודותינו | קהילה בשכונה</title>
</svelte:head>

<div class="text-white" dir="rtl">

	<!-- HERO -->
	<div class="relative rounded-3xl px-8 py-16 text-center mb-12 shadow-2xl overflow-hidden"
		style="background: linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4c1d95 100%);">
		<div class="absolute inset-0 pointer-events-none"
			style="background: radial-gradient(ellipse at 60% 20%, rgba(139,92,246,0.4) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(59,130,246,0.25) 0%, transparent 50%);"></div>
		<div class="relative z-10">
			<span class="inline-block text-4xl mb-4">🏘️</span>
			<h1 class="text-4xl md:text-6xl font-black leading-tight mb-4" style="color:#facc15;">
				קהילה בשכונה
			</h1>
			<p class="text-indigo-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-bold">
				הפלטפורמה הקהילתית הראשונה בישראל שמחברת בין תושבי השכונה לכל השירותים, האנשים והמשאבים — במקום אחד, בחינם.
			</p>
			<!-- Stats -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#each [
					['🏘️','שכונות','בכל הארץ','#a78bfa'],
					['🤝','100%','שירות חינם לתושבים','#34d399'],
					['💰','50%','מהרווחים חוזרים לקהילה','#facc15'],
					['❤️','קהילה','מחוברת ותומכת','#f472b6']
				] as [ico, val, lbl, clr]}
					<div class="rounded-2xl p-5 text-center" style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);">
						<div class="text-2xl mb-1">{ico}</div>
						<div class="text-2xl font-black" style="color:{clr};">{val}</div>
						<div class="text-xs text-indigo-200 mt-1">{lbl}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- מה זה? -->
	<div class="mb-12 rounded-3xl p-8 md:p-10"
		style="background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid rgba(139,92,246,0.2);">
		<h2 class="text-2xl md:text-3xl font-black mb-5 text-purple-300">אז מה זה בדיוק "קהילה בשכונה"?</h2>
		<div class="grid md:grid-cols-2 gap-6 text-base text-gray-200 leading-relaxed">
			<p>
				<span class="text-white font-black">קהילה בשכונה</span> היא פלטפורמה דיגיטלית (אתר ואפליקציה) המרכזת את כל מה שקורה בשכונה שלך — גמ"חים, עסקים מקומיים, מניינים, חוגים, אירועים, מסירות חינם ועוד — הכל במקום אחד נגיש ונוח.
			</p>
			<p>
				המיזם פועל לפי <span class="text-yellow-300 font-black">מודל כלכלי-חברתי ייחודי</span> שבו חצי מהרווחים חוזרים אל הקהילה: 30% לרכזי השכונות, 20% לצדקה ולחסד — כי אנחנו מאמינים שפלטפורמה אמיתית שייכת לאנשים שמפעילים אותה.
			</p>
		</div>
	</div>

	<!-- שירותי השכונה -->
	<div class="mb-12">
		<h2 class="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
			<span class="w-10 h-10 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background:linear-gradient(135deg,#facc15,#f59e0b);">✦</span>
			כל שירותי השכונה במקום אחד
		</h2>
		<p class="text-gray-400 text-sm mb-7 max-w-2xl">פלטפורמה אחת לכל מה שהשכונה מציעה — ללא תשלום לתושבים</p>

		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
			{#each [
				['🎁','גמ"חים','השאלת פריטים, ספרים וציוד — בחינם','#a78bfa','rgba(139,92,246,0.15)'],
				['📦','מסירות חינם','רהיטים, בגדים וציוד ממשפחות לשכנים','#fb923c','rgba(251,146,60,0.15)'],
				['👶','בייביסיטינג','שמרטפים מאומתים מהשכונה — בלחיצת כפתור','#f472b6','rgba(244,114,182,0.15)'],
				['✡️','מניינים','לוח מניינים יומי מעודכן לכל בתי הכנסת','#60a5fa','rgba(96,165,250,0.15)'],
				['🏪','עסקים מקומיים','חנויות, מסעדות ושירותים בשכונה','#34d399','rgba(52,211,153,0.15)'],
				['🎨','חוגים ושיעורים','פעילויות לילדים ומבוגרים — ספורט, אמנות ועוד','#facc15','rgba(250,204,21,0.15)'],
				['🏠','צימרים','השכרת חדרים ונכסים קצרי טווח בקהילה','#c084fc','rgba(192,132,252,0.15)'],
				['💑','פנויים ופנויות','היכרויות שכונתיות — כי הזוגיות מתחילה בקרבה','#fb7185','rgba(251,113,133,0.15)'],
				['🚗','טרמפים','נסיעות משותפות בין שכנים לאותה כיוון','#38bdf8','rgba(56,189,248,0.15)'],
				['🔍','אבידות ומציאות','לוח מרכזי לדיווח ואיתור חפצים אבודים','#4ade80','rgba(74,222,128,0.15)'],
				['📅','אירועים','לוח אירועים שכונתי — חתונות, הרצאות, ימי כיף','#fbbf24','rgba(251,191,36,0.15)'],
				['💼','דרושים','לוח דרושים מקומי — עסקים מחפשים ותושבים מציעים','#818cf8','rgba(129,140,248,0.15)']
			] as [ico, title, desc, color, bg]}
				<div class="rounded-2xl p-5 flex flex-col gap-2 transition-all hover:-translate-y-0.5"
					style="background:{bg}; border:1px solid {color}30;">
					<span class="text-3xl">{ico}</span>
					<div class="font-black text-sm" style="color:{color};">{title}</div>
					<p class="text-gray-400 text-xs leading-relaxed">{desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- למי זה מתאים -->
	<div class="mb-12">
		<h2 class="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
			<span class="w-10 h-10 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background:linear-gradient(135deg,#facc15,#f59e0b);">✦</span>
			למי זה מתאים?
		</h2>
		<p class="text-gray-400 text-sm mb-7 max-w-2xl">הפלטפורמה נועדה לשלושה גורמים שכולם נהנים ממנה</p>
		<div class="grid md:grid-cols-3 gap-5">
			{#each [
				['👤','תושבי השכונה','#3b82f6','#1e3a8a',
					['גישה לכל שירותי השכונה בחינם','חיבור לשכנים ולקהילה','עזרה וחסד בהישג יד','לוח אירועים ועדכונים מקומיים']],
				['🏪','בעלי עסקים','#f59e0b','#78350f',
					['פרסום איכותי לקהל ממוקד','חשיפה לתושבי השכונה בדיוק','תשלום הוגן וקל לכל כיס','מדדי אפקטיביות ברורים']],
				['🏘️','רכזי שכונות','#10b981','#064e3b',
					['הכנסה נאה מ-30% מהרווחים','ניהול פשוט דרך לוח ניהול','תגמול על כל פעילות בשטח','הכרה וסמכות בקהילה']]
			] as [ico, title, color, dark, points]}
				<div class="rounded-2xl p-6"
					style="background:linear-gradient(135deg,{dark},#1e293b); border:1px solid {color}40;">
					<div class="flex items-center gap-3 mb-4">
						<span class="text-3xl">{ico}</span>
						<h3 class="font-black text-lg" style="color:{color};">{title}</h3>
					</div>
					<ul class="space-y-2">
						{#each points as pt}
							<li class="flex items-center gap-2 text-sm text-gray-200">
								<span style="color:{color};">✓</span> {pt}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</div>

	<!-- ערכים -->
	<div class="mb-12">
		<h2 class="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
			<span class="w-10 h-10 rounded-full flex items-center justify-center text-base font-black text-[#1a1035]"
				style="background:linear-gradient(135deg,#facc15,#f59e0b);">✦</span>
			הערכים שמנחים אותנו
		</h2>
		<p class="text-gray-400 text-sm mb-7 max-w-2xl">לא רק פלטפורמה — תנועה חברתית</p>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each [
				['🤝','ערבות הדדית','כל אחד תורם וכל אחד מקבל — כי זו המשמעות האמיתית של קהילה'],
				['🔍','שקיפות מלאה','המודל הכלכלי פתוח ומפורסם. כולם יודעים לאן הולך כל שקל'],
				['🏛️','ביזור הכח','50% מהרווחים חוזרים לאנשים. אנחנו שייכים לכולם, לא לאחד'],
				['❤️','צדקה וחסד','20% לצדקה קבועה — כי חברה טובה דואגת לנצרכיה']
			] as [ico, title, desc]}
				<div class="rounded-2xl p-5 text-center"
					style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
					<div class="text-4xl mb-3">{ico}</div>
					<div class="font-black text-white mb-2">{title}</div>
					<p class="text-gray-400 text-xs leading-relaxed">{desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- מודל כלכלי -->
	<div class="mb-12 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6"
		style="background:linear-gradient(135deg,#1e1b4b,#312e81); border:1px solid rgba(250,204,21,0.2);">
		<div class="flex-1 text-right">
			<h3 class="text-xl md:text-2xl font-black text-yellow-300 mb-2">המודל הכלכלי-חברתי</h3>
			<p class="text-indigo-200 text-sm leading-relaxed">
				הפלטפורמה פועלת לפי מודל מבוזר וייחודי — 50% לבעלים, 30% לרכזי השכונות, 20% לצדקה.
				הפלטפורמה מתחלקת ל-20,000 יחידות. כל משפחה יכולה להחזיק עד 2,000 יחידות.
			</p>
		</div>
		<a href="/revenue"
			class="flex-shrink-0 flex items-center gap-2 px-7 py-4 rounded-2xl font-black text-base transition-all hover:scale-105 hover:brightness-110 shadow-lg"
			style="background:linear-gradient(135deg,#facc15,#f59e0b); color:#1a1035;">
			💰 לפירוט המלא ←
		</a>
	</div>

	<!-- CTA -->
	<div class="rounded-3xl px-8 py-14 text-center mb-4"
		style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%); border:1px solid rgba(255,255,255,0.1);">
		<h2 class="text-2xl md:text-4xl font-black mb-3">מוכן להצטרף לקהילה?</h2>
		<p class="text-indigo-200 text-base mb-8 max-w-lg mx-auto">הירשם עכשיו בחינם, מצא את השכונה שלך והתחל ליהנות מכל מה שהקהילה מציעה</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a href="/register"
				class="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-lg transition-all hover:scale-105 shadow-xl"
				style="background:linear-gradient(135deg,#7c3aed,#4f46e5); border:2px solid rgba(167,139,250,0.4); color:#fff;">
				🚀 הצטרף בחינם
			</a>
			<a href="/revenue"
				class="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:scale-105"
				style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1;">
				📈 רכישת מניות
			</a>
		</div>
	</div>

</div>
