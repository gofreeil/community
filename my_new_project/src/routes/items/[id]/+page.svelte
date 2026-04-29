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
</script>

<svelte:head>
    <title>{item ? item.label : tFn("item_not_found")} | קהילה בשכונה</title>
</svelte:head>

<!-- Extra fields display for user-submitted items -->
{#snippet extraFieldsBlock()}
    {#if item?.isUserSubmitted && item.extraFields && Object.keys(item.extraFields).length > 0}
        <section>
            <h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span class="w-1.5 h-8 bg-green-500 rounded-full"></span>{tFn("more_details")}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each Object.entries(item.extraFields) as [key, value]}
                    {#if value}
                        <div class="bg-white/5 p-4 rounded-xl border border-white/5">
                            <p class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">{key}</p>
                            <p class="text-white font-medium">{value}</p>
                        </div>
                    {/if}
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
                                <img src={src} alt="" class="w-full h-full object-cover" />
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
                                <div class="flex gap-4">
                                    <button
                                        aria-label="שתף בוואטסאפ"
                                        class="bg-green-600/20 hover:bg-green-600/40 p-3 rounded-xl transition-all"
                                    ><span aria-hidden="true">🟢</span></button>
                                    <button
                                        aria-label="שתף בפייסבוק"
                                        class="bg-blue-600/20 hover:bg-blue-600/40 p-3 rounded-xl transition-all"
                                    ><span aria-hidden="true">🔵</span></button>
                                    <button
                                        aria-label="העתק קישור"
                                        class="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"
                                    ><span aria-hidden="true">📋</span></button>
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
