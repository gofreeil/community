<script lang="ts">
    import { onMount } from 'svelte';

    let showBanner = false;

    const ads = [
        {
            title: 'בתי הפיוס',
            summary: 'עזרה בדין ופיוס בסיכסוכים',
            url: 'https://www.melecshop.com/page/peace-on-earth',
            color: 'from-orange-600 to-red-600'
        },
        {
            title: 'ועדי שכונות',
            summary: 'הצטרף לוועד השכונה שלך',
            url: 'https://www.melecshop.com/page/peace-on-earth_VRHH',
            color: 'from-blue-600 to-cyan-600'
        },
        {
            title: 'קבוצת רכישה',
            summary: 'הוזל את ההוצאות החודשיות',
            url: 'https://purchasing-groups.vercel.app/',
            color: 'from-green-600 to-emerald-600'
        },
        {
            title: 'השקעות קבוצתיות',
            summary: 'התחבר עם קבוצת המשקיעים',
            url: 'https://www.melecshop.com/page/free',
            color: 'from-amber-600 to-orange-600'
        },
        {
            title: 'גידול ביתי',
            summary: 'מערכת לגידול ביתי (בקרוב)',
            url: 'https://www.melecshop.com/page/free',
            color: 'from-teal-500 to-teal-600'
        },
        {
            title: 'בעלי מקצוע כשירים',
            summary: 'מחפש בעל מקצוע איכותי?',
            url: 'https://index-chi-sage.vercel.app/',
            color: 'from-yellow-500 to-orange-500'
        },
        {
            title: 'ביקורת על העיריה',
            summary: 'יש לך תלונה לעיריה?',
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
</script>

<!-- Mobile Ads Banner - Hidden on desktop -->
<div class="lg:hidden fixed bottom-0 left-0 right-0 z-40">
    {#if showBanner}
        <div class="bg-gradient-to-t from-black/90 to-black/70 backdrop-blur-sm p-4">
            <div class="space-y-2">
                {#each ads as ad}
                    <a
                        href={ad.url}
                        target="_blank"
                        class="w-full flex items-center justify-between bg-gradient-to-r {ad.color} p-3 rounded-lg text-white hover:shadow-lg transition-all"
                    >
                        <div class="text-left">
                            <p class="font-bold text-sm">{ad.title}</p>
                            <p class="text-xs opacity-90">{ad.summary}</p>
                        </div>
                        <span class="text-lg">→</span>
                    </a>
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
