<script lang="ts">
    import { _ } from 'svelte-i18n';

    const benefits = [
        { icon: '👥', title: 'c_b1_title', text: 'c_b1_text' },
        { icon: '🔁', title: 'c_b2_title', text: 'c_b2_text' },
        { icon: '💛', title: 'c_b3_title', text: 'c_b3_text' },
        { icon: '📣', title: 'c_b4_title', text: 'c_b4_text' },
    ];

    const steps = ['c_step1', 'c_step2', 'c_step3'];
</script>

<svelte:head>
    <title>הנחה לחברי המועדון - יוצאים לחירות | קהילה בשכונה</title>
    <meta name="description" content="אנו מעודדים מסעדות ועסקי מזון לתת הנחה לחברי מועדון יוצאים לחירות - חשיפה, לקוחות נאמנים ותדמית קהילתית." />
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-3xl mx-auto">

        <!-- ===== Hero ===== -->
        <div class="relative overflow-hidden rounded-3xl mb-8">
            <div class="absolute inset-0 bg-gradient-to-br from-pink-600 via-rose-600 to-orange-600 opacity-90"></div>
            <div class="relative px-6 py-12 text-center">
                <div class="text-6xl mb-4">🎟️</div>
                <h1 class="text-3xl md:text-4xl font-black text-white mb-3">
                    {$_('extras.c_hero_title')}
                </h1>
                <p class="text-white/85 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                    {$_('extras.c_hero_1')}
                    <span class="font-black">{$_('extras.c_hero_club')}</span>
                    {$_('extras.c_hero_2')}
                </p>
            </div>
        </div>

        <!-- ===== למה זה משתלם ===== -->
        <h2 class="text-white font-black text-xl md:text-2xl mb-4 text-center">{$_('extras.c_why')}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {#each benefits as b}
                <div class="bg-[#0f172a] border border-pink-500/20 rounded-2xl p-5">
                    <div class="text-3xl mb-2">{b.icon}</div>
                    <h3 class="text-white font-bold text-base mb-1.5">{$_(`extras.${b.title}`)}</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">{$_(`extras.${b.text}`)}</p>
                </div>
            {/each}
        </div>

        <!-- ===== איך מצטרפים ===== -->
        <h2 class="text-white font-black text-xl md:text-2xl mb-4 text-center">{$_('extras.c_how')}</h2>
        <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 md:p-6 mb-10">
            <ol class="space-y-3">
                {#each steps as step, i}
                    <li class="flex items-start gap-3">
                        <span class="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white font-black text-sm flex items-center justify-center">
                            {i + 1}
                        </span>
                        <span class="text-gray-300 text-sm leading-relaxed pt-0.5">{$_(`extras.${step}`)}</span>
                    </li>
                {/each}
            </ol>
        </div>

        <!-- ===== הערה ===== -->
        <div class="bg-pink-500/10 border border-pink-500/30 rounded-2xl px-5 py-4 mb-8 text-center">
            <p class="text-pink-100 text-sm leading-relaxed">
                {$_('extras.c_note')}
            </p>
        </div>

        <!-- ===== CTA ===== -->
        <div class="text-center">
            <a
                href="/add/restaurants"
                class="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5"
            >
                {$_('extras.c_cta')}
            </a>
            <div class="mt-4">
                <a href="/national/restaurants" class="text-gray-500 hover:text-white text-sm transition-colors">
                    {$_('extras.c_back')}
                </a>
            </div>
        </div>

    </div>
</div>
