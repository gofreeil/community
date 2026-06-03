<script lang="ts">
    import { onMount } from 'svelte';
    import { neighborhoodState } from '$lib/neighborhoodState.svelte';
    import {
        getProductsForNeighborhood,
        getSaleInfoForNeighborhood,
        hasRealData,
        type FarmProduct,
    } from '$lib/farmProduceData';

    type Step = 'browse' | 'summary' | 'done';
    let step = $state<Step>('browse');

    // כמות מבוקשת לכל מוצר (id → qty)
    let quantities = $state<Record<string, number>>({});

    // פרטי המזמין
    let customerName = $state('');
    let customerPhone = $state('');

    let products = $derived(getProductsForNeighborhood(neighborhoodState.neighborhood));
    let saleInfo = $derived(getSaleInfoForNeighborhood(neighborhoodState.neighborhood));
    let isMock = $derived(!hasRealData(neighborhoodState.neighborhood));

    let selectedItems = $derived(
        products
            .map((p) => ({ product: p, qty: quantities[p.id] ?? 0 }))
            .filter((row) => row.qty > 0),
    );
    let totalPrice = $derived(
        selectedItems.reduce((sum, row) => sum + row.product.price * row.qty, 0),
    );
    let hasSelection = $derived(selectedItems.length > 0);

    function toggleInterest(p: FarmProduct) {
        quantities[p.id] = quantities[p.id] > 0 ? 0 : 1;
    }
    function setQty(p: FarmProduct, qty: number) {
        quantities[p.id] = Math.max(0, qty);
    }

    function goToSummary() {
        if (!hasSelection) return;
        step = 'summary';
        scrollTop();
    }
    function confirmOrder() {
        if (!customerName.trim() || !customerPhone.trim()) {
            alert('נא למלא שם וטלפון ליצירת קשר');
            return;
        }
        step = 'done';
        scrollTop();
    }
    function resetOrder() {
        quantities = {};
        customerName = '';
        customerPhone = '';
        step = 'browse';
        scrollTop();
    }
    function scrollTop() {
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    onMount(() => {
        neighborhoodState.init();
    });
</script>

<svelte:head>
    <title>חקלאות ישירה - קהילה בשכונה</title>
    <meta name="description" content="חקלאות ישירה - הזמינו פעם בשבוע תוצרת טרייה ישירות מהחקלאים לשכונה שלכם." />
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20" dir="rtl">
    <div class="max-w-4xl mx-auto px-4">

        <!-- ===== כותרת ===== -->
        <div class="text-center mb-6">
            <h1 class="text-3xl md:text-4xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-lime-400 bg-clip-text text-transparent mb-3">
                🌾 חקלאות ישירה
            </h1>
            <p class="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                פעם בשבוע - תוצרת טרייה ישירות מהחקלאים אל שכונת
                <span class="text-emerald-300 font-bold">{neighborhoodState.neighborhood}</span>.
                בחרו מראש את המוצרים, סמנו כמות, וקבלו אותם במקום ובמועד המכירה.
            </p>
        </div>

        <!-- ===== מקום ומועד המכירה ===== -->
        <div class="bg-gradient-to-br from-emerald-900/40 to-green-900/30 border border-emerald-500/30 rounded-2xl p-4 md:p-5 mb-6">
            <h2 class="text-emerald-300 font-bold text-sm mb-3 flex items-center gap-2">
                📍 מקום ומועד המכירה
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div class="bg-black/30 rounded-xl py-3 px-2">
                    <div class="text-2xl mb-1">🏠</div>
                    <div class="text-white font-bold text-sm">{saleInfo.location}</div>
                    <div class="text-gray-500 text-[11px] mt-0.5">מקום</div>
                </div>
                <div class="bg-black/30 rounded-xl py-3 px-2">
                    <div class="text-2xl mb-1">📅</div>
                    <div class="text-white font-bold text-sm">{saleInfo.day}</div>
                    <div class="text-gray-500 text-[11px] mt-0.5">יום</div>
                </div>
                <div class="bg-black/30 rounded-xl py-3 px-2">
                    <div class="text-2xl mb-1">🕓</div>
                    <div class="text-white font-bold text-sm">{saleInfo.time}</div>
                    <div class="text-gray-500 text-[11px] mt-0.5">שעות</div>
                </div>
            </div>
        </div>

        {#if isMock}
            <p class="text-center text-amber-300/80 text-xs mb-5">
                💡 אלו מוצרי דוגמה. ברגע שחקלאי יפרסם תוצרת לשכונת {neighborhoodState.neighborhood} - הרשימה תתעדכן.
            </p>
        {/if}

        {#if step === 'browse'}
            <!-- ===== טבלת מוצרים ===== -->
            <div class="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden mb-6">
                <!-- כותרת טבלה (דסקטופ) -->
                <div class="hidden md:grid grid-cols-[2.2fr_0.9fr_2fr_1.4fr] gap-2 bg-black/40 px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                    <div>מוצר ומספק</div>
                    <div class="text-center">מחיר</div>
                    <div>הערות</div>
                    <div class="text-center">מעוניין / כמות</div>
                </div>

                {#each products as p (p.id)}
                    {@const qty = quantities[p.id] ?? 0}
                    <div class="border-t border-white/5 px-4 py-3 md:grid md:grid-cols-[2.2fr_0.9fr_2fr_1.4fr] md:gap-2 md:items-center
                        {qty > 0 ? 'bg-emerald-500/10' : ''}">

                        <!-- מוצר + מספק -->
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl flex-shrink-0">
                                {p.logo}
                            </div>
                            <div class="min-w-0">
                                <div class="text-white font-bold text-sm leading-tight">{p.name}</div>
                                <div class="text-gray-400 text-xs">{p.supplier} · {p.unit}</div>
                            </div>
                        </div>

                        <!-- מחיר -->
                        <div class="mt-2 md:mt-0 text-emerald-300 font-black text-base md:text-center">
                            ₪{p.price}
                            <span class="text-gray-500 font-normal text-[11px] md:hidden">ל{p.unit}</span>
                        </div>

                        <!-- הערות -->
                        <div class="mt-1 md:mt-0 text-gray-400 text-xs leading-snug">{p.notes}</div>

                        <!-- מעוניין + כמות -->
                        <div class="mt-3 md:mt-0 flex items-center justify-start md:justify-center gap-2">
                            {#if qty === 0}
                                <button
                                    type="button"
                                    onclick={() => toggleInterest(p)}
                                    class="w-full md:w-auto bg-white/5 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white text-sm font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    + מעוניין
                                </button>
                            {:else}
                                <div class="flex items-center gap-1 bg-black/40 rounded-xl border border-emerald-500/40 p-1">
                                    <button
                                        type="button"
                                        onclick={() => setQty(p, qty - 1)}
                                        aria-label="הפחת כמות"
                                        class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black text-lg leading-none cursor-pointer"
                                    >−</button>
                                    <span class="w-8 text-center text-white font-black">{qty}</span>
                                    <button
                                        type="button"
                                        onclick={() => setQty(p, qty + 1)}
                                        aria-label="הוסף כמות"
                                        class="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg leading-none cursor-pointer"
                                    >+</button>
                                </div>
                                <button
                                    type="button"
                                    onclick={() => setQty(p, 0)}
                                    aria-label="הסר מוצר"
                                    class="text-gray-500 hover:text-red-400 text-sm cursor-pointer"
                                >✕</button>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            <!-- ===== סרגל סיכום תחתון ===== -->
            <div class="sticky bottom-3 z-20">
                <div class="bg-[#0f172a] border border-emerald-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
                    <div>
                        <div class="text-gray-400 text-xs">
                            {selectedItems.length > 0 ? `${selectedItems.length} מוצרים נבחרו` : 'עדיין לא נבחרו מוצרים'}
                        </div>
                        <div class="text-white font-black text-xl">סה"כ ₪{totalPrice}</div>
                    </div>
                    <button
                        type="button"
                        onclick={goToSummary}
                        disabled={!hasSelection}
                        class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        המשך לסיכום ←
                    </button>
                </div>
            </div>

        {:else if step === 'summary'}
            <!-- ===== סיכום הזמנה ===== -->
            <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 md:p-6 mb-6">
                <h2 class="text-white font-black text-xl mb-4 flex items-center gap-2">🧺 סיכום ההזמנה</h2>

                <div class="space-y-2 mb-4">
                    {#each selectedItems as row (row.product.id)}
                        <div class="flex items-center gap-3 bg-black/30 rounded-xl px-3 py-2">
                            <span class="text-xl">{row.product.logo}</span>
                            <div class="flex-1 min-w-0">
                                <div class="text-white font-bold text-sm">{row.product.name}</div>
                                <div class="text-gray-400 text-xs">{row.product.supplier} · ₪{row.product.price} ל{row.product.unit}</div>
                            </div>
                            <div class="text-gray-300 text-sm font-bold whitespace-nowrap">× {row.qty}</div>
                            <div class="text-emerald-300 font-black text-sm whitespace-nowrap w-16 text-left">
                                ₪{row.product.price * row.qty}
                            </div>
                        </div>
                    {/each}
                </div>

                <div class="flex items-center justify-between border-t border-white/10 pt-3 mb-5">
                    <span class="text-white font-bold">סה"כ לתשלום</span>
                    <span class="text-emerald-300 font-black text-2xl">₪{totalPrice}</span>
                </div>

                <!-- פרטי המזמין -->
                <div class="space-y-3 mb-5">
                    <div>
                        <label for="cust-name" class="block text-white font-bold text-sm mb-1">שם מלא</label>
                        <input
                            id="cust-name"
                            bind:value={customerName}
                            placeholder="השם שלך"
                            class="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label for="cust-phone" class="block text-white font-bold text-sm mb-1">טלפון</label>
                        <input
                            id="cust-phone"
                            type="tel"
                            bind:value={customerPhone}
                            placeholder="050-0000000"
                            class="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                <!-- תזכורת מקום ומועד -->
                <div class="bg-emerald-900/30 border border-emerald-500/30 rounded-xl px-4 py-3 mb-5 text-sm text-emerald-100">
                    📍 איסוף: <strong>{saleInfo.location}</strong>, {saleInfo.day}, {saleInfo.time}
                </div>

                <div class="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onclick={() => { step = 'browse'; scrollTop(); }}
                        class="sm:flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
                    >
                        → חזרה לרשימה
                    </button>
                    <button
                        type="button"
                        onclick={confirmOrder}
                        class="sm:flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
                    >
                        אשר הזמנה ✓
                    </button>
                </div>
            </div>

        {:else}
            <!-- ===== אישור הזמנה ===== -->
            <div class="bg-gradient-to-br from-emerald-900/40 to-green-900/30 border border-emerald-500/40 rounded-2xl p-8 text-center mb-6">
                <div class="text-5xl mb-3">✅</div>
                <h2 class="text-white font-black text-2xl mb-2">ההזמנה נקלטה!</h2>
                <p class="text-emerald-100 text-sm mb-4">
                    תודה {customerName}. שריינו עבורך {selectedItems.length} מוצרים בסך ₪{totalPrice}.
                </p>
                <div class="bg-black/30 rounded-xl px-4 py-3 inline-block text-sm text-gray-200">
                    📍 איסוף ותשלום: <strong>{saleInfo.location}</strong><br />
                    {saleInfo.day}, {saleInfo.time}
                </div>
                <div class="mt-6">
                    <button
                        type="button"
                        onclick={resetOrder}
                        class="bg-gray-700 hover:bg-gray-600 text-white font-bold px-6 py-3 rounded-xl transition-all cursor-pointer"
                    >
                        הזמנה חדשה
                    </button>
                </div>
            </div>
        {/if}

        <!-- חזרה לדף הבית -->
        <div class="text-center mt-4">
            <a href="/" class="inline-block text-gray-500 hover:text-white text-sm transition-colors">
                ← חזרה לדף הבית
            </a>
        </div>
    </div>
</div>
