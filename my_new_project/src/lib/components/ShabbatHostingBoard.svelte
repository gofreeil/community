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

    type OfferFilter = 'all' | 'host' | 'guest';
    type FoodFilter = 'all' | 'ספרדי' | 'אשכנזי' | 'תימני' | 'מעורב';

    let offerFilter = $state<OfferFilter>('all');
    let foodFilter = $state<FoodFilter>('all');

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

    function getFood(item: DbItem): string {
        const ef = parseExtra(item.extra_fields);
        return String(ef.food_style ?? '');
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

    function waLink(phone: string): string {
        const digits = (phone ?? '').replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    let filtered = $derived(
        items.filter(item => {
            if (offerFilter === 'host' && !isHost(item)) return false;
            if (offerFilter === 'guest' && isHost(item)) return false;
            if (foodFilter !== 'all' && getFood(item) !== foodFilter) return false;
            return true;
        })
    );

    const hasReal = $derived(items.length > 0);

    const mockHosts = [
        { id: 'm1', label: 'משפחת כהן', city: 'ירושלים', neighborhood: 'קרית משה', meal: 'ליל שבת', food: 'ספרדי', capacity: '6', guest_type: 'משפחה', notes: 'מארחים בשמחה משפחה עם ילדים. אווירה חמה ושירי שבת.', contact: 'יוסי', phone: '050-1111111' },
        { id: 'm2', label: 'משפחת לוי', city: 'בני ברק', neighborhood: 'רמת אהרן', meal: 'כל הסעודות', food: 'אשכנזי', capacity: '4', guest_type: 'זוג', notes: 'מארחים זוגות צעירים, אפשר לינה.', contact: 'חיים', phone: '050-2222222' },
        { id: 'm3', label: 'משפחת אדרי', city: 'אשדוד', neighborhood: 'רובע ז', meal: 'ליל שבת', food: 'תימני', capacity: '8', guest_type: 'הכל מתאים', notes: 'אווירה תימנית מסורתית, חמין משובח.', contact: 'יהודה', phone: '050-3333333' },
    ];

    const mockGuests = [
        { id: 'g1', label: 'בחור ישיבה', city: 'ירושלים', neighborhood: '', meal: 'ליל שבת', food: '', capacity: '', guest_type: 'יחיד/ה', notes: 'בחור ישיבה רווק, מחפש משפחה לאירוח לשבת פרשת בלק.', contact: 'אהרן', phone: '052-1111111' },
        { id: 'g2', label: 'רווקה', city: 'תל אביב', neighborhood: '', meal: 'כל הסעודות', food: '', capacity: '', guest_type: 'יחיד/ה', notes: 'מחפשת אווירה חמה לשבת חתן.', contact: 'שירה', phone: '052-2222222' },
    ];

    let filteredMock = $derived.by(() => {
        const allMock = [
            ...mockHosts.map(m => ({ ...m, isHost: true })),
            ...mockGuests.map(m => ({ ...m, isHost: false })),
        ];
        return allMock.filter(m => {
            if (city && m.city !== city) return false;
            if (offerFilter === 'host' && !m.isHost) return false;
            if (offerFilter === 'guest' && m.isHost) return false;
            if (foodFilter !== 'all' && m.food !== foodFilter) return false;
            return true;
        });
    });

    let filteredMockForDisplay = $derived(hasReal ? [] : filteredMock);
</script>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🕯️🕯️</span>
            <h1 class="text-3xl font-black text-white mb-2">
                {city ? `אירוח לשבת ב${city}` : 'לוח אירוח לשבת'}
            </h1>
            <p class="text-gray-400">
                {city
                    ? 'מארחים ומתארחים בעיר שלך'
                    : 'לוח ארצי — מציעים לארח ומחפשים להתארח לשבת'}
            </p>
        </div>

        <!-- Offer filter tabs -->
        <div class="flex flex-wrap justify-center gap-2 mb-3">
            <button
                onclick={() => offerFilter = 'all'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {offerFilter === 'all' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🌍 הכל
            </button>
            <button
                onclick={() => offerFilter = 'host'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {offerFilter === 'host' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🏠 מציעים לארח
            </button>
            <button
                onclick={() => offerFilter = 'guest'}
                class="px-5 py-2 rounded-full text-sm font-bold transition-all {offerFilter === 'guest' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
            >
                🎒 מחפשים להתארח
            </button>
        </div>

        <!-- Food style tabs -->
        <div class="flex flex-wrap justify-center gap-2 mb-6">
            <button
                onclick={() => foodFilter = 'all'}
                class="px-4 py-1.5 rounded-full text-xs font-bold transition-all {foodFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
            >
                כל סגנון
            </button>
            <button
                onclick={() => foodFilter = 'ספרדי'}
                class="px-4 py-1.5 rounded-full text-xs font-bold transition-all {foodFilter === 'ספרדי' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
            >
                ספרדי
            </button>
            <button
                onclick={() => foodFilter = 'אשכנזי'}
                class="px-4 py-1.5 rounded-full text-xs font-bold transition-all {foodFilter === 'אשכנזי' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
            >
                אשכנזי
            </button>
            <button
                onclick={() => foodFilter = 'תימני'}
                class="px-4 py-1.5 rounded-full text-xs font-bold transition-all {foodFilter === 'תימני' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
            >
                תימני
            </button>
            <button
                onclick={() => foodFilter = 'מעורב'}
                class="px-4 py-1.5 rounded-full text-xs font-bold transition-all {foodFilter === 'מעורב' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
            >
                מעורב
            </button>
        </div>

        <!-- Add buttons -->
        <div class="flex flex-wrap justify-center gap-3 mb-6">
            <a
                href="/add/realestate"
                class="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold px-5 py-3 rounded-full shadow-lg hover:shadow-amber-500/25 transition-all hover:scale-105"
            >
                <span class="text-lg">🏠</span>
                אני מציע לארח
            </a>
            <a
                href="/add/realestate"
                class="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-3 rounded-full shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-105"
            >
                <span class="text-lg">🎒</span>
                אני מחפש להתארח
            </a>
        </div>

        <!-- Counter -->
        <div class="text-center mb-6">
            <p class="text-gray-500 text-sm">
                🕯️🕯️ {hasReal ? filtered.length : filteredMockForDisplay.length} מודעות
                {hasReal ? '' : '(דוגמאות)'}
            </p>
        </div>

        <!-- Real items grid -->
        {#if hasReal}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each filtered as item}
                    {@const host = isHost(item)}
                    {@const food = getFood(item)}
                    {@const meal = getMeal(item)}
                    {@const capacity = getCapacity(item)}
                    {@const guest_type = getGuestType(item)}
                    {@const notes = getPreferences(item)}
                    <div class="rounded-2xl bg-[#0f172a] border {host ? 'border-amber-500/30' : 'border-cyan-500/30'} overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                        <div class="bg-gradient-to-r {host ? 'from-amber-500 to-orange-600' : 'from-cyan-500 to-blue-600'} p-4 flex items-center gap-3 relative">
                            <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                                {host ? '🏠' : '🎒'}
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-white font-black text-lg">{item.label}</h3>
                                <div class="flex flex-wrap items-center gap-2 text-white/80 text-xs">
                                    {#if item.city}
                                        <span>📍 {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ''}</span>
                                    {/if}
                                </div>
                            </div>
                            <span class="shrink-0 text-[10px] font-black uppercase bg-black/30 text-white px-2 py-1 rounded-full">
                                {host ? 'מארח' : 'מחפש'}
                            </span>
                        </div>

                        <div class="p-4">
                            <div class="flex flex-wrap gap-1.5 mb-3">
                                {#if meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🍽️ {meal}</span>{/if}
                                {#if food}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🥘 {food}</span>{/if}
                                {#if capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {capacity}</span>{/if}
                                {#if guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {guest_type}</span>{/if}
                            </div>

                            {#if notes}
                                <p class="text-gray-300 text-sm leading-relaxed mb-4">{notes}</p>
                            {/if}

                            <div class="flex gap-2">
                                <a
                                    href={waLink(item.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="שלח הודעת וואטסאפ ל-{item.contact || item.label}"
                                    class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                                >
                                    💬 WhatsApp
                                </a>
                                <a
                                    href="tel:{item.phone}"
                                    class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                                >
                                    📞 התקשר
                                </a>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            {#if filtered.length === 0}
                <div class="text-center py-16">
                    <span class="text-5xl mb-4 block">🕯️🕯️</span>
                    <p class="text-gray-400 text-lg">אין מודעות שתואמות את הסינון</p>
                    <p class="text-gray-500 text-sm mt-2">נסה לאפס את הסינון או לפרסם מודעה משלך</p>
                </div>
            {/if}
        {:else}
            <!-- Mock fallback -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each filteredMockForDisplay as m}
                    <div class="rounded-2xl bg-[#0f172a] border {m.isHost ? 'border-amber-500/30' : 'border-cyan-500/30'} overflow-hidden shadow-xl relative">
                        <div class="absolute top-2 left-2 z-10 text-[10px] font-bold bg-black/50 text-amber-300 px-2 py-0.5 rounded-full">דוגמה</div>
                        <div class="bg-gradient-to-r {m.isHost ? 'from-amber-500 to-orange-600' : 'from-cyan-500 to-blue-600'} p-4 flex items-center gap-3">
                            <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                                {m.isHost ? '🏠' : '🎒'}
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-white font-black text-lg">{m.label}</h3>
                                <div class="flex flex-wrap items-center gap-2 text-white/80 text-xs">
                                    <span>📍 {m.city}{m.neighborhood ? ` · ${m.neighborhood}` : ''}</span>
                                </div>
                            </div>
                            <span class="shrink-0 text-[10px] font-black uppercase bg-black/30 text-white px-2 py-1 rounded-full">
                                {m.isHost ? 'מארח' : 'מחפש'}
                            </span>
                        </div>
                        <div class="p-4">
                            <div class="flex flex-wrap gap-1.5 mb-3">
                                {#if m.meal}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🍽️ {m.meal}</span>{/if}
                                {#if m.food}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🥘 {m.food}</span>{/if}
                                {#if m.capacity}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">👥 עד {m.capacity}</span>{/if}
                                {#if m.guest_type}<span class="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">🧑‍🤝‍🧑 {m.guest_type}</span>{/if}
                            </div>
                            <p class="text-gray-300 text-sm leading-relaxed mb-4">{m.notes}</p>
                            <a
                                href="/add/realestate"
                                class="block text-center bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                            >
                                ✨ פרסם מודעה אמיתית במקום הדוגמה
                            </a>
                        </div>
                    </div>
                {/each}
            </div>

            {#if filteredMockForDisplay.length === 0}
                <div class="text-center py-16">
                    <span class="text-5xl mb-4 block">🕯️🕯️</span>
                    <p class="text-gray-400 text-lg">עדיין אין מודעות{city ? ` ב${city}` : ''}</p>
                    <p class="text-gray-500 text-sm mt-2">היה הראשון לפרסם!</p>
                </div>
            {/if}
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
