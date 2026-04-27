<script lang="ts">
    import type { PageData } from './$types';
    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>פאנל רכז שכונה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-5xl mx-auto">
        <div class="text-center mb-8">
            <span class="text-5xl mb-3 block">🛠️</span>
            <h1 class="text-3xl font-black text-white mb-2">פאנל רכז שכונה</h1>
            <p class="text-gray-400">ניהול תוכן עבור: <strong class="text-white">{data.neighborhoods.join(', ') || '—'}</strong></p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Events -->
            <a href="/events" class="group rounded-2xl bg-[#0f172a] border border-green-500/30 p-5 hover:border-green-400/60 transition-all hover:-translate-y-1">
                <div class="flex items-start gap-4">
                    <div class="text-4xl">🗓️</div>
                    <div class="flex-1">
                        <h3 class="text-white text-lg font-black mb-1">לוח אירועים</h3>
                        <p class="text-gray-400 text-sm mb-3">פרסום, אישור והסרה של אירועים בשכונה</p>
                        {#if data.pendingEventsCount > 0}
                            <span class="inline-block bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2.5 py-1 rounded-full">
                                {data.pendingEventsCount} ממתינים לאישור
                            </span>
                        {/if}
                    </div>
                </div>
            </a>

            <!-- Emergency Team -->
            <a href="/coordinator/emergency-team" class="group rounded-2xl bg-[#0f172a] border border-red-500/30 p-5 hover:border-red-400/60 transition-all hover:-translate-y-1">
                <div class="flex items-start gap-4">
                    <div class="text-4xl">🚨</div>
                    <div class="flex-1">
                        <h3 class="text-white text-lg font-black mb-1">כיתת כוננות</h3>
                        <p class="text-gray-400 text-sm mb-3">ניהול רשימת חברי כיתת הכוננות</p>
                        <span class="inline-block bg-red-500/20 text-red-300 text-xs font-bold px-2.5 py-1 rounded-full">
                            {data.emergencyCount} חברים פעילים
                        </span>
                    </div>
                </div>
            </a>

            <!-- Polls -->
            <a href="/coordinator/polls" class="group rounded-2xl bg-[#0f172a] border border-purple-500/30 p-5 hover:border-purple-400/60 transition-all hover:-translate-y-1">
                <div class="flex items-start gap-4">
                    <div class="text-4xl">🗳️</div>
                    <div class="flex-1">
                        <h3 class="text-white text-lg font-black mb-1">משאלים והצבעות</h3>
                        <p class="text-gray-400 text-sm mb-3">יצירת משאלים, צפייה בתוצאות וסגירה</p>
                        <span class="inline-block bg-purple-500/20 text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full">
                            {data.activePollsCount} משאלים פעילים
                        </span>
                    </div>
                </div>
            </a>

            <!-- Vaad -->
            <a href="/coordinator/vaad" class="group rounded-2xl bg-[#0f172a] border border-blue-500/30 p-5 hover:border-blue-400/60 transition-all hover:-translate-y-1">
                <div class="flex items-start gap-4">
                    <div class="text-4xl">🏛️</div>
                    <div class="flex-1">
                        <h3 class="text-white text-lg font-black mb-1">ועד השכונה</h3>
                        <p class="text-gray-400 text-sm mb-3">ניהול חברי ועד השכונה ופרטי קשר</p>
                        <span class="inline-block bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
                            {data.vaadCount} חברי ועד
                        </span>
                    </div>
                </div>
            </a>
        </div>

        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
