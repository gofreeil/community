<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let q = $state('');
    let showAddedBanner = $state(false);

    onMount(() => {
        if (!browser) return;
        if ($page.url.searchParams.get('added') === '1') {
            showAddedBanner = true;
            // נקה את הפרמטר מה-URL כדי שרענון לא יציג שוב
            const url = new URL(window.location.href);
            url.searchParams.delete('added');
            window.history.replaceState({}, '', url.toString());
        }
    });

    function getField(extraFields: string, key: string): string {
        try { return JSON.parse(extraFields)?.[key] ?? ''; }
        catch { return ''; }
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    let filtered = $derived(
        q.trim()
            ? data.items.filter(i =>
                i.label.toLowerCase().includes(q.toLowerCase()) ||
                (i.description ?? '').toLowerCase().includes(q.toLowerCase())
            )
            : data.items
    );
</script>

<svelte:head>
    <title>לוח גמחים | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🤝</span>
            <h1 class="text-3xl font-black text-white mb-2">לוח גמחים</h1>
            <p class="text-gray-400">לוח ארצי — שירותי השאלה חינם בכל רחבי הארץ</p>
        </div>

        {#if showAddedBanner}
            <div class="rounded-2xl border-2 border-emerald-500/40 bg-emerald-900/20 p-5 mb-6 shadow-lg">
                <div class="flex items-start gap-3">
                    <div class="text-3xl flex-shrink-0">✅</div>
                    <div class="flex-1 min-w-0">
                        <p class="text-emerald-100 font-black text-base mb-1">הגמ"ח שלך נוסף בהצלחה!</p>
                        <p class="text-emerald-200/90 text-sm leading-relaxed mb-3">
                            הגמ"ח מופיע כעת בלוח הקהילה — וגם נוסף אוטומטית ל<strong>אתר הגמ"ח הארצי</strong> כדי שיותר אנשים יוכלו למצוא אותו.
                        </p>
                        <a
                            href="https://national-gemach.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-full transition-colors"
                        >
                            <span>🌐</span>
                            צפה באתר הגמ"ח הארצי
                            <span class="text-xs opacity-80">↗</span>
                        </a>
                    </div>
                    <button
                        type="button"
                        onclick={() => (showAddedBanner = false)}
                        aria-label="סגור הודעה"
                        class="text-emerald-300/60 hover:text-white text-lg flex-shrink-0 transition-colors"
                    >✕</button>
                </div>
            </div>
        {/if}

        <div class="mb-6">
            <input
                bind:value={q}
                type="search"
                placeholder="🔍 חפש גמח (כיסאות, שמלות כלה, ציוד רפואי...)"
                class="w-full bg-white/5 border border-white/10 rounded-full px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
        </div>

        <div class="flex justify-center mb-6">
            <a
                href="/gmachim/add"
                class="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-amber-500/25 transition-all hover:scale-105"
            >
                <span class="text-lg">➕</span>
                פרסם גמח חדש
            </a>
        </div>

        <div class="text-center mb-6">
            <p class="text-gray-500 text-sm">🤝 {filtered.length} גמחים פעילים</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filtered as item}
                {@const hours = getField(item.extra_fields, 'hours')}
                <div class="rounded-2xl bg-[#0f172a] border border-amber-500/30 overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                    <div class="bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex items-center gap-3">
                        <div class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                            {item.icon || '🤝'}
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-white font-black text-lg truncate">{item.label}</h3>
                            {#if item.address}
                                <p class="text-white/80 text-sm truncate">📍 {item.address}</p>
                            {/if}
                        </div>
                    </div>
                    <div class="p-4">
                        {#if item.description}
                            <p class="text-gray-300 text-sm leading-relaxed mb-3">{item.description}</p>
                        {/if}
                        {#if hours}
                            <div class="flex items-center gap-2 text-gray-300 text-sm mb-3">
                                <span class="text-base">🕒</span>
                                <span>{hours}</span>
                            </div>
                        {/if}
                        {#if item.contact}
                            <p class="text-gray-400 text-sm mb-3">איש קשר: <strong class="text-white">{item.contact}</strong></p>
                        {/if}
                        {#if item.phone}
                            <div class="flex gap-2">
                                <a
                                    href={waLink(item.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
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
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        {#if filtered.length === 0}
            <div class="text-center py-16">
                <span class="text-5xl mb-4 block">🤝</span>
                <p class="text-gray-400 text-lg">אין גמחים בלוח כרגע</p>
                <p class="text-gray-500 text-sm mt-2">היה הראשון לפרסם!</p>
            </div>
        {/if}

        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>
