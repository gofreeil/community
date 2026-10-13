<script lang="ts">
    import { onMount } from 'svelte';
    import { _ } from 'svelte-i18n';
    import type { PageData } from './$types';
    import { rememberReturn, clearReturn, MATCHMAKER_JOIN_PATH } from '$lib/postAuthReturn';

    let { data }: { data: PageData } = $props();

    // idle: אורחת | sending | sent: נשלחה עכשיו | pending: כבר הייתה פתוחה | approved | error
    type Phase = 'idle' | 'sending' | 'sent' | 'pending' | 'approved' | 'error';
    let phase = $state<Phase>('idle');

    const toJoin = encodeURIComponent(MATCHMAKER_JOIN_PATH);

    async function submit() {
        if (phase === 'sending') return;
        phase = 'sending';
        try {
            const res = await fetch('/api/matchmaker-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            const out = await res.json().catch(() => ({}));
            if (res.ok && out?.success) {
                phase = out.already === 'approved' ? 'approved' : out.already === 'pending' ? 'pending' : 'sent';
            } else {
                phase = 'error';
            }
        } catch {
            phase = 'error';
        }
    }

    onMount(() => {
        if (!data.loggedIn) return;
        // הגענו ליעד - היעד השמור כבר לא נחוץ
        clearReturn();
        if (data.status === 'approved') phase = 'approved';
        else if (data.status === 'pending') phase = 'pending';
        else submit(); // נשלחת לבד: הלחיצה על "בקשה להיות שדכן" כבר הייתה הכוונה
    });

    const steps = [
        { n: 1, title: 'extras.mm_join_step1_title', desc: 'extras.mm_join_step1_desc' },
        { n: 2, title: 'extras.mm_join_step2_title', desc: 'extras.mm_join_step2_desc' },
        { n: 3, title: 'extras.mm_join_step3_title', desc: 'extras.mm_join_step3_desc' },
    ];
</script>

<svelte:head>
    <title>{$_('extras.mm_join_title')} | קהילה בשכונה</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[70vh] flex items-center justify-center px-4 py-8" dir="rtl">
    <div class="w-full max-w-md bg-[#0f172a] rounded-3xl border border-rose-500/30 shadow-2xl overflow-hidden">
        <div class="h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600"></div>
        <div class="p-6 md:p-8 text-center">

            {#if !data.loggedIn}
                <!-- אורחת: מראים בדיוק מה יקרה, ומחזירים אותה לכאן אחרי ההרשמה -->
                <div class="text-5xl mb-3">💘</div>
                <h1 class="text-2xl font-black text-white mb-1">{$_('extras.mm_join_title')}</h1>
                <p class="text-gray-400 text-sm mb-6">{$_('extras.mm_join_sub')}</p>

                <ol class="text-right space-y-3 mb-7">
                    {#each steps as s}
                        <li class="flex items-start gap-3">
                            <span class="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-rose-600 to-pink-500 text-white text-sm font-bold flex items-center justify-center">{s.n}</span>
                            <span>
                                <span class="block text-white font-bold text-sm">{$_(s.title)}</span>
                                <span class="block text-gray-400 text-xs mt-0.5">{$_(s.desc)}</span>
                            </span>
                        </li>
                    {/each}
                </ol>

                <a
                    href="/register?redirect={toJoin}"
                    onclick={() => rememberReturn(MATCHMAKER_JOIN_PATH)}
                    class="block w-full bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg shadow-rose-500/30"
                >{$_('extras.mm_join_register_btn')}</a>
                <a
                    href="/login?redirect={toJoin}"
                    onclick={() => rememberReturn(MATCHMAKER_JOIN_PATH)}
                    class="block w-full mt-3 text-gray-300 hover:text-white border border-white/15 hover:border-white/30 font-semibold py-2.5 rounded-xl transition-all text-sm"
                >{$_('extras.mm_join_login_btn')}</a>

            {:else if phase === 'sending' || phase === 'idle'}
                <div class="py-8">
                    <span class="inline-block w-8 h-8 border-2 border-white/30 border-t-rose-400 rounded-full animate-spin"></span>
                    <p class="text-gray-300 text-sm mt-4">{$_('extras.mm_join_sending')}</p>
                </div>

            {:else if phase === 'error'}
                <div class="text-5xl mb-3">⚠️</div>
                <p class="text-red-400 font-bold mb-4">{$_('extras.s_mm_error')}</p>
                <button
                    type="button"
                    onclick={submit}
                    class="w-full bg-gradient-to-r from-rose-600 to-pink-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg"
                >{$_('extras.mm_join_retry')}</button>

            {:else}
                <!-- נשלחה / כבר פתוחה / כבר מאושרת: תמיד משוב ברור + לאן ממשיכים -->
                <div class="text-5xl mb-3">{phase === 'approved' ? '💘' : '✅'}</div>
                <h1 class="text-xl font-black text-white mb-2">
                    {phase === 'sent' ? $_('extras.mm_join_sent_title')
                        : phase === 'pending' ? $_('extras.mm_join_pending_title')
                        : $_('extras.s_mm_approved')}
                </h1>
                <p class="text-gray-400 text-sm mb-6 leading-relaxed">
                    {phase === 'approved' ? $_('extras.mm_join_approved_sub') : $_('extras.mm_join_sent_sub')}
                </p>
                <a
                    href="/singles"
                    class="block w-full bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg shadow-rose-500/30"
                >{$_('extras.mm_join_back_board')}</a>
                <a
                    href="/profile"
                    class="block w-full mt-3 text-gray-300 hover:text-white border border-white/15 hover:border-white/30 font-semibold py-2.5 rounded-xl transition-all text-sm"
                >{$_('extras.mm_join_to_profile')}</a>
            {/if}
        </div>
    </div>
</div>
