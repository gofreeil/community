<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { LS_KEY, DEFAULT_NEIGHBORHOOD, citiesAndNeighborhoods } from '$lib/neighborhoodsData';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const { categoryId, config, userId, userProfile } = data;

    const DRAFT_KEY = `add_draft_${categoryId}`;

    // Helper: מחזיר HTML לאיקון - תמונה אם src, אמוגי אם לא
    const iconHtml = (size: 'lg' | 'sm' = 'sm') =>
        config.icon?.startsWith('/')
            ? `<img src="${config.icon}" class="${size === 'lg' ? 'w-28 h-28 mx-auto' : 'w-5 h-5 inline-block align-middle'}" alt="${config.label}" />`
            : config.icon ?? '';

    // ---- Neighborhood - מתמלא מיד מהפרופיל ----
    let neighborhood = $state(userProfile?.neighborhood || DEFAULT_NEIGHBORHOOD);
    let city         = $state(userProfile?.city         || 'ירושלים');

    // ---- ערכי ברירת מחדל לשדות מפרופיל המשתמש ----
    function profileDefault(key: string, type: string, options?: string[], defaultVal?: string): string {
        if (type === 'toggle' && options) return defaultVal && options.includes(defaultVal) ? defaultVal : options[0];
        if (key === 'contact' && userProfile?.nickname) return userProfile.nickname;
        if (key === 'phone'   && userProfile?.phone)    return userProfile.phone;
        if (key === 'address' && type === 'neighborhood_select') {
            return userProfile?.neighborhood || DEFAULT_NEIGHBORHOOD;
        }
        if (key === 'address') {
            const parts = [userProfile?.neighborhood, userProfile?.city].filter(Boolean);
            if (parts.length) return parts.join(', ');
        }
        // מצב משפחתי - נלקח מהפרופיל (single_m/single_f → רווק/ה)
        if (key === 'marital_status' && userProfile?.family_status) {
            const fs = userProfile.family_status;
            if (fs === 'single_m' || fs === 'single_f') return 'רווק/ה';
        }
        // מין - אם בפרופיל נשמר ידע על מגדר, מקדים כברירת מחדל
        if (key === 'gender' && userProfile?.family_status) {
            if (userProfile.family_status === 'single_m') return 'גבר';
            if (userProfile.family_status === 'single_f') return 'אישה';
        }
        if (defaultVal) return defaultVal;
        return '';
    }

    // ---- Form state - מתמלא מיד מהפרופיל ללא המתנה ל-onMount ----
    let formValues = $state<Record<string, string>>(
        Object.fromEntries(config.fields.map(f => [f.key, profileDefault(f.key, f.type, f.options, f.default)]))
    );

    // ---- תמחור מסעדות - מסעדה 45 ₪, מזון מהיר 30 ₪ (תלוי בבחירת המשתמש) ----
    const RESTAURANT_PRICING: Record<string, { row: number; price: number }> = {
        'מסעדה':     { row: 7,  price: 45 },
        'מזון מהיר': { row: 10, price: 30 },
    };
    let restaurantPlan = $derived(
        categoryId === 'restaurants'
            ? (RESTAURANT_PRICING[formValues.venue_type] ?? RESTAURANT_PRICING['מסעדה'])
            : null
    );
    let effectivePriceRow = $derived(restaurantPlan ? restaurantPlan.row : config.priceRow);
    let monthlyPrice      = $derived(restaurantPlan ? restaurantPlan.price : 15);

    let submitting      = $state(false);
    let errorMsg        = $state('');
    let submitted       = $state(false);
    let redirectingMsg  = $state(''); // הודעה לפני מעבר להרשמה
    let openHintKey     = $state(''); // איזה hint פתוח כרגע (לחיצה ארוכה / hover במובייל)
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

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

    function getImages(key: string): string[] {
        try { return JSON.parse(getFieldValue(key) || '[]'); } catch { return []; }
    }
    function setImages(key: string, arr: string[]) {
        setFieldValue(key, JSON.stringify(arr));
    }
    async function handleImagesChange(key: string, e: Event) {
        const input = e.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        const current = getImages(key);
        const slots = MAX_IMAGES - current.length;
        const compressed = await Promise.all(files.slice(0, slots).map(compressImage));
        setImages(key, [...current, ...compressed]);
        input.value = '';
    }
    function removeImageAt(key: string, idx: number) {
        setImages(key, getImages(key).filter((_, i) => i !== idx));
    }
    function setMainImage(key: string, idx: number) {
        const arr = getImages(key);
        if (idx <= 0 || idx >= arr.length) return;
        const [picked] = arr.splice(idx, 1);
        arr.unshift(picked);
        setImages(key, arr);
    }

    function startLongPress(key: string) {
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => { openHintKey = key; }, 400);
    }
    function cancelLongPress() {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }

    onMount(() => {
        if (!browser) return;

        // מלא פרטי פרופיל (גיבוי למקרה שה-SSR לא אותחל נכון)
        if (userProfile) {
            if (userProfile.nickname    && !getFieldValue('contact'))  setFieldValue('contact',  userProfile.nickname);
            if (userProfile.phone       && !getFieldValue('phone'))    setFieldValue('phone',    userProfile.phone);
            if (userProfile.neighborhood && !getFieldValue('address')) {
                const parts = [userProfile.neighborhood, userProfile.city].filter(Boolean);
                setFieldValue('address', parts.join(', '));
            }
        }

        // שחזר שכונה מ-localStorage (גובר על פרופיל)
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.neighborhood) neighborhood = parsed.neighborhood;
                if (parsed.city)         city         = parsed.city;
                // מלא שדה address מהשכונה הנבחרה אם עדיין ריק
                if (!getFieldValue('address')) {
                    const parts = [parsed.neighborhood, parsed.city].filter(Boolean);
                    if (parts.length) setFieldValue('address', parts.join(', '));
                }
            }
        } catch {}

        // שחזר טיוטא אם קיימת (גובר על הכל)
        try {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) {
                const parsed = JSON.parse(draft);
                if (parsed.formValues)   formValues   = { ...formValues, ...parsed.formValues };
                if (parsed.neighborhood) neighborhood = parsed.neighborhood;
                if (parsed.city)         city         = parsed.city;
                localStorage.removeItem(DRAFT_KEY);
            }
        } catch {}
    });

    function getFieldValue(key: string): string {
        return formValues[key] ?? '';
    }
    function setFieldValue(key: string, value: string) {
        formValues = { ...formValues, [key]: value };
    }

    // ---- כשמשתמש בוחר 'מחפש להתארח' - ברירת המחדל של 'משך הפרסום' היא 'לשבת הקרובה בלבד' ----
    let prevOfferType = $state(formValues.offer_type ?? '');
    $effect(() => {
        const ot = formValues.offer_type;
        if (ot !== prevOfferType) {
            prevOfferType = ot;
            if (categoryId === 'realestate' && formValues.posting_type !== undefined) {
                setFieldValue('posting_type', ot === 'מחפש להתארח' ? 'לשבת הקרובה בלבד' : 'קבוע');
            }
        }
    });

    // ---- Visibility (showIf) ----
    function isFieldVisible(field: typeof config.fields[number]): boolean {
        if (!field.showIf) return true;
        return formValues[field.showIf.field] === field.showIf.equals;
    }

    // ---- Validation ----
    function validate(): string | null {
        for (const field of config.fields) {
            if (!isFieldVisible(field)) continue;
            if (!field.required) continue;
            if (field.type === 'images') {
                let count = 0;
                try { count = JSON.parse(formValues[field.key] || '[]').length; } catch { count = 0; }
                if (count === 0) return `השדה "${field.label}" הוא חובה`;
            } else if (!formValues[field.key]?.trim()) {
                return `השדה "${field.label}" הוא חובה`;
            }
        }
        if (!neighborhood) return 'נא לבחור שכונה';
        return null;
    }

    // ---- שמירת טיוטא ל-localStorage ----
    function saveDraft() {
        if (!browser) return;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ formValues, neighborhood, city }));
    }

    // ---- Submit ----
    async function handleSubmit(e: Event) {
        e.preventDefault();
        errorMsg = '';
        const err = validate();
        if (err) { errorMsg = err; return; }

        // אם לא מחובר - שמור טיוטא והפנה להרשמה
        if (!userId) {
            saveDraft();
            redirectingMsg = 'הטיוטה שלך נשמרה ✓\nאתה מועבר להרשמה - הפרסום יושלם מיד לאחריה.';
            setTimeout(() => {
                goto(`/login?redirect=/add/${categoryId}`);
            }, 2200);
            return;
        }

        submitting = true;

        const topLevelKeys = ['label', 'description', 'contact', 'phone', 'address'];
        const topLevel: Record<string, string> = {};
        const extra: Record<string, unknown> = {};
        const imageKeys = new Set(config.fields.filter(f => f.type === 'images').map(f => f.key));

        for (const [k, v] of Object.entries(formValues)) {
            if (topLevelKeys.includes(k)) {
                topLevel[k] = v;
            } else if (imageKeys.has(k)) {
                try { extra[k] = JSON.parse(v || '[]'); } catch { extra[k] = []; }
            } else {
                extra[k] = v;
            }
        }

        if (!topLevel.label) {
            const labelField = config.fields.find(f => f.key === 'label');
            const fallback = extra[labelField?.key ?? ''];
            topLevel.label = (typeof fallback === 'string' ? fallback : '') || config.label;
        }

        // אירוח לשבת: כותרת הכרטיס מורכבת משם המשפחה (רק למארח)
        const familyName = typeof extra.family_name === 'string' ? extra.family_name.trim() : '';
        if (categoryId === 'realestate' && extra.offer_type === 'מציע לארח' && familyName) {
            topLevel.label = `משפחת ${familyName}`;
        }

        // פנויים/פנויות: כותרת מורכבת אוטומטית מ"פנוי/ה, גיל, עיר"
        if (categoryId === 'singles') {
            const genderRaw = typeof extra.gender === 'string' ? extra.gender : '';
            const ageRaw = typeof extra.age === 'string' ? extra.age.trim() : '';
            const singleWord = genderRaw === 'אישה' ? 'פנויה' : 'פנוי';
            const parts = [singleWord, ageRaw, city].filter(Boolean);
            topLevel.label = parts.join(', ');
        }

        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category:     categoryId,
                    neighborhood,
                    city,
                    ...topLevel,
                    extra_fields: extra,
                }),
            });

            const result = await res.json();
            if (!result.success) {
                errorMsg = result.message ?? 'שגיאה בשמירה';
                submitting = false;
                return;
            }

            submitted = true;

            if (config.priceRow !== null) {
                if (browser) {
                    localStorage.setItem('pending_ad', JSON.stringify({
                        priceRow:      effectivePriceRow,
                        categoryLabel: config.label,
                        itemLabel:     topLevel.label,
                        itemId:        result.id,
                    }));
                }
                setTimeout(() => goto('/about/advertise'), 1500);
            } else {
                setTimeout(() => goto('/'), 2500);
            }

        } catch {
            errorMsg = 'בעיית תקשורת - נסה שוב';
            submitting = false;
        }
    }

    const colorClasses: Record<string, { border: string; bg: string; text: string; btn: string }> = {
        purple: { border: 'border-purple-500/40', bg: 'bg-purple-900/10', text: 'text-purple-400', btn: 'bg-purple-600 hover:bg-purple-500' },
        orange: { border: 'border-orange-500/40', bg: 'bg-orange-900/10', text: 'text-orange-400', btn: 'bg-orange-600 hover:bg-orange-500' },
        pink:   { border: 'border-pink-500/40',   bg: 'bg-pink-900/10',   text: 'text-pink-400',   btn: 'bg-pink-600 hover:bg-pink-500'   },
        blue:   { border: 'border-blue-500/40',   bg: 'bg-blue-900/10',   text: 'text-blue-400',   btn: 'bg-blue-600 hover:bg-blue-500'   },
        red:    { border: 'border-red-500/40',    bg: 'bg-red-900/10',    text: 'text-red-400',    btn: 'bg-red-600 hover:bg-red-500'     },
        yellow: { border: 'border-yellow-500/40', bg: 'bg-yellow-900/10', text: 'text-yellow-400', btn: 'bg-yellow-600 hover:bg-yellow-500'},
        green:  { border: 'border-green-500/40',  bg: 'bg-green-900/10',  text: 'text-green-400',  btn: 'bg-green-600 hover:bg-green-500' },
        indigo: { border: 'border-indigo-500/40', bg: 'bg-indigo-900/10', text: 'text-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-500'},
    };
    const colors = colorClasses[config.color] ?? colorClasses['purple'];

    const inputClass = `w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3
        text-white placeholder:text-gray-600 text-sm
        focus:outline-none focus:border-amber-500/60 focus:bg-amber-900/10
        transition-all`;
</script>

<svelte:head>
    <title>{config.addPageTitle ?? `הוסף ${config.label}`} | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-4 md:py-6" dir="rtl">

    <!-- Header -->
    <div class="text-center mb-4">
        {#if categoryId !== 'restaurants'}
            <div class="-mb-2">{@html iconHtml('lg')}</div>
        {/if}
        <div class="relative flex items-center justify-center">
            <h1 class="text-2xl md:text-3xl font-black text-white mb-2">
                {config.addPageTitle ?? `הוסף ${config.label}`}
            </h1>
            <button
                type="button"
                onclick={() => history.back()}
                class="absolute right-0 top-0 text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
            >
                ← חזרה
            </button>
        </div>
    </div>

    {#if redirectingMsg}
        <!-- הודעת מעבר להרשמה -->
        <div class="rounded-2xl border-2 border-blue-500/40 bg-blue-900/20 p-8 text-center"
             style="animation: fadeIn 0.4s ease-out;">
            <div class="text-4xl mb-4">💾</div>
            {#each redirectingMsg.split('\n') as line}
                <p class="text-blue-200 font-bold text-base mb-2">{line}</p>
            {/each}
            <div class="mt-4 flex justify-center">
                <span class="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
                      style="animation: spin 0.7s linear infinite;"></span>
            </div>
        </div>

    {:else if submitted}
        <!-- Success -->
        <div class="rounded-2xl border-2 border-green-500/40 bg-green-900/20 p-8 text-center"
             style="animation: fadeIn 0.4s ease-out;">
            <div class="text-4xl mb-3">✅</div>
            <h2 class="text-xl font-black text-green-300 mb-2">המודעה שלך נשמרה</h2>
            {#if config.priceRow !== null}
                <p class="text-amber-200 text-base font-bold mb-1">שלם {monthlyPrice} ש"ח בחודש על מנת להופיע</p>
                <p class="text-gray-400 text-sm">מועבר לדף התשלום...</p>
            {:else}
                <p class="text-gray-400 text-sm">הפריט שלך נוסף לשכונה! מועבר לדף הבית...</p>
            {/if}
        </div>

    {:else}
        <!-- Form -->
        <form
            onsubmit={handleSubmit}
            class="rounded-2xl border {colors.border} {colors.bg} p-6 md:p-8 grid grid-cols-2 gap-5"
        >
            {#each config.fields as field}
                {#if isFieldVisible(field)}
                <div class="{field.half ? 'col-span-1' : 'col-span-2'}">
                    <label
                        for="field-{field.key}"
                        class="block text-sm font-bold text-gray-300 mb-1.5"
                    >
                        {field.label}
                        {#if field.required}
                            <span class="text-red-400">*</span>
                        {/if}
                    </label>

                    {#if field.type === 'toggle' && field.options}
                        <div class="relative mx-auto w-full max-w-[280px]">
                            <div class="flex p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm gap-1">
                                {#each field.options as opt}
                                    {@const hintTarget = field.hint && opt === (field.default ?? field.options[0])}
                                    <button
                                        type="button"
                                        onclick={() => setFieldValue(field.key, opt)}
                                        onmouseenter={hintTarget ? () => openHintKey = field.key : undefined}
                                        onmouseleave={hintTarget ? () => openHintKey = '' : undefined}
                                        onpointerdown={hintTarget ? () => startLongPress(field.key) : undefined}
                                        onpointerup={hintTarget ? cancelLongPress : undefined}
                                        onpointercancel={hintTarget ? cancelLongPress : undefined}
                                        class="flex-1 px-3 py-2 text-xs font-semibold rounded-full transition-all duration-200 {getFieldValue(field.key) === opt
                                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
                                    >
                                        {opt}
                                    </button>
                                {/each}
                            </div>
                            {#if field.hint && openHintKey === field.key}
                                <span
                                    role="tooltip"
                                    class="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1.5 w-64 max-w-[90vw] p-2.5 rounded-lg bg-slate-900 border border-white/15 shadow-xl text-gray-200 text-xs font-normal leading-relaxed text-center whitespace-normal"
                                >{field.hint}</span>
                            {/if}
                        </div>

                    {:else if field.type === 'textarea'}
                        <textarea
                            id="field-{field.key}"
                            value={getFieldValue(field.key)}
                            oninput={(e) => setFieldValue(field.key, (e.target as HTMLTextAreaElement).value)}
                            placeholder={field.placeholder ?? ''}
                            rows={field.maxLength ? 1 : 3}
                            maxlength={field.maxLength ?? undefined}
                            class="{inputClass} resize-none"
                            required={field.required}
                        ></textarea>
                        {#if field.maxLength}
                            <p class="text-xs text-slate-400 mt-1 text-left" dir="ltr">{(getFieldValue(field.key) || '').length}/{field.maxLength}</p>
                        {/if}

                    {:else if field.type === 'multi_select' && field.options}
                        {@const selected = (getFieldValue(field.key) || '').split(',').filter(Boolean)}
                        <div class="flex flex-wrap gap-2">
                            {#each field.options as opt}
                                {@const isOn = selected.includes(opt)}
                                <button
                                    type="button"
                                    onclick={() => {
                                        const current = (getFieldValue(field.key) || '').split(',').filter(Boolean);
                                        const idx = current.indexOf(opt);
                                        if (idx >= 0) current.splice(idx, 1);
                                        else current.push(opt);
                                        setFieldValue(field.key, current.join(','));
                                    }}
                                    class="px-4 py-2 rounded-full border-2 text-sm font-bold transition-all {isOn
                                        ? `${colors.btn} text-white border-transparent shadow-md`
                                        : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10 hover:border-white/30'}"
                                >
                                    {isOn ? '✓ ' : ''}{opt}
                                </button>
                            {/each}
                        </div>

                    {:else if field.type === 'availability_grid'}
                        {@const grid = (getFieldValue(field.key) || '').split(',').filter(Boolean)}
                        <div class="rounded-xl border border-white/15 bg-white/5 p-3 md:p-4">
                            <div class="grid gap-1.5" style="grid-template-columns: minmax(48px, auto) repeat(7, minmax(0, 1fr));">
                                <div class="text-xs md:text-sm font-bold text-pink-300 text-right pl-1 self-center">ימים</div>
                                {#each ['א','ב','ג','ד','ה','ו','ש'] as d}
                                    <div class="text-center font-bold text-pink-300 text-xs md:text-sm py-1">{d}</div>
                                {/each}
                                {#each ['בוקר','צהריים','ערב'] as slot, sIdx}
                                    <div class="text-gray-300 font-bold text-xs md:text-sm self-center text-right pl-1">{slot}</div>
                                    {#each ['א','ב','ג','ד','ה','ו','ש'] as _d, dIdx}
                                        {@const cellKey = `${dIdx}-${sIdx}`}
                                        {@const isOn = grid.includes(cellKey)}
                                        <button
                                            type="button"
                                            onclick={() => {
                                                const current = (getFieldValue(field.key) || '').split(',').filter(Boolean);
                                                const idx = current.indexOf(cellKey);
                                                if (idx >= 0) current.splice(idx, 1);
                                                else current.push(cellKey);
                                                setFieldValue(field.key, current.join(','));
                                            }}
                                            class="h-7 md:h-8 rounded-md border-2 transition-all flex items-center justify-center text-sm font-bold {isOn
                                                ? 'bg-pink-500/40 border-pink-400 text-white shadow-md shadow-pink-500/20'
                                                : 'bg-white/5 border-white/15 text-gray-600 hover:bg-white/10 hover:border-white/30'}"
                                            aria-label="{slot}"
                                        >
                                            {isOn ? '✓' : ''}
                                        </button>
                                    {/each}
                                {/each}
                            </div>
                            <p class="text-xs text-gray-400 mt-3 text-center">לחצו על המשבצות לסימון השעות שבהן אתם זמינים</p>
                        </div>

                    {:else if field.type === 'images'}
                        {@const imgs = getImages(field.key)}
                        <div class="rounded-xl border-2 border-amber-500/40 bg-amber-900/15 p-3 mb-3">
                            <p class="text-amber-200 text-sm font-bold leading-relaxed text-center">
                                ⚠️ התמונות חייבות להיות <span class="underline">הולמות וצנועות</span> בלבד.{#if categoryId !== 'restaurants'}<br />
                                משתמש שינסה להפר את הכללים - <span class="text-red-300 font-black">ייחסם לצמיתות</span>.{/if}
                            </p>
                        </div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-gray-400 text-xs">{imgs.length}/{MAX_IMAGES}</span>
                            {#if imgs.length > 1}
                                <span class="text-amber-300 text-[11px] font-bold">⭐ הראשונה היא התמונה הראשית</span>
                            {/if}
                        </div>
                        {#if imgs.length > 0}
                            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                                {#each imgs as src, i (i)}
                                    <div class="relative aspect-square rounded-xl overflow-hidden border-2 {i === 0 ? 'border-amber-400 shadow-lg shadow-amber-500/30' : 'border-white/10'}">
                                        <img src={src} alt="" class="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onclick={() => removeImageAt(field.key, i)}
                                            class="absolute top-1 left-1 bg-black/70 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                            aria-label="הסר תמונה"
                                        >×</button>
                                        {#if i === 0}
                                            <span class="absolute bottom-1 right-1 bg-amber-400 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">⭐ ראשית</span>
                                        {:else}
                                            <button
                                                type="button"
                                                onclick={() => setMainImage(field.key, i)}
                                                class="absolute bottom-1 right-1 bg-black/70 hover:bg-amber-500 text-white hover:text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors"
                                                aria-label="הפוך לתמונה ראשית"
                                            >סמן כראשית</button>
                                        {/if}
                                    </div>
                                {/each}
                                {#if imgs.length < MAX_IMAGES}
                                    <label class="flex flex-col items-center justify-center gap-1 aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/5 hover:bg-amber-900/10 cursor-pointer transition-all">
                                        <span class="text-2xl">＋</span>
                                        <span class="text-gray-500 text-[10px]">עוד</span>
                                        <input type="file" accept="image/*" multiple class="hidden" onchange={(e) => handleImagesChange(field.key, e)} />
                                    </label>
                                {/if}
                            </div>
                        {:else}
                            <label class="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/5 hover:bg-amber-900/10 cursor-pointer transition-all">
                                <span class="text-3xl">📷</span>
                                <span class="text-gray-300 text-sm font-bold">לחץ להעלאת תמונות</span>
                                <span class="text-gray-500 text-xs">JPG, PNG · עד {MAX_IMAGES}</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange={(e) => handleImagesChange(field.key, e)} />
                            </label>
                        {/if}

                    {:else if field.type === 'select' && field.options}
                        <select
                            id="field-{field.key}"
                            value={getFieldValue(field.key)}
                            onchange={(e) => setFieldValue(field.key, (e.target as HTMLSelectElement).value)}
                            class="{inputClass} cursor-pointer"
                            required={field.required}
                        >
                            <option value="">-- בחר --</option>
                            {#each field.options as opt}
                                <option value={opt}>{opt}</option>
                            {/each}
                        </select>

                    {:else if field.type === 'neighborhood_select'}
                        <select
                            id="field-{field.key}"
                            value={getFieldValue(field.key)}
                            onchange={(e) => setFieldValue(field.key, (e.target as HTMLSelectElement).value)}
                            class="{inputClass} cursor-pointer"
                            required={field.required}
                        >
                            {#each Object.entries(citiesAndNeighborhoods) as [cty, neighbs]}
                                <optgroup label={cty}>
                                    {#each neighbs as nb}
                                        <option value={nb} style="background:#fff;color:#0f172a;">{nb}</option>
                                    {/each}
                                </optgroup>
                            {/each}
                        </select>

                    {:else}
                        <input
                            id="field-{field.key}"
                            type={field.type}
                            value={getFieldValue(field.key)}
                            oninput={(e) => setFieldValue(field.key, (e.target as HTMLInputElement).value)}
                            placeholder={field.placeholder ?? ''}
                            class="{inputClass}"
                            required={field.required}
                            dir={field.type === 'tel' || field.type === 'email' ? 'ltr' : 'rtl'}
                        />
                    {/if}

                    {#if field.hint && field.type !== 'toggle'}
                        <p class="text-gray-300 text-sm mt-1">{field.hint}</p>
                    {/if}

                    {#if field.key === 'club_discount' && categoryId === 'restaurants'}
                        <a
                            href="/club-discounts"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1.5 mt-2 text-pink-300 hover:text-pink-200 text-sm font-bold underline underline-offset-2 transition-colors"
                        >
                            🎟️ כיצד להצטרף למעדון המסעדות של יוצאים לחירות
                        </a>
                    {/if}
                </div>
                {/if}
            {/each}

            <!-- Error -->
            {#if errorMsg}
                <div class="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3">
                    <p class="text-red-400 text-sm font-bold">{errorMsg}</p>
                </div>
            {/if}

            <!-- Submit -->
            <div class="col-span-2 flex flex-col gap-2">
                <button
                    type="submit"
                    disabled={submitting}
                    class="w-full rounded-xl px-6 py-4 font-black text-base transition-all shadow-lg
                        {submitting
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : `${colors.btn} text-white hover:scale-[1.02] shadow-${config.color}-500/20`}"
                >
                    {#if submitting}
                        <span class="inline-block w-5 h-5 border-2 border-gray-500 border-t-white rounded-full mr-2"
                              style="animation: spin 0.7s linear infinite; vertical-align: middle;"></span>
                        שומר...
                    {:else}
                        {#if categoryId !== 'restaurants'}{@html iconHtml()} {/if}פרסם
                    {/if}
                </button>
                <p class="text-gray-300 text-sm text-center">
                    {#if config.priceRow !== null}
                        {monthlyPrice} ₪ בחודש · התשלום בשלב הבא
                    {:else}
                        הפריט יופיע מיד
                    {/if}
                </p>
            </div>
        </form>
    {/if}
</div>

<style>
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.97); }
        to   { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
