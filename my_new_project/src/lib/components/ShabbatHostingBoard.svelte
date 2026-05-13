<script lang="ts">
    import { onMount } from 'svelte';
    import { neighborhoodState } from '$lib/neighborhoodState.svelte';
    import { getCoordsFor, type Coord } from '$lib/neighborhoodCoords';

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
    const SECTION_TITLES = ['בשכונה שלי', 'בעיר שלי', 'בערים סביבי', 'ארצי'];
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
        const lines = [`🍽 אירוח לשבת — ${it.label}`];
        if (loc) lines.push(`📍 ${loc}`);
        if (it.description) lines.push(it.description);
        const text = lines.join('\n');
        return { title: 'אירוח לשבת — קהילה בשכונה', text, url };
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
                requestErrorMsg = data.message ?? 'שגיאה לא ידועה';
            }
        } catch {
            requestStatus = 'error';
            requestErrorMsg = 'שגיאת תקשורת — נסה שוב';
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
        if (!confirm('להסיר את המודעה מהלוח?')) return;
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
                alert(data.message ?? 'שגיאה בהסרה');
            }
        } catch {
            alert('שגיאת תקשורת — נסה שוב');
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
                reportErrorMsg = data.message ?? 'שגיאה לא ידועה';
            }
        } catch {
            reportStatus = 'error';
            reportErrorMsg = 'שגיאת תקשורת — נסה שוב';
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
            title="שיתוף"
            aria-label="שיתוף"
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
                <button type="button" onclick={() => shareTo('copy',     it)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">📋 העתק קישור</button>
                <button type="button" onclick={() => shareMenuItemId = null} class="flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg px-2.5 py-1 text-[10px] transition-colors">סגור</button>
            </div>
        {/if}
    </div>
{/snippet}

<div class="min-h-screen bg-[#070b14] pt-6 pb-20" dir="rtl">
    <!-- Header -->
    <div class="max-w-4xl mx-auto px-4 text-center mb-6">
        <div class="relative mx-auto mb-3 inline-block" style="mask-image: radial-gradient(ellipse 90% 85% at center, black 55%, transparent 88%); -webkit-mask-image: radial-gradient(ellipse 90% 85% at center, black 55%, transparent 88%);">
            <img src="/images/shabat.png" alt="שבת" class="h-48 object-contain" />
        </div>
        <h1 class="text-3xl font-black text-white mb-2">
            {city ? `אירוח לשבת ב${city}` : 'לוח אירוח לשבת'}
        </h1>
        <p class="text-gray-400 mb-3">
            {city ? 'מארחים ומתארחים בעיר שלך' : 'לוח ארצי — מציעים לארח ומחפשים להתארח לשבת'}
        </p>
    </div>

    <!-- Add button -->
    <div class="flex justify-center px-4 mb-6">
        <a
            href="/add/realestate"
            class="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-amber-500/30 transition-all hover:scale-105 text-sm"
        >
            <span class="font-black text-lg leading-none">+</span>
            הוסף הזמנה או בקשה לאירוח
        </a>
    </div>

    <div class="max-w-4xl mx-auto px-4">

        {#if isBanned}
            <div class="flex flex-col items-center justify-center py-16 text-center gap-4">
                <span class="text-6xl">🚫</span>
                <h2 class="text-xl font-black text-red-400">חשבונך חסום מלוח האירוח</h2>
                <p class="text-gray-400 text-sm max-w-sm leading-relaxed">
                    שני מארחים דיווחו על התנהגות לא ראויה מצדך.<br>
                    אינך יכול לצפות ברשימת המארחים ולא להופיע ברשימת מבקשי האירוח.
                </p>
                <a href="/" class="text-gray-500 hover:text-white text-sm transition-colors mt-2">← חזרה לדף הראשי</a>
            </div>

        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                <!-- טור ימין: מחפשים להתארח -->
                <div>
                    <h2 class="text-center text-sm font-bold text-cyan-400 mb-3 tracking-wide">מחפשים להתארח</h2>
                    <div class="flex flex-col gap-3">
                        {#if hasReal}
                            {#if filteredGuests.length === 0}
                                <p class="text-center text-gray-500 text-sm py-8">אין מחפשים כרגע</p>
                            {:else}
                                {#each guestPageGroups as group (group.section + '-g-' + guestPage)}
                                <div class="flex items-center gap-3 mt-4 mb-2 first:mt-0">
                                    <h3 class="text-white font-black text-lg md:text-xl whitespace-nowrap">
                                        {SECTION_TITLES[group.section]}
                                        {#if group.section === 0 && neighborhoodState.neighborhood}
                                            <span class="text-cyan-300 font-bold">— {neighborhoodState.neighborhood}</span>
                                        {:else if group.section === 1 && neighborhoodState.city}
                                            <span class="text-cyan-300 font-bold">— {neighborhoodState.city}</span>
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
                                                {#if meal}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="שבת שלום" /> {meal}</span>{/if}
                                                {#if capacity}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">👥 עד {capacity}</span>{/if}
                                                {#if guest_type}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">{guest_type}</span>{/if}
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
                                                            <p class="text-green-400 text-xs font-bold">✓ הדיווח נשלח בהצלחה</p>
                                                        {:else if reportStatus === 'error'}
                                                            <p class="text-red-400 text-xs">{reportErrorMsg}</p>
                                                            <button onclick={() => { reportingItemId = null; reportStatus = 'idle'; }} class="text-gray-400 text-xs underline">סגור</button>
                                                        {:else}
                                                            <p class="text-red-300 text-xs font-bold">דיווח על אורח לא ראוי</p>
                                                            <p class="text-gray-400 text-[10px]">פעולה זו תישמר. אם 2 מארחים ידווחו — האורח יחסם.</p>
                                                            <div class="flex gap-2 justify-center">
                                                                <button
                                                                    onclick={() => submitReport(item)}
                                                                    disabled={reportStatus === 'sending'}
                                                                    class="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                                                >{reportStatus === 'sending' ? 'שולח...' : '✓ אשר דיווח'}</button>
                                                                <button onclick={() => { reportingItemId = null; reportStatus = 'idle'; }} class="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">ביטול</button>
                                                            </div>
                                                        {/if}
                                                    </div>
                                                {:else}
                                                    <button
                                                        onclick={() => { reportingItemId = item.id; reportStatus = 'idle'; }}
                                                        class="mt-1.5 w-full text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                                                    >🚩 דווח על אורח זה כלא ראוי</button>
                                                {/if}
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                                {/each}
                                {#if guestTotalPages > 1}
                                    <div class="flex items-center justify-center gap-2 pt-2">
                                        <button onclick={() => { guestPage = Math.max(1, guestPage - 1); }} disabled={guestPage === 1} class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-sm transition-colors">‹</button>
                                        <span class="text-xs text-gray-400">עמוד {guestPage} מתוך {guestTotalPages}</span>
                                        <button onclick={() => { guestPage = Math.min(guestTotalPages, guestPage + 1); }} disabled={guestPage === guestTotalPages} class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-sm transition-colors">›</button>
                                    </div>
                                {/if}
                            {/if}
                        {:else}
                            {#each mockGuestsFiltered as m}
                                <div class="rounded-2xl bg-[#0f172a] border border-cyan-500/30 overflow-hidden shadow-xl relative">
                                    <div class="absolute top-2 left-2 z-10 text-[10px] font-bold bg-black/50 text-amber-300 px-2 py-0.5 rounded-full">דוגמה</div>
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
                                            {#if m.meal}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="שבת שלום" /> {m.meal}</span>{/if}
                                            {#if m.capacity}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">👥 עד {m.capacity}</span>{/if}
                                            {#if m.guest_type}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">{m.guest_type}</span>{/if}
                                        </div>
                                        <p class="text-gray-300 text-base leading-relaxed mb-2">{m.notes}</p>
                                        <div class="flex gap-2 mb-2">
                                            {@render shareButton({ id: `mockg-${m.label}`, label: m.label, city: m.city, neighborhood: m.neighborhood })}
                                            <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-base">💬 צור קשר</a>
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
                    <h2 class="text-center text-sm font-bold text-amber-400 mb-3 tracking-wide">מציעים לארח</h2>
                    <div class="flex flex-col gap-3">
                        {#if hasReal}
                            {#if filteredHosts.length === 0}
                                <p class="text-center text-gray-500 text-sm py-8">אין מארחים כרגע</p>
                            {:else}
                                {#each hostPageGroups as group (group.section + '-h-' + hostPage)}
                                <div class="flex items-center gap-3 mt-4 mb-2 first:mt-0">
                                    <h3 class="text-white font-black text-lg md:text-xl whitespace-nowrap">
                                        {SECTION_TITLES[group.section]}
                                        {#if group.section === 0 && neighborhoodState.neighborhood}
                                            <span class="text-amber-300 font-bold">— {neighborhoodState.neighborhood}</span>
                                        {:else if group.section === 1 && neighborhoodState.city}
                                            <span class="text-amber-300 font-bold">— {neighborhoodState.city}</span>
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
                                                    <span class="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">הכרטיס שלך</span>
                                                {/if}
                                                {#if dateStr}<span class="text-xs text-gray-500">{dateStr}</span>{/if}
                                            </div>
                                        </div>
                                        <div class="p-3">
                                            <div class="flex flex-wrap gap-1.5 mb-2">
                                                {#if meal}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="שבת שלום" /> {meal}</span>{/if}
                                                {#if capacity}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">👥 עד {capacity}</span>{/if}
                                                {#if guest_type}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">{guest_type}</span>{/if}
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
                                                        title="הסר את המודעה מהלוח — תועבר לפרופיל לסטטוס 'מוקפא'"
                                                    >{removingItemId === item.id ? '...' : '🗑 הסר'}</button>
                                                </div>
                                                <!-- בקשות ממתינות -->
                                                {#if hostPendingReqs.length > 0}
                                                    <div class="mt-2 rounded-xl bg-purple-900/20 border border-purple-500/30 p-3 space-y-2">
                                                        <p class="text-purple-300 text-xs font-bold">📬 בקשות אירוח ממתינות ({hostPendingReqs.length})</p>
                                                        {#each hostPendingReqs as req}
                                                            <div class="bg-white/5 rounded-lg p-2.5 space-y-1.5">
                                                                <p class="text-white text-xs font-bold">{req.guestName}</p>
                                                                {#if req.guestMessage}<p class="text-gray-400 text-[11px] italic">"{req.guestMessage}"</p>{/if}
                                                                <div class="flex gap-2">
                                                                    <button
                                                                        onclick={() => handleApprove(req, 'approved')}
                                                                        disabled={approvingRequestId === req.requestItemId}
                                                                        class="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                                                                    >{approvingRequestId === req.requestItemId ? '...' : '✓ אשר'}</button>
                                                                    <button
                                                                        onclick={() => handleApprove(req, 'rejected')}
                                                                        disabled={approvingRequestId === req.requestItemId}
                                                                        class="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-gray-300 text-xs py-1.5 rounded-lg transition-colors"
                                                                    >{approvingRequestId === req.requestItemId ? '...' : '✗ דחה'}</button>
                                                                </div>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {:else}
                                                    <p class="text-[10px] text-gray-500 text-center">אין בקשות ממתינות כרגע</p>
                                                {/if}
                                            {:else if isApproved}
                                                <!-- אורח שאושר — רואה טלפון -->
                                                <div class="mb-1">
                                                    <p class="text-green-400 text-[11px] font-bold text-center mb-1.5">✅ בקשתך אושרה — הנה פרטי הקשר</p>
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
                                                    <span class="text-yellow-300 text-xs font-bold">ממתין לאישור המארח</span>
                                                </div>
                                            {:else if isRejected}
                                                <!-- בקשה נדחתה -->
                                                <div class="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-900/10 border border-red-500/20">
                                                    <span class="text-red-400 text-sm">✗</span>
                                                    <span class="text-red-300/70 text-xs">הבקשה נדחתה</span>
                                                </div>
                                            {:else if !userId}
                                                <!-- לא מחובר -->
                                                <a href="/login" class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/15 text-gray-400 hover:text-white text-xs transition-colors">
                                                    🔐 התחבר כדי לשלוח בקשת אירוח
                                                </a>
                                            {:else if requestingItemId === item.id}
                                                <!-- טופס בקשה -->
                                                <div class="rounded-xl bg-purple-900/15 border border-purple-500/30 p-3 space-y-2">
                                                    <p class="text-purple-300 text-xs font-bold text-center">🤝 שלח בקשת אירוח</p>
                                                    <textarea
                                                        bind:value={requestMessage}
                                                        placeholder="הודעה אישית למארח (לא חובה)..."
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
                                                        >{requestStatus === 'sending' ? 'שולח...' : '✓ שלח בקשה'}</button>
                                                        <button
                                                            onclick={() => { requestingItemId = null; requestMessage = ''; requestStatus = 'idle'; }}
                                                            class="bg-white/10 hover:bg-white/20 text-gray-300 text-xs py-2 px-3 rounded-lg transition-colors"
                                                        >ביטול</button>
                                                    </div>
                                                </div>
                                            {:else}
                                                <!-- כפתור שליחת בקשה -->
                                                <button
                                                    onclick={() => { requestingItemId = item.id; requestStatus = 'idle'; requestErrorMsg = ''; requestMessage = ''; }}
                                                    class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-sm transition-colors"
                                                >
                                                    🤝 שלח בקשת אירוח
                                                </button>
                                                <p class="text-[10px] text-gray-500 text-center mt-1">הטלפון יחשף לאחר אישור המארח</p>
                                            {/if}

                                            <p class="text-[10px] text-amber-500/70 text-center mt-2">⚠️ אין להגיע ללא תיאום מראש</p>
                                        </div>
                                    </div>
                                {/each}
                                {/each}
                                {#if hostTotalPages > 1}
                                    <div class="flex items-center justify-center gap-2 pt-2">
                                        <button onclick={() => { hostPage = Math.max(1, hostPage - 1); }} disabled={hostPage === 1} class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-sm transition-colors">‹</button>
                                        <span class="text-xs text-gray-400">עמוד {hostPage} מתוך {hostTotalPages}</span>
                                        <button onclick={() => { hostPage = Math.min(hostTotalPages, hostPage + 1); }} disabled={hostPage === hostTotalPages} class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-sm transition-colors">›</button>
                                    </div>
                                {/if}
                            {/if}
                        {:else}
                            {#each mockHostsFiltered as m}
                                <div class="rounded-2xl bg-[#0f172a] border border-amber-500/30 overflow-hidden shadow-xl relative">
                                    <div class="absolute top-2 left-2 z-10 text-[10px] font-bold bg-black/50 text-amber-300 px-2 py-0.5 rounded-full">דוגמה</div>
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
                                            {#if m.meal}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="שבת שלום" /> {m.meal}</span>{/if}
                                            {#if m.capacity}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">👥 עד {m.capacity}</span>{/if}
                                            {#if m.guest_type}<span class="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">{m.guest_type}</span>{/if}
                                        </div>
                                        <p class="text-gray-300 text-base leading-relaxed mb-2">{m.notes}</p>
                                        <div class="flex gap-2">
                                            {@render shareButton({ id: `mockh-${m.label}`, label: m.label, city: m.city, neighborhood: m.neighborhood })}
                                            <button disabled class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/50 text-white/60 font-bold text-sm cursor-default">
                                                🤝 שלח בקשת אירוח
                                            </button>
                                        </div>
                                        <p class="text-[10px] text-gray-500 text-center mt-1">הטלפון יחשף לאחר אישור המארח</p>
                                        <p class="text-[10px] text-amber-500/70 text-center mt-1">⚠️ אין להגיע ללא תיאום מראש</p>
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
                    <span class="text-purple-300 font-bold text-base md:text-lg">📖 כיצד מערכת האירוח עובדת?</span>
                    <span class="text-gray-500 text-sm">{showGuide ? '▲ סגור' : '▼ הצג מדריך'}</span>
                </button>
                {#if showGuide}
                    <div class="px-4 pb-5 space-y-4 border-t border-purple-500/10">
                        <div class="flex gap-3 pt-4">
                            <span class="text-2xl flex-shrink-0">🏠</span>
                            <div>
                                <p class="text-amber-300 font-bold text-base mb-1">שלב 1 — המארח מפרסם הזמנה</p>
                                <p class="text-gray-300 text-sm leading-relaxed">המארח מפרסם כרטיס עם סגנון הסעודה, כמות המקומות וסגנון האירוח. הטלפון שלו <strong class="text-white/70">אינו מוצג</strong> ברבים — רק לאורחים שאישר.</p>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <span class="text-2xl flex-shrink-0">🤝</span>
                            <div>
                                <p class="text-cyan-300 font-bold text-base mb-1">שלב 2 — האורח שולח בקשה</p>
                                <p class="text-gray-300 text-sm leading-relaxed">האורח לוחץ על "שלח בקשת אירוח" ויכול לצרף הודעה קצרה. הבקשה מגיעה למארח בלבד.</p>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <span class="text-2xl flex-shrink-0">✅</span>
                            <div>
                                <p class="text-green-300 font-bold text-base mb-1">שלב 3 — המארח מאשר ומגלה טלפון</p>
                                <p class="text-gray-300 text-sm leading-relaxed">המארח רואה את הבקשות על הכרטיס שלו ויכול לאשר או לדחות. לאחר האישור — הטלפון נחשף לאותו אורח בלבד.</p>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <span class="text-2xl flex-shrink-0">🚩</span>
                            <div>
                                <p class="text-red-300 font-bold text-base mb-1">שלב 4 — דיווח על אורח לא ראוי</p>
                                <p class="text-gray-300 text-sm leading-relaxed">מארח שאישר אורח ואז חווה התנהגות לא ראויה (ביטול ברגע האחרון, אי-הגעה, התנהגות פוגענית) יכול לדווח עליו. כאשר <strong class="text-white/70">שני מארחים שונים</strong> ידווחו — האורח יחסם לצמיתות מלוח המארחים.</p>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Back link -->
        <div class="text-center mt-8 flex flex-wrap justify-center gap-4">
            {#if city}
                <a href="/shabbat-hosting" class="text-amber-400 hover:text-amber-300 transition-colors text-sm">← לוח ארצי</a>
            {/if}
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
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
            <h3 class="text-blue-300 font-black text-lg mb-2">המודעה הוקפאה</h3>
            <p class="text-gray-300 text-sm leading-relaxed mb-4">
                המודעה שלך הוסרה מהלוח הציבורי ונמצאת בסטטוס <strong class="text-blue-200">"לא פעילה"</strong> בדף הפרופיל שלך.
                <br>
                משם תוכל <strong class="text-white">לפרסם אותה שנית</strong> או <strong class="text-white">למחוק אותה לצמיתות</strong>.
            </p>
            <div class="flex flex-col gap-2">
                <a
                    href="/profile"
                    class="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-2.5 rounded-xl transition-colors text-sm"
                >
                    👤 פתח את דף הפרופיל
                </a>
                <button
                    type="button"
                    onclick={() => (showFrozenInfoModal = false)}
                    class="text-gray-400 hover:text-white text-xs font-bold py-2 transition-colors"
                >
                    סגור
                </button>
            </div>
        </div>
    </div>
{/if}
