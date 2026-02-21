<script lang="ts">
    const categories = [
        { id: "benefits", label: "כל היתרונות", icon: "⭐" },
        { id: "gemachim", label: 'גמ"חים', icon: "🎁" },
        { id: "giveaway", label: "למסירה", icon: "📦" },
        { id: "business", label: "בייבי סיטר", icon: "👶" },
        { id: "minyanim", label: "יהדות", icon: "✡️" },
        { id: "realestate", label: "בתי הארחה לשבת", icon: "🏠" },
        { id: "security", label: "צימרים", icon: "🏡" },
        { id: "education", label: "חוגים", icon: "🎨" },
        { id: "kids", label: "לילדים", icon: "🧒" },
        { id: "shops", label: "חנויות", icon: "🏪" },
        { id: "transport", label: "טרמפים", icon: "🚗" },
    ];

    let viewMode: 'map' | 'list' = 'map';
    let isFlipping = false;

    function handleViewToggle() {
        isFlipping = true;
        setTimeout(() => {
            viewMode = viewMode === 'map' ? 'list' : 'map';
            isFlipping = false;
        }, 250);
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

        <!-- כפתור הרמת יד מיוחד - מתחת לכפתורים בצד ימין -->
        <div class="flex justify-start px-1">
            <button
                title="הרם יד לשאול שאלה או להציע רעיון"
                class="relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-xl transition-all hover:scale-105 border-2 border-white/30 hover:border-white/50"
            >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"></div>
                <div class="relative flex items-center gap-2">
                    <span class="text-xl animate-wave-once">✋</span>
                    <span>הרמת יד</span>
                </div>
            </button>
        </div>
    </div>
</div>

    <!-- Map Container -->
    <div
        class="relative w-full rounded-3xl border-4 border-purple-600 overflow-hidden shadow-2xl bg-[#0f172a]"
    >
        <!-- כפתור מעבר תצוגה - משולש מקופל בפינה -->
        <button
            on:click={handleViewToggle}
            class="page-corner absolute top-0 left-0 z-10 transition-all duration-500 hover:scale-110"
            class:flipping={isFlipping}
        >
            <svg width="100" height="100" viewBox="0 0 100 100" class="transition-transform duration-500">
                <polygon 
                    points="0,0 100,0 0,100" 
                    fill="#9333ea"
                    class="transition-all duration-500"
                />
                <text 
                    x="30" 
                    y="35" 
                    fill="white" 
                    font-size="9" 
                    font-weight="bold" 
                    transform="rotate(-45 30 35)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === 'map' ? 'עבור לתצוגת' : 'עבור לתצוגת'}
                </text>
                <text 
                    x="30" 
                    y="45" 
                    fill="white" 
                    font-size="9" 
                    font-weight="bold" 
                    transform="rotate(-45 30 45)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === 'map' ? 'רשימה' : 'מפה'}
                </text>
            </svg>
        </button>

        {#if viewMode === 'map'}
            <!-- תצוגת מפה -->
            <div class="w-full h-[550px]">
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
            <div class="w-full h-[550px] overflow-y-auto p-6">
                <h3 class="text-2xl font-bold text-white mb-6 text-center">רשימת שירותים בשכונה</h3>
                <div class="space-y-3">
                    {#each categories as category}
                        <div class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-4 hover:border-purple-500 transition-all hover:scale-102 cursor-pointer">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="text-3xl">{category.icon}</span>
                                    <span class="text-white font-bold text-lg">{category.label}</span>
                                </div>
                                <button class="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                                    צפה בפרטים
                                </button>
                            </div>
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

    iframe {
        filter: contrast(1.1) brightness(0.95);
    }
</style>
