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

    <!-- Emergency Team Banner -->
    <section class="max-w-6xl mx-auto px-4">
        <div class="relative overflow-hidden rounded-2xl shadow-2xl">
            <!-- רקע גרדיאנט -->
            <div class="absolute inset-0 bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500"></div>
            
            <!-- תוכן -->
            <div class="relative z-10 p-8 md:p-10">
                <div class="flex flex-col md:flex-row items-center justify-between gap-6">
                    <!-- צד ימין - טקסט -->
                    <div class="flex-1 text-white text-center md:text-right">
                        <div class="flex items-center justify-center md:justify-end gap-3 mb-3">
                            <span class="text-5xl md:text-6xl">🚨</span>
                            <h2 class="text-3xl md:text-4xl font-black leading-tight">
                                כיתת כוננות שכונתית
                            </h2>
                        </div>
                        
                        <p class="text-lg md:text-xl font-bold text-yellow-100 mb-4">
                            הצטרף לכיתת הכוננות של השכונה והיה חלק מהמגינים על הקהילה
                        </p>
                        
                        <div class="flex flex-wrap gap-2 justify-center md:justify-end">
                            <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold border border-white/30">
                                <span class="text-xl">🛡️</span>
                                <span>אבטחה וביטחון</span>
                            </div>
                            <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold border border-white/30">
                                <span class="text-xl">👥</span>
                                <span>עבודת צוות</span>
                            </div>
                            <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold border border-white/30">
                                <span class="text-xl">⏰</span>
                                <span>זמינות גמישה</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- צד שמאל - כפתור פעולה -->
                    <div class="flex-shrink-0">
                        <button class="relative group">
                            <div class="absolute inset-0 bg-white rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                            <div class="relative bg-white rounded-xl px-8 py-6 shadow-xl">
                                <div class="text-center">
                                    <div class="text-2xl font-black text-red-600 mb-1">
                                        הצטרף עכשיו
                                    </div>
                                    <div class="text-sm font-bold text-orange-600">
                                        נרשמים כאן! 🔥
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
                
                <!-- סטטיסטיקות -->
                <div class="mt-6 grid grid-cols-3 gap-4 text-center">
                    <div class="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                        <div class="text-2xl font-black text-white">127</div>
                        <div class="text-xs text-yellow-100">חברי כוננות</div>
                    </div>
                    <div class="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                        <div class="text-2xl font-black text-white">24/7</div>
                        <div class="text-xs text-yellow-100">זמינות</div>
                    </div>
                    <div class="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                        <div class="text-2xl font-black text-white">15</div>
                        <div class="text-xs text-yellow-100">שכונות פעילות</div>
                    </div>
                </div>
            </div>
        </div>
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
