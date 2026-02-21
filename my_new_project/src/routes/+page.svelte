<script lang="ts">
    import { t } from "svelte-i18n";
    import JerusalemMap from "$lib/components/JerusalemMap.svelte";
    import LostAndFound from "$lib/components/LostAndFound.svelte";
    import ReferendumBanner from "$lib/components/ReferendumBanner.svelte";
    import FacebookComments from "$lib/components/FacebookComments.svelte";
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
            <!-- הוסף עסק -->
            <div class="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 backdrop-blur-sm">
                <h4 class="text-lg font-bold mb-2">הוסף את העסק שלך</h4>
                <p class="text-gray-400 text-sm mb-4">
                    היה חלק מהמפה הקהילתית שלנו וקבל חשיפה לכל תושבי השכונה.
                </p>
                <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors w-full">
                    הוסף עסק עכשיו
                </button>
            </div>

            <!-- דווח על שירות -->
            <div class="p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 backdrop-blur-sm">
                <h4 class="text-lg font-bold mb-2">דווח על שירות/עזרה</h4>
                <p class="text-gray-400 text-sm mb-4">
                    ראית משהו שצריך תיקון? רוצה להציע עזרה לשכנים? דווח לנו.
                </p>
                <button class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors w-full">
                    פתח פנייה
                </button>
            </div>

            <!-- כיתת כוננות -->
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

    <!-- Facebook Comments Section -->
    <section class="max-w-6xl mx-auto px-4">
        <div class="rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 backdrop-blur-sm p-6">
            <h3 class="text-2xl font-bold text-white mb-4 text-center">
                💬 תגובות הקהילה
            </h3>
            <p class="text-gray-400 text-center mb-6">
                שתף את דעתך והצטרף לשיחה עם שאר חברי הקהילה
            </p>
            <FacebookComments numPosts={10} />
        </div>
    </section>
</div>

<style>
    /* Base styles handled in app.css */
</style>
