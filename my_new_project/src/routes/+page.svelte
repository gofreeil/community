<script lang="ts">
    import { t } from "svelte-i18n";
    import JerusalemMap from "$lib/components/JerusalemMap.svelte";
    import LostAndFound from "$lib/components/LostAndFound.svelte";
    import FacebookComments from "$lib/components/FacebookComments.svelte";
    import ReferendumBanner from "$lib/components/ReferendumBanner.svelte";
</script>

<div class="space-y-12 pb-0 md:pb-20 pt-4 md:pt-8">
    <!-- Title Section - centered across full width -->
    <section class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-8 relative neighborhoods-menu-container">
            <!-- Mobile: title with button on left side -->
            <div class="md:hidden mb-2">
                <div class="relative group text-center mb-1 w-full">
                    <h2 class="text-[2.2rem] md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default leading-tight w-full">
                        יתרונות שכונת ק' משה
                    </h2>
                </div>
                <div class="relative flex items-center w-full">
                    <div class="absolute left-0">
                        <button
                            class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-md font-bold text-xs shadow-lg transition-all hover:scale-105 whitespace-nowrap"
                        >
                            🏘️ כל השכונות
                        </button>
                    </div>
                    <div class="relative group w-full text-center">
                        <h2 class="text-[2.2rem] md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default leading-tight">
                            ירושלים
                        </h2>
                    </div>
                </div>
            </div>
            
            <!-- Desktop: original layout -->
            <div class="hidden md:flex items-center justify-center gap-4">
                <div class="relative group">
                    <h2 class="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default">
                        יתרונות שכונת קרית משה, ירושלים
                    </h2>
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                        <div class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-xl whitespace-nowrap">
                            גלה את כל מה שהשכונה שלך מציעה
                            <div class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                        </div>
                    </div>
                </div>
                <button
                    class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all hover:scale-105"
                >
                    🏘️ לכלל השכונות
                </button>
            </div>
        </div>
    </section>

    <!-- Map + Lost and Found Section (side by side) -->
    <section class="max-w-7xl mx-auto px-4">
        <div class="flex flex-col lg:flex-row gap-6">
            <!-- Map Section (3/4 width on desktop, full width on mobile) -->
            <div class="lg:w-3/4">
                <JerusalemMap />
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
                    <!-- Left: Lost and Found -->
                    <div>
                        <LostAndFound />
                    </div>
                    
                    <!-- Right: Placeholder for future board -->
                    <div class="rounded-2xl bg-[#0f172a] border border-blue-500/30 overflow-hidden shadow-2xl flex flex-col h-full">
                        <div class="bg-gradient-to-r from-green-600 to-teal-600 p-2 flex items-center justify-between flex-shrink-0">
                            <h3 class="text-xs font-bold text-white flex items-center gap-1">
                                <span class="text-sm">📢</span>
                                לוח הודעות
                            </h3>
                            <button class="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-2 py-1 rounded-full transition-colors border border-white/20">
                                + הוסף
                            </button>
                        </div>
                        <div class="p-2 flex-1 flex items-center justify-center">
                            <p class="text-gray-400 text-xs text-center">בקרוב...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Facebook Comments Section -->
    <section class="max-w-6xl mx-auto px-4">
        <div 
            class="rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 backdrop-blur-sm p-6"
            title="שאל שאלה, הבע דעתך והצטרף לשיח בשכונה"
        >
            <h3 class="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
                <svg class="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                שיח פתוח
            </h3>
            <FacebookComments numPosts={10} />
        </div>
    </section>

    <!-- Referendum Banner -->
    <section class="max-w-6xl mx-auto px-4">
        <ReferendumBanner />
    </section>

    <!-- Emergency Team Banner -->
    <!-- Force deployment update -->
    <section class="max-w-6xl mx-auto px-4">
        <!-- Desktop: 3 columns, Mobile: horizontal scroll -->
        <div class="hidden md:grid md:grid-cols-3 gap-6">
            <!-- כותל המשאלות -->
            <a 
                href="/community-fund"
                class="group p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 block flex flex-col"
            >
                <div class="transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow">
                    <div class="text-4xl mb-3 transition-transform duration-300 group-hover:rotate-12">🙏</div>
                    <h4 class="text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-blue-400">כותל המשאלות</h4>
                    <p class="text-gray-400 text-sm mb-4 transition-colors duration-300 group-hover:text-gray-300 flex-grow">
                        קופת השכונה לסייע לנזקקים
                    </p>
                    <div class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full group-hover:scale-105 group-hover:shadow-lg text-center mt-auto">
                        בקש עזרה מקופת הקהילה
                    </div>
                </div>
            </a>

            <!-- פנה לוועד השכונה -->
            <div class="group p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 flex flex-col">
                <div class="transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow">
                    <div class="text-4xl mb-3 transition-transform duration-300 group-hover:rotate-12">🏛️</div>
                    <h4 class="text-lg font-bold mb-2 transition-colors duration-300 group-hover:text-purple-400">פנה לוועד השכונה</h4>
                    <p class="text-gray-400 text-sm mb-4 transition-colors duration-300 group-hover:text-gray-300 flex-grow">
                        יש לך הצעה? רוצה לשפר את השכונה? הוועד כאן בשבילך!
                    </p>
                    <button class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all w-full group-hover:scale-105 group-hover:shadow-lg mt-auto">
                        צור קשר עם הוועד
                    </button>
                </div>
            </div>

            <!-- כיתת כוננות -->
            <div class="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-2 flex flex-col">
                <div class="absolute inset-0 bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500 transition-transform duration-300 group-hover:scale-110"></div>
                <div class="relative z-10 p-6 transition-transform duration-300 group-hover:scale-105 flex flex-col flex-grow">
                    <div class="text-center text-white flex flex-col flex-grow">
                        <span class="text-4xl mb-2 block transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">🚨</span>
                        <h3 class="text-xl font-black mb-2 transition-all duration-300 group-hover:text-yellow-200">
                            <span class="group-hover:hidden">כיתת כוננות</span>
                            <span class="hidden group-hover:inline">חזק את ביטחון השכונה</span>
                        </h3>
                        <p class="text-sm mb-4 text-yellow-100 transition-colors duration-300 group-hover:text-white flex-grow">
                            הצטרף לכיתת הכוננות של השכונה
                        </p>
                        <p class="text-xs mb-3 text-yellow-100 transition-colors duration-300 group-hover:text-white group-hover:font-bold">
                            <span class="font-bold">127</span> חברים פעילים
                        </p>
                        <button class="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-100 transition-all w-full group-hover:scale-105 group-hover:shadow-xl mt-auto">
                            הצטרף עכשיו 🔥
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile: 3 cards in one row, equal width -->
        <div class="md:hidden">
            <div class="grid grid-cols-3 gap-2 h-32">
                <!-- כותל המשאלות - Mobile -->
                <a 
                    href="/community-fund"
                    class="p-3 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 backdrop-blur-sm flex flex-col h-full"
                >
                    <div class="text-xl mb-1">🙏</div>
                    <h4 class="text-xs font-bold mb-1 text-blue-400">כותל המשאלות</h4>
                    <p class="text-gray-400 text-[10px] mb-2 leading-tight flex-grow">
                        קופת השכונה
                    </p>
                    <div class="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold text-center">
                        בקש עזרה
                    </div>
                </a>

                <!-- פנה לוועד השכונה - Mobile -->
                <div class="p-3 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 backdrop-blur-sm flex flex-col h-full">
                    <div class="text-xl mb-1">🏛️</div>
                    <h4 class="text-xs font-bold mb-1 text-purple-400">ועד השכונה</h4>
                    <p class="text-gray-400 text-[10px] mb-2 leading-tight flex-grow">
                        יש לך הצעה?
                    </p>
                    <button class="bg-purple-600 text-white px-2 py-1 rounded text-[10px] font-bold w-full">
                        צור קשר
                    </button>
                </div>

                <!-- כיתת כוננות - Mobile -->
                <div class="relative overflow-hidden rounded-lg h-full">
                    <div class="absolute inset-0 bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500"></div>
                    <div class="relative z-10 p-3 h-full flex flex-col">
                        <div class="text-center text-white flex flex-col flex-grow">
                            <span class="text-xl mb-1 block">🚨</span>
                            <h3 class="text-xs font-black mb-1">כיתת כוננות</h3>
                            <p class="text-[10px] mb-2 text-yellow-100 leading-tight flex-grow">
                                127 חברים
                            </p>
                            <button class="bg-white text-red-600 px-2 py-1 rounded text-[10px] font-bold w-full">
                                הצטרף
                            </button>
                        </div>
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
