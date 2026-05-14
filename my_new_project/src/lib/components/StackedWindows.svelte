<script lang="ts">
    import { onMount } from 'svelte';
    import CoaliEmbed from './CoaliEmbed.svelte';
    import ReferendumBanner from './ReferendumBanner.svelte';
    import FacebookComments from './FacebookComments.svelte';

    interface Props {
        showCoali?: boolean;
    }
    let { showCoali = false }: Props = $props();

    const LS_LAST = 'stackedWindows.lastActive';

    let active: 'vote' | 'chat' = $state('vote');
    let noAnim = $state(true);
    let stackEl: HTMLElement | undefined = $state();

    onMount(() => {
        let target: 'vote' | 'chat' = 'vote';
        try {
            const last = localStorage.getItem(LS_LAST);
            if (last === 'vote' || last === 'chat') target = last;
        } catch {}

        // Start silently in the OPPOSITE of target (no animation on first paint).
        const opposite: 'vote' | 'chat' = target === 'vote' ? 'chat' : 'vote';
        active = opposite;

        let played = false;
        const playDemo = () => {
            if (played) return;
            played = true;
            window.removeEventListener('scroll', tryDemo);
            // Wait two frames so the initial pose paints, then start the swap — single fluid motion, no freeze.
            requestAnimationFrame(() => requestAnimationFrame(() => {
                noAnim = false;
                active = target;
            }));
        };

        const tryDemo = () => {
            if (played || !stackEl) return;
            const r = stackEl.getBoundingClientRect();
            if (r.top < window.innerHeight * 0.85 && r.bottom > window.innerHeight * 0.15) {
                playDemo();
            }
        };

        // Try immediately on mount — if visible, animation kicks in without delay.
        tryDemo();
        window.addEventListener('scroll', tryDemo, { passive: true });
        return () => window.removeEventListener('scroll', tryDemo);
    });

    function bringFront(which: 'vote' | 'chat') {
        if (noAnim) noAnim = false;
        active = which;
        try { localStorage.setItem(LS_LAST, which); } catch {}
    }
</script>

<div class="stack-wrap relative w-full max-w-md mx-auto overflow-hidden md:overflow-visible {noAnim ? 'no-anim' : ''}" style="perspective: 1400px;">
    <!-- Title -->
    <div class="text-center mt-4 md:mt-8 mb-3 md:mb-4">
        <h2 class="text-base md:text-3xl font-black bg-gradient-to-r from-purple-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
            שיח פתוח ומשאלי עם בשכונה
        </h2>
        <div class="h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent mt-2 md:mt-3"></div>
    </div>

    <!-- 3D stack container -->
    <div bind:this={stackEl} class="relative h-[520px] md:h-[670px]" style="transform-style: preserve-3d;">
        <!-- Mobile peek tap target — outside 3D so it gets reliable hit-testing -->
        <button
            type="button"
            onclick={() => bringFront(active === 'vote' ? 'chat' : 'vote')}
            class="md:hidden absolute left-0 top-0 bottom-0 w-[16%] z-40 cursor-pointer bg-transparent"
            aria-label="עבור לחלון השני"
        ></button>
        <!-- VOTE card -->
        <div
            class="card absolute inset-y-0 right-0 w-[85%] md:w-auto md:inset-0 rounded-2xl overflow-hidden bg-[#0b1020] will-change-transform {active === 'vote' ? 'card-front' : 'card-back'}"
        >
            <div class="w-full h-full overflow-x-hidden overflow-y-auto no-scrollbar bg-[#0b1020]">
                {#if showCoali}
                    <CoaliEmbed />
                {:else}
                    <ReferendumBanner />
                {/if}
            </div>
            {#if active !== 'vote'}
                <button
                    type="button"
                    onclick={() => bringFront('vote')}
                    class="absolute inset-0 z-30 cursor-pointer"
                    aria-label="הבא להצבעות"
                ></button>
            {/if}
        </div>

        <!-- CHAT card -->
        <div
            class="card absolute inset-y-0 right-0 w-[85%] md:w-auto md:inset-0 rounded-2xl overflow-hidden bg-[#0b1020] will-change-transform {active === 'chat' ? 'card-front' : 'card-back'}"
        >
            <div class="w-full h-full overflow-x-hidden overflow-y-auto no-scrollbar bg-[#0b1020] p-3 flex flex-col">
                <h3 class="text-base md:text-lg font-bold text-white mb-3 text-center flex items-center justify-center gap-2 flex-shrink-0">
                    <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    שיח פתוח
                </h3>
                <div class="flex-1 min-h-0 overflow-x-hidden overflow-y-auto no-scrollbar">
                    <FacebookComments numPosts={10} />
                </div>
            </div>
            {#if active !== 'chat'}
                <button
                    type="button"
                    onclick={() => bringFront('chat')}
                    class="absolute inset-0 z-30 cursor-pointer"
                    aria-label="הבא לשיח פתוח"
                ></button>
            {/if}
        </div>
    </div>
</div>

<style>
    .no-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .no-scrollbar::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
    }
    .card {
        backface-visibility: visible;
        transition: filter 1300ms ease, box-shadow 1300ms ease;
        will-change: transform, filter;
    }
    /* Suppress all animation/transition before the demo swap fires (prevents mount jumps) */
    .no-anim .card,
    .no-anim .card-front,
    .no-anim .card-back {
        animation: none !important;
        transition: none !important;
    }
    /* Mobile defaults — front anchored right, back peeks left inside wrap */
    .card-front {
        transform: translateX(0) translateZ(0) rotateY(0deg) scale(1);
        z-index: 20;
        filter: brightness(1) saturate(1);
        box-shadow: 0 25px 60px -10px rgba(59, 130, 246, 0.5), 0 0 0 1px rgba(255,255,255,0.08);
        animation: cardToFront 1300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    }
    .card-back {
        transform-origin: center center;
        transform: translateX(-22%) translateZ(-100px) rotateY(20deg) scale(0.92);
        z-index: 10;
        filter: brightness(0.45) saturate(0.7);
        box-shadow: 0 10px 30px -5px rgba(0,0,0,0.6);
        animation: cardToBack 1300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    }

    /* Mobile keyframes — direct interpolation, no mid-keyframe (avoids per-segment easing hitch) */
    @keyframes cardToFront {
        from { transform: translateX(-22%) translateZ(-100px) rotateY(20deg) scale(0.92); z-index: 15; }
        to   { transform: translateX(0)    translateZ(0)     rotateY(0deg)  scale(1); z-index: 20; }
    }
    @keyframes cardToBack {
        from { transform: translateX(0)    translateZ(0)     rotateY(0deg)   scale(1); z-index: 18; }
        to   { transform: translateX(-22%) translateZ(-100px) rotateY(20deg) scale(0.92); z-index: 10; }
    }

    /* Desktop — back peeks RIGHT, full-width cards. Cards arc through forward space passing each other. */
    @media (min-width: 768px) {
        .card-back {
            transform-origin: left center;
            transform: translateX(38%) translateZ(-220px) rotateY(-28deg) scale(0.92);
        }
        /* Desktop — direct interpolation, no mid-keyframe (smooth, no hitch) */
        @keyframes cardToFront {
            from { transform: translateX(38%) translateZ(-220px) rotateY(-28deg) scale(0.92); z-index: 15; }
            to   { transform: translateX(0)   translateZ(0)      rotateY(0deg)   scale(1); z-index: 20; }
        }
        @keyframes cardToBack {
            from { transform: translateX(0)    translateZ(0)      rotateY(0deg)   scale(1); z-index: 18; }
            to   { transform: translateX(38%)  translateZ(-220px) rotateY(-28deg) scale(0.92); z-index: 10; }
        }
    }
</style>
