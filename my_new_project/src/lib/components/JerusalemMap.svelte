<script lang="ts">
    const categories = [
        { id: "benefits", label: "כל היתרונות", icon: "⭐" },
        { id: "gemachim", label: 'גמ"חים', icon: "🎁", items: ["גמ\"ח ספרים", "גמ\"ח כלים", "גמ\"ח ציוד לתינוקות", "גמ\"ח בגדים"] },
        { id: "giveaway", label: "למסירה", icon: "📦", items: ["רהיטים", "מוצרי חשמל", "ספרים", "בגדים", "צעצועים"] },
        { id: "business", label: "בייבי סיטר", icon: "👶", items: ["בייבי סיטר בשעות הערב", "בייבי סיטר סופי שבוע", "בייבי סיטר קבוע"] },
        { id: "minyanim", label: "יהדות", icon: "✡️", items: ["מניינים לתפילה", "שיעורי תורה", "מקוואות", "בתי כנסת"] },
        { id: "realestate", label: "בתי הארחה לשבת", icon: "🏠", items: ["בתי הארחה משפחתיים", "בתי הארחה לזוגות", "בתי הארחה ליחידים"] },
        { id: "security", label: "צימרים", icon: "🏡", items: ["צימרים זוגיים", "צימרים משפחתיים", "צימרים עם בריכה"] },
        { id: "education", label: "חוגים", icon: "🎨", items: ["חוגי ספורט", "חוגי אומנות", "חוגי מוזיקה", "חוגי מדעים"] },
        { id: "kids", label: "לילדים", icon: "🧒", items: ["גני משחקים", "פעילויות לילדים", "ספריות לילדים", "מועדוניות"] },
        { id: "shops", label: "חנויות", icon: "🏪", items: ["מכולת", "מאפייה", "בית מרקחת", "חנות בגדים", "דואר", "מסעדות", "בנקים", "כספומט"] },
        { id: "transport", label: "טרמפים", icon: "🚗", items: ["נוסע קבוע ל...", "נוסע חד פעמי ומוכן לצרף טרמפיסט", "דרוש טרמפ"] },
    ];

    let viewMode: 'map' | 'list' | 'add' = 'map';
    let isFlipping = false;
    let expandedCategories: Set<string> = new Set();
    let isLoggedIn = false; // במציאות זה יבוא מניהול משתמשים
    let showHelpMenu = false;

    const helpOptions = [
        { id: 1, text: "זקוק לעזרה למבוגר", icon: "👴" },
        { id: 2, text: "זקוק לעזרה עם הרכב להתנעה", icon: "🚗" },
        { id: 3, text: "הלך ילד לאיבוד", icon: "👶" },
        { id: 4, text: "אחר - כתוב את העזרה הזקוקה לך", icon: "✍️" }
    ];

    function handleViewToggle() {
        isFlipping = true;
        setTimeout(() => {
            viewMode = viewMode === 'map' ? 'list' : 'map';
        }, 350); // Change content at middle of animation
        setTimeout(() => {
            isFlipping = false;
        }, 700);
    }

    function handleAddAdvantage() {
        isFlipping = true;
        setTimeout(() => {
            viewMode = 'add';
        }, 350);
        setTimeout(() => {
            isFlipping = false;
        }, 700);
    }

    function toggleCategory(categoryId: string) {
        if (expandedCategories.has(categoryId)) {
            expandedCategories.delete(categoryId);
        } else {
            expandedCategories.add(categoryId);
        }
        expandedCategories = expandedCategories; // trigger reactivity
    }

    function handleAddItem(categoryId: string) {
        if (!isLoggedIn) {
            alert('יש להירשם כדי להוסיף פריטים. מעבר לדף הרשמה...');
            // כאן תוכל להוסיף ניווט לדף הרשמה
            return;
        }
        // כאן תוכל להוסיף לוגיקה להוספת פריט
        alert(`הוספת פריט לקטגוריה: ${categories.find(c => c.id === categoryId)?.label}`);
    }

    function handleHelpRequest(optionId: number) {
        const option = helpOptions.find(o => o.id === optionId);
        if (optionId === 4) {
            // אפשרות "אחר" - פתח טופס
            const customHelp = prompt('תאר את העזרה שאתה זקוק לה:');
            if (customHelp) {
                alert(`בקשת עזרה נשלחה: ${customHelp}`);
            }
        } else {
            alert(`בקשת עזרה נשלחה: ${option?.text}`);
        }
        showHelpMenu = false;
    }
</script>

<div class="flex flex-col gap-4">
<div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
        <!-- Buttons Container -->
        <div class="flex flex-wrap justify-center gap-2 p-1">
            {#each categories as category}
                <button
                    title="לחץ כדי לסנן במפה"
                    class="flex items-center gap-1.5 {category.id === 'benefits' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500' : 'bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 border-purple-300'} px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all hover:scale-105 border"
                >
                    <span class="text-base">{category.icon}</span>
                    {category.label}
                </button>
            {/each}
        </div>
    </div>
</div>

    <!-- Map Container -->
    <div
        class="relative w-full border-4 border-purple-600 shadow-2xl bg-[#0f172a] mb-8 transition-all duration-700"
        style="border-radius: 24px; transform-style: preserve-3d;"
        class:flipping-container={isFlipping}
    >
        <!-- כפתור מעבר תצוגה - משולש מקופל בפינה -->
        <button
            on:click={handleViewToggle}
            class="page-corner absolute top-0 left-0 z-10 transition-all duration-500 hover:scale-110"
            class:flipping={isFlipping}
        >
            <svg width="130" height="130" viewBox="0 0 130 130" class="transition-transform duration-500">
                <path 
                    d="M 0,24 Q 0,0 24,0 L 130,0 L 0,130 Z" 
                    fill="#9333ea"
                    class="transition-all duration-500"
                />
                <text 
                    x="50" 
                    y="42" 
                    fill="white" 
                    font-size="14" 
                    font-weight="bold" 
                    transform="rotate(-45 50 42)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === 'map' ? 'עבור לתצוגת' : 'עבור לתצוגת'}
                </text>
                <text 
                    x="52" 
                    y="58" 
                    fill="white" 
                    font-size="14" 
                    font-weight="bold" 
                    transform="rotate(-45 52 58)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === 'map' ? 'רשימה' : 'מפה'}
                </text>
            </svg>
        </button>

        {#if viewMode === 'map'}
            <!-- תצוגת מפה -->
            <div class="w-full h-[550px] overflow-hidden" style="border-radius: 20px;">
                <iframe
                    title="מפת ירושלים"
                    width="100%"
                    height="100%"
                    style="border:0"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.8864700000003!2d35.21371!3d31.768319!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7d634c1f8b9%3A0x1028fca4a63b44a!2z15nXqNeV16nXnNep150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil"
                    allowfullscreen
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                >
                </iframe>
            </div>
        {:else if viewMode === 'list'}
            <!-- תצוגת רשימה -->
            <div class="w-full h-[550px] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20" style="border-radius: 20px;">
                <h3 class="text-2xl font-bold text-white mb-6 text-center">כל היתרונות בשכונה</h3>
                <div class="space-y-3">
                    {#each categories.filter(cat => cat.id !== 'benefits') as category}
                        <div class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl overflow-hidden transition-all">
                            <button 
                                on:click={() => toggleCategory(category.id)}
                                class="w-full p-4 hover:border-purple-500 transition-all hover:bg-purple-900/20 cursor-pointer"
                            >
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <span class="text-3xl">{category.icon}</span>
                                        <span class="text-white font-bold text-lg">{category.label}</span>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-purple-400 text-sm">{category.items?.length || 0} פריטים</span>
                                        <svg 
                                            class="w-6 h-6 text-purple-400 transition-transform duration-300 {expandedCategories.has(category.id) ? 'rotate-180' : ''}"
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                            
                            {#if expandedCategories.has(category.id) && category.items}
                                <div class="px-4 pb-4 space-y-2 animate-slideDown">
                                    {#each category.items as item}
                                        <div class="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 hover:bg-purple-900/30 hover:border-purple-500/40 transition-all cursor-pointer">
                                            <div class="flex items-center justify-between">
                                                <span class="text-white text-sm">• {item}</span>
                                                <button class="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors">
                                                    פרטים
                                                </button>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <!-- תצוגת הוספת יתרון -->
            <div class="w-full h-[550px] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20" style="border-radius: 20px;">
                <h3 class="text-2xl font-bold text-white mb-4 text-center">הוסף יתרון חדש</h3>
                <p class="text-center text-gray-400 text-sm mb-6">בחר קטגוריה והוסף פריט חדש</p>
                <div class="space-y-3">
                    {#each categories.filter(cat => cat.id !== 'benefits') as category}
                        <button
                            on:click={() => handleAddItem(category.id)}
                            class="w-full bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-4 hover:border-green-500 hover:from-green-900/40 hover:to-emerald-900/40 transition-all cursor-pointer"
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="text-3xl">{category.icon}</span>
                                    <span class="text-white font-bold text-lg">{category.label}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-green-400 text-sm">הוסף פריט</span>
                                    <span class="text-2xl text-green-400">➕</span>
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Decoration -->
        <div
            class="absolute bottom-4 right-4 bg-purple-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg"
        >
            {viewMode === 'map' ? '📍 מפת הקהילה - ירושלים' : '📋 רשימת שירותים'}
        </div>

        <!-- כפתור הוסף יתרון - בחלק העליון -->
        <div class="absolute left-1/2 transform -translate-x-1/2 z-20" style="top: -10px;">
            <button
                on:click={handleAddAdvantage}
                title="הוסף יתרון חדש לשכונה"
                class="relative group overflow-hidden bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 hover:from-green-400 hover:via-emerald-400 hover:to-teal-500 text-white px-3 py-1.5 rounded-lg font-bold text-base shadow-xl transition-all hover:scale-105 border-2 border-purple-600"
            >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"></div>
                <div class="relative flex items-center gap-1.5">
                    <span class="text-[10px]">➕</span>
                    <span>הוסף</span>
                </div>
            </button>
        </div>

        <!-- כפתור הרמת יד מיוחד - בתחתית המפה -->
        <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-20">
            <button
                on:click={() => showHelpMenu = !showHelpMenu}
                title="בקש עזרה מהקהילה"
                class="relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold text-base shadow-xl transition-all hover:scale-105 border-4 border-purple-600"
            >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"></div>
                <div class="relative flex items-center gap-3">
                    <span class="text-2xl animate-wave-once">✋</span>
                    <span>הרמת יד</span>
                </div>
            </button>

            <!-- תפריט עזרה -->
            {#if showHelpMenu}
                <div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-80 bg-white rounded-xl shadow-2xl border-2 border-purple-600 overflow-hidden animate-slideDown">
                    <div class="bg-gradient-to-r from-red-500 to-pink-500 p-3 text-center">
                        <h3 class="text-white font-bold text-lg">באיזו עזרה אתה זקוק?</h3>
                    </div>
                    <div class="p-2">
                        {#each helpOptions as option}
                            <button
                                on:click={() => handleHelpRequest(option.id)}
                                class="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors text-right border-b border-gray-200 last:border-b-0"
                            >
                                <span class="text-2xl">{option.icon}</span>
                                <span class="text-gray-800 font-medium text-sm">{option.text}</span>
                            </button>
                        {/each}
                    </div>
                    <button
                        on:click={() => showHelpMenu = false}
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
                    >
                        ביטול
                    </button>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }

    @keyframes wave {
        0%, 100% {
            transform: rotate(0deg);
        }
        25% {
            transform: rotate(-15deg);
        }
        75% {
            transform: rotate(15deg);
        }
    }

    .animate-shimmer-once {
        animation: shimmer 2s ease-in-out 1;
    }

    .animate-wave-once {
        display: inline-block;
        animation: wave 1.5s ease-in-out 1;
    }

    .page-corner {
        cursor: pointer;
    }

    .page-corner.flipping {
        animation: flip 0.5s ease-in-out;
    }

    @keyframes flip {
        0% {
            transform: rotateY(0deg);
        }
        50% {
            transform: rotateY(90deg);
        }
        100% {
            transform: rotateY(0deg);
        }
    }

    @keyframes peelPage {
        0% {
            transform: rotate(0deg) scale(1);
            transform-origin: top left;
        }
        50% {
            transform: rotate(-15deg) scale(1.3);
            transform-origin: top left;
        }
        100% {
            transform: rotate(0deg) scale(1);
            transform-origin: top left;
        }
    }

    @keyframes flipContainer {
        0% {
            transform: perspective(1000px) rotateY(0deg);
        }
        50% {
            transform: perspective(1000px) rotateY(-90deg);
        }
        100% {
            transform: perspective(1000px) rotateY(0deg);
        }
    }

    .flipping-container {
        animation: flipContainer 0.7s ease-in-out;
    }

    .page-corner.flipping {
        animation: peelPage 0.5s ease-in-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            max-height: 0;
        }
        to {
            opacity: 1;
            max-height: 500px;
        }
    }

    .animate-slideDown {
        animation: slideDown 0.3s ease-out;
    }

    iframe {
        filter: contrast(1.1) brightness(0.95);
    }

    /* Hide Google Maps controls */
    iframe {
        pointer-events: auto;
    }

    /* Custom scrollbar styling */
    :global(.scrollbar-thin::-webkit-scrollbar) {
        width: 8px;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-track) {
        background: rgba(88, 28, 135, 0.2);
        border-radius: 10px;
        margin: 20px 0;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-thumb) {
        background: #9333ea;
        border-radius: 10px;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-thumb:hover) {
        background: #a855f7;
    }
</style>
