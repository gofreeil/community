<script lang="ts">
    const categories = [
        { id: "business", label: "בייבי סיטר", icon: "🏪" },
        { id: "gemachim", label: 'גמ"חים', icon: "🎁" },
        { id: "minyanim", label: "מניינים לתפילה", icon: "🕍" },
        { id: "events_board", label: "לוח אירועים", icon: "📅" },
        { id: "giveaway", label: "למסירה", icon: "📦" },
        { id: "help", label: "עזרה הדדית", icon: "🤝" },
        { id: "security", label: "צימרים", icon: "🏡" },
        { id: "education", label: "חינוך וחוגים", icon: "🎓" },
        { id: "realestate", label: "בתי הארחה לשבת", icon: "🏠" },
        { id: "transport", label: "נסיעות", icon: "🚌" },
        { id: "community", label: "מועצת תושבים", icon: "🗳️" },
    ];
</script>

<div class="flex flex-col gap-4">
    <!-- Buttons Container - Now OUTSIDE the map -->
    <div class="flex flex-wrap justify-center gap-2 p-1">
        {#each categories as category}
            <button
                class="flex items-center gap-2 bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-105 border border-purple-300"
            >
                <span class="text-lg">{category.icon}</span>
                {category.label}
            </button>
        {/each}
    </div>

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
