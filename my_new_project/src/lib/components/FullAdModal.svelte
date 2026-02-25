<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import type { Ad } from "$lib/adsData";
    import { onMount } from "svelte";

    let { ad, onClose }: { ad: Ad; onClose: () => void } = $props();
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let modalElement: HTMLDivElement;
    
    onMount(() => {
        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY;
            isDragging = true;
        };
        
        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            // If swiping up (negative diff), move the modal up
            if (diff < 0 && modalElement) {
                modalElement.style.transform = `translateY(${diff}px) scale(0.9)`;
                modalElement.style.opacity = `${1 + diff / 300}`;
            }
        };
        
        const handleTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            
            const diff = currentY - startY;
            
            // If swiped up more than 100px, close the modal
            if (diff < -100) {
                onClose();
            } else if (modalElement) {
                // Reset position
                modalElement.style.transform = 'scale(0.9)';
                modalElement.style.opacity = '1';
            }
        };
        
        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        
        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    });
</script>

<div
    class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    transition:fade
    onclick={onClose}
    onkeydown={(e) => e.key === "Escape" && onClose()}
    role="button"
    tabindex="0"
>
    <div
        bind:this={modalElement}
        class="bg-[#0f172a] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative transition-all duration-200"
        transition:scale={{ start: 0.9, duration: 300 }}
        onclick={(e) => e.stopPropagation()}
        role="presentation"
    >
        <!-- Close Button -->
        <button
            class="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            onclick={onClose}
        >
            ✕
        </button>

        <!-- Image -->
        <div class="h-64 overflow-hidden relative">
            <img
                src={ad.image}
                alt={ad.title}
                class="w-full h-full object-cover"
            />
            <div
                class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"
            ></div>
        </div>

        <!-- Content -->
        <div class="p-8 text-center">
            <h2
                class="text-3xl font-black bg-gradient-to-r {ad.color} bg-clip-text text-transparent mb-4"
            >
                {ad.title}
            </h2>
            <p class="text-gray-300 text-lg mb-8 leading-relaxed">
                {ad.description}
            </p>

            <a
                href={ad.href}
                target="_blank"
                class="inline-block w-full py-4 px-8 rounded-2xl bg-gradient-to-r {ad.color} text-white font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all shadow-blue-500/20"
            >
                {ad.cta}
            </a>
        </div>
    </div>
</div>
