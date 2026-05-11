<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { LS_KEY, DEFAULT_NEIGHBORHOOD } from '$lib/neighborhoodsData';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const { categoryId, config, userId, userProfile } = data;

    const DRAFT_KEY = `add_draft_${categoryId}`;

    // Helper: מחזיר HTML לאיקון — תמונה אם src, אמוגי אם לא
    const iconHtml = (size: 'lg' | 'sm' = 'sm') =>
        config.icon?.startsWith('/')
            ? `<img src="${config.icon}" class="${size === 'lg' ? 'w-28 h-28 mx-auto' : 'w-5 h-5 inline-block align-middle'}" alt="${config.label}" />`
            : config.icon ?? '';

    // ---- Neighborhood — מתמלא מיד מהפרופיל ----
    let neighborhood = $state(userProfile?.neighborhood || DEFAULT_NEIGHBORHOOD);
    let city         = $state(userProfile?.city         || 'ירושלים');

    // ---- ערכי ברירת מחדל לשדות מפרופיל המשתמש ----
    function profileDefault(key: string, type: string, options?: string[], defaultVal?: string): string {
        if (type === 'toggle' && options) return options[0];
        if (key === 'contact' && userProfile?.nickname) return userProfile.nickname;
        if (key === 'phone'   && userProfile?.phone)    return userProfile.phone;
        if (key === 'address') {
            const parts = [userProfile?.neighborhood, userProfile?.city].filter(Boolean);
            if (parts.length) return parts.join(', ');
        }
        if (defaultVal) return defaultVal;
        return '';
    }

    // ---- Form state — מתמלא מיד מהפרופיל ללא המתנה ל-onMount ----
    let formValues = $state<Record<string, string>>(
        Object.fromEntries(config.fields.map(f => [f.key, profileDefault(f.key, f.type, f.options, f.default)]))
    );

    let submitting      = $state(false);
    let errorMsg        = $state('');
    let submitted       = $state(false);
    let redirectingMsg  = $state(''); // הודעה לפני מעבר להרשמה

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

    // ---- Validation ----
    function validate(): string | null {
        for (const field of config.fields) {
            if (field.required && !formValues[field.key]?.trim()) {
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

        // אם לא מחובר — שמור טיוטא והפנה להרשמה
        if (!userId) {
            saveDraft();
            redirectingMsg = 'הטיוטה שלך נשמרה ✓\nאתה מועבר להרשמה — הפרסום יושלם מיד לאחריה.';
            setTimeout(() => {
                goto(`/login?redirect=/add/${categoryId}`);
            }, 2200);
            return;
        }

        submitting = true;

        const topLevelKeys = ['label', 'description', 'contact', 'phone', 'address'];
        const topLevel: Record<string, string> = {};
        const extra: Record<string, string> = {};

        for (const [k, v] of Object.entries(formValues)) {
            if (topLevelKeys.includes(k)) {
                topLevel[k] = v;
            } else {
                extra[k] = v;
            }
        }

        if (!topLevel.label) {
            const labelField = config.fields.find(f => f.key === 'label');
            topLevel.label = extra[labelField?.key ?? ''] ?? config.label;
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
                        priceRow:      config.priceRow,
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
            errorMsg = 'בעיית תקשורת — נסה שוב';
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
    <title>הוסף {config.label} | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-4 md:py-6" dir="rtl">

    <!-- Header -->
    <div class="text-center mb-4">
        <div class="-mb-2">{@html iconHtml('lg')}</div>
        <div class="relative flex items-center justify-center">
            <h1 class="text-2xl md:text-3xl font-black text-white mb-2">
                הוסף {config.label}
            </h1>
            <button
                type="button"
                onclick={() => history.back()}
                class="absolute right-0 top-0 text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
            >
                ← חזרה
            </button>
        </div>
        {#if config.priceRow !== null}
            <div class="mt-3 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-amber-400">
                💳 לאחר השליחה תועבר לדף התשלום
            </div>
        {/if}
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
            <h2 class="text-xl font-black text-green-300 mb-2">נשמר בהצלחה!</h2>
            {#if config.priceRow !== null}
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
                        <div class="flex rounded-xl overflow-hidden border border-white/15 max-w-xs mx-auto">
                            {#each field.options as opt}
                                <button
                                    type="button"
                                    onclick={() => setFieldValue(field.key, opt)}
                                    class="flex-1 py-3 text-sm font-bold transition-all {getFieldValue(field.key) === opt
                                        ? `${colors.btn} text-white`
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}"
                                >
                                    {opt}
                                </button>
                            {/each}
                        </div>

                    {:else if field.type === 'textarea'}
                        <textarea
                            id="field-{field.key}"
                            value={getFieldValue(field.key)}
                            oninput={(e) => setFieldValue(field.key, (e.target as HTMLTextAreaElement).value)}
                            placeholder={field.placeholder ?? ''}
                            rows="3"
                            class="{inputClass} resize-none"
                            required={field.required}
                        ></textarea>

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

                    {#if field.hint}
                        <p class="text-gray-300 text-sm mt-1">{field.hint}</p>
                    {/if}
                </div>
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
                    {:else if config.priceRow !== null}
                        {@html iconHtml()} שלח ועבור לתשלום ←
                    {:else}
                        {@html iconHtml()} הוסף לשכונה ✓
                    {/if}
                </button>
                <p class="text-gray-300 text-sm text-center">
                    הפריט יופיע מיד
                    {#if config.priceRow !== null}· ניתן לתשלום בשלב הבא{/if}
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
