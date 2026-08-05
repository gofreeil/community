<script lang="ts">
    import { enhance } from '$app/forms';
    import { tick } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { formMemory } from '$lib/formMemory';
    import StreetPicker from '$lib/components/StreetPicker.svelte';
    import NeighborhoodPicker from '$lib/components/NeighborhoodPicker.svelte';
    import GpsLocateButton from '$lib/components/GpsLocateButton.svelte';
    import { imageDrop } from '$lib/imageDrop';
    import CameraCapture from '$lib/components/CameraCapture.svelte';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let location     = $state('');
    // סימון מיקום על המפה (אופציונלי) - נשמר כ-lat/lng ברמה העליונה של הפריט
    let pinLat       = $state<number | null>(null);
    let pinLng       = $state<number | null>(null);
    let showMap      = $state(false);
    // המיקום נבחר מרשימת הרחובות הרשמית? כשלא (מקום חופשי / לא נמצא) - מציעים מפה
    let locationResolved = $state(false);
    // יישוב בלי רשימת רחובות (כמו כפר תפוח): אי אפשר לאמת מיקום - הפין הופך לחובה
    let cityHasStreetList = $state(false);
    let streetListLoading = $state(true);
    const forceMapPin = $derived(!streetListLoading && !cityHasStreetList);
    $effect(() => { if (forceMapPin) showMap = true; });
    let submitting   = $state(false);
    // כרטיס שיתוף המיקום (GpsLocateButton) פעיל: יש קיבוע GPS מוצג. הפין נכתב ישירות
    // ל-pinLat/pinLng דרך bind, והכרטיס מנהל תצוגה+כוונון בעצמו — אז מסתירים את המסלול הידני.
    let gpsActive    = $state(false);
    let imageBase64  = $state('');
    let imagePreview = $state('');
    // תיבת השגיאה שליד כפתור השליחה - בטופס ארוך בנייד תיבת השגיאה העליונה מחוץ למסך,
    // אז אחרי כישלון שרת גוללים אל התיבה התחתונה כדי שהמשוב יהיה מול העיניים
    let bottomErrorEl = $state<HTMLDivElement | null>(null);

    // כתובת מ-reverse geocoding של קליטת ה-GPS ממלאת את שדה הטקסט (אם ריק) —
    // כדי שמי שבא לעזור יראה כתובת קריאה, בלי שהמבקש יקליד דבר.
    function onGpsLocated({ address }: { lat: number; lng: number; address: string; accuracy: number | null }) {
        if (address && !location.trim()) location = address;
    }
    // מגירת "נראה לאחרונה" - פתוחה/סגורה (מוצגת רק בקריאות של אובדן: ילד/כלב)
    let lastSeenOpen = $state(false);

    // שדות דינמיים לפי סוג הקריאה — מפתחות i18n, מתורגמים ב-$derived למטה
    const fieldsByOption: Record<string, { descLabel: string; descPlaceholder: string; locationPlaceholder: string; hasLastSeen?: boolean }> = {
        '1': {
            descLabel:          'listings.rh_desc_1',
            descPlaceholder:    'listings.rh_desc_ph_1',
            locationPlaceholder:'listings.rh_loc_ph_1',
        },
        '2': {
            descLabel:          'listings.rh_desc_2',
            descPlaceholder:    'listings.rh_desc_ph_2',
            locationPlaceholder:'listings.rh_loc_ph_2',
        },
        '3': {
            descLabel:          'listings.rh_desc_3',
            descPlaceholder:    'listings.rh_desc_ph_3',
            locationPlaceholder:'listings.rh_loc_ph_3',
            hasLastSeen:        true,
        },
        '4': {
            descLabel:          'listings.rh_desc_4',
            descPlaceholder:    'listings.rh_desc_ph_4',
            locationPlaceholder:'listings.rh_loc_ph_4',
        },
        '5': {
            descLabel:          'listings.rh_desc_5',
            descPlaceholder:    'listings.rh_desc_ph_5',
            locationPlaceholder:'listings.rh_loc_ph_5',
            hasLastSeen:        true,
        },
    };

    let fields = $derived.by(() => {
        const o = fieldsByOption[data.optionId] ?? fieldsByOption['4'];
        return {
            descLabel:           $_(o.descLabel),
            descPlaceholder:     $_(o.descPlaceholder),
            locationPlaceholder: $_(o.locationPlaceholder),
            hasLastSeen:         o.hasLastSeen,
        };
    });

    async function processFile(files: File[]) {
        const file = files[0];
        if (!file) return;
        const MAX = 900;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
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
                const b64 = canvas.toDataURL('image/jpeg', 0.82);
                imageBase64 = b64; imagePreview = b64;
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
</script>

<svelte:head>
    <title>{data.option.icon} {data.option.text} | קהילה בשכונה</title>
</svelte:head>

<!-- לחיצה על הרקע חוזרת אחורה; Escape עושה את אותו הדבר במקלדת -->
<div class="min-h-screen flex items-start justify-center pt-8 pb-16 px-4 cursor-pointer" dir="rtl"
    onclick={(e) => { if (e.target === e.currentTarget) history.back(); }}
    onkeydown={(e) => { if (e.key === 'Escape') history.back(); }}
    role="button" tabindex="-1">
    <!-- מיכל התוכן; presentation כי הוא פריסה בלבד -->
    <div class="w-full max-w-lg cursor-default" role="presentation" onclick={(e) => e.stopPropagation()}>

        <!-- Header -->
        <div class="text-center mb-8">
            <div class="text-5xl mb-3">{data.option.icon}</div>
            <h1 class="text-2xl font-black text-white mb-1">{data.option.text}</h1>
            <p class="text-gray-400 text-sm">{$_('listings.rh_subtitle')}</p>
            <div class="mt-3 inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-red-400">
                {$_('listings.rh_badge')}
            </div>
        </div>

        <!-- Form card -->
        <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-6 shadow-2xl">

            {#if form?.error}
                <div class="mb-4 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold">
                    ⚠️ {form.error}
                </div>
            {/if}

            <form method="POST"
                use:enhance={({ cancel }) => {
                    // ביישוב בלי רחובות - חובה פין, אחרת הקריאה תיערם על מרכז היישוב
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
                class="space-y-5">

                <input type="hidden" name="option_id" value={data.optionId} />

                <!-- Description -->
                <div>
                    <label for="rh-desc" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {fields.descLabel} *
                    </label>
                    <textarea
                        id="rh-desc"
                        name="description"
                        rows="4"
                        required
                        placeholder={fields.descPlaceholder}
                        class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                    ></textarea>
                </div>

                <!-- Location -->
                <div>
                    <label for="rh-location" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {$_('listings.location_req')}
                    </label>

                    <!-- דרך מהירה בנייד בלבד (<768px): שיתוף מיקום מה-GPS בסגנון וואטסאפ.
                         הכרטיס כותב את הפין ישירות ל-pinLat/pinLng ומנהל תצוגה+כוונון בעצמו.
                         מוסתר בדסקטופ (md:hidden) — שם ה-GPS פחות מדויק ואין ערך מול סימון במפה. -->
                    <div class="md:hidden">
                        <GpsLocateButton bind:lat={pinLat} bind:lng={pinLng} bind:active={gpsActive} onLocated={onGpsLocated} />
                    </div>

                    <!-- כל עוד לא שותף מיקום GPS — המסלול הידני (הקלדת כתובת / סימון במפה) זמין.
                         כשה-GPS פעיל, הכרטיס שלמעלה מציג מפה+כתובת ומחליף אותו. -->
                    {#if !gpsActive}
                        <div class="md:hidden flex items-center gap-3 my-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                            <span class="h-px flex-1 bg-white/10"></span>
                            {$_('listings.gps_or')}
                            <span class="h-px flex-1 bg-white/10"></span>
                        </div>

                        <!-- הצעות מרשימת הרחובות של עיר המשתמש; תיאור חופשי ("ליד הגן") עדיין אפשרי -->
                        <StreetPicker
                            city={data.userCity ?? ''}
                            value={location}
                            withHouseNumber={false}
                            placeholder={fields.locationPlaceholder}
                            onValueChange={(v) => (location = v)}
                            onResolvedChange={(v) => (locationResolved = v)}
                            onStreetListChange={(info) => { cityHasStreetList = info.hasList || info.unavailable; streetListLoading = info.loading; }}
                        />

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
                    {/if}

                    <!-- שדות נסתרים — נשלחים תמיד (גם כשה-GPS פעיל וגם במסלול הידני) -->
                    <input type="hidden" name="location" value={location} />
                    <input type="hidden" name="lat" value={pinLat ?? ''} />
                    <input type="hidden" name="lng" value={pinLng ?? ''} />
                </div>

                <!-- Last seen drawer (רק בקריאות אובדן: ילד / כלב) -->
                {#if fields.hasLastSeen}
                <div class="rounded-xl border border-white/10 overflow-hidden">
                    <button type="button" onclick={() => (lastSeenOpen = !lastSeenOpen)}
                        class="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors">
                        <span class="flex items-center gap-2 text-sm font-bold text-gray-200">
                            {$_('listings.rh_last_seen')}
                        </span>
                        <span class="text-gray-400 text-sm">{lastSeenOpen ? '▲' : '▼'}</span>
                    </button>
                    {#if lastSeenOpen}
                    <div class="p-4 space-y-4 border-t border-white/10">
                        <div>
                            <label for="ls-time" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                {$_('listings.rh_last_seen_time')}
                            </label>
                            <input id="ls-time" name="last_seen_time" type="text"
                                placeholder={$_('listings.rh_last_seen_time_ph')}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                        </div>
                        <div>
                            <label for="ls-place" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                {$_('listings.rh_last_seen_place')}
                            </label>
                            <input id="ls-place" name="last_seen_place" type="text"
                                placeholder={$_('listings.rh_last_seen_place_ph')}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                        </div>
                        <div>
                            <label for="ls-details" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                {$_('listings.rh_last_seen_details')}
                            </label>
                            <input id="ls-details" name="last_seen_details" type="text"
                                placeholder={$_('listings.rh_last_seen_details_ph')}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                        </div>
                    </div>
                    {/if}
                </div>
                {/if}

                <!-- Image -->
                <div>
                    <p class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        {$_('listings.image_optional')}
                    </p>
                    {#if imagePreview}
                        <div class="relative w-full rounded-xl overflow-hidden border border-white/10">
                            <img src={imagePreview} alt={$_('listings.preview_alt')} class="w-full max-h-52 object-contain bg-black/30" />
                            <button type="button" onclick={() => { imageBase64 = ''; imagePreview = ''; }}
                                class="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors">✕</button>
                        </div>
                    {:else}
                        <label use:imageDrop={processFile} class="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-red-500/50 bg-white/3 hover:bg-red-900/10 cursor-pointer transition-all">
                            <span class="text-2xl">📷</span>
                            <span class="text-gray-400 text-sm font-bold">{$_('listings.upload_click_one')}</span>
                            <input type="file" accept="image/*" class="hidden" onchange={handleImageChange} />
                        </label>
                        <div class="mt-2">
                            <CameraCapture onfiles={processFile} class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 hover:border-red-500/50 bg-white/5 hover:bg-red-900/15 text-gray-300 hover:text-white text-sm font-bold transition-all cursor-pointer" />
                        </div>
                    {/if}
                    <input type="hidden" name="image_base64" value={imageBase64} />
                </div>

                <!-- Contact -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="rh-contact" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                            {$_('listings.contact_name')}
                        </label>
                        <input id="rh-contact" name="contact" type="text" placeholder={$_('listings.ph_first_name')}
                            class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                    </div>
                    <div>
                        <label for="rh-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                            {$_('listings.phone_req')}
                        </label>
                        <input id="rh-phone" name="phone" type="tel" required placeholder={$_('listings.ph_phone')}
                            class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                    </div>
                </div>

                <!-- שגיאת שרת ליד כפתור השליחה - נראית גם כשהתיבה העליונה מחוץ למסך -->
                {#if form?.error}
                    <div bind:this={bottomErrorEl} role="alert"
                        class="px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold">
                        ⚠️ {form.error}
                    </div>
                {/if}

                <!-- Submit -->
                <button type="submit" disabled={submitting}
                    class="w-full py-3.5 rounded-xl font-black text-base transition-all
                        {submitting
                            ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg hover:shadow-red-500/25'}">
                    {#if submitting}
                        {$_('listings.rh_sending')}
                    {:else}
                        {$_('listings.rh_submit')}
                    {/if}
                </button>
            </form>
        </div>

        <div class="text-center mt-6">
            <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                ← {$_('listings.back_home')}
            </a>
        </div>
    </div>
</div>
