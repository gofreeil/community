<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';
    import { canonical } from '$lib/seo';

    let { data }: { data: PageData } = $props();

    const hebrewMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    function formatDate(dateStr: string) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getDate()} ${hebrewMonths[d.getMonth()]}`;
    }

    const iconOptions = ['🍽️','🥗','🍕','🍷','🧆','🍰','☕','🥘','🎉','🕯️','🍞','🍲'];

    let showForm = $state(false);
    let submitting = $state(false);
    let createIcon = $state('🍽️');

    // רשימת מאכלים התחלתית בטופס ההקמה
    type FoodDraft = { name: string; qty: string };
    let foodDraft = $state<FoodDraft[]>([{ name: '', qty: '' }]);
    function addFoodRow() { foodDraft.push({ name: '', qty: '' }); }
    function removeFoodRow(i: number) { foodDraft.splice(i, 1); if (foodDraft.length === 0) addFoodRow(); }
    let foodJson = $derived(JSON.stringify(foodDraft.filter((f) => f.name.trim())));

    let gatherings = $derived(data.gatherings as any[]);
    let today = new Date(new Date().toDateString());
    let upcoming = $derived(gatherings.filter((g) => new Date(g.date) >= today));
    let past = $derived(gatherings.filter((g) => new Date(g.date) < today));
</script>

<svelte:head>
    <title>ערבי מפגש וסעודות קהילתיות | קהילה בשכונה</title>
    <meta name="description" content="לוח ערבי מפגש וסעודות שכונתיות — הקימו סעודה, חלקו את רשימת המאכלים בין המשתתפים וראו מי מגיע. נגיש לחברי הקהילה." />
    <link rel="canonical" href={canonical('/gatherings')} />
</svelte:head>

<div class="min-h-screen bg-[#070b14] py-6 md:py-12 px-4" dir="rtl">
    <div class="max-w-5xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-8">
            <a href="/" class="text-amber-400 hover:text-amber-300 text-sm mb-4 inline-block transition-colors">→ חזרה לעמוד הראשי</a>
            <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                🍽️ ערבי מפגש וסעודות
            </h1>
            <p class="text-gray-400 mt-2 text-sm md:text-base">
                הקימו סעודה משותפת{#if data.user?.city} ב<span class="text-amber-300 font-bold">{data.user.city}</span>{/if}, חלקו את רשימת המאכלים וראו מי מגיע
            </p>
        </div>

        {#if !data.isMember}
            <!-- ── מסך לחברים בלבד ── -->
            <div class="max-w-md mx-auto bg-[#0f172a] border border-amber-500/20 rounded-2xl p-8 text-center">
                <div class="text-5xl mb-4">🔒</div>
                <h2 class="text-xl font-bold text-white mb-2">אזור לחברי הקהילה</h2>
                <p class="text-gray-400 text-sm mb-6">
                    ערבי המפגש והסעודות נגישים רק לחברים רשומים עם כרטיס. התחברו או הצטרפו כדי לראות את הסעודות ולהירשם.
                </p>
                <div class="flex gap-3 justify-center">
                    <a href="/login" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition">התחברות</a>
                    <a href="/register" class="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition">הרשמה</a>
                </div>
            </div>
        {:else}
            <!-- ── כפתור הקמת סעודה ── -->
            <div class="text-center mb-8">
                <button
                    onclick={() => (showForm = !showForm)}
                    class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg hover:opacity-90 transition"
                >
                    {showForm ? '✕ סגירה' : '➕ הקמת סעודה חדשה'}
                </button>
            </div>

            {#if showForm}
                <form
                    method="POST"
                    action="?/create"
                    use:enhance={() => {
                        submitting = true;
                        return async ({ update }) => { await update(); submitting = false; };
                    }}
                    class="bg-[#0f172a] border border-amber-500/20 rounded-2xl p-6 mb-10 space-y-4"
                >
                    <h2 class="text-lg font-bold text-amber-300 mb-2">פרטי הסעודה</h2>

                    <!-- icon -->
                    <div>
                        <label class="block text-sm text-gray-300 mb-2">אייקון</label>
                        <div class="flex flex-wrap gap-2">
                            {#each iconOptions as ic}
                                <button type="button" onclick={() => (createIcon = ic)}
                                    class="w-10 h-10 rounded-lg text-xl flex items-center justify-center transition {createIcon === ic ? 'bg-amber-500/30 ring-2 ring-amber-400' : 'bg-white/5 hover:bg-white/10'}">
                                    {ic}
                                </button>
                            {/each}
                        </div>
                        <input type="hidden" name="icon" value={createIcon} />
                    </div>

                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">שם הסעודה *</label>
                            <input name="title" required placeholder="סעודת ראש חודש, ערב הודיה..." class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">מיקום</label>
                            <input name="location" placeholder="כתובת / בית הכנסת / גינה" class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">תאריך *</label>
                            <input type="date" name="date" required class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">שעה</label>
                            <input type="time" name="time" class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm text-gray-300 mb-1">תיאור</label>
                        <textarea name="description" rows="2" placeholder="כמה מילים על הסעודה..." class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white"></textarea>
                    </div>

                    <!-- food list -->
                    <div>
                        <label class="block text-sm text-gray-300 mb-2">רשימת מאכלים / מוצרים שצריך (אפשר להוסיף עוד אחר כך)</label>
                        <div class="space-y-2">
                            {#each foodDraft as f, i}
                                <div class="flex gap-2">
                                    <input bind:value={f.name} placeholder="מאכל / מוצר" class="flex-1 bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                                    <input bind:value={f.qty} placeholder="כמות" class="w-28 bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                                    <button type="button" onclick={() => removeFoodRow(i)} class="px-3 rounded-lg bg-white/5 text-rose-400 hover:bg-white/10">✕</button>
                                </div>
                            {/each}
                        </div>
                        <button type="button" onclick={addFoodRow} class="mt-2 text-sm text-amber-400 hover:text-amber-300">➕ הוספת שורה</button>
                        <input type="hidden" name="food_items" value={foodJson} />
                    </div>

                    <button type="submit" disabled={submitting}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50">
                        {submitting ? 'מקים...' : 'הקמת הסעודה'}
                    </button>
                </form>
            {/if}

            <!-- ── רשימת הסעודות ── -->
            {#if gatherings.length === 0}
                <div class="text-center text-gray-500 py-16">
                    <div class="text-5xl mb-3">🍲</div>
                    עדיין אין סעודות{#if data.user?.city} ב{data.user.city}{/if}. היו הראשונים להקים סעודה!
                </div>
            {:else}
                {#if upcoming.length > 0}
                    <h2 class="text-lg font-bold text-amber-300 mb-4">סעודות קרובות</h2>
                    <div class="grid sm:grid-cols-2 gap-4 mb-10">
                        {#each upcoming as g}
                            {@render card(g)}
                        {/each}
                    </div>
                {/if}
                {#if past.length > 0}
                    <h2 class="text-lg font-bold text-gray-500 mb-4">סעודות שהיו</h2>
                    <div class="grid sm:grid-cols-2 gap-4 opacity-60">
                        {#each past as g}
                            {@render card(g)}
                        {/each}
                    </div>
                {/if}
            {/if}
        {/if}
    </div>
</div>

{#snippet card(g: any)}
    <a href={`/gatherings/${g.id}`}
        class="block bg-[#0f172a] border border-white/10 rounded-2xl p-5 hover:border-amber-500/40 transition group">
        <div class="flex items-start gap-3">
            <div class="text-3xl">{g.icon}</div>
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-white text-lg group-hover:text-amber-300 transition truncate">{g.title}</h3>
                <div class="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>📅 {formatDate(g.date)}{#if g.time} · {g.time}{/if}</span>
                    {#if g.location}<span>📍 {g.location}</span>{/if}
                </div>
                <div class="flex gap-4 mt-3 text-xs">
                    <span class="text-emerald-400">👥 {g.attendees?.length ?? 0} מגיעים</span>
                    <span class="text-amber-400">🍴 {(g.food_items ?? []).filter((f: any) => f.claimed_by_id).length}/{g.food_items?.length ?? 0} מאכלים שובצו</span>
                </div>
            </div>
        </div>
    </a>
{/snippet}
