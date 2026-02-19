<script lang="ts">
    import { t } from "svelte-i18n";
    import JerusalemMap from "$lib/components/JerusalemMap.svelte";
    import LostAndFound from "$lib/components/LostAndFound.svelte";
    import ReferendumBanner from "$lib/components/ReferendumBanner.svelte";
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

    <!-- CTA Section (Bottom Placeholder) -->
    <section
        class="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6"
    >
        <div
            class="p-8 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 backdrop-blur-sm"
        >
            <h4 class="text-xl font-bold mb-2">הוסף את העסק שלך</h4>
            <p class="text-gray-400 text-sm mb-4">
                היה חלק מהמפה הקהילתית שלנו וקבל חשיפה לכל תושבי השכונה.
            </p>
            <button
                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
            >
                הוסף עסק עכשיו
            </button>
        </div>
        <div
            class="p-8 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 backdrop-blur-sm"
        >
            <h4 class="text-xl font-bold mb-2">דווח על שירות/עזרה</h4>
            <p class="text-gray-400 text-sm mb-4">
                ראית משהו שצריך תיקון? רוצה להציע עזרה לשכנים? דווח לנו.
            </p>
            <button
                class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
            >
                פתח פנייה
            </button>
        </div>
    </section>
</div>

<style>
    /* Base styles handled in app.css */
</style>
