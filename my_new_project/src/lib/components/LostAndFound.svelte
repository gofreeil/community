<script lang="ts">
    const lostItems = [
        {
            id: 1,
            title: "מצאתי צרור מפתחות",
            location: "רחוב המלך ג'ורג'",
            date: "לפני שעתיים",
            type: "found",
        },
        {
            id: 2,
            title: "אבד כלב מסוג פודל",
            location: "שכונת רחביה",
            date: "אתמול",
            type: "lost",
        },
        {
            id: 3,
            title: "נמצא כרטיס רב-קו",
            location: "תחנה מרכזית",
            date: "הבוקר",
            type: "found",
        },
        {
            id: 4,
            title: "אבדו משקפי ראייה",
            location: "גן סאקר",
            date: "יומיים",
            type: "lost",
        },
    ];
</script>

<div
    class="rounded-3xl bg-[#0f172a] border-2 border-blue-500/30 overflow-hidden shadow-2xl"
>
    <div
        class="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between"
    >
        <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <span class="text-2xl">🔍</span>
            לוח אבדות ומציאות קהילתי
        </h3>
        <button
            class="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors border border-white/20"
        >
            פרסם מודעה חדשה +
        </button>
    </div>

    <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {#each lostItems as item}
                <div
                    class="relative p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group overflow-hidden"
                >
                    <!-- Type Badge -->
                    <div
                        class="absolute top-0 left-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider {item.type ===
                        'found'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'} rounded-br-xl"
                    >
                        {item.type === "found" ? "נמצא" : "אבד"}
                    </div>

                    <div class="mt-4">
                        <h4
                            class="font-bold text-white text-sm mb-1 group-hover:text-blue-400 transition-colors"
                        >
                            {item.title}
                        </h4>
                        <div class="flex flex-col gap-1">
                            <span
                                class="text-[11px] text-gray-400 flex items-center gap-1"
                            >
                                📍 {item.location}
                            </span>
                            <span
                                class="text-[11px] text-gray-500 flex items-center gap-1"
                            >
                                🕒 {item.date}
                            </span>
                        </div>
                    </div>

                    <button
                        class="mt-4 w-full py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-500/30"
                    >
                        פרטים ליצירת קשר
                    </button>
                </div>
            {/each}
        </div>

        <div class="mt-6 text-center">
            <button
                class="text-blue-400 hover:text-white text-sm font-bold transition-colors underline underline-offset-4"
            >
                לצפייה בכל המודעות בלוח...
            </button>
        </div>
    </div>
</div>
