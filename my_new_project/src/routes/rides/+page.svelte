<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type Direction = 'all' | 'driver' | 'passenger';
    let filter = $state<Direction>('all');

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
            : data.items.filter(i => getField(i.extra_fields, 'direction') === filter)
    );
</script>

<svelte:head>
    <title>לוח טרמפים | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🚗</span>
            <h1 class="text-3xl font-black text-white mb-2">לוח טרמפים</h1>
            <p class="text-gray-400">לוח ארצי — נסיעות משותפות בכל רחבי הארץ</p>
        </div>

        <div class="flex justify-center gap-2 mb-6">
            <button
                onclick={() => filter = 'all'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'all' ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🌍 הכל
            </button>
            <button
                onclick={() => filter = 'driver'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'driver' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🚙 מציעים טרמפ
            </button>
            <button
                onclick={() => filter = 'passenger'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {filter === 'passenger' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🙋 מחפשים טרמפ
            </button>
        </div>

        <div class="flex justify-center mb-6">
            <a
                href="/rides/add"
                class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-blue-500/25 transition-all hover:scale-105"
            >
                <span class="text-lg">➕</span>
                פרסם טרמפ חדש
            </a>
        </div>

        <div class="text-center mb-6">
            <p class="text-gray-500 text-sm">🚗 {filtered.length} טרמפים פעילים</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filtered as item}
                {@const direction = getField(item.extra_fields, 'direction')}
                {@const isDriver  = direction === 'driver'}
                {@const from      = getField(item.extra_fields, 'from')      || item.address}
                {@const to        = getField(item.extra_fields, 'to')        || ''}
                {@const date      = getField(item.extra_fields, 'date')      || ''}
                {@const time      = getField(item.extra_fields, 'time')      || ''}
                {@const seats     = getField(item.extra_fields, 'seats')     || ''}
                <div class="rounded-2xl bg-[#0f172a] border {isDriver ? 'border-green-500/30' : 'border-orange-500/30'} overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                    <div class="bg-gradient-to-r {isDriver ? 'from-green-600 to-teal-600' : 'from-orange-600 to-amber-500'} p-4 flex items-center gap-3">
                        <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                            {isDriver ? '🚙' : '🙋'}
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-white font-black text-lg">{item.label}</h3>
                            <p class="text-white/80 text-sm truncate">{isDriver ? 'מציע/ה טרמפ' : 'מחפש/ת טרמפ'}</p>
                        </div>
                    </div>
                    <div class="p-4">
                        {#if from || to}
                            <div class="flex items-center gap-2 text-gray-300 text-sm mb-2">
                                <span class="text-base">📍</span>
                                <span><strong>{from || '?'}</strong> ← <strong>{to || '?'}</strong></span>
                            </div>
                        {/if}
                        {#if date || time}
                            <div class="flex items-center gap-2 text-gray-300 text-sm mb-2">
                                <span class="text-base">🕒</span>
                                <span>{date} {time}</span>
                            </div>
                        {/if}
                        {#if seats}
                            <div class="flex items-center gap-2 text-gray-300 text-sm mb-3">
                                <span class="text-base">💺</span>
                                <span>{seats} מקומות</span>
                            </div>
                        {/if}
                        {#if item.description}
                            <p class="text-gray-300 text-sm leading-relaxed mb-4">{item.description}</p>
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
                <span class="text-5xl mb-4 block">🚗</span>
                <p class="text-gray-400 text-lg">אין טרמפים בקטגוריה זו כרגע</p>
                <p class="text-gray-500 text-sm mt-2">היה הראשון לפרסם!</p>
            </div>
        {/if}

        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
