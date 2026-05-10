<script lang="ts">
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

    interface Props {
        items: DbItem[];
        city: string | null;
    }

    let { items, city }: Props = $props();

    function parseExtra(raw: string): Record<string, unknown> {
        try {
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    function isHost(item: DbItem): boolean {
        const ef = parseExtra(item.extra_fields);
        return String(ef.offer_type ?? '').includes('מציע');
    }

    function getMeal(item: DbItem): string {
        const ef = parseExtra(item.extra_fields);
        return String(ef.meal ?? '');
    }

    function getCapacity(item: DbItem): string {
        const ef = parseExtra(item.extra_fields);
        const v = ef.capacity;
        return v ? String(v) : '';
    }

    function getGuestType(item: DbItem): string {
        const ef = parseExtra(item.extra_fields);
        return String(ef.guest_type ?? '');
    }

    function getPreferences(item: DbItem): string {
        const ef = parseExtra(item.extra_fields);
        return String(ef.preferences ?? item.description ?? '');
    }

    function getFreeText(item: DbItem): string {
        const ef = parseExtra(item.extra_fields);
        return String(ef.free_text ?? '');
    }

    function formatDate(created_at: string): string {
        const d = new Date(created_at);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
    }

    function waLink(phone: string): string {
        const digits = (phone ?? '').replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    const GUEST_EXPIRY_DAYS = 4;

    function isExpired(created_at: string): boolean {
        const created = new Date(created_at).getTime();
        const now = Date.now();
        return (now - created) > GUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    }

    const PAGE_SIZE = 8;

    function sortByNewest(arr: DbItem[]): DbItem[] {
        return [...arr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    let filteredHosts  = $derived(sortByNewest(items.filter(item => isHost(item))));
    let filteredGuests = $derived(sortByNewest(items.filter(item => !isHost(item) && !isExpired(item.created_at))));

    const hasReal = $derived(items.length > 0);

    let guestPage = $state(1);
    let hostPage  = $state(1);

    let guestTotalPages = $derived(Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE)));
    let hostTotalPages  = $derived(Math.max(1, Math.ceil(filteredHosts.length  / PAGE_SIZE)));

    let guestPageItems = $derived(filteredGuests.slice((guestPage - 1) * PAGE_SIZE, guestPage * PAGE_SIZE));
    let hostPageItems  = $derived(filteredHosts.slice((hostPage  - 1) * PAGE_SIZE, hostPage  * PAGE_SIZE));

    const mockHosts = [
        { id: 'm1', label: 'משפחת כהן', city: 'ירושלים', neighborhood: 'קרית משה', meal: 'ליל שבת', capacity: '6', guest_type: 'משפחה', notes: 'מארחים בשמחה משפחה עם ילדים. אווירה חמה ושירי שבת.', contact: 'יוסי', phone: '050-1111111', isHost: true },
        { id: 'm2', label: 'משפחת לוי', city: 'בני ברק', neighborhood: 'רמת אהרן', meal: 'כל הסעודות', capacity: '4', guest_type: 'זוג', notes: 'מארחים זוגות צעירים, אפשר לינה.', contact: 'חיים', phone: '050-2222222', isHost: true },
        { id: 'm3', label: 'משפחת אדרי', city: 'אשדוד', neighborhood: 'רובע ז', meal: 'ליל שבת', capacity: '8', guest_type: 'הכל מתאים', notes: 'אווירה תימנית מסורתית, חמין משובח.', contact: 'יהודה', phone: '050-3333333', isHost: true },
    ];

    const mockGuests = [
        { id: 'g1', label: 'בחור ישיבה', city: 'ירושלים', neighborhood: '', meal: 'ליל שבת', capacity: '', guest_type: 'יחיד/ה', notes: 'בחור ישיבה רווק, מחפש משפחה לאירוח לשבת פרשת בלק.', contact: 'אהרן', phone: '052-1111111', isHost: false },
        { id: 'g2', label: 'רווקה', city: 'תל אביב', neighborhood: '', meal: 'כל הסעודות', capacity: '', guest_type: 'יחיד/ה', notes: 'מחפשת אווירה חמה לשבת חתן.', contact: 'שירה', phone: '052-2222222', isHost: false },
    ];

    let mockHostsFiltered = $derived(mockHosts.filter(m => !city || m.city === city));
    let mockGuestsFiltered = $derived(mockGuests.filter(m => !city || m.city === city));
</script>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20" dir="rtl">
    <!-- Header -->
    <div class="max-w-4xl mx-auto px-4 text-center mb-6">
        <div class="relative mx-auto mb-3 inline-block rounded-3xl shadow-2xl overflow-hidden" style="background: linear-gradient(135deg,#451a03 0%,#78350f 45%,#92400e 100%); padding: 12px;">
            <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse at 60% 20%,rgba(251,191,36,0.35) 0%,transparent 60%),radial-gradient(ellipse at 20% 80%,rgba(245,158,11,0.2) 0%,transparent 50%);"></div>
            <img src="/images/shabat.png" alt="שבת" class="relative h-40 object-contain rounded-2xl" />
        </div>
        <h1 class="text-3xl font-black text-white mb-2">
            {city ? `אירוח לשבת ב${city}` : 'לוח אירוח לשבת'}
        </h1>
        <p class="text-gray-400">
            {city
                ? 'מארחים ומתארחים בעיר שלך'
                : 'לוח ארצי — מציעים לארח ומחפשים להתארח לשבת'}
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
        <!-- Two-column layout: guests right, hosts left -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

            <!-- טור ימין: מחפשים להתארח -->
            <div>
                <h2 class="text-center text-sm font-bold text-cyan-400 mb-3 tracking-wide">מחפשים להתארח</h2>
                <div class="flex flex-col gap-3">
                    {#if hasReal}
                        {#if filteredGuests.length === 0}
                            <p class="text-center text-gray-500 text-sm py-8">אין מחפשים כרגע</p>
                        {:else}
                            {#each guestPageItems as item}
                                {@const meal = getMeal(item)}
                                {@const capacity = getCapacity(item)}
                                {@const guest_type = getGuestType(item)}
                                {@const notes = getPreferences(item)}
                                {@const freeText = getFreeText(item)}
                                {@const dateStr = formatDate(item.created_at)}
                                <div class="rounded-2xl bg-[#0f172a] border border-cyan-500/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                    <div class="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🎒</div>
                                        <div class="flex-1 min-w-0">
                                            <h3 class="text-white font-black text-base">{item.label}</h3>
                                            {#if item.city}<p class="text-white/80 text-xs">📍 {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</p>{/if}
                                        </div>
                                        {#if dateStr}<span class="text-[10px] text-white/60 flex-shrink-0">{dateStr}</span>{/if}
                                    </div>
                                    <div class="p-3">
                                        <div class="flex flex-wrap gap-1.5 mb-2">
                                            {#if meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🍽️ {meal}</span>{/if}
                                            {#if capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {capacity}</span>{/if}
                                            {#if guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {guest_type}</span>{/if}
                                        </div>
                                        {#if notes}<p class="text-gray-300 text-sm leading-relaxed mb-2">{notes}</p>{/if}
                                        {#if freeText}<p class="text-cyan-300/80 text-xs italic mb-3">"{freeText}"</p>{/if}
                                        <div class="flex gap-2">
                                            <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl transition-colors text-sm">💬 WhatsApp</a>
                                            <a href="tel:{item.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl transition-colors text-sm">📞</a>
                                        </div>
                                    </div>
                                </div>
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
                                <div class="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 flex items-center gap-3">
                                    <div class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🎒</div>
                                    <div class="flex-1 min-w-0">
                                        <h3 class="text-white font-black text-base">{m.label}</h3>
                                        <p class="text-white/80 text-xs">📍 {m.city}{m.neighborhood ? ` · ${m.neighborhood}` : ''}</p>
                                    </div>
                                </div>
                                <div class="p-3">
                                    <div class="flex flex-wrap gap-1.5 mb-2">
                                        {#if m.meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🍽️ {m.meal}</span>{/if}
                                        {#if m.capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {m.capacity}</span>{/if}
                                        {#if m.guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {m.guest_type}</span>{/if}
                                    </div>
                                    <p class="text-gray-300 text-sm leading-relaxed mb-3">{m.notes}</p>
                                    <a href="/add/realestate" class="block text-center bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-xl transition-colors">✨ פרסם מודעה אמיתית</a>
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
                            {#each hostPageItems as item}
                                {@const meal = getMeal(item)}
                                {@const capacity = getCapacity(item)}
                                {@const guest_type = getGuestType(item)}
                                {@const notes = getPreferences(item)}
                                {@const freeText = getFreeText(item)}
                                {@const dateStr = formatDate(item.created_at)}
                                <div class="rounded-2xl bg-[#0f172a] border border-amber-500/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                    <div class="bg-gradient-to-r from-amber-500 to-orange-600 p-3 flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🏠</div>
                                        <div class="flex-1 min-w-0">
                                            <h3 class="text-white font-black text-base">{item.label}</h3>
                                            {#if item.city}<p class="text-white/80 text-xs">📍 {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</p>{/if}
                                        </div>
                                        {#if dateStr}<span class="text-[10px] text-white/60 flex-shrink-0">{dateStr}</span>{/if}
                                    </div>
                                    <div class="p-3">
                                        <div class="flex flex-wrap gap-1.5 mb-2">
                                            {#if meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🍽️ {meal}</span>{/if}
                                            {#if capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {capacity}</span>{/if}
                                            {#if guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {guest_type}</span>{/if}
                                        </div>
                                        {#if notes}<p class="text-gray-300 text-sm leading-relaxed mb-2">{notes}</p>{/if}
                                        {#if freeText}<p class="text-amber-300/80 text-xs italic mb-3">"{freeText}"</p>{/if}
                                        <div class="flex gap-2">
                                            <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl transition-colors text-sm">💬 WhatsApp</a>
                                            <a href="tel:{item.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl transition-colors text-sm">📞</a>
                                        </div>
                                    </div>
                                </div>
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
                                <div class="bg-gradient-to-r from-amber-500 to-orange-600 p-3 flex items-center gap-3">
                                    <div class="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🏠</div>
                                    <div class="flex-1 min-w-0">
                                        <h3 class="text-white font-black text-base">{m.label}</h3>
                                        <p class="text-white/80 text-xs">📍 {m.city}{m.neighborhood ? ` · ${m.neighborhood}` : ''}</p>
                                    </div>
                                </div>
                                <div class="p-3">
                                    <div class="flex flex-wrap gap-1.5 mb-2">
                                        {#if m.meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🍽️ {m.meal}</span>{/if}
                                        {#if m.capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {m.capacity}</span>{/if}
                                        {#if m.guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {m.guest_type}</span>{/if}
                                    </div>
                                    <p class="text-gray-300 text-sm leading-relaxed mb-3">{m.notes}</p>
                                    <a href="/add/realestate" class="block text-center bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-xl transition-colors">✨ פרסם מודעה אמיתית</a>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>

        </div>

        <!-- Back link -->
        <div class="text-center mt-8 flex flex-wrap justify-center gap-4">
            {#if city}
                <a href="/shabbat-hosting" class="text-amber-400 hover:text-amber-300 transition-colors text-sm">← לוח ארצי</a>
            {/if}
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
