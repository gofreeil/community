<script lang="ts">
    const categories = [
        { id: "business", label: "עסקים בשכונה", icon: "🏪" },
        { id: "events", label: "אירועים קרובים", icon: "📅" },
        { id: "help", label: "עזרה הדדית", icon: "🤝" },
        { id: "security", label: "ביטחון שכונתי", icon: "🛡️" },
    ];
</script>

<div
    class="relative w-full rounded-2xl border-4 border-purple-600 overflow-hidden shadow-2xl bg-[#0f172a]"
>
    <!-- Buttons Overlay -->
    <div
        class="absolute top-4 left-0 right-0 z-10 flex flex-wrap justify-center gap-3 px-4"
    >
        {#each categories as category}
            <button
                class="flex items-center gap-2 bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all hover:scale-105 backdrop-blur-sm border border-purple-200"
            >
                <span>{category.icon}</span>
                {category.label}
            </button>
        {/each}
    </div>

    <!-- Map Container -->
    <div class="w-full h-[500px]">
        <iframe
            title="מפת ירושלים"
            width="100%"
            height="100%"
            frameborder="0"
            style="border:0"
            src="https://www.google.com/maps/embed/v1/place?key=REPLACE_WITH_YOUR_API_KEY&q=Jerusalem,Israel&zoom=13"
            allowfullscreen
        ></iframe>
        <!-- Fallback if no API key: usando Google Maps Embed sem API Key (standard search) -->
        <iframe
            title="מפת ירושלים"
            width="100%"
            height="100%"
            style="border:0"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.8864700000003!2d35.21371!3d31.768319!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7d634c1f8b9%3A0x1028fca4a63b44a!2z15nXqNeV16nXnNep150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
        >
        </iframe>
    </div>

    <!-- Decoration -->
    <div
        class="absolute bottom-4 right-4 bg-purple-600/80 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold"
    >
        מפת הקהילה - ירושלים
    </div>
</div>

<style>
    /* Removing the first iframe if we are using the second one for stability without API key */
    iframe:first-of-type {
        display: none;
    }
</style>
