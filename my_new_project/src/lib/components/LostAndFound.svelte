<script lang="ts">
    import { triggerAdPopup } from '$lib/adPopupStore';

    interface LafItem {
        id: string;
        label: string;
        address: string;
        phone: string;
        contact: string;
        extra_fields: string;
        created_at: string;
    }

    interface Props {
        items?: LafItem[];
    }

    let { items = [] }: Props = $props();

    const mockItems: LafItem[] = [
        { id: 'm1', label: 'מצאתי צרור מפתחות', address: "רחוב המלך ג'ורג'", extra_fields: '{"type":"found"}', phone: '', contact: '', created_at: '' },
        { id: 'm2', label: 'אבד כלב מסוג פודל',  address: 'שכונת רחביה',         extra_fields: '{"type":"lost"}',  phone: '', contact: '', created_at: '' },
        { id: 'm3', label: 'נמצא כרטיס רב-קו',   address: 'תחנה מרכזית',          extra_fields: '{"type":"found"}', phone: '', contact: '', created_at: '' },
    ];

    let displayItems = $derived(items.length > 0 ? items : mockItems);
    let isMock       = $derived(items.length === 0);

    function getType(ef: string): 'lost' | 'found' {
        try { return JSON.parse(ef)?.type === 'lost' ? 'lost' : 'found'; }
        catch { return 'found'; }
    }

    function formatDate(iso: string): string {
        if (!iso) return '';
        const diff  = Date.now() - new Date(iso).getTime();
        const mins  = Math.floor(diff / 60000);
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
</script>

<div
    class="rounded-2xl md:rounded-3xl bg-[#0f172a] border md:border-2 border-blue-500/30 overflow-hidden shadow-2xl flex flex-col h-full"
>
    <div
        class="bg-gradient-to-r from-blue-600 to-purple-600 p-2 md:p-4 flex items-center justify-between flex-shrink-0 h-12 md:h-auto"
    >
        <h3 class="text-sm font-bold text-white flex items-center gap-1 md:gap-2">
            <span class="text-base">🔍</span>
            אבדות ומציאות
        </h3>
        <a
            href="/lost-and-found/add"
            class="inline-flex items-center self-center bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full transition-colors border border-white/20 flex-shrink-0"
        >
            + הוסף
        </a>
    </div>

    <div class="p-2 flex-1 overflow-hidden">
        <!-- Mobile: show up to 3 items -->
        <div class="md:hidden space-y-2">
            {#each displayItems.slice(0, 3) as item}
                {@const type = getType(item.extra_fields)}
                <a
                    href={isMock ? '/lost-and-found' : `/lost-and-found/${item.id}`}
                    class="relative p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all group overflow-hidden cursor-pointer block no-underline"
                >
                    <!-- Type Badge -->
                    <div
                        class="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider {type === 'found'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'} rounded-br"
                    >
                        {type === 'found' ? 'נמצא' : 'אבד'}
                    </div>

                    <div class="mt-2">
                        <h4
                            class="font-bold text-white text-xs mb-1 group-hover:text-blue-400 transition-colors leading-tight"
                        >
                            {item.label}
                        </h4>
                        <div class="flex items-center gap-1.5 text-xs text-gray-400">
                            {#if item.address}<span>📍 {item.address}</span>{/if}
                            {#if item.created_at}<span>•</span><span>🕒 {formatDate(item.created_at)}</span>{/if}
                        </div>
                        {#if !isMock && item.phone}
                            <a
                                href="tel:{item.phone}"
                                class="mt-1.5 flex items-center gap-1 text-[10px] text-blue-400 font-bold"
                                onclick={(e) => e.stopPropagation()}
                            >
                                📞 {item.phone}
                            </a>
                        {/if}
                    </div>
                </a>
            {/each}
        </div>

        <!-- Desktop: show up to 3 items + link -->
        <div class="hidden md:flex flex-col justify-evenly h-full">
            {#each displayItems.slice(0, 3) as item}
                {@const type = getType(item.extra_fields)}
                <a
                    href={isMock ? '/lost-and-found' : `/lost-and-found/${item.id}`}
                    class="relative p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group overflow-hidden block no-underline cursor-pointer"
                >
                    <!-- Type Badge -->
                    <div
                        class="absolute top-0 left-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider {type === 'found'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'} rounded-br-lg"
                    >
                        {type === 'found' ? 'נמצא' : 'אבד'}
                    </div>

                    <div class="mt-3">
                        <h4 class="font-bold text-white text-xs group-hover:text-blue-400 transition-colors leading-tight">
                            {item.label}
                        </h4>
                        {#if item.address}
                            <span class="text-[10px] text-gray-400">📍 {item.address}</span>
                        {/if}
                    </div>
                </a>
            {/each}
            <a
                href="/lost-and-found"
                class="block text-center text-blue-400 hover:text-white text-xs font-bold transition-colors underline underline-offset-2 py-2"
            >
                ללוח המלא...
            </a>
        </div>

        <!-- Mobile link -->
        <div class="mt-2 md:hidden text-center">
            <a
                href="/lost-and-found"
                class="text-blue-400 hover:text-white text-[10px] font-bold transition-colors underline underline-offset-2"
            >
                ללוח המלא...
            </a>
        </div>
    </div>
</div>
