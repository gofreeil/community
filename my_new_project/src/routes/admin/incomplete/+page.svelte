<script lang="ts">
    import { enhance } from '$app/forms';
    import { effectiveNeighborhoods } from '$lib/neighborhoodsData';
    import { PROBLEM_LABELS, PROBLEM_HINTS, type LocationProblem } from '$lib/incompleteItems';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    // ---- מסננים ----
    let search        = $state('');
    let problemFilter = $state<'all' | LocationProblem>('all');
    let assignFilter  = $state<'all' | 'mine' | 'unassigned' | 'assigned'>('all');

    const visible = $derived(
        data.rows.filter((r) => {
            if (problemFilter !== 'all' && !r.problems.includes(problemFilter)) return false;
            if (assignFilter === 'mine'       && r.assignee?.id !== data.myId) return false;
            if (assignFilter === 'unassigned' && r.assignee)                   return false;
            if (assignFilter === 'assigned'   && !r.assignee)                  return false;
            const q = search.trim();
            if (!q) return true;
            return [r.label, r.city, r.neighborhood, r.address, r.category]
                .some((v) => (v ?? '').includes(q));
        }),
    );

    // ספירה לכל סוג בעיה - לכפתורי הסינון
    const counts = $derived(
        (['city_unknown', 'neighborhood_unknown', 'neighborhood_missing', 'no_pin'] as LocationProblem[])
            .map((p) => ({ p, n: data.rows.filter((r) => r.problems.includes(p)).length })),
    );

    // ---- הבחירה הפתוחה בכל שורה ----
    // ברירת המחדל היא מה שכבר רשום על הפריט, כדי שהאדמין יראה מאיפה הוא מתחיל.
    // הקריאה חייבת להיות טהורה: כתיבה ל-$state בזמן רינדור נחסמת ב-Svelte 5,
    // ולכן שומרים רק את מה שהאדמין שינה בפועל ונופלים לערך של הפריט.
    let edits = $state<Record<string, { city: string; nb: string }>>({});
    const draftFor = (id: string, city: string, nb: string) => edits[id] ?? { city, nb };
    function setCity(id: string, city: string) {
        // החלפת עיר מאפסת את השכונה - שכונה של עיר אחרת אינה תקפה כאן
        edits = { ...edits, [id]: { city, nb: '' } };
    }
    function setNb(id: string, nb: string) {
        const row = data.rows.find((r) => r.id === id);
        const cur = edits[id] ?? { city: row?.city ?? '', nb: row?.neighborhood ?? '' };
        edits = { ...edits, [id]: { ...cur, nb } };
    }
    const nbOptions = (city: string) =>
        city ? effectiveNeighborhoods(city, data.approvedNeighborhoods) : [];

    const badgeClass = (p: LocationProblem) =>
        p === 'city_unknown'         ? 'bg-red-500/15 text-red-300 border-red-500/40'
      : p === 'neighborhood_unknown' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
      : p === 'neighborhood_missing' ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
      :                                'bg-white/5 text-gray-400 border-white/15';
</script>

<svelte:head><title>נכסים להשלמה · ניהול</title></svelte:head>

<div dir="rtl" class="min-h-screen bg-[#070b14] text-white px-4 py-8">
    <div class="max-w-6xl mx-auto">

        <!-- כותרת + התקדמות -->
        <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
                <a href="/admin" class="text-sm text-gray-500 hover:text-gray-300">← חזרה ללוח הניהול</a>
                <h1 class="text-3xl font-black mt-1">📍 נכסים להשלמה</h1>
                <p class="text-gray-400 text-sm mt-1">
                    פריטים שהמיקום שלהם חסר או לא מזוהה. עד שיושלמו הם מוצגים ברמת העיר במקום בשכונה שלהם.
                </p>
            </div>
            <div class="text-left">
                <div class="text-4xl font-black {data.rows.length ? 'text-amber-400' : 'text-emerald-400'}">
                    {data.rows.length}
                </div>
                <div class="text-xs text-gray-500">
                    נותרו להשלמה{data.approvedCount ? ` · ${data.approvedCount} סומנו תקינים` : ''}
                </div>
            </div>
        </div>

        {#if form?.success}
            <div class="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm">
                ✅ {form.message}
            </div>
        {:else if form?.error}
            <div class="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
                ⚠️ {form.error}
            </div>
        {/if}

        {#if data.rows.length === 0}
            <div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-12 text-center">
                <div class="text-5xl mb-3">🎉</div>
                <div class="text-xl font-bold text-emerald-300">אין נכסים להשלמה</div>
                <p class="text-gray-400 text-sm mt-2">
                    {data.superAdmin ? 'כל הפריטים משויכים לעיר ולשכונה מזוהות.' : 'לא הועברו אליך משימות השלמה.'}
                </p>
            </div>
        {:else}
            <!-- מסננים -->
            <div class="rounded-2xl border border-white/10 bg-[#0f172a] p-4 mb-5 space-y-3">
                <input
                    type="search"
                    bind:value={search}
                    placeholder="חיפוש לפי שם, עיר, שכונה או כתובת..."
                    class="w-full bg-[#070b14] border border-white/10 rounded-xl px-4 py-2.5 text-sm
                           focus:border-blue-500/50 focus:outline-none"
                />
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick={() => (problemFilter = 'all')}
                        class="px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer
                               {problemFilter === 'all' ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}">
                        הכל ({data.rows.length})
                    </button>
                    {#each counts as c (c.p)}
                        {#if c.n > 0}
                            <button type="button" onclick={() => (problemFilter = c.p)} title={PROBLEM_HINTS[c.p]}
                                class="px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer
                                       {problemFilter === c.p ? badgeClass(c.p) : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}">
                                {PROBLEM_LABELS[c.p]} ({c.n})
                            </button>
                        {/if}
                    {/each}
                </div>
                {#if data.superAdmin}
                    <div class="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                        {#each [['all', 'כל המשימות'], ['unassigned', 'לא הועברו'], ['assigned', 'הועברו לאדמין'], ['mine', 'הועברו אליי']] as [val, label] (val)}
                            <button type="button" onclick={() => (assignFilter = val as typeof assignFilter)}
                                class="px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer
                                       {assignFilter === val ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}">
                                {label}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- הרשימה -->
            <div class="space-y-3">
                {#each visible as row (row.id)}
                    {@const d = draftFor(row.id, row.city, row.neighborhood)}
                    <div class="rounded-2xl border border-white/10 bg-[#0f172a] p-4 hover:border-white/20 transition-all">

                        <div class="flex flex-wrap items-start gap-3 mb-3">
                            <span class="text-2xl flex-shrink-0">{row.icon?.startsWith('/') ? '📦' : (row.icon || '📦')}</span>
                            <div class="min-w-0 flex-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <a href="/items/{row.id}" target="_blank" rel="noopener"
                                       class="font-bold hover:text-blue-300 truncate">{row.label}</a>
                                    <span class="text-[11px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                        {row.category}
                                    </span>
                                    {#each row.problems as p (p)}
                                        <span class="text-[11px] border px-2 py-0.5 rounded-full {badgeClass(p)}" title={PROBLEM_HINTS[p]}>
                                            {PROBLEM_LABELS[p]}
                                        </span>
                                    {/each}
                                </div>
                                <div class="text-xs text-gray-500 mt-1">
                                    רשום כרגע:
                                    <span class="text-gray-300">{[row.neighborhood, row.city].filter(Boolean).join(', ') || 'ללא מיקום'}</span>
                                    {#if row.address}· כתובת: <span class="text-gray-300">{row.address}</span>{/if}
                                    {#if row.phone}· {row.phone}{/if}
                                </div>
                                {#if row.assignee}
                                    <div class="text-xs text-purple-300 mt-1">
                                        👤 הועבר ל{row.assignee.name}
                                        {#if row.assignee.id === data.myId}<span class="text-purple-200 font-bold">(אליך)</span>{/if}
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- השלמת המיקום -->
                        <form method="POST" action="?/fixLocation" use:enhance class="flex flex-wrap items-end gap-2">
                            <input type="hidden" name="itemId" value={row.id} />
                            <div>
                                <label class="block text-[11px] text-gray-500 mb-1" for="city-{row.id}">עיר</label>
                                <select id="city-{row.id}" name="city" value={d.city}
                                    onchange={(e) => setCity(row.id, e.currentTarget.value)}
                                    class="bg-white text-gray-900 border border-white/20 rounded-lg px-3 py-2 text-sm min-w-[160px]">
                                    <option value="">— בחר עיר —</option>
                                    {#each data.cities as c (c)}<option value={c}>{c}</option>{/each}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] text-gray-500 mb-1" for="nb-{row.id}">שכונה</label>
                                <select id="nb-{row.id}" name="neighborhood" value={d.nb}
                                    onchange={(e) => setNb(row.id, e.currentTarget.value)}
                                    disabled={!d.city}
                                    class="bg-white text-gray-900 border border-white/20 rounded-lg px-3 py-2 text-sm min-w-[180px] disabled:opacity-40">
                                    <option value="">— ללא שכונה (כל העיר) —</option>
                                    {#each nbOptions(d.city) as n (n)}<option value={n}>{n}</option>{/each}
                                </select>
                            </div>
                            <button type="submit"
                                class="px-4 py-2 text-sm rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/40
                                       hover:bg-emerald-500/25 transition-all cursor-pointer font-bold">
                                ✓ שמור מיקום
                            </button>

                            <span class="flex-1"></span>

                            <button type="submit" formaction="?/markOk"
                                class="px-3 py-2 text-xs rounded-lg bg-white/5 text-gray-400 border border-white/10
                                       hover:text-white hover:border-white/30 transition-all cursor-pointer"
                                title="פריט ארצי או כזה שאין לו עיר - ירד מהרשימה לצמיתות">
                                תקין כמו שהוא
                            </button>
                        </form>

                        <!-- העברה לאדמין אחר -->
                        {#if data.superAdmin && data.assignableAdmins.length}
                            <form method="POST" action="?/assign" use:enhance
                                  class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                <input type="hidden" name="itemId" value={row.id} />
                                <span class="text-[11px] text-gray-500">העבר לאדמין:</span>
                                <select name="adminId"
                                    onchange={(e) => {
                                        const opt = e.currentTarget.selectedOptions[0];
                                        const hidden = e.currentTarget.form?.querySelector('input[name=adminName]') as HTMLInputElement | null;
                                        if (hidden) hidden.value = opt?.dataset.name ?? '';
                                    }}
                                    class="bg-white text-gray-900 border border-white/20 rounded-lg px-3 py-1.5 text-sm min-w-[200px]">
                                    <option value="" data-name="">— ללא / בטל העברה —</option>
                                    {#each data.assignableAdmins as a (a.id)}
                                        <option value={a.id} data-name={a.name} selected={row.assignee?.id === a.id}>
                                            {a.name}{a.area ? ` · ${a.area}` : ''}{a.role === 'super_admin' ? ' · מנהל ראשי' : ''}
                                        </option>
                                    {/each}
                                </select>
                                <input type="hidden" name="adminName" value={row.assignee?.name ?? ''} />
                                <button type="submit"
                                    class="px-3 py-1.5 text-xs rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/40
                                           hover:bg-purple-500/25 transition-all cursor-pointer font-bold">
                                    ↗ העבר משימה
                                </button>
                                <span class="text-[11px] text-gray-600">האדמין יקבל הודעה עם קישור ישיר לכאן</span>
                            </form>
                        {/if}
                    </div>
                {:else}
                    <div class="text-center text-gray-500 py-12">לא נמצאו פריטים בסינון הזה</div>
                {/each}
            </div>
        {/if}
    </div>
</div>
