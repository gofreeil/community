<script lang="ts">
    const coaliUrl = "https://coali.app/?channel=%D7%99%D7%95%D7%A6%D7%90%D7%99%D7%9D-%D7%9C%D7%97%D7%99%D7%A8%D7%95%D7%AA-mkobk902";
    let iframeLoaded = $state(false);
    let iframeFailed = $state(false);
    let loadTimeout: ReturnType<typeof setTimeout>;

    function handleLoad() {
        iframeLoaded = true;
        clearTimeout(loadTimeout);
    }

    function handleError() {
        iframeFailed = true;
        clearTimeout(loadTimeout);
    }

    import { onMount } from "svelte";
    onMount(() => {
        loadTimeout = setTimeout(() => {
            if (!iframeLoaded) iframeFailed = true;
        }, 8000);
        return () => clearTimeout(loadTimeout);
    });
</script>

<div class="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-cyan-900/40 border-2 border-blue-500/40 shadow-2xl -mx-2 md:mx-0">
    <!-- Header -->
    <div class="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 p-3 md:p-4 flex items-center justify-between">
        <div class="flex items-center gap-2 md:gap-3">
            <span class="text-2xl md:text-3xl">🗳️</span>
            <div>
                <h3 class="text-base md:text-xl font-black text-white leading-tight">
                    הבע את דעתך במשאלי העם
                </h3>
            </div>
        </div>
        <a
            href={coaliUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="hidden md:inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors border border-white/20"
        >
            פתח באפליקציה ↗
        </a>
    </div>

    <!-- Iframe container -->
    <div class="relative w-full bg-[#0f172a] h-[210px] md:h-[400px]">
        {#if !iframeLoaded && !iframeFailed}
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                <div class="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <p class="text-sm font-medium">טוען את ההצבעות...</p>
            </div>
        {/if}

        {#if iframeFailed}
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6">
                <span class="text-5xl">🗳️</span>
                <p class="text-white text-base md:text-lg font-bold">
                    לא ניתן להטמיע את ההצבעות ישירות באתר
                </p>
                <p class="text-gray-400 text-sm max-w-md">
                    מערכת Coali לא מאפשרת הטמעה בחלון פנימי. לחץ על הכפתור כדי לפתוח את ההצבעות בטאב חדש.
                </p>
                <a
                    href={coaliUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-2 inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white font-bold px-6 py-3 rounded-full transition-all shadow-lg hover:shadow-blue-500/50"
                >
                    🗳️ פתח הצבעות →
                </a>
            </div>
        {/if}

        <iframe
            src={coaliUrl}
            title="הבע את דעתך במשאלי העם"
            class="w-full h-full border-0 {iframeLoaded ? 'opacity-100' : 'opacity-0'}"
            allow="clipboard-write; fullscreen"
            loading="lazy"
            onload={handleLoad}
            onerror={handleError}
        ></iframe>
    </div>

    <!-- Footer note (mobile open link only) -->
    <div class="md:hidden bg-black/40 px-3 py-2 flex items-center justify-end border-t border-white/10">
        <a
            href={coaliUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-blue-300 hover:text-white text-xs font-bold"
        >
            פתח ↗
        </a>
    </div>
</div>
