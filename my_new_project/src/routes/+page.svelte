<script lang="ts">
    import { t } from "svelte-i18n";
    import JerusalemMap from "$lib/components/JerusalemMap.svelte";
    import LostAndFound from "$lib/components/LostAndFound.svelte";
    import ReferendumBanner from "$lib/components/ReferendumBanner.svelte";
    import { onMount } from "svelte";

    let currentBannerSet = 0;
    
    const bannerSets = [
        [
            {
                title: "הוסף את העסק שלך",
                description: "היה חלק מהמפה הקהילתית שלנו וקבל חשיפה לכל תושבי השכונה.",
                buttonText: "הוסף עסק עכשיו",
                gradient: "from-blue-600/20 to-purple-600/20",
                buttonColor: "bg-blue-600 hover:bg-blue-700"
            },
            {
                title: "דווח על שירות/עזרה",
                description: "ראית משהו שצריך תיקון? רוצה להציע עזרה לשכנים? דווח לנו.",
                buttonText: "פתח פנייה",
                gradient: "from-purple-600/20 to-pink-600/20",
                buttonColor: "bg-purple-600 hover:bg-purple-700"
            }
        ],
        [
            {
                title: "הצטרף לקבוצת רכישה",
                description: "חסוך כסף על קניות חודשיות והצטרף לקבוצת רכישה משותפת בשכונה.",
                buttonText: "הצטרף לקבוצה",
                gradient: "from-green-600/20 to-teal-600/20",
                buttonColor: "bg-green-600 hover:bg-green-700"
            },
            {
                title: "מצא בעל מקצוע",
                description: "מחפש שרברב, חשמלאי או בעל מקצוע אחר? מצא ממליצים בשכונה.",
                buttonText: "חפש עכשיו",
                gradient: "from-orange-600/20 to-red-600/20",
                buttonColor: "bg-orange-600 hover:bg-orange-700"
            }
        ]
    ];

    onMount(() => {
        const interval = setInterval(() => {
            currentBannerSet = (currentBannerSet + 1) % bannerSets.length;
        }, 5000); // מחליף כל 5 שניות

        return () => clearInterval(interval);
    });
</script>

<div class="space-y-12 pb-20 pt-8">
    <!-- Map + Lost and Found Section (side by side) -->
    <section class="max-w-7xl mx-auto px-4">
        <div class="flex flex-col lg:flex-row gap-6 items-stretch">
            <!-- Map Section (3/4 width) -->
            <div class="lg:w-3/4">
                <JerusalemMap />
            </div>

            <!-- Lost and Found Section (1/4 width) -->
            <div class="lg:w-1/4">
                <LostAndFound />
            </div>
        </div>
    </section>

    <!-- Referendum Banner -->
    <section class="max-w-6xl mx-auto px-4">
        <ReferendumBanner />
    </section>

    <!-- Emergency Team Banner -->
    <section class="max-w-6xl mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- שני באנרים מתחלפים -->
            {#each bannerSets[currentBannerSet] as banner, index}
                <div 
                    class="p-6 rounded-2xl bg-gradient-to-br {banner.gradient} border border-white/10 backdrop-blur-sm transition-all duration-700 ease-in-out"
                    style="animation: fadeIn 0.7s ease-in-out;"
                >
                    <h4 class="text-lg font-bold mb-2">{banner.title}</h4>
                    <p class="text-gray-400 text-sm mb-4">
                        {banner.description}
                    </p>
                    <button class="{banner.buttonColor} text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors w-full">
                        {banner.buttonText}
                    </button>
                </div>
            {/each}

            <!-- כיתת כוננות - קבוע -->
            <div class="relative overflow-hidden rounded-2xl shadow-xl">
                <div class="absolute inset-0 bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500"></div>
                <div class="relative z-10 p-6">
                    <div class="text-center text-white">
                        <span class="text-4xl mb-2 block">🚨</span>
                        <h3 class="text-xl font-black mb-2">כיתת כוננות</h3>
                        <p class="text-sm mb-4 text-yellow-100">
                            הצטרף לכיתת הכוננות של השכונה
                        </p>
                        <button class="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-100 transition-colors w-full">
                            הצטרף עכשיו 🔥
                        </button>
                        <div class="mt-4 text-xs text-yellow-100">
                            <span class="font-bold">127</span> חברים פעילים
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>

<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
