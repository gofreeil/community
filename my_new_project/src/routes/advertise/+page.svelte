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

    const rows = [
        { num: 1, type: "פרסומת ארוכה",  half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע ל-6 שניות בעולמות של 12 שניות" },
        { num: 2, type: "עסק",            half: 25,  total: 150, single: 35, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 3, type: "הוד",            half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 4, type: "צימר / סאבלט",  half: 45,  total: 270, single: 60, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 5, type: "דרושים לעבודה", half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע רק ברשימה" },
        { num: 6, type: "פניות פניות",   half: 20,  total: 120, single: 30, reach: "כולל רשימה ארצית",  details: "מופיע פניות" },
        { num: 7, type: "פרסומת קבועה",  half: 60,  total: 360, single: 85, reach: "ארצי בלבד",         details: "קבוע" },
    ];

    // --- Calculator state ---
    let selected = $state<Set<number>>(new Set());

    function toggleRow(num: number) {
        const next = new Set(selected);
        if (next.has(num)) {
            next.delete(num);
        } else {
            next.add(num);
        }
        selected = next;
    }

    let selectedItems  = $derived(rows.filter(r => selected.has(r.num)));
    let monthlyHalf    = $derived(selectedItems.reduce((s, r) => s + r.half,   0));
    let totalSixMonths = $derived(selectedItems.reduce((s, r) => s + r.total,  0));
    let monthlySingle  = $derived(selectedItems.reduce((s, r) => s + r.single, 0));
    let hasSelection   = $derived(selected.size > 0);

    // Discount percentage for 6-month deal
    let discountPct = $derived(
        monthlySingle > 0
            ? Math.round((1 - monthlyHalf / monthlySingle) * 100)
            : 0
    );
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
    <h2 class="text-xl md:text-2xl font-black text-white mb-2 text-center flex items-center justify-center gap-2">
        💰 מחירון
    </h2>
    <p class="text-gray-400 text-sm text-center mb-6">סמן שורות כדי לחשב את עלות הפרסום שלך ↓</p>
    <div class="mb-6 overflow-x-auto rounded-2xl border border-white/10">
        <table class="w-full text-sm text-right">
            <thead>
                <tr class="bg-amber-500/20 border-b border-amber-500/30">
                    <th class="px-3 py-3 font-black text-amber-400 text-center w-12">בחר</th>
                    <th class="px-3 py-3 font-black text-amber-400 text-center">#</th>
                    <th class="px-3 py-3 font-black text-amber-400">סוג</th>
                    <th class="px-3 py-3 font-black text-amber-400 whitespace-nowrap">לחודש ₪<br/><span class="text-xs font-normal text-amber-400/70">(חצי שנה)</span></th>
                    <th class="px-3 py-3 font-black text-amber-400 whitespace-nowrap">לחודש<br/><span class="text-xs font-normal text-amber-400/70">בודד</span></th>
                    <th class="px-3 py-3 font-black text-amber-400">פריסה</th>
                    <th class="px-3 py-3 font-black text-amber-400">פרטים</th>
                </tr>
            </thead>
            <tbody>
                {#each rows as row, i}
                    {@const isSelected = selected.has(row.num)}
                    <tr
                        class="border-b border-white/5 transition-colors cursor-pointer
                            {isSelected
                                ? 'bg-amber-500/15 border-amber-500/20'
                                : i % 2 === 0 ? 'bg-white/3 hover:bg-amber-500/5' : 'bg-white/5 hover:bg-amber-500/5'}"
                        onclick={() => toggleRow(row.num)}
                    >
                        <!-- Checkbox button -->
                        <td class="px-3 py-3 text-center">
                            <button
                                type="button"
                                onclick={(e) => { e.stopPropagation(); toggleRow(row.num); }}
                                class="w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all
                                    {isSelected
                                        ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/30 scale-110'
                                        : 'border-white/30 bg-white/5 hover:border-amber-400 hover:bg-amber-500/10'}"
                                aria-label="בחר שורה"
                            >
                                {#if isSelected}
                                    <span class="text-sm font-black leading-none">✓</span>
                                {/if}
                            </button>
                        </td>
                        <td class="px-3 py-3 text-center font-bold {isSelected ? 'text-amber-400' : 'text-gray-400'}">{row.num}</td>
                        <td class="px-3 py-3 font-bold {isSelected ? 'text-amber-300' : 'text-white'}">{row.type}</td>
                        <td class="px-3 py-3 text-center">
                            <span class="font-black {isSelected ? 'text-amber-300' : 'text-amber-400'}">₪{row.half}</span>
                            <span class="text-gray-500 text-xs block">סה"כ ₪{row.total}</span>
                        </td>
                        <td class="px-3 py-3 text-center">
                            <span class="font-bold {isSelected ? 'text-white' : 'text-gray-300'}">₪{row.single}</span>
                        </td>
                        <td class="px-3 py-3 text-gray-300 text-xs">{row.reach}</td>
                        <td class="px-3 py-3 text-gray-400 text-xs">{row.details}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- ===== Calculator Banner ===== -->
    {#if hasSelection}
        <div class="mb-12 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/60 to-yellow-950/40 p-6 md:p-8 shadow-xl shadow-amber-500/10"
             style="animation: slideDown 0.3s ease-out;">
            <!-- Title -->
            <div class="flex items-center justify-center gap-3 mb-6">
                <span class="text-3xl">🧮</span>
                <h2 class="text-xl md:text-2xl font-black text-amber-400">מחשבון פרסום</h2>
                <span class="bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
                    {selected.size} נבחרו
                </span>
            </div>

            <!-- Selected items breakdown -->
            <div class="bg-black/30 rounded-xl border border-white/10 mb-6 overflow-hidden">
                <div class="px-4 py-2 bg-white/5 border-b border-white/10">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">פרסומות שנבחרו</p>
                </div>
                <ul class="divide-y divide-white/5">
                    {#each selectedItems as item}
                        <li class="flex items-center justify-between px-4 py-3">
                            <div class="flex items-center gap-2">
                                <button
                                    type="button"
                                    onclick={() => toggleRow(item.num)}
                                    class="text-gray-500 hover:text-red-400 transition-colors text-xs leading-none"
                                    aria-label="הסר"
                                >✕</button>
                                <span class="text-white font-bold text-sm">{item.type}</span>
                                <span class="text-gray-500 text-xs">({item.reach})</span>
                            </div>
                            <div class="text-left flex gap-4 shrink-0">
                                <div class="text-center">
                                    <span class="text-amber-400 font-black text-sm">₪{item.half}</span>
                                    <span class="text-gray-500 text-xs block">לחודש</span>
                                </div>
                                <div class="text-center">
                                    <span class="text-gray-400 font-bold text-sm">₪{item.single}</span>
                                    <span class="text-gray-600 text-xs block">בודד</span>
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Totals -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <!-- Half-year monthly -->
                <div class="rounded-xl bg-amber-500/15 border border-amber-500/30 p-4 text-center">
                    <p class="text-xs text-amber-400/70 mb-1 font-bold uppercase tracking-wide">לחודש (חצי שנה)</p>
                    <p class="text-3xl font-black text-amber-400">₪{monthlyHalf}</p>
                    {#if discountPct > 0}
                        <p class="text-xs text-green-400 mt-1 font-bold">חיסכון של {discountPct}%</p>
                    {/if}
                </div>

                <!-- 6-month total -->
                <div class="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                    <p class="text-xs text-gray-400 mb-1 font-bold uppercase tracking-wide">סה"כ ל-6 חודשים</p>
                    <p class="text-3xl font-black text-white">₪{totalSixMonths}</p>
                    <p class="text-xs text-gray-500 mt-1">תשלום חד-פעמי</p>
                </div>

                <!-- Single month -->
                <div class="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
                    <p class="text-xs text-gray-400 mb-1 font-bold uppercase tracking-wide">חודש בודד</p>
                    <p class="text-3xl font-black text-gray-300">₪{monthlySingle}</p>
                    <p class="text-xs text-gray-500 mt-1">ללא הנחה</p>
                </div>
            </div>

            <!-- Savings callout -->
            {#if discountPct > 0}
                <div class="rounded-xl bg-green-900/20 border border-green-500/30 px-4 py-3 mb-6 flex items-center gap-3">
                    <span class="text-2xl">💡</span>
                    <p class="text-sm text-green-300">
                        <span class="font-black">חבילת חצי שנה חוסכת לך ₪{monthlySingle * 6 - totalSixMonths}</span>
                        <span class="text-green-400/70"> לעומת חודש בודד × 6</span>
                    </p>
                </div>
            {/if}

            <!-- CTA buttons -->
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                    href="mailto:ads@shchuna.co.il?subject=בקשת פרסום — {selectedItems.map(i => i.type).join(', ')}&body=שלום, אני מעוניין לפרסם: {selectedItems.map(i => `${i.type} (₪${i.half} לחודש)`).join(', ')}. סה״כ: ₪{monthlyHalf} לחודש (חצי שנה)."
                    class="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 shadow-lg shadow-amber-500/30"
                >
                    ✉️ שלח בקשה למחיר זה
                </a>
                <a
                    href="https://wa.me/972500000000?text=שלום, אני מעוניין לפרסם: {selectedItems.map(i => i.type).join(', ')}. סה״כ ₪{monthlyHalf} לחודש (חצי שנה)."
                    target="_blank"
                    class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 shadow-lg shadow-green-500/30"
                >
                    💬 שלח בוואטסאפ
                </a>
            </div>

            <!-- Clear selection -->
            <div class="text-center mt-4">
                <button
                    type="button"
                    onclick={() => selected = new Set()}
                    class="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
                >
                    נקה בחירה
                </button>
            </div>
        </div>
    {:else}
        <!-- Empty state hint -->
        <div class="mb-12 rounded-2xl border-2 border-dashed border-white/10 bg-white/2 p-6 text-center">
            <p class="text-gray-500 text-sm">🧮 סמן שורות בטבלה כדי לפתוח את <span class="text-amber-400 font-bold">מחשבון הפרסום</span></p>
        </div>
    {/if}

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

    <!-- Contact CTA -->
    <div class="mt-8 rounded-2xl bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-2 border-amber-500/40 p-6 md:p-10 text-center">
        <h2 class="text-2xl md:text-3xl font-black text-amber-400 mb-3">ליצירת קשר</h2>
        <p class="text-gray-300 mb-6 text-base md:text-lg">
            ליצירת קשר אנושי
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
</div>

<style>
    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-12px); }
        to   { opacity: 1; transform: translateY(0); }
    }
</style>
