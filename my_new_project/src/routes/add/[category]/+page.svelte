<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { LS_KEY, DEFAULT_NEIGHBORHOOD } from '$lib/neighborhoodsData';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // Server-rendered static data — safe to access directly
    const { categoryId, config } = data;

    // ---- Neighborhood from localStorage ----
    let neighborhood = $state(DEFAULT_NEIGHBORHOOD);
    let city         = $state('ירושלים');

    onMount(() => {
        if (!browser) return;
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.neighborhood) neighborhood = parsed.neighborhood;
                if (parsed.city)         city         = parsed.city;
            }
        } catch {}
    });

    // ---- Form state ----
    // Build a flat record of key → value
    let formValues = $state<Record<string, string>>(
        Object.fromEntries(data.config.fields.map(f => [f.key, '']))
    );

    // label and description/phone/address are always top-level
    let submitting = $state(false);
    let errorMsg   = $state('');
    let submitted  = $state(false);

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

    // ---- Submit ----
    async function handleSubmit(e: Event) {
        e.preventDefault();
        errorMsg = '';
        const err = validate();
        if (err) { errorMsg = err; return; }

        submitting = true;

        // Separate known top-level fields from extra_fields
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

        // label fallback: some categories use a different key as the main title
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

            // ---- הצלחה ----
            submitted = true;

            if (config.priceRow !== null) {
                // יש תשלום — שמור ב-localStorage והפנה לדף המחירון
                if (browser) {
                    localStorage.setItem('pending_ad', JSON.stringify({
                        priceRow:     config.priceRow,
                        categoryLabel: config.label,
                        itemLabel:    topLevel.label,
                        itemId:       result.id,
                    }));
                }
                setTimeout(() => goto('/advertise'), 1500);
            } else {
                // חינמי — הצג הודעה וחזור לדף הבית אחרי 2 שניות
                setTimeout(() => goto('/'), 2500);
            }

        } catch {
            errorMsg = 'בעיית תקשורת — נסה שוב';
            submitting = false;
        }
    }

    // Colors map for styling
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

<div class="max-w-2xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    <!-- Back -->
    <button
        type="button"
        onclick={() => history.back()}
        class="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1.5 transition-colors"
    >
        ← חזרה
    </button>

    <!-- Header -->
    <div class="text-center mb-8">
        <div class="text-5xl mb-3">{config.icon}</div>
        <h1 class="text-2xl md:text-3xl font-black text-white mb-2">
            הוסף {config.label}
        </h1>
        <p class="text-gray-400 text-sm">
            שכונה: <span class="{colors.text} font-bold">{neighborhood}</span>
            {#if city} · {city}{/if}
        </p>
        {#if config.priceRow !== null}
            <div class="mt-3 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-amber-400">
                💳 לאחר השליחה תועבר לדף התשלום
            </div>
        {:else}
            <div class="mt-3 inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-green-400">
                ✅ שירות חינמי — ללא תשלום
            </div>
        {/if}
    </div>

    {#if submitted}
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
            class="rounded-2xl border {colors.border} {colors.bg} p-6 md:p-8 space-y-5"
        >
            {#each config.fields as field}
                <div>
                    <label
                        for="field-{field.key}"
                        class="block text-sm font-bold text-gray-300 mb-1.5"
                    >
                        {field.label}
                        {#if field.required}
                            <span class="text-red-400">*</span>
                        {/if}
                    </label>

                    {#if field.type === 'textarea'}
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
                        <p class="text-gray-600 text-xs mt-1">{field.hint}</p>
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
                    {config.icon} שלח ועבור לתשלום ←
                {:else}
                    {config.icon} הוסף לשכונה ✓
                {/if}
            </button>

            <p class="text-gray-600 text-xs text-center">
                הפריט יופיע מיד לאחר השמירה
                {#if config.priceRow !== null}· ניתן לתשלום בשלב הבא{/if}
            </p>
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
