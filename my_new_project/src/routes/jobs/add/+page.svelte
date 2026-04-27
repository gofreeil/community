<script lang="ts">
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();
    let job_type = $state<'offering' | 'seeking'>('offering');
</script>

<svelte:head>
    <title>פרסום מודעת עבודה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">💼</span>
            <h1 class="text-3xl font-black text-white mb-2">פרסום מודעת עבודה</h1>
            <p class="text-gray-400">בחר אם אתה מציע משרה או מחפש עבודה</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-red-900/30 border border-red-500/30 p-4 mb-4 text-center">
                <p class="text-red-200 mb-2">יש להתחבר כדי לפרסם</p>
                <a href="/login?redirect=/jobs/add" class="inline-block bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold">התחברות</a>
            </div>
        {:else}
            <form method="POST" class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-4">
                <div class="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onclick={() => job_type = 'offering'}
                        class="px-4 py-3 rounded-xl text-sm font-bold transition-all {job_type === 'offering' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                    >💼 דרוש/ה</button>
                    <button
                        type="button"
                        onclick={() => job_type = 'seeking'}
                        class="px-4 py-3 rounded-xl text-sm font-bold transition-all {job_type === 'seeking' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                    >👤 מחפש/ת עבודה</button>
                    <input type="hidden" name="job_type" value={job_type} />
                </div>

                <div>
                    <label for="title" class="text-white text-sm font-bold mb-1 block">כותרת *</label>
                    <input id="title" name="title" required placeholder={job_type === 'offering' ? 'לדוגמה: דרוש/ה מזכיר/ה' : 'לדוגמה: מחפש/ת עבודה כסייע/ת'} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                </div>

                <div>
                    <label for="description" class="text-white text-sm font-bold mb-1 block">תיאור</label>
                    <textarea id="description" name="description" rows="4" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="address" class="text-white text-sm font-bold mb-1 block">מיקום</label>
                        <input id="address" name="address" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="hours" class="text-white text-sm font-bold mb-1 block">שעות</label>
                        <input id="hours" name="hours" placeholder="לדוגמה: 9:00-17:00" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <div>
                    <label for="salary" class="text-white text-sm font-bold mb-1 block">שכר / תנאים</label>
                    <input id="salary" name="salary" placeholder="לדוגמה: 50 ₪/שעה" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="contact" class="text-white text-sm font-bold mb-1 block">שם איש קשר</label>
                        <input id="contact" name="contact" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="phone" class="text-white text-sm font-bold mb-1 block">טלפון *</label>
                        <input id="phone" name="phone" type="tel" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                {#if form?.error}
                    <p class="text-red-400 text-sm text-center">{form.error}</p>
                {/if}

                <button type="submit" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                    פרסם מודעה
                </button>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="/jobs" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה ללוח עבודה</a>
        </div>
    </div>
</div>
