<script lang="ts">
    import { onMount } from "svelte";

    let currentAd = 0;

    const ads = [
        {
            text: "מקום פרסום",
            description: "זה יכול להיות שלך",
            borderColor: "border-orange-500/30",
            bgColor: "bg-orange-900/10",
            hoverBorder: "hover:border-orange-500",
            hoverBg: "hover:bg-orange-900/20",
            textColor: "text-orange-400",
            hoverText: "group-hover:text-orange-200",
            buttonColor: "bg-orange-600 hover:bg-orange-500",
        },
        {
            text: "מקום פרסום",
            description: "זה יכול להיות שלך",
            borderColor: "border-blue-500/30",
            bgColor: "bg-blue-900/10",
            hoverBorder: "hover:border-blue-500",
            hoverBg: "hover:bg-blue-900/20",
            textColor: "text-blue-400",
            hoverText: "group-hover:text-blue-200",
            buttonColor: "bg-blue-600 hover:bg-blue-500",
        },
        {
            text: "מקום פרסום",
            description: "זה יכול להיות שלך",
            borderColor: "border-green-500/30",
            bgColor: "bg-green-900/10",
            hoverBorder: "hover:border-green-500",
            hoverBg: "hover:bg-green-900/20",
            textColor: "text-green-400",
            hoverText: "group-hover:text-green-200",
            buttonColor: "bg-green-600 hover:bg-green-500",
        },
        {
            text: "מקום פרסום",
            description: "זה יכול להיות שלך",
            borderColor: "border-amber-500/30",
            bgColor: "bg-amber-900/10",
            hoverBorder: "hover:border-amber-500",
            hoverBg: "hover:bg-amber-900/20",
            textColor: "text-amber-400",
            hoverText: "group-hover:text-amber-200",
            buttonColor: "bg-amber-600 hover:bg-amber-500",
        },
    ];

    onMount(() => {
        const interval = setInterval(() => {
            currentAd = (currentAd + 1) % ads.length;
        }, 6000);

        return () => clearInterval(interval);
    });
</script>

<!-- RightAdBanner.svelte -->
<aside class="hidden xl:block w-36 flex-shrink-0 sticky top-4 h-fit pb-8">
    <div class="space-y-3">
        {#each ads as ad, index}
            <div
                class="h-[560px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed {ad.borderColor} {ad.bgColor} p-3 text-center transition-all {ad.hoverBorder} {ad.hoverBg} group duration-700"
                style="animation: fadeIn 0.7s ease-in-out;"
            >
                <div
                    class="flex flex-col items-center justify-between h-full py-6 relative overflow-hidden w-full"
                >
                    <div
                        class="text-3xl mt-4 z-10 transition-transform group-hover:scale-125 duration-300"
                    >
                        📢
                    </div>

                    <div
                        class="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <div
                            class="-rotate-90 flex items-center gap-3 whitespace-nowrap transform origin-center"
                        >
                            <span
                                class="text-2xl font-black {ad.textColor} {ad.hoverText} tracking-wider drop-shadow-sm"
                            >
                                {ad.text}
                            </span>
                            <span
                                class="text-base font-bold {ad.textColor} {ad.hoverText} opacity-90 drop-shadow-sm"
                            >
                                — {ad.description}
                            </span>
                        </div>
                    </div>

                    <a
                        href="mailto:ads@shchuna.co.il"
                        class="mb-4 z-10 rounded-full {ad.buttonColor} px-5 py-2 text-sm font-bold text-white shadow-xl transition-transform hover:scale-105"
                    >
                        לפרטים
                    </a>
                </div>
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
