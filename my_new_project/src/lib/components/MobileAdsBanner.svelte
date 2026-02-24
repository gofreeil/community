<script lang="ts">
    import { onMount } from 'svelte';

    let showBanner = false;
    let expandedAdId: string | null = null;

    const ads = [
        {
            id: 'peace-houses',
            title: 'בתי הפיוס',
            summary: 'עזרה בדין ופיוס בסיכסוכים',
            image: '/images/בתי הפיוס.png',
            description: 'מתנדבים לתת לך עזרה מלאה בדין / פיוס בכל סיכסוך',
            url: 'https://www.melecshop.com/page/peace-on-earth',
            color: 'from-orange-600 to-red-600'
        },
        {
            id: 'committees',
            title: 'ועדי שכונות',
            summary: 'הצטרף לוועד השכונה שלך',
            image: '/images/news/ועדי שכונות.png',
            description: 'מהפכת משילות העם על המוסדות',
            url: 'https://www.melecshop.com/page/peace-on-earth_VRHH',
            color: 'from-blue-600 to-cyan-600'
        },
        {
            id: 'purchasing-group',
            title: 'קבוצת רכישה',
            summary: 'הוזל את ההוצאות החודשיות',
            image: '/images/whatsapp_cta.png',
            description: 'הצטרף לקבוצת הרכישה שלנו והוזל מיד את ההוצאות',
            url: 'https://purchasing-groups.vercel.app/',
            color: 'from-green-600 to-emerald-600'
        },
        {
            id: 'investments',
            title: 'השקעות קבוצתיות',
            summary: 'התחבר עם קבוצת המשקיעים',
            image: '/images/partners/השקעות קבוצתיות.png',
            description: 'התחבר עם קבוצת המשקיעים שלנו',
            url: 'https://www.melecshop.com/page/free',
            color: 'from-amber-600 to-orange-600'
        },
        {
            id: 'home-growing',
            title: 'גידול ביתי',
            summary: 'מערכת לגידול ביתי (בקרוב)',
            image: '/images/partners/מערכת לגידול ביתי.png',
            description: 'מערכת לגידול ביתי',
            url: 'https://www.melecshop.com/page/free',
            color: 'from-teal-500 to-teal-600'
        },
        {
            id: 'professionals',
            title: 'בעלי מקצוע כשירים',
            summary: 'מחפש בעל מקצוע איכותי?',
            image: '/images/בעלי מקצוע כשירים.png',
            description: 'חתמו על תנאי הקהילה ונותנים לנו הנחות והטבות יחודיות',
            url: 'https://index-chi-sage.vercel.app/',
            color: 'from-yellow-500 to-orange-500'
        },
        {
            id: 'city-criticism',
            title: 'ביקורת על העיריה',
            summary: 'יש לך תלונה לעיריה?',
            image: '/images/ביקורת על העיריה.png',
            description: 'הזכות לחיות - תלונות על העיריה',
            url: 'https://right-to-live.vercel.app/',
            color: 'from-red-600 to-pink-600'
        }
    ];

    onMount(() => {
        const timer = setTimeout(() => {
            showBanner = true;
        }, 5000);

        return () => clearTimeout(timer);
    });

    function toggleExpand(adId: string) {
        expandedAdId = expandedAdId === adId ? null : adId;
    }
</script>

<!-- Mobile Ads Banner - Hidden on desktop -->
<div class="lg:hidden fixed bottom-0 left-0 right-0 z-40">
    {#if showBanner}
        <div class="bg-gradient-to-t from-black/90 to-black/70 backdrop-blur-sm p-4 max-h-96 overflow-y-auto">
            <div class="space-y-2">
                {#each ads as ad}
                    {#if expandedAdId === ad.id}
                        <!-- Expanded view -->
                        <a
                            href={ad.url}
                            target="_blank"
                            class="block rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all"
                        >
                            <img
                                src={ad.image}
                                alt={ad.title}
                                class="w-full h-40 object-cover"
                            />
                            <div class="bg-gradient-to-r {ad.color} p-3">
                                <h3 class="text-white font-bold text-sm mb-1">{ad.title}</h3>
                                <p class="text-white text-xs">{ad.description}</p>
                            </div>
                        </a>
                    {:else}
                        <!-- Collapsed view -->
                        <button
                            on:click={() => toggleExpand(ad.id)}
                            class="w-full flex items-center justify-between bg-gradient-to-r {ad.color} p-3 rounded-lg text-white hover:shadow-lg transition-all"
                        >
                            <span class="text-lg mr-2">→</span>
                            <div class="text-left flex-1">
                                <p class="font-bold text-sm">{ad.title}</p>
                                <p class="text-xs opacity-90">{ad.summary}</p>
                            </div>
                        </button>
                    {/if}
                {/each}
            </div>
            <button
                on:click={() => (showBanner = false)}
                class="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-xs font-bold transition-colors"
            >
                סגור
            </button>
        </div>
    {/if}
</div>
