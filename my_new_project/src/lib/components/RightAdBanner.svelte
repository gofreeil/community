<script lang="ts">
    import { onMount } from 'svelte';

    let currentAd = 0;

    const ads = [
        {
            text: "קהילה בשכונה",
            borderColor: "border-blue-500/30",
            bgColor: "bg-blue-900/10",
            hoverBorder: "hover:border-blue-500",
            hoverBg: "hover:bg-blue-900/20",
            textColor: "text-blue-400",
            hoverText: "group-hover:text-blue-200",
            buttonColor: "bg-blue-600 hover:bg-blue-500"
        },
        {
            text: "קהילה בשכונה",
            borderColor: "border-purple-500/30",
            bgColor: "bg-purple-900/10",
            hoverBorder: "hover:border-purple-500",
            hoverBg: "hover:bg-purple-900/20",
            textColor: "text-purple-400",
            hoverText: "group-hover:text-purple-200",
            buttonColor: "bg-purple-600 hover:bg-purple-500"
        },
        {
            text: "קהילה בשכונה",
            borderColor: "border-pink-500/30",
            bgColor: "bg-pink-900/10",
            hoverBorder: "hover:border-pink-500",
            hoverBg: "hover:bg-pink-900/20",
            textColor: "text-pink-400",
            hoverText: "group-hover:text-pink-200",
            buttonColor: "bg-pink-600 hover:bg-pink-500"
        },
        {
            text: "קהילה בשכונה",
            borderColor: "border-green-500/30",
            bgColor: "bg-green-900/10",
            hoverBorder: "hover:border-green-500",
            hoverBg: "hover:bg-green-900/20",
            textColor: "text-green-400",
            hoverText: "group-hover:text-green-200",
            buttonColor: "bg-green-600 hover:bg-green-500"
        }
    ];

    onMount(() => {
        const interval = setInterval(() => {
            currentAd = (currentAd + 1) % ads.length;
        }, 6000);

        return () => clearInterval(interval);
    });
</script>

<!-- RightAdBanner.svelte -->
<aside class="hidden xl:block w-36 flex-shrink-0">
    <div class="space-y-3">
        {#each ads as ad, index}
            <div
                class="h-[560px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed {ad.borderColor} {ad.bgColor} p-3 text-center transition-all {ad.hoverBorder} {ad.hoverBg} group duration-700"
                style="animation: fadeIn 0.7s ease-in-out;"
            >
                <div
                    class="[writing-mode:vertical-rl] text-base font-black {ad.textColor} {ad.hoverText} tracking-widest whitespace-nowrap"
                >
                    {ad.text}
                </div>
                <div class="mt-3 text-xl">📢</div>
                <a
                    href="mailto:ads@shchuna.co.il"
                    class="mt-4 rounded-full {ad.buttonColor} px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-colors"
                >
                    לפרטים
                </a>
            </div>
        {/each}
    </div>
</aside>

<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateX(10px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
</style>
