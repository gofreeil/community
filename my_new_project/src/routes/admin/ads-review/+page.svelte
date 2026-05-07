<script lang="ts">
    import type { PageData, ActionData } from './$types';
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { onMount, onDestroy } from 'svelte';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    type Tab = 'pending' | 'approved' | 'rejected';
    let activeTab = $state<Tab>('pending');
    let searchQuery = $state('');
    let sortOrder = $state<'newest' | 'oldest'>('newest');

    // בחירה רב-פריטית
    let selected = $state<Set<string>>(new Set());
    function toggleSelect(id: string) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        selected = next;
    }
    function clearSelection() { selected = new Set(); }
    function selectAllVisible(ids: string[]) {
        const next = new Set(selected);
        for (const id of ids) next.add(id);
        selected = next;
    }

    // עריכה בשורה
    let editingId = $state<string | null>(null);
    let editTitle = $state('');
    let editSubtitle = $state('');
    let editCta = $state('');
    let editHover = $state('');
    function startEdit(ad: any) {
        editingId = ad.id;
        editTitle = ad.title ?? '';
        editSubtitle = ad.subtitle ?? '';
        editCta = ad.cta ?? '';
        editHover = ad.hoverText ?? '';
    }
    function cancelEdit() { editingId = null; }

    // רענון אוטומטי כל 30 שניות (כדי לראות פרסומות חדשות שנכנסות)
    let autoRefresh = $state(true);
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    let lastRefresh = $state(Date.now());
    onMount(() => {
        refreshTimer = setInterval(() => {
            if (autoRefresh && document.visibilityState === 'visible') {
                invalidateAll();
                lastRefresh = Date.now();
            }
        }, 30000);
    });
    onDestroy(() => { if (refreshTimer) clearInterval(refreshTimer); });

    // חישוב רשימות מסוננות
    function applyFilter<T extends { title?: string; subtitle?: string; submittedBy?: { email?: string; name?: string }; submittedAt: string }>(list: T[]): T[] {
        const q = searchQuery.trim().toLowerCase();
        const filtered = q
            ? list.filter(a =>
                (a.title ?? '').toLowerCase().includes(q) ||
                (a.subtitle ?? '').toLowerCase().includes(q) ||
                (a.submittedBy?.email ?? '').toLowerCase().includes(q) ||
                (a.submittedBy?.name ?? '').toLowerCase().includes(q))
            : list;
        return [...filtered].sort((x, y) => {
            const xt = new Date(x.submittedAt).getTime();
            const yt = new Date(y.submittedAt).getTime();
            return sortOrder === 'newest' ? yt - xt : xt - yt;
        });
    }

    let pendingList = $derived(applyFilter(data.pending.filter(p => p.status === 'pending')));
    let rejectedList = $derived(applyFilter(data.pending.filter(p => p.status === 'rejected')));
    let approvedList = $derived(applyFilter(data.approved));

    let visibleList = $derived(
        activeTab === 'pending' ? pendingList :
        activeTab === 'approved' ? approvedList :
        rejectedList
    );

    let visibleSelectedIds = $derived(
        Array.from(selected).filter(id => visibleList.some(a => a.id === id))
    );

    function fmtDate(s?: string) {
        if (!s) return '';
        return new Date(s).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
</script>

<svelte:head>
    <title>אישור פרסומות — מנהל ראשי</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-10" dir="rtl">
    <!-- כותרת + ניווט -->
    <header class="mb-5 md:mb-6 flex flex-wrap items-start gap-3 justify-between">
        <div class="min-w-0">
            <h1 class="text-2xl md:text-3xl font-black text-white mb-1">📢 אישור פרסומות</h1>
            <p class="text-xs md:text-sm text-gray-400">פרסומות שנשלחו על־ידי משתמשים — אשר/דחה לפני פרסום באתר.</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
            <a href="/admin"
               class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10">
                ← לוח ניהול
            </a>
            <a href="/profile"
               class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10">
                פרופיל
            </a>
            <button type="button"
                    onclick={() => { invalidateAll(); lastRefresh = Date.now(); }}
                    class="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold hover:bg-amber-500/25"
                    title="רענן עכשיו">
                🔄 רענן
            </button>
            <label class="text-xs text-gray-400 flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" bind:checked={autoRefresh} class="accent-amber-500" />
                רענון אוטומטי
            </label>
        </div>
    </header>

    <!-- סטטיסטיקות -->
    <section class="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-5">
        <div class="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-center">
            <div class="text-[10px] md:text-xs text-amber-300 font-bold uppercase tracking-wide">ממתינות</div>
            <div class="text-2xl md:text-3xl font-black text-amber-200">{data.stats.pending}</div>
        </div>
        <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-center">
            <div class="text-[10px] md:text-xs text-emerald-300 font-bold uppercase tracking-wide">פורסמו</div>
            <div class="text-2xl md:text-3xl font-black text-emerald-200">{data.stats.approved}</div>
        </div>
        <div class="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-center">
            <div class="text-[10px] md:text-xs text-red-300 font-bold uppercase tracking-wide">נדחו</div>
            <div class="text-2xl md:text-3xl font-black text-red-200">{data.stats.rejected}</div>
        </div>
        <div class="rounded-xl border border-blue-500/30 bg-blue-500/5 px-3 py-2.5 text-center">
            <div class="text-[10px] md:text-xs text-blue-300 font-bold uppercase tracking-wide">השבוע נשלחו</div>
            <div class="text-2xl md:text-3xl font-black text-blue-200">{data.stats.submittedThisWeek}</div>
        </div>
        <div class="rounded-xl border border-purple-500/30 bg-purple-500/5 px-3 py-2.5 text-center col-span-2 md:col-span-1">
            <div class="text-[10px] md:text-xs text-purple-300 font-bold uppercase tracking-wide">השבוע אושרו</div>
            <div class="text-2xl md:text-3xl font-black text-purple-200">{data.stats.approvedThisWeek}</div>
        </div>
    </section>

    <!-- הודעות -->
    {#if form?.success}
        <div class="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-bold">
            ✅ {form.message}
        </div>
    {/if}
    {#if form && 'error' in form && form.error}
        <div class="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm font-bold">
            ❌ {form.error}
        </div>
    {/if}

    <!-- טאבים -->
    <div class="flex gap-1.5 md:gap-2 mb-4 overflow-x-auto pb-1">
        <button type="button" onclick={() => { activeTab = 'pending'; clearSelection(); }}
                class="px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all
                       {activeTab === 'pending' ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}">
            ⏳ ממתינות ({data.stats.pending})
        </button>
        <button type="button" onclick={() => { activeTab = 'approved'; clearSelection(); }}
                class="px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all
                       {activeTab === 'approved' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}">
            ✅ פורסמו ({data.stats.approved})
        </button>
        <button type="button" onclick={() => { activeTab = 'rejected'; clearSelection(); }}
                class="px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap transition-all
                       {activeTab === 'rejected' ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}">
            ❌ נדחו ({data.stats.rejected})
        </button>
    </div>

    <!-- חיפוש + מיון -->
    <div class="flex flex-wrap gap-2 md:gap-3 mb-4">
        <input type="text" bind:value={searchQuery}
               placeholder="🔎 חיפוש לפי כותרת, תיאור או מגיש..."
               class="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-amber-400/50" />
        <select bind:value={sortOrder}
                class="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/50">
            <option value="newest" style="background:#fff;color:#111">חדש לישן</option>
            <option value="oldest" style="background:#fff;color:#111">ישן לחדש</option>
        </select>
    </div>

    <!-- שורת בחירה רב־פריטית (רק ב-pending) -->
    {#if activeTab === 'pending' && visibleList.length > 0}
        <div class="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <button type="button"
                    onclick={() => selectAllVisible(visibleList.map(a => a.id))}
                    class="text-xs font-bold text-amber-300 hover:text-amber-200">
                בחר הכל ({visibleList.length})
            </button>
            <span class="text-gray-600 text-xs">·</span>
            <button type="button" onclick={clearSelection}
                    class="text-xs font-bold text-gray-400 hover:text-gray-300">
                נקה
            </button>
            {#if visibleSelectedIds.length > 0}
                <span class="text-xs text-gray-300 mr-2">נבחרו {visibleSelectedIds.length}</span>
                <form method="POST" action="?/bulkApprove" use:enhance={() => async ({ update }) => { clearSelection(); await update(); }}
                      class="inline-flex">
                    <input type="hidden" name="ids" value={visibleSelectedIds.join(',')} />
                    <button type="submit"
                            class="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400">
                        ✅ אשר את הנבחרים
                    </button>
                </form>
                <form method="POST" action="?/bulkReject" use:enhance={() => async ({ update }) => { clearSelection(); await update(); }}
                      class="inline-flex gap-1">
                    <input type="hidden" name="ids" value={visibleSelectedIds.join(',')} />
                    <input type="text" name="reason" placeholder="סיבת דחייה (אופציונלי)"
                           class="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-white text-xs w-40" />
                    <button type="submit"
                            class="px-3 py-1.5 rounded-lg bg-red-600 text-white font-black text-xs hover:bg-red-500">
                        ❌ דחה את הנבחרים
                    </button>
                </form>
            {/if}
        </div>
    {/if}

    <!-- רשימה -->
    {#if visibleList.length === 0}
        <div class="text-center py-12 text-gray-500 text-sm italic border border-dashed border-white/10 rounded-2xl">
            {searchQuery ? 'לא נמצאו תוצאות לחיפוש' :
             activeTab === 'pending' ? 'אין פרסומות שממתינות לאישור' :
             activeTab === 'approved' ? 'עוד לא פורסמו פרסומות' : 'אין פרסומות שנדחו'}
        </div>
    {:else}
        <div class="grid gap-3 md:gap-4">
            {#each visibleList as ad (ad.id)}
                <article class="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-5">
                    <div class="flex flex-col md:flex-row gap-3 md:gap-4">
                        {#if activeTab === 'pending'}
                            <label class="flex-shrink-0 inline-flex items-start pt-1 cursor-pointer">
                                <input type="checkbox"
                                       checked={selected.has(ad.id)}
                                       onchange={() => toggleSelect(ad.id)}
                                       class="w-5 h-5 accent-amber-500" />
                            </label>
                        {/if}

                        {#if ad.mainImage}
                            <img src={ad.mainImage} alt={ad.title}
                                 class="w-full md:w-40 h-32 md:h-40 object-cover rounded-xl border border-white/10 flex-shrink-0" />
                        {/if}

                        <div class="flex-1 min-w-0">
                            {#if editingId === ad.id}
                                <form method="POST" action="?/update" use:enhance={() => async ({ update }) => { editingId = null; await update(); }}
                                      class="space-y-2">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <input type="text" name="title" bind:value={editTitle}
                                           class="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-amber-400/40 text-white font-bold text-base" />
                                    <input type="text" name="subtitle" bind:value={editSubtitle}
                                           class="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-sm" />
                                    <input type="text" name="cta" bind:value={editCta} placeholder="טקסט CTA"
                                           class="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs" />
                                    <input type="text" name="hoverText" bind:value={editHover} placeholder="טקסט hover"
                                           class="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs" />
                                    <div class="flex gap-2">
                                        <button type="submit"
                                                class="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-black text-xs">
                                            💾 שמור
                                        </button>
                                        <button type="button" onclick={cancelEdit}
                                                class="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-xs">
                                            ביטול
                                        </button>
                                    </div>
                                </form>
                            {:else}
                                <h3 class="text-base md:text-lg font-black text-white mb-1">{ad.title}</h3>
                                <p class="text-xs md:text-sm text-gray-300 mb-1">{ad.subtitle}</p>
                                {#if ad.cta}
                                    <p class="text-[10px] md:text-xs text-amber-300 mb-2">CTA: {ad.cta}</p>
                                {/if}
                                {#if ad.hoverText}
                                    <p class="text-[10px] md:text-xs text-gray-500 mb-2">Hover: {ad.hoverText}</p>
                                {/if}
                                <div class="text-[10px] md:text-xs text-gray-400 space-y-0.5">
                                    {#if ad.submittedBy?.email}<div>📧 {ad.submittedBy.email}</div>{/if}
                                    <div>📅 נשלח: {fmtDate(ad.submittedAt)}</div>
                                    {#if ad.decidedAt}<div>🕒 הוחלט: {fmtDate(ad.decidedAt)}</div>{/if}
                                    {#if ad.landing?.phone}<div>☎️ {ad.landing.phone}</div>{/if}
                                    {#if ad.landing?.website}<div>🌐 {ad.landing.website}</div>{/if}
                                    {#if ad.landing?.address}<div>📍 {ad.landing.address}</div>{/if}
                                    {#if ad.rejectionReason}<div class="text-red-300">❌ סיבת דחייה: {ad.rejectionReason}</div>{/if}
                                </div>
                            {/if}
                        </div>
                    </div>

                    {#if editingId !== ad.id}
                        <details class="mt-3 text-xs text-gray-300">
                            <summary class="cursor-pointer text-amber-300 font-bold">👁 תצוגה מקדימה של דף הנחיתה</summary>
                            <div class="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 space-y-2">
                                {#if ad.landing?.headline}<p class="font-bold text-white">{ad.landing.headline}</p>{/if}
                                {#if ad.landing?.pitch}<p>{ad.landing.pitch}</p>{/if}
                                {#if ad.landing?.advantages?.some((a: string) => a?.trim())}
                                    <ul class="list-disc pr-5">
                                        {#each ad.landing.advantages as a}
                                            {#if a?.trim()}<li>{a}</li>{/if}
                                        {/each}
                                    </ul>
                                {/if}
                                <a href={`/ads/${ad.id}`} target="_blank" rel="noopener"
                                   class="inline-block mt-2 px-3 py-1.5 rounded-lg bg-white/10 text-amber-300 font-bold hover:bg-white/15">
                                    פתח את דף הנחיתה המלא →
                                </a>
                            </div>
                        </details>

                        <!-- פעולות לפי טאב -->
                        <div class="mt-4 flex flex-wrap gap-2">
                            {#if activeTab === 'pending'}
                                <form method="POST" action="?/approve" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit"
                                            class="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black text-sm hover:bg-emerald-400">
                                        ✅ אשר ופרסם
                                    </button>
                                </form>
                                <button type="button" onclick={() => startEdit(ad)}
                                        class="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-200 font-black text-sm hover:bg-blue-500/30">
                                    ✏️ ערוך לפני אישור
                                </button>
                                <form method="POST" action="?/reject" use:enhance class="flex gap-2 flex-1 min-w-[220px]">
                                    <input type="hidden" name="id" value={ad.id} />
                                    <input type="text" name="reason" placeholder="סיבת דחייה (אופציונלי)"
                                           class="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                                    <button type="submit"
                                            class="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-sm hover:bg-red-500">
                                        ❌ דחה
                                    </button>
                                </form>
                            {:else if activeTab === 'approved'}
                                <a href={`/ads/${ad.id}`} target="_blank" rel="noopener"
                                   class="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 font-black text-sm hover:bg-amber-500/25">
                                    👁 פתח דף נחיתה
                                </a>
                                <button type="button" onclick={() => startEdit(ad)}
                                        class="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-200 font-black text-sm hover:bg-blue-500/30">
                                    ✏️ ערוך
                                </button>
                                <form method="POST" action="?/unapprove" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit"
                                            class="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 font-black text-sm hover:bg-amber-500/30"
                                            onclick={(e) => { if (!confirm('להוריד את הפרסומת מהאתר ולהחזיר אותה לממתינות?')) e.preventDefault(); }}>
                                        ⏸ הורד מהאתר
                                    </button>
                                </form>
                                <form method="POST" action="?/remove" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit"
                                            class="px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 font-black text-sm hover:bg-red-600/30"
                                            onclick={(e) => { if (!confirm('למחוק את הפרסומת לצמיתות?')) e.preventDefault(); }}>
                                        🗑 מחק
                                    </button>
                                </form>
                            {:else}
                                <form method="POST" action="?/unreject" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit"
                                            class="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 font-black text-sm hover:bg-amber-500/30">
                                        ↩️ החזר לממתינות
                                    </button>
                                </form>
                                <form method="POST" action="?/remove" use:enhance>
                                    <input type="hidden" name="id" value={ad.id} />
                                    <button type="submit"
                                            class="px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 font-black text-sm hover:bg-red-600/30"
                                            onclick={(e) => { if (!confirm('למחוק את הפרסומת לצמיתות?')) e.preventDefault(); }}>
                                        🗑 מחק
                                    </button>
                                </form>
                            {/if}
                        </div>
                    {/if}
                </article>
            {/each}
        </div>
    {/if}
</div>
