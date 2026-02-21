<script lang="ts">
    import { onMount } from 'svelte';

    let currentAdSet = 0;

    const adSets = [
        [
            {
                text: "פרסום זה יכול להיות שלך",
                borderColor: "border-blue-500/30",
                bgColor: "bg-blue-900/10",
                hoverBorder: "hover:border-blue-500",
                hoverBg: "hover:bg-blue-900/20",
                textColor: "text-blue-400",
                hoverText: "group-hover:text-blue-200",
                buttonColor: "bg-blue-600 hover:bg-blue-500"
            },
            {
                text: "פרסום זה יכול להיות שלך",
                borderColor: "border-purple-500/30",
                bgColor: "bg-purple-900/10",
                hoverBorder: "hover:border-purple-500",
                hoverBg: "hover:bg-purple-900/20",
                textColor: "text-purple-400",
                hoverText: "group-hover:text-purple-200",
                buttonColor: "bg-purple-600 hover:bg-purple-500"
            }
        ],
        [
            {
                text: "פרסום זה יכול להיות שלך",
                borderColor: "border-green-500/30",
                bgColor: "bg-green-900/10",
                hoverBorder: "hover:border-green-500",
                hoverBg: "hover:bg-green-900/20",
                textColor: "text-green-400",
                hoverText: "group-hover:text-green-200",
                buttonColor: "bg-green-600 hover:bg-green-500"
            },
            {
                text: "פרסום זה יכול להיות שלך",
                borderColor: "border-orange-500/30",
                bgColor: "bg-orange-900/10",
                hoverBorder: "hover:border-orange-500",
                hoverBg: "hover:bg-orange-900/20",
                textColor: "text-orange-400",
                hoverText: "group-hover:text-orange-200",
                buttonColor: "bg-orange-600 hover:bg-orange-500"
            }
        ]
    ];

    onMount(() => {
        const interval = setInterval(() => {
            currentAdSet = (currentAdSet + 1) % adSets.length;
        }, 6000);

        return () => clearInterval(interval);
    });
</script>

<!-- RightAdBanner.svelte -->
<aside class="hidden xl:block w-24 flex-shrink-0">
    <div class="sticky top-4 space-y-4">
        {#each adSets[currentAdSet] as ad, index}
            <div
                class="h-[512px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed {ad.borderColor} {ad.bgColor} p-4 text-center transition-all {ad.hoverBorder} {ad.hoverBg} group duration-700"
                style="animation: fadeIn 0.7s ease-in-out;"
            >
                <div
                    class="[writing-mode:vertical-rl] text-lg font-black {ad.textColor} {ad.hoverText} tracking-widest whitespace-nowrap"
                >
                    {ad.text}
                </div>
                <div class="mt-4 text-2xl">📢</div>
                <a
                    href="mailto:ads@shchuna.co.il"
                    class="mt-6 rounded-full {ad.buttonColor} px-4 py-2 text-xs font-bold text-white shadow-lg transition-colors"
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
