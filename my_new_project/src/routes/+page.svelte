<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";
    import JerusalemMap from "$lib/components/JerusalemMap.svelte";
    import NewsTicker from "$lib/components/NewsTicker.svelte";
    import LostAndFound from "$lib/components/LostAndFound.svelte";
    import FacebookComments from "$lib/components/FacebookComments.svelte";
    import ReferendumBanner from "$lib/components/ReferendumBanner.svelte";
    import { triggerAdPopup } from "$lib/adPopupStore";

    import { citiesAndNeighborhoods } from "$lib/neighborhoodsData";
    import { neighborhoodState } from "$lib/neighborhoodState.svelte";
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let showNeighborhoodsMenu = $state(false);

    onMount(() => {
        // אתחל עם נתוני פרופיל מהשרת (או localStorage כ-fallback)
        neighborhoodState.init(data.userNeighborhood, data.userCity);
    });

    function handleToggleMenu() {
        showNeighborhoodsMenu = !showNeighborhoodsMenu;
    }

    function selectNeighborhood(neighborhood: string, city: string) {
        neighborhoodState.select(neighborhood, city);
        showNeighborhoodsMenu = false;
    }
</script>

<svelte:head>
    <title>קהילה בשכונה</title>
</svelte:head>

<div class="space-y-12 pb-0 md:pb-20 pt-4 md:pt-8">
    <!-- Title Section - centered across full width -->
    <section class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-8 relative neighborhoods-menu-container">
            <!-- Mobile: title with button on left side -->
            <div class="md:hidden mb-2">
                <div class="relative group text-center mb-1 w-full">
                    <h2
                        class="text-[2.2rem] md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default leading-tight w-full"
                    >
                        יתרונות שכונת {neighborhoodState.neighborhood}
                    </h2>
                </div>
                <div class="relative flex items-center w-full">
                    <div class="absolute left-0 z-50">
                        <button
                            onclick={handleToggleMenu}
                            class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-md font-bold text-xs shadow-lg transition-all hover:scale-105 whitespace-nowrap relative z-50 pointer-events-auto"
                        >
                            🏘️ כל השכונות
                        </button>
                    </div>
                    <div
                        class="relative group w-full text-center pointer-events-none"
                    >
                        <h2
                            class="text-[2.2rem] md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default leading-tight"
                        >
                            {neighborhoodState.city}
                        </h2>
                    </div>
                </div>
            </div>

            <!-- Desktop: original layout -->
            <div class="hidden md:flex items-center justify-center gap-4">
                <div class="relative group">
                    <h2
                        class="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default"
                    >
                        יתרונות שכונת {neighborhoodState.neighborhood}, {neighborhoodState.city}
                    </h2>
                    <!-- Tooltip -->
                    <div
                        class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-[9999] pointer-events-none"
                    >
                        <div
                            class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-xl whitespace-nowrap"
                        >
                            גלה את כל מה שהשכונה שלך מציעה
                            <div
                                class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"
                            ></div>
                        </div>
                    </div>
                </div>
                <button
                    onclick={handleToggleMenu}
                    class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all hover:scale-105"
                >
                    🏘️ לכלל השכונות
                </button>
            </div>

            <!-- Neighborhoods Menu -->
            {#if showNeighborhoodsMenu}
                <!-- Backdrop -->
                <div
                    class="fixed inset-0 bg-black/50 z-[9998]"
                    role="presentation"
                    onclick={() => (showNeighborhoodsMenu = false)}
                ></div>

                <!-- Menu -->
                <div
                    class="fixed md:absolute top-20 md:top-full left-1/2 transform -translate-x-1/2 mt-0 md:mt-4 bg-gray-900 rounded-xl shadow-2xl p-4 md:p-6 z-[9999] max-w-4xl w-[95vw] md:w-full max-h-[80vh] overflow-y-auto"
                >
                    <h3
                        class="text-white text-lg md:text-xl font-bold mb-3 md:mb-4 text-center"
                    >
                        בחר עיר ושכונה
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        {#each Object.entries(citiesAndNeighborhoods) as [city, neighborhoods]}
                            <div class="bg-gray-800 rounded-lg p-3">
                                <h4
                                    class="text-purple-400 font-bold mb-2 text-sm md:text-base"
                                >
                                    {city}
                                </h4>
                                <div class="space-y-1">
                                    {#each neighborhoods as neighborhood}
                                        <button
                                            onclick={() => selectNeighborhood(neighborhood, city)}
                                            class="block w-full text-right text-white text-xs md:text-sm hover:bg-purple-600 px-2 py-1 rounded transition-colors"
                                        >
                                            {neighborhood}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/each}
                    </div>
                    <button
                        onclick={() => (showNeighborhoodsMenu = false)}
                        class="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                        סגור
                    </button>
                </div>
            {/if}
        </div>
    </section>

    <!-- News Ticker - under title -->
    <div class="max-w-7xl mx-auto px-4 -mt-4 mb-4">
        <NewsTicker />
    </div>

    <!-- Map + Lost and Found Section (side by side) -->
    <section class="max-w-7xl mx-auto px-4">
        <div class="flex flex-col lg:flex-row gap-6">
            <!-- Map Section (3/4 width on desktop, full width on mobile) -->
            <div class="lg:w-3/4">
                <JerusalemMap bind:showNeighborhoodsMenu dbItems={data.dbItems} />
            </div>

            <!-- Lost and Found Section (1/4 width on desktop) -->
            <!-- On mobile: split into 2 columns -->
            <div class="lg:w-1/4">
                <!-- Desktop: single column -->
                <div class="hidden lg:block">
                    <LostAndFound />
                </div>

                <!-- Mobile: two columns side by side -->
                <div class="lg:hidden grid grid-cols-2 gap-2">
                    <!-- Left: Message Board -->
                    <div
                        class="rounded-2xl bg-[#0f172a] border border-blue-500/30 overflow-hidden shadow-2xl flex flex-col h-full"
                    >
                        <div
                            class="bg-gradient-to-r from-green-600 to-teal-600 p-2 flex items-center justify-between flex-shrink-0 h-12"
                        >
                            <h3
                                class="text-sm font-bold text-white flex items-center gap-1"
                            >
                                <span class="text-base">🗓️</span>
                                לוח אירועים
                            </h3>
                            <button
                                class="inline-flex items-center self-center bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-2 py-1 rounded-full transition-colors border border-white/20 flex-shrink-0"
                            >
                                + הוסף
                            </button>
                        </div>
                        <div class="p-2 flex-1 overflow-y-auto flex flex-col gap-1.5">
                            <!-- אירוע 1 -->
                            <div class="flex gap-2 items-start bg-white/5 rounded-xl p-2 border border-white/8 cursor-pointer" role="button" tabindex="0" onclick={() => triggerAdPopup()} onkeydown={(e) => e.key === 'Enter' && triggerAdPopup()}>
                                <div class="flex flex-col items-center bg-green-600/20 rounded-lg px-1.5 py-1 min-w-[36px] text-center flex-shrink-0">
                                    <span class="text-green-400 font-bold text-sm leading-none">15</span>
                                    <span class="text-green-300/70 text-[9px] leading-none mt-0.5">מרץ</span>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-white text-xs font-bold leading-tight">🎤 ערב שירה קהילתי</p>
                                    <p class="text-gray-400 text-[10px] mt-0.5">בית הכנסת הגדול, 20:00</p>
                                </div>
                            </div>
                            <!-- אירוע 2 -->
                            <div class="flex gap-2 items-start bg-white/5 rounded-xl p-2 border border-white/8 cursor-pointer" role="button" tabindex="0" onclick={() => triggerAdPopup()} onkeydown={(e) => e.key === 'Enter' && triggerAdPopup()}>
                                <div class="flex flex-col items-center bg-blue-600/20 rounded-lg px-1.5 py-1 min-w-[36px] text-center flex-shrink-0">
                                    <span class="text-blue-400 font-bold text-sm leading-none">18</span>
                                    <span class="text-blue-300/70 text-[9px] leading-none mt-0.5">מרץ</span>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-white text-xs font-bold leading-tight">👨‍👩‍👧 יום משפחה בפארק</p>
                                    <p class="text-gray-400 text-[10px] mt-0.5">פארק השעשועים, 10:00–14:00</p>
                                </div>
                            </div>
                            <!-- אירוע 3 -->
                            <div class="flex gap-2 items-start bg-white/5 rounded-xl p-2 border border-white/8 cursor-pointer" role="button" tabindex="0" onclick={() => triggerAdPopup()} onkeydown={(e) => e.key === 'Enter' && triggerAdPopup()}>
                                <div class="flex flex-col items-center bg-purple-600/20 rounded-lg px-1.5 py-1 min-w-[36px] text-center flex-shrink-0">
                                    <span class="text-purple-400 font-bold text-sm leading-none">22</span>
                                    <span class="text-purple-300/70 text-[9px] leading-none mt-0.5">מרץ</span>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-white text-xs font-bold leading-tight">📚 הרצאה: מיצוי זכויות</p>
                                    <p class="text-gray-400 text-[10px] mt-0.5">מרכז קהילתי, 19:30 — זום</p>
                                </div>
                            </div>
                            <!-- אירוע 4 -->
                            <div class="flex gap-2 items-start bg-white/5 rounded-xl p-2 border border-white/8 cursor-pointer" role="button" tabindex="0" onclick={() => triggerAdPopup()} onkeydown={(e) => e.key === 'Enter' && triggerAdPopup()}>
                                <div class="flex flex-col items-center bg-orange-600/20 rounded-lg px-1.5 py-1 min-w-[36px] text-center flex-shrink-0">
                                    <span class="text-orange-400 font-bold text-sm leading-none">28</span>
                                    <span class="text-orange-300/70 text-[9px] leading-none mt-0.5">מרץ</span>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-white text-xs font-bold leading-tight">🌱 סדנת גינון עירוני</p>
                                    <p class="text-gray-400 text-[10px] mt-0.5">גינת השכונה, 09:00</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Lost and Found -->
                    <div>
                        <LostAndFound />
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Referendum Banner -->
    <section class="max-w-6xl mx-auto px-4">
        <ReferendumBanner />
    </section>

    <!-- Facebook Comments Section -->
    <section class="max-w-6xl mx-auto px-4 mb-8">
        <div
            class="rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 backdrop-blur-sm p-3 md:p-6"
            title="שאל שאלה, הבע דעתך והצטרף לשיח בשכונה"
        >
            <h3
                class="text-lg md:text-2xl font-bold text-white mb-3 md:mb-6 text-center flex items-center justify-center gap-2"
            >
                <svg
                    class="w-5 h-5 md:w-8 md:h-8 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                    />
                </svg>
                שיח פתוח
            </h3>
            <FacebookComments numPosts={10} />
        </div>
    </section>

    <!-- Emergency Team Banner -->
    <section class="max-w-6xl mx-auto px-4 mt-6 md:mt-0">
        <!-- Desktop: 3 columns, Mobile: horizontal scroll -->
        <div class="hidden md:grid md:grid-cols-3 gap-6">
            <!-- כותל המשאלות -->
            <a
                href="/community-fund"
                class="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col cursor-pointer"
            >
                <!-- Background image -->
                <div
                    class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                    style="background-image: url('/images/2.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300 group-hover:scale-110"
                ></div>
                <div
                    class="relative z-10 p-6 transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="text-4xl mb-2 block transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"
                            >🙏</span
                        >
                        <h3
                            class="text-xl font-black mb-2 transition-all duration-300 group-hover:text-yellow-200"
                        >
                            <span class="group-hover:hidden">כותל המשאלות</span>
                            <span class="hidden group-hover:inline"
                                >עניי עירך קודמין</span
                            >
                        </h3>
                        <div
                            class="bg-blue-600/50 hover:bg-blue-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full group-hover:scale-105 group-hover:shadow-lg text-center mt-auto"
                        >
                            וקופת השכונה
                        </div>
                    </div>
                </div>
            </a>

            <!-- פנה לוועד השכונה -->
            <div
                class="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col"
            >
                <!-- Background image -->
                <div
                    class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                    style="background-image: url('/images/ועד שכונה.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300 group-hover:scale-110"
                ></div>
                <div
                    class="relative z-10 p-6 transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="text-4xl mb-2 block transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"
                            >🏛️</span
                        >
                        <h3
                            class="text-xl font-black mb-2 transition-all duration-300 group-hover:text-yellow-200"
                        >
                            ועד השכונה
                        </h3>
                        <p
                            class="text-sm mb-4 text-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-grow"
                        >
                            יש לך הצעה? רוצה לשפר את השכונה?
                        </p>
                        <button
                            class="bg-purple-600/50 hover:bg-purple-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full group-hover:scale-105 group-hover:shadow-xl mt-auto"
                        >
                            פנה לועד השכונה
                        </button>
                    </div>
                </div>
            </div>

            <!-- כיתת כוננות -->
            <div
                class="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col"
            >
                <!-- Background image -->
                <div
                    class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                    style="background-image: url('/images/כוננות.png');"
                ></div>
                <!-- Dark gradient overlay -->
                <div
                    class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300 group-hover:scale-110"
                ></div>
                <div
                    class="relative z-10 p-6 transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow"
                >
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span
                            class="text-4xl mb-2 block transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"
                            >🚨</span
                        >
                        <h3
                            class="text-xl font-black mb-2 transition-all duration-300 group-hover:text-yellow-200"
                        >
                            <span class="group-hover:hidden">כיתת כוננות</span>
                            <span class="hidden group-hover:inline"
                                >חזק את ביטחון השכונה</span
                            >
                        </h3>
                        <p
                            class="text-xs mb-3 text-yellow-100 transition-colors duration-300 group-hover:text-white group-hover:font-bold"
                        >
                            <span class="font-bold">127</span> חברים פעילים
                        </p>
                        <button
                            class="bg-red-600/50 hover:bg-red-600/70 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full group-hover:scale-105 group-hover:shadow-xl mt-auto"
                        >
                            הצטרף עכשיו
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile: 3 cards in one row, equal width -->
        <div class="md:hidden">
            <div class="grid grid-cols-3 gap-2 h-44">
                <!-- כותל המשאלות - Mobile -->
                <a
                    href="/community-fund"
                    class="relative overflow-hidden rounded-lg h-full block cursor-pointer"
                >
                    <!-- Background image -->
                    <div
                        class="absolute inset-0 bg-cover bg-center"
                        style="background-image: url('/images/2.png');"
                    ></div>
                    <!-- Dark gradient overlay -->
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30"
                    ></div>
                    <div class="relative z-10 p-2 h-full flex flex-col justify-between">
                        <div class="text-center text-white">
                            <span class="text-xl mb-1 block">🙏</span>
                            <h3 class="text-xs font-black leading-tight">כותל המשאלות</h3>
                        </div>
                        <div
                            class="bg-blue-600/50 text-white px-1 py-1 rounded text-[10px] font-bold text-center w-full"
                        >
                            וקופת השכונה
                        </div>
                    </div>
                </a>

                <!-- פנה לוועד השכונה - Mobile -->
                <div class="relative overflow-hidden rounded-lg h-full">
                    <!-- Background image -->
                    <div
                        class="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                        style="background-image: url('/images/ועד שכונה.png');"
                    ></div>
                    <!-- Dark gradient overlay -->
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30 transition-transform duration-300 group-hover:scale-110"
                    ></div>
                    <div class="relative z-10 p-2 h-full flex flex-col justify-between">
                        <div class="text-center text-white">
                            <span class="text-xl mb-1 block">🏛️</span>
                            <h3 class="text-xs font-black leading-tight">ועד השכונה</h3>
                        </div>
                        <button
                            class="bg-purple-600/50 text-white px-1 py-1 rounded text-[10px] font-bold w-full hover:bg-purple-600/70"
                        >
                            פנה לועד השכונה
                        </button>
                    </div>
                </div>

                <!-- כיתת כוננות - Mobile -->
                <div class="relative overflow-hidden rounded-lg h-full">
                    <!-- Background image -->
                    <div
                        class="absolute inset-0 bg-cover bg-center"
                        style="background-image: url('/images/כוננות.png');"
                    ></div>
                    <!-- Dark gradient overlay -->
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30"
                    ></div>
                    <div class="relative z-10 p-2 h-full flex flex-col justify-between">
                        <div class="text-center text-white">
                            <span class="text-xl mb-1 block">🚨</span>
                            <h3 class="text-xs font-black leading-tight">כיתת כוננות</h3>
                            <p class="text-[10px] text-yellow-100 mt-0.5">127 חברים</p>
                        </div>
                        <button
                            class="bg-red-600/50 text-white px-1 py-1 rounded text-[10px] font-bold w-full"
                        >
                            הצטרף
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>

<style>
    /* Base styles handled in app.css */

    /* Remove all spacing under title on mobile */
    @media (max-width: 768px) {
        .text-center.mb-8 {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
        }

        .neighborhoods-menu-container {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
        }

        section {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
        }

        .space-y-12 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0 !important;
        }
    }
</style>
