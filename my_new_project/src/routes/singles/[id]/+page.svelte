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
            </div>
        </div>

        <p class="text-center text-gray-500 text-xs mt-6">
            הפרופיל הוצג בלוח פנויים ופנויות של קהילה בשכונה
        </p>
    </div>
</div>
