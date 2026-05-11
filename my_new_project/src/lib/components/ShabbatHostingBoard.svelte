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
        userId?: string | null;
        isBanned?: boolean;
        blockedHostUserIds?: string[];
    }

    let { items, city, userId = null, isBanned = false, blockedHostUserIds = [] }: Props = $props();

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

    const GUEST_EXPIRY_DAYS = 4;
    function isExpired(created_at: string): boolean {
        return (Date.now() - new Date(created_at).getTime()) > GUEST_EXPIRY_DAYS * 86400000;
    }

    // חלון הדיווח: שבת(6) + ראשון–רביעי(0–3)
    const reportWindowOpen = [0, 1, 2, 3, 6].includes(new Date().getDay());

    const PAGE_SIZE = 8;
    function sortByNewest(arr: DbItem[]): DbItem[] {
        return [...arr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // האם הצופה הנוכחי הוא מארח פעיל?
    let viewerIsHost = $derived(userId ? items.some(i => i.user_id === userId && isHost(i)) : false);

    let filteredGuests = $derived(sortByNewest(items.filter(i => !isHost(i) && !isExpired(i.created_at))));

    // מארחים — מסונן: הסר מארחים שחסמו את הצופה
    let filteredHosts = $derived(
        sortByNewest(items.filter(i =>
            isHost(i) && !(i.user_id && blockedHostUserIds.includes(i.user_id))
        ))
    );

    const hasReal = $derived(items.length > 0);

    let guestPage = $state(1);
    let hostPage  = $state(1);

    let guestTotalPages = $derived(Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE)));
    let hostTotalPages  = $derived(Math.max(1, Math.ceil(filteredHosts.length  / PAGE_SIZE)));

    let guestPageItems = $derived(filteredGuests.slice((guestPage - 1) * PAGE_SIZE, guestPage * PAGE_SIZE));
    let hostPageItems  = $derived(filteredHosts.slice((hostPage  - 1) * PAGE_SIZE, hostPage  * PAGE_SIZE));

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

    const mockHosts = [
        { id: 'm1', label: 'משפחת כהן', city: 'ירושלים', neighborhood: 'קרית משה', meal: 'ליל שבת', capacity: '6', guest_type: 'משפחה', notes: 'מארחים בשמחה משפחה עם ילדים. אווירה חמה ושירי שבת.', contact: 'יוסי', phone: '050-1111111', isHost: true, date: '01/04/25' },
        { id: 'm2', label: 'משפחת לוי', city: 'בני ברק', neighborhood: 'רמת אהרן', meal: 'כל הסעודות', capacity: '4', guest_type: 'זוג', notes: 'מארחים זוגות צעירים, אפשר לינה.', contact: 'חיים', phone: '050-2222222', isHost: true, date: '28/03/25' },
        { id: 'm3', label: 'משפחת אדרי', city: 'אשדוד', neighborhood: 'רובע ז', meal: 'ליל שבת', capacity: '8', guest_type: 'הכל מתאים', notes: 'אווירה תימנית מסורתית, חמין משובח.', contact: 'יהודה', phone: '050-3333333', isHost: true, date: '10/04/25' },
    ];

    const mockGuests = [
        { id: 'g1', label: 'בחור ישיבה', city: 'ירושלים', neighborhood: '', meal: 'ליל שבת', capacity: '', guest_type: 'יחיד/ה', notes: 'בחור ישיבה רווק, מחפש משפחה לאירוח לשבת פרשת בלק.', contact: 'אהרן', phone: '052-1111111', isHost: false, date: '09/04/25' },
        { id: 'g2', label: 'רווקה', city: 'תל אביב', neighborhood: '', meal: 'כל הסעודות', capacity: '', guest_type: 'יחיד/ה', notes: 'מחפשת אווירה חמה לשבת חתן.', contact: 'שירה', phone: '052-2222222', isHost: false, date: '07/04/25' },
    ];

    let mockHostsFiltered = $derived(mockHosts.filter(m => !city || m.city === city));
    let mockGuestsFiltered = $derived(mockGuests.filter(m => !city || m.city === city));
</script>

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
        <!-- אזהרת כללי התנהגות -->
        <div class="inline-flex items-start gap-2 bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-2.5 text-right max-w-lg">
            <span class="text-amber-400 text-sm mt-0.5 flex-shrink-0">⚠️</span>
            <p class="text-amber-300/90 text-xs leading-relaxed">
                אורח שהתנהג שלא כראוי יחסם מלהכנס ללוח המארחים.
                המארח רשאי לדווח על אורח בעייתי עד יום רביעי שלאחר השבת.
            </p>
        </div>
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
            <!-- הודעת חסימה -->
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
            <!-- Two-column layout -->
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
                                        <div class="border-b border-cyan-500/20 p-3 flex items-center gap-3">
                                            <div class="w-11 h-11 rounded-full bg-cyan-500/15 flex items-center justify-center text-xl flex-shrink-0">🎒</div>
                                            <div class="flex-1 min-w-0">
                                                <h3 class="text-cyan-300 font-black text-base">{item.label}</h3>
                                                {#if item.city}<p class="text-gray-400 text-xs">📍 {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</p>{/if}
                                            </div>
                                            {#if dateStr}<span class="text-[10px] text-gray-500 flex-shrink-0">{dateStr}</span>{/if}
                                        </div>
                                        <div class="p-3">
                                            <div class="flex flex-wrap gap-1.5 mb-2">
                                                {#if meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="שבת שלום" /> {meal}</span>{/if}
                                                {#if capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {capacity}</span>{/if}
                                                {#if guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {guest_type}</span>{/if}
                                            </div>
                                            {#if notes}<p class="text-gray-300 text-sm leading-relaxed mb-2">{notes}</p>{/if}
                                            {#if freeText}<p class="text-cyan-300/80 text-xs italic mb-3">"{freeText}"</p>{/if}
                                            <div class="flex gap-2 mb-2">
                                                <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl transition-colors text-sm">💬 WhatsApp</a>
                                                <a href="tel:{item.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl transition-colors text-sm">📞</a>
                                            </div>
                                            <!-- אזהרה + כפתור דיווח (למארחים בחלון הזמן) -->
                                            <p class="text-[10px] text-amber-500/70 text-center mt-1">⚠️ אין להגיע ללא תיאום מראש</p>
                                            {#if viewerIsHost && reportWindowOpen && userId !== item.user_id}
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
                                            <h3 class="text-cyan-300 font-black text-base">{m.label}</h3>
                                            <p class="text-gray-400 text-xs">📍 {m.city}{m.neighborhood ? ` · ${m.neighborhood}` : ''}</p>
                                        </div>
                                        <span class="text-[10px] text-gray-500 flex-shrink-0">{m.date}</span>
                                    </div>
                                    <div class="p-3">
                                        <div class="flex flex-wrap gap-1.5 mb-2">
                                            {#if m.meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="שבת שלום" /> {m.meal}</span>{/if}
                                            {#if m.capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {m.capacity}</span>{/if}
                                            {#if m.guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {m.guest_type}</span>{/if}
                                        </div>
                                        <p class="text-gray-300 text-sm leading-relaxed mb-2">{m.notes}</p>
                                        <div class="flex gap-2 mb-2">
                                            <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl transition-colors text-sm">💬 צור קשר עם המפרסם</a>
                                            <a href="tel:{m.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl transition-colors text-sm">📞</a>
                                        </div>
                                        <p class="text-[10px] text-amber-500/70 text-center">⚠️ אין להגיע ללא תיאום מראש</p>
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
                                        <div class="border-b border-amber-500/20 p-3 flex items-center gap-3">
                                            <div class="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center text-xl flex-shrink-0">🏠</div>
                                            <div class="flex-1 min-w-0">
                                                <h3 class="text-amber-300 font-black text-base">{item.label}</h3>
                                                {#if item.city}<p class="text-gray-400 text-xs">📍 {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</p>{/if}
                                            </div>
                                            {#if dateStr}<span class="text-[10px] text-gray-500 flex-shrink-0">{dateStr}</span>{/if}
                                        </div>
                                        <div class="p-3">
                                            <div class="flex flex-wrap gap-1.5 mb-2">
                                                {#if meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="שבת שלום" /> {meal}</span>{/if}
                                                {#if capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {capacity}</span>{/if}
                                                {#if guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {guest_type}</span>{/if}
                                            </div>
                                            {#if notes}<p class="text-gray-300 text-sm leading-relaxed mb-2">{notes}</p>{/if}
                                            {#if freeText}<p class="text-amber-300/80 text-xs italic mb-3">"{freeText}"</p>{/if}
                                            <div class="flex gap-2 mb-2">
                                                <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl transition-colors text-sm">💬 WhatsApp</a>
                                                <a href="tel:{item.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl transition-colors text-sm">📞</a>
                                            </div>
                                            <p class="text-[10px] text-amber-500/70 text-center">⚠️ אין להגיע ללא תיאום מראש</p>
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
                                    <div class="border-b border-amber-500/20 p-3 flex items-center gap-3">
                                        <div class="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center text-xl flex-shrink-0">🏠</div>
                                        <div class="flex-1 min-w-0">
                                            <h3 class="text-amber-300 font-black text-base">{m.label}</h3>
                                            <p class="text-gray-400 text-xs">📍 {m.city}{m.neighborhood ? ` · ${m.neighborhood}` : ''}</p>
                                        </div>
                                        <span class="text-[10px] text-gray-500 flex-shrink-0">{m.date}</span>
                                    </div>
                                    <div class="p-3">
                                        <div class="flex flex-wrap gap-1.5 mb-2">
                                            {#if m.meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full"><img src="/icons/shavat-shalom.png" class="w-4 h-4 inline-block align-middle" alt="שבת שלום" /> {m.meal}</span>{/if}
                                            {#if m.capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {m.capacity}</span>{/if}
                                            {#if m.guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {m.guest_type}</span>{/if}
                                        </div>
                                        <p class="text-gray-300 text-sm leading-relaxed mb-2">{m.notes}</p>
                                        <div class="flex gap-2 mb-2">
                                            <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-xl transition-colors text-sm">💬 צור קשר עם המפרסם</a>
                                            <a href="tel:{m.phone}" class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3 rounded-xl transition-colors text-sm">📞</a>
                                        </div>
                                        <p class="text-[10px] text-amber-500/70 text-center">⚠️ אין להגיע ללא תיאום מראש</p>
                                    </div>
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>

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
