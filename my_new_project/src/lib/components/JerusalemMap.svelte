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
</script>

<div class="flex flex-col gap-4">
<div class="flex flex-col gap-4">
    <!-- Buttons Container - Now OUTSIDE the map -->
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

    <!-- כפתור הרמת יד מיוחד -->
    <div class="flex justify-center">
        <button
            title="הרם יד לשאול שאלה או להציע רעיון"
            class="relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-2xl transition-all hover:scale-110 border-4 border-white/30 hover:border-white/50"
        >
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            <div class="relative flex items-center gap-3">
                <span class="text-3xl animate-wave">✋</span>
                <span>הרמת יד</span>
                <span class="text-2xl">💡</span>
            </div>
        </button>
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

    .animate-shimmer {
        animation: shimmer 3s infinite;
    }

    .animate-wave {
        display: inline-block;
        animation: wave 2s ease-in-out infinite;
    }
</style>

    <!-- Map Container -->
    <div
        class="relative w-full rounded-3xl border-4 border-purple-600 overflow-hidden shadow-2xl bg-[#0f172a]"
    >
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

        <!-- Decoration -->
        <div
            class="absolute bottom-4 right-4 bg-purple-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg"
        >
            📍 מפת הקהילה - ירושלים
        </div>
    </div>
</div>

<style>
    iframe {
        filter: contrast(1.1) brightness(0.95);
    }
</style>
