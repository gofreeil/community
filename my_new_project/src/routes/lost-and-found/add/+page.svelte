<script lang="ts">
    import { enhance } from '$app/forms';
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
    let submitting  = $state(false);
    let imageBase64 = $state('');
    let imagePreview = $state('');

    // מגירת תגים - הפורסם מסמן מאפיינים כדי שמי שאיבד יאתר את הפריט מהר בחיפוש
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
            <h1 class="text-2xl font-black text-white mb-1">פינת האבדות</h1>
            <p class="text-gray-400 text-sm">מלא את הפרטים ונפרסם עבורך בקהילה</p>
        </div>

        {#if submitted}
            <!-- Success screen -->
            <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                <div class="text-6xl mb-4">🕊️</div>
                <h2 class="text-xl font-black text-white mb-3 leading-snug">
                    מברכים אותך במצוות השבת אבדה
                </h2>
                <p class="text-amber-300 font-bold mb-1">אנא ציין כאשר האבדה שבה</p>
                <p class="text-gray-400 text-sm leading-relaxed mb-6">
                    כדי שנשמח יחד ונחזק את מורל הקהילה!
                </p>
                <div class="flex flex-col gap-3">
                    <a href="/lost-and-found"
                        class="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg transition-all">
                        🔍 לדף האבדות
                    </a>
                    <a href="/"
                        class="w-full py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10">
                        חזרה לדף הראשי
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
                use:enhance={() => {
                    submitting = true;
                    return async ({ update }) => {
                        await update();
                        submitting = false;
                    };
                }}
                use:formMemory
                class="space-y-5"
            >
                <!-- Type selection -->
                <div>
                    <p class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        סוג המודעה *
                    </p>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="cursor-pointer">
                            <input type="radio" name="type" value="lost" class="sr-only"
                                onchange={() => type = 'lost'} />
                            <div class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm
                                {type === 'lost'
                                    ? 'border-red-500 bg-red-500/15 text-red-300'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/25'}">
                                ❓ אבד לי
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="type" value="found" class="sr-only"
                                onchange={() => type = 'found'} />
                            <div class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm
                                {type === 'found'
                                    ? 'border-green-500 bg-green-500/15 text-green-300'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/25'}">
                                ✅ מצאתי
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Title -->
                <div>
                    <label for="laf-title" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {type === 'found' ? 'מה מצאתי' : 'מה אבד לי'} *
                    </label>
                    <input
                        id="laf-title"
                        name="title"
                        type="text"
                        required
                        placeholder={type === 'found' ? 'לדוגמה: ארנק שחור, כלב גולדן' : 'לדוגמה: מפתחות, כלב פודל לבן'}
                        class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                    />
                </div>

                <!-- Description -->
                <div>
                    <label for="laf-description" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        תיאור מפורט
                    </label>
                    <textarea
                        id="laf-description"
                        name="description"
                        rows="3"
                        placeholder="תיאור הפריט, סימנים מזהים, נסיבות האבדה / מציאה..."
                        class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                    ></textarea>
                </div>

                <!-- Tags drawer -->
                <div>
                    <button type="button" onclick={() => (tagsOpen = !tagsOpen)}
                        class="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        <span class="text-sm font-bold text-gray-200 flex items-center gap-2">
                            🏷️ תגים
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
                                <span>אנא סמן תגים — כדי להקל על מי שאיבד את האבדה לאתר את שלו</span>
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
                        תמונה (אופציונלי)
                    </p>
                    {#if imagePreview}
                        <div class="relative w-full rounded-xl overflow-hidden border border-white/10">
                            <img src={imagePreview} alt="תצוגה מקדימה" class="w-full max-h-52 object-contain bg-black/30" />
                            <button
                                type="button"
                                onclick={removeImage}
                                class="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors"
                                aria-label="הסר תמונה"
                            >✕</button>
                        </div>
                    {:else}
                        <label use:imageDrop={processFile} class="flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed border-white/15 hover:border-blue-500/50 bg-white/3 hover:bg-blue-900/10 cursor-pointer transition-all">
                            <span class="text-2xl">📷</span>
                            <span class="text-gray-400 text-sm font-bold">לחץ להעלאת תמונה</span>
                            <span class="text-gray-600 text-xs">JPG, PNG עד 5MB</span>
                            <input
                                type="file"
                                accept="image/*"
                                class="hidden"
                                onchange={handleImageChange}
                            />
                        </label>
                    {/if}
                    <input type="hidden" name="image_base64" value={imageBase64} />
                </div>

                <!-- Location -->
                <div>
                    <label for="laf-location" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        מיקום *
                    </label>
                    <!-- הצעות מרשימת הרחובות של עיר המשתמש; מקומות חופשיים ("גן סאקר") עדיין אפשריים -->
                    <StreetPicker
                        city={data.userCity ?? ''}
                        value={location}
                        withHouseNumber={false}
                        placeholder="רחוב, שכונה או מקום..."
                        onValueChange={(v) => (location = v)}
                        onResolvedChange={(v) => (locationResolved = v)}
                    />
                    <input type="hidden" name="location" value={location} />

                    <!-- סימון מדויק על המפה - מוצג רק כשהמיקום אינו רחוב מזוהה מהרשימה -->
                    {#if !locationResolved}
                    {#if !showMap}
                        <button type="button" onclick={() => (showMap = true)}
                            class="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-bold py-3 transition-all">
                            📍 סמן מיקום מדויק על המפה
                        </button>
                    {:else}
                        <div class="mt-2">
                            <NeighborhoodPicker city={data.userCity ?? ''} bind:lat={pinLat} bind:lng={pinLng} />
                            <button type="button" onclick={() => { showMap = false; pinLat = null; pinLng = null; }}
                                class="mt-2 text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors">
                                הסתר מפה והסר סימון
                            </button>
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
                            שם ליצירת קשר
                        </label>
                        <input
                            id="laf-contact"
                            name="contact"
                            type="text"
                            placeholder="שם פרטי"
                            class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                        />
                    </div>
                    <div>
                        <label for="laf-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                            טלפון *
                        </label>
                        <input
                            id="laf-phone"
                            name="phone"
                            type="tel"
                            required
                            placeholder="050-0000000"
                            class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                        />
                    </div>
                </div>

                        <!-- 30-day notice -->
                <div class="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
                    <span class="flex-shrink-0 mt-0.5">⏳</span>
                    <span>המודעה תימחק אוטומטית לאחר <strong>30 יום</strong></span>
                </div>

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
                        שולח...
                    {:else}
                        🔍 פרסם מודעה
                    {/if}
                </button>
            </form>
        </div>

        <!-- Back link -->
        <div class="text-center mt-6">
            <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                ← חזרה לדף הראשי
            </a>
        </div>

        {/if}
    </div>
</div>
