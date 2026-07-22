<script lang="ts">
    import { enhance } from '$app/forms';
    import CameraCapture from '$lib/components/CameraCapture.svelte';
    import { tick } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { formMemory } from '$lib/formMemory';
    import { imageDrop } from '$lib/imageDrop';
    import StreetPicker from '$lib/components/StreetPicker.svelte';
    import NeighborhoodPicker from '$lib/components/NeighborhoodPicker.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let submitted = $derived(!!form?.success);

    let type        = $state<'lost' | 'found' | ''>('');
    let location    = $state('');
    // סימון מיקום על המפה (אופציונלי) - נשמר כ-lat/lng ברמה העליונה של הפריט
    let pinLat      = $state<number | null>(null);
    let pinLng      = $state<number | null>(null);
    let showMap     = $state(false);
    // המיקום נבחר מרשימת הרחובות הרשמית? כשלא (מקום חופשי / לא נמצא) - מציעים מפה
    let locationResolved = $state(false);
    // יישוב בלי רשימת רחובות (כמו כפר תפוח): אי אפשר לאמת מיקום - הפין הופך לחובה
    let cityHasStreetList = $state(false);
    let streetListLoading = $state(true);
    const forceMapPin = $derived(!streetListLoading && !cityHasStreetList);
    $effect(() => { if (forceMapPin) showMap = true; });
    let submitting  = $state(false);
    let imageBase64 = $state('');
    let imagePreview = $state('');
    // תיבת השגיאה שליד כפתור השליחה - בטופס ארוך בנייד תיבת השגיאה העליונה מחוץ למסך,
    // אז אחרי כישלון שרת גוללים אל התיבה התחתונה כדי שהמשוב יהיה מול העיניים
    let bottomErrorEl = $state<HTMLDivElement | null>(null);

    // מגירת תגים - המפרסם מסמן מאפיינים כדי שמי שאיבד יאתר את הפריט מהר בחיפוש
    const LAF_TAGS = [
        '👛 ארנק', '🔑 מפתחות', '📱 טלפון', '👓 משקפיים', '🕶️ משקפי שמש',
        '🎒 תיק', '💍 תכשיט', '⌚ שעון', '📄 מסמכים', '💳 כרטיס אשראי',
        '🪪 תעודה', '🐕 כלב', '🐈 חתול', '🧥 בגד', '🧢 כובע', '🧸 צעצוע',
        '🚲 אופניים', '☂️ מטרייה', '🎧 אוזניות', '🔌 מטען', '💰 כסף', '📚 ספר',
    ];
    let selectedTags = $state<string[]>([]);
    let tagsOpen     = $state(false);

    function toggleTag(tag: string) {
        selectedTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];
    }

    async function processFile(files: File[]) {
        const file = files[0];
        if (!file) return;

        const MAX = 900;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth;
                let h = img.naturalHeight;
                if (w > MAX || h > MAX) {
                    const ratio = Math.min(MAX / w, MAX / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width  = w;
                canvas.height = h;
                canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                const b64 = canvas.toDataURL('image/jpeg', 0.82);
                imageBase64  = b64;
                imagePreview = b64;
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    }

    function handleImageChange(e: Event) {
        const input = e.target as HTMLInputElement;
        processFile(Array.from(input.files ?? []));
        input.value = '';
    }

    function removeImage() {
        imageBase64  = '';
        imagePreview = '';
    }
</script>

<svelte:head>
    <title>הוסף אבדה או מציאה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen flex items-start justify-center pt-8 pb-16 px-4" dir="rtl">
    <div class="w-full max-w-lg">

        <!-- Header -->
        <div class="text-center mb-8">
            <div class="text-5xl mb-3">🔍</div>
            <h1 class="text-2xl font-black text-white mb-1">{$_('listings.laf_title')}</h1>
            <p class="text-gray-400 text-sm">{$_('listings.lafadd_subtitle')}</p>
        </div>

        {#if submitted}
            <!-- Success screen -->
            <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                <div class="text-6xl mb-4">🕊️</div>
                <h2 class="text-xl font-black text-white mb-3 leading-snug">
                    {$_('listings.lafadd_success_title')}
                </h2>
                <p class="text-amber-300 font-bold mb-1">{$_('listings.lafadd_success_note')}</p>
                <p class="text-gray-400 text-sm leading-relaxed mb-6">
                    {$_('listings.lafadd_success_sub')}
                </p>
                <div class="flex flex-col gap-3">
                    <a href="/lost-and-found"
                        class="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg transition-all">
                        {$_('listings.lafadd_to_board')}
                    </a>
                    <a href="/"
                        class="w-full py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10">
                        {$_('listings.back_home')}
                    </a>
                </div>
            </div>
        {:else}

        <!-- Form card -->
        <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-6 shadow-2xl">

            {#if form?.error}
                <div class="mb-4 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold">
                    ⚠️ {form.error}
                </div>
            {/if}

            <form
                method="POST"
                use:enhance={({ cancel }) => {
                    // ביישוב בלי רחובות - חובה פין, אחרת האבידה תיערם על מרכז היישוב
                    if (forceMapPin && !(pinLat != null && pinLng != null)) {
                        showMap = true;
                        alert($_('listings.pin_required_alert'));
                        cancel();
                        return;
                    }
                    submitting = true;
                    return async ({ update }) => {
                        await update();
                        submitting = false;
                        // שגיאת שרת: לגלול אל תיבת השגיאה שליד הכפתור כדי שתהיה גלויה
                        if (form?.error) {
                            await tick();
                            bottomErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    };
                }}
                use:formMemory
                class="space-y-5"
            >
                <!-- Type selection -->
                <div>
                    <p class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {$_('listings.lafadd_type')}
                    </p>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="cursor-pointer">
                            <input type="radio" name="type" value="lost" class="sr-only"
                                onchange={() => type = 'lost'} />
                            <div class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm
                                {type === 'lost'
                                    ? 'border-red-500 bg-red-500/15 text-red-300'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/25'}">
                                {$_('listings.lafadd_type_lost')}
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="type" value="found" class="sr-only"
                                onchange={() => type = 'found'} />
                            <div class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm
                                {type === 'found'
                                    ? 'border-green-500 bg-green-500/15 text-green-300'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/25'}">
                                {$_('listings.lafadd_type_found')}
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Title -->
                <div>
                    <label for="laf-title" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {type === 'found' ? $_('listings.lafadd_what_found') : $_('listings.lafadd_what_lost')} *
                    </label>
                    <input
                        id="laf-title"
                        name="title"
                        type="text"
                        required
                        placeholder={type === 'found' ? $_('listings.lafadd_found_ph') : $_('listings.lafadd_lost_ph')}
                        class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                    />
                </div>

                <!-- Description -->
                <div>
                    <label for="laf-description" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {$_('listings.lafadd_desc')}
                    </label>
                    <textarea
                        id="laf-description"
                        name="description"
                        rows="3"
                        placeholder={$_('listings.lafadd_desc_ph')}
                        class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                    ></textarea>
                </div>

                <!-- Tags drawer -->
                <div>
                    <button type="button" onclick={() => (tagsOpen = !tagsOpen)}
                        class="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        <span class="text-sm font-bold text-gray-200 flex items-center gap-2">
                            {$_('listings.lafadd_tags')}
                            {#if selectedTags.length > 0}
                                <span class="text-xs font-bold text-blue-300 bg-blue-500/20 rounded-full px-2 py-0.5">{selectedTags.length}</span>
                            {/if}
                        </span>
                        <span class="text-gray-400 text-xs transition-transform {tagsOpen ? 'rotate-180' : ''}">▼</span>
                    </button>

                    {#if tagsOpen}
                        <div class="mt-3 p-4 rounded-xl bg-white/3 border border-white/10">
                            <p class="text-amber-300 text-xs font-bold mb-3 leading-relaxed flex items-start gap-1.5">
                                <span class="flex-shrink-0">💡</span>
                                <span>{$_('listings.lafadd_tags_hint')}</span>
                            </p>
                            <div class="flex flex-wrap gap-2">
                                {#each LAF_TAGS as tag}
                                    <button type="button" onclick={() => toggleTag(tag)}
                                        class="px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                                            {selectedTags.includes(tag)
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/25'}">
                                        {tag}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                    <input type="hidden" name="tags" value={selectedTags.join(',')} />
                </div>

                <!-- Image upload -->
                <div>
                    <p class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {$_('listings.image_optional')}
                    </p>
                    {#if imagePreview}
                        <div class="relative w-full rounded-xl overflow-hidden border border-white/10">
                            <img src={imagePreview} alt={$_('listings.preview_alt')} class="w-full max-h-52 object-contain bg-black/30" />
                            <button
                                type="button"
                                onclick={removeImage}
                                class="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors"
                                aria-label={$_('listings.remove_image')}
                            >✕</button>
                        </div>
                    {:else}
                        <label use:imageDrop={processFile} class="flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed border-white/15 hover:border-blue-500/50 bg-white/3 hover:bg-blue-900/10 cursor-pointer transition-all">
                            <span class="text-2xl">📷</span>
                            <span class="text-gray-400 text-sm font-bold">{$_('listings.upload_click_one')}</span>
                            <span class="text-gray-600 text-xs">{$_('listings.lafadd_upload_hint')}</span>
                            <input
                                type="file"
                                accept="image/*"
                                class="hidden"
                                onchange={handleImageChange}
                            />
                        </label>
                        <div class="mt-2">
                            <CameraCapture onfiles={processFile} class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 hover:border-blue-500/50 bg-white/5 hover:bg-blue-900/15 text-gray-300 hover:text-white text-sm font-bold transition-all cursor-pointer" />
                        </div>
                    {/if}
                    <input type="hidden" name="image_base64" value={imageBase64} />
                </div>

                <!-- Location -->
                <div>
                    <label for="laf-location" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {$_('listings.location_req')}
                    </label>
                    <!-- הצעות מרשימת הרחובות של עיר המשתמש; מקומות חופשיים ("גן סאקר") עדיין אפשריים -->
                    <StreetPicker
                        city={data.userCity ?? ''}
                        value={location}
                        withHouseNumber={false}
                        placeholder={$_('listings.lafadd_location_ph')}
                        onValueChange={(v) => (location = v)}
                        onResolvedChange={(v) => (locationResolved = v)}
                        onStreetListChange={(info) => { cityHasStreetList = info.hasList; streetListLoading = info.loading; }}
                    />
                    <input type="hidden" name="location" value={location} />

                    <!-- סימון מדויק על המפה - מוצע כשהמיקום לא מזוהה, וחובה ביישוב בלי רחובות -->
                    {#if !locationResolved || forceMapPin}
                    {#if forceMapPin}
                        <p class="mt-2 mb-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 leading-relaxed">
                            {$_('listings.pin_required_note')}
                        </p>
                    {/if}
                    {#if !showMap}
                        <button type="button" onclick={() => (showMap = true)}
                            class="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-bold py-3 transition-all">
                            {$_('listings.pin_mark_precise')}
                        </button>
                    {:else}
                        <div class="mt-2">
                            <NeighborhoodPicker city={data.userCity ?? ''} bind:lat={pinLat} bind:lng={pinLng} />
                            {#if !forceMapPin}
                                <button type="button" onclick={() => { showMap = false; pinLat = null; pinLng = null; }}
                                    class="mt-2 text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors">
                                    {$_('listings.pin_hide')}
                                </button>
                            {/if}
                        </div>
                    {/if}
                    {/if}
                    <input type="hidden" name="lat" value={pinLat ?? ''} />
                    <input type="hidden" name="lng" value={pinLng ?? ''} />
                </div>

                <!-- Contact -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="laf-contact" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                            {$_('listings.contact_name')}
                        </label>
                        <input
                            id="laf-contact"
                            name="contact"
                            type="text"
                            placeholder={$_('listings.ph_first_name')}
                            class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                        />
                    </div>
                    <div>
                        <label for="laf-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                            {$_('listings.phone_req')}
                        </label>
                        <input
                            id="laf-phone"
                            name="phone"
                            type="tel"
                            required
                            placeholder={$_('listings.ph_phone')}
                            class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                        />
                    </div>
                </div>

                        <!-- 30-day notice -->
                <div class="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
                    <span class="flex-shrink-0 mt-0.5">⏳</span>
                    <span>{$_('listings.lafadd_expiry_pre')} <strong>{$_('listings.lafadd_expiry_days')}</strong></span>
                </div>

                <!-- שגיאת שרת ליד כפתור השליחה - נראית גם כשהתיבה העליונה מחוץ למסך -->
                {#if form?.error}
                    <div bind:this={bottomErrorEl} role="alert"
                        class="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold">
                        ⚠️ {form.error}
                    </div>
                {/if}

                <!-- הכפתור נעול עד בחירת סוג (אבד/נמצא) - רמז קטן שמסביר למה -->
                {#if !type && !submitting}
                    <p class="text-center text-gray-400 text-xs font-bold">
                        ☝️ {$_('listings.lafadd_pick_type_hint')}
                    </p>
                {/if}

                <!-- Submit -->
                <button
                    type="submit"
                    disabled={submitting || !type}
                    class="w-full py-3.5 rounded-xl font-black text-base transition-all
                        {submitting || !type
                            ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/25'}"
                >
                    {#if submitting}
                        {$_('listings.sending')}
                    {:else}
                        {$_('listings.lafadd_submit')}
                    {/if}
                </button>
            </form>
        </div>

        <!-- Back link -->
        <div class="text-center mt-6">
            <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                ← {$_('listings.back_home')}
            </a>
        </div>

        {/if}
    </div>
</div>
