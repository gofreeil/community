<script lang="ts">
    import { fade } from 'svelte/transition';

    // תצוגת תמונות במסך מלא: חצים / מקלדת / החלקה למעבר, וסגירה חזרה לדף.
    // index === null → סגור. הדף קובע את האינדקס (bind:index) בלחיצה על תמונה.
    let { images, index = $bindable(null), alt = '' }: {
        images: string[];
        index: number | null;
        alt?: string;
    } = $props();

    const open = $derived(index !== null && images.length > 0);
    const multi = $derived(images.length > 1);

    function close() { index = null; }
    // RTL: "הבא" הוא שמאלה, "הקודם" ימינה
    function next() { if (index !== null) index = (index + 1) % images.length; }
    function prev() { if (index !== null) index = (index - 1 + images.length) % images.length; }

    function onKey(e: KeyboardEvent) {
        if (!open) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft' && multi) next();
        else if (e.key === 'ArrowRight' && multi) prev();
    }

    // נעילת גלילת הרקע בזמן שהתצוגה פתוחה
    $effect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prevOverflow; };
    });

    // החלקה במגע: ימינה = הבא (כמו החץ השמאלי ב-RTL), שמאלה = הקודם
    let touchX = 0;
    function onTouchStart(e: TouchEvent) { touchX = e.changedTouches[0].clientX; }
    function onTouchEnd(e: TouchEvent) {
        if (!multi) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) < 50) return;
        if (dx > 0) next(); else prev();
    }
</script>

<svelte:window onkeydown={onKey} />

{#if open && index !== null}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <div
        role="dialog"
        aria-modal="true"
        aria-label="תצוגת תמונה מוגדלת"
        tabindex="-1"
        dir="rtl"
        class="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
        transition:fade={{ duration: 150 }}
        onclick={(e) => { if (e.target === e.currentTarget) close(); }}
        ontouchstart={onTouchStart}
        ontouchend={onTouchEnd}
    >
        <button type="button" onclick={close} aria-label="חזרה לפרופיל"
            class="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-3.5 py-2 backdrop-blur-sm transition-colors">
            ✕ חזרה לפרופיל
        </button>

        {#if multi}
            <button type="button" onclick={prev} aria-label="התמונה הקודמת"
                class="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl font-black flex items-center justify-center backdrop-blur-sm transition-colors">→</button>
            <button type="button" onclick={next} aria-label="התמונה הבאה"
                class="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl font-black flex items-center justify-center backdrop-blur-sm transition-colors">←</button>
            <span class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-bold">
                {index + 1} / {images.length}
            </span>
        {/if}

        {#key index}
            <img
                src={images[index]}
                alt={alt ? `${alt} - תמונה ${index + 1}` : `תמונה ${index + 1}`}
                class="max-w-[92vw] max-h-[86vh] w-auto h-auto object-contain rounded-lg shadow-2xl select-none"
                draggable="false"
                in:fade={{ duration: 150 }}
            />
        {/key}
    </div>
{/if}
