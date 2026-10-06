<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '972')}`;
    const genderIcon = (g: string) => (g === 'female' ? '👩' : g === 'male' ? '👨' : '💘');
</script>

<svelte:head>
    <title>צוות השדכנים | קהילה בשכונה | יוצאים לחירות</title>
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="mb-4">
            <a href="/singles/matchmaker" class="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm">→ חזרה לכלי השדכן</a>
        </div>

        <div class="text-center mb-6">
            <div class="text-4xl mb-2">👥</div>
            <h1 class="text-2xl md:text-3xl font-black text-white mb-1">צוות השדכנים</h1>
            <p class="text-gray-400 text-sm">
                {data.team.length} שדכנים/ות מאושרים/ות
                {#if data.isSuperAdmin}· בקשות חדשות לאישור ב<a href="/admin/singles-review" class="text-pink-300 underline underline-offset-2">דף האישורים</a>{/if}
            </p>
        </div>

        {#if data.team.length === 0}
            <div class="text-center py-16">
                <span class="text-5xl mb-4 block">🕊️</span>
                <p class="text-gray-400">עדיין אין שדכנים מאושרים</p>
            </div>
        {:else}
            <div class="space-y-2.5">
                {#each data.team as m (m.userId || m.nickname)}
                    <div class="flex items-center gap-3 rounded-2xl bg-[#0f172a] border border-white/10 px-4 py-3">
                        <div class="w-11 h-11 rounded-full bg-gradient-to-br from-rose-500/30 to-fuchsia-500/20 ring-1 ring-pink-400/40 flex items-center justify-center text-xl shrink-0">
                            {genderIcon(m.gender)}
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="font-bold text-white text-sm leading-tight truncate">
                                {m.nickname || 'שדכן/ית'}
                                {#if m.userId === data.meId}<span class="text-[11px] font-bold text-pink-300 ms-1">(את/ה)</span>{/if}
                            </p>
                            {#if m.city || m.neighborhood}
                                <p class="text-gray-400 text-xs mt-0.5">{[m.city, m.neighborhood].filter(Boolean).join(' · ')}</p>
                            {/if}
                        </div>
                        {#if m.phone}
                            <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer"
                               class="shrink-0 bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors"
                               aria-label="וואטסאפ ל{m.nickname}">וואטסאפ</a>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
