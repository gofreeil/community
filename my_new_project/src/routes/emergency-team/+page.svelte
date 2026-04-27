<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    function getRole(extraFields: string): string {
        try { return JSON.parse(extraFields)?.role ?? 'חבר'; }
        catch { return 'חבר'; }
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }
</script>

<svelte:head>
    <title>כיתת כוננות{data.currentNeighborhood ? ` — ${data.currentNeighborhood}` : ''} | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-3xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🚨</span>
            <h1 class="text-3xl font-black text-white mb-2">כיתת כוננות</h1>
            {#if data.currentNeighborhood}
                <p class="text-gray-400">שכונה: <strong class="text-white">{data.currentNeighborhood}</strong></p>
            {/if}
            <p class="text-gray-500 text-sm mt-2">{data.members.length} חברים פעילים</p>
        </div>

        {#if data.members.length === 0}
            <div class="rounded-2xl bg-[#0f172a] border border-white/10 p-8 text-center">
                <span class="text-5xl mb-3 block">🚨</span>
                <h2 class="text-white text-lg font-bold mb-2">אין כיתת כוננות פעילה בשכונה</h2>
                <p class="text-gray-400 text-sm">פנה לרכז השכונה כדי להקים כיתה</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each data.members as m}
                    {@const role = getRole(m.extra_fields)}
                    <div class="rounded-2xl bg-[#0f172a] border border-red-500/20 p-4">
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-red-500/40 to-orange-500/40 flex items-center justify-center text-2xl flex-shrink-0">🚨</div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-white font-bold truncate">{m.label}</h3>
                                <span class="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{role}</span>
                            </div>
                        </div>
                        {#if m.description}
                            <p class="text-gray-400 text-sm mb-3">{m.description}</p>
                        {/if}
                        <div class="flex gap-2">
                            <a
                                href={waLink(m.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-colors text-sm"
                            >
                                💬 WhatsApp
                            </a>
                            <a
                                href="tel:{m.phone}"
                                class="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"
                            >
                                📞 {m.phone}
                            </a>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
