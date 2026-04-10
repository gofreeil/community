<script lang="ts">
    import { ads } from '$lib/adsData';
</script>

<aside
    aria-label="פרסומות ושותפים"
    class="hidden lg:block w-48 flex-shrink-0 sticky top-4 h-fit pb-8 text-center"
>
    <h4 class="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 px-2">
        מתקדמים לחברה מתוקנת ועצמאית
    </h4>
    <div class="space-y-4">
        {#each ads as ad (ad.id)}
            <a
                href={ad.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="{ad.title} – {ad.description} (נפתח בחלון חדש)"
                class="block overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105 group relative"
            >
                <div class="relative overflow-hidden" style="height: {ad.imageHeight ?? '160px'}">
                    <!-- wrapper לזום — לא absolute כדי לא לשבור overflow:hidden -->
                    <div class="absolute inset-0 overflow-hidden">
                        <img
                            src={ad.image}
                            alt={ad.title}
                            class="w-full h-full object-cover transition-opacity duration-[1500ms] group-hover:opacity-0"
                            style="transform: scale({ad.imageScale ?? 1}); transform-origin: center center;"
                        />
                    </div>
                    <!-- Hover overlay -->
                    <div
                        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[1500ms] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <div class="relative z-10 text-center px-4">
                            <h3 class="text-white font-bold text-base mb-1">{ad.title}</h3>
                            <p class="text-gray-200 text-xs">{ad.description}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r {ad.color} p-3 text-center">
                    <p class="text-white font-bold text-xs leading-tight">{ad.cta}</p>
                </div>
            </a>
        {/each}
    </div>
</aside>
