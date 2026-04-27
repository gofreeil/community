<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type JobType = 'all' | 'offering' | 'seeking';
    let filter = $state<JobType>('all');

    function getField(extraFields: string, key: string): string {
        try { return JSON.parse(extraFields)?.[key] ?? ''; }
        catch { return ''; }
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    let filtered = $derived(
        filter === 'all'
            ? data.items
            : data.items.filter(i => getField(i.extra_fields, 'job_type') === filter)
    );
</script>

<svelte:head>
    <title>לוח דורשים לעבודה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">💼</span>
            <h1 class="text-3xl font-black text-white mb-2">לוח דורשים לעבודה</h1>
            <p class="text-gray-400">לוח ארצי — הצעות עבודה ובקשות תעסוקה</p>
        </div>

        <div class="flex justify-center gap-2 mb-6">
            <button
                onclick={() => filter = 'all'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'all' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🌍 הכל
            </button>
            <button
                onclick={() => filter = 'offering'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'offering' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                💼 דרושים
            </button>
            <button
                onclick={() => filter = 'seeking'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'seeking' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                👤 מחפשים עבודה
            </button>
        </div>

        <div class="flex justify-center mb-6">
            <a
                href="/jobs/add"
                class="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-indigo-500/25 transition-all hover:scale-105"
            >
                <span class="text-lg">➕</span>
                פרסם מודעה חדשה
            </a>
        </div>

        <div class="text-center mb-6">
            <p class="text-gray-500 text-sm">💼 {filtered.length} מודעות פעילות</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filtered as item}
                {@const jobType = getField(item.extra_fields, 'job_type')}
                {@const isOffering = jobType === 'offering'}
                {@const salary = getField(item.extra_fields, 'salary')}
                {@const hours  = getField(item.extra_fields, 'hours')}
                <div class="rounded-2xl bg-[#0f172a] border {isOffering ? 'border-emerald-500/30' : 'border-violet-500/30'} overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                    <div class="bg-gradient-to-r {isOffering ? 'from-emerald-600 to-teal-600' : 'from-violet-600 to-purple-600'} p-4 flex items-center gap-3">
                        <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                            {isOffering ? '💼' : '👤'}
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-white font-black text-lg truncate">{item.label}</h3>
                            <p class="text-white/80 text-sm">{isOffering ? 'דרוש/ה' : 'מחפש/ת עבודה'}</p>
                        </div>
                    </div>
                    <div class="p-4">
                        {#if item.description}
                            <p class="text-gray-300 text-sm leading-relaxed mb-3">{item.description}</p>
                        {/if}
                        {#if item.address}
                            <div class="flex items-center gap-2 text-gray-300 text-sm mb-1">
                                <span class="text-base">📍</span>
                                <span>{item.address}</span>
                            </div>
                        {/if}
                        {#if hours}
                            <div class="flex items-center gap-2 text-gray-300 text-sm mb-1">
                                <span class="text-base">🕒</span>
                                <span>{hours}</span>
                            </div>
                        {/if}
                        {#if salary}
                            <div class="flex items-center gap-2 text-gray-300 text-sm mb-3">
                                <span class="text-base">💰</span>
                                <span>{salary}</span>
                            </div>
                        {/if}
                        {#if item.contact}
                            <p class="text-gray-400 text-sm mb-3">איש קשר: <strong class="text-white">{item.contact}</strong></p>
                        {/if}
                        {#if item.phone}
                            <div class="flex gap-2">
                                <a
                                    href={waLink(item.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                                >
                                    💬 WhatsApp
                                </a>
                                <a
                                    href="tel:{item.phone}"
                                    class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                                >
                                    📞 התקשר
                                </a>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        {#if filtered.length === 0}
            <div class="text-center py-16">
                <span class="text-5xl mb-4 block">💼</span>
                <p class="text-gray-400 text-lg">אין מודעות בקטגוריה זו כרגע</p>
                <p class="text-gray-500 text-sm mt-2">היה הראשון לפרסם!</p>
            </div>
        {/if}

        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
