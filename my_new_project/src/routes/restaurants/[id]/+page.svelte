<script lang="ts">
    import RestaurantReviewsModal from '$lib/components/RestaurantReviewsModal.svelte';
    import { getRatingSummary } from '$lib/restaurantReviews';
    import { formatOpeningHours } from '$lib/openingHours';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    let item = $derived(data.item);
    let E = $derived(item.extra as Record<string, unknown>);

    function str(v: unknown): string {
        return Array.isArray(v) ? v.join(', ') : String(v ?? '');
    }
    function list(v: unknown): string[] {
        if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
        return String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    }

    let venueType   = $derived(str(E.venue_type) || 'מסעדה');
    let foodType    = $derived(str(E.food_type));
    let priceRange  = $derived(str(E.price_range));
    let kosher      = $derived(str(E.kosher) === 'אחר' ? (str(E.kosher_other) || 'אחר') : str(E.kosher));
    let meatDairy   = $derived(str(E.meat_dairy));
    let service     = $derived(list(E.service));
    let deliveryBy  = $derived(list(E.delivery_by));
    let amenities   = $derived(list(E.amenities));
    let parking     = $derived(str(E.parking));
    let parkingNotes = $derived(str(E.parking_notes));
    let clubDiscount = $derived(str(E.club_discount) === 'יש הנחה');
    let clubDetail  = $derived(str(E.club_discount_detail));
    let hours       = $derived(formatOpeningHours(E.hours));
    let wazeLink    = $derived(str(E.waze_link));
    let gmapsLink   = $derived(str(E.gmaps_link));
    let transport   = $derived(str(E.transport));
    let facebook    = $derived(str(E.facebook));
    let instagram   = $derived(str(E.instagram));
    let customLabel = $derived(str(E.custom_link_label));
    let customUrl   = $derived(str(E.custom_link_url));
    let images      = $derived(list(E.images));
    let menuImages  = $derived(list(E.menu_images));
    let mainImage   = $derived(images[0] ?? '');

    let hasDelivery = $derived(service.includes('משלוחים'));
    let hasSeating  = $derived(service.includes('ישיבה במקום'));

    let summary = $derived(getRatingSummary(item.id));

    let reviewsOpen = $state(false);
    let lightbox = $state<string | null>(null);

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }
</script>

<svelte:head>
    <title>{item.label} | מזון ומסעדות - קהילה בשכונה</title>
    <meta name="description" content={item.description || `${item.label} - ${foodType}`} />
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-3xl mx-auto">

        <a href="/national/restaurants" class="inline-block text-gray-500 hover:text-white text-sm mb-4 transition-colors">
            → חזרה ללוח המסעדות
        </a>

        <!-- ===== Hero ===== -->
        <div class="relative overflow-hidden rounded-3xl mb-6">
            {#if mainImage}
                <img src={mainImage} alt={item.label} class="absolute inset-0 w-full h-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/45"></div>
            {:else}
                <div class="absolute inset-0 bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 opacity-95"></div>
            {/if}
            <div class="relative px-6 py-8 text-center">
                {#if !mainImage}
                    <div class="text-6xl mb-3">{item.icon}</div>
                {/if}
                <h1 class="text-3xl md:text-4xl font-black text-white mb-2 drop-shadow-lg">{item.label}</h1>
                <div class="flex flex-wrap items-center justify-center gap-2 mb-3">
                    <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/50 border border-white/30 text-white">
                        {venueType === 'מזון מהיר' ? '🍔 מזון מהיר' : '🍷 מסעדה'}
                    </span>
                    {#if foodType}
                        <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/50 border border-white/30 text-white">
                            {foodType}
                        </span>
                    {/if}
                </div>
                <!-- דירוג -->
                <button
                    type="button"
                    onclick={() => (reviewsOpen = true)}
                    class="inline-flex items-center gap-2 bg-black/55 hover:bg-black/70 border border-white/15 rounded-full px-4 py-1.5 transition-colors cursor-pointer"
                >
                    <span class="text-yellow-300 text-sm">
                        {#each [1,2,3,4,5] as s}{s <= Math.round(summary.avg) ? '★' : '☆'}{/each}
                    </span>
                    <span class="text-white font-bold text-sm">{summary.avg || '-'}</span>
                    <span class="text-white/70 text-xs">({summary.count} ביקורות)</span>
                </button>
                {#if item.neighborhood || item.city}
                    <p class="text-white/90 text-sm mt-3 drop-shadow">
                        📍 {[item.neighborhood, item.city].filter(Boolean).join(', ')}
                    </p>
                {/if}
            </div>
        </div>

        <!-- ===== הנחת מועדון ===== -->
        {#if clubDiscount}
            <div class="bg-gradient-to-l from-pink-600/20 to-rose-600/15 border border-pink-500/40 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
                <span class="text-3xl">🎟️</span>
                <div>
                    <p class="text-pink-200 font-black text-sm">הנחה לחברי מועדון יוצאים לחירות</p>
                    <p class="text-pink-100/90 text-sm">{clubDetail || 'הטבה מיוחדת לחברי המועדון בהצגת כרטיס חבר'}</p>
                </div>
            </div>
        {/if}

        <!-- ===== תקציר עיקרי ===== -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-3 text-center">
                <div class="text-xl mb-1">🛵</div>
                <div class="font-bold text-sm {hasDelivery ? 'text-green-300' : 'text-gray-500'}">
                    {hasDelivery ? 'יש משלוחים' : 'אין משלוחים'}
                </div>
            </div>
            <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-3 text-center">
                <div class="text-xl mb-1">🍽️</div>
                <div class="font-bold text-sm {hasSeating ? 'text-blue-300' : 'text-gray-400'}">
                    {hasSeating ? 'ישיבה במקום' : 'טייק-אווי בלבד'}
                </div>
            </div>
            {#if priceRange}
                <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-3 text-center">
                    <div class="text-xl mb-1">💰</div>
                    <div class="font-bold text-sm text-amber-300">{priceRange}</div>
                </div>
            {/if}
            {#if parking}
                <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-3 text-center">
                    <div class="text-xl mb-1">🅿️</div>
                    <div class="font-bold text-sm {parking === 'יש חניה' ? 'text-green-300' : 'text-gray-400'}">{parking}</div>
                </div>
            {/if}
        </div>

        <!-- ===== תיאור ===== -->
        {#if item.description}
            <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6">
                <h2 class="text-white font-black text-base mb-2">על המקום</h2>
                <p class="text-gray-300 text-sm leading-relaxed">{item.description}</p>
            </div>
        {/if}

        <!-- ===== פרטים ===== -->
        <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6 space-y-4">
            <h2 class="text-white font-black text-base">פרטי המקום</h2>

            {#if kosher || meatDairy}
                <div class="flex items-start gap-3">
                    <span class="text-lg">✡️</span>
                    <div>
                        <div class="text-gray-400 text-xs">כשרות</div>
                        <div class="text-white text-sm font-bold">
                            {[kosher, meatDairy].filter(Boolean).join(' · ') || '-'}
                        </div>
                    </div>
                </div>
            {/if}

            {#if service.length}
                <div class="flex items-start gap-3">
                    <span class="text-lg">🍴</span>
                    <div class="flex-1">
                        <div class="text-gray-400 text-xs mb-1">אופן הגשה</div>
                        <div class="flex flex-wrap gap-1.5">
                            {#each service as s}
                                <span class="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-200">{s}</span>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            {#if deliveryBy.length}
                <div class="flex items-start gap-3">
                    <span class="text-lg">📦</span>
                    <div>
                        <div class="text-gray-400 text-xs">משלוחים באמצעות</div>
                        <div class="text-white text-sm">{deliveryBy.join(', ')}</div>
                    </div>
                </div>
            {/if}

            {#if amenities.length}
                <div class="flex items-start gap-3">
                    <span class="text-lg">✨</span>
                    <div class="flex-1">
                        <div class="text-gray-400 text-xs mb-1">שירותים ונוחות</div>
                        <div class="flex flex-wrap gap-1.5">
                            {#each amenities as a}
                                <span class="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">{a}</span>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            {#if parkingNotes}
                <div class="flex items-start gap-3">
                    <span class="text-lg">🅿️</span>
                    <div>
                        <div class="text-gray-400 text-xs">פרטי חניה</div>
                        <div class="text-white text-sm">{parkingNotes}</div>
                    </div>
                </div>
            {/if}

            {#if hours}
                <div class="flex items-start gap-3">
                    <span class="text-lg">🕒</span>
                    <div>
                        <div class="text-gray-400 text-xs">שעות פתיחה</div>
                        <div class="text-white text-sm">{hours}</div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- ===== הגעה ===== -->
        <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6">
            <h2 class="text-white font-black text-base mb-3">איך מגיעים</h2>
            {#if item.address || item.neighborhood || item.city}
                <p class="text-gray-300 text-sm mb-3">
                    📍 {item.address || [item.neighborhood, item.city].filter(Boolean).join(', ')}
                </p>
            {/if}
            {#if transport}
                <p class="text-gray-400 text-sm mb-3 leading-relaxed">🚌 {transport}</p>
            {/if}
            <div class="flex flex-wrap gap-2">
                {#if wazeLink}
                    <a href={wazeLink} target="_blank" rel="noopener noreferrer"
                       class="flex items-center gap-1.5 bg-cyan-600/80 hover:bg-cyan-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                        🧭 ניווט ב-Waze
                    </a>
                {/if}
                {#if gmapsLink}
                    <a href={gmapsLink} target="_blank" rel="noopener noreferrer"
                       class="flex items-center gap-1.5 bg-green-700/80 hover:bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                        🗺️ Google Maps
                    </a>
                {/if}
            </div>
        </div>

        <!-- ===== גלריית תמונות ===== -->
        {#if images.length}
            <div class="mb-6">
                <h2 class="text-white font-black text-base mb-3">תמונות העסק</h2>
                <div class="grid grid-cols-3 gap-2">
                    {#each images as src}
                        <button type="button" onclick={() => (lightbox = src)}
                            class="aspect-square rounded-xl overflow-hidden border border-white/10 cursor-pointer">
                            <img {src} alt="" class="w-full h-full object-cover hover:scale-105 transition-transform" />
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- ===== תפריט ===== -->
        {#if menuImages.length}
            <div class="mb-6">
                <h2 class="text-white font-black text-base mb-3">📋 התפריט</h2>
                <div class="grid grid-cols-2 gap-2">
                    {#each menuImages as src}
                        <button type="button" onclick={() => (lightbox = src)}
                            class="rounded-xl overflow-hidden border border-white/10 cursor-pointer">
                            <img {src} alt="תפריט" class="w-full object-cover hover:scale-105 transition-transform" />
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- ===== קישורים ===== -->
        {#if facebook || instagram || (customLabel && customUrl)}
            <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6">
                <h2 class="text-white font-black text-base mb-3">קישורים</h2>
                <div class="flex flex-wrap gap-2">
                    {#if facebook}
                        <a href={facebook} target="_blank" rel="noopener noreferrer"
                           class="bg-blue-600/80 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                            פייסבוק
                        </a>
                    {/if}
                    {#if instagram}
                        <a href={instagram} target="_blank" rel="noopener noreferrer"
                           class="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                            אינסטגרם
                        </a>
                    {/if}
                    {#if customLabel && customUrl}
                        <a href={customUrl} target="_blank" rel="noopener noreferrer"
                           class="bg-amber-600/80 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                            🔗 {customLabel}
                        </a>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- ===== יצירת קשר ===== -->
        {#if item.phone}
            <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6">
                <h2 class="text-white font-black text-base mb-3">יצירת קשר</h2>
                {#if item.contact}
                    <p class="text-gray-400 text-sm mb-3">👤 {item.contact}</p>
                {/if}
                <div class="flex gap-2">
                    <a href="tel:{item.phone}"
                       class="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                        📞 התקשרו
                    </a>
                    <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer"
                       class="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                        💬 WhatsApp
                    </a>
                </div>
            </div>
        {/if}

        <!-- ===== דירוגים ותגובות ===== -->
        <button
            type="button"
            onclick={() => (reviewsOpen = true)}
            class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3.5 rounded-2xl transition-all"
        >
            ⭐ דירוגים ותגובות ({summary.count})
        </button>

    </div>
</div>

<!-- Lightbox -->
{#if lightbox}
    <button
        type="button"
        class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        onclick={() => (lightbox = null)}
        aria-label="סגור תמונה"
    >
        <img src={lightbox} alt="" class="max-w-full max-h-full rounded-xl" />
    </button>
{/if}

<RestaurantReviewsModal
    open={reviewsOpen}
    itemId={item.id}
    itemLabel={item.label}
    onclose={() => (reviewsOpen = false)}
/>
