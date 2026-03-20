<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type LafType = 'all' | 'lost' | 'found';
    let filter = $state<LafType>('all');

    function getItemType(extraFields: string): 'lost' | 'found' {
        try {
            const ef = JSON.parse(extraFields);
            return ef.type === 'lost' ? 'lost' : 'found';
        } catch {
            return 'found';
        }
    }

    function getItemImage(extraFields: string): string {
        try { return JSON.parse(extraFields)?.image ?? ''; }
        catch { return ''; }
    }

    function formatDate(iso: string): string {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return 'עכשיו';
        if (mins < 60) return `לפני ${mins} דק'`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `לפני ${hours} שע'`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'אתמול';
        return `לפני ${days} ימים`;
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    let filtered = $derived(
        filter === 'all'
            ? data.items
            : data.items.filter(i => getItemType(i.extra_fields) === filter)
    );
</script>

<svelte:head>
    <title>אבדות ומציאות | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-8" dir="rtl">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2">
                🔍 אבדות ומציאות
            </h1>
            <p class="text-gray-400 text-sm mt-0.5">{data.items.length} מודעות פעילות</p>
        </div>
        <a
            href="/lost-and-found/add"
            class="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg"
        >
            + הוסף מודעה
        </a>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-6">
        {#each [
            { value: 'all',   label: '🔍 הכל',    count: data.items.length },
            { value: 'lost',  label: '❓ אבד',     count: data.items.filter(i => getItemType(i.extra_fields) === 'lost').length },
            { value: 'found', label: '✅ נמצא',    count: data.items.filter(i => getItemType(i.extra_fields) === 'found').length },
        ] as tab}
            <button
                onclick={() => filter = tab.value as LafType}
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border
                    {filter === tab.value
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}"
            >
                {tab.label}
                <span class="text-xs opacity-70">({tab.count})</span>
            </button>
        {/each}
    </div>

    <!-- Items list -->
    {#if filtered.length === 0}
        <div class="text-center py-16 text-gray-500">
            <div class="text-5xl mb-3">🔍</div>
            <p class="font-bold text-lg text-gray-400">אין מודעות עדיין</p>
            <p class="text-sm mt-1">היה הראשון להוסיף!</p>
            <a href="/lost-and-found/add"
               class="mt-4 inline-block bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                + הוסף מודעה
            </a>
        </div>
    {:else}
        <div class="space-y-3">
            {#each filtered as item}
                {@const type  = getItemType(item.extra_fields)}
                {@const image = getItemImage(item.extra_fields)}
                <div class="relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/8 transition-all">
                    {#if image}
                        <div class="relative w-full h-40">
                            <img src={image} alt={item.label} class="w-full h-full object-cover" />
                            <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 to-transparent"></div>
                        </div>
                    {/if}

                    <!-- Type badge -->
                    <div class="absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-bl-xl
                        {type === 'found' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">
                        {type === 'found' ? '✅ נמצא' : '❓ אבד'}
                    </div>

                    <div class="p-4 {image ? '' : 'mt-3'}">
                        <h3 class="font-black text-white text-base mb-2 leading-tight">{item.label}</h3>

                        {#if item.description}
                            <p class="text-gray-400 text-sm mb-2 leading-snug">{item.description.replace(/^(❓ אבד|✅ נמצא) \| /, '')}</p>
                        {/if}

                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                            {#if item.address}
                                <span>📍 {item.address}</span>
                            {/if}
                            {#if item.contact}
                                <span>👤 {item.contact}</span>
                            {/if}
                            {#if item.created_at}
                                <span>🕒 {formatDate(item.created_at)}</span>
                            {/if}
                        </div>

                        {#if item.phone}
                            <div class="flex gap-2">
                                <a
                                    href="tel:{item.phone}"
                                    class="flex-1 text-center py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm font-bold transition-all border border-blue-500/30"
                                >
                                    📞 {item.phone}
                                </a>
                                <a
                                    href={waLink(item.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white text-sm font-bold transition-all border border-green-500/30"
                                >
                                    💬
                                </a>
                            </div>
                        {:else}
                            <div class="py-2 rounded-xl bg-white/5 text-gray-500 text-sm text-center border border-white/10">
                                אין פרטי קשר
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Back -->
    <div class="text-center mt-8">
        <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← חזרה לדף הראשי
        </a>
    </div>
</div>
