<script lang="ts">
    import { enhance } from '$app/forms';
    import NewsTicker from '$lib/components/NewsTicker.svelte';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    // ---- טופס העריכה ----
    // postId ריק = ידיעה חדשה. כל שדה כאן מוזרם ישירות לתצוגה המקדימה למטה,
    // כך שרואים את הטיקר האמיתי משתנה תוך כדי הקלדה.
    let postId    = $state('');
    let title     = $state('');
    let summary   = $state('');
    let category  = $state('');
    let sourceUrl = $state('');
    let archived  = $state(false);

    const isEditing = $derived(!!postId);

    function resetForm() {
        postId = ''; title = ''; summary = ''; category = ''; sourceUrl = ''; archived = false;
    }

    function startEdit(p: PageData['posts'][number]) {
        postId    = p.id;
        title     = p.title;
        summary   = p.summary;
        category  = p.category;
        sourceUrl = p.sourceUrl;
        archived  = p.archived;
        document.getElementById('news-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---- מה שנראה בתצוגה המקדימה ----
    // הידיעה שנערכת כרגע בראש, ואחריה שאר הידיעות הפעילות - בדיוק כמו בדף הבית.
    // ידיעה בארכיון לא נכנסת לתצוגה, כי היא לא תופיע בטיקר.
    const draftItem = $derived(
        title.trim() && !archived
            ? [{ line1: title.trim(), line2: summary.trim() || category.trim(), sourceUrl: sourceUrl.trim() || null }]
            : []
    );

    const previewItems = $derived([
        ...draftItem,
        ...data.posts
            .filter((p) => !p.archived && p.title && p.id !== postId)
            .map((p) => ({ line1: p.title, line2: p.summary || p.category, sourceUrl: p.sourceUrl || null })),
    ]);

    // ---- רשימת הידיעות ----
    const activePosts   = $derived(data.posts.filter((p) => !p.archived));
    const archivedPosts = $derived(data.posts.filter((p) => p.archived));

    const fmtDate = (iso: string) =>
        iso ? new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

    // שמירה מוצלחת מנקה את הטופס וחוזרת למצב "ידיעה חדשה"
    const saveEnhance = () => async ({ result, update }: any) => {
        await update({ reset: false });
        if (result?.type === 'success') resetForm();
    };
</script>

<svelte:head><title>חדשות הטיקר · ניהול</title></svelte:head>

<div dir="rtl" class="min-h-screen bg-[#070b14] text-white px-4 py-8">
    <div class="max-w-6xl mx-auto">

        <!-- כותרת -->
        <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
                <a href="/admin" class="text-sm text-gray-500 hover:text-gray-300">← חזרה ללוח הניהול</a>
                <h1 class="text-3xl font-black mt-1">📰 חדשות הטיקר</h1>
                <p class="text-gray-400 text-sm mt-1">
                    הכותרות שרצות בפס האדום בראש דף הבית. כל ידיעה שנשמרת כאן מופיעה מיד לכל המבקרים,
                    לפני החדשות הארציות שמגיעות מאתר הביקורת.
                </p>
            </div>
            <div class="text-left">
                <div class="text-4xl font-black text-blue-400">{activePosts.length}</div>
                <div class="text-xs text-gray-500">ידיעות פעילות</div>
            </div>
        </div>

        <!-- משוב על הפעולה האחרונה -->
        {#if form?.success}
            <div class="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 font-bold">
                ✅ {form.message}
            </div>
        {:else if form?.error}
            <div class="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 font-bold">
                ⚠️ {form.error}
            </div>
        {/if}

        <!-- ================= העורך ================= -->
        <div id="news-editor" class="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-600/10 to-blue-500/5 p-5 mb-8">
            <div class="flex items-center justify-between gap-3 mb-4">
                <h2 class="text-xl font-black">
                    {isEditing ? '✏️ עריכת ידיעה' : '➕ ידיעה חדשה'}
                </h2>
                {#if isEditing}
                    <button
                        type="button"
                        onclick={resetForm}
                        class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-gray-300 hover:bg-white/10 text-sm font-bold cursor-pointer"
                    >
                        ביטול עריכה
                    </button>
                {/if}
            </div>

            <form method="POST" action="?/save" use:enhance={saveEnhance} class="grid gap-4">
                <input type="hidden" name="postId" value={postId} />

                <div class="grid md:grid-cols-2 gap-4">
                    <label class="block">
                        <span class="text-sm font-bold text-blue-200">כותרת <span class="text-red-400">*</span></span>
                        <span class="block text-xs text-gray-500 mb-1">השורה העליונה בטיקר</span>
                        <input
                            name="title"
                            bind:value={title}
                            required
                            maxlength="120"
                            placeholder="לדוגמה: מרכז מיחזור חדש נפתח בקרית משה"
                            class="w-full rounded-xl bg-[#0f172a] border border-white/15 px-3 py-2.5 text-white placeholder:text-gray-600 focus:border-blue-400 focus:outline-none"
                        />
                    </label>

                    <label class="block">
                        <span class="text-sm font-bold text-blue-200">שורה שנייה</span>
                        <span class="block text-xs text-gray-500 mb-1">התקציר שמופיע מתחת לכותרת</span>
                        <input
                            name="summary"
                            bind:value={summary}
                            maxlength="120"
                            placeholder="לדוגמה: ברחוב בית הדפוס 12, פתוח א׳–ה׳"
                            class="w-full rounded-xl bg-[#0f172a] border border-white/15 px-3 py-2.5 text-white placeholder:text-gray-600 focus:border-blue-400 focus:outline-none"
                        />
                    </label>
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                    <label class="block">
                        <span class="text-sm font-bold text-blue-200">קטגוריה</span>
                        <span class="block text-xs text-gray-500 mb-1">מוצגת בשורה השנייה אם היא ריקה</span>
                        <input
                            name="category"
                            bind:value={category}
                            list="news-categories"
                            maxlength="40"
                            placeholder="קהילה / עירייה / חירום"
                            class="w-full rounded-xl bg-[#0f172a] border border-white/15 px-3 py-2.5 text-white placeholder:text-gray-600 focus:border-blue-400 focus:outline-none"
                        />
                        <datalist id="news-categories">
                            <option value="קהילה"></option>
                            <option value="עירייה"></option>
                            <option value="חירום"></option>
                            <option value="אירועים"></option>
                            <option value="שכונה"></option>
                        </datalist>
                    </label>

                    <label class="block">
                        <span class="text-sm font-bold text-blue-200">קישור (לא חובה)</span>
                        <span class="block text-xs text-gray-500 mb-1">אם יש קישור - הכותרת הופכת ללחיצה</span>
                        <input
                            name="sourceUrl"
                            bind:value={sourceUrl}
                            type="url"
                            dir="ltr"
                            placeholder="https://..."
                            class="w-full rounded-xl bg-[#0f172a] border border-white/15 px-3 py-2.5 text-white placeholder:text-gray-600 focus:border-blue-400 focus:outline-none text-right"
                        />
                    </label>
                </div>

                <div class="flex flex-wrap items-center gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="archived" bind:checked={archived} class="w-4 h-4 accent-orange-500" />
                        <span class="text-sm font-bold text-orange-200">בארכיון</span>
                        <span class="text-xs text-gray-500">(נשמרת אבל לא מוצגת בטיקר)</span>
                    </label>

                    <button
                        type="submit"
                        class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={!title.trim()}
                    >
                        {isEditing ? '💾 שמירת השינויים' : '➕ הוספה לטיקר'}
                    </button>
                </div>
            </form>
        </div>

        <!-- ================= תצוגה מקדימה ================= -->
        <div class="mb-8">
            <div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 class="text-xl font-black">👁️ ככה זה נראה בדף הבית</h2>
                <p class="text-xs text-gray-500">
                    מתעדכן תוך כדי הקלדה · מעבר עכבר על הטיקר עוצר את התנועה כדי לקרוא
                </p>
            </div>

            {#if archived && title.trim()}
                <div class="mb-3 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2.5 text-orange-200 text-sm font-bold">
                    הידיעה מסומנת "בארכיון" ולכן אינה מופיעה בתצוגה המקדימה - כך היא גם לא תופיע באתר.
                </div>
            {:else if previewItems.length === 0}
                <div class="mb-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-gray-400 text-sm">
                    אין ידיעות פעילות - האתר מציג כרגע את כותרות ברירת המחדל שמוצגות למטה.
                </div>
            {/if}

            <!-- נייח -->
            <div class="mb-5">
                <div class="text-xs font-black text-gray-400 mb-2">🖥️ נייח (דסקטופ)</div>
                <div class="rounded-2xl border border-white/10 bg-[#070b14] p-3 overflow-hidden">
                    <div class="max-w-7xl mx-auto px-4">
                        <NewsTicker items={previewItems} layout="desktop" />
                    </div>
                </div>
            </div>

            <!-- נייד -->
            <div>
                <div class="text-xs font-black text-gray-400 mb-2">📱 נייד</div>
                <div class="rounded-2xl border border-white/10 bg-[#070b14] p-3 flex justify-center overflow-hidden">
                    <div class="w-[390px] max-w-full rounded-[28px] border-4 border-white/15 bg-[#070b14] overflow-hidden shadow-2xl">
                        <div class="px-2 py-1.5">
                            <NewsTicker items={previewItems} layout="mobile" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================= רשימת הידיעות ================= -->
        <h2 class="text-xl font-black mb-3">📋 כל הידיעות</h2>

        {#if data.posts.length === 0}
            <div class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
                עדיין אין ידיעות. הוסף את הראשונה בטופס למעלה 👆
            </div>
        {/if}

        {#each [{ label: 'פעילות בטיקר', rows: activePosts, tone: 'emerald' }, { label: 'בארכיון', rows: archivedPosts, tone: 'orange' }] as group}
            {#if group.rows.length > 0}
                <div class="mb-6">
                    <div class="text-sm font-black mb-2 {group.tone === 'emerald' ? 'text-emerald-300' : 'text-orange-300'}">
                        {group.label} ({group.rows.length})
                    </div>
                    <div class="grid gap-3">
                        {#each group.rows as p (p.id)}
                            <div class="rounded-2xl border p-4 flex flex-wrap items-start justify-between gap-3
                                {p.archived ? 'border-orange-500/25 bg-orange-500/5' : 'border-white/10 bg-white/5'}
                                {p.id === postId ? 'ring-2 ring-blue-400/60' : ''}">
                                <div class="min-w-0 flex-1">
                                    <div class="font-black text-blue-100 break-words">{p.title}</div>
                                    {#if p.summary}
                                        <div class="text-sm text-blue-300/90 break-words">{p.summary}</div>
                                    {/if}
                                    <div class="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                                        {#if p.category}
                                            <span class="px-2 py-0.5 rounded-full bg-white/5 border border-white/15">{p.category}</span>
                                        {/if}
                                        <span>{fmtDate(p.publishedAt)}</span>
                                        {#if p.sourceUrl}
                                            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">קישור ↗</a>
                                        {/if}
                                    </div>
                                </div>

                                <div class="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onclick={() => startEdit(p)}
                                        class="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-200 hover:bg-blue-500/25 text-sm font-bold cursor-pointer"
                                    >
                                        ✏️ עריכה
                                    </button>

                                    <form method="POST" action="?/archive" use:enhance>
                                        <input type="hidden" name="postId" value={p.id} />
                                        <input type="hidden" name="archived" value={p.archived ? 'false' : 'true'} />
                                        <button
                                            type="submit"
                                            class="px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer border
                                                {p.archived
                                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25'
                                                    : 'bg-orange-500/15 border-orange-500/40 text-orange-200 hover:bg-orange-500/25'}"
                                        >
                                            {p.archived ? '↩️ החזרה לטיקר' : '📥 לארכיון'}
                                        </button>
                                    </form>

                                    <form
                                        method="POST"
                                        action="?/remove"
                                        use:enhance={({ cancel }) => {
                                            if (!confirm(`למחוק לצמיתות את "${p.title}"?`)) cancel();
                                            return async ({ update }) => update();
                                        }}
                                    >
                                        <input type="hidden" name="postId" value={p.id} />
                                        <button
                                            type="submit"
                                            class="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 hover:bg-red-500/25 text-sm font-bold cursor-pointer"
                                        >
                                            🗑️ מחיקה
                                        </button>
                                    </form>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        {/each}

    </div>
</div>
