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
    let lightboxOpen = $state(false);

    function openLightbox() { lightboxOpen = true; }
    function closeLightbox() { lightboxOpen = false; }
    function onLightboxKey(e: KeyboardEvent) {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') nextImage();
        else if (e.key === 'ArrowRight') prevImage();
    }
    $effect(() => {
        if (lightboxOpen) {
            window.addEventListener('keydown', onLightboxKey);
            document.body.style.overflow = 'hidden';
            return () => {
                window.removeEventListener('keydown', onLightboxKey);
                document.body.style.overflow = '';
            };
        }
    });

    const galleryImages = $derived<string[]>(
        Array.isArray((item as { images?: string[] } | null)?.images)
            ? ((item as { images?: string[] }).images ?? [])
            : (item?.image ? [item.image] : [])
    );

    // Strip legacy "פנוי, " / "פנויה, " prefix from titles (user requested twice)
    const displayLabel = $derived.by(() => {
        const raw = String(item?.label || '');
        const cleaned = raw.replace(/^\s*פנוי(ה)?\s*,?\s*/, '').trim();
        return cleaned || raw;
    });

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

    // ---- Singles phone-request flow ----
    let singlesState = $state(
        (item as unknown as { singlesStatus?: { state: string; requestItemId?: string } })?.singlesStatus?.state ?? null
    );
    $effect(() => {
        const s = (item as unknown as { singlesStatus?: { state: string } })?.singlesStatus?.state;
        if (s) singlesState = s;
    });
    let singlesError = $state('');
    let singlesSending = $state(false);

    async function requestSinglesPhone() {
        if (!item?.id || singlesSending) return;
        singlesError = '';
        singlesSending = true;
        try {
            const res = await fetch('/api/singles-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_item_id: item.id }),
            });
            const data = await res.json();
            if (!data.success) {
                singlesError = data.message || 'שגיאה';
            } else {
                singlesState = 'pending';
            }
        } catch {
            singlesError = 'בעיית תקשורת - נסה שוב';
        } finally {
            singlesSending = false;
        }
    }

    let approving = $state<string | null>(null);
    let approveError = $state('');
    let incoming = $state(
        ((item as unknown as { incomingRequests?: Array<{ id: string; requester_snapshot: Record<string, unknown>; requested_at: string; status: string }> })?.incomingRequests) ?? []
    );
    $effect(() => {
        const i = (item as unknown as { incomingRequests?: typeof incoming })?.incomingRequests;
        if (Array.isArray(i)) incoming = i;
    });

    async function decideRequest(reqId: string, action: 'approved' | 'rejected') {
        if (approving) return;
        approving = reqId;
        approveError = '';
        try {
            const res = await fetch('/api/singles-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_item_id: reqId, action }),
            });
            const data = await res.json();
            if (!data.success) {
                approveError = data.message || 'שגיאה';
            } else {
                incoming = incoming.filter(r => r.id !== reqId);
            }
        } catch {
            approveError = 'בעיית תקשורת';
        } finally {
            approving = null;
        }
    }

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
    <title>{item ? displayLabel : tFn("item_not_found")} | קהילה בשכונה</title>
</svelte:head>

{#snippet socialLinksBlock()}
    {@const ef = (item?.isUserSubmitted ? item?.extraFields : null) as Record<string, unknown> | null}
    {@const website   = typeof ef?.website   === 'string' ? ef.website   : ''}
    {@const facebook  = typeof ef?.facebook  === 'string' ? ef.facebook  : ''}
    {@const instagram = typeof ef?.instagram === 'string' ? ef.instagram : ''}
    {@const youtube   = typeof ef?.youtube   === 'string' ? ef.youtube   : ''}
    {@const tiktok    = typeof ef?.tiktok    === 'string' ? ef.tiktok    : ''}
    {@const ensureUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)}
    {#if website || facebook || instagram || youtube || tiktok}
        <section>
            <h2 class="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <span class="w-1 h-4 bg-indigo-500 rounded-full"></span>קישורים
            </h2>
            <div class="flex flex-wrap gap-2">
                {#if website}
                    <a href={ensureUrl(website)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        🌐 אתר אינטרנט
                    </a>
                {/if}
                {#if facebook}
                    <a href={ensureUrl(facebook)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        📘 פייסבוק
                    </a>
                {/if}
                {#if instagram}
                    <a href={ensureUrl(instagram)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-pink-600/20 border border-white/10 hover:border-pink-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        📷 אינסטגרם
                    </a>
                {/if}
                {#if youtube}
                    <a href={ensureUrl(youtube)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        ▶️ יוטיוב
                    </a>
                {/if}
                {#if tiktok}
                    <a href={ensureUrl(tiktok)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-fuchsia-600/20 border border-white/10 hover:border-fuchsia-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        🎵 טיקטוק
                    </a>
                {/if}
            </div>
        </section>
    {/if}
{/snippet}

<!-- Hidden keys (rendered in dedicated sections, complex types, or internal-only) -->
{#snippet extraFieldsBlock()}
    {@const HIDDEN_KEYS = new Set(['condition', 'category', 'tags', 'images', 'image', 'price', 'website', 'facebook', 'instagram', 'youtube', 'tiktok'])}
    {@const LABELS_HE: Record<string, string> = {
        nickname: 'שם או כינוי',
        gender: 'מין',
        age: 'גיל',
        birth_date: 'תאריך לידה',
        sector: 'מגזר / רקע',
        marital_status: 'מצב משפחתי',
        education: 'מקצוע / השכלה',
        interests: 'תחומי עניין',
        description: 'קצת עליי',
        about: 'קצת עליי',
        looking_for_m: 'מחפש',
        looking_for_f: 'מחפשת',
        inspiration: 'משפט מעורר השראה',
        matchmaker: 'שדכן או חבר',
        city: 'עיר',
        neighborhood: 'שכונה',
        address: 'כתובת',
        phone: 'טלפון',
        contact: 'דרך קשר',
    }}
    {@const formatValue = (key: string, val: unknown): string => {
        if (val == null || val === '') return '';
        const s = String(val);
        if (key === 'birth_date') {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                const now = new Date();
                let age = now.getFullYear() - d.getFullYear();
                const m = now.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
                return age > 0 && age < 130 ? `${age} (${d.toLocaleDateString('he-IL')})` : d.toLocaleDateString('he-IL');
            }
        }
        if (key === 'gender') return s === 'male' ? 'גבר' : s === 'female' ? 'אישה' : s;
        return s;
    }}
    {@const visibleEntries = item?.isUserSubmitted && item.extraFields
        ? Object.entries(item.extraFields).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== '')
        : []}
    {#if visibleEntries.length > 0}
        <section>
            <h2 class="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <span class="w-1 h-4 bg-green-500 rounded-full"></span>{tFn("more_details")}</h2>
            <dl class="rounded-xl border border-white/10 overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10">
                {#each visibleEntries as [key, value]}
                    <div class="grid grid-cols-[auto,1fr] gap-x-3 px-3 py-2 bg-[#0f172a]">
                        <dt class="text-xs text-gray-400 font-semibold whitespace-nowrap">{LABELS_HE[key] ?? key}</dt>
                        <dd class="text-white font-medium text-xs">{formatValue(key, value)}</dd>
                    </div>
                {/each}
            </dl>
        </section>
    {/if}
{/snippet}

<div class="min-h-screen bg-[#070b14] py-2 md:py-3 px-3 md:px-6">
    <div class="max-w-4xl mx-auto">
        <!-- Back button -->
        <button
            onclick={goBack}
            aria-label="חזרה לדף הקודם"
            class="mb-2 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors group text-xs"
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
                <!-- Top: image side-by-side with description+address -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
                <!-- Header / Image gallery -->
                <div class="relative bg-[#0a0f1a] flex items-center justify-center min-h-[150px]" class:h-[110px]={galleryImages.length === 0} class:md:h-[140px]={galleryImages.length === 0}>
                    {#if galleryImages.length > 0}
                        {#key galleryIndex}
                            <button
                                type="button"
                                onclick={openLightbox}
                                aria-label="הגדל תמונה"
                                title="לחץ להגדלה"
                                class="contents cursor-zoom-in"
                            >
                                <img
                                    src={galleryImages[galleryIndex]}
                                    alt={item.label}
                                    class="max-w-full max-h-[150px] md:max-h-[180px] w-auto h-auto object-contain cursor-zoom-in"
                                    in:fade={{ duration: 200 }}
                                />
                            </button>
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

                    <div class="absolute bottom-2 right-3 text-white pointer-events-none">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xl p-1.5 bg-white/10 backdrop-blur-md rounded-lg shadow-xl">{item.icon}</span>
                            <h2 class="text-xl md:text-2xl font-black tracking-tight drop-shadow-2xl">{displayLabel}</h2>
                        </div>
                    </div>
                </div>

                <!-- Side info: description + address (next to image on md+) -->
                <div class="px-3 md:px-4 py-2 flex flex-col gap-2">
                    <p class="text-gray-200 text-sm leading-snug flex-1">
                        {item.description}
                    </p>
                    {#if item.address}
                        <div class="bg-white/5 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                            <span class="text-xl text-blue-400">📍</span>
                            <div>
                                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">כתובת</p>
                                <p class="text-white font-medium text-sm">{item.address}</p>
                            </div>
                        </div>
                    {/if}
                </div>
                </div>

                <!-- Thumbnail strip -->
                {#if galleryImages.length > 1}
                    <div class="flex gap-1.5 px-3 pt-2 overflow-x-auto hide-scrollbar">
                        {#each galleryImages as src, i}
                            <button
                                type="button"
                                onclick={() => galleryIndex = i}
                                class="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-md overflow-hidden border-2 transition-all {i === galleryIndex ? 'border-orange-400 shadow-md shadow-orange-500/30 scale-105' : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'}"
                                aria-label={`תמונה ${i + 1}`}
                            >
                                <img src={src} alt="" loading="lazy" decoding="async" class="w-full h-full object-cover" />
                            </button>
                        {/each}
                    </div>
                {/if}

                <!-- Content -->
                <div class="p-3 md:p-4">
                    <div class="space-y-2">
                        <!-- Main info -->
                        <div class="space-y-2">
                            {#if itemCondition}
                                <section>
                                    <h2 class="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                                        <span class="w-1 h-4 bg-orange-500 rounded-full"></span>
                                        מצב הפריט
                                    </h2>
                                    <div class="bg-white/5 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border {conditionBadgeClass(itemCondition)}">
                                            <span aria-hidden="true">{conditionIcon(itemCondition)}</span>
                                            <span>{itemCondition}</span>
                                        </span>
                                    </div>
                                </section>
                            {/if}

                            <section>
                                <h2
                                    class="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5"
                                >
                                    <span
                                        class="w-1 h-4 bg-blue-500 rounded-full"
                                    ></span>
                                    מיקום ופרטי קשר
                                </h2>
                                <div
                                    class="mb-1.5 bg-white/5 p-2 rounded-lg border border-white/5 flex items-center gap-2"
                                    class:hidden={!(item as { isOwner?: boolean } | null)?.isOwner}
                                >
                                    <span class="text-xl text-yellow-400"
                                        >👁️</span
                                    >
                                    <div>
                                        <p
                                            class="text-[10px] text-gray-400 uppercase font-bold tracking-wider"
                                        >
                                            תצפיות
                                        </p>
                                        <p
                                            class="text-white font-medium text-sm"
                                        >
                                            {item?.viewCount ?? 0} אנשים ראו את הפריט הזה
                                        </p>
                                        <p class="text-[10px] text-gray-500 mt-0.5">🔒 הנתון גלוי רק לך, בעל הפריט</p>
                                    </div>
                                </div>
                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-2"
                                >
                                    {#if item.phone && item.category !== 'singles'}
                                        <div
                                            class="bg-white/5 p-2 rounded-lg border border-white/5 flex items-center gap-2"
                                        >
                                            <span
                                                class="text-xl text-green-400"
                                                >📞</span
                                            >
                                            <div>
                                                <p
                                                    class="text-[10px] text-gray-400 uppercase font-bold tracking-wider"
                                                >
                                                    טלפון
                                                </p>
                                                <p
                                                    class="text-white font-medium text-sm"
                                                >
                                                    {item.phone}
                                                </p>
                                            </div>
                                        </div>
                                    {:else if item.category === 'singles' && singlesState === 'approved' && item.phone}
                                        <div class="bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-500/30 flex items-center gap-3">
                                            <span class="text-xl text-emerald-300">✅</span>
                                            <div>
                                                <p class="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">טלפון (אושר)</p>
                                                <p class="text-white font-medium text-sm">{item.phone}</p>
                                            </div>
                                        </div>
                                    {/if}
                                    {#if item.contact}
                                        <div
                                            class="bg-white/5 p-2 rounded-lg border border-white/5 flex items-center gap-2"
                                        >
                                            <span
                                                class="text-xl text-purple-400"
                                                >👤</span
                                            >
                                            <div>
                                                <p
                                                    class="text-[10px] text-gray-400 uppercase font-bold tracking-wider"
                                                >
                                                    איש קשר
                                                </p>
                                                <p
                                                    class="text-white font-medium text-sm"
                                                >
                                                    {item.contact}
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </section>

                            {@render socialLinksBlock()}

                            {@render extraFieldsBlock()}
                        </div>

                        <!-- Actions (inline, no sidebar) -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {#if item.category === 'singles'}
                                <!-- Singles: בקשת טלפון / סטטוס / תיבת בעלים -->
                                {#if singlesState === 'owner'}
                                    <div class="bg-gradient-to-br from-rose-600 to-pink-600 p-4 rounded-2xl shadow-xl">
                                        <h3 class="text-white font-bold text-base mb-1">📥 בקשות נכנסות</h3>
                                        <p class="text-white/80 text-xs mb-2">משתמשים שביקשו לקבל את הטלפון שלך. הצג פרטים, ואשר רק אם מתאים.</p>
                                        {#if incoming.length === 0}
                                            <p class="text-white/80 text-xs bg-white/10 rounded-lg px-2.5 py-1.5">אין בקשות ממתינות</p>
                                        {:else}
                                            <ul class="space-y-3">
                                                {#each incoming as r (r.id)}
                                                    <li class="bg-white/10 rounded-xl p-3">
                                                        <div class="text-white text-sm font-bold mb-1">
                                                            {r.requester_snapshot.nickname || 'משתמש'}
                                                            {#if r.requester_snapshot.gender}· {r.requester_snapshot.gender}{/if}
                                                            {#if r.requester_snapshot.age}· גיל {r.requester_snapshot.age}{/if}
                                                        </div>
                                                        {#if r.requester_snapshot.neighborhood || r.requester_snapshot.city}
                                                            <div class="text-white/80 text-xs mb-2">
                                                                {[r.requester_snapshot.neighborhood, r.requester_snapshot.city].filter(Boolean).join(', ')}
                                                            </div>
                                                        {/if}
                                                        <div class="flex gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={approving === r.id}
                                                                onclick={() => decideRequest(r.id, 'approved')}
                                                                class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold py-1.5 rounded-lg disabled:opacity-50"
                                                            >✓ אשר ושלח טלפון</button>
                                                            <button
                                                                type="button"
                                                                disabled={approving === r.id}
                                                                onclick={() => decideRequest(r.id, 'rejected')}
                                                                class="flex-1 bg-white/15 hover:bg-white/25 text-white text-sm font-bold py-1.5 rounded-lg disabled:opacity-50"
                                                            >דחה</button>
                                                        </div>
                                                    </li>
                                                {/each}
                                            </ul>
                                            {#if approveError}
                                                <p class="text-red-200 text-xs mt-2">{approveError}</p>
                                            {/if}
                                        {/if}
                                    </div>
                                {:else if singlesState === 'guest'}
                                    <div class="bg-gradient-to-br from-rose-600 to-pink-600 p-4 rounded-2xl shadow-xl text-center">
                                        <h3 class="text-white font-bold text-base mb-1">🔒 הטלפון מוגן</h3>
                                        <p class="text-white/80 text-xs mb-2">כדי לבקש את הטלפון יש להתחבר. רק לאחר אישור הצד השני - תקבל את מספרו.</p>
                                        <a href="/login?redirect=/items/{item.id}" class="block w-full bg-white text-rose-600 font-bold py-2 rounded-lg text-center shadow-lg hover:scale-[1.02] transition-transform text-sm">התחבר כדי לבקש</a>
                                    </div>
                                {:else if singlesState === 'pending'}
                                    <div class="bg-gradient-to-br from-amber-600 to-orange-600 p-4 rounded-2xl shadow-xl text-center">
                                        <div class="text-2xl mb-1">⏳</div>
                                        <h3 class="text-white font-bold text-base mb-1">בקשתך נשלחה</h3>
                                        <p class="text-white/85 text-xs">הצד השני יקבל את הפרופיל שלך וייחליט. ברגע שיאשר - הטלפון יופיע כאן.</p>
                                    </div>
                                {:else if singlesState === 'approved'}
                                    <div class="bg-gradient-to-br from-emerald-600 to-green-600 p-4 rounded-2xl shadow-xl text-center">
                                        <div class="text-2xl mb-1">✅</div>
                                        <h3 class="text-white font-bold text-base mb-1">בקשתך אושרה!</h3>
                                        <p class="text-white/85 text-xs mb-2">הטלפון מוצג למעלה.</p>
                                        {#if item.phone}
                                            <a href="tel:{item.phone}" class="block w-full bg-white text-emerald-600 font-bold py-2 rounded-lg text-center shadow-lg hover:scale-[1.02] transition-transform text-sm">📞 התקשר עכשיו</a>
                                        {/if}
                                    </div>
                                {:else if singlesState === 'rejected'}
                                    <div class="bg-gradient-to-br from-gray-700 to-gray-800 p-4 rounded-2xl shadow-xl text-center">
                                        <div class="text-2xl mb-1">😕</div>
                                        <h3 class="text-white font-bold text-base mb-1">הבקשה לא אושרה</h3>
                                        <p class="text-white/70 text-xs">הצד השני בחר לא לשתף את הטלפון בשלב הזה.</p>
                                    </div>
                                {:else}
                                    <div class="bg-gradient-to-br from-rose-600 to-pink-600 p-4 rounded-2xl shadow-xl">
                                        <h3 class="text-white font-bold text-base mb-1">🔒 הטלפון מוגן</h3>
                                        <p class="text-white/85 text-xs mb-2">
                                            לחיצה תשלח לצד השני את הפרופיל שלך (שם, גיל, מגזר, שכונה). הטלפון יישלח אליך רק לאחר אישורו.
                                        </p>
                                        <button
                                            type="button"
                                            disabled={singlesSending}
                                            onclick={requestSinglesPhone}
                                            class="block w-full bg-white text-rose-600 font-black py-2 rounded-lg text-center shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-60 text-sm"
                                        >
                                            {singlesSending ? 'שולח...' : '💌 שלח בקשת טלפון'}
                                        </button>
                                        {#if singlesError}
                                            <p class="text-red-100 text-xs mt-2 bg-red-900/30 rounded-lg px-2.5 py-1.5">{singlesError}</p>
                                        {/if}
                                        <p class="text-white/70 text-[10px] mt-2 text-center">מקס׳ 3 בקשות ב-24 שעות · ההגנה מבוטים</p>
                                    </div>
                                {/if}
                            {:else}
                                <div
                                    class="bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-2xl shadow-xl"
                                >
                                    <h3 class="text-white font-bold text-base mb-2">
                                        זקוק לפרטים נוספים?
                                    </h3>
                                    <p class="text-white/80 text-xs mb-3">
                                        צור קשר ישירות עם המפרסם לקבלת פרטים נוספים
                                        או תיאום.
                                    </p>
                                    <a
                                        href="tel:{item.phone}"
                                        aria-label="התקשר עכשיו – {item.phone}"
                                        class="block w-full bg-white text-purple-600 font-bold py-2 rounded-lg text-center shadow-lg hover:scale-105 transition-transform text-sm"
                                    >
                                        התקשר עכשיו
                                    </a>
                                    <button
                                        aria-label="שלח הודעה למפרסם"
                                        class="block w-full mt-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg text-center transition-all border border-white/20 text-sm"
                                    >
                                        שלח הודעה
                                    </button>
                                </div>
                            {/if}

                            <div
                                class="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm"
                            >
                                <h4 class="text-white font-bold mb-2 text-sm">
                                    שתף עם חברים
                                </h4>
                                <div class="flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onclick={shareWhatsApp}
                                        aria-label="שתף בוואטסאפ"
                                        title="שתף בוואטסאפ"
                                        class="bg-green-600/20 hover:bg-green-600/40 p-2 rounded-lg transition-all flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true" class="w-5 h-5">
                                            <path d="M19.05 4.91A10 10 0 0 0 12 2a10 10 0 0 0-8.6 15.04L2 22l5.13-1.34A10 10 0 0 0 12 22a10 10 0 0 0 7.05-17.09zM12 20.27a8.27 8.27 0 0 1-4.22-1.16l-.3-.18-3.05.8.81-2.97-.2-.31A8.27 8.27 0 1 1 20.27 12 8.27 8.27 0 0 1 12 20.27zm4.55-6.2c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.56.13-.17.25-.64.81-.79.98-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.36-.77-1.86-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31s-.88.86-.88 2.1.9 2.43 1.03 2.6c.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z"/>
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onclick={shareFacebook}
                                        aria-label="שתף בפייסבוק"
                                        title="שתף בפייסבוק"
                                        class="bg-blue-600/20 hover:bg-blue-600/40 p-2 rounded-lg transition-all flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true" class="w-5 h-5">
                                            <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onclick={shareTelegram}
                                        aria-label="שתף בטלגרם"
                                        title="שתף בטלגרם"
                                        class="bg-sky-500/20 hover:bg-sky-500/40 p-2 rounded-lg transition-all flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#229ED9" aria-hidden="true" class="w-5 h-5">
                                            <path d="M9.78 15.27 9.6 18.9c.27 0 .39-.12.53-.26l1.27-1.22 2.64 1.93c.48.27.83.13.96-.45l1.74-8.16c.17-.74-.27-1.04-.74-.86L5.5 13.93c-.72.28-.71.69-.12.87l2.94.92 6.83-4.3c.32-.21.61-.09.37.13l-5.74 5.72z"/>
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onclick={copyLink}
                                        aria-label="העתק קישור"
                                        title={copied ? 'הקישור הועתק' : 'העתק קישור'}
                                        class="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all flex items-center justify-center text-white"
                                    >
                                        {#if copied}
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="w-6 h-6 text-emerald-400">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                        {:else}
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="w-5 h-5">
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

{#if lightboxOpen && item && galleryImages.length > 0}
    <div
        role="dialog"
        aria-modal="true"
        aria-label="תצוגת תמונה מוגדלת"
        class="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
        onclick={closeLightbox}
    >
        <button
            type="button"
            onclick={closeLightbox}
            aria-label="סגור"
            class="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl font-black flex items-center justify-center backdrop-blur-sm transition-colors z-10"
        >×</button>
        {#if galleryImages.length > 1}
            <button
                type="button"
                onclick={(e) => { e.stopPropagation(); prevImage(); }}
                aria-label="הקודם"
                class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl font-black flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >→</button>
            <button
                type="button"
                onclick={(e) => { e.stopPropagation(); nextImage(); }}
                aria-label="הבא"
                class="absolute left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl font-black flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >←</button>
            <span class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-bold z-10">
                📷 {galleryIndex + 1} / {galleryImages.length}
            </span>
        {/if}
        {#key galleryIndex}
            <img
                src={galleryImages[galleryIndex]}
                alt={item.label}
                onclick={(e) => e.stopPropagation()}
                class="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                in:fade={{ duration: 200 }}
            />
        {/key}
    </div>
{/if}

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
