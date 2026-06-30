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
            <p class="text-gray-400">ניהול תוכן עבור: <strong class="text-white">{data.neighborhoods.join(', ') || '-'}</strong></p>
        </div>

        <!-- ספירת תושבים רשומים בשכונה -->
        <div class="mb-6 rounded-2xl bg-gradient-to-l from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 p-5 flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <div class="text-4xl">👥</div>
                <div>
                    <h3 class="text-white text-lg font-black">תושבים רשומים בשכונה</h3>
                    <p class="text-gray-400 text-sm">סך התושבים שנרשמו תחת {data.neighborhoods.length > 1 ? 'השכונות שלך' : 'השכונה שלך'}</p>
                </div>
            </div>
            <span class="text-3xl md:text-4xl font-black text-cyan-300 tabular-nums flex-shrink-0">{data.residentsCount}</span>
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

        <!-- באנר קישור לאתר ועדי שכונות הארצי -->
        <a
            href="https://neighborhoods.gofreeil.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="group mt-6 block rounded-2xl bg-gradient-to-l from-indigo-600/20 via-purple-600/15 to-pink-600/20 border border-indigo-500/40 p-5 hover:border-indigo-400/70 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10"
        >
            <div class="flex items-center gap-4">
                <div class="text-4xl">🏘️</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <h3 class="text-white text-lg font-black">אתר ועדי השכונות הארצי</h3>
                        <span class="text-indigo-300 text-xs font-bold bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-full">קישור חיצוני ↗</span>
                    </div>
                    <p class="text-gray-300 text-sm mt-1">שיתופי פעולה בין שכונות וערים, מעגלי שיח, הצבעות ומיצוי זכויות משותפות</p>
                </div>
                <svg class="w-6 h-6 text-indigo-300 flex-shrink-0 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </div>
        </a>

        <!-- אבטחה: אימות דו-שלבי לרכז -->
        <a
            href="/coordinator/2fa-setup"
            class="group mt-6 block rounded-2xl bg-[#0f172a] border border-white/10 p-5 hover:border-cyan-400/60 transition-all hover:-translate-y-1"
        >
            <div class="flex items-center gap-4">
                <div class="text-4xl">🔐</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-white text-lg font-black">אימות דו-שלבי (2FA)</h3>
                        {#if data.user?.totp_enabled}
                            <span class="text-green-300 text-xs font-bold bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-full">✅ פעיל</span>
                        {:else}
                            <span class="text-amber-300 text-xs font-bold bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">מומלץ להפעיל</span>
                        {/if}
                    </div>
                    <p class="text-gray-400 text-sm mt-1">הגנה נוספת על פאנל הרכז — קוד חד-פעמי מהטלפון בכל כניסה ממכשיר חדש</p>
                </div>
                <svg class="w-6 h-6 text-cyan-300 flex-shrink-0 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </div>
        </a>

        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
