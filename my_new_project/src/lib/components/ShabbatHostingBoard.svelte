<script lang="ts">
    import { onMount } from 'svelte';
    import { neighborhoodState } from '$lib/neighborhoodState.svelte';
    import { getCoordsFor, type Coord } from '$lib/neighborhoodCoords';
    import { _ } from 'svelte-i18n';

    interface DbItem {
        id: string;
        category: string;
        label: string;
        description: string;
        contact: string;
        phone: string;
        address: string;
        icon: string;
        color: string;
        neighborhood: string;
        city: string;
        extra_fields: string;
        status: string;
        user_id: string | null;
        created_at: string;
        view_count: number;
    }

    interface PendingRequest {
        requestItemId: string;
        guestName: string;
        guestPhone: string;
        guestMessage: string;
        hostItemId: string;
    }

    interface Props {
        items: DbItem[];
        city: string | null;
        userNeighborhood?: string | null;
        userCity?: string | null;
        userId?: string | null;
        isBanned?: boolean;
        blockedHostUserIds?: string[];
        approvedHostItemIds?: string[];
        pendingGuestRequestItemIds?: string[];
        rejectedGuestRequestItemIds?: string[];
        pendingRequestsForHost?: PendingRequest[];
        approvedGuestPhonesForHost?: string[];
    }

    let {
        items, city,
        userNeighborhood = null,
        userCity = null,
        userId = null,
        isBanned = false,
        blockedHostUserIds = [],
        approvedHostItemIds = [],
        pendingGuestRequestItemIds = [],
        rejectedGuestRequestItemIds = [],
        pendingRequestsForHost = [],
        approvedGuestPhonesForHost = [],
    }: Props = $props();

    onMount(() => {
        neighborhoodState.init(userNeighborhood, userCity);
    });

    // ====== Sectioning ======
    function haversineKm(a: Coord, b: Coord): number {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b[0] - a[0]);
        const dLon = toRad(b[1] - a[1]);
        const lat1 = toRad(a[0]);
        const lat2 = toRad(b[0]);
        const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }
    const SECTION_KEYS = ['section_my_neighborhood', 'section_my_city', 'section_nearby', 'section_national'];
    function sectionForItem(it: DbItem, uN: string, uC: string): number {
        const sCoord = getCoordsFor(it.neighborhood, it.city);
        const uCoord = getCoordsFor(uN, uC);
        const dist = haversineKm(sCoord, uCoord);
        if (it.city === uC) {
            if (it.neighborhood === uN || dist < 3) return 0;
            return 1;
        }
        if (dist < 35) return 2;
        return 3;
    }
    type Sectioned = DbItem & { _section: number };
    function groupBySection(arr: DbItem[]) {
        const uN = neighborhoodState.neighborhood;
        const uC = neighborhoodState.city;
        const enriched: Sectioned[] = arr.map(it => ({ ...it, _section: sectionForItem(it, uN, uC) }));
        const sorted = enriched.sort((a, b) => a._section - b._section);
        const groups: { section: number; items: Sectioned[] }[] = [];
        for (const it of sorted) {
            const last = groups[groups.length - 1];
            if (!last || last.section !== it._section) groups.push({ section: it._section, items: [it] });
            else last.items.push(it);
        }
        return groups;
    }

    function parseExtra(raw: string): Record<string, unknown> {
        try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
    }


    // ערכי נתונים (data values) מתורגמים בנקודת התצוגה בלבד - ההשוואות בקוד נשארות בעברית
    const VALUE_KEYS: Record<string, string> = {
        'ליל שבת': 'meal_friday', 'סעודת יום': 'meal_day', 'סעודה שלישית': 'meal_third', 'כל הסעודות': 'meal_all',
        'משפחה': 'guest_family', 'זוג': 'guest_couple', 'יחיד/ה': 'guest_single', 'הכל מתאים': 'guest_any',
    };
    function tv(v: string): string {
        return VALUE_KEYS[v] ? $_(`boards.values.${VALUE_KEYS[v]}`) : v;
    }

    function isHost(item: DbItem): boolean {
        return String(parseExtra(item.extra_fields).offer_type ?? '').includes('מציע');
    }

    function getMeal(item: DbItem): string { return String(parseExtra(item.extra_fields).meal ?? ''); }
    function getCapacity(item: DbItem): string {
        const v = parseExtra(item.extra_fields).capacity;
        return v ? String(v) : '';
    }
    function getGuestType(item: DbItem): string { return String(parseExtra(item.extra_fields).guest_type ?? ''); }
    function getFoodStyle(item: DbItem): string { return String(parseExtra(item.extra_fields).food_style ?? ''); }
    function getPreferences(item: DbItem): string {
        const ef = parseExtra(item.extra_fields);
        return String(ef.preferences ?? item.description ?? '');
    }
    function getFreeText(item: DbItem): string { return String(parseExtra(item.extra_fields).free_text ?? ''); }

    function formatDate(created_at: string): string {
        const d = new Date(created_at);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
    }

    function waLink(phone: string): string {
        const digits = (phone ?? '').replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    // --- שיתוף כרטיס ---
    let shareMenuItemId = $state<string | null>(null);
    function buildShareText(it: { label: string; city?: string; neighborhood?: string; description?: string }): { title: string; text: string; url: string } {
        const url = typeof window !== 'undefined' ? `${window.location.origin}/shabbat-hosting` : 'https://kehila-bashchuna.co.il/shabbat-hosting';
        const loc = [it.neighborhood, it.city].filter(Boolean).join(', ');
        const lines = [`🍽 ${$_('boards.shabbat.share_label')} - ${it.label}`];
        if (loc) lines.push(`📍 ${loc}`);
        if (it.description) lines.push(it.description);
        const text = lines.join('\n');
        return { title: $_('boards.shabbat.share_title'), text, url };
    }
    async function nativeShare(it: { id: string; label: string; city?: string; neighborhood?: string; description?: string }) {
        const payload = buildShareText(it);
        if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
            try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(payload); return; } catch {}
        }
        shareMenuItemId = it.id;
    }
    function shareTo(network: 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'copy', it: { label: string; city?: string; neighborhood?: string; description?: string }) {
        const { text, url } = buildShareText(it);
        const textWithUrl = `${text}\n${url}`;
        const enc = encodeURIComponent;
        if (network === 'whatsapp')      window.open(`https://wa.me/?text=${enc(textWithUrl)}`, '_blank');
        else if (network === 'telegram') window.open(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, '_blank');
        else if (network === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, '_blank');
        else if (network === 'x')        window.open(`https://twitter.com/intent/tweet?text=${enc(textWithUrl)}`, '_blank');
        else if (network === 'copy')     navigator.clipboard?.writeText(textWithUrl);
        shareMenuItemId = null;
    }

    const GUEST_EXPIRY_DAYS = 4;
    function isExpired(created_at: string): boolean {
        return (Date.now() - new Date(created_at).getTime()) > GUEST_EXPIRY_DAYS * 86400000;
    }

    const PAGE_SIZE = 8;
    function sortByNewest(arr: DbItem[]): DbItem[] {
        return [...arr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    let viewerIsHost = $derived(userId ? items.some(i => i.user_id === userId && isHost(i)) : false);
    let filteredGuests = $derived(sortByNewest(items.filter(i => !isHost(i) && !isExpired(i.created_at))));
    let filteredHosts = $derived(
        sortByNewest(items.filter(i =>
            isHost(i)
            && !(i.user_id && blockedHostUserIds.includes(i.user_id))
            && !removedItemIds.includes(i.id)
        ))
    );

    const hasReal = $derived(items.length > 0);

    let guestPage = $state(1);
    let hostPage  = $state(1);

    let guestTotalPages = $derived(Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE)));
    let hostTotalPages  = $derived(Math.max(1, Math.ceil(filteredHosts.length  / PAGE_SIZE)));

    let guestPageItems = $derived(filteredGuests.slice((guestPage - 1) * PAGE_SIZE, guestPage * PAGE_SIZE));
    let hostPageItems  = $derived(filteredHosts.slice((hostPage  - 1) * PAGE_SIZE, hostPage  * PAGE_SIZE));

    let guestPageGroups = $derived(groupBySection(guestPageItems));
    let hostPageGroups  = $derived(groupBySection(hostPageItems));

    // --- מצב אישורים (עדכוני אופטימיסטי) ---
    let localApprovedHostItemIds    = $state([...approvedHostItemIds]);
    let localPendingGuestItemIds    = $state([...pendingGuestRequestItemIds]);
    let localRejectedHostItemIds    = $state([...rejectedGuestRequestItemIds]);
    let localPendingForHost         = $state([...pendingRequestsForHost]);
    let localApprovedGuestPhones    = $state([...approvedGuestPhonesForHost]);

    // --- בקשת אירוח ---
    let requestingItemId  = $state<string | null>(null);
    let requestMessage    = $state('');
    let requestStatus     = $state<'idle' | 'sending' | 'success' | 'error'>('idle');
    let requestErrorMsg   = $state('');

    async function sendRequest(item: DbItem) {
        requestStatus = 'sending';
        try {
            const res = await fetch('/api/shabbat-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host_item_id: item.id, message: requestMessage }),
            });
            const data = await res.json();
            if (data.success) {
                localPendingGuestItemIds = [...localPendingGuestItemIds, item.id];
                requestingItemId = null;
                requestMessage = '';
                requestStatus = 'idle';
            } else {
                requestStatus = 'error';
                requestErrorMsg = data.message ?? $_('boards.shabbat.err_unknown');
            }
        } catch {
            requestStatus = 'error';
            requestErrorMsg = $_('boards.shabbat.err_network');
        }
    }

    // --- אישור/דחיית בקשה (מארח) ---
    let approvingRequestId = $state<string | null>(null);

    async function handleApprove(req: PendingRequest, action: 'approved' | 'rejected') {
        approvingRequestId = req.requestItemId;
        try {
            const res = await fetch('/api/shabbat-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_item_id: req.requestItemId, action }),
            });
            const data = await res.json();
            if (data.success) {
                localPendingForHost = localPendingForHost.filter(r => r.requestItemId !== req.requestItemId);
                if (action === 'approved' && req.guestPhone) {
                    localApprovedGuestPhones = [...localApprovedGuestPhones, req.guestPhone.trim()];
                }
            }
        } catch { /* silent */ }
        approvingRequestId = null;
    }

    // --- הסרת מודעה (freeze) על ידי הבעלים מהלוח הציבורי ---
    let removingItemId = $state<string | null>(null);
    let removedItemIds = $state<string[]>([]);
    let showFrozenInfoModal = $state(false);

    async function removeOwnAd(item: DbItem) {
        if (!confirm($_('boards.shabbat.confirm_remove'))) return;
        removingItemId = item.id;
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'freeze' }),
            });
            const data = await res.json();
            if (data.success) {
                removedItemIds = [...removedItemIds, item.id];
                showFrozenInfoModal = true;
            } else {
                alert(data.message ?? $_('boards.shabbat.err_remove'));
            }
        } catch {
            alert($_('boards.shabbat.err_network'));
        }
        removingItemId = null;
    }

    // --- דיווח על אורח ---
    let reportingItemId = $state<string | null>(null);
    let reportStatus    = $state<'idle' | 'sending' | 'success' | 'error'>('idle');
    let reportErrorMsg  = $state('');

    async function submitReport(item: DbItem) {
        reportStatus = 'sending';
        try {
            const res = await fetch('/api/shabbat-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reported_phone: item.phone, reported_contact: item.contact }),
            });
            const data = await res.json();
            if (data.success) {
                reportStatus = 'success';
                setTimeout(() => { reportingItemId = null; reportStatus = 'idle'; }, 2500);
            } else {
                reportStatus = 'error';
                reportErrorMsg = data.message ?? $_('boards.shabbat.err_unknown');
            }
        } catch {
            reportStatus = 'error';
            reportErrorMsg = $_('boards.shabbat.err_network');
        }
    }

    let showGuide = $state(false);

    const mockHosts = [
        { id: 'm1', label: 'משפחת כהן', city: 'ירושלים', neighborhood: 'קרית משה', meal: 'ליל שבת', capacity: '6', guest_type: 'משפחה', notes: 'מארחים בשמחה משפחה עם ילדים. אווירה חמה ושירי שבת.', contact: 'יוסי', phone: '050-1111111', date: '01/04/25' },
        { id: 'm2', label: 'משפחת לוי', city: 'בני ברק', neighborhood: 'רמת אהרן', meal: 'כל הסעודות', capacity: '4', guest_type: 'זוג', notes: 'מארחים זוגות צעירים, אפשר לינה.', contact: 'חיים', phone: '050-2222222', date: '28/03/25' },
        { id: 'm3', label: 'משפחת אדרי', city: 'אשדוד', neighborhood: 'רובע ז', meal: 'ליל שבת', capacity: '8', guest_type: 'הכל מתאים', notes: 'אווירה תימנית מסורתית, חמין משובח.', contact: 'יהודה', phone: '050-3333333', date: '10/04/25' },
    ];

    const mockGuests = [
        { id: 'g1', label: 'בחור ישיבה', city: 'ירושלים', neighborhood: '', meal: 'ליל שבת', capacity: '', guest_type: 'יחיד/ה', notes: 'בחור ישיבה רווק, מחפש משפחה לאירוח לשבת פרשת בלק.', contact: 'אהרן', phone: '052-1111111', date: '09/04/25' },
        { id: 'g2', label: 'רווקה', city: 'תל אביב', neighborhood: '', meal: 'כל הסעודות', capacity: '', guest_type: 'יחיד/ה', notes: 'מחפשת אווירה חמה לשבת חתן.', contact: 'שירה', phone: '052-2222222', date: '07/04/25' },
    ];

    let mockHostsFiltered = $derived(mockHosts.filter(m => !city || m.city === city));
    let mockGuestsFiltered = $derived(mockGuests.filter(m => !city || m.city === city));
</script>

{#snippet shareButton(it: { id: string; label: string; city?: string; neighborhood?: string; description?: string })}
    <div class="relative flex-shrink-0">
        <button
            type="button"
            onclick={() => nativeShare(it)}
            title={$_('boards.share')}
            aria-label={$_('boards.share')}
            class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
        </button>
        {#if shareMenuItemId === it.id}
            <div class="absolute right-0 bottom-full mb-1.5 z-30 w-44 rounded-xl bg-slate-900 border border-white/15 shadow-2xl p-1.5 flex flex-col gap-0.5">
                <button type="button" onclick={() => shareTo('whatsapp', it)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">💬 WhatsApp</button>
                <button type="button" onclick={() => shareTo('telegram', it)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">✈️ Telegram</button>
                <button type="button" onclick={() => shareTo('facebook', it)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">📘 Facebook</button>
                <button type="button" onclick={() => shareTo('x',        it)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">𝕏 Twitter</button>
                <button type="button" onclick={() => shareTo('copy',     it)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">📋 {$_('boards.copy_link')}</button>
                <button type="button" onclick={() => shareMenuItemId = null} class="flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg px-2.5 py-1 text-[10px] transition-colors">{$_('boards.close')}</button>
            </div>
        {/if}
    </div>
{/snippet}

<div class="min-h-screen bg-[#070b14] pt-6 pb-20" dir="rtl">
    <!-- Header -->
    <div class="max-w-4xl mx-auto px-4 text-center mb-6">
        <div class="relative mx-auto mb-3 inline-block" style="mask-image: radial-gradient(ellipse 90% 85% at center, black 55%, transparent 88%); -webkit-mask-image: radial-gradient(ellipse 90% 85% at center, black 55%, transparent 88%);">
            <img src="/images/shabat.png" alt={$_('boards.shabbat.alt_shabbat')} class="h-48 object-contain" />
        </div>
        <h1 class="text-3xl font-black text-white mb-2">
            {city ? $_('boards.shabbat.title_city', { values: { city } }) : $_('boards.shabbat.title_national')}
        </h1>
        <p class="text-gray-400 mb-3">
            {city ? $_('boards.shabbat.sub_city') : $_('boards.shabbat.sub_national')}
        </p>
    </div>

    <!-- Add button -->
    <div class="flex justify-center px-4 mb-6">
        <a
            href="/add/realestate"
            class="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-amber-500/30 transition-all hover:scale-105 text-sm"
        >
            <span class="font-black text-lg leading-none">+</span>
            {$_('boards.shabbat.add_cta')}
        </a>
    </div>

    <div class="max-w-4xl mx-auto px-4">

        {#if isBanned}
            <div class="flex flex-col items-center justify-center py-16 text-center gap-4">
                <span class="text-6xl">🚫</span>
                <h2 class="text-xl font-black text-red-400">{$_('boards.shabbat.banned_title')}</h2>
                <p class="text-gray-400 text-sm max-w-sm leading-relaxed">
                    {$_('boards.shabbat.banned_line1')}<br>
                    {$_('boards.shabbat.banned_line2')}
                </p>
                <a href="/" class="text-gray-500 hover:text-white text-sm transition-colors mt-2">{$_('boards.shabbat.back_home')}</a>
            </div>

        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                <!-- טור ימין: מחפשים להתארח -->
                <div>
                    <h2 class="text-center text-sm font-bold text-cyan-400 mb-3 tracking-wide">{$_('boards.shabbat.guests_col')}</h2>
                    <div class="flex flex-col gap-3">
                        {#if hasReal}
                            {#if filteredGuests.length === 0}
                                <p class="text-center text-gray-500 text-sm py-8">{$_('boards.shabbat.no_guests')}</p>
                            {:else}
                                {#each guestPageGroups as group (group.section + '-g-' + guestPage)}
                                <div class="flex items-center gap-3 mt-4 mb-2 first:mt-0">
                                    <h3 class="text-white font-black text-lg md:text-xl whitespace-nowrap">
                                        {$_('boards.' + SECTION_KEYS[group.section])}
                                        {#if group.section === 0 && neighborhoodState.neighborhood}
                                            <span class="text-cyan-300 font-bold">- {neighborhoodState.neighborhood}</span>
                                        {:else if group.section === 1 && neighborhoodState.city}
                                            <span class="text-cyan-300 font-bold">- {neighborhoodState.city}</span>
                                        {/if}
                                    </h3>
                                    <span class="text-gray-500 text-xs">({group.items.length})</span>
                                    <div class="flex-1 h-px bg-gradient-to-l from-cyan-500/40 via-white/10 to-transparent"></div>
                                </div>
                                {#each group.items as item}
                                    {@const meal = getMeal(item)}
                                    {@const capacity = getCapacity(item)}
                                    {@const guest_type = getGuestType(item)}
                                    {@const food_style = getFoodStyle(item)}
                                    {@const notes = getPreferences(item)}
                                    {@const freeText = getFreeText(item)}
                                    {@const dateStr = formatDate(item.created_at)}
                                    {@const canReport = viewerIsHost && userId !== item.user_id && localApprovedGuestPhones.includes(item.phone?.trim() ?? '')}
                                    <div class="rounded-2xl bg-[#0f172a] border border-cyan-500/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                        <div class="border-b border-cyan-500/20 p-3 flex items-center gap-3">
                                            <div class="w-11 h-11 rounded-full bg-cyan-500/15 flex items-center justify-center text-xl flex-shrink-0">🎒</div>
                                            <div class="flex-1 min-w-0">
                                                <h3 class="text-cyan-300 font-black text-lg">{item.label}</h3>
                                                {#if item.city}<p class="text-gray-400 text-sm">📍 {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</p>{/if}
                                            </div>
                                            {#if dateStr}<span class="text-xs text-gray-500 flex-shrink-0">{dateStr}</span>{/if}
                                        </div>
                                        <div class="p-3">
                                            <div class="flex flex-wrap gap-1.5 mb-2">
                                                {#if meal}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt={$_('boards.shabbat.alt_shabbat_shalom')} /> {tv(meal)}</span>{/if}
                                                {#if capacity}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">👥 {$_('boards.shabbat.up_to', { values: { n: capacity } })}</span>{/if}
                                                {#if guest_type}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">{tv(guest_type)}</span>{/if}
                                                {#if food_style}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">🍽 {food_style}</span>{/if}
                                            </div>
                                            {#if notes}<p class="text-gray-300 text-base leading-relaxed mb-2">{notes}</p>{/if}
                                            {#if freeText}<p class="text-cyan-300/80 text-sm italic mb-3">"{freeText}"</p>{/if}
                                            <div class="flex gap-2 mb-2">
                                                {@render shareButton(item)}
                                                <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-base">💬 WhatsApp</a>
                                                <a href="tel:{item.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl transition-colors text-base">📞</a>
                                            </div>
                                            {#if canReport}
                                                {#if reportingItemId === item.id}
                                                    <div class="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded-xl text-center space-y-2">
                                                        {#if reportStatus === 'success'}
                                                            <p class="text-green-400 text-xs font-bold">{$_('boards.shabbat.report_success')}</p>
                                                        {:else if reportStatus === 'error'}
                                                            <p class="text-red-400 text-xs">{reportErrorMsg}</p>
                                                            <button onclick={() => { reportingItemId = null; reportStatus = 'idle'; }} class="text-gray-400 text-xs underline">{$_('boards.close')}</button>
                                                        {:else}
                                                            <p class="text-red-300 text-xs font-bold">{$_('boards.shabbat.report_title')}</p>
                                                            <p class="text-gray-400 text-[10px]">{$_('boards.shabbat.report_note')}</p>
                                                            <div class="flex gap-2 justify-center">
                                                                <button
                                                                    onclick={() => submitReport(item)}
                                                                    disabled={reportStatus === 'sending'}
                                                                    class="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                                                >{reportStatus === 'sending' ? $_('boards.shabbat.sending') : $_('boards.shabbat.confirm_report')}</button>
                                                                <button onclick={() => { reportingItemId = null; reportStatus = 'idle'; }} class="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">{$_('boards.shabbat.cancel')}</button>
                                                            </div>
                                                        {/if}
                                                    </div>
                                                {:else}
                                                    <button
                                                        onclick={() => { reportingItemId = item.id; reportStatus = 'idle'; }}
                                                        class="mt-1.5 w-full text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                                                    >{$_('boards.shabbat.report_button')}</button>
                                                {/if}
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                                {/each}
                                {#if guestTotalPages > 1}
                                    <div class="flex items-center justify-center gap-2 pt-2">
                                        <button onclick={() => { guestPage = Math.max(1, guestPage - 1); }} disabled={guestPage === 1} class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-sm transition-colors">‹</button>
                                        <span class="text-xs text-gray-400">{$_('boards.page_of', { values: { current: guestPage, total: guestTotalPages } })}</span>
                                        <button onclick={() => { guestPage = Math.min(guestTotalPages, guestPage + 1); }} disabled={guestPage === guestTotalPages} class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-sm transition-colors">›</button>
                                    </div>
                                {/if}
                            {/if}
                        {:else}
                            {#each mockGuestsFiltered as m}
                                <div class="rounded-2xl bg-[#0f172a] border border-cyan-500/30 overflow-hidden shadow-xl relative">
                                    <div class="absolute top-2 left-2 z-10 text-[10px] font-bold bg-black/50 text-amber-300 px-2 py-0.5 rounded-full">{$_('boards.shabbat.example')}</div>
                                    <div class="border-b border-cyan-500/20 p-3 flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-full bg-cyan-500/15 flex items-center justify-center text-xl flex-shrink-0">🎒</div>
                                        <div class="flex-1 min-w-0">
                                            <h3 class="text-cyan-300 font-black text-lg">{m.label}</h3>
                                            <p class="text-gray-400 text-sm">📍 {m.city}{m.neighborhood ? ` · ${m.neighborhood}` : ''}</p>
                                        </div>
                                        <span class="text-xs text-gray-500 flex-shrink-0">{m.date}</span>
                                    </div>
                                    <div class="p-3">
                                        <div class="flex flex-wrap gap-1.5 mb-2">
                                            {#if m.meal}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt={$_('boards.shabbat.alt_shabbat_shalom')} /> {tv(m.meal)}</span>{/if}
                                            {#if m.capacity}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">👥 {$_('boards.shabbat.up_to', { values: { n: m.capacity } })}</span>{/if}
                                            {#if m.guest_type}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">{tv(m.guest_type)}</span>{/if}
                                        </div>
                                        <p class="text-gray-300 text-base leading-relaxed mb-2">{m.notes}</p>
                                        <div class="flex gap-2 mb-2">
                                            {@render shareButton({ id: `mockg-${m.label}`, label: m.label, city: m.city, neighborhood: m.neighborhood })}
                                            <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-base">💬 {$_('boards.shabbat.contact_btn')}</a>
                                            <a href="tel:{m.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl transition-colors text-base">📞</a>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>

                <!-- טור שמאל: מציעים לארח -->
                <div>
                    <h2 class="text-center text-sm font-bold text-amber-400 mb-3 tracking-wide">{$_('boards.shabbat.hosts_col')}</h2>
                    <div class="flex flex-col gap-3">
                        {#if hasReal}
                            {#if filteredHosts.length === 0}
                                <p class="text-center text-gray-500 text-sm py-8">{$_('boards.shabbat.no_hosts')}</p>
                            {:else}
                                {#each hostPageGroups as group (group.section + '-h-' + hostPage)}
                                <div class="flex items-center gap-3 mt-4 mb-2 first:mt-0">
                                    <h3 class="text-white font-black text-lg md:text-xl whitespace-nowrap">
                                        {$_('boards.' + SECTION_KEYS[group.section])}
                                        {#if group.section === 0 && neighborhoodState.neighborhood}
                                            <span class="text-amber-300 font-bold">- {neighborhoodState.neighborhood}</span>
                                        {:else if group.section === 1 && neighborhoodState.city}
                                            <span class="text-amber-300 font-bold">- {neighborhoodState.city}</span>
                                        {/if}
                                    </h3>
                                    <span class="text-gray-500 text-xs">({group.items.length})</span>
                                    <div class="flex-1 h-px bg-gradient-to-l from-amber-500/40 via-white/10 to-transparent"></div>
                                </div>
                                {#each group.items as item}
                                    {@const meal = getMeal(item)}
                                    {@const capacity = getCapacity(item)}
                                    {@const guest_type = getGuestType(item)}
                                    {@const food_style = getFoodStyle(item)}
                                    {@const notes = getPreferences(item)}
                                    {@const freeText = getFreeText(item)}
                                    {@const dateStr = formatDate(item.created_at)}
                                    {@const isOwnCard = item.user_id === userId}
                                    {@const isApproved = localApprovedHostItemIds.includes(item.id)}
                                    {@const isPending = localPendingGuestItemIds.includes(item.id)}
                                    {@const isRejected = localRejectedHostItemIds.includes(item.id)}
                                    {@const hostPendingReqs = localPendingForHost.filter(r => r.hostItemId === item.id)}
                                    <div class="rounded-2xl bg-[#0f172a] border border-amber-500/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                        <div class="border-b border-amber-500/20 p-3 flex items-center gap-3">
                                            <div class="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center text-xl flex-shrink-0">🏠</div>
                                            <div class="flex-1 min-w-0">
                                                <h3 class="text-amber-300 font-black text-lg">{item.label}</h3>
                                                {#if item.city}<p class="text-gray-400 text-sm">📍 {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</p>{/if}
                                            </div>
                                            <div class="flex items-center gap-1.5 flex-shrink-0">
                                                {#if isOwnCard}
                                                    <span class="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{$_('boards.shabbat.your_card')}</span>
                                                {/if}
                                                {#if dateStr}<span class="text-xs text-gray-500">{dateStr}</span>{/if}
                                            </div>
                                        </div>
                                        <div class="p-3">
                                            <div class="flex flex-wrap gap-1.5 mb-2">
                                                {#if meal}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt={$_('boards.shabbat.alt_shabbat_shalom')} /> {tv(meal)}</span>{/if}
                                                {#if capacity}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">👥 {$_('boards.shabbat.up_to', { values: { n: capacity } })}</span>{/if}
                                                {#if guest_type}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">{tv(guest_type)}</span>{/if}
                                                {#if food_style}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">🍽 {food_style}</span>{/if}
                                            </div>
                                            {#if notes}<p class="text-gray-300 text-base leading-relaxed mb-2">{notes}</p>{/if}
                                            {#if freeText}<p class="text-amber-300/80 text-sm italic mb-3">"{freeText}"</p>{/if}

                                            <!-- אזור טלפון / בקשת אירוח -->
                                            {#if isOwnCard}
                                                <!-- המארח רואה את הכרטיס שלו עצמו -->
                                                <div class="flex gap-2 mb-2">
                                                    {@render shareButton(item)}
                                                    <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-base">💬 WhatsApp</a>
                                                    <a href="tel:{item.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl transition-colors text-base">📞</a>
                                                    <button
                                                        type="button"
                                                        onclick={() => removeOwnAd(item)}
                                                        disabled={removingItemId === item.id}
                                                        class="flex items-center justify-center bg-white/10 hover:bg-red-600/30 text-gray-300 hover:text-red-300 font-bold py-2 px-3 rounded-xl transition-colors text-sm disabled:opacity-50"
                                                        title={$_('boards.shabbat.remove_title')}
                                                    >{removingItemId === item.id ? '...' : '🗑 ' + $_('boards.shabbat.remove')}</button>
                                                </div>
                                                <!-- בקשות ממתינות -->
                                                {#if hostPendingReqs.length > 0}
                                                    <div class="mt-2 rounded-xl bg-purple-900/20 border border-purple-500/30 p-3 space-y-2">
                                                        <p class="text-purple-300 text-xs font-bold">📬 {$_('boards.shabbat.pending_requests', { values: { n: hostPendingReqs.length } })}</p>
                                                        {#each hostPendingReqs as req}
                                                            <div class="bg-white/5 rounded-lg p-2.5 space-y-1.5">
                                                                <p class="text-white text-xs font-bold">{req.guestName}</p>
                                                                {#if req.guestMessage}<p class="text-gray-400 text-[11px] italic">"{req.guestMessage}"</p>{/if}
                                                                <div class="flex gap-2">
                                                                    <button
                                                                        onclick={() => handleApprove(req, 'approved')}
                                                                        disabled={approvingRequestId === req.requestItemId}
                                                                        class="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                                                                    >{approvingRequestId === req.requestItemId ? '...' : $_('boards.shabbat.approve')}</button>
                                                                    <button
                                                                        onclick={() => handleApprove(req, 'rejected')}
                                                                        disabled={approvingRequestId === req.requestItemId}
                                                                        class="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-gray-300 text-xs py-1.5 rounded-lg transition-colors"
                                                                    >{approvingRequestId === req.requestItemId ? '...' : $_('boards.shabbat.reject')}</button>
                                                                </div>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {:else}
                                                    <p class="text-[10px] text-gray-500 text-center">{$_('boards.shabbat.no_pending')}</p>
                                                {/if}
                                            {:else if isApproved}
                                                <!-- אורח שאושר - רואה טלפון -->
                                                <div class="mb-1">
                                                    <p class="text-green-400 text-[11px] font-bold text-center mb-1.5">{$_('boards.shabbat.approved_msg')}</p>
                                                    <div class="flex gap-2">
                                                        {@render shareButton(item)}
                                                        <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-base">💬 WhatsApp</a>
                                                        <a href="tel:{item.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl transition-colors text-base">📞</a>
                                                    </div>
                                                </div>
                                            {:else if isPending}
                                                <!-- בקשה ממתינה לאישור -->
                                                <div class="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
                                                    <span class="text-yellow-400 text-sm">⏳</span>
                                                    <span class="text-yellow-300 text-xs font-bold">{$_('boards.shabbat.pending_msg')}</span>
                                                </div>
                                            {:else if isRejected}
                                                <!-- בקשה נדחתה -->
                                                <div class="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-900/10 border border-red-500/20">
                                                    <span class="text-red-400 text-sm">✗</span>
                                                    <span class="text-red-300/70 text-xs">{$_('boards.shabbat.rejected_msg')}</span>
                                                </div>
                                            {:else if !userId}
                                                <!-- לא מחובר -->
                                                <a href="/login" class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/15 text-gray-400 hover:text-white text-xs transition-colors">
                                                    {$_('boards.shabbat.login_to_request')}
                                                </a>
                                            {:else if requestingItemId === item.id}
                                                <!-- טופס בקשה -->
                                                <div class="rounded-xl bg-purple-900/15 border border-purple-500/30 p-3 space-y-2">
                                                    <p class="text-purple-300 text-xs font-bold text-center">{$_('boards.shabbat.send_request_title')}</p>
                                                    <textarea
                                                        bind:value={requestMessage}
                                                        placeholder={$_('boards.shabbat.message_placeholder')}
                                                        rows="2"
                                                        class="w-full bg-white/5 border border-white/15 rounded-lg text-white text-xs p-2 resize-none placeholder:text-gray-500 focus:outline-none focus:border-purple-400"
                                                    ></textarea>
                                                    {#if requestStatus === 'error'}
                                                        <p class="text-red-400 text-[10px] text-center">{requestErrorMsg}</p>
                                                    {/if}
                                                    <div class="flex gap-2">
                                                        <button
                                                            onclick={() => sendRequest(item)}
                                                            disabled={requestStatus === 'sending'}
                                                            class="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                                                        >{requestStatus === 'sending' ? $_('boards.shabbat.sending') : $_('boards.shabbat.send_request')}</button>
                                                        <button
                                                            onclick={() => { requestingItemId = null; requestMessage = ''; requestStatus = 'idle'; }}
                                                            class="bg-white/10 hover:bg-white/20 text-gray-300 text-xs py-2 px-3 rounded-lg transition-colors"
                                                        >{$_('boards.shabbat.cancel')}</button>
                                                    </div>
                                                </div>
                                            {:else}
                                                <!-- כפתור שליחת בקשה -->
                                                <button
                                                    onclick={() => { requestingItemId = item.id; requestStatus = 'idle'; requestErrorMsg = ''; requestMessage = ''; }}
                                                    class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-sm transition-colors"
                                                >
                                                    {$_('boards.shabbat.send_request_title')}
                                                </button>
                                                <p class="text-[10px] text-gray-500 text-center mt-1">{$_('boards.shabbat.phone_after_approval')}</p>
                                            {/if}

                                            <p class="text-[10px] text-amber-500/70 text-center mt-2">{$_('boards.shabbat.no_show_warning')}</p>
                                        </div>
                                    </div>
                                {/each}
                                {/each}
                                {#if hostTotalPages > 1}
                                    <div class="flex items-center justify-center gap-2 pt-2">
                                        <button onclick={() => { hostPage = Math.max(1, hostPage - 1); }} disabled={hostPage === 1} class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-sm transition-colors">‹</button>
                                        <span class="text-xs text-gray-400">{$_('boards.page_of', { values: { current: hostPage, total: hostTotalPages } })}</span>
                                        <button onclick={() => { hostPage = Math.min(hostTotalPages, hostPage + 1); }} disabled={hostPage === hostTotalPages} class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-sm transition-colors">›</button>
                                    </div>
                                {/if}
                            {/if}
                        {:else}
                            {#each mockHostsFiltered as m}
                                <div class="rounded-2xl bg-[#0f172a] border border-amber-500/30 overflow-hidden shadow-xl relative">
                                    <div class="absolute top-2 left-2 z-10 text-[10px] font-bold bg-black/50 text-amber-300 px-2 py-0.5 rounded-full">{$_('boards.shabbat.example')}</div>
                                    <div class="border-b border-amber-500/20 p-3 flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center text-xl flex-shrink-0">🏠</div>
                                        <div class="flex-1 min-w-0">
                                            <h3 class="text-amber-300 font-black text-lg">{m.label}</h3>
                                            <p class="text-gray-400 text-sm">📍 {m.city}{m.neighborhood ? ` · ${m.neighborhood}` : ''}</p>
                                        </div>
                                        <span class="text-xs text-gray-500 flex-shrink-0">{m.date}</span>
                                    </div>
                                    <div class="p-3">
                                        <div class="flex flex-wrap gap-1.5 mb-2">
                                            {#if m.meal}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt={$_('boards.shabbat.alt_shabbat_shalom')} /> {tv(m.meal)}</span>{/if}
                                            {#if m.capacity}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">👥 {$_('boards.shabbat.up_to', { values: { n: m.capacity } })}</span>{/if}
                                            {#if m.guest_type}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">{tv(m.guest_type)}</span>{/if}
                                        </div>
                                        <p class="text-gray-300 text-base leading-relaxed mb-2">{m.notes}</p>
                                        <div class="flex gap-2">
                                            {@render shareButton({ id: `mockh-${m.label}`, label: m.label, city: m.city, neighborhood: m.neighborhood })}
                                            <button disabled class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/50 text-white/60 font-bold text-sm cursor-default">
                                                {$_('boards.shabbat.send_request_title')}
                                            </button>
                                        </div>
                                        <p class="text-[10px] text-gray-500 text-center mt-1">{$_('boards.shabbat.phone_after_approval')}</p>
                                        <p class="text-[10px] text-amber-500/70 text-center mt-1">{$_('boards.shabbat.no_show_warning')}</p>
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>

            </div>

            <!-- מדריך שימוש -->
            <div class="mt-8 rounded-2xl bg-[#0f172a] border border-purple-500/20 overflow-hidden">
                <button
                    class="w-full flex items-center justify-between p-4 text-right hover:bg-white/3 transition-colors"
                    onclick={() => showGuide = !showGuide}
                >
                    <span class="text-purple-300 font-bold text-base md:text-lg">{$_('boards.shabbat.guide_title')}</span>
                    <span class="text-gray-500 text-sm">{showGuide ? $_('boards.shabbat.guide_close') : $_('boards.shabbat.guide_open')}</span>
                </button>
                {#if showGuide}
                    <div class="px-4 pb-5 space-y-4 border-t border-purple-500/10">
                        <div class="flex gap-3 pt-4">
                            <span class="text-2xl flex-shrink-0">🏠</span>
                            <div>
                                <p class="text-amber-300 font-bold text-base mb-1">{$_('boards.shabbat.step1_title')}</p>
                                <p class="text-gray-300 text-sm leading-relaxed">{@html $_('boards.shabbat.step1_body')}</p>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <span class="text-2xl flex-shrink-0">🤝</span>
                            <div>
                                <p class="text-cyan-300 font-bold text-base mb-1">{$_('boards.shabbat.step2_title')}</p>
                                <p class="text-gray-300 text-sm leading-relaxed">{$_('boards.shabbat.step2_body')}</p>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <span class="text-2xl flex-shrink-0">✅</span>
                            <div>
                                <p class="text-green-300 font-bold text-base mb-1">{$_('boards.shabbat.step3_title')}</p>
                                <p class="text-gray-300 text-sm leading-relaxed">{$_('boards.shabbat.step3_body')}</p>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <span class="text-2xl flex-shrink-0">🚩</span>
                            <div>
                                <p class="text-red-300 font-bold text-base mb-1">{$_('boards.shabbat.step4_title')}</p>
                                <p class="text-gray-300 text-sm leading-relaxed">{@html $_('boards.shabbat.step4_body')}</p>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Back link -->
        <div class="text-center mt-8 flex flex-wrap justify-center gap-4">
            {#if city}
                <a href="/shabbat-hosting" class="text-amber-400 hover:text-amber-300 transition-colors text-sm">{$_('boards.shabbat.national_board')}</a>
            {/if}
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">{$_('boards.shabbat.back_home')}</a>
        </div>
    </div>
</div>

{#if showFrozenInfoModal}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onclick={() => (showFrozenInfoModal = false)}
        role="dialog"
        aria-modal="true"
    >
        <div
            class="max-w-md w-full rounded-2xl border-2 border-blue-500/40 bg-[#0f172a] shadow-2xl p-6 text-center"
            onclick={(e) => e.stopPropagation()}
            role="document"
        >
            <div class="text-5xl mb-3">❄️</div>
            <h3 class="text-blue-300 font-black text-lg mb-2">{$_('boards.shabbat.frozen_title')}</h3>
            <p class="text-gray-300 text-sm leading-relaxed mb-4">
                {@html $_('boards.shabbat.frozen_body')}
            </p>
            <div class="flex flex-col gap-2">
                <a
                    href="/profile"
                    class="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-2.5 rounded-xl transition-colors text-sm"
                >
                    {$_('boards.shabbat.open_profile')}
                </a>
                <button
                    type="button"
                    onclick={() => (showFrozenInfoModal = false)}
                    class="text-gray-400 hover:text-white text-xs font-bold py-2 transition-colors"
                >
                    {$_('boards.close')}
                </button>
            </div>
        </div>
    </div>
{/if}
