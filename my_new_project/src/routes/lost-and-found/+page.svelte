<script lang="ts">
    import { enhance } from '$app/forms';
    import { _ } from 'svelte-i18n';
    import type { PageData, ActionData } from './$types';
    import JsonLd from "$lib/components/JsonLd.svelte";
    import { breadcrumbSchema, collectionSchema, canonical } from "$lib/seo";
    import { heMatches } from "$lib/search";

    let { data, form }: { data: PageData; form: ActionData } = $props();

    type LafType = 'all' | 'lost' | 'found';
    let filter = $state<LafType>('all');
    let query  = $state('');

    // Message modal state
    let msgModal = $state<{ id: string; label: string; user_id: string } | null>(null);
    let msgSending = $state(false);

    // Resolve modal state
    let resolveModal = $state<{ id: string; label: string; user_id: string; type: 'lost' | 'found' } | null>(null);
    let resolveSending = $state(false);
    let resolvedIds = $state<string[]>([]);

    // Admin delete modal state
    let adminDeleteModal = $state<{ id: string; label: string } | null>(null);
    let adminDeleting = $state(false);

    $effect(() => {
        if (form?.msgSent) msgModal = null;
        if (form?.resolved && form.resolvedItemId) {
            resolvedIds = [...resolvedIds, form.resolvedItemId];
            resolveModal = null;
        }
        if (form?.adminDeleted && form.deletedItemId) {
            resolvedIds = [...resolvedIds, form.deletedItemId];
            adminDeleteModal = null;
        }
    });

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

    function getTags(extraFields: string): string[] {
        try {
            const t = JSON.parse(extraFields)?.tags;
            return Array.isArray(t) ? t.filter(Boolean) : [];
        } catch {
            return [];
        }
    }

    // תגיות/מיקום מתוך extra_fields — לשימוש בחיפוש
    function getSearchExtras(extraFields: string): string {
        try {
            const ef = JSON.parse(extraFields) ?? {};
            const tags = Array.isArray(ef.tags) ? ef.tags.join(' ') : (ef.tags ?? '');
            return [tags, ef.location ?? ''].filter(Boolean).join(' ');
        } catch {
            return '';
        }
    }

    function formatDate(iso: string): string {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return $_('listings.time_now_alt');
        if (mins < 60) return $_('listings.time_min', { values: { n: mins } });
        const hours = Math.floor(mins / 60);
        if (hours < 24) return $_('listings.time_hours_short', { values: { n: hours } });
        const days = Math.floor(hours / 24);
        if (days === 1) return $_('listings.time_yesterday');
        return $_('listings.time_days', { values: { n: days } });
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    // חיפוש חופשי לפי מילות תיאור, תגיות ומיקום (כותרת/תיאור/כתובת/שכונה/עיר/תגיות)
    function matchesQuery(item: typeof data.items[number], q: string): boolean {
        return heMatches(q, item.label, item.description, item.address, item.neighborhood, item.city, getSearchExtras(item.extra_fields));
    }

    // הרשימה אחרי סינון סוג + חיפוש + הסתרת מודעות שהוסרו. השרת כבר החזיר לפי
    // תאריך יורד (החדש למעלה), כך שהסינון שומר על הסדר.
    let base = $derived(
        data.items
            .filter(i => filter === 'all' || getItemType(i.extra_fields) === filter)
            .filter(i => matchesQuery(i, query))
            .filter(i => !resolvedIds.includes(i.id))
    );

    // קיבוץ ארצי: השכונה שלי → העיר שלי → כל הארץ
    let nbItems = $derived(
        data.userNeighborhood && data.userCity
            ? base.filter(i => i.city === data.userCity && i.neighborhood === data.userNeighborhood)
            : []
    );
    let cityItems = $derived(
        data.userCity
            ? base.filter(i => i.city === data.userCity && !(data.userNeighborhood && i.neighborhood === data.userNeighborhood))
            : []
    );
    let nationalItems = $derived(
        data.userCity
            ? base.filter(i => i.city !== data.userCity)
            : base
    );
</script>

<svelte:head>
    <title>פינת האבדות — לוח אבדות ומציאות ארצי | קהילה בשכונה</title>
    <meta name="description" content="פינת האבדות — לוח אבדות ומציאות ארצי. דיווח על פריט שאבד או נמצא בכל הארץ, חיפוש לפי תיאור, תגיות ומיקום, והחזרת אבדות לבעליהן." />
    <link rel="canonical" href={canonical('/lost-and-found')} />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
</svelte:head>
<JsonLd schema={[breadcrumbSchema([{ name: 'בית', path: '/' }, { name: 'פינת האבדות', path: '/lost-and-found' }]), collectionSchema({ name: 'פינת האבדות', description: 'פינת האבדות — לוח אבדות ומציאות ארצי. דיווח על פריט שאבד או נמצא בכל הארץ, והחזרת אבדות לבעליהן.', path: '/lost-and-found' })]} />

<!-- Message modal -->
{#if msgModal}
    <div class="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center px-4" dir="rtl">
        <div class="w-full max-w-md bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-black text-white text-lg">{$_('listings.laf_msg_title')}</h2>
                <button onclick={() => msgModal = null} class="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            <p class="text-gray-400 text-sm mb-4">
                {$_('listings.laf_regarding')} <span class="text-blue-300 font-bold">{msgModal.label}</span>
            </p>

            {#if form?.msgSent}
                <div class="text-center py-6">
                    <div class="text-4xl mb-2">✅</div>
                    <p class="text-green-300 font-bold">{$_('listings.laf_msg_sent')}</p>
                    <p class="text-gray-400 text-sm mt-1">{$_('listings.laf_msg_sent_sub')}</p>
                    <button onclick={() => msgModal = null}
                        class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm">
                        {$_('listings.close')}
                    </button>
                </div>
            {:else}
                {#if form?.msgError}
                    <div class="mb-3 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                        ⚠️ {form.msgError}
                    </div>
                {/if}

                <form method="POST" action="?/sendMessage"
                    use:enhance={() => {
                        msgSending = true;
                        return async ({ update }) => { await update(); msgSending = false; };
                    }}
                    class="space-y-4">
                    <input type="hidden" name="recipient_id" value={msgModal.user_id} />
                    <input type="hidden" name="item_label" value={msgModal.label} />

                    <div>
                        <label for="msg-body" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                            {$_('listings.laf_your_msg')}
                        </label>
                        <textarea
                            id="msg-body"
                            name="message"
                            rows="3"
                            required
                            placeholder={$_('listings.laf_msg_ph')}
                            class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                        ></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label for="msg-name" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                                {$_('listings.laf_your_name')}
                            </label>
                            <input id="msg-name" type="text" name="sender_name" required placeholder={$_('listings.ph_first_name')}
                                class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                        </div>
                        <div>
                            <label for="msg-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                                {$_('listings.phone_req')}
                            </label>
                            <input id="msg-phone" type="tel" name="sender_phone" required placeholder={$_('listings.ph_phone')}
                                class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                        </div>
                    </div>

                    <button type="submit" disabled={msgSending}
                        class="w-full py-3 rounded-xl font-black text-sm transition-all
                            {msgSending ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg'}">
                        {msgSending ? $_('listings.sending') : $_('listings.laf_send')}
                    </button>
                </form>
            {/if}
        </div>
    </div>
{/if}

<!-- Resolve modal -->
{#if resolveModal}
    <div class="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center px-4" dir="rtl">
        <div class="w-full max-w-md bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-black text-white text-lg">{$_('listings.laf_resolve_title')}</h2>
                <button onclick={() => resolveModal = null} class="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            <p class="text-gray-300 text-sm mb-3 leading-relaxed">
                {$_('listings.laf_resolve_blurb')}
            </p>
            <p class="text-gray-500 text-sm mb-5">
                {$_('listings.laf_resolve_before')} <span class="text-white font-bold">"{resolveModal.label}"</span>,
                {$_('listings.laf_resolve_after')}
            </p>

            {#if form?.resolveError}
                <div class="mb-3 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                    ⚠️ {form.resolveError}
                </div>
            {/if}

            <form method="POST" action="?/resolveItem"
                use:enhance={() => {
                    resolveSending = true;
                    return async ({ update }) => { await update(); resolveSending = false; };
                }}
                class="space-y-4">
                <input type="hidden" name="item_id" value={resolveModal.id} />
                <input type="hidden" name="item_user_id" value={resolveModal.user_id} />

                <div>
                    <label for="resolver-phone" class="block text-sm font-bold text-white mb-2">
                        {resolveModal.type === 'lost'
                            ? $_('listings.laf_q_lost')
                            : $_('listings.laf_q_found')}
                    </label>
                    <input
                        id="resolver-phone"
                        type="tel"
                        name="resolver_phone"
                        required
                        placeholder={$_('listings.ph_phone')}
                        class="w-full bg-white/5 border border-white/10 focus:border-green-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                    />
                    <p class="text-gray-500 text-xs mt-1.5">{$_('listings.laf_privacy')}</p>
                </div>

                <div class="flex gap-3">
                    <button type="button" onclick={() => resolveModal = null}
                        class="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10">
                        {$_('listings.cancel')}
                    </button>
                    <button type="submit" disabled={resolveSending}
                        class="flex-1 py-3 rounded-xl font-black text-sm transition-all
                            {resolveSending ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white shadow-lg'}">
                        {resolveSending ? $_('listings.laf_removing') : $_('listings.laf_resolve_submit')}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Admin delete modal (super-admin only) -->
{#if adminDeleteModal}
    <div class="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center px-4" dir="rtl">
        <div class="w-full max-w-md bg-[#1e293b] rounded-2xl border border-red-500/30 shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-black text-white text-lg">{$_('listings.laf_admin_del_title')}</h2>
                <button onclick={() => adminDeleteModal = null} class="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            <p class="text-gray-300 text-sm mb-5 leading-relaxed">
                {$_('listings.laf_admin_del_before')} <span class="text-white font-bold">"{adminDeleteModal.label}"</span> {$_('listings.laf_admin_del_after')}
            </p>

            {#if form?.adminDeleteError}
                <div class="mb-3 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                    ⚠️ {form.adminDeleteError}
                </div>
            {/if}

            <form method="POST" action="?/adminDeleteItem"
                use:enhance={() => {
                    adminDeleting = true;
                    return async ({ update }) => { await update(); adminDeleting = false; };
                }}
                class="flex gap-3">
                <input type="hidden" name="item_id" value={adminDeleteModal.id} />
                <button type="button" onclick={() => adminDeleteModal = null}
                    class="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10">
                    {$_('listings.cancel')}
                </button>
                <button type="submit" disabled={adminDeleting}
                    class="flex-1 py-3 rounded-xl font-black text-sm transition-all
                        {adminDeleting ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white shadow-lg'}">
                    {adminDeleting ? $_('listings.laf_admin_deleting') : $_('listings.laf_admin_del_submit')}
                </button>
            </form>
        </div>
    </div>
{/if}

<div class="max-w-2xl mx-auto px-4 py-8" dir="rtl">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-2xl font-black text-white flex items-center gap-2">
                🔍 {$_('listings.laf_title')}
            </h1>
            <p class="text-gray-400 text-sm mt-0.5">
                {$_('listings.laf_national_board')} · {$_('listings.laf_active_count', { values: { n: data.items.length } })}
            </p>
            {#if data.returnedCount > 0}
                <p class="text-green-400 text-xs mt-1 font-bold">{$_('listings.laf_returned', { values: { n: data.returnedCount } })}</p>
            {/if}
        </div>
        <a
            href="/lost-and-found/add"
            class="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg"
        >
            + {$_('listings.laf_add')}
        </a>
    </div>

    <!-- קישור לאתר הייעודי (אותן מודעות, מסונכרן) -->
    <a
        href="https://avedot.gofreeil.com"
        target="_blank"
        rel="noopener"
        class="flex items-center justify-between gap-3 mb-6 bg-gradient-to-l from-cyan-500/10 to-blue-500/10 border border-cyan-400/25 hover:border-cyan-400/50 rounded-xl px-4 py-3 transition-colors"
    >
        <span class="text-sm text-cyan-100">
            {$_('listings.laf_avedot_pre')}<span class="font-bold">avedot.gofreeil.com</span>{$_('listings.laf_avedot_post')}
        </span>
        <span class="text-cyan-300 text-sm font-bold whitespace-nowrap">{$_('listings.laf_avedot_cta')}</span>
    </a>

    <!-- Search -->
    <div class="relative mb-4">
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">🔎</span>
        <input
            type="search"
            bind:value={query}
            placeholder={$_('listings.laf_search_ph')}
            class="w-full bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-xl pr-11 pl-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
        />
        {#if query}
            <button type="button" onclick={() => query = ''}
                aria-label={$_('listings.gv_clear_search')}
                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-lg leading-none">✕</button>
        {/if}
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-6">
        {#each [
            { value: 'all',   label: $_('listings.laf_filter_all'), count: data.items.length },
            { value: 'lost',  label: $_('listings.laf_lost'),       count: data.items.filter(i => getItemType(i.extra_fields) === 'lost').length },
            { value: 'found', label: $_('listings.laf_found'),      count: data.items.filter(i => getItemType(i.extra_fields) === 'found').length },
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

    <!-- Card snippet (used in every section) -->
    {#snippet card(item: typeof data.items[number])}
        {@const type    = getItemType(item.extra_fields)}
        {@const image   = getItemImage(item.extra_fields)}
        {@const tags    = getTags(item.extra_fields)}
        {@const isOwner = data.currentUserId && item.user_id === data.currentUserId}
        <a href="/lost-and-found/{item.id}" class="relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/8 transition-all block no-underline group">
            {#if image}
                <div class="relative w-full h-40">
                    <img src={image} alt={item.label} class="w-full h-full object-cover" />
                    <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 to-transparent"></div>
                </div>
            {/if}

            <!-- Type badge -->
            <div class="absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-bl-xl
                {type === 'found' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">
                {type === 'found' ? $_('listings.laf_found') : $_('listings.laf_lost')}
            </div>

            <div class="p-4 {image ? '' : 'mt-3'}">
                <h3 class="font-black text-white text-base mb-2 leading-tight">{item.label}</h3>

                {#if item.description}
                    <p class="text-gray-400 text-sm mb-2 leading-snug">{item.description.replace(/^(❓ אבד|✅ נמצא) \| /, '')}</p>
                {/if}

                {#if tags.length > 0}
                    <div class="flex flex-wrap gap-1.5 mb-3">
                        {#each tags as tag}
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/20">{tag}</span>
                        {/each}
                    </div>
                {/if}

                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                    {#if item.address}<span>📍 {item.address}</span>{/if}
                    {#if item.contact}<span>👤 {item.contact}</span>{/if}
                    {#if item.created_at}<span>🕒 {formatDate(item.created_at)}</span>{/if}
                </div>

                <!-- מיכל פריסה בלבד; ה-stopPropagation מונע מלחיצה על הכפתורים
                     להפעיל גם את לחיצת הכרטיס. role="presentation" - הכפתורים
                     שבתוכו הם אלה שנגישים, לא ה-div עצמו -->
                <div class="flex flex-col gap-2" role="presentation" onclick={(e) => e.stopPropagation()}>
                    {#if item.phone}
                        <div class="flex gap-2">
                            <button type="button"
                                onclick={() => window.location.href = `tel:${item.phone}`}
                                class="flex-1 text-center py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm font-bold transition-all border border-blue-500/30">
                                📞 {item.phone}
                            </button>
                            <button type="button"
                                onclick={() => window.open(waLink(item.phone), '_blank')}
                                aria-label={$_('listings.laf_wa_aria')}
                                class="px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white text-sm font-bold transition-all border border-green-500/30">
                                💬
                            </button>
                        </div>
                    {/if}

                    {#if item.user_id && !isOwner}
                        <button
                            onclick={() => msgModal = { id: item.id, label: item.label, user_id: item.user_id! }}
                            class="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-sm font-bold transition-all border border-purple-500/30"
                        >
                            {$_('listings.laf_msg_title')}
                        </button>
                    {/if}

                    {#if isOwner}
                        <button
                            onclick={() => resolveModal = { id: item.id, label: item.label, user_id: item.user_id!, type }}
                            class="w-full py-2 rounded-xl bg-red-600/15 hover:bg-red-600/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all border border-red-500/20"
                        >
                            {$_('listings.laf_remove_listing')}
                        </button>
                    {/if}

                    {#if data.isSuperAdmin}
                        <button
                            onclick={() => adminDeleteModal = { id: item.id, label: item.label }}
                            class="w-full py-2 rounded-xl bg-red-900/30 hover:bg-red-800/50 text-red-300 hover:text-white text-xs font-bold transition-all border border-red-500/30"
                        >
                            {$_('listings.laf_admin_del_card')}
                        </button>
                    {/if}
                </div>
            </div>
        </a>
    {/snippet}

    <!-- Section divider -->
    {#snippet divider(icon: string, title: string, count: number)}
        <div class="flex items-center gap-3 mt-8 mb-4 first:mt-0">
            <div class="h-px flex-1 bg-white/10"></div>
            <span class="text-sm font-black text-gray-300 whitespace-nowrap flex items-center gap-1.5">
                {icon} {title}
                <span class="text-xs font-bold text-gray-500">({count})</span>
            </span>
            <div class="h-px flex-1 bg-white/10"></div>
        </div>
    {/snippet}

    <!-- Items list — ארצי: השכונה שלי → העיר שלי → כל הארץ -->
    {#if base.length === 0}
        <div class="text-center py-16 text-gray-500">
            <div class="text-5xl mb-3">🔍</div>
            {#if query}
                <p class="font-bold text-lg text-gray-400">{$_('listings.laf_no_results', { values: { q: query } })}</p>
                <p class="text-sm mt-1">{$_('listings.laf_no_results_sub')}</p>
                <button type="button" onclick={() => query = ''}
                    class="mt-4 inline-block bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                    {$_('listings.gv_clear_search')}
                </button>
            {:else}
                <p class="font-bold text-lg text-gray-400">{$_('listings.laf_empty_generic')}</p>
                <p class="text-sm mt-1">{$_('listings.laf_be_first')}</p>
                <a href="/lost-and-found/add"
                   class="mt-4 inline-block bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                    + {$_('listings.laf_add')}
                </a>
            {/if}
        </div>
    {:else}
        {#if nbItems.length > 0}
            {@render divider('🏘️', `${$_('listings.laf_sec_neighborhood')} · ${data.userNeighborhood}`, nbItems.length)}
            <div class="space-y-3">
                {#each nbItems as item (item.id)}{@render card(item)}{/each}
            </div>
        {/if}

        {#if cityItems.length > 0}
            {@render divider('🏙️', data.userCity, cityItems.length)}
            <div class="space-y-3">
                {#each cityItems as item (item.id)}{@render card(item)}{/each}
            </div>
        {/if}

        {#if nationalItems.length > 0}
            {#if nbItems.length > 0 || cityItems.length > 0}
                {@render divider('🇮🇱', $_('listings.laf_sec_national'), nationalItems.length)}
            {/if}
            <div class="space-y-3">
                {#each nationalItems as item (item.id)}{@render card(item)}{/each}
            </div>
        {/if}
    {/if}

    <!-- Back -->
    <div class="text-center mt-8">
        <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← {$_('listings.back_home')}
        </a>
    </div>
</div>
