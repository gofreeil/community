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

    let viewMode: 'map' | 'list' = 'map';
    let isFlipping = false;
    let expandedCategories: Set<string> = new Set();

    function handleViewToggle() {
        isFlipping = true;
        setTimeout(() => {
            viewMode = viewMode === 'map' ? 'list' : 'map';
            isFlipping = false;
        }, 250);
    }

    function toggleCategory(categoryId: string) {
        if (expandedCategories.has(categoryId)) {
            expandedCategories.delete(categoryId);
        } else {
            expandedCategories.add(categoryId);
        }
        expandedCategories = expandedCategories; // trigger reactivity
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
        class="relative w-full rounded-3xl border-4 border-purple-600 shadow-2xl bg-[#0f172a] mb-8"
    >
        <!-- כפתור מעבר תצוגה - משולש מקופל בפינה -->
        <button
            on:click={handleViewToggle}
            class="page-corner absolute top-0 left-0 z-10 transition-all duration-500 hover:scale-110"
            class:flipping={isFlipping}
        >
            <svg width="100" height="100" viewBox="0 0 100 100" class="transition-transform duration-500">
                <defs>
                    <clipPath id="roundedCorner">
                        <path d="M 0,0 L 100,0 Q 0,0 0,100 Z" />
                    </clipPath>
                </defs>
                <polygon 
                    points="0,0 100,0 0,100" 
                    fill="#9333ea"
                    class="transition-all duration-500"
                    clip-path="url(#roundedCorner)"
                />
                <text 
                    x="35" 
                    y="32" 
                    fill="white" 
                    font-size="12" 
                    font-weight="bold" 
                    transform="rotate(-45 35 32)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === 'map' ? 'עבור לתצוגת' : 'עבור לתצוגת'}
                </text>
                <text 
                    x="35" 
                    y="45" 
                    fill="white" 
                    font-size="12" 
                    font-weight="bold" 
                    transform="rotate(-45 35 45)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === 'map' ? 'רשימה' : 'מפה'}
                </text>
            </svg>
        </button>

        {#if viewMode === 'map'}
            <!-- תצוגת מפה -->
            <div class="w-full h-[550px] overflow-hidden rounded-3xl">
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
        {:else}
            <!-- תצוגת רשימה -->
            <div class="w-full h-[550px] overflow-y-auto p-6 rounded-3xl">
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
        {/if}

        <!-- Decoration -->
        <div
            class="absolute bottom-4 right-4 bg-purple-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg"
        >
            {viewMode === 'map' ? '📍 מפת הקהילה - ירושלים' : '📋 רשימת שירותים'}
        </div>

        <!-- כפתור הרמת יד מיוחד - בתחתית המפה -->
        <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-20">
            <button
                title="בקש עזרה מהקהילה"
                class="relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold text-base shadow-xl transition-all hover:scale-105 border-4 border-purple-600"
            >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"></div>
                <div class="relative flex items-center gap-3">
                    <span class="text-2xl animate-wave-once">✋</span>
                    <span>הרמת יד</span>
                </div>
            </button>
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
</style>
