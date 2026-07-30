<script lang="ts">
    import { onMount } from 'svelte';
    import { _ } from 'svelte-i18n';

    // חדשות הקהילה שלנו (נערכות ב-/admin/news) + החדשות הארציות מאתר הביקורת
    const COMMUNITY_NEWS_API = '/api/community-news';
    const NATIONAL_NEWS_API = 'https://criticism.gofreeil.com/api/national-news';

    // חדשות ברירת מחדל אם ה-API לא זמין (הטקסטים במילון home)
    type NewsItem = { line1: string; line2: string; sourceUrl?: string | null; documentId?: string };

    // items  - עוקף את השליפה ומציג רשימה נתונה (תצוגה מקדימה בפאנל הניהול)
    // layout - כפיית מראה נייד/נייח לתצוגה המקדימה; 'auto' = לפי רוחב המסך
    let {
        items = null,
        layout = 'auto'
    }: {
        items?: NewsItem[] | null;
        layout?: 'auto' | 'desktop' | 'mobile';
    } = $props();

    const fallbackItems: NewsItem[] = $derived(
        [1, 2, 3, 4, 5, 6].map((k) => ({
            line1: $_(`home.news${k}_line1`),
            line2: $_(`home.news${k}_line2`)
        }))
    );

    let paused = $state(false);
    let fetchedItems = $state<NewsItem[] | null>(null);
    const newsItems = $derived(items?.length ? items : (fetchedItems ?? fallbackItems));

    // תווית "חדשות" האדומה מוצגת רק בדסקטופ. בתצוגה מקדימה כופים את הצד הנכון,
    // כי מסגרת צרה בתוך מסך רחב עדיין נחשבת lg: בעיני Tailwind.
    const labelClass = $derived(
        layout === 'desktop' ? 'flex' : layout === 'mobile' ? 'hidden' : 'lg:flex hidden'
    );

    const toItem = (p: any): NewsItem => ({
        line1: p.title,
        line2: p.summary || p.category || '',
        sourceUrl: p.sourceUrl || null,
        documentId: p.documentId
    });

    async function loadFeed(url: string): Promise<NewsItem[]> {
        try {
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            return (data?.posts ?? []).filter((p: any) => p?.title).map(toItem);
        } catch {
            return [];
        }
    }

    onMount(async () => {
        // בתצוגה מקדימה הרשימה מגיעה מבחוץ - אין שליפה
        if (items) return;

        // שתי הזנות במקביל: חדשות הקהילה שלנו קודם, ואחריהן הארציות.
        const [community, national] = await Promise.all([
            loadFeed(COMMUNITY_NEWS_API),
            loadFeed(NATIONAL_NEWS_API)
        ]);

        const seen = new Set<string>();
        const merged = [...community, ...national].filter((it) => {
            const key = it.line1.trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (merged.length > 0) fetchedItems = merged;
        // אחרת - נשארים על fallback items
    });
</script>

<section
    aria-label={$_('home.national_news')}
    class="news-ticker-container border-b border-blue-900/30 bg-[#0f172a]/90 pt-4 pb-0 backdrop-blur-md"
>
    <!-- תוכן נגיש לקוראי מסך (מוסתר ויזואלית) -->
    <ul class="sr-only">
        {#each newsItems as item}
            <li>{item.line1} – {item.line2}</li>
        {/each}
    </ul>

    <!-- כפתור עצירה/הפעלה -->
    <button
        onclick={() => (paused = !paused)}
        class="sr-only focus:not-sr-only focus:fixed focus:top-16 focus:right-4 focus:z-50 focus:bg-blue-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
        aria-label={paused ? $_('home.ticker_resume_aria') : $_('home.ticker_pause_aria')}
    >
        {paused ? `▶ ${$_('home.resume')}` : `⏸ ${$_('home.pause')}`}
    </button>

    <div class="mx-auto max-w-7xl flex items-center px-4" aria-hidden="true">
        <!-- Ticker Label -->
        <div
            class="z-10 bg-red-600 px-6 py-4 rounded-lg text-lg font-black text-white shadow-xl flex-shrink-0 ml-6 flex-col items-center justify-center border border-red-400 {labelClass}"
        >
            <span>{$_('home.news_label_line1')}</span>
            <span>{$_('home.news_label_line2')}</span>
        </div>

        <!-- Scrolling Content -->
        <div class="overflow-hidden flex-grow relative h-14">
            <div
                class="ticker-content flex gap-16 items-center absolute right-0 whitespace-nowrap h-full"
                class:paused
            >
                {#each [...newsItems, ...newsItems] as item}
                    <div class="flex items-center gap-16 h-full">
                        <div class="flex flex-col justify-center text-center">
                            {#if item.sourceUrl}
                                <a
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-xl font-bold text-blue-100 hover:text-blue-300 transition-colors"
                                >{item.line1}</a>
                            {:else}
                                <span class="text-xl font-bold text-blue-100">{item.line1}</span>
                            {/if}
                            <span class="text-xl font-medium text-blue-300">{item.line2}</span>
                        </div>
                        <!-- Separator -->
                        <div class="h-12 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</section>

<style>
    .ticker-content {
        right: 0;
        animation: ticker-move 85s linear infinite;
    }

    @keyframes ticker-move {
        from { transform: translateX(0); }
        to   { transform: translateX(50%); }
    }

    .news-ticker-container:hover .ticker-content,
    .ticker-content.paused {
        animation-play-state: paused;
    }

    @media (prefers-reduced-motion: reduce) {
        .ticker-content {
            animation: none;
            position: static;
            white-space: normal;
            flex-wrap: wrap;
        }
    }
</style>
