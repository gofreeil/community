<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let today = new Date();
    let currentMonth = $state(today.getMonth());
    let currentYear  = $state(today.getFullYear());

    const hebrewMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    const hebrewDays   = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

    function getDaysInMonth(month: number, year: number) {
        return new Date(year, month + 1, 0).getDate();
    }
    function getFirstDayOfMonth(month: number, year: number) {
        return new Date(year, month, 1).getDay();
    }

    let calendarDays = $derived.by(() => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay    = getFirstDayOfMonth(currentMonth, currentYear);
        const days: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(d);
        return days;
    });

    function getEventsForDay(day: number) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return data.events.filter((e: any) => e.date === dateStr);
    }

    function isToday(day: number) {
        return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    }

    function prevMonth() {
        if (currentMonth === 0) { currentMonth = 11; currentYear--; }
        else currentMonth--;
    }
    function nextMonth() {
        if (currentMonth === 11) { currentMonth = 0; currentYear++; }
        else currentMonth++;
    }

    let selectedEvent = $state<any | null>(null);

    let upcomingEvents = $derived(
        [...data.events]
            .filter((e: any) => new Date(e.date) >= new Date(today.toDateString()))
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
    );

    const colorMap: Record<string, string> = {
        green:  'bg-green-600/20 border-green-500/30 text-green-400',
        blue:   'bg-blue-600/20 border-blue-500/30 text-blue-400',
        purple: 'bg-purple-600/20 border-purple-500/30 text-purple-400',
        orange: 'bg-orange-600/20 border-orange-500/30 text-orange-400',
        teal:   'bg-teal-600/20 border-teal-500/30 text-teal-400',
        pink:   'bg-pink-600/20 border-pink-500/30 text-pink-400',
        yellow: 'bg-yellow-600/20 border-yellow-500/30 text-yellow-400',
    };

    function formatEventDate(dateStr: string) {
        const d = new Date(dateStr);
        return `${d.getDate()} ${hebrewMonths[d.getMonth()]}`;
    }

    // ── Forms state ──
    let showSuggestForm   = $state(false);
    let showAddForm       = $state(false);
    let submitting        = $state(false);
    let successMsg        = $state('');
    let approvePrice: Record<string, number>  = $state({});
    let approveDesc:  Record<string, string>  = $state({});

    // icon picker
    const iconOptions = ['📅','🎤','🎉','🏃','🌱','🧹','🛍️','🎓','🍕','🏋️','🎨','🎵','👨‍👩‍👧','📚','🙏'];
    let addIcon    = $state('📅');
    let suggestIcon = $state('📅');

    // coordinator neighborhoods
    const coordNeighborhoods: string[] = (data.user as any)?.coordinator_of ?? [];
</script>

<svelte:head>
    <title>לוח אירועים — קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] py-6 md:py-12 px-4" dir="rtl">
    <div class="max-w-6xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-8">
            <a href="/" class="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block transition-colors">→ חזרה לעמוד הראשי</a>
            <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
                🗓️ לוח אירועים קהילתי
            </h1>
            <p class="text-gray-400 mt-2 text-sm md:text-base">כל האירועים והמפגשים בשכונה במקום אחד</p>
        </div>

        <!-- ── Pending queue (coordinator / admin only) ── -->
        {#if (data.isCoordinator || data.isAdmin) && (data.pendingEvents as any[]).length > 0}
            <div class="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/40 p-4 md:p-6">
                <h2 class="text-amber-300 font-black text-lg mb-4 flex items-center gap-2">
                    ⏳ הצעות ממתינות לאישור
                    <span class="bg-amber-500/30 text-amber-200 text-xs font-bold px-2 py-0.5 rounded-full">
                        {(data.pendingEvents as any[]).length}
                    </span>
                </h2>
                <div class="flex flex-col gap-3">
                    {#each (data.pendingEvents as any[]) as pev}
                        <div class="bg-[#0f172a] rounded-xl border border-amber-500/20 p-4">
                            <div class="flex flex-wrap items-start gap-3 justify-between">
                                <div class="flex-1 min-w-0">
                                    <p class="text-white font-bold">{pev.icon ?? '📅'} {pev.title}</p>
                                    <p class="text-gray-400 text-sm mt-1">📅 {formatEventDate(pev.date)}{pev.time ? ' · ' + pev.time : ''}</p>
                                    {#if pev.location}<p class="text-gray-500 text-xs">📍 {pev.location}</p>{/if}
                                    {#if pev.description}<p class="text-gray-400 text-xs mt-1 line-clamp-2">{pev.description}</p>{/if}
                                    <p class="text-amber-400/70 text-xs mt-1">שכונה: {pev.neighborhood ?? '—'}</p>
                                </div>
                                <div class="flex flex-col gap-2 min-w-[180px]">
                                    <!-- Price on approve -->
                                    <div class="flex gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="מחיר (₪)"
                                            bind:value={approvePrice[pev.id]}
                                            class="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm placeholder-gray-500 text-center"
                                        />
                                        <input
                                            type="text"
                                            placeholder="תיאור מחיר"
                                            bind:value={approveDesc[pev.id]}
                                            class="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm placeholder-gray-500"
                                        />
                                    </div>
                                    <div class="flex gap-2">
                                        <!-- Approve -->
                                        <form method="POST" action="?/approveEvent" use:enhance={() => {
                                            submitting = true;
                                            return async ({ update }) => { await update(); submitting = false; successMsg = 'האירוע אושר ✓'; setTimeout(() => successMsg = '', 3000); };
                                        }}>
                                            <input type="hidden" name="id" value={pev.id} />
                                            <input type="hidden" name="price" value={approvePrice[pev.id] ?? 0} />
                                            <input type="hidden" name="price_description" value={approveDesc[pev.id] ?? ''} />
                                            <button type="submit" class="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-all">
                                                ✓ אשר
                                            </button>
                                        </form>
                                        <!-- Reject -->
                                        <form method="POST" action="?/rejectEvent" use:enhance={() => {
                                            submitting = true;
                                            return async ({ update }) => { await update(); submitting = false; successMsg = 'האירוע נדחה'; setTimeout(() => successMsg = '', 3000); };
                                        }}>
                                            <input type="hidden" name="id" value={pev.id} />
                                            <button type="submit" class="bg-red-700 hover:bg-red-600 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-all">
                                                ✕ דחה
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- ── Success message ── -->
        {#if successMsg}
            <div class="mb-4 bg-green-600/20 border border-green-500/40 text-green-300 rounded-xl px-4 py-3 text-center font-bold">
                {successMsg}
            </div>
        {/if}

        <div class="flex flex-col lg:flex-row gap-6">

            <!-- Calendar Grid -->
            <div class="lg:w-2/3">
                <div class="rounded-2xl md:rounded-3xl bg-[#0f172a] border md:border-2 border-green-500/30 overflow-hidden shadow-2xl">
                    <!-- Month Navigation -->
                    <div class="bg-gradient-to-r from-green-600 to-teal-600 p-4 flex items-center justify-between">
                        <button onclick={nextMonth} aria-label="חודש הבא" class="text-white hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors font-bold text-lg">←</button>
                        <h2 id="calendar-title" class="text-xl md:text-2xl font-bold text-white">
                            {hebrewMonths[currentMonth]} {currentYear}
                        </h2>
                        <button onclick={prevMonth} aria-label="חודש קודם" class="text-white hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors font-bold text-lg">→</button>
                    </div>

                    <div class="p-3 md:p-5">
                        <!-- Day Headers -->
                        <div class="grid grid-cols-7 gap-1 mb-2">
                            {#each hebrewDays as day}
                                <div class="text-center text-xs md:text-sm font-bold text-gray-400 py-2">{day}</div>
                            {/each}
                        </div>

                        <!-- Calendar Grid -->
                        <div class="grid grid-cols-7 gap-1" role="grid" aria-labelledby="calendar-title">
                            {#each calendarDays as day}
                                {#if day === null}
                                    <div class="aspect-square" role="gridcell" aria-label=" "></div>
                                {:else}
                                    {@const dayEvents = getEventsForDay(day)}
                                    <button
                                        role="gridcell"
                                        aria-label="{day} {hebrewMonths[currentMonth]}{dayEvents.length > 0 ? ' – ' + dayEvents.length + ' אירועים' : ''}{isToday(day) ? ' (היום)' : ''}"
                                        class="aspect-square rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 relative
                                            {isToday(day) ? 'bg-green-600/30 border-green-500/50 ring-2 ring-green-400/50' : 'border-white/5 hover:border-white/20 hover:bg-white/5'}
                                            {dayEvents.length > 0 ? 'cursor-pointer' : 'cursor-default'}"
                                        onclick={() => { if (dayEvents.length > 0) selectedEvent = dayEvents[0]; }}
                                    >
                                        <span class="text-sm md:text-base font-bold {isToday(day) ? 'text-green-300' : 'text-white/80'}" aria-hidden="true">{day}</span>
                                        {#if dayEvents.length > 0}
                                            <div class="flex gap-0.5" aria-hidden="true">
                                                {#each dayEvents as _ev}
                                                    <span class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400"></span>
                                                {/each}
                                            </div>
                                            <span class="hidden md:block text-[9px] text-green-300/70 leading-tight text-center truncate w-full px-1" aria-hidden="true">
                                                {dayEvents[0].icon ?? '📅'} {dayEvents[0].title.slice(0, 12)}
                                            </span>
                                        {/if}
                                    </button>
                                {/if}
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="lg:w-1/3 flex flex-col gap-4">

                <!-- Upcoming Events -->
                <div class="rounded-2xl md:rounded-3xl bg-[#0f172a] border md:border-2 border-green-500/30 overflow-hidden shadow-2xl">
                    <div class="bg-gradient-to-r from-teal-600 to-green-600 p-4">
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">📋 אירועים קרובים</h3>
                    </div>
                    <div class="p-4 flex flex-col gap-3 max-h-[420px] overflow-y-auto">
                        {#each upcomingEvents as ev}
                            <button
                                class="flex gap-3 items-start rounded-xl p-3 border transition-all text-right w-full
                                    {colorMap[ev.color ?? 'green'] ?? colorMap.green}
                                    {selectedEvent === ev ? 'ring-2 ring-white/30 scale-[1.02]' : 'hover:scale-[1.01]'}"
                                onclick={() => selectedEvent = ev}
                            >
                                <div class="text-2xl flex-shrink-0">{ev.icon ?? '📅'}</div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-start justify-between gap-1">
                                        <p class="text-white text-sm font-bold leading-tight">{ev.title}</p>
                                        {#if ev.price > 0}
                                            <span class="bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                ₪{ev.price}
                                            </span>
                                        {/if}
                                    </div>
                                    <p class="text-gray-400 text-xs mt-1">📅 {formatEventDate(ev.date)}{ev.time ? ' · ' + ev.time : ''}</p>
                                    {#if ev.location}<p class="text-gray-500 text-xs mt-0.5">📍 {ev.location}</p>{/if}
                                </div>
                            </button>
                        {/each}
                        {#if upcomingEvents.length === 0}
                            <p class="text-center text-gray-500 py-8">אין אירועים קרובים</p>
                        {/if}
                    </div>
                </div>

                <!-- CTA card -->
                <div class="rounded-2xl bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-500/30 p-4 text-center">
                    {#if data.isCoordinator || data.isAdmin}
                        <p class="text-white font-bold text-sm mb-1">רכז שכונה 🏘️</p>
                        <p class="text-gray-400 text-xs mb-3">פרסם אירוע בלוח ישירות</p>
                        <button
                            onclick={() => { showAddForm = !showAddForm; showSuggestForm = false; }}
                            class="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold px-6 py-2 rounded-full text-sm transition-all hover:scale-105 shadow-lg"
                        >
                            {showAddForm ? '✕ סגור' : '+ פרסם אירוע'}
                        </button>
                    {:else if data.user}
                        <p class="text-white font-bold text-sm mb-1">רוצה להוסיף אירוע?</p>
                        <p class="text-gray-400 text-xs mb-3">הצע אירוע לרכז השכונה לאישור</p>
                        <button
                            onclick={() => { showSuggestForm = !showSuggestForm; showAddForm = false; }}
                            class="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold px-6 py-2 rounded-full text-sm transition-all hover:scale-105 shadow-lg"
                        >
                            {showSuggestForm ? '✕ סגור' : '+ הצע אירוע'}
                        </button>
                    {:else}
                        <p class="text-white font-bold text-sm mb-1">רוצה להציע אירוע?</p>
                        <p class="text-gray-400 text-xs mb-3">התחבר כדי להציע אירועים לקהילה</p>
                        <a href="/login" class="inline-block bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold px-6 py-2 rounded-full text-sm transition-all hover:scale-105 shadow-lg">
                            התחבר
                        </a>
                    {/if}
                </div>
            </div>
        </div>

        <!-- ── Coordinator: Add Event Form ── -->
        {#if showAddForm && (data.isCoordinator || data.isAdmin)}
            <div class="mt-6 rounded-2xl bg-[#0f172a] border border-green-500/40 p-5 md:p-8">
                <h2 class="text-white font-black text-xl mb-5 flex items-center gap-2">📣 פרסם אירוע חדש</h2>
                <form method="POST" action="?/addEvent" use:enhance={() => {
                    submitting = true;
                    return async ({ update }) => {
                        await update();
                        submitting = false;
                        showAddForm = false;
                        successMsg = 'האירוע פורסם בהצלחה ✓';
                        setTimeout(() => successMsg = '', 3000);
                    };
                }}>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Title -->
                        <div class="md:col-span-2">
                            <label class="block text-gray-300 text-sm font-semibold mb-1">כותרת האירוע *</label>
                            <input type="text" name="title" required placeholder="שם האירוע"
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/60" />
                        </div>
                        <!-- Date + Time -->
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">תאריך *</label>
                            <input type="date" name="date" required
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-400/60" />
                        </div>
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">שעה</label>
                            <input type="time" name="time"
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-400/60" />
                        </div>
                        <!-- Location -->
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">מיקום</label>
                            <input type="text" name="location" placeholder="כתובת / מקום"
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/60" />
                        </div>
                        <!-- Neighborhood (coordinator may manage multiple) -->
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">שכונה</label>
                            {#if data.isAdmin}
                                <input type="text" name="neighborhood" placeholder="שכונה"
                                    value={(data.user as any)?.neighborhood ?? ''}
                                    class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/60" />
                            {:else if coordNeighborhoods.length > 1}
                                <select name="neighborhood"
                                    class="w-full bg-[#0f172a] border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-400/60">
                                    {#each coordNeighborhoods as n}
                                        <option value={n}>{n}</option>
                                    {/each}
                                </select>
                            {:else}
                                <input type="text" name="neighborhood" readonly
                                    value={coordNeighborhoods[0] ?? (data.user as any)?.neighborhood ?? ''}
                                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-gray-400 cursor-not-allowed" />
                            {/if}
                        </div>
                        <!-- Price -->
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">מחיר (₪) — אפס = חינם</label>
                            <input type="number" name="price" min="0" value="0"
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-400/60" />
                        </div>
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">תיאור מחיר</label>
                            <input type="text" name="price_description" placeholder="לדוגמה: כולל חומרים"
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/60" />
                        </div>
                        <!-- Icon -->
                        <div class="md:col-span-2">
                            <label class="block text-gray-300 text-sm font-semibold mb-2">אייקון</label>
                            <input type="hidden" name="icon" value={addIcon} />
                            <div class="flex flex-wrap gap-2">
                                {#each iconOptions as ic}
                                    <button type="button" onclick={() => addIcon = ic}
                                        class="text-2xl p-1.5 rounded-lg transition-all {addIcon === ic ? 'bg-green-600/40 ring-2 ring-green-400/60' : 'bg-white/5 hover:bg-white/10'}">
                                        {ic}
                                    </button>
                                {/each}
                            </div>
                        </div>
                        <!-- Color -->
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">צבע</label>
                            <select name="color"
                                class="w-full bg-[#0f172a] border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-400/60">
                                <option value="green">ירוק</option>
                                <option value="blue">כחול</option>
                                <option value="purple">סגול</option>
                                <option value="orange">כתום</option>
                                <option value="teal">טיל</option>
                                <option value="pink">ורוד</option>
                                <option value="yellow">צהוב</option>
                            </select>
                        </div>
                        <!-- Description -->
                        <div class="md:col-span-2">
                            <label class="block text-gray-300 text-sm font-semibold mb-1">תיאור</label>
                            <textarea name="description" rows="3" placeholder="פרטים נוספים על האירוע..."
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400/60 resize-none"></textarea>
                        </div>
                    </div>
                    <div class="mt-5 flex gap-3">
                        <button type="submit" disabled={submitting}
                            class="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold px-8 py-2.5 rounded-xl text-sm transition-all hover:scale-105 shadow-lg disabled:opacity-50">
                            {submitting ? 'מפרסם...' : '📣 פרסם אירוע'}
                        </button>
                        <button type="button" onclick={() => showAddForm = false}
                            class="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all border border-white/20">
                            ביטול
                        </button>
                    </div>
                </form>
            </div>
        {/if}

        <!-- ── Regular user: Suggest Event Form ── -->
        {#if showSuggestForm && data.user && !data.isCoordinator && !data.isAdmin}
            <div class="mt-6 rounded-2xl bg-[#0f172a] border border-teal-500/40 p-5 md:p-8">
                <h2 class="text-white font-black text-xl mb-2 flex items-center gap-2">💡 הצע אירוע לקהילה</h2>
                <p class="text-gray-400 text-sm mb-5">הצעתך תועבר לרכז השכונה לאישור</p>
                <form method="POST" action="?/suggestEvent" use:enhance={() => {
                    submitting = true;
                    return async ({ update }) => {
                        await update();
                        submitting = false;
                        showSuggestForm = false;
                        successMsg = 'ההצעה נשלחה לרכז השכונה ✓';
                        setTimeout(() => successMsg = '', 4000);
                    };
                }}>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-gray-300 text-sm font-semibold mb-1">כותרת האירוע *</label>
                            <input type="text" name="title" required placeholder="שם האירוע"
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400/60" />
                        </div>
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">תאריך *</label>
                            <input type="date" name="date" required
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-400/60" />
                        </div>
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">שעה</label>
                            <input type="time" name="time"
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-400/60" />
                        </div>
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-1">מיקום</label>
                            <input type="text" name="location" placeholder="כתובת / מקום"
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400/60" />
                        </div>
                        <!-- Icon -->
                        <div>
                            <label class="block text-gray-300 text-sm font-semibold mb-2">אייקון</label>
                            <input type="hidden" name="icon" value={suggestIcon} />
                            <div class="flex flex-wrap gap-1.5">
                                {#each iconOptions as ic}
                                    <button type="button" onclick={() => suggestIcon = ic}
                                        class="text-xl p-1 rounded-lg transition-all {suggestIcon === ic ? 'bg-teal-600/40 ring-2 ring-teal-400/60' : 'bg-white/5 hover:bg-white/10'}">
                                        {ic}
                                    </button>
                                {/each}
                            </div>
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-gray-300 text-sm font-semibold mb-1">תיאור</label>
                            <textarea name="description" rows="3" placeholder="ספר על האירוע..."
                                class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400/60 resize-none"></textarea>
                        </div>
                    </div>
                    <div class="mt-5 flex gap-3">
                        <button type="submit" disabled={submitting}
                            class="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-500 hover:to-green-500 text-white font-bold px-8 py-2.5 rounded-xl text-sm transition-all hover:scale-105 shadow-lg disabled:opacity-50">
                            {submitting ? 'שולח...' : '💡 שלח הצעה'}
                        </button>
                        <button type="button" onclick={() => showSuggestForm = false}
                            class="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all border border-white/20">
                            ביטול
                        </button>
                    </div>
                </form>
            </div>
        {/if}

        <!-- ── Selected Event Detail ── -->
        {#if selectedEvent}
            <div class="mt-6 rounded-2xl md:rounded-3xl bg-[#0f172a] border md:border-2 border-green-500/30 overflow-hidden shadow-2xl">
                <div class="bg-gradient-to-r from-green-600 to-teal-600 p-4 flex items-center justify-between">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        {selectedEvent.icon ?? '📅'} {selectedEvent.title}
                    </h3>
                    <div class="flex items-center gap-3">
                        {#if selectedEvent.price > 0}
                            <span class="bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-sm font-bold px-3 py-1 rounded-full">
                                ₪{selectedEvent.price}{selectedEvent.price_description ? ' · ' + selectedEvent.price_description : ''}
                            </span>
                        {/if}
                        <button onclick={() => selectedEvent = null} class="text-white/70 hover:text-white text-xl font-bold transition-colors">✕</button>
                    </div>
                </div>
                <div class="p-6 flex flex-col md:flex-row gap-6">
                    <div class="flex-1 space-y-3">
                        <div class="flex items-center gap-2 text-gray-300">
                            <span class="text-lg">📅</span>
                            <span class="font-bold">{formatEventDate(selectedEvent.date)}</span>
                        </div>
                        {#if selectedEvent.time}
                            <div class="flex items-center gap-2 text-gray-300">
                                <span class="text-lg">🕐</span>
                                <span>{selectedEvent.time}</span>
                            </div>
                        {/if}
                        {#if selectedEvent.location}
                            <div class="flex items-center gap-2 text-gray-300">
                                <span class="text-lg">📍</span>
                                <span>{selectedEvent.location}</span>
                            </div>
                        {/if}
                        {#if selectedEvent.description}
                            <p class="text-gray-400 text-sm leading-relaxed mt-2">{selectedEvent.description}</p>
                        {/if}
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="flex gap-3">
                            <button class="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-105">
                                אני מגיע! ✓
                            </button>
                            <button class="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all border border-white/20">
                                שתף
                            </button>
                        </div>
                        <!-- Delete button for coordinator / admin -->
                        {#if data.isCoordinator || data.isAdmin}
                            <form method="POST" action="?/deleteEvent" use:enhance={() => {
                                return async ({ update }) => {
                                    await update();
                                    selectedEvent = null;
                                    successMsg = 'האירוע נמחק';
                                    setTimeout(() => successMsg = '', 3000);
                                };
                            }}>
                                <input type="hidden" name="id" value={selectedEvent.id} />
                                <button type="submit"
                                    class="w-full bg-red-700/30 hover:bg-red-700/50 border border-red-600/40 text-red-300 font-bold px-6 py-2 rounded-xl text-sm transition-all">
                                    🗑️ מחק אירוע
                                </button>
                            </form>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}

    </div>
</div>
