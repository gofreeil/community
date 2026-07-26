<script lang="ts">
    import type { ActionData, PageData } from './$types';
    import { onMount } from 'svelte';
    import CameraCapture from '$lib/components/CameraCapture.svelte';
    import { _ } from 'svelte-i18n';
    import { invalidateAll } from '$app/navigation';
    import LevelUpCard from '$lib/components/LevelUpCard.svelte';
    import { browser } from '$app/environment';
    import { enhance } from '$app/forms';
    import { categoryConfig, trOr } from '$lib/categoryFields';
    import { citiesAndNeighborhoods, effectiveNeighborhoods, DEFAULT_NEIGHBORHOOD } from '$lib/neighborhoodsData';
    import NeighborhoodSelect from '$lib/components/NeighborhoodSelect.svelte';
    import { giveawayCategories } from '$lib/giveawayCategories';
    import { formMemory } from '$lib/formMemory';
    import { imageDrop } from '$lib/imageDrop';
    import { openCropper } from '$lib/imageCropper.svelte';
    import StreetPicker from '$lib/components/StreetPicker.svelte';
    import NeighborhoodPicker from '$lib/components/NeighborhoodPicker.svelte';
    import { saveDraftBackup, loadDraftBackup, clearDraftBackup } from '$lib/draftBackup';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    // טיוטא אוטומטית: כל מה שהוקלד (כולל תמונות) שורד רענון/קריסה/שגיאת שרת,
    // ונמחק רק אחרי פרסום מוצלח. אותו דפוס כמו /add/[category].
    const DRAFT_KEY = 'add_draft_giveaway';

    const conditions = categoryConfig.giveaway.fields.find(f => f.key === 'condition')?.options ?? [];
    const cities = Object.keys(citiesAndNeighborhoods).sort();
    const itemCategories = giveawayCategories.filter(c => c.key !== 'all');

    let category = $state<string>('');
    let condition = $state<string>('');
    let label = $state('');
    let description = $state('');
    let images = $state<string[]>([]);
    let priceMode = $state<'free' | 'symbolic'>('free');
    let price = $state<string>('');
    const MAX_IMAGES = 5;

    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const MAX = 1000;
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
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = reject;
                img.src = src;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function processFiles(files: File[]) {
        const slots = MAX_IMAGES - images.length;
        const toAdd = files.slice(0, slots);
        const compressed = await Promise.all(toAdd.map(compressImage));
        images = [...images, ...compressed];
    }

    async function handleImagesChange(e: Event) {
        const input = e.target as HTMLInputElement;
        await processFiles(Array.from(input.files ?? []));
        input.value = '';
    }

    function removeImage(index: number) {
        images = images.filter((_, i) => i !== index);
    }

    async function repositionImage(index: number) {
        if (index < 0 || index >= images.length) return;
        const cropped = await openCropper(images[index], {
            shape: 'rect',
            aspect: 1,
            title: 'מיקום התמונה',
            hint: 'גררו למיקום הרצוי · הזיזו את המחוון להגדלה',
        });
        if (cropped) images = images.map((s, i) => (i === index ? cropped : s));
    }

    function moveImage(from: number, to: number) {
        if (to < 0 || to >= images.length) return;
        const next = [...images];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        images = next;
    }

    // הערכים ההתחלתיים נטענים פעם אחת מ-data.defaults; המשתמש יכול לערוך
    const { name: defName, phone: defPhone, neighborhood: defNeighborhood, city: defCity } = data.defaults;
    let city         = $state(defCity);
    // תמיד מסומן מראש: שכונת הפרופיל, או "מרכז" ביישוב חד-שכונתי שבו יש עיר אך אין שכונה
    let neighborhood = $state(defNeighborhood || (defCity ? 'מרכז' : ''));
    let contact      = $state(defName);
    let phone        = $state(defPhone);
    let street       = $state('');
    let buildingNum  = $state('');
    // סימון מיקום על המפה (אופציונלי) - נשמר כ-lat/lng ברמה העליונה של הפריט
    let pinLat       = $state<number | null>(null);
    let pinLng       = $state<number | null>(null);
    let showMap      = $state(false);
    // הרחוב נבחר מהרשימה הרשמית של העיר? כשלא (או כשאין מספר בניין) - מציעים מפה
    let streetInList = $state(false);
    let addressResolved = $derived(streetInList && buildingNum.trim() !== '');

    let neighborhoodOptions = $derived(effectiveNeighborhoods(city, (data as any).approvedNeighborhoods));

    // יישוב בלי רשימת רחובות ובלי שכונות (כמו כפר תפוח): הפין הופך לחובה
    let cityHasStreetList = $state(false);
    let streetListLoading = $state(true);
    const cityHasNeighborhoods = $derived(
        neighborhoodOptions.filter(n => n && n !== 'מרכז' && n !== DEFAULT_NEIGHBORHOOD).length > 0,
    );
    const forceMapPin = $derived(!streetListLoading && !cityHasStreetList && !cityHasNeighborhoods);
    $effect(() => { if (forceMapPin) showMap = true; });

    $effect(() => {
        if (city && !neighborhoodOptions.includes(neighborhood)) {
            // יישוב עם שכונה אחת (כמו כפר תפוח - רק "מרכז") → בחירה אוטומטית,
            // כך שהמשתמש לא נתקע בלי שכונה והפרסום לא נכשל.
            neighborhood = neighborhoodOptions.length === 1 ? neighborhoodOptions[0] : '';
        }
    });

    let labelLen = $derived(label.length);
    let descLen  = $derived(description.length);

    const LABEL_MAX = 60;
    const DESC_MAX = 1500;

    const hasDefaults = !!(defName || defPhone || defNeighborhood || defCity);

    // שליחה דרך use:enhance - שגיאה לא מרעננת את הדף ולא מאבדת את התמונות שהועלו.
    let submitting = $state(false);

    // חוסם את השמירה האוטומטית עד שהשחזור ב-onMount הסתיים - שטיוטה קיימת
    // לא תידרס בערכים ריקים של טופס שרק נטען.
    let draftRestored = $state(false);

    // ---- שחזור טיוטא (אחרי רענון/קריסה/יציאה באמצע) ----
    onMount(() => {
        let d: Record<string, any> | null = null;
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) d = JSON.parse(raw);
        } catch {}
        // גיבוי-עוגייה: נכתב רק כששמירת ה-localStorage נכשלה. אם הוא חדש יותר -
        // הוא המצב העדכני (ההקלדות שלא הצליחו להיכנס ל-localStorage) והוא שגובר.
        const backup = loadDraftBackup(DRAFT_KEY) as Record<string, any> | null;
        if (backup && (!d || Number(backup.savedAt ?? 0) > Number(d.savedAt ?? 0))) d = backup;
        if (d) try {
            if (d.label)        label     = d.label;
            if (d.description)  description = d.description;
            if (d.category)     category  = d.category;
            if (d.condition)    condition = d.condition;
            if (d.priceMode)    priceMode = d.priceMode;
            if (d.price)        price     = d.price;
            // מיקום מטיוטה משוחזר רק כשיש בה תוכן אמיתי - טיוטת-רפאים ישנה (ביקור
            // בעלמא שנשמר בעבר) לא תדרוס את עיר הפרופיל העדכנית.
            if (d.label || d.description || (Array.isArray(d.images) && d.images.length)) {
                if (d.city)         city      = d.city;
                if (d.neighborhood) neighborhood = d.neighborhood;
            }
            if (d.contact)      contact   = d.contact;
            if (d.phone)        phone     = d.phone;
            if (Array.isArray(d.images) && d.images.length) images = d.images;
        } catch {}

        // מעכשיו מותר לשמור - הטיוטה הקיימת כבר שוחזרה ולא תידרס.
        // ה-baseline מקבע את מצב הטופס אחרי השחזור: טופס שלא השתנה ממנו לא נשמר.
        draftBaseline = JSON.stringify(draftPayload());
        draftRestored = true;

        // רשת ביטחון: שמירה גם ברגע עזיבת העמוד (במובייל הדפדפן עשוי להרוג את הטאב בלי flush)
        window.addEventListener('pagehide', persistDraft);
        return () => window.removeEventListener('pagehide', persistDraft);
    });

    // ---- שמירת טיוטא עמידה: מלא → בלי תמונות → גיבוי-עוגייה ----
    let draftBaseline = ''; // מצב הטופס אחרי השחזור - טופס שלא השתנה ממנו לא נשמר
    function draftPayload() {
        return { label, description, category, condition, priceMode, price, city, neighborhood, contact, phone, images };
    }
    function persistDraft() {
        if (!browser || !draftRestored) return;
        // ביקור-בעלמא (שום תוכן שהוקלד) - לא שומרים כלל: לא נוצרת טיוטת-רפאים
        // גם אם אפקט התאמת-השכונה שינה ערך אחרי קביעת ה-baseline
        const hasContent = !!(label.trim() || description.trim() || images.length || category || condition);
        if (!hasContent) return;
        const draft = draftPayload();
        // בלי שינוי אמיתי אין מה לשמור - לא דורסים טיוטה/גיבוי של טאב אחר
        if (JSON.stringify(draft) === draftBaseline) return;
        const full = { ...draft, savedAt: Date.now() };
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(full));
        } catch {
            // התמונות (base64) עלולות לחרוג ממכסת ה-localStorage - נשמור לפחות את הטקסט
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...full, images: [] })); }
            // גם זה נכשל (המכסה מלאה מטיוטות אחרות) - הטקסט נשמר בעוגייה
            catch { saveDraftBackup(DRAFT_KEY, { ...full, images: [] }); }
        }
    }

    // ---- שמירה אוטומטית של טיוטא בכל שינוי ----
    $effect(() => {
        if (!browser) return;
        void label; void description; void category; void condition; void priceMode;
        void price; void city; void neighborhood; void contact; void phone; void images;
        if (!draftRestored) return;
        persistDraft();
    });
</script>

<svelte:head>
    <title>פרסום פריט למסירה | קהילה בשכונה</title>
</svelte:head>

{#if data.needsUpgrade && data.tierUser}
<div class="min-h-screen bg-[#070b14] pt-10 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <LevelUpCard user={data.tierUser} target={data.requiredTier} reason={$_('tiers.reason_publish')} onDone={() => invalidateAll()} />
    </div>
</div>
{:else}
<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <h1 class="text-3xl font-black text-white mb-2">{$_('listings.gvadd_title')}</h1>
            <p class="text-gray-400">{$_('listings.gvadd_subtitle')}</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-red-900/30 border border-red-500/30 p-4 mb-4 text-center">
                <p class="text-red-200 mb-2">{$_('listings.login_to_post')}</p>
                <a href="/login?redirect=/giveaways/add" class="inline-block bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold">{$_('listings.login')}</a>
            </div>
        {:else}
            <form
                method="POST"
                use:enhance={({ cancel }) => {
                    // שכונה חובה - הבורר המותאם (חיפוש בהקלדה) אינו select נטיבי,
                    // ולכן required של הדפדפן לא חל עליו; בודקים כאן במקומו
                    if (city && !neighborhood) {
                        alert($_('listings.gvadd_choose_neighborhood'));
                        cancel();
                        return;
                    }
                    // ביישוב בלי רחובות/שכונות - חובה פין, אחרת הפריט ייעֶרם על מרכז היישוב
                    if (forceMapPin && !(pinLat != null && pinLng != null)) {
                        showMap = true;
                        alert($_('listings.gvadd_pin_required_alert'));
                        cancel();
                        return;
                    }
                    submitting = true;
                    // reset: false - לשמר את הקלט והתמונות אם השרת החזיר שגיאה.
                    return async ({ result, update }) => {
                        // פרסום מוצלח מסתיים ב-redirect - הטיוטא סיימה את תפקידה
                        if (result.type === 'redirect') {
                            try { localStorage.removeItem(DRAFT_KEY); } catch {}
                            clearDraftBackup(DRAFT_KEY);
                        }
                        await update({ reset: false });
                        submitting = false;
                    };
                }}
                use:formMemory={{ fillName: true }}
                class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-5">

                <!-- Section 1: העיקר -->
                <div class="space-y-4">
                    <h2 class="text-orange-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <span class="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                        {$_('listings.gvadd_section_details')}
                    </h2>

                    <div>
                        <label for="label" class="text-white text-sm font-bold mb-1 flex justify-between">
                            <span>{$_('listings.gvadd_label')}</span>
                            <span class="text-gray-500 text-xs font-normal">{labelLen}/{LABEL_MAX}</span>
                        </label>
                        <input
                            id="label"
                            name="label"
                            required
                            maxlength={LABEL_MAX}
                            bind:value={label}
                            placeholder={$_('listings.gvadd_label_ph')}
                            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <span class="text-white text-sm font-bold mb-2 block">{$_('listings.gvadd_category')}</span>
                        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {#each itemCategories as c}
                                <button
                                    type="button"
                                    onclick={() => category = c.key}
                                    class="flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-xs font-bold transition-all border {category === c.key ? 'bg-gradient-to-br from-orange-500/30 to-amber-500/20 border-orange-400 text-orange-200 shadow-lg' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/20'}"
                                >
                                    <span class="text-2xl">{c.icon}</span>
                                    <span class="text-[10px] leading-tight text-center">{trOr($_, `labels.gcat_${c.key}`, c.label)}</span>
                                </button>
                            {/each}
                        </div>
                        <input type="hidden" name="category" value={category} />
                    </div>

                    <div>
                        <span class="text-white text-sm font-bold mb-2 block">{$_('listings.gvadd_condition')}</span>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {#each conditions as c}
                                <button
                                    type="button"
                                    onclick={() => condition = c}
                                    class="px-3 py-2.5 rounded-xl text-sm font-bold transition-all border {condition === c ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-lg' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}"
                                >{trOr($_, `labels.cf_giveaway_condition_o${conditions.indexOf(c)}`, c)}</button>
                            {/each}
                        </div>
                        <input type="hidden" name="condition" value={condition} />
                    </div>

                    <!-- Price (free or symbolic amount) -->
                    <div>
                        <span class="text-white text-sm font-bold mb-2 block">{$_('listings.gvadd_price')}</span>
                        <div class="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onclick={() => { priceMode = 'free'; price = ''; }}
                                class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold transition-all border {priceMode === 'free' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-400 shadow-lg' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}"
                            >
                                <span class="text-lg">💚</span>
                                {$_('listings.free')}
                            </button>
                            <button
                                type="button"
                                onclick={() => priceMode = 'symbolic'}
                                class="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold transition-all border {priceMode === 'symbolic' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-amber-400 shadow-lg' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}"
                            >
                                <span class="text-lg">🪙</span>
                                {$_('listings.gvadd_symbolic')}
                            </button>
                        </div>
                        {#if priceMode === 'symbolic'}
                            <div class="mt-2 relative">
                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 text-base font-bold pointer-events-none">₪</span>
                                <input
                                    type="number"
                                    name="price"
                                    min="1"
                                    max="500"
                                    step="1"
                                    bind:value={price}
                                    placeholder={$_('listings.gvadd_price_ph')}
                                    class="w-full bg-white/5 border border-amber-500/30 rounded-lg pe-9 ps-3 py-2 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none transition-colors"
                                />
                                <p class="text-gray-500 text-xs mt-1">{$_('listings.gvadd_price_hint')}</p>
                            </div>
                        {/if}
                    </div>

                    <div>
                        <label for="description" class="text-white text-sm font-bold mb-1 flex justify-between">
                            <span>{$_('listings.gvadd_desc')}</span>
                            <span class="text-gray-500 text-xs font-normal">{descLen}/{DESC_MAX}</span>
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            required
                            rows="4"
                            maxlength={DESC_MAX}
                            bind:value={description}
                            placeholder={$_('listings.gvadd_desc_ph')}
                            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors resize-none"
                        ></textarea>
                    </div>

                    <!-- Multi-image upload -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-white text-sm font-bold">{$_('listings.gvadd_images', { values: { n: MAX_IMAGES } })}</span>
                            <span class="text-gray-500 text-xs">{images.length}/{MAX_IMAGES}</span>
                        </div>
                        {#if images.length > 0}
                            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-2">
                                {#each images as src, i (i)}
                                    <div class="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                                        <img src={src} alt="" class="w-full h-full object-cover" />
                                        {#if i === 0}
                                            <span class="absolute bottom-1 start-1 px-1.5 py-0.5 rounded bg-orange-500 text-white text-[9px] font-black shadow">{$_('listings.gvadd_img_main')}</span>
                                        {/if}
                                        <button
                                            type="button"
                                            onclick={() => removeImage(i)}
                                            class="absolute top-1 left-1 bg-black/70 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                            aria-label={$_('listings.remove_image')}
                                        >×</button>
                                        <button
                                            type="button"
                                            onclick={() => repositionImage(i)}
                                            class="absolute bottom-1 end-1 bg-black/70 hover:bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors"
                                            aria-label="מקם / חתוך"
                                            title="מקם / חתוך"
                                        >🎯</button>
                                        <div class="absolute top-1 end-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {#if i > 0}
                                                <button
                                                    type="button"
                                                    onclick={() => moveImage(i, i - 1)}
                                                    class="bg-black/70 hover:bg-orange-600 text-white w-6 h-5 rounded text-[10px] font-bold transition-colors"
                                                    aria-label={$_('listings.gvadd_move_right')}
                                                >→</button>
                                            {/if}
                                            {#if i < images.length - 1}
                                                <button
                                                    type="button"
                                                    onclick={() => moveImage(i, i + 1)}
                                                    class="bg-black/70 hover:bg-orange-600 text-white w-6 h-5 rounded text-[10px] font-bold transition-colors"
                                                    aria-label={$_('listings.gvadd_move_left')}
                                                >←</button>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                                {#if images.length < MAX_IMAGES}
                                    <label use:imageDrop={processFiles} class="flex flex-col items-center justify-center gap-1 aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-orange-500/50 bg-white/3 hover:bg-orange-900/10 cursor-pointer transition-all">
                                        <span class="text-2xl">＋</span>
                                        <span class="text-gray-500 text-[10px]">{$_('listings.gvadd_more')}</span>
                                        <input type="file" accept="image/*" multiple class="hidden" onchange={handleImagesChange} />
                                    </label>
                                    <CameraCapture onfiles={processFiles} compact class="flex items-center justify-center aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-orange-500/50 bg-white/3 hover:bg-orange-900/10 text-gray-400 hover:text-orange-300 cursor-pointer transition-all" />
                                {/if}
                            </div>
                        {:else}
                            <label use:imageDrop={processFiles} class="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed border-white/15 hover:border-orange-500/50 bg-white/3 hover:bg-orange-900/10 cursor-pointer transition-all">
                                <span class="text-3xl">📷</span>
                                <span class="text-gray-400 text-sm font-bold">{$_('listings.gvadd_upload_click')}</span>
                                <span class="text-gray-600 text-xs">{$_('listings.gvadd_upload_hint', { values: { n: MAX_IMAGES } })}</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange={handleImagesChange} />
                            </label>
                            <div class="mt-2">
                                <CameraCapture onfiles={processFiles} class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 hover:border-orange-500/50 bg-white/5 hover:bg-orange-900/15 text-gray-300 hover:text-white text-sm font-bold transition-all cursor-pointer" />
                            </div>
                        {/if}
                        <input type="hidden" name="images_json" value={JSON.stringify(images)} />

                        {#if images.length === 0}
                            <p class="mt-2 flex items-start gap-1.5 text-amber-300 text-xs bg-amber-900/15 border border-amber-500/25 rounded-lg px-3 py-2">
                                <span aria-hidden="true">📷</span>
                                <span>{$_('listings.gvadd_no_image_note')}</span>
                            </p>
                        {:else}
                            <p class="mt-2 flex items-center gap-1.5 text-emerald-300 text-xs bg-emerald-900/15 border border-emerald-500/25 rounded-lg px-3 py-2">
                                <span aria-hidden="true">✓</span>
                                <span>{$_('listings.gvadd_has_image_note')}</span>
                            </p>
                        {/if}
                    </div>

                    <div>
                        <label for="tags" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_tags')}</label>
                        <input
                            id="tags"
                            name="tags"
                            placeholder={$_('listings.gvadd_tags_ph')}
                            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                        />
                        <p class="text-gray-500 text-xs mt-1">{$_('listings.gvadd_tags_hint')}</p>
                    </div>
                </div>

                <!-- Section 2: מיקום -->
                <div class="space-y-4 pt-3 border-t border-white/5">
                    <h2 class="text-orange-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <span class="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                        {$_('listings.gvadd_section_location')}
                    </h2>

                    {#if hasDefaults}
                        <div class="rounded-lg bg-emerald-900/20 border border-emerald-500/20 px-3 py-2 text-emerald-300 text-xs">
                            {$_('listings.gvadd_defaults_note')}
                        </div>
                    {/if}

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label for="city" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_city')}</label>
                            <select
                                id="city"
                                name="city"
                                required
                                bind:value={city}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                            >
                                <option value="">{$_('listings.gvadd_choose_city')}</option>
                                {#each cities as c}
                                    <option value={c}>{c}</option>
                                {/each}
                            </select>
                        </div>
                        <div>
                            <label for="neighborhood" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_neighborhood')}</label>
                            <NeighborhoodSelect
                                id="neighborhood"
                                name="neighborhood"
                                bind:value={neighborhood}
                                neighborhoods={neighborhoodOptions}
                                disabled={!city}
                                placeholder={city ? $_('listings.gvadd_choose_neighborhood') : $_('listings.gvadd_choose_city_first')}
                                buttonClass="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-orange-500/50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-right flex items-center justify-between gap-2 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label for="street" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_street')}</label>
                            <!-- בחירה מרשימת הרחובות הרשמית של העיר - איות אחיד; הקלדה חופשית עדיין אפשרית -->
                            <StreetPicker {city} value={street} withHouseNumber={false} onValueChange={(v) => (street = v)} onResolvedChange={(v) => (streetInList = v)} onStreetListChange={(info) => { cityHasStreetList = info.hasList; streetListLoading = info.loading; }} />
                        </div>
                        <div>
                            <label for="buildingNum" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_building')}</label>
                            <input
                                id="buildingNum"
                                bind:value={buildingNum}
                                placeholder={$_('listings.gvadd_number_ph')}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <!-- השרת קורא שדה address אחד - עד עכשיו רחוב+מספר נשלחו בשמות אחרים ופשוט נזרקו -->
                        <input type="hidden" name="address" value={[street, buildingNum].map((s) => s.trim()).filter(Boolean).join(' ')} />
                    </div>

                    <!-- סימון על המפה - מוצג כשהכתובת לא נפתרה, וחובה ביישוב בלי רחובות/שכונות -->
                    {#if !addressResolved || forceMapPin}
                        <div>
                            {#if forceMapPin}
                                <p class="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 leading-relaxed">
                                    {$_('listings.gvadd_pin_required_note')}
                                </p>
                            {:else}
                                <p class="text-white text-sm font-bold mb-1">{$_('listings.gvadd_pin_prompt')}</p>
                                <p class="text-gray-400 text-xs mb-2">{$_('listings.gvadd_pin_hint')}</p>
                            {/if}
                            {#if !showMap}
                                <button type="button" onclick={() => (showMap = true)}
                                    class="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-bold py-3 transition-all">
                                    {$_('listings.gvadd_pin_button')}
                                </button>
                            {:else}
                                <NeighborhoodPicker {city} {neighborhood} restrictToCity bind:lat={pinLat} bind:lng={pinLng} />
                                {#if !forceMapPin}
                                    <button type="button" onclick={() => { showMap = false; pinLat = null; pinLng = null; }}
                                        class="mt-2 text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors">
                                        {$_('listings.gvadd_pin_hide')}
                                    </button>
                                {/if}
                            {/if}
                        </div>
                    {/if}
                    <input type="hidden" name="lat" value={pinLat ?? ''} />
                    <input type="hidden" name="lng" value={pinLng ?? ''} />

                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label for="floor" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_floor')}</label>
                            <input
                                id="floor"
                                name="floor"
                                placeholder={$_('listings.gvadd_floor_ph')}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label for="apartment" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_apartment')}</label>
                            <input
                                id="apartment"
                                name="apartment"
                                placeholder={$_('listings.gvadd_apartment_ph')}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <div></div>
                    </div>

                    <div>
                        <label for="arrivalNotes" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_arrival')}</label>
                        <textarea
                            id="arrivalNotes"
                            name="arrivalNotes"
                            rows="2"
                            placeholder={$_('listings.gvadd_arrival_ph')}
                            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors resize-none"
                            style="color-scheme: dark;"
                        ></textarea>
                    </div>
                </div>

                <!-- Section 3: יצירת קשר -->
                <div class="space-y-4 pt-3 border-t border-white/5">
                    <h2 class="text-orange-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <span class="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                        {$_('listings.gvadd_section_contact')}
                    </h2>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label for="contact" class="text-white text-sm font-bold mb-1 block">{$_('listings.gvadd_name')}</label>
                            <input
                                id="contact"
                                name="contact"
                                required
                                bind:value={contact}
                                placeholder={$_('listings.gvadd_name_ph')}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label for="phone" class="text-white text-sm font-bold mb-1 block">{$_('listings.phone_req')}</label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                bind:value={phone}
                                placeholder={$_('listings.gvadd_phone_ph')}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {#if form?.error}
                    <p class="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-lg py-2">{form.error}</p>
                {/if}

                <button
                    type="submit"
                    disabled={submitting}
                    class="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {submitting ? $_('listings.gvadd_submitting') : $_('listings.gvadd_submit')}
                </button>

                <p class="text-gray-500 text-xs text-center">
                    {$_('listings.gvadd_consent')}
                </p>

                <p class="text-gray-400 text-sm text-center pt-2 border-t border-white/5">
                    {$_('listings.gvadd_expiry')}
                </p>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="/giveaways" class="text-gray-500 hover:text-white transition-colors text-sm">← {$_('listings.back_list')}</a>
        </div>
    </div>
</div>

{/if}
