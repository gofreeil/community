<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    let { item } = data;

    function getType(ef: string): 'lost' | 'found' {
        try { return JSON.parse(ef)?.type === 'lost' ? 'lost' : 'found'; }
        catch { return 'found'; }
    }

    function getImage(ef: string): string {
        try { return JSON.parse(ef)?.image ?? ''; }
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

    const type  = $derived(getType(item.extra_fields));
    const image = $derived(getImage(item.extra_fields));
</script>

<svelte:head>
    <title>{item.label} | אבדות ומציאות</title>
</svelte:head>

<div class="max-w-lg mx-auto px-4 py-8" dir="rtl">

    <!-- Back -->
    <a href="/lost-and-found" class="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors mb-6">
        ← חזרה לכל המודעות
    </a>

    <div class="bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

        <!-- Image -->
        {#if image}
            <div class="relative w-full h-56">
                <img src={image} alt={item.label} class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-t from-[#1e293b]/80 to-transparent"></div>
            </div>
        {/if}

        <!-- Type badge -->
        <div class="px-6 {image ? 'pt-4' : 'pt-6'} flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider
                {type === 'found' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}">
                {type === 'found' ? '✅ נמצא' : '❓ אבד'}
            </span>
            {#if item.created_at}
                <span class="text-gray-500 text-xs">🕒 {formatDate(item.created_at)}</span>
            {/if}
        </div>

        <!-- Content -->
        <div class="px-6 py-4 space-y-4">
            <h1 class="text-2xl font-black text-white leading-tight">{item.label}</h1>

            {#if item.description}
                <p class="text-gray-300 text-sm leading-relaxed">
                    {item.description.replace(/^(❓ אבד|✅ נמצא) \| /, '')}
                </p>
            {/if}

            <div class="space-y-2 text-sm text-gray-400">
                {#if item.address}
                    <div class="flex items-center gap-2">
                        <span>📍</span>
                        <span>{item.address}</span>
                    </div>
                {/if}
                {#if item.contact}
                    <div class="flex items-center gap-2">
                        <span>👤</span>
                        <span>{item.contact}</span>
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            {#if item.phone}
                <div class="flex gap-2 pt-2">
                    <a href="tel:{item.phone}"
                        class="flex-1 text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all shadow-lg">
                        📞 {item.phone}
                    </a>
                    <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer"
                        class="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-sm transition-all shadow-lg">
                        💬
                    </a>
                </div>
            {/if}
        </div>
    </div>
</div>
