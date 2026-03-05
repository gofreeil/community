<script lang="ts">
    const packages = [
        {
            name: "באנר צד",
            icon: "📌",
            location: "סרגל ימין/שמאל",
            size: "144×560px",
            color: "from-blue-600 to-cyan-600",
            border: "border-blue-500/40",
            bg: "bg-blue-900/10",
            features: ["חשיפה גבוהה בכל עמוד", "קהל מקומי ממוקד", "לינק לאתר שלך"],
        },
        {
            name: "כרטיס תוכן",
            icon: "🖼️",
            location: "עמוד הבית - סרגל שמאל",
            size: "192×auto",
            color: "from-purple-600 to-pink-600",
            border: "border-purple-500/40",
            bg: "bg-purple-900/10",
            features: ["תמונה + כותרת + תיאור", "hover עם מידע נוסף", "לינק לאתר שלך"],
        },
        {
            name: "פרסומת נייד",
            icon: "📱",
            location: "בנר תחתון בנייד",
            size: "מסך מלא",
            color: "from-green-600 to-emerald-600",
            border: "border-green-500/40",
            bg: "bg-green-900/10",
            features: ["נראות מקסימלית בנייד", "מופיע לכל מבקר", "קישור ישיר לעסק"],
        },
    ];

    const stats = [
        { value: "500+", label: "מבקרים יומיים" },
        { value: "קרית משה", label: "קהל מקומי" },
        { value: "100%", label: "חשיפה שכונתית" },
    ];
</script>

<svelte:head>
    <title>פרסום באתר | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8 md:py-12" dir="rtl">
    <!-- Header -->
    <div class="text-center mb-10 md:mb-14">
        <div class="text-5xl mb-4">📢</div>
        <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-4">
            פרסם באתר הקהילה
        </h1>
        <p class="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            הגע לתושבי השכונה ישירות — קהל מקומי, ממוקד ומעורב
        </p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-12">
        {#each stats as stat}
            <div class="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6 text-center">
                <div class="text-2xl md:text-4xl font-black text-amber-400 mb-1">{stat.value}</div>
                <div class="text-xs md:text-sm text-gray-400">{stat.label}</div>
            </div>
        {/each}
    </div>

    <!-- Packages -->
    <h2 class="text-xl md:text-2xl font-black text-white mb-6 text-center">אפשרויות פרסום</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {#each packages as pkg}
            <div class="rounded-2xl border-2 {pkg.border} {pkg.bg} p-5 flex flex-col">
                <div class="text-3xl mb-3">{pkg.icon}</div>
                <h3 class="text-lg font-black text-white mb-1">{pkg.name}</h3>
                <p class="text-xs text-gray-400 mb-3">{pkg.location}</p>
                <div class="text-xs bg-white/10 rounded-lg px-2 py-1 text-gray-300 mb-4 inline-block w-fit">
                    {pkg.size}
                </div>
                <ul class="space-y-1.5 mt-auto">
                    {#each pkg.features as feature}
                        <li class="text-sm text-gray-300 flex items-center gap-2">
                            <span class="text-green-400 flex-shrink-0">✓</span>
                            {feature}
                        </li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>

    <!-- Pricing Table -->
    <h2 class="text-xl md:text-2xl font-black text-white mb-6 text-center flex items-center justify-center gap-2">
        💰 מחירון
    </h2>
    <div class="mb-12 overflow-x-auto rounded-2xl border border-white/10">
        <table class="w-full text-sm text-right">
            <thead>
                <tr class="bg-amber-500/20 border-b border-amber-500/30">
                    <th class="px-3 py-3 font-black text-amber-400 text-center">#</th>
                    <th class="px-3 py-3 font-black text-amber-400">סוג</th>
                    <th class="px-3 py-3 font-black text-amber-400 whitespace-nowrap">מחיר לחודש ₪<br/><span class="text-xs font-normal text-amber-400/70">(חצי שנה)</span></th>
                    <th class="px-3 py-3 font-black text-amber-400 whitespace-nowrap">לחודש<br/><span class="text-xs font-normal text-amber-400/70">בודד</span></th>
                    <th class="px-3 py-3 font-black text-amber-400">פריסה</th>
                    <th class="px-3 py-3 font-black text-amber-400">פרטים</th>
                </tr>
            </thead>
            <tbody>
                {#each [
                    { num: 1, type: "פרסומת ארוכה",   half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",    details: "מופיע ל-6 שניות בעולמות של 12 שניות" },
                    { num: 2, type: "עסק",              half: 25,  total: 150, single: 35, reach: "לכל שכונה רצויה",    details: "מופיע במפה וברשימה" },
                    { num: 3, type: "הוד",              half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",    details: "מופיע במפה וברשימה" },
                    { num: 4, type: "צימר / סאבלט",    half: 45,  total: 270, single: 60, reach: "לכל שכונה רצויה",    details: "מופיע במפה וברשימה" },
                    { num: 5, type: "דרושים לעבודה",   half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",    details: "מופיע רק ברשימה" },
                    { num: 6, type: "פניות פניות",      half: 20,  total: 120, single: 30, reach: "כולל רשימה ארצית",  details: "מופיע פניות" },
                    { num: 7, type: "פרסומת קבועה",    half: 60,  total: 360, single: 85, reach: "ארצי בלבד",          details: "קבוע" },
                ] as row, i}
                    <tr class="{i % 2 === 0 ? 'bg-white/3' : 'bg-white/5'} border-b border-white/5 hover:bg-amber-500/5 transition-colors">
                        <td class="px-3 py-3 text-center text-gray-400 font-bold">{row.num}</td>
                        <td class="px-3 py-3 font-bold text-white">{row.type}</td>
                        <td class="px-3 py-3 text-center">
                            <span class="text-amber-400 font-black">₪{row.half}</span>
                            <span class="text-gray-500 text-xs block">סה"כ ₪{row.total}</span>
                        </td>
                        <td class="px-3 py-3 text-center">
                            <span class="text-gray-300 font-bold">₪{row.single}</span>
                        </td>
                        <td class="px-3 py-3 text-gray-300 text-xs">{row.reach}</td>
                        <td class="px-3 py-3 text-gray-400 text-xs">{row.details}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- Contact CTA -->
    <div class="rounded-2xl bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-2 border-amber-500/40 p-6 md:p-10 text-center">
        <h2 class="text-2xl md:text-3xl font-black text-amber-400 mb-3">מעוניינים לפרסם?</h2>
        <p class="text-gray-300 mb-6 text-base md:text-lg">
            צרו איתנו קשר ונחזור אליכם עם כל הפרטים
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a
                href="mailto:ads@shchuna.co.il"
                class="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl text-base transition-all hover:scale-105 shadow-lg shadow-amber-500/30"
            >
                ✉️ שלח מייל
            </a>
            <a
                href="https://wa.me/972500000000"
                target="_blank"
                class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-6 py-3 rounded-xl text-base transition-all hover:scale-105 shadow-lg shadow-green-500/30"
            >
                💬 וואטסאפ
            </a>
        </div>
        <p class="text-gray-500 text-sm mt-4">ads@shchuna.co.il</p>
    </div>

    <!-- Secure Payment -->
    <div class="mt-8 rounded-2xl bg-white/3 border border-white/10 p-6 md:p-8" dir="rtl">
        <h2 class="text-xl md:text-2xl font-black text-white mb-2 text-center flex items-center justify-center gap-2">
            🔒 תשלום מאובטח
        </h2>
        <p class="text-gray-400 text-sm text-center mb-6">
            התשלום מתבצע בצורה מאובטחת דרך חברת הסליקה — פרטי האשראי שלך לא מגיעים אלינו
        </p>

        <!-- Payment methods -->
        <div class="flex flex-wrap justify-center gap-3 mb-6">
            {#each ["Visa", "Mastercard", "American Express", "Bit", "PayPal"] as method}
                <div class="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm font-bold text-gray-300">
                    {method}
                </div>
            {/each}
        </div>

        <!-- Meshulam integration placeholder -->
        <div class="rounded-xl border-2 border-dashed border-blue-500/40 bg-blue-900/10 p-6 text-center">
            <div class="text-3xl mb-3">💳</div>
            <h3 class="text-white font-black mb-1">סליקה מאובטחת</h3>
            <p class="text-gray-400 text-sm mb-4">
                מחוברים לחברת סליקה מורשית — עסקה מאובטחת ב-SSL
            </p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                    href="https://meshulam.co.il"
                    target="_blank"
                    class="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105"
                >
                    🔗 לדף התשלום — משולם
                </a>
                <a
                    href="https://grow.co.il"
                    target="_blank"
                    class="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105"
                >
                    🔗 לדף התשלום — Grow
                </a>
            </div>
            <p class="text-gray-600 text-xs mt-4">
                * לאחר השלמת הרכישה נצור איתכם קשר לתיאום פרסום תוך 24 שעות
            </p>
        </div>

        <!-- Security badges -->
        <div class="flex flex-wrap justify-center gap-4 mt-5">
            {#each [
                { icon: "🔒", label: "SSL מאובטח" },
                { icon: "✅", label: "PCI DSS תקן" },
                { icon: "🏦", label: "בנק ישראל מורשה" },
                { icon: "↩️", label: "החזר כספי תוך 14 יום" },
            ] as badge}
                <div class="flex items-center gap-1.5 text-xs text-gray-400">
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                </div>
            {/each}
        </div>
    </div>
</div>
