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

        <!-- נתוני האתר הכלליים - אותו פאנל כמו בלוח הניהול -->
        <div class="mb-6">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-xl">🌍</span>
                <h2 class="text-white text-lg font-black">נתוני האתר הכלליים</h2>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- משתמשים -->
                <div class="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-600/15 to-blue-500/5 p-4">
                    <!-- תמונת הקהילה בגדול, ממלאת את השטח הפנוי בצד שמאל -->
                    <img
                        src="/images/60712_175258.png"
                        alt=""
                        class="pointer-events-none absolute left-2 inset-y-0 my-auto h-[68px] w-[68px] rounded-2xl object-cover ring-1 ring-white/20 shadow-lg"
                    />
                    <div class="relative">
                        <div class="text-blue-200/80 text-sm font-bold mb-1">משתמשים</div>
                        <div class="text-4xl font-black text-white leading-none tabular-nums">{data.site.totalUsers}</div>
                        {#if data.site.newUsersThisMonth > 0}
                            <div class="text-xs text-blue-300/80 mt-1.5 font-bold">+{data.site.newUsersThisMonth} החודש</div>
                        {/if}
                    </div>
                </div>

                <!-- פרטים במפה -->
                <div class="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-600/15 to-purple-500/5 p-4">
                    <!-- תמונת מפת הקהילה בגדול בשטח הפנוי בצד שמאל -->
                    <img
                        src="/images/Co260712_181739.png"
                        alt=""
                        class="pointer-events-none absolute left-2 inset-y-0 my-auto h-[68px] w-[68px] rounded-2xl object-cover ring-1 ring-white/20 shadow-lg"
                    />
                    <div class="relative">
                        <div class="text-purple-200/80 text-sm font-bold mb-1">פרטים במפה</div>
                        <div class="text-4xl font-black text-white leading-none tabular-nums">{data.site.totalItems}</div>
                        {#if data.site.newItemsThisMonth > 0}
                            <div class="text-xs text-purple-300/80 mt-1.5 font-bold">+{data.site.newItemsThisMonth} החודש</div>
                        {/if}
                    </div>
                </div>

                <!-- רכזים -->
                <div class="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-600/15 to-amber-500/5 p-4">
                    <div class="flex items-center gap-2 text-amber-200/80 text-sm font-bold mb-1">
                        <span class="text-lg">🏘️</span> רכזי שכונות
                    </div>
                    <div class="text-4xl font-black text-white leading-none tabular-nums">{data.site.totalCoordinators}</div>
                    <div class="text-xs text-amber-300/70 mt-1.5 font-bold">מנהלי תוכן פעילים</div>
                </div>

                <!-- כניסות החודש - מתעדכן פעם ביום -->
                <div class="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-600/15 to-emerald-500/5 p-4">
                    <!-- תמונת "כניסות לאתר" בגדול בשטח הפנוי בצד שמאל -->
                    <img
                        src="/images/60712_183146.png"
                        alt=""
                        class="pointer-events-none absolute left-2 inset-y-0 my-auto h-[68px] w-[68px] rounded-2xl object-cover ring-1 ring-white/20 shadow-lg"
                    />
                    <div class="relative">
                        <div class="text-emerald-200/80 text-sm font-bold mb-1">כניסות</div>
                        <div class="text-4xl font-black text-white leading-none tabular-nums">{data.site.monthlyVisits}</div>
                        <div class="text-xs text-emerald-300/70 mt-1.5 font-bold">החודש</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- לוח בקרה - סיכום השכונה של הרכז בלבד -->
        <div class="mb-6">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-xl">📊</span>
                <h2 class="text-white text-lg font-black">לוח בקרה — {data.neighborhoods.join(', ') || 'השכונה שלי'}</h2>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- תושבים רשומים -->
                <div class="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-600/15 to-blue-500/5 p-4">
                    <div class="flex items-center gap-2 text-cyan-200/80 text-sm font-bold mb-1">
                        <span class="text-lg">👥</span> תושבים רשומים
                    </div>
                    <div class="text-4xl font-black text-white leading-none tabular-nums">{data.residentsCount}</div>
                    {#if data.newResidentsThisMonth > 0}
                        <div class="text-xs text-cyan-300/80 mt-1.5 font-bold">+{data.newResidentsThisMonth} החודש</div>
                    {:else}
                        <div class="text-xs text-cyan-300/60 mt-1.5 font-bold">בשכונה שלך</div>
                    {/if}
                </div>

                <!-- פריטים על המפה -->
                <div class="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-600/15 to-emerald-500/5 p-4">
                    <div class="flex items-center gap-2 text-emerald-200/80 text-sm font-bold mb-1">
                        <span class="text-lg">📍</span> על המפה
                    </div>
                    <div class="text-4xl font-black text-white leading-none tabular-nums">{data.itemsOnMap}</div>
                    <div class="text-xs text-emerald-300/70 mt-1.5 font-bold">פריטים מוצגים במפה</div>
                </div>

                <!-- סך פרסומים בשכונה -->
                <div class="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-600/15 to-purple-500/5 p-4">
                    <div class="flex items-center gap-2 text-purple-200/80 text-sm font-bold mb-1">
                        <span class="text-lg">📋</span> פרסומים בשכונה
                    </div>
                    <div class="text-4xl font-black text-white leading-none tabular-nums">{data.itemsCount}</div>
                    {#if data.newItemsThisMonth > 0}
                        <div class="text-xs text-purple-300/80 mt-1.5 font-bold">+{data.newItemsThisMonth} החודש</div>
                    {:else}
                        <div class="text-xs text-purple-300/60 mt-1.5 font-bold">סך הכל</div>
                    {/if}
                </div>

                <!-- אירועים ממתינים -->
                <div class="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-600/15 to-amber-500/5 p-4">
                    <div class="flex items-center gap-2 text-amber-200/80 text-sm font-bold mb-1">
                        <span class="text-lg">🗓️</span> אירועים ממתינים
                    </div>
                    <div class="text-4xl font-black text-white leading-none tabular-nums">{data.pendingEventsCount}</div>
                    <div class="text-xs text-amber-300/70 mt-1.5 font-bold">לאישורך</div>
                </div>
            </div>
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

        <!-- כלים נוספים לרכז: סטטיסטיקת השכונה, ועדי שכונות הארצי, אבטחה -->
        <div class="mt-6 flex flex-wrap gap-3">
            <!-- סטטיסטיקת השכונה של הרכז (מסונן לשכונתו בלבד) -->
            <a
                href="/coordinator/statistics"
                class="group flex items-center gap-2.5 rounded-xl bg-[#0f172a] border border-emerald-500/30 px-4 py-2.5 hover:border-emerald-400/60 transition-all"
            >
                <span class="text-2xl">📊</span>
                <span class="text-white text-sm font-black">סטטיסטיקת השכונה</span>
            </a>

            <!-- אתר ועדי השכונות הארצי -->
            <a
                href="https://neighborhoods.gofreeil.com/"
                target="_blank"
                rel="noopener noreferrer"
                class="group flex items-center gap-2.5 rounded-xl bg-[#0f172a] border border-indigo-500/30 px-4 py-2.5 hover:border-indigo-400/60 transition-all"
            >
                <span class="text-2xl">🏘️</span>
                <span class="text-white text-sm font-black">ועדי שכונות</span>
                <span class="text-indigo-300 text-[10px] font-bold bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">↗</span>
            </a>

            <!-- אבטחה: אימות דו-שלבי לרכז -->
            <a
                href="/coordinator/2fa-setup"
                class="group flex items-center gap-2.5 rounded-xl bg-[#0f172a] border border-white/10 px-4 py-2.5 hover:border-cyan-400/60 transition-all"
            >
                <span class="text-2xl">🔐</span>
                <span class="text-white text-sm font-black">אימות דו-שלבי</span>
                {#if data.user?.totp_enabled}
                    <span class="text-green-300 text-[10px] font-bold bg-green-500/20 border border-green-500/30 px-1.5 py-0.5 rounded-full">✅ פעיל</span>
                {:else}
                    <span class="text-amber-300 text-[10px] font-bold bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-full">מומלץ</span>
                {/if}
            </a>
        </div>

        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
