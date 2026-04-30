<script lang="ts">
    import { onMount } from "svelte";
    import { locale, t } from "svelte-i18n";
    import { get } from "svelte/store";
    let _loc = $state(get(locale));
    $effect(() => locale.subscribe(l => (_loc = l)));
    const tFn = (k: string) => { void _loc; return get(t)(k); };
    import { fade, fly, scale } from "svelte/transition";
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    const item = $derived(data.item);

    let mounted = $state(false);
    let galleryIndex = $state(0);

    const galleryImages = $derived<string[]>(
        Array.isArray((item as { images?: string[] } | null)?.images)
            ? ((item as { images?: string[] }).images ?? [])
            : (item?.image ? [item.image] : [])
    );

    onMount(async () => {
        mounted = true;
        if (item?.id) {
            try {
                await fetch('/api/items', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: item.id }),
                });
            } catch (e) {
                console.warn('Failed to increment view count:', e);
            }
        }
    });

    function goBack() {
        history.back();
    }

    function nextImage() {
        if (galleryImages.length === 0) return;
        galleryIndex = (galleryIndex + 1) % galleryImages.length;
    }
    function prevImage() {
        if (galleryImages.length === 0) return;
        galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
    }

    function conditionBadgeClass(c: string): string {
        switch (c) {
            case 'כחדש':           return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            case 'משומש':          return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
            case 'דורש תיקון קל':  return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            default:               return 'bg-white/10 text-gray-300 border-white/10';
        }
    }
    function conditionIcon(c: string): string {
        switch (c) {
            case 'כחדש':           return '✨';
            case 'משומש':          return '👍';
            case 'דורש תיקון קל':  return '🔧';
            default:               return '📦';
        }
    }
    const itemCondition = $derived<string>(
        typeof (item as { extraFields?: { condition?: unknown } } | null)?.extraFields?.condition === 'string'
            ? ((item as { extraFields: { condition: string } }).extraFields.condition)
            : ''
    );

    let copied = $state(false);

    function shareUrl(): string {
        return typeof window !== 'undefined' ? window.location.href : '';
    }
    function shareText(): string {
        return item ? `${item.label} | קהילה בשכונה` : 'קהילה בשכונה';
    }
    function shareWhatsApp() {
        const url = shareUrl();
        const text = shareText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank', 'noopener,noreferrer');
    }
    function shareFacebook() {
        const url = shareUrl();
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    }
    function shareTelegram() {
        const url = shareUrl();
        const text = shareText();
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    }
    async function copyLink() {
        const url = shareUrl();
        try {
            await navigator.clipboard.writeText(url);
            copied = true;
            setTimeout(() => (copied = false), 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); copied = true; setTimeout(() => (copied = false), 2000); } catch {}
            document.body.removeChild(ta);
        }
    }
</script>

<svelte:head>
    <title>{item ? item.label : tFn("item_not_found")} | קהילה בשכונה</title>
</svelte:head>

<!-- Hidden keys (rendered in dedicated sections, complex types, or internal-only) -->
{#snippet extraFieldsBlock()}
    {@const HIDDEN_KEYS = new Set(['condition', 'category', 'tags', 'images', 'image', 'price'])}
    {@const visibleEntries = item?.isUserSubmitted && item.extraFields
        ? Object.entries(item.extraFields).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== '')
        : []}
    {#if visibleEntries.length > 0}
        <section>
            <h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span class="w-1.5 h-8 bg-green-500 rounded-full"></span>{tFn("more_details")}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each visibleEntries as [key, value]}
                    <div class="bg-white/5 p-4 rounded-xl border border-white/5">
                        <p class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">{key}</p>
                        <p class="text-white font-medium">{value}</p>
                    </div>
                {/each}
            </div>
        </section>
    {/if}
{/snippet}

<div class="min-h-screen bg-[#070b14] py-12 px-4 md:px-8">
    <div class="max-w-4xl mx-auto">
        <!-- Back button -->
        <button
            onclick={goBack}
            aria-label="חזרה לדף הקודם"
            class="mb-8 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors group"
        >
            <span
                class="text-xl group-hover:-translate-x-1 transition-transform"
                aria-hidden="true"
                >←</span
            >
            <span class="font-bold">{tFn("back_to_map")}</span>
        </button>

        {#if item}
            <div
                class="bg-[#0f172a] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                in:fly={{ y: 50, duration: 800, delay: 200 }}
            >
                <!-- Header / Image gallery -->
                <div class="relative h-[300px] md:h-[450px] bg-[#0a0f1a]">
                    {#if galleryImages.length > 0}
                        {#key galleryIndex}
                            <img
                                src={galleryImages[galleryIndex]}
                                alt={item.label}
                                class="w-full h-full object-cover"
                                in:fade={{ duration: 200 }}
                            />
                        {/key}
                        {#if galleryImages.length > 1}
                            <!-- Prev/Next -->
                            <button
                                type="button"
                                onclick={prevImage}
                                aria-label="הקודם"
                                class="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-xl font-black flex items-center justify-center backdrop-blur-sm transition-colors"
                            >→</button>
                            <button
                                type="button"
                                onclick={nextImage}
                                aria-label="הבא"
                                class="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-xl font-black flex items-center justify-center backdrop-blur-sm transition-colors"
                            >←</button>
                            <!-- Counter -->
                            <span class="absolute top-3 end-3 z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-bold">
                                📷 {galleryIndex + 1} / {galleryImages.length}
                            </span>
                            <!-- Dots -->
                            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                                {#each galleryImages as _, i}
                                    <button
                                        type="button"
                                        onclick={() => galleryIndex = i}
                                        aria-label={`תמונה ${i + 1}`}
                                        class="w-2 h-2 rounded-full transition-all {i === galleryIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}"
                                    ></button>
                                {/each}
                            </div>
                        {/if}
                    {:else}
                        <div class="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
                            <span class="text-[120px]">{item.icon}</span>
                        </div>
                    {/if}
                    <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent pointer-events-none"></div>

                    <div class="absolute bottom-8 right-8 text-white pointer-events-none">
                        <div class="flex items-center gap-4 mb-4">
                            <span class="text-4xl p-3 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl">{item.icon}</span>
                            <h2 class="text-4xl md:text-6xl font-black tracking-tight drop-shadow-2xl">{item.label}</h2>
                        </div>
                    </div>
                </div>

                <!-- Thumbnail strip -->
                {#if galleryImages.length > 1}
                    <div class="flex gap-2 px-6 pt-4 overflow-x-auto hide-scrollbar">
                        {#each galleryImages as src, i}
                            <button
                                type="button"
                                onclick={() => galleryIndex = i}
                                class="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all {i === galleryIndex ? 'border-orange-400 shadow-lg shadow-orange-500/30 scale-105' : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'}"
                                aria-label={`תמונה ${i + 1}`}
                            >
                                <img src={src} alt="" loading="lazy" decoding="async" class="w-full h-full object-cover" />
                            </button>
                        {/each}
                    </div>
                {/if}

                <!-- Content -->
                <div class="p-8 md:p-12">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <!-- Main info -->
                        <div class="md:col-span-2 space-y-8">
                            <section>
                                <h2
                                    class="text-2xl font-bold text-white mb-4 flex items-center gap-2"
                                >
                                    <span
                                        class="w-1.5 h-8 bg-purple-500 rounded-full"
                                    ></span>
                                    תיאור הפריט
                                </h2>
                                <p
                                    class="text-gray-300 text-lg leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5"
                                >
                                    {item.description}
                                </p>
                            </section>

                            {#if itemCondition}
                                <section>
                                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                        <span class="w-1.5 h-8 bg-orange-500 rounded-full"></span>
                                        מצב הפריט
                                    </h2>
                                    <div class="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                                        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-bold border {conditionBadgeClass(itemCondition)}">
                                            <span aria-hidden="true">{conditionIcon(itemCondition)}</span>
                                            <span>{itemCondition}</span>
                                        </span>
                                    </div>
                                </section>
                            {/if}

                            <section>
                                <h2
                                    class="text-2xl font-bold text-white mb-4 flex items-center gap-2"
                                >
                                    <span
                                        class="w-1.5 h-8 bg-blue-500 rounded-full"
                                    ></span>
                                    מיקום ופרטי קשר
                                </h2>
                                <div
                                    class="mb-4 bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4"
                                >
                                    <span class="text-2xl text-yellow-400"
                                        >👁️</span
                                    >
                                    <div>
                                        <p
                                            class="text-xs text-gray-400 uppercase font-bold tracking-wider"
                                        >
                                            תצפיות
                                        </p>
                                        <p
                                            class="text-white font-medium"
                                        >
                                            {item?.viewCount ?? 0} אנשים ראו את הפריט הזה
                                        </p>
                                    </div>
                                </div>
                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                >
                                    {#if item.address}
                                        <div
                                            class="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4"
                                        >
                                            <span class="text-2xl text-blue-400"
                                                >📍</span
                                            >
                                            <div>
                                                <p
                                                    class="text-xs text-gray-400 uppercase font-bold tracking-wider"
                                                >
                                                    כתובת
                                                </p>
                                                <p
                                                    class="text-white font-medium"
                                                >
                                                    {item.address}
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                    {#if item.phone}
                                        <div
                                            class="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4"
                                        >
                                            <span
                                                class="text-2xl text-green-400"
                                                >📞</span
                                            >
                                            <div>
                                                <p
                                                    class="text-xs text-gray-400 uppercase font-bold tracking-wider"
                                                >
                                                    טלפון
                                                </p>
                                                <p
                                                    class="text-white font-medium"
                                                >
                                                    {item.phone}
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                    {#if item.contact}
                                        <div
                                            class="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4"
                                        >
                                            <span
                                                class="text-2xl text-purple-400"
                                                >👤</span
                                            >
                                            <div>
                                                <p
                                                    class="text-xs text-gray-400 uppercase font-bold tracking-wider"
                                                >
                                                    איש קשר
                                                </p>
                                                <p
                                                    class="text-white font-medium"
                                                >
                                                    {item.contact}
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </section>

                            {@render extraFieldsBlock()}
                        </div>

                        <!-- Sidebar / Actions -->
                        <div class="space-y-6">
                            <div
                                class="bg-gradient-to-br from-purple-600 to-blue-600 p-8 rounded-3xl shadow-xl"
                            >
                                <h3 class="text-white font-bold text-xl mb-4">
                                    זקוק לפרטים נוספים?
                                </h3>
                                <p class="text-white/80 text-sm mb-6">
                                    צור קשר ישירות עם המפרסם לקבלת פרטים נוספים
                                    או תיאום.
                                </p>
                                <a
                                    href="tel:{item.phone}"
                                    aria-label="התקשר עכשיו – {item.phone}"
                                    class="block w-full bg-white text-purple-600 font-bold py-3 rounded-xl text-center shadow-lg hover:scale-105 transition-transform"
                                >
                                    התקשר עכשיו
                                </a>
                                <button
                                    aria-label="שלח הודעה למפרסם"
                                    class="block w-full mt-3 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl text-center transition-all border border-white/20"
                                >
                                    שלח הודעה
                                </button>
                            </div>

                            <div
                                class="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm"
                            >
                                <h4 class="text-white font-bold mb-4">
                                    שתף עם חברים
                                </h4>
                                <div class="flex gap-4 flex-wrap">
                                    <button
                                        type="button"
                                        onclick={shareWhatsApp}
                                        aria-label="שתף בוואטסאפ"
                                        title="שתף בוואטסאפ"
                                        class="bg-green-600/20 hover:bg-green-600/40 p-3 rounded-xl transition-all flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true" class="w-6 h-6">
                                            <path d="M19.05 4.91A10 10 0 0 0 12 2a10 10 0 0 0-8.6 15.04L2 22l5.13-1.34A10 10 0 0 0 12 22a10 10 0 0 0 7.05-17.09zM12 20.27a8.27 8.27 0 0 1-4.22-1.16l-.3-.18-3.05.8.81-2.97-.2-.31A8.27 8.27 0 1 1 20.27 12 8.27 8.27 0 0 1 12 20.27zm4.55-6.2c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.56.13-.17.25-.64.81-.79.98-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.36-.77-1.86-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31s-.88.86-.88 2.1.9 2.43 1.03 2.6c.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z"/>
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onclick={shareFacebook}
                                        aria-label="שתף בפייסבוק"
                                        title="שתף בפייסבוק"
                                        class="bg-blue-600/20 hover:bg-blue-600/40 p-3 rounded-xl transition-all flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true" class="w-6 h-6">
                                            <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onclick={shareTelegram}
                                        aria-label="שתף בטלגרם"
                                        title="שתף בטלגרם"
                                        class="bg-sky-500/20 hover:bg-sky-500/40 p-3 rounded-xl transition-all flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#229ED9" aria-hidden="true" class="w-6 h-6">
                                            <path d="M9.78 15.27 9.6 18.9c.27 0 .39-.12.53-.26l1.27-1.22 2.64 1.93c.48.27.83.13.96-.45l1.74-8.16c.17-.74-.27-1.04-.74-.86L5.5 13.93c-.72.28-.71.69-.12.87l2.94.92 6.83-4.3c.32-.21.61-.09.37.13l-5.74 5.72z"/>
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onclick={copyLink}
                                        aria-label="העתק קישור"
                                        title={copied ? 'הקישור הועתק' : 'העתק קישור'}
                                        class="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all flex items-center justify-center text-white"
                                    >
                                        {#if copied}
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="w-6 h-6 text-emerald-400">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                        {:else}
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="w-6 h-6">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                            </svg>
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {:else}
            <!-- Not found state -->
            <div
                class="text-center py-24 bg-[#0f172a] rounded-3xl border border-white/10"
                in:scale={{ duration: 500 }}
            >
                <span class="text-8xl mb-8 block" aria-hidden="true">🔍</span>
                <h2 class="text-4xl font-black text-white mb-4">{tFn("item_not_found")}</h2>
                <p class="text-gray-400 mb-8">
                    נראה שהדף שאתה מחפש הוסר או שמעולם לא היה קיים.
                </p>
                <button
                    onclick={goBack}
                    aria-label="חזרה לדף הקודם"
                    class="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                >{tFn("back_to_map")}</button>
            </div>
        {/if}
    </div>
</div>

<style>
    :global(body) {
        background-color: #070b14;
    }
    .hide-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
        display: none;
    }
</style>
