<script lang="ts">
    import CoaliEmbed from './CoaliEmbed.svelte';
    import ReferendumBanner from './ReferendumBanner.svelte';
    import FacebookComments from './FacebookComments.svelte';

    interface Props {
        showCoali?: boolean;
    }
    let { showCoali = false }: Props = $props();

    let active: 'vote' | 'chat' = $state('vote');

    function bringFront(which: 'vote' | 'chat') {
        active = which;
    }
</script>

<div class="relative w-full max-w-md mx-auto" style="perspective: 1400px;">
    <!-- Title -->
    <div class="text-center mb-3">
        <h2 class="text-lg md:text-xl font-black bg-gradient-to-r from-purple-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
            שיח פתוח ומשאלי עם בשכונה
        </h2>
        <div class="h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent mt-2"></div>
    </div>

    <!-- 3D stack container -->
    <div class="relative" style="height: 670px; transform-style: preserve-3d;">
        <!-- VOTE card -->
        <div
            class="absolute top-0 right-0 left-0 bottom-0 rounded-2xl overflow-hidden bg-[#0b1020] shadow-2xl transition-all duration-500 ease-out origin-right"
            style={active === 'vote'
                ? 'transform: translateX(0) translateZ(0) rotateY(0deg); z-index: 20; filter: brightness(1);'
                : 'transform: translateX(-30%) translateZ(-140px) rotateY(22deg); z-index: 10; filter: brightness(0.5);'}
        >
            <div class="w-full h-full overflow-y-auto bg-[#0b1020]">
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
            class="absolute top-0 right-0 left-0 bottom-0 rounded-2xl overflow-hidden bg-[#0b1020] shadow-2xl transition-all duration-500 ease-out origin-left"
            style={active === 'chat'
                ? 'transform: translateX(0) translateZ(0) rotateY(0deg); z-index: 20; filter: brightness(1);'
                : 'transform: translateX(-30%) translateZ(-140px) rotateY(22deg); z-index: 10; filter: brightness(0.5);'}
        >
            <div class="w-full h-full overflow-y-auto bg-[#0b1020] p-3 flex flex-col">
                <h3 class="text-base md:text-lg font-bold text-white mb-3 text-center flex items-center justify-center gap-2 flex-shrink-0">
                    <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    שיח פתוח
                </h3>
                <div class="flex-1 min-h-0 overflow-y-auto">
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
