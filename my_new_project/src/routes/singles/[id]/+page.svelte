<script lang="ts">
    import type { PageData } from './$types';
    import { religiosityLabel } from '$lib/singlesMock';
    let { data }: { data: PageData } = $props();

    const s = data.single!;
    const isMale = s.gender === 'male';

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    // --- שיתוף פרופיל ---
    let shareMenuOpen = $state(false);
    let copied = $state(false);

    function buildShareText(): { title: string; text: string; url: string } {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kehila-bashchuna.co.il';
        const url = `${origin}/singles/${s.id}`;
        const meta = [s.age ? `🎂 ${s.age}` : '', s.city ? `📍 ${s.city}` : ''].filter(Boolean).join(' · ');
        const heading = s.gender === 'female'
            ? `💑 הכירו את ${s.nickname} - פנויה מלוח קהילה בשכונה`
            : `💑 הכירו את ${s.nickname} - פנוי מלוח קהילה בשכונה`;
        const lines = [heading];
        if (meta) lines.push(meta);
        if (s.description) lines.push('', s.description);
        if (s.lookingFor) lines.push('', `${isMale ? 'מחפש' : 'מחפשת'}: ${s.lookingFor}`);
        lines.push('', '👇 לפרופיל המלא:');
        return { title: `${s.nickname} | לוח פנויים ופנויות`, text: lines.join('\n'), url };
    }

    async function nativeShare() {
        const payload = buildShareText();
        if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
            try {
                await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(payload);
                return;
            } catch {}
        }
        shareMenuOpen = !shareMenuOpen;
    }

    function shareTo(network: 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'copy') {
        const { text, url } = buildShareText();
        const textWithUrl = `${text}\n${url}`;
        const enc = encodeURIComponent;
        if (network === 'whatsapp')      window.open(`https://wa.me/?text=${enc(textWithUrl)}`, '_blank');
        else if (network === 'telegram') window.open(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, '_blank');
        else if (network === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, '_blank');
        else if (network === 'x')        window.open(`https://twitter.com/intent/tweet?text=${enc(textWithUrl)}`, '_blank');
        else if (network === 'copy') {
            navigator.clipboard?.writeText(textWithUrl);
            copied = true;
            setTimeout(() => { copied = false; }, 1800);
            return;
        }
        shareMenuOpen = false;
    }
</script>

<svelte:head>
    <title>{s.nickname} - {s.label} | פנויים ופנויות</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <!-- חזרה -->
        <div class="mb-4">
            <a href="/singles" class="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm">
                → חזרה ללוח
            </a>
        </div>

        <!-- כרטיס מלא -->
        <div class="rounded-3xl bg-[#0f172a] border {isMale ? 'border-blue-500/30' : 'border-pink-500/30'} overflow-hidden shadow-2xl">
            <!-- Hero header -->
            <div class="bg-gradient-to-br {isMale ? 'from-blue-600 via-cyan-600 to-blue-700' : 'from-pink-600 via-rose-500 to-pink-700'} p-6 md:p-8">
                <div class="flex flex-col md:flex-row items-center md:items-start gap-5">
                    <div class="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/25 ring-4 ring-white/30 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xl">
                        <img src={s.avatar} alt={s.nickname} class="w-full h-full object-cover" />
                    </div>
                    <div class="flex-1 text-center md:text-right">
                        <h1 class="text-white font-black text-3xl md:text-4xl leading-tight mb-3">{s.nickname}</h1>
                        <div class="flex items-center justify-center md:justify-start gap-4 text-white/90 text-base flex-wrap">
                            {#if s.age}<span class="inline-flex items-center gap-1">🎂 {s.age}</span>{/if}
                            {#if s.city}<span class="inline-flex items-center gap-1">📍 {s.city}</span>{/if}
                            {#if s.religiosity}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-xs font-bold">
                                    {religiosityLabel(s.religiosity, s.gender)}
                                </span>
                            {/if}
                            {#if s.maritalStatus}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-xs font-bold">
                                    💍 {s.maritalStatus}
                                </span>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            <!-- גוף -->
            <div class="p-6 md:p-8 space-y-6">
                {#if s.description}
                    <section>
                        <h2 class="text-{isMale ? 'cyan' : 'pink'}-300 text-sm font-black mb-2 uppercase tracking-wider">קצת עליי</h2>
                        <p class="text-gray-200 text-base leading-relaxed">{s.description}</p>
                    </section>
                {/if}

                {#if s.education}
                    <section>
                        <h2 class="text-{isMale ? 'cyan' : 'pink'}-300 text-sm font-black mb-2 uppercase tracking-wider">מקצוע / השכלה</h2>
                        <p class="text-gray-200 text-base leading-relaxed">{s.education}</p>
                    </section>
                {/if}

                {#if s.interests}
                    <section>
                        <h2 class="text-{isMale ? 'cyan' : 'pink'}-300 text-sm font-black mb-2 uppercase tracking-wider">תחומי עניין</h2>
                        <p class="text-gray-200 text-base leading-relaxed">{s.interests}</p>
                    </section>
                {/if}

                {#if s.lookingFor}
                    <section class="rounded-2xl bg-white/5 border border-white/10 px-5 py-4">
                        <h2 class="text-{isMale ? 'cyan' : 'pink'}-300 text-sm font-black mb-2 uppercase tracking-wider">
                            {isMale ? 'מחפש' : 'מחפשת'}
                        </h2>
                        <p class="text-gray-100 text-base leading-relaxed">{s.lookingFor}</p>
                    </section>
                {/if}

                {#if s.inspiration}
                    <section class="border-r-4 {isMale ? 'border-cyan-500/50' : 'border-pink-500/50'} pr-4">
                        <p class="text-gray-300 text-base italic leading-relaxed">{s.inspiration}</p>
                    </section>
                {/if}

                <!-- פרטי קשר - רק דרך השדכן/חבר -->
                <section class="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-5">
                    <h2 class="text-amber-300 text-sm font-black mb-3 uppercase tracking-wider">יצירת קשר דרך שדכן/חבר</h2>
                    <div class="space-y-2 text-gray-200">
                        {#if s.matchmaker}
                            <div class="flex items-center gap-2 text-sm">
                                <span class="text-gray-400">🤝 שדכן/חבר:</span>
                                <span class="font-bold">{s.matchmaker}{s.matchmakerPhone ? ' · ' + s.matchmakerPhone : ''}</span>
                            </div>
                        {/if}
                    </div>

                    {#if s.matchmakerPhone}
                        <div class="grid grid-cols-2 gap-2 mt-4">
                            <a
                                href={waLink(s.matchmakerPhone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                            >
                                💬 WhatsApp לשדכן
                            </a>
                            <a
                                href="tel:{s.matchmakerPhone}"
                                class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                            >
                                📞 התקשר לשדכן
                            </a>
                        </div>
                    {:else}
                        <p class="mt-4 text-center text-gray-400 text-sm italic">
                            לא הוגדר שדכן/חבר ליצירת קשר. הפרופיל לתצוגה בלבד.
                        </p>
                    {/if}
                </section>

                <!-- שיתוף הכרטיס -->
                <section class="rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 p-5">
                    <div class="flex items-start gap-3 mb-3">
                        <span class="text-2xl">💬</span>
                        <div class="flex-1">
                            <h2 class="text-green-300 text-sm font-black mb-1 uppercase tracking-wider">מכיר/ה מישהו שיכול להתאים?</h2>
                            <p class="text-gray-400 text-xs leading-relaxed">שתפו את הכרטיס בווטסאפ ובוו תפיצו את הבשורה - אולי השידוך נמצא שם!</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button
                            type="button"
                            onclick={() => shareTo('whatsapp')}
                            class="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-green-900/30"
                        >
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.03L.789 23.702l4.823-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.33 0-4.481-.76-6.234-2.048l-.447-.334-2.862.87.908-2.745-.367-.472A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                            WhatsApp
                        </button>
                        <button
                            type="button"
                            onclick={() => shareTo('telegram')}
                            class="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-sky-900/30"
                        >
                            ✈️ Telegram
                        </button>
                        <button
                            type="button"
                            onclick={() => shareTo('facebook')}
                            class="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-blue-900/30"
                        >
                            📘 Facebook
                        </button>
                        <button
                            type="button"
                            onclick={() => shareTo('x')}
                            class="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors text-sm border border-white/10"
                        >
                            𝕏 Twitter
                        </button>
                        <button
                            type="button"
                            onclick={() => shareTo('copy')}
                            class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                        >
                            {copied ? '✓ הועתק!' : '📋 העתק קישור'}
                        </button>
                        <button
                            type="button"
                            onclick={nativeShare}
                            class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                            aria-label="שיתוף נוסף"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="18" cy="5" r="3"/>
                                <circle cx="6" cy="12" r="3"/>
                                <circle cx="18" cy="19" r="3"/>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                            עוד...
                        </button>
                    </div>
                </section>
            </div>
        </div>

        <p class="text-center text-gray-500 text-xs mt-6">
            הפרופיל הוצג בלוח פנויים ופנויות של קהילה בשכונה
        </p>
    </div>
</div>
