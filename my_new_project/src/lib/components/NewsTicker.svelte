<script lang="ts">
    import { onMount } from "svelte";

    const newsItems = [
        "מערכת חדשה לניהול ועדי שכונות הושקה השבוע בהצלחה",
        "קבוצת הרכישה למזון אורגני חצתה את רף 200 המשפחות",
        "מיזם 'בעלי מקצוע כשירים' התרחב ל-5 ערים נוספות",
        "השקעות קבוצתיות: נכס חדש נרכש עבור חברי הקהילה בירושלים",
        "מפגש תושבים בנושא מיצוי זכויות יתקיים ביום שלישי הקרוב בזום",
        "עדכון: הושלמה פריסת עמדות הגידול הביתי בשכונות המרכז",
    ];
</script>

<div
    class="news-ticker-container border-b border-blue-900/30 bg-[#0f172a]/80 py-2 backdrop-blur-md"
>
    <div class="mx-auto max-w-7xl flex items-center px-4">
        <!-- Ticker Label -->
        <div
            class="z-10 bg-red-600 px-3 py-1 rounded-l-md text-xs font-bold text-white shadow-lg flex-shrink-0 ml-4"
        >
            חדשות הקהילה:
        </div>

        <!-- Scrolling Content -->
        <div class="overflow-hidden flex-grow relative h-6">
            <div
                class="ticker-content flex gap-12 items-center absolute right-0 whitespace-nowrap"
            >
                {#each [...newsItems, ...newsItems] as item}
                    <span class="text-sm font-medium text-blue-200">
                        {item}
                        <span class="mx-4 text-gray-600">•</span>
                    </span>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .ticker-content {
        animation: scroll-left 40s linear infinite;
    }

    @keyframes scroll-left {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(50%);
        }
    }

    /* Support for RTL: we scroll from right to left */
    /* Since the container is RTL, positive translateX moves it further right (outside) */
    /* But we want it to move left. Let's adjust for absolute positioning on the right. */

    .ticker-content {
        right: 0;
        animation: ticker-move 45s linear infinite;
    }

    @keyframes ticker-move {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(50%);
        }
    }
</style>
