<script lang="ts">
    import { ads } from '$lib/adsData';
    import { _ } from 'svelte-i18n';

    // הטור השמאלי הוא טור אתרי הרשת של "יוצאים לחירות" בלבד.
    // פרסומות של מפרסמים (submitted-ads שאושרו) אינן מוצגות כאן בשום מצב -
    // מקומן הוא הטור הימני (RightAdBanner). אין כאן prop של approvedAds
    // בכוונה, כדי שלא תיפתח שוב אפשרות לשתול פרסומת בצד שמאל.
    // נעילה מכוונת: הרכיב לא מקבל שום prop. אם מישהו ינסה שוב להעביר לכאן
    // approvedAds - npm run check ייכשל במקום להתעלם בשקט.
    let {}: { approvedAds?: never } = $props();

    let sites = $derived(ads.map(a => ({
        id: String(a.id),
        title: a.title,
        description: a.description,
        cta: a.cta,
        hover: a.hover,
        href: a.href,
        image: a.image,
        color: a.color,
        imageHeight: a.imageHeight,
    })));
</script>

<aside
    aria-label={$_('components.as_ads_partners_aria')}
    class="hidden lg:block w-48 flex-shrink-0 sticky top-4 h-fit pb-8 text-center"
>
    <h4 class="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 px-2">
        {$_('components.as_header')}
    </h4>
    <div class="space-y-4">
        {#each sites as site (site.id)}
            <a
                href={site.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="{site.title} – {site.description}{$_('components.opens_new_window_suffix')}"
                class="block overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105 group relative"
            >
                <div class="relative overflow-hidden" style="height: {site.imageHeight ?? '160px'}">
                    <div class="absolute inset-0 overflow-hidden">
                        <img
                            src={site.image}
                            alt={site.title}
                            loading="lazy"
                            decoding="async"
                            class="w-full h-full object-cover transition-opacity duration-[1500ms] group-hover:opacity-0"
                        />
                    </div>
                    <div
                        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[1500ms] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <div class="relative z-10 text-center px-4">
                            <h3 class="text-white font-bold text-base mb-1">{site.title}</h3>
                            <p class="text-gray-200 text-xs">{site.description}</p>
                        </div>
                    </div>
                </div>
                <div class="relative group/cta bg-gradient-to-r {site.color} p-3 text-center">
                    <p class="text-white font-bold text-xs leading-tight">{site.cta}</p>
                    {#if site.hover}
                        <!-- pre-line + w-max: משפט בשורה אחת נשאר בשורה אחת, אבל ירידות שורה
                             שהמפרסם הקליד נשמרות, וטקסט ארוך נגמר ב-max-w במקום לגלוש -->
                        <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cta:block
                                     bg-gray-900 text-white text-xs font-bold rounded-lg px-3 py-1.5
                                     whitespace-pre-line w-max max-w-[15rem] text-center
                                     border border-white/10 shadow-xl pointer-events-none z-50">
                            {site.hover}
                        </span>
                    {/if}
                </div>
            </a>
        {/each}
    </div>
</aside>
