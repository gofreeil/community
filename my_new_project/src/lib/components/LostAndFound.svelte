<script lang="ts">
    import { triggerAdPopup } from '$lib/adPopupStore';

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
    ];
</script>

<div
    class="rounded-2xl md:rounded-3xl bg-[#0f172a] border md:border-2 border-blue-500/30 overflow-hidden shadow-2xl flex flex-col h-full"
>
    <div
        class="bg-gradient-to-r from-blue-600 to-purple-600 p-2 md:p-4 flex items-center justify-between flex-shrink-0 h-12 md:h-auto"
    >
        <h3 class="text-sm md:text-lg font-bold text-white flex items-center gap-1 md:gap-2">
            <span class="text-base md:text-xl">🔍</span>
            אבדות ומציאות
        </h3>
        <a
            href="/lost-and-found/add"
            class="inline-flex items-center self-center bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-2 py-1 rounded-full transition-colors border border-white/20 flex-shrink-0"
        >
            + הוסף
        </a>
    </div>

    <div class="p-2 md:p-4 flex-1 overflow-hidden">
        <!-- Mobile: show only 2 items -->
        <div class="md:hidden space-y-2">
            {#each lostItems.slice(0, 2) as item}
                <div
                    class="relative p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all group overflow-hidden cursor-pointer"
                    role="button"
                    tabindex="0"
                    onclick={() => triggerAdPopup()}
                    onkeydown={(e) => e.key === 'Enter' && triggerAdPopup()}
                >
                    <!-- Type Badge -->
                    <div
                        class="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider {item.type ===
                        'found'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'} rounded-br"
                    >
                        {item.type === "found" ? "נמצא" : "אבד"}
                    </div>

                    <div class="mt-2">
                        <h4
                            class="font-bold text-white text-xs mb-1 group-hover:text-blue-400 transition-colors leading-tight"
                        >
                            {item.title}
                        </h4>
                        <div class="flex items-center gap-1.5 text-xs text-gray-400">
                            <span>📍 {item.location}</span>
                            <span>•</span>
                            <span>🕒 {item.date}</span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Desktop: show all items -->
        <div class="hidden md:block space-y-4">
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
                        class="mt-3 w-full py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-500/30"
                    >
                        פרטים ליצירת קשר
                    </button>
                </div>
            {/each}
        </div>

        <div class="mt-2 md:mt-8 text-center">
            <button
                class="text-blue-400 hover:text-white text-[10px] md:text-sm font-bold transition-colors underline underline-offset-2"
            >
                לצפייה בכל המודעות...
            </button>
        </div>
    </div>
</div>
