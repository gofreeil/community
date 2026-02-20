<script lang="ts">
    const newsItems = [
        {
            line1: "מערכת חדשה לניהול ועדי שכונות",
            line2: "הושקה השבוע בהצלחה רבה",
        },
        { line1: "קבוצת הרכישה למזון אורגני", line2: "חצתה את רף 200 המשפחות" },
        { line1: "מיזם 'בעלי מקצוע כשירים'", line2: "התרחב ל-5 ערים נוספות" },
        {
            line1: "השקעות קבוצתיות: נכס חדש",
            line2: "נרכש עבור חברי הקהילה בירושלים",
        },
        {
            line1: "מפגש תושבים בנושא מיצוי זכויות",
            line2: "יתקיים ביום שלישי הקרוב בזום",
        },
        {
            line1: "עדכון: הושלמה פריסת עמדות",
            line2: "הגידול הביתי בשכונות המרכז",
        },
    ];
</script>

<div
    class="news-ticker-container border-b border-blue-900/30 bg-[#0f172a]/90 py-4 backdrop-blur-md"
>
    <div class="mx-auto max-w-7xl flex items-center px-4">
        <!-- Ticker Label -->
        <div
            class="z-10 bg-red-600 px-5 py-3 rounded-lg text-base font-black text-white shadow-xl flex-shrink-0 ml-6 flex flex-col items-center justify-center border border-red-400"
        >
            <span>חדשות</span>
            <span>הקהילה:</span>
        </div>

        <!-- Scrolling Content -->
        <div class="overflow-hidden flex-grow relative h-16">
            <div
                class="ticker-content flex gap-16 items-center absolute right-0 whitespace-nowrap h-full"
            >
                {#each [...newsItems, ...newsItems] as item}
                    <div class="flex items-center gap-16 h-full">
                        <div class="flex flex-col justify-center text-center">
                            <span class="text-base font-bold text-blue-100"
                                >{item.line1}</span
                            >
                            <span class="text-base font-medium text-blue-300"
                                >{item.line2}</span
                            >
                        </div>
                        <!-- Separator Line -->
                        <div
                            class="h-12 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"
                        ></div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .ticker-content {
        right: 0;
        animation: ticker-move 50s linear infinite;
    }

    @keyframes ticker-move {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(50%);
        }
    }

    /* Support for hover to pause */
    .news-ticker-container:hover .ticker-content {
        animation-play-state: paused;
    }
</style>
