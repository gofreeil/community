<script lang="ts">
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();
    let role = $state<'courier' | 'sender'>('courier');
</script>

<svelte:head>
    <title>פרסום מסירת חבילה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">📦</span>
            <h1 class="text-3xl font-black text-white mb-2">פרסום מודעת מסירה</h1>
            <p class="text-gray-400">בחר אם אתה נהג מתנדב או מוסר חבילה</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-red-900/30 border border-red-500/30 p-4 mb-4 text-center">
                <p class="text-red-200 mb-2">יש להתחבר כדי לפרסם</p>
                <a href="/login?redirect=/deliveries/add" class="inline-block bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold">התחברות</a>
            </div>
        {:else}
            <form method="POST" class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-4">
                <!-- Role -->
                <div class="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onclick={() => role = 'courier'}
                        class="px-4 py-3 rounded-xl text-sm font-bold transition-all {role === 'courier' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                    >🚚 נהג מתנדב</button>
                    <button
                        type="button"
                        onclick={() => role = 'sender'}
                        class="px-4 py-3 rounded-xl text-sm font-bold transition-all {role === 'sender' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                    >📦 מוסר חבילה</button>
                    <input type="hidden" name="role" value={role} />
                </div>

                <p class="text-gray-400 text-xs text-center">
                    {role === 'courier'
                        ? 'סמן את המסלול שלך — אנשים יוכלו לבקש שתעביר חבילה בדרך, בחסד.'
                        : 'תאר את החבילה ולאן צריך להעביר אותה — נהג בדרך יוכל לקחת אותה.'}
                </p>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="from" class="text-white text-sm font-bold mb-1 block">מאיפה</label>
                        <input id="from" name="from" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="to" class="text-white text-sm font-bold mb-1 block">לאן</label>
                        <input id="to" name="to" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                {#if role === 'sender'}
                    <div>
                        <label for="item" class="text-white text-sm font-bold mb-1 block">מה החבילה?</label>
                        <input id="item" name="item" placeholder="מעטפה, קופסה קטנה, תיק..." class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                {/if}

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="date" class="text-white text-sm font-bold mb-1 block">תאריך</label>
                        <input id="date" name="date" type="date" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="time" class="text-white text-sm font-bold mb-1 block">שעה</label>
                        <input id="time" name="time" type="time" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <div>
                    <label for="description" class="text-white text-sm font-bold mb-1 block">פירוט נוסף</label>
                    <textarea id="description" name="description" rows="3" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="contact" class="text-white text-sm font-bold mb-1 block">שם ליצירת קשר</label>
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

                <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                    פרסם מודעה
                </button>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="/deliveries" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה ללוח המסירות</a>
        </div>
    </div>
</div>
