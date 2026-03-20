<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';

    let { form }: { form: ActionData } = $props();

    let type        = $state<'lost' | 'found' | ''>('');
    let submitting  = $state(false);
</script>

<svelte:head>
    <title>הוסף אבדה או מציאה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen flex items-start justify-center pt-8 pb-16 px-4" dir="rtl">
    <div class="w-full max-w-lg">

        <!-- Header -->
        <div class="text-center mb-8">
            <div class="text-5xl mb-3">🔍</div>
            <h1 class="text-2xl font-black text-white mb-1">אבדות ומציאות</h1>
            <p class="text-gray-400 text-sm">מלא את הפרטים ונפרסם עבורך בקהילה</p>
        </div>

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

                <!-- Location -->
                <div>
                    <label for="laf-location" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        מיקום *
                    </label>
                    <input
                        id="laf-location"
                        name="location"
                        type="text"
                        required
                        placeholder="רחוב, שכונה, עיר..."
                        class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                    />
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
    </div>
</div>
