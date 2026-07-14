<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import EventsBoard from '$lib/components/EventsBoard.svelte';
    let { data }: { data: PageData } = $props();

    // תאריך הצטרפות בפורמט עברי קריא (23.5.2026)
    const fmtDate = (iso: string) => {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('he-IL');
    };

    // הודעה אישית לתושב - מודל שליחה דרך פעולת sendMessage בשרת
    let msgTarget = $state<{ id: string; name: string } | null>(null);
    let msgText = $state('');
    let msgSending = $state(false);
    let msgError = $state('');
    let msgSentTo = $state(''); // שם הנמען האחרון שנשלחה אליו הודעה - לחיווי הצלחה

    function openMessage(r: { id: string; name: string }) {
        msgTarget = { id: r.id, name: r.name };
        msgText = '';
        msgError = '';
    }
</script>

<svelte:head>
    <title>פאנל רכז שכונה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-5xl mx-auto">
        <div class="text-center mb-8">
            <img
                src="/images/rakaz-shchuna.webp"
                alt="רכז שכונה"
                class="mx-auto mb-3 h-28 w-28 rounded-full object-cover object-top ring-2 ring-white/20 shadow-lg"
            />
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
                        src="/images/60712_175258.webp"
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
                        src="/images/Co260712_181739.webp"
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
                        src="/images/60712_183146.webp"
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

        <!-- רשימת הרשומים של הרכז - שמות בלבד, בלי טלפונים ואימיילים (פרטיות התושבים) -->
        <div class="mb-6">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xl">👥</span>
                <h2 class="text-white text-lg font-black">הרשומים בשכונה שלך ({data.residents.length})</h2>
            </div>
            <p class="text-gray-500 text-sm mb-3">שמות ותאריכי הצטרפות בלבד — טלפונים ואימיילים אינם מוצגים, לשמירה על פרטיות התושבים. אפשר לשלוח לכל תושב הודעה אישית דרך האתר 💬</p>
            {#if msgSentTo}
                <p class="mb-3 rounded-xl bg-green-500/15 border border-green-500/30 px-3 py-2 text-green-300 text-sm font-bold">✅ ההודעה נשלחה ל{msgSentTo} - תופיע אצלו בתיבת ההודעות באתר</p>
            {/if}
            {#if data.residents.length === 0}
                <div class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 text-center text-gray-400 text-sm">
                    אין עדיין תושבים רשומים בשכונה שלך
                </div>
            {:else}
                <div class="rounded-2xl bg-[#0f172a] border border-cyan-500/25 p-3 max-h-80 overflow-y-auto">
                    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {#each data.residents as r (r.id)}
                            <li class="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                                {#if r.avatarUrl}
                                    <img src={r.avatarUrl} alt="" class="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/20" />
                                {:else}
                                    <div class="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                        {r.name.charAt(0)}
                                    </div>
                                {/if}
                                <div class="min-w-0 flex-1">
                                    <div class="text-white text-sm font-bold truncate">{r.name}</div>
                                    {#if r.neighborhood}
                                        <div class="text-gray-400 text-xs truncate">{r.neighborhood}{r.city && !r.neighborhood.includes('(') ? ` (${r.city})` : ''}</div>
                                    {/if}
                                </div>
                                {#if r.joinedAt}
                                    <div class="text-[10px] text-gray-500 font-bold shrink-0" title="תאריך הצטרפות">{fmtDate(r.joinedAt)}</div>
                                {/if}
                                <button
                                    type="button"
                                    onclick={() => openMessage(r)}
                                    title="שלח הודעה אישית ל{r.name}"
                                    aria-label="שלח הודעה אישית ל{r.name}"
                                    class="h-8 w-8 shrink-0 rounded-full border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/25 flex items-center justify-center text-sm transition-colors"
                                >💬</button>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
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

        <!-- תצוגה מקדימה: לוח האירועים כפי שהתושבים רואים אותו בדף הבית -->
        <div class="mt-8">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xl">👁️</span>
                <h2 class="text-white text-lg font-black">כך נראה לוח האירועים לתושבים</h2>
            </div>
            <p class="text-gray-500 text-sm mb-3">תצוגה מקדימה זהה לכרטיס בדף הבית — כדי שתראה את הנראות הסופית של האירועים שאתה מאשר</p>
            <div class="flex h-[420px] w-full max-w-xs flex-col">
                <EventsBoard rawEvents={data.events} />
            </div>
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

<!-- מודל שליחת הודעה אישית לתושב -->
{#if msgTarget}
    <div
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onclick={(ev) => { if (ev.target === ev.currentTarget && !msgSending) msgTarget = null; }}
        onkeydown={(ev) => { if (ev.key === 'Escape' && !msgSending) msgTarget = null; }}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        dir="rtl"
    >
        <div class="w-full max-w-md rounded-2xl bg-[#0f172a] border border-cyan-500/30 shadow-2xl p-5">
            <h3 class="text-white text-lg font-black mb-1">💬 הודעה אישית ל{msgTarget.name}</h3>
            <p class="text-gray-400 text-sm mb-4">ההודעה תופיע אצלו בתיבת "הודעות" באתר. פרטי הקשר שלו לא נחשפים.</p>
            <form
                method="POST"
                action="?/sendMessage"
                use:enhance={() => {
                    msgSending = true;
                    msgError = '';
                    return async ({ result }) => {
                        msgSending = false;
                        if (result.type === 'success') {
                            msgSentTo = msgTarget?.name ?? '';
                            msgTarget = null;
                            msgText = '';
                            setTimeout(() => (msgSentTo = ''), 5000);
                        } else if (result.type === 'failure') {
                            msgError = String(result.data?.chatError ?? 'שגיאה בשליחת ההודעה');
                        } else {
                            msgError = 'שגיאה בשליחת ההודעה, נסה שוב';
                        }
                    };
                }}
            >
                <input type="hidden" name="residentId" value={msgTarget.id} />
                <textarea
                    name="text"
                    bind:value={msgText}
                    rows="4"
                    maxlength="4000"
                    required
                    placeholder="כתוב כאן את ההודעה..."
                    class="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none resize-y"
                ></textarea>
                {#if msgError}
                    <p class="mt-2 text-red-400 text-sm font-bold">⚠️ {msgError}</p>
                {/if}
                <div class="mt-3 flex gap-2">
                    <button
                        type="submit"
                        disabled={msgSending || !msgText.trim()}
                        class="flex-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm px-4 py-2.5 transition-colors disabled:opacity-50"
                    >
                        {msgSending ? '⏳ שולח...' : '📤 שלח הודעה'}
                    </button>
                    <button
                        type="button"
                        onclick={() => (msgTarget = null)}
                        disabled={msgSending}
                        class="rounded-xl border border-white/15 text-gray-300 hover:text-white hover:bg-white/10 font-bold text-sm px-4 py-2.5 transition-colors disabled:opacity-50"
                    >
                        ביטול
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
