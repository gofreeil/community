<script lang="ts">
    import { t } from "svelte-i18n";
    import JerusalemMap from "$lib/components/JerusalemMap.svelte";
    import LostAndFound from "$lib/components/LostAndFound.svelte";
    import FacebookComments from "$lib/components/FacebookComments.svelte";
</script>

<div class="space-y-12 pb-20 pt-8">
    <!-- Title Section - centered across full width -->
    <section class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-8 relative neighborhoods-menu-container">
            <div class="flex items-center justify-center gap-4">
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
            <!-- Map Section (3/4 width) -->
            <div class="lg:w-3/4">
                <JerusalemMap />
            </div>

            <!-- Lost and Found Section (1/4 width) - starts from top -->
            <div class="lg:w-1/4">
                <LostAndFound />
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

    <!-- Emergency Team Banner -->
    <!-- Force deployment update -->
    <section class="max-w-6xl mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </section>
</div>

<style>
    /* Base styles handled in app.css */
</style>
