<script lang="ts">
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { _ } from 'svelte-i18n';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { citiesAndNeighborhoods, effectiveNeighborhoods, LS_KEY, DEFAULT_NEIGHBORHOOD } from '$lib/neighborhoodsData';
    import { GMACH_TYPES } from '$lib/gmachTypes';
    import { trOr } from '$lib/categoryFields';
    import { imageDrop } from '$lib/imageDrop';
    import StreetPicker from '$lib/components/StreetPicker.svelte';
    import NeighborhoodPicker from '$lib/components/NeighborhoodPicker.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const DRAFT_KEY = 'add_draft_gmach';

    // ---- שלב-המפה בלבד: מה שצריך כדי להעלות את הגמ"ח למפה ----
    // שאר הפרטים (תיאור, שעות, קומה/דירה, הוראות הגעה, תמונות) מושלמים בדף הגמ"ח
    // עצמו במצב בנייה, מיד אחרי הפרסום - כמו בשאר קטגוריות המפה.
    let title       = $state('');
    let street      = $state('');
    let buildingNum = $state('');
    let phone       = $state(data.userPhone || '');
    let gmachTypes  = $state<string[]>([]);
    let city        = $state(data.userCity || 'ירושלים');
    let neighborhood = $state(data.userNeighborhood || DEFAULT_NEIGHBORHOOD);
    let logoBase64  = $state('');
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

    function toggleGmachType(key: string) {
        gmachTypes = gmachTypes.includes(key)
            ? gmachTypes.filter(k => k !== key)
            : [...gmachTypes, key];
    }

    let clientError    = $state('');
    let submitting     = $state(false);
    let redirectingMsg = $state('');

    // ---- לוגו למפה (אופציונלי) ----
    function fileToResizedBase64(file: File, maxDim: number, quality = 0.85): Promise<string> {
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
        input.value = '';
    }
    function removeLogo() { logoBase64 = ''; }

    // ---- שחזור טיוטה + שכונה מ-localStorage ----
    onMount(() => {
        if (!browser) return;

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

        try {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) {
                const d = JSON.parse(draft);
                if (d.title)        title        = d.title;
                if (d.street)       street       = d.street;
                if (d.buildingNum)  buildingNum  = d.buildingNum;
                if (d.phone)        phone        = d.phone;
                if (Array.isArray(d.gmachTypes)) gmachTypes = d.gmachTypes;
                else if (d.gmachType)            gmachTypes = [d.gmachType];
                if (d.city)         city         = d.city;
                if (d.neighborhood) neighborhood = d.neighborhood;
                if (d.logoBase64)   logoBase64   = d.logoBase64;
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
        if (forceMapPin && !(pinLat != null && pinLng != null)) {
            showMap = true;
            return { field: 'street', message: t('extras.g_v_map_required') };
        }
        if (!phone.trim())        return { field: 'phone',        message: t('extras.g_v_phone') };
        return null;
    }

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
        const payload = { title, street, buildingNum, phone, gmachTypes, city, neighborhood, pinLat, pinLng };
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...payload, logoBase64 }));
        } catch {
            // חריגה ממכסת localStorage (לוגו גדול) - שמור בלי הלוגו
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch {}
        }
    }

    // ---- שליחה: יוצר את הגמ"ח דרך /api/items ואז ממשיך לדף הגמ"ח (מצב בנייה) ----
    async function handleSubmit(e: Event) {
        e.preventDefault();
        clientError = '';
        const err = validate();
        if (err) { clientError = err.message; focusField(err.field); return; }

        // אם לא מחובר - שמור טיוטה והפנה להרשמה
        if (!data.userId) {
            saveDraft();
            redirectingMsg = get(_)('extras.g_draft_saved');
            setTimeout(() => goto('/login?redirect=/gmachim/add'), 2200);
            return;
        }

        submitting = true;

        // נושאי הגמ"ח: gmach_type הראשי לתאימות עם האתר הארצי + gmach_types המלא
        const primary = gmachTypes[0] ?? '';
        const extra: Record<string, unknown> = {};
        if (primary)            extra.gmach_type  = primary;
        if (gmachTypes.length)  extra.gmach_types = gmachTypes;
        if (logoBase64)         extra.map_image   = logoBase64;

        const address = [street, buildingNum].filter(Boolean).join(' ')
            || [neighborhood, city].filter(Boolean).join(', ');

        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: 'gemachim',
                    label: title,
                    phone,
                    address,
                    city,
                    neighborhood,
                    ...(pinLat != null && pinLng != null ? { lat: pinLat, lng: pinLng } : {}),
                    extra_fields: extra,
                }),
            });
            const result = await res.json().catch(() => ({}));
            if (!result.success || !result.id) {
                clientError = result.message || 'שגיאה בשמירת הגמ"ח, נסו שוב בעוד רגע';
                submitting = false;
                return;
            }
            if (browser) { try { localStorage.removeItem(DRAFT_KEY); } catch {} }
            // זרימה דו-שלבית: הגמ"ח עלה למפה - עוברים לדף המלא במצב בנייה להשלמת הפרטים
            goto(`/items/${result.id}?builder=1&new=1`);
        } catch {
            clientError = 'בעיית תקשורת - נסו שוב';
            submitting = false;
        }
    }
</script>

<svelte:head>
    <title>{$_('extras.g_title')} | קהילה בשכונה</title>
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
        <div class="text-center mb-5">
            <span class="text-5xl mb-2 block">🤝</span>
            <h1 class="text-3xl font-black text-white mb-2">{$_('extras.g_title')}</h1>
            <p class="text-gray-400 text-sm max-w-md mx-auto">{$_('extras.g_step2_hint')}</p>
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
            <form onsubmit={handleSubmit} class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-4">
                <!-- נושאי הגמ"ח -->
                <div id="gmach_type" role="group" aria-label={$_('extras.g_topics_aria')}>
                    <p class="text-white text-sm font-bold mb-1">{$_('extras.g_topics_label')} <span class="text-gray-400 font-normal text-xs">{$_('extras.g_topics_multi')}</span></p>
                    <div class="flex flex-wrap gap-2">
                        {#each GMACH_TYPES as t}
                            {@const isOn = gmachTypes.includes(t.key)}
                            <button type="button" onclick={() => toggleGmachType(t.key)}
                                class="px-3 py-1.5 rounded-full border-2 text-sm font-bold transition-all {isOn
                                    ? 'bg-amber-600 text-white border-transparent shadow-md'
                                    : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10 hover:border-white/30'}">
                                {isOn ? '✓ ' : ''}{trOr($_, `labels.gmach_${t.key}`, t.label)}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- שם הגמ"ח -->
                <div>
                    <label for="title" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_name_label')}</label>
                    <input id="title" name="title" bind:value={title} required placeholder={$_('extras.g_name_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                </div>

                <!-- מיקום הפרסום: עיר + שכונה -->
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

                <!-- כתובת: רחוב + מספר בניין -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="street" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_street_label')}</label>
                        <StreetPicker {city} value={street} withHouseNumber={false} onValueChange={(v) => (street = v)} onResolvedChange={(v) => (streetInList = v)} onStreetListChange={(info) => { cityHasStreetList = info.hasList; streetListLoading = info.loading; }} />
                    </div>
                    <div>
                        <label for="buildingNum" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_building_label')}</label>
                        <input id="buildingNum" name="buildingNum" bind:value={buildingNum} required placeholder={$_('extras.g_building_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
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

                <!-- טלפון + לוגו אופציונלי -->
                <div class="flex gap-4 items-end flex-wrap">
                    <div class="flex-1 min-w-[160px]">
                        <label for="phone" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_phone_label')}</label>
                        <input id="phone" name="phone" bind:value={phone} type="tel" required placeholder="05X-XXXXXXX" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <p class="text-white text-sm font-bold mb-1">{$_('extras.g_logo_label')}</p>
                        {#if logoBase64}
                            <div class="relative inline-block">
                                <img src={logoBase64} alt={$_('extras.g_logo_alt')} class="w-16 h-16 rounded-xl object-cover border border-white/15 bg-black/30" />
                                <button type="button" onclick={removeLogo} aria-label={$_('extras.g_logo_remove')}
                                    class="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white text-xs flex items-center justify-center transition-colors">✕</button>
                            </div>
                        {:else}
                            <label use:imageDrop={processLogoFile} class="flex flex-col items-center justify-center gap-0.5 w-24 h-16 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/3 hover:bg-amber-900/10 cursor-pointer transition-all">
                                <span class="text-xl">🎨</span>
                                <span class="text-gray-400 text-[10px] font-bold">{$_('extras.g_logo_upload')}</span>
                                <input type="file" accept="image/*" class="hidden" onchange={handleLogoChange} />
                            </label>
                        {/if}
                    </div>
                </div>

                <button type="submit" disabled={submitting} class="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                    {#if submitting}
                        <span class="inline-block w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin align-middle"></span>
                    {:else}
                        {data.userId ? $_('extras.g_submit_continue') : $_('extras.g_submit_guest')}
                    {/if}
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
