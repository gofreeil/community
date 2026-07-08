<script lang="ts">
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { _ } from 'svelte-i18n';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';
    import { citiesAndNeighborhoods, effectiveNeighborhoods, LS_KEY, DEFAULT_NEIGHBORHOOD } from '$lib/neighborhoodsData';
    import { formMemory } from '$lib/formMemory';
    import { GMACH_TYPES } from '$lib/gmachTypes';
    import { imageDrop } from '$lib/imageDrop';
    import StreetPicker from '$lib/components/StreetPicker.svelte';
    import NeighborhoodPicker from '$lib/components/NeighborhoodPicker.svelte';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const DRAFT_KEY = 'add_draft_gmach';

    // ---- Form state ----
    let title       = $state('');
    let headline    = $state('');
    let summary     = $state('');
    let icon        = $state('🤝');
    let description = $state('');
    let street      = $state('');
    let buildingNum = $state('');
    let floor       = $state('');
    let apartment   = $state('');
    let arrivalNotes = $state('');
    let hours       = $state('');
    let contact     = $state('');
    let phone       = $state('');
    let gmachTypes  = $state<string[]>([]);
    let city        = $state(data.userCity || 'ירושלים');
    let neighborhood = $state(data.userNeighborhood || DEFAULT_NEIGHBORHOOD);
    let logoBase64  = $state('');
    let images      = $state<string[]>([]);
    let tags        = $state<string[]>([]);
    let tagInput    = $state('');
    // סימון מיקום הגמ"ח על המפה (אופציונלי) - נשמר כ-lat/lng ברמה העליונה של הפריט
    let pinLat      = $state<number | null>(null);
    let pinLng      = $state<number | null>(null);
    let showMap     = $state(false);
    // הרחוב נבחר מהרשימה הרשמית של העיר? כשלא (או כשאין מספר בניין) - מציעים מפה
    let streetInList = $state(false);
    let addressResolved = $derived(streetInList && buildingNum.trim() !== '');

    // יישוב בלי רשימת רחובות ובלי שכונות (כמו כפר תפוח): אי אפשר לאמת כתובת ואין
    // שכונות מובחנות - הפין הופך לחובה, אחרת כל הגמ"חים נערמים על מרכז היישוב.
    let cityHasStreetList = $state(false);
    let streetListLoading = $state(true);

    function addTag() {
        const raw = tagInput.trim().replace(/^#+/, '').trim();
        if (raw && !tags.includes(raw)) {
            tags = [...tags, raw];
        }
        tagInput = '';
    }

    function handleTagKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            tags = tags.slice(0, -1);
        }
    }

    function removeTag(i: number) {
        tags = tags.filter((_, idx) => idx !== i);
    }

    function toggleGmachType(key: string) {
        gmachTypes = gmachTypes.includes(key)
            ? gmachTypes.filter(k => k !== key)
            : [...gmachTypes, key];
    }

    const MAX_IMAGES = 6;

    let clientError    = $state('');
    let redirectingMsg = $state('');

    // ---- Image utilities ----
    function fileToResizedBase64(file: File, maxDim: number, quality = 0.82): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('read error'));
            reader.onload = (ev) => {
                const src = ev.target?.result as string;
                const img = new Image();
                img.onerror = () => reject(new Error('image error'));
                img.onload = () => {
                    let w = img.naturalWidth;
                    let h = img.naturalHeight;
                    if (w > maxDim || h > maxDim) {
                        const ratio = Math.min(maxDim / w, maxDim / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = src;
            };
            reader.readAsDataURL(file);
        });
    }

    async function processLogoFile(files: File[]) {
        const file = files[0];
        if (!file) return;
        try {
            logoBase64 = await fileToResizedBase64(file, 400, 0.85);
        } catch {
            clientError = get(_)('extras.g_logo_error');
        }
    }

    async function handleLogoChange(e: Event) {
        const input = e.target as HTMLInputElement;
        await processLogoFile(Array.from(input.files ?? []));
        // איפוס ערך ה-input כדי לאפשר העלאה חוזרת של אותו קובץ
        input.value = '';
    }

    async function processFiles(files: File[]) {
        if (files.length === 0) return;

        const remaining = MAX_IMAGES - images.length;
        const toProcess = files.slice(0, remaining);

        try {
            const newImgs: string[] = [];
            for (const f of toProcess) {
                newImgs.push(await fileToResizedBase64(f, 900, 0.82));
            }
            images = [...images, ...newImgs];
        } catch {
            clientError = get(_)('extras.g_images_error');
        }
    }

    async function handleImagesChange(e: Event) {
        const input = e.target as HTMLInputElement;
        await processFiles(Array.from(input.files ?? []));
        // איפוס ערך ה-input כדי לאפשר העלאה חוזרת של אותו קובץ
        input.value = '';
    }

    function removeLogo() { logoBase64 = ''; }
    function removeImage(i: number) { images = images.filter((_, idx) => idx !== i); }

    // ---- Restore draft + neighborhood from localStorage ----
    onMount(() => {
        if (!browser) return;

        // אם אין נתוני פרופיל - נסה localStorage של בחירת השכונה הכללית
        if (!data.userCity || !data.userNeighborhood) {
            try {
                const saved = localStorage.getItem(LS_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.neighborhood) neighborhood = parsed.neighborhood;
                    if (parsed.city)         city         = parsed.city;
                }
            } catch {}
        }

        // שחזר טיוטה (אם חזר מהרשמה)
        try {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) {
                const d = JSON.parse(draft);
                if (d.title)        title        = d.title;
                if (d.headline)     headline     = d.headline;
                if (d.summary)      summary      = d.summary;
                if (d.icon)         icon         = d.icon;
                if (d.description)  description  = d.description;
                if (d.street)       street       = d.street;
                if (d.buildingNum)  buildingNum  = d.buildingNum;
                if (d.floor)        floor        = d.floor;
                if (d.apartment)    apartment    = d.apartment;
                if (d.arrivalNotes) arrivalNotes = d.arrivalNotes;
                if (d.hours)        hours        = d.hours;
                if (d.contact)      contact      = d.contact;
                if (d.phone)        phone        = d.phone;
                if (Array.isArray(d.gmachTypes)) gmachTypes = d.gmachTypes;
                else if (d.gmachType)            gmachTypes = [d.gmachType];
                if (d.city)         city         = d.city;
                if (d.neighborhood) neighborhood = d.neighborhood;
                if (d.logoBase64)   logoBase64   = d.logoBase64;
                if (Array.isArray(d.images)) images = d.images;
                if (Array.isArray(d.tags))   tags   = d.tags;
                if (d.pinLat != null && d.pinLng != null) {
                    pinLat = d.pinLat; pinLng = d.pinLng; showMap = true;
                }
                localStorage.removeItem(DRAFT_KEY);
            }
        } catch {}
    });

    let neighborhoodsForCity = $derived(effectiveNeighborhoods(city, (data as any).approvedNeighborhoods));

    // "יש שכונות אמיתיות" = מעבר ל'מרכז'/ברירת המחדל הגלובלית
    const cityHasNeighborhoods = $derived(
        neighborhoodsForCity.filter(n => n && n !== 'מרכז' && n !== DEFAULT_NEIGHBORHOOD).length > 0,
    );
    const forceMapPin = $derived(!streetListLoading && !cityHasStreetList && !cityHasNeighborhoods);
    // כשהמפה חובה - פותחים אותה מיד
    $effect(() => { if (forceMapPin) showMap = true; });

    // אם משתנה עיר - איפוס לשכונה הראשונה אם הקיימת לא תואמת
    $effect(() => {
        if (neighborhoodsForCity.length > 0 && !neighborhoodsForCity.includes(neighborhood)) {
            neighborhood = neighborhoodsForCity[0];
        }
    });

    // כל שגיאה מצביעה על השדה המדויק שחסר, כדי שנוכל להאיר ולגלול אליו
    function validate(): { field: string; message: string } | null {
        const t = get(_);
        if (!title.trim())        return { field: 'title',        message: t('extras.g_v_title') };
        if (!street.trim())       return { field: 'street',       message: t('extras.g_v_street') };
        if (!buildingNum.trim())  return { field: 'buildingNum',  message: t('extras.g_v_building') };
        if (!city.trim())         return { field: 'city',         message: t('extras.g_v_city') };
        if (!neighborhood.trim()) return { field: 'neighborhood', message: t('extras.g_v_neighborhood') };
        // ביישוב בלי רחובות/שכונות - חובה פין, אחרת הגמ"ח ייעֶרם על מרכז היישוב
        if (forceMapPin && !(pinLat != null && pinLng != null)) {
            showMap = true;
            return { field: 'street', message: t('extras.g_v_map_required') };
        }
        if (!phone.trim())        return { field: 'phone',        message: t('extras.g_v_phone') };
        return null;
    }

    // מאיר את השדה החסר, גולל אליו וממקד בו את הסמן
    function focusField(field: string) {
        if (!browser) return;
        const el = document.getElementById(field) as HTMLElement | null;
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('field-error-flash');
        setTimeout(() => el.classList.remove('field-error-flash'), 1800);
        setTimeout(() => el.focus({ preventScroll: true }), 300);
    }

    function saveDraft() {
        if (!browser) return;
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                title, headline, summary, icon, description, street, buildingNum, floor, apartment, arrivalNotes, hours, contact, phone, gmachTypes, city, neighborhood,
                logoBase64, images, tags, pinLat, pinLng,
            }));
        } catch {
            // אם חרגנו ממכסת localStorage (תמונות גדולות) - שמור בלי תמונות
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({
                    title, headline, summary, icon, description, street, buildingNum, floor, apartment, arrivalNotes, hours, contact, phone, gmachTypes, city, neighborhood, tags, pinLat, pinLng,
                }));
            } catch {}
        }
    }

    // ---- Submit handler ----
    function handleSubmit(e: Event) {
        clientError = '';
        const err = validate();
        if (err) {
            e.preventDefault();
            clientError = err.message;
            focusField(err.field);
            return;
        }

        // אם לא מחובר - שמור טיוטה והפנה להרשמה
        if (!data.userId) {
            e.preventDefault();
            saveDraft();
            redirectingMsg = get(_)('extras.g_draft_saved');
            setTimeout(() => goto('/login?redirect=/gmachim/add'), 2200);
            return;
        }
        // מחובר - תן ל-form action הרגיל לרוץ
    }
</script>

<svelte:head>
    <title>פרסום גמ"ח חדש | קהילה בשכונה</title>
</svelte:head>

{#if clientError}
    <div class="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none" dir="rtl">
        <div class="pointer-events-auto flex items-center gap-2 max-w-md w-full rounded-xl bg-red-950/95 border border-red-500/50 shadow-2xl px-4 py-3 text-red-100 text-sm font-medium backdrop-blur">
            <span class="text-lg">⚠️</span>
            <span class="flex-1">{clientError}</span>
            <button type="button" onclick={() => (clientError = '')} aria-label={$_('extras.close')} class="text-red-300 hover:text-white text-lg leading-none">✕</button>
        </div>
    </div>
{/if}

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🤝</span>
            <h1 class="text-3xl font-black text-white mb-2">{$_('extras.g_title')}</h1>
            <p class="text-gray-400">{$_('extras.g_subtitle')}</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-blue-900/20 border border-blue-500/30 p-3 mb-4 text-center text-blue-200 text-sm">
                {$_('extras.g_guest_note')}
            </div>
        {/if}

        {#if redirectingMsg}
            <div class="rounded-2xl border-2 border-blue-500/40 bg-blue-900/20 p-8 text-center">
                <div class="text-4xl mb-4">💾</div>
                {#each redirectingMsg.split('\n') as line}
                    <p class="text-blue-200 font-bold text-base mb-2">{line}</p>
                {/each}
                <div class="mt-4 flex justify-center">
                    <span class="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                </div>
            </div>
        {:else}
            <form method="POST" onsubmit={handleSubmit} use:enhance use:formMemory class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-4">
                <div>
                    <label for="title" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_name_label')}</label>
                    <input id="title" name="title" bind:value={title} required placeholder={$_('extras.g_name_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                </div>

                <div>
                    <label for="headline" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_headline_label')}</label>
                    <input id="headline" name="headline" bind:value={headline} placeholder={$_('extras.g_headline_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                </div>

                <div id="gmach_type" role="group" aria-label={$_('extras.g_topics_aria')}>
                    <p class="text-white text-sm font-bold mb-1">{$_('extras.g_topics_label')} <span class="text-gray-400 font-normal text-xs">{$_('extras.g_topics_multi')}</span></p>
                    <div class="flex flex-wrap gap-2">
                        {#each GMACH_TYPES as t}
                            {@const isOn = gmachTypes.includes(t.key)}
                            <button type="button" onclick={() => toggleGmachType(t.key)}
                                class="px-3 py-1.5 rounded-full border-2 text-sm font-bold transition-all {isOn
                                    ? 'bg-amber-600 text-white border-transparent shadow-md'
                                    : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10 hover:border-white/30'}">
                                {isOn ? '✓ ' : ''}{t.label}
                            </button>
                        {/each}
                    </div>
                    <input type="hidden" name="gmach_type" value={gmachTypes[0] ?? ''} />
                    <input type="hidden" name="gmach_types_json" value={JSON.stringify(gmachTypes)} />
                </div>

                <div>
                    <label for="summary" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_summary_label')}</label>
                    <textarea id="summary" name="summary" bind:value={summary} rows="3" placeholder={$_('extras.g_summary_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" style="color-scheme: dark;"></textarea>
                </div>

                <div>
                    <label for="description" class="text-white text-sm font-bold mb-2 block">{$_('extras.g_desc_label')}</label>
                    <textarea id="description" name="description" bind:value={description} rows="3" placeholder={$_('extras.g_desc_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" style="color-scheme: dark;"></textarea>

                    <!-- Tags input (chip windows) -->
                    <div class="mt-3">
                        <label for="tag_input" class="text-white text-sm font-bold mb-0.5 block">{$_('extras.g_tags_label')}</label>
                        <p class="text-gray-400 text-xs mb-2">{$_('extras.g_tags_hint')}</p>
                        <div class="flex flex-wrap items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg min-h-[3rem] focus-within:border-amber-500/50 transition-colors">
                            {#each tags as tag, i}
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600/20 border border-amber-500/40 text-amber-100 text-sm font-medium">
                                    <span>#{tag}</span>
                                    <button type="button" onclick={() => removeTag(i)} aria-label={$_('extras.g_tag_remove')}
                                        class="text-amber-200/70 hover:text-red-400 transition-colors">✕</button>
                                </span>
                            {/each}
                            <input
                                id="tag_input"
                                type="text"
                                bind:value={tagInput}
                                onkeydown={handleTagKeyDown}
                                onblur={addTag}
                                placeholder={tags.length === 0 ? $_('extras.g_tag_ph_first') : $_('extras.g_tag_ph_more')}
                                class="flex-1 min-w-[120px] bg-transparent outline-none text-white placeholder-gray-500 text-sm px-1 py-1"
                            />
                        </div>
                        <p class="text-gray-500 text-xs mt-1.5 leading-relaxed">
                            {$_('extras.g_tag_help_1')} <kbd class="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-gray-300 text-[10px]">Enter</kbd>
                            {$_('extras.g_tag_help_2')}<br />
                            {$_('extras.g_tag_examples')} <span class="text-amber-300">{$_('extras.g_tag_ex1')}</span> · <span class="text-amber-300">{$_('extras.g_tag_ex2')}</span> · <span class="text-amber-300">{$_('extras.g_tag_ex3')}</span>
                        </p>
                        <input type="hidden" name="tags_json" value={JSON.stringify(tags)} />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="city" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_city_label')}</label>
                        <select id="city" name="city" bind:value={city} required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" style="color-scheme: dark;">
                            {#each Object.keys(citiesAndNeighborhoods) as c}
                                <option value={c}>{c}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="neighborhood" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_neighborhood_label')}</label>
                        <select id="neighborhood" name="neighborhood" bind:value={neighborhood} required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" style="color-scheme: dark;">
                            {#each neighborhoodsForCity as n}
                                <option value={n}>{n}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="street" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_street_label')}</label>
                        <!-- בחירה מרשימת הרחובות הרשמית של העיר - איות אחיד; הקלדה חופשית עדיין אפשרית -->
                        <StreetPicker {city} value={street} withHouseNumber={false} onValueChange={(v) => (street = v)} onResolvedChange={(v) => (streetInList = v)} onStreetListChange={(info) => { cityHasStreetList = info.hasList; streetListLoading = info.loading; }} />
                        <input type="hidden" name="street" value={street} />
                    </div>
                    <div>
                        <label for="buildingNum" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_building_label')}</label>
                        <input id="buildingNum" name="buildingNum" bind:value={buildingNum} required placeholder={$_('extras.g_building_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label for="floor" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_floor_label')}</label>
                        <input id="floor" name="floor" bind:value={floor} placeholder={$_('extras.g_floor_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="apartment" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_apartment_label')}</label>
                        <input id="apartment" name="apartment" bind:value={apartment} placeholder={$_('extras.g_apartment_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="hours" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_hours_label')}</label>
                        <input id="hours" name="hours" bind:value={hours} placeholder="9:00-21:00" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <div>
                    <label for="arrivalNotes" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_arrival_label')}</label>
                    <textarea id="arrivalNotes" name="arrivalNotes" bind:value={arrivalNotes} rows="2" placeholder={$_('extras.g_arrival_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" style="color-scheme: dark;"></textarea>
                </div>

                <!-- סימון על המפה - מוצג כשהכתובת לא נפתרה, וחובה ביישוב בלי רחובות/שכונות -->
                {#if !addressResolved || forceMapPin}
                    <div>
                        {#if forceMapPin}
                            <p class="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 leading-relaxed">
                                {$_('extras.g_map_forced_note')}
                            </p>
                        {:else}
                            <p class="text-white text-sm font-bold mb-1">{$_('extras.g_map_notfound_title')}</p>
                            <p class="text-gray-400 text-xs mb-2">{$_('extras.g_map_notfound_sub')}</p>
                        {/if}
                        {#if !showMap}
                            <button
                                type="button"
                                onclick={() => (showMap = true)}
                                class="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-bold py-3 transition-all"
                            >
                                {$_('extras.g_map_pin_btn')}
                            </button>
                        {:else}
                            <NeighborhoodPicker
                                {city}
                                {neighborhood}
                                restrictToCity
                                bind:lat={pinLat}
                                bind:lng={pinLng}
                            />
                            {#if !forceMapPin}
                                <button
                                    type="button"
                                    onclick={() => { showMap = false; pinLat = null; pinLng = null; }}
                                    class="mt-2 text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors"
                                >
                                    {$_('extras.g_map_hide')}
                                </button>
                            {/if}
                        {/if}
                    </div>
                {/if}
                <!-- lat/lng נשלחים עם ה-form action תמיד (ריק כשאין פין) -->
                <input type="hidden" name="lat" value={pinLat ?? ''} />
                <input type="hidden" name="lng" value={pinLng ?? ''} />

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="contact" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_contact_label')}</label>
                        <input id="contact" name="contact" bind:value={contact} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                    </div>
                    <div>
                        <label for="phone" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_phone_label')}</label>
                        <input id="phone" name="phone" bind:value={phone} type="tel" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                    </div>
                </div>

                <!-- Logo upload + Icon -->
                <div class="flex gap-4 items-start flex-wrap">
                    <div>
                        <p class="text-white text-sm font-bold mb-1">{$_('extras.g_logo_label')}</p>
                        {#if logoBase64}
                            <div class="relative inline-block">
                                <img src={logoBase64} alt={$_('extras.g_logo_alt')} class="w-24 h-24 rounded-xl object-cover border border-white/15 bg-black/30" />
                                <button type="button" onclick={removeLogo} aria-label={$_('extras.g_logo_remove')}
                                    class="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors">✕</button>
                            </div>
                        {:else}
                            <label use:imageDrop={processLogoFile} class="flex flex-col items-center justify-center gap-1 w-32 h-32 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/3 hover:bg-amber-900/10 cursor-pointer transition-all">
                                <span class="text-2xl">🎨</span>
                                <span class="text-gray-400 text-xs font-bold">{$_('extras.g_logo_upload')}</span>
                                <span class="text-gray-600 text-[10px]">{$_('extras.g_logo_square')}</span>
                                <input type="file" accept="image/*" class="hidden" onchange={handleLogoChange} />
                            </label>
                        {/if}
                        <input type="hidden" name="logo_base64" value={logoBase64} />
                    </div>

                    <div class="w-32">
                        <label for="icon" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_icon_label')}</label>
                        <input id="icon" name="icon" bind:value={icon} maxlength="4" placeholder="🤝" class="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-center text-xl" />
                        <p class="text-gray-500 text-xs mt-1 leading-tight">{$_('extras.g_icon_hint')}</p>
                    </div>
                </div>

                <!-- Multi image upload -->
                <div>
                    <p class="text-white text-sm font-bold mb-1">{$_('extras.g_images_label', { values: { n: MAX_IMAGES } })}</p>
                    <div class="grid grid-cols-3 gap-2">
                        {#each images as img, i}
                            <div class="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                                <img src={img} alt={$_('extras.g_image_alt', { values: { n: i + 1 } })} class="w-full h-full object-cover bg-black/30" />
                                <button type="button" onclick={() => removeImage(i)} aria-label={$_('extras.g_image_remove')}
                                    class="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white text-xs flex items-center justify-center transition-colors">✕</button>
                            </div>
                        {/each}
                        {#if images.length < MAX_IMAGES}
                            <label use:imageDrop={processFiles} class="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/3 hover:bg-amber-900/10 cursor-pointer transition-all">
                                <span class="text-2xl">📷</span>
                                <span class="text-gray-400 text-xs font-bold">{$_('extras.g_image_add')}</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange={handleImagesChange} />
                            </label>
                        {/if}
                    </div>
                    <input type="hidden" name="images_json" value={JSON.stringify(images)} />
                </div>

                {#if form?.error}
                    <p class="text-red-400 text-sm text-center">{form.error}</p>
                {/if}

                <button type="submit" class="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                    {data.userId ? $_('extras.g_submit') : $_('extras.g_submit_guest')}
                </button>

                <p class="text-gray-400 text-sm text-center pt-2 border-t border-white/5">
                    {$_('extras.g_footer_1')} <a href="https://gemach.gofreeil.com/" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 underline">{$_('extras.g_footer_link')}</a>
                </p>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="https://gemach.gofreeil.com" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-white transition-colors text-sm">{$_('extras.g_all_gmachim')}</a>
        </div>
    </div>
</div>

<style>
    /* הבהוב אדום קצר על השדה החסר כדי להדגיש בדיוק מה צריך למלא */
    :global(.field-error-flash) {
        animation: field-error-flash 1.8s ease-out;
    }
    @keyframes field-error-flash {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: rgba(255, 255, 255, 0.1); }
        15%      { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.35); border-color: rgba(239, 68, 68, 0.9); }
    }
</style>
