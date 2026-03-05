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
        { num: 3, type: "חוג",            half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 4, type: "צימר / סאבלט",  half: 45,  total: 270, single: 60, reach: "לכל שכונה רצויה",   details: "מופיע במפה וברשימה" },
        { num: 5, type: "דרושים לעבודה", half: 15,  total: 90,  single: 25, reach: "לכל שכונה רצויה",   details: "מופיע רק ברשימה" },
        { num: 6, type: "פניות פניות",   half: 20,  total: 120, single: 30, reach: "כולל רשימה ארצית",  details: "מופיע פניות" },
        { num: 7, type: "פרסומת קבועה",  half: 60,  total: 360, single: 85, reach: "ארצי בלבד",         details: "קבוע" },
    ];

    // ---- Calculator state: each row can be 'half' | 'single' | unset ----
    type Plan = 'half' | 'single';
    let planMap = $state<Map<number, Plan>>(new Map());

    function setPlan(num: number, plan: Plan) {
        const next = new Map(planMap);
        if (next.get(num) === plan) {
            next.delete(num);           // clicking active side = turn off
        } else {
            next.set(num, plan);
        }
        planMap = next;
    }

    let selectedItems  = $derived(
        rows
            .filter(r  => planMap.has(r.num))
            .map(r => ({ ...r, plan: planMap.get(r.num)! }))
    );

    // What they actually pay: half → 6-month package price, single → one month
    let totalPayment   = $derived(selectedItems.reduce((s, r) => s + (r.plan === 'half' ? r.total  : r.single), 0));
    // Monthly equivalent (for display)
    let totalMonthly   = $derived(selectedItems.reduce((s, r) => s + (r.plan === 'half' ? r.half   : r.single), 0));

    let halfItems      = $derived(selectedItems.filter(r => r.plan === 'half'));
    let singleItems    = $derived(selectedItems.filter(r => r.plan === 'single'));
    let hasSelection   = $derived(planMap.size > 0);

    // Build mailto body
    let mailtoBody = $derived(
        selectedItems.map(r =>
            `${r.type} — ${r.plan === 'half' ? `חצי שנה ₪${r.total}` : `חודש בודד ₪${r.single}`}`
        ).join('%0A') + `%0A%0Aסה״כ: ₪${totalPayment}`
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
                <div class="text-xs bg-white/10 rounded-lg px-2 py-1 text-gray-300 mb-4 inline-block w-fit">{pkg.size}</div>
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
    <p class="text-gray-400 text-sm text-center mb-6">
        הזז את המתג לבחירת תוכנית — המחשבון יחשב אוטומטית ↓
    </p>

    <div class="mb-6 overflow-x-auto rounded-2xl border border-white/10">
        <table class="w-full text-base text-right">
            <thead>
                <tr class="bg-amber-500/20 border-b border-amber-500/30">
                    <th class="px-4 py-4 font-black text-amber-400 text-center">#</th>
                    <th class="px-4 py-4 font-black text-amber-400">סוג</th>
                    <th class="px-4 py-4 font-black text-amber-400 whitespace-nowrap text-center">
                        לחודש ₪<br/><span class="text-sm font-normal text-amber-400/70">(חצי שנה)</span>
                    </th>
                    <th class="px-4 py-4 font-black text-amber-400 whitespace-nowrap text-center">
                        לחודש<br/><span class="text-sm font-normal text-amber-400/70">בודד</span>
                    </th>
                    <th class="px-4 py-4 font-black text-amber-400">פריסה</th>
                    <th class="px-4 py-4 font-black text-amber-400">פרטים</th>
                    <!-- Toggle column header — last = left side in RTL -->
                    <th class="px-4 py-4 text-center bg-white/8 border-r border-white/10">
                        <div class="flex flex-col items-center gap-1">
                            <span class="text-xs font-bold text-amber-400/80">½שנה</span>
                            <div class="flex items-center gap-1">
                                <div class="h-px w-4 bg-amber-500/50"></div>
                                <div class="w-2 h-2 rounded-full bg-white/30"></div>
                                <div class="h-px w-4 bg-blue-400/40"></div>
                            </div>
                            <span class="text-xs font-bold text-blue-400/80">חודש</span>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each rows as row, i}
                    {@const plan = planMap.get(row.num)}
                    <tr class="border-b border-white/5 transition-colors
                        {plan === 'half'   ? 'bg-amber-500/10'
                         : plan === 'single' ? 'bg-blue-500/10'
                         : i % 2 === 0      ? 'bg-white/3'
                         :                    'bg-white/5'}">

                        <td class="px-4 py-4 text-center font-bold
                            {plan ? 'text-amber-400' : 'text-gray-400'}">{row.num}</td>

                        <td class="px-4 py-4 font-bold
                            {plan === 'half' ? 'text-amber-300' : plan === 'single' ? 'text-blue-300' : 'text-white'}">{row.type}</td>

                        <td class="px-4 py-4 text-center">
                            <span class="font-black {plan === 'half' ? 'text-amber-300' : 'text-amber-400'}">₪{row.half}</span>
                            <span class="text-gray-500 text-sm block">סה"כ ₪{row.total}</span>
                        </td>

                        <td class="px-4 py-4 text-center">
                            <span class="font-bold {plan === 'single' ? 'text-blue-300' : 'text-gray-300'}">₪{row.single}</span>
                        </td>

                        <td class="px-4 py-4 text-gray-300 text-sm">{row.reach}</td>
                        <td class="px-4 py-4 text-gray-400 text-sm">{row.details}</td>

                        <!-- 3-state toggle — last column = left side in RTL -->
                        <td class="px-3 py-3 text-center border-r border-white/10"
                            style="background: {plan === 'half' ? 'rgba(245,158,11,0.12)' : plan === 'single' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)'}">
                            <div class="flex justify-center" onclick={(e) => e.stopPropagation()}>
                                <div
                                    class="relative inline-flex h-9 rounded-full transition-all duration-300"
                                    style="
                                        padding: 2px;
                                        background: {plan === 'half' ? 'rgba(245,158,11,0.15)' : plan === 'single' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)'};
                                        border: 1.5px solid {plan === 'half' ? 'rgba(245,158,11,0.5)' : plan === 'single' ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)'};
                                    "
                                >
                                    <!-- Half-year segment (right in RTL = first child) -->
                                    <button
                                        type="button"
                                        onclick={() => setPlan(row.num, 'half')}
                                        class="relative z-10 rounded-full px-3 text-xs font-black transition-all duration-200 whitespace-nowrap leading-none flex items-center"
                                        style="background: {plan === 'half' ? '#f59e0b' : 'transparent'}; color: {plan === 'half' ? '#000' : '#6b7280'};"
                                        title="חצי שנה"
                                    >½שנה</button>

                                    {#if !plan}
                                        <div class="self-center w-1 h-1 rounded-full bg-white/20 mx-0.5 flex-shrink-0"></div>
                                    {/if}

                                    <!-- Single-month segment (left in RTL = second child) -->
                                    <button
                                        type="button"
                                        onclick={() => setPlan(row.num, 'single')}
                                        class="relative z-10 rounded-full px-3 text-xs font-black transition-all duration-200 whitespace-nowrap leading-none flex items-center"
                                        style="background: {plan === 'single' ? '#3b82f6' : 'transparent'}; color: {plan === 'single' ? '#fff' : '#6b7280'};"
                                        title="חודש בודד"
                                    >חודש</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- ===== Calculator Banner ===== -->
    {#if hasSelection}
        <div class="mb-12 rounded-2xl border-2 border-white/20 bg-gradient-to-br from-gray-900 to-gray-950 p-6 md:p-8 shadow-2xl"
             style="animation: slideDown 0.3s ease-out;">

            <!-- Title -->
            <div class="flex items-center justify-center gap-3 mb-6">
                <span class="text-3xl">🧮</span>
                <h2 class="text-xl md:text-2xl font-black text-white">מחשבון פרסום</h2>
                <span class="bg-white/10 border border-white/20 text-gray-300 text-xs font-black px-2 py-0.5 rounded-full">
                    {planMap.size} נבחרו
                </span>
            </div>

            <!-- Selected items breakdown -->
            <div class="bg-black/40 rounded-xl border border-white/10 mb-6 overflow-hidden">
                <div class="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">פרסומות שנבחרו</p>
                    <div class="flex gap-3 text-[10px]">
                        {#if halfItems.length > 0}
                            <span class="text-amber-400 font-bold">🟡 {halfItems.length} חצי שנה</span>
                        {/if}
                        {#if singleItems.length > 0}
                            <span class="text-blue-400 font-bold">🔵 {singleItems.length} חודש בודד</span>
                        {/if}
                    </div>
                </div>
                <ul class="divide-y divide-white/5">
                    {#each selectedItems as item}
                        <li class="flex items-center justify-between px-4 py-3 gap-3">
                            <div class="flex items-center gap-2 min-w-0">
                                <button
                                    type="button"
                                    onclick={() => { const n = new Map(planMap); n.delete(item.num); planMap = n; }}
                                    class="text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                                    aria-label="הסר"
                                >✕</button>
                                <span class="font-bold text-sm truncate
                                    {item.plan === 'half' ? 'text-amber-200' : 'text-blue-200'}">{item.type}</span>
                            </div>
                            <div class="flex items-center gap-3 flex-shrink-0">
                                <!-- Plan badge -->
                                <span class="text-[10px] font-black px-2 py-0.5 rounded-full
                                    {item.plan === 'half'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}">
                                    {item.plan === 'half' ? '½ שנה' : 'חודש'}
                                </span>
                                <!-- Price -->
                                <span class="font-black text-sm {item.plan === 'half' ? 'text-amber-400' : 'text-blue-400'}">
                                    ₪{item.plan === 'half' ? item.total : item.single}
                                </span>
                                <span class="text-gray-600 text-xs">
                                    {item.plan === 'half' ? 'ל-6 חודשים' : 'לחודש'}
                                </span>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Total -->
            <div class="rounded-2xl border-2 border-white/20 bg-white/5 p-6 text-center mb-6">
                <p class="text-gray-400 text-sm mb-2 font-bold">סה"כ לתשלום</p>
                <p class="text-5xl md:text-6xl font-black text-white mb-2">₪{totalPayment}</p>
                <p class="text-gray-500 text-sm">
                    {#if halfItems.length > 0 && singleItems.length > 0}
                        כולל {halfItems.length} חבילות חצי שנה + {singleItems.length} חודשים בודדים
                    {:else if halfItems.length > 0}
                        חבילת חצי שנה • שווה ₪{totalMonthly} לחודש
                    {:else}
                        {singleItems.length} פרסומות לחודש אחד
                    {/if}
                </p>
            </div>

            <!-- Breakdown cards (only if both plan types selected) -->
            {#if halfItems.length > 0 && singleItems.length > 0}
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                        <p class="text-[10px] text-amber-400/70 font-bold uppercase mb-1">חצי שנה</p>
                        <p class="text-xl font-black text-amber-400">₪{halfItems.reduce((s,r) => s + r.total, 0)}</p>
                        <p class="text-[10px] text-gray-500">{halfItems.length} פרסומות × 6 חודשים</p>
                    </div>
                    <div class="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                        <p class="text-[10px] text-blue-400/70 font-bold uppercase mb-1">חודש בודד</p>
                        <p class="text-xl font-black text-blue-400">₪{singleItems.reduce((s,r) => s + r.single, 0)}</p>
                        <p class="text-[10px] text-gray-500">{singleItems.length} פרסומות × חודש</p>
                    </div>
                </div>
            {/if}

            <!-- CTA buttons -->
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                    href="mailto:ads@shchuna.co.il?subject=בקשת פרסום&body={mailtoBody}"
                    class="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 shadow-lg shadow-amber-500/20"
                >
                    ✉️ שלח בקשה — ₪{totalPayment}
                </a>
                <a
                    href="https://wa.me/972500000000?text=שלום, אני מעוניין לפרסם: {selectedItems.map(r => r.type).join(', ')}. סה״כ ₪{totalPayment}."
                    target="_blank"
                    class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105 shadow-lg shadow-green-500/20"
                >
                    💬 שלח בוואטסאפ
                </a>
            </div>

            <!-- Clear -->
            <div class="text-center mt-4">
                <button
                    type="button"
                    onclick={() => planMap = new Map()}
                    class="text-xs text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2"
                >נקה בחירה</button>
            </div>
        </div>

    {:else}
        <!-- Empty state -->
        <div class="mb-12 rounded-2xl border-2 border-dashed border-white/10 bg-white/2 p-5 text-center">
            <p class="text-gray-500 text-sm">
                🧮 הזז מתג בטבלה כדי לפתוח את
                <span class="text-white font-bold">מחשבון הפרסום</span>
            </p>
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

        <div class="flex flex-wrap justify-center gap-3 mb-6">
            {#each ["Visa", "Mastercard", "American Express", "Bit", "PayPal"] as method}
                <div class="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm font-bold text-gray-300">{method}</div>
            {/each}
        </div>

        <div class="rounded-xl border-2 border-dashed border-blue-500/40 bg-blue-900/10 p-6 text-center">
            <div class="text-3xl mb-3">💳</div>
            <h3 class="text-white font-black mb-1">סליקה מאובטחת</h3>
            <p class="text-gray-400 text-sm mb-4">מחוברים לחברת סליקה מורשית — עסקה מאובטחת ב-SSL</p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://meshulam.co.il" target="_blank"
                   class="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105">
                    🔗 לדף התשלום — משולם
                </a>
                <a href="https://grow.co.il" target="_blank"
                   class="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105">
                    🔗 לדף התשלום — Grow
                </a>
            </div>
            <p class="text-gray-600 text-xs mt-4">* לאחר השלמת הרכישה נצור איתכם קשר לתיאום פרסום תוך 24 שעות</p>
        </div>

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
        <p class="text-gray-300 mb-6 text-base md:text-lg">ליצירת קשר אנושי</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:ads@shchuna.co.il"
               class="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl text-base transition-all hover:scale-105 shadow-lg shadow-amber-500/30">
                ✉️ שלח מייל
            </a>
            <a href="https://wa.me/972500000000" target="_blank"
               class="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-6 py-3 rounded-xl text-base transition-all hover:scale-105 shadow-lg shadow-green-500/30">
                💬 וואטסאפ
            </a>
        </div>
        <p class="text-gray-500 text-sm mt-4">ads@shchuna.co.il</p>
    </div>
</div>

<style>
    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to   { opacity: 1; transform: translateY(0); }
    }
</style>
