<script lang="ts">
    import { ads } from "$lib/adsData";
</script>

<aside class="hidden lg:block w-48 flex-shrink-0 sticky top-4 h-fit">
    <div class="space-y-4">
        {#each ads as ad}
            <a
                href={ad.href}
                target="_blank"
                class="block overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105 group relative"
            >
                <div class="relative overflow-hidden">
                    <img
                        src={ad.image}
                        alt={ad.title}
                        class="h-auto w-full object-cover transition-opacity duration-1500 group-hover:opacity-0"
                    />
                    <!-- Hover overlay -->
                    <div
                        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1500 flex items-center justify-center"
                        style="background-image: url('{ad.image}'); background-size: cover; background-position: center;"
                    >
                        <div
                            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        ></div>
                        <div class="relative z-10 text-center px-4">
                            <h3 class="text-white font-bold text-lg mb-2">
                                {ad.title}
                            </h3>
                            <p class="text-gray-200 text-sm">
                                {ad.description}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r {ad.color} p-3 text-center">
                    <p class="text-white font-bold text-xs leading-tight">
                        {ad.cta}
                    </p>
                </div>
            </a>
        {/each}

        <!-- Empty Ad Space -->
        <a
            href="mailto:contact@example.com?subject=מעוניין בפרסום"
            class="block overflow-hidden rounded-lg border-4 border-dashed border-blue-400/50 bg-blue-900/10 backdrop-blur-sm shadow-lg transition-all hover:scale-105 hover:border-blue-500 hover:bg-blue-900/20"
        >
            <div
                class="flex h-48 flex-col items-center justify-center p-4 text-center"
            >
                <div class="mb-2 text-4xl">📢</div>
                <p class="text-sm font-bold text-blue-300">מקום פרסום</p>
                <p class="text-xs text-blue-400">זה יכול להיות שלך!</p>
                <div
                    class="mt-2 rounded bg-blue-500 px-3 py-1 text-xs font-bold text-white"
                >
                    לחץ לפרטים
                </div>
            </div>
        </a>
    </div>
</aside>
