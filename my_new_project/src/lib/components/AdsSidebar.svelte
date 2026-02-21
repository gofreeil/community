<script lang="ts">
    import { onMount } from 'svelte';

    let currentAdSet = 0;

    const adSets = [
        [
            {
                href: "https://www.melecshop.com/page/peace-on-earth_VRHH",
                img: "/images/news/ועדי שכונות.png",
                alt: "ועדי שכונות",
                text: "הצטרף לוועד שכונתך ותמוך במהפכת משילות העם על המוסדות!",
                gradient: "from-blue-600 to-cyan-600"
            },
            {
                href: "https://purchasing-groups.vercel.app/",
                img: "/images/whatsapp_cta.png",
                alt: "צור קשר בוואטסאפ",
                text: "הצטרף לקבוצת הרכישה שלנו והוזל מיד את ההוצאות החודשיות שלך!",
                gradient: "linear-gradient(to right, #3d5a3d, #2d4a2d)"
            }
        ],
        [
            {
                href: "https://index-chi-sage.vercel.app/",
                img: "/images/partners/השקעות קבוצתיות.png",
                alt: "השקעות קבוצתיות",
                text: "התחבר עם קבוצת המשקיעים שלנו",
                gradient: "from-amber-600 to-orange-600"
            },
            {
                href: "https://right-to-live.vercel.app/",
                img: "/images/partners/מיצוי_זכויות.svg",
                alt: "מיצוי זכויות תושבים",
                text: "מערכת פניות ובקרת תושבים על העיריות - מצה את זכויותיך!",
                gradient: "from-blue-700 to-blue-900"
            }
        ]
    ];

    onMount(() => {
        const interval = setInterval(() => {
            currentAdSet = (currentAdSet + 1) % adSets.length;
        }, 6000);

        return () => clearInterval(interval);
    });
</script>

<!-- AdsSidebar.svelte -->
<aside class="hidden lg:block w-48 flex-shrink-0">
    <div class="sticky top-4 space-y-4">
        {#each adSets[currentAdSet] as ad, index}
            <a
                href={ad.href}
                target="_blank"
                class="block overflow-hidden rounded-lg shadow-lg transition-all hover:scale-105 duration-700"
                style="animation: fadeIn 0.7s ease-in-out;"
            >
                <img
                    src={ad.img}
                    alt={ad.alt}
                    class="h-auto w-full object-cover"
                />
                <div
                    class="bg-gradient-to-r {ad.gradient} p-3 text-center"
                    style={ad.gradient.startsWith('linear') ? `background: ${ad.gradient};` : ''}
                >
                    <p class="text-white font-bold text-xs leading-tight">
                        {ad.text}
                    </p>
                </div>
            </a>
        {/each}
        <a
            href="https://index-chi-sage.vercel.app/"
            target="_blank"
            class="block overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105"
        >
            <img
                src="/images/partners/השקעות קבוצתיות.png"
                alt="השקעות קבוצתיות"
                class="h-auto w-full object-cover"
            />
            <div
                class="bg-gradient-to-r from-amber-600 to-orange-600 p-3 text-center"
            >
                <p class="text-white font-bold text-xs leading-tight">
                    התחבר עם קבוצת המשקיעים שלנו
                </p>
            </div>
        </a>

        <!-- Ad 3 - מערכת לגידול ביתי -->
        <a
            href="https://index-chi-sage.vercel.app/"
            target="_blank"
            class="block relative overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105"
        >
            <img
                src="/images/partners/מערכת לגידול ביתי.png"
                alt="מערכת לגידול ביתי"
                class="h-auto w-full object-cover"
            />
            <div
                class="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transform rotate-12"
            >
                <p class="font-bold text-sm">בקרוב</p>
            </div>
            <div
                class="bg-gradient-to-r from-teal-500 to-teal-600 p-2 text-center text-xs font-bold text-white"
            >
                מערכת לגידול ביתי
            </div>
        </a>

        <!-- Ad 4 - מחפש בעל מקצוע -->
        <a
            href="https://index-chi-sage.vercel.app/"
            target="_blank"
            class="block overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105"
        >
            <img
                src="/images/בעלי מקצוע כשירים.png"
                alt="מחפש בעל מקצוע איכותי באזורך?"
                class="h-auto w-full object-cover"
            />
            <div
                class="p-2 text-center text-xs font-bold text-white"
                style="background: linear-gradient(to right, #fbbf24, #f97316);"
            >
                מחפש בעל מקצוע איכותי באזורך?
            </div>
        </a>

        <!-- Ad 5 - Empty Ad Space -->
        <a
            href="mailto:contact@example.com?subject=מעוניין בפרסום"
            class="block overflow-hidden rounded-lg border-4 border-dashed border-gray-400 bg-gray-100 shadow-lg transition-all hover:scale-105 hover:border-blue-500 hover:bg-blue-50"
        >
            <div
                class="flex h-48 flex-col items-center justify-center p-4 text-center"
            >
                <div class="mb-2 text-4xl">📢</div>
                <p class="text-sm font-bold text-gray-700">מקום פרסום</p>
                <p class="text-xs text-gray-600">זה יכול להיות שלך!</p>
                <div
                    class="mt-2 rounded bg-blue-500 px-3 py-1 text-xs font-bold text-white"
                >
                    לחץ לפרטים
                </div>
            </div>
        </a>

        <!-- Ad 6 - מיצוי זכויות תושבים -->
        <a
            href="https://right-to-live.vercel.app/"
            target="_blank"
            class="block overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105"
        >
            <img
                src="/images/partners/מיצוי_זכויות.svg"
                alt="מיצוי זכויות תושבים"
                class="h-auto w-full object-cover"
            />
            <div
                class="bg-gradient-to-r from-blue-700 to-blue-900 p-3 text-center"
            >
                <p class="text-white font-bold text-xs leading-tight">
                    מערכת פניות ובקרת תושבים על העיריות - מצה את זכויותיך!
                </p>
            </div>
        </a>
    </div>
</aside>

