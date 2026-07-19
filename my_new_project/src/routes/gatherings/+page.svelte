<script lang="ts">
    import { enhance } from '$app/forms';
    import { _ } from 'svelte-i18n';
    import type { PageData } from './$types';
    import { canonical } from '$lib/seo';
    import { imageDrop } from '$lib/imageDrop';
    import { openCropper } from '$lib/imageCropper.svelte';

    let { data }: { data: PageData } = $props();

    const monthIdx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    let months = $derived(monthIdx.map((i) => $_(`community.month_${i}`)));
    function formatDate(dateStr: string) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getDate()} ${months[d.getMonth()]}`;
    }

    const iconOptions = ['🍽️','🥗','🍕','🍷','🧆','🍰','☕','🥘','🎉','🕯️','🍞','🍲'];

    let showForm = $state(false);
    let submitting = $state(false);
    let createIcon = $state('🍽️');

    // ── טוסט שגיאה צף — כשל בהקמת סעודה לא נשאר בלתי-נראה (דוגמת loc-toast בפרופיל) ──
    let errorToast = $state('');
    let errorToastId = $state(0); // מפתח שמאתחל את האנימציה גם כשאותה הודעה חוזרת
    let errorToastTimer: ReturnType<typeof setTimeout> | undefined;
    function showError(msg: string) {
        errorToast = msg;
        errorToastId++;
        clearTimeout(errorToastTimer);
        errorToastTimer = setTimeout(() => (errorToast = ''), 4100);
    }

    // ── תמונת שער ──
    let coverImage = $state('');
    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const MAX = 1200;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.naturalWidth, h = img.naturalHeight;
                    if (w > MAX || h > MAX) {
                        const r = Math.min(MAX / w, MAX / h);
                        w = Math.round(w * r); h = Math.round(h * r);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = reject;
                img.src = ev.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    async function processFile(files: File[]) {
        const file = files[0];
        if (!file) return;
        const compressed = await compressImage(file);
        const cropped = await openCropper(compressed, {
            shape: 'rect',
            aspect: 16 / 9,
            title: 'מיקום תמונת הכיסוי',
            hint: 'גררו למיקום הרצוי · הזיזו את המחוון להגדלה',
        });
        coverImage = cropped ?? compressed;
    }
    async function repositionCover() {
        if (!coverImage) return;
        const cropped = await openCropper(coverImage, {
            shape: 'rect',
            aspect: 16 / 9,
            title: 'מיקום תמונת הכיסוי',
            hint: 'גררו למיקום הרצוי · הזיזו את המחוון להגדלה',
        });
        if (cropped) coverImage = cropped;
    }
    async function handleCoverChange(e: Event) {
        const input = e.target as HTMLInputElement;
        await processFile(Array.from(input.files ?? []));
        input.value = '';
    }

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
            <a href="/" class="text-amber-400 hover:text-amber-300 text-sm mb-4 inline-block transition-colors">{$_('community.back_to_main')}</a>
            <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                {$_('community.ga_heading')}
            </h1>
            <p class="text-gray-400 mt-2 text-sm md:text-base">
                {$_('community.ga_sub_start')}{#if data.user?.city}{$_('community.in_prefix')}<span class="text-amber-300 font-bold">{data.user.city}</span>{/if}{$_('community.ga_sub_rest')}
            </p>
        </div>

        {#if !data.isMember}
            <!-- ── מסך לחברים בלבד ── -->
            <div class="max-w-md mx-auto bg-[#0f172a] border border-amber-500/20 rounded-2xl p-8 text-center">
                <div class="text-5xl mb-4">🔒</div>
                <h2 class="text-xl font-bold text-white mb-2">{$_('community.ga_members_only_title')}</h2>
                <p class="text-gray-400 text-sm mb-6">
                    {$_('community.ga_members_only_text')}
                </p>
                <div class="flex gap-3 justify-center">
                    <a href="/login" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition">{$_('community.ga_login')}</a>
                    <a href="/register" class="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition">{$_('community.ga_register')}</a>
                </div>
            </div>
        {:else}
            <!-- ── כפתור הקמת סעודה ── -->
            <div class="text-center mb-8">
                <button
                    onclick={() => (showForm = !showForm)}
                    class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg hover:opacity-90 transition"
                >
                    {showForm ? $_('community.ga_close') : $_('community.ga_new')}
                </button>
            </div>

            {#if showForm}
                <form
                    method="POST"
                    action="?/create"
                    use:enhance={() => {
                        submitting = true;
                        return async ({ result, update }) => {
                            // fail() מהשרת מוצג בטוסט — במקום כפתור ש"לא עושה כלום"
                            if (result.type === 'failure') showError(String((result.data as any)?.error ?? $_('community.ga_action_failed')));
                            else if (result.type === 'error') showError($_('community.ga_action_error'));
                            await update();
                            submitting = false;
                        };
                    }}
                    class="bg-[#0f172a] border border-amber-500/20 rounded-2xl p-6 mb-10 space-y-4"
                >
                    <h2 class="text-lg font-bold text-amber-300 mb-2">{$_('community.ga_details_title')}</h2>

                    <!-- icon -->
                    <div>
                        <label class="block text-sm text-gray-300 mb-2">{$_('community.ga_icon_label')}</label>
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

                    <!-- תמונת שער -->
                    <div>
                        <label class="block text-sm text-gray-300 mb-2">{$_('community.ga_cover_label')}</label>
                        {#if coverImage}
                            <div class="relative inline-block">
                                <img src={coverImage} alt={$_('community.ga_preview_alt')} class="h-32 rounded-xl object-cover border border-white/10" />
                                <button type="button" onclick={() => (coverImage = '')} class="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-rose-500 text-white text-sm flex items-center justify-center shadow-lg">✕</button>
                                <button type="button" onclick={repositionCover} title="מקם / חתוך" aria-label="מקם / חתוך" class="absolute bottom-1 right-1 px-2 h-7 rounded-full bg-black/70 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1 shadow-lg transition-colors">🎯 מקם</button>
                            </div>
                        {:else}
                            <label use:imageDrop={processFile} class="flex flex-col items-center justify-center gap-1 h-28 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 cursor-pointer transition text-gray-400 hover:text-amber-300">
                                <span class="text-2xl">🖼️</span>
                                <span class="text-xs">{$_('community.ga_upload_hint')}</span>
                                <input type="file" accept="image/*" class="hidden" onchange={handleCoverChange} />
                            </label>
                        {/if}
                        <input type="hidden" name="image" value={coverImage} />
                    </div>

                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">{$_('community.ga_name_label')}</label>
                            <input name="title" required placeholder={$_('community.ga_name_ph')} class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">{$_('community.ga_location_label')}</label>
                            <input name="location" placeholder={$_('community.ga_location_ph')} class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">{$_('community.ga_date_label')}</label>
                            <input type="date" name="date" required class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-300 mb-1">{$_('community.ga_time_label')}</label>
                            <input type="time" name="time" class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm text-gray-300 mb-1">{$_('community.ga_desc_label')}</label>
                        <textarea name="description" rows="2" placeholder={$_('community.ga_desc_ph')} class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white"></textarea>
                    </div>

                    <!-- food list -->
                    <div>
                        <label class="block text-sm text-gray-300 mb-2">{$_('community.ga_food_label')}</label>
                        <div class="space-y-2">
                            {#each foodDraft as f, i}
                                <div class="flex gap-2">
                                    <input bind:value={f.name} placeholder={$_('community.ga_food_ph')} class="flex-1 bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                                    <input bind:value={f.qty} placeholder={$_('community.ga_qty_ph')} class="w-28 bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                                    <button type="button" onclick={() => removeFoodRow(i)} class="px-3 rounded-lg bg-white/5 text-rose-400 hover:bg-white/10">✕</button>
                                </div>
                            {/each}
                        </div>
                        <button type="button" onclick={addFoodRow} class="mt-2 text-sm text-amber-400 hover:text-amber-300">{$_('community.ga_add_row')}</button>
                        <input type="hidden" name="food_items" value={foodJson} />
                    </div>

                    <button type="submit" disabled={submitting}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition disabled:opacity-50">
                        {submitting ? $_('community.ga_creating') : $_('community.ga_create')}
                    </button>
                </form>
            {/if}

            <!-- ── רשימת הסעודות ── -->
            {#if gatherings.length === 0}
                <div class="text-center text-gray-500 py-16">
                    <div class="text-5xl mb-3">🍲</div>
                    {$_('community.ga_empty_start')}{#if data.user?.city}{$_('community.in_prefix')}{data.user.city}{/if}{$_('community.ga_empty_end')}
                </div>
            {:else}
                {#if upcoming.length > 0}
                    <h2 class="text-lg font-bold text-amber-300 mb-4">{$_('community.ga_upcoming')}</h2>
                    <div class="grid sm:grid-cols-2 gap-4 mb-10">
                        {#each upcoming as g}
                            {@render card(g)}
                        {/each}
                    </div>
                {/if}
                {#if past.length > 0}
                    <h2 class="text-lg font-bold text-gray-500 mb-4">{$_('community.ga_past')}</h2>
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

<!-- ── טוסט שגיאה צף — מציג את הודעת השרת ליד כפתור השליחה, נעלם לבד אחרי ~4 שניות ── -->
{#if errorToast}
    {#key errorToastId}
        <div class="fixed bottom-6 left-1/2 z-[100] w-max max-w-xs md:max-w-sm ga-toast" role="alert" dir="rtl">
            <div class="rounded-2xl bg-gray-900 border border-red-500/50 shadow-2xl px-5 py-3.5 flex items-center gap-3">
                <span class="text-xl leading-none flex-shrink-0">⚠️</span>
                <p class="flex-1 min-w-0 text-sm text-red-200 font-bold leading-snug">{errorToast}</p>
            </div>
        </div>
    {/key}
{/if}

{#snippet card(g: any)}
    <a href={`/gatherings/${g.id}`}
        class="block bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/40 transition group">
        {#if g.image}
            <img src={g.image} alt={g.title} class="w-full h-32 object-cover" />
        {/if}
        <div class="flex items-start gap-3 p-5">
            <div class="text-3xl">{g.icon}</div>
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-white text-lg group-hover:text-amber-300 transition truncate">{g.title}</h3>
                <div class="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>📅 {formatDate(g.date)}{#if g.time} · {g.time}{/if}</span>
                    {#if g.location}<span>📍 {g.location}</span>{/if}
                </div>
                <div class="flex gap-4 mt-3 text-xs">
                    <span class="text-emerald-400">{$_('community.ga_attendees', { values: { n: g.attendees?.length ?? 0 } })}</span>
                    <span class="text-amber-400">{$_('community.ga_foods_assigned', { values: { claimed: (g.food_items ?? []).filter((f: any) => f.claimed_by_id).length, total: g.food_items?.length ?? 0 } })}</span>
                </div>
            </div>
        </div>
    </a>
{/snippet}

<style>
    /* טוסט צף שמופיע ונעלם לבד (אותו דפוס כמו loc-toast בדף הפרופיל) */
    @keyframes gaToastInOut {
        0% {
            opacity: 0;
            transform: translate(-50%, 12px);
        }
        8%, 88% {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, 6px);
        }
    }
    .ga-toast {
        animation: gaToastInOut 4s ease-out forwards;
    }
</style>
