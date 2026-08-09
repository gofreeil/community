<script lang="ts">
    import { adPopup, closeAdPopup } from '$lib/adPopupStore';
    import { adImgFit } from '$lib/adImageFit';
    import type { Ad } from '$lib/adsData';
    import { goto } from '$app/navigation';
    import { onDestroy } from 'svelte';
    import { _ } from 'svelte-i18n';

    let popup = $state<{ ad: Ad; pendingHref?: string } | null>(null);
    let countdown = $state(5);
    let timer: ReturnType<typeof setInterval> | null = null;

    const unsubscribe = adPopup.subscribe(val => {
        popup = val;
        if (val) {
            countdown = 5;
            if (timer) clearInterval(timer);
            timer = setInterval(() => {
                countdown -= 1;
                if (countdown <= 0) {
                    handleClose();
                }
            }, 1000);
        } else {
            if (timer) { clearInterval(timer); timer = null; }
        }
    });

    function handleClose() {
        const href = popup?.pendingHref;
        closeAdPopup();
        if (href) goto(href);
    }

    onDestroy(() => {
        unsubscribe();
        if (timer) clearInterval(timer);
    });
</script>

{#if popup}
<!-- מוצג רק במובייל -->
<div class="lg:hidden" dir="rtl">
    <!-- Overlay -->
    <button
        class="fixed inset-0 bg-black/70 z-[2000] cursor-pointer"
        style="border: none; padding: 0;"
        onclick={handleClose}
        aria-label={$_('components.close_ad_aria')}
    ></button>

    <!-- Popup -->
    <div class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] w-[90vw] max-w-sm rounded-2xl overflow-hidden shadow-2xl">

        <!-- Countdown progress bar -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-white/20 z-10">
            <div
                class="h-full bg-purple-500 transition-[width] duration-1000 ease-linear"
                style="width: {(countdown / 5) * 100}%"
            ></div>
        </div>

        <!-- Close button with countdown -->
        <button
            onclick={handleClose}
            class="close-countdown"
            aria-label={$_('components.close')}
        >
            {countdown}
        </button>

        <!-- Ad image -->
        <!-- overflow-hidden: בתקריב התמונה גדולה מהמשבצת ואסור שתגלוש על הטקסט -->
        <div class="relative h-44 w-full overflow-hidden">
            <!-- תמונה ייעודית לנייד אם המפרסם העלה אחת - המשבצת כאן רחבה
                 ונמוכה, והתמונה של הדסקטופ נחתכת בה אחרת לגמרי -->
            <img
                src={popup.ad.mobileImage || popup.ad.image}
                alt={popup.ad.title}
                class="w-full h-full object-cover"
                use:adImgFit={popup.ad.mobileImage && popup.ad.mobileImageFit
                    ? popup.ad.mobileImageFit
                    : { x: 50, y: 50, z: popup.ad.imageScale ?? 1 }}
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        </div>

        <!-- Ad content -->
        <div class="bg-[#0f172a] p-4">
            <h3 class="text-lg font-black bg-gradient-to-r {popup.ad.color} bg-clip-text text-transparent mb-1 leading-tight">
                {popup.ad.title}
            </h3>
            <p class="text-gray-300 text-sm mb-3 leading-snug">{popup.ad.description}</p>
            <!-- דף נחיתה של מפרסם משולם הוא יעד פנימי (/ads/<id>) ונפתח באותה
                 לשונית, בדיוק כמו בטור הימני בדסקטופ. אתרי הרשת ממשיכים
                 להיפתח בלשונית חדשה. -->
            <a
                href={popup.ad.href}
                target={popup.ad.internal ? undefined : "_blank"}
                rel={popup.ad.internal ? undefined : "noopener noreferrer"}
                aria-label="{popup.ad.cta} – {popup.ad.title}{popup.ad.internal ? '' : $_('components.opens_new_window_suffix')}"
                onclick={() => closeAdPopup()}
                class="block w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold hover:from-purple-500 hover:to-indigo-500 transition-all"
            >
                ← {popup.ad.cta}
            </a>
        </div>
    </div>
</div>
{/if}

<style>
    .close-countdown {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        z-index: 10;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #fff;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
    }
    .close-countdown:hover {
        background: rgba(0, 0, 0, 0.8);
    }
</style>
