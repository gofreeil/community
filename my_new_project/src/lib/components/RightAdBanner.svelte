<script lang="ts">
    import { onMount } from "svelte";
    import { _ } from "svelte-i18n";
    import { adImgFit, parseAdImageFit, type AdImageFit } from "$lib/adImageFit";

    // פרסומות של מפרסמים שאושרו - הטור הימני הוא המקום היחיד שלהן באתר.
    type ApprovedAd = {
        id: string;
        title: string;
        subtitle: string;
        cta: string;
        hover: string;
        gradient: string;
        /** לוגו המפרסם (data-url); ריק כשלא הועלה לוגו בבילדר */
        logo?: string;
        mainImage: string;
        /** מיקום+זום מהבילדר; אופציונלי — מודעות ישנות נשמרו בלעדיו */
        mainImageFit?: AdImageFit;
    };

    let { approvedAds = [] }: { approvedAds?: ApprovedAd[] } = $props();

    // אותו כלל בדיוק כמו ברירת המחדל בבילדר (builder/+page.svelte): כותרת ארוכה
    // לא משאירה מקום ללוגו בפינה שלידה, ולכן הוא יורד לפינה שמעל רצועת ה-CTA.
    // מיקום הלוגו לא נשמר בשרת, ולכן הכלל מחושב כאן מחדש - כך שמה שהמפרסם
    // ראה בתצוגה החיה הוא מה שמוצג בפועל.
    function logoAtCta(title: string): boolean {
        return (title ?? '').trim().length > 20;
    }

    // הפרסומות המשולמות קבועות בראש הטור ולא משתתפות בסבב המשבצות הפנויות -
    // מפרסם ששילם לא אמור להיעלם מהמסך אחרי 14 שניות.
    let paidAds = $derived(approvedAds.filter(a => a.mainImage));

    // עד xl הטור הימני מוסתר. כשיש פרסומת אמיתית זה היה מעלים אותה ממסכי lg,
    // ולכן במקרה כזה הטור נפתח כבר מ-lg (כמו טור אתרי הרשת שממול).
    let visibilityClass = $derived(paidAds.length > 0 ? "hidden lg:block" : "hidden xl:block");

    let currentGroup = $state(0);
    let totalSwaps = $state(0);
    const MAX_SWAPS = 8; // 3 full cycles of 3 groups (original + 8 swaps = 9 steps)

    const ads = [
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
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
            description: "יכול להיות שלך",
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
            description: "יכול להיות שלך",
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
            description: "יכול להיות שלך",
            borderColor: "border-amber-500/30",
            bgColor: "bg-amber-900/10",
            hoverBorder: "hover:border-amber-500",
            hoverBg: "hover:bg-amber-900/20",
            textColor: "text-amber-400",
            hoverText: "group-hover:text-amber-200",
            buttonColor: "bg-amber-600 hover:bg-amber-500",
        },
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
            borderColor: "border-purple-500/30",
            bgColor: "bg-purple-900/10",
            hoverBorder: "hover:border-purple-500",
            hoverBg: "hover:bg-purple-900/20",
            textColor: "text-purple-400",
            hoverText: "group-hover:text-purple-200",
            buttonColor: "bg-purple-600 hover:bg-purple-500",
        },
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
            borderColor: "border-red-500/30",
            bgColor: "bg-red-900/10",
            hoverBorder: "hover:border-red-500",
            hoverBg: "hover:bg-red-900/20",
            textColor: "text-red-400",
            hoverText: "group-hover:text-red-200",
            buttonColor: "bg-red-600 hover:bg-red-500",
        },
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
            borderColor: "border-indigo-500/30",
            bgColor: "bg-indigo-900/10",
            hoverBorder: "hover:border-indigo-500",
            hoverBg: "hover:bg-indigo-900/20",
            textColor: "text-indigo-400",
            hoverText: "group-hover:text-indigo-200",
            buttonColor: "bg-indigo-600 hover:bg-indigo-500",
        },
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
            borderColor: "border-teal-500/30",
            bgColor: "bg-teal-900/10",
            hoverBorder: "hover:border-teal-500",
            hoverBg: "hover:bg-teal-900/20",
            textColor: "text-teal-400",
            hoverText: "group-hover:text-teal-200",
            buttonColor: "bg-teal-600 hover:bg-teal-500",
        },
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
            borderColor: "border-pink-500/30",
            bgColor: "bg-pink-900/10",
            hoverBorder: "hover:border-pink-500",
            hoverBg: "hover:bg-pink-900/20",
            textColor: "text-pink-400",
            hoverText: "group-hover:text-pink-200",
            buttonColor: "bg-pink-600 hover:bg-pink-500",
        },
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
            borderColor: "border-yellow-500/30",
            bgColor: "bg-yellow-900/10",
            hoverBorder: "hover:border-yellow-500",
            hoverBg: "hover:bg-yellow-900/20",
            textColor: "text-yellow-400",
            hoverText: "group-hover:text-yellow-200",
            buttonColor: "bg-yellow-600 hover:bg-yellow-500",
        },
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
            borderColor: "border-emerald-500/30",
            bgColor: "bg-emerald-900/10",
            hoverBorder: "hover:border-emerald-500",
            hoverBg: "hover:bg-emerald-900/20",
            textColor: "text-emerald-400",
            hoverText: "group-hover:text-emerald-200",
            buttonColor: "bg-emerald-600 hover:bg-emerald-500",
        },
        {
            text: "מקום פרסום",
            description: "יכול להיות שלך",
            borderColor: "border-fuchsia-500/30",
            bgColor: "bg-fuchsia-900/10",
            hoverBorder: "hover:border-fuchsia-500",
            hoverBg: "hover:bg-fuchsia-900/20",
            textColor: "text-fuchsia-400",
            hoverText: "group-hover:text-fuchsia-200",
            buttonColor: "bg-fuchsia-600 hover:bg-fuchsia-500",
        },
    ];

    const VIEW_MS = 14000;   // כמה זמן כל קבוצה נשארת על המסך (החלפה איטית)
    const FADE_MS = 900;     // אורך הדעיכה בין קבוצה לקבוצה — חייב להתאים ל-CSS

    let fading = $state(false);

    onMount(() => {
        let fadeTimer: ReturnType<typeof setTimeout> | undefined;
        // דעיכה החוצה → החלפת הקבוצה בזמן שהטור שקוף → דעיכה פנימה.
        // כך אין קפיצה: המשבצות לא מתחלפות מול העין אלא מתוך שקיפות מלאה.
        const interval = setInterval(() => {
            if (totalSwaps < MAX_SWAPS) {
                fading = true;
                fadeTimer = setTimeout(() => {
                    currentGroup = (currentGroup + 1) % 3;
                    totalSwaps++;
                    fading = false;
                }, FADE_MS);
            } else {
                clearInterval(interval);
            }
        }, VIEW_MS);

        return () => {
            clearInterval(interval);
            clearTimeout(fadeTimer);
        };
    });

    let displayedAds = $derived(
        ads.slice(currentGroup * 4, (currentGroup + 1) * 4),
    );
</script>

<!-- RightAdBanner.svelte -->
<aside
    aria-label={$_('components.rb_ads_aria')}
    class="{visibilityClass} w-36 flex-shrink-0 sticky top-4 h-fit pb-8 text-center"
>
    <h4
        class="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 px-2"
    >
        {$_('components.rb_marketing_content')}
    </h4>

    <!-- פרסומות מאושרות: קבועות, מעל סבב המשבצות הפנויות.
         הקישור תמיד לדף הנחיתה הפנימי /ads/<id> ובאותה לשונית. -->
    {#if paidAds.length > 0}
        <div class="space-y-3 mb-3">
            {#each paidAds as ad (ad.id)}
                <a
                    href="/ads/{ad.id}"
                    aria-label="{ad.title} – {ad.subtitle}"
                    class="block overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105 group relative"
                >
                    <!-- aspect-[144/450] = בדיוק היחס שהבילדר מציג בתצוגה החיה
                         (live-demo-img-wrap). המפרסם מכוון שם מיקום וזום על מסגרת
                         צרה וגבוהה, ולכן חייבים לשמור את אותו יחס - אחרת החיתוך
                         שהוא בחר נשבר. -->
                    <div class="relative overflow-hidden w-full aspect-[144/450]">
                        <div class="absolute inset-0 overflow-hidden">
                            <!-- המיקום/זום שנבחרו בבילדר מוחלים גם כאן — הדמו הוא מה שרואים -->
                            <img
                                src={ad.mainImage}
                                alt={ad.title}
                                loading="lazy"
                                decoding="async"
                                class="w-full h-full object-cover transition-opacity duration-[1500ms] group-hover:opacity-0"
                                use:adImgFit={parseAdImageFit(ad.mainImageFit)}
                            />
                        </div>
                        <!-- כותרת ולוגו גלויים תמיד - בדיוק כמו בתצוגה החיה של הבילדר.
                             בלעדיהם הכרטיס היה תמונה חשופה, והמפרסם לא רואה את השם
                             שלו על המסך אלא רק בריחוף (ובנייד - אף פעם). -->
                        <div
                            class="ad-title-top transition-opacity duration-[1500ms] group-hover:opacity-0"
                            class:has-corner-logo={ad.logo && !logoAtCta(ad.title)}
                        >
                            <h3 class="ad-title">{ad.title}</h3>
                        </div>
                        {#if ad.logo}
                            <img
                                src={ad.logo}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                class="ad-logo {logoAtCta(ad.title) ? 'ad-logo-cta' : 'ad-logo-right'}
                                       transition-opacity duration-[1500ms] group-hover:opacity-0"
                            />
                        {/if}
                        <div
                            class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[1500ms] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        >
                            <div class="relative z-10 text-center px-3">
                                <h3 class="text-white font-bold text-sm mb-1">{ad.title}</h3>
                                <p class="text-gray-200 text-xs">{ad.subtitle}</p>
                            </div>
                        </div>
                    </div>
                    <div class="relative group/cta bg-gradient-to-r {ad.gradient} p-2.5 text-center">
                        <p class="text-white font-bold text-xs leading-tight">{ad.cta || ad.title}</p>
                        {#if ad.hover}
                            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cta:block
                                         bg-gray-900 text-white text-xs font-bold rounded-lg px-3 py-1.5
                                         whitespace-nowrap border border-white/10 shadow-xl pointer-events-none z-50">
                                {ad.hover}
                            </span>
                        {/if}
                    </div>
                </a>
            {/each}
        </div>
    {/if}

    <div class="space-y-3 ads-track" class:fading>
        {#each displayedAds as ad, index}
            <a
                href="/about/advertise"
                aria-label="מקום פרסום פנוי — לחצו לפרטים על פרסום באתר"
                class="h-[490px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed {ad.borderColor} {ad.bgColor} p-3 text-center transition-all {ad.hoverBorder} {ad.hoverBg} group duration-700 relative overflow-hidden"
            >
                <!-- Ad Numbering -->
                <div
                    class="absolute top-3 right-3 text-sm font-black text-white/60 bg-white/10 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm shadow-sm"
                >
                    {currentGroup * 4 + index + 1}
                </div>

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
                                {$_('components.rb_this_ad_space')}
                            </span>
                            <span
                                class="text-base font-bold {ad.textColor} {ad.hoverText} opacity-90 drop-shadow-sm"
                            >
                                {$_('components.rb_could_be_yours')}
                            </span>
                        </div>
                    </div>

                    <span
                        class="mb-4 z-10 rounded-full {ad.buttonColor} px-5 py-2 text-sm font-bold text-white shadow-xl transition-transform hover:scale-105"
                    >
                        {$_('components.rb_details')}
                    </span>
                </div>
            </a>
        {/each}
    </div>
</aside>

<style>
    /* דעיכה רכה בין קבוצות המודעות — במקום החלקה קופצנית של כל כרטיס.
       הערך חייב להתאים ל-FADE_MS שבסקריפט. */
    .ads-track {
        opacity: 1;
        transition: opacity 900ms ease-in-out;
    }
    .ads-track.fading {
        opacity: 0;
    }
    @media (prefers-reduced-motion: reduce) {
        .ads-track {
            transition-duration: 1ms;
        }
    }

    /* כותרת ולוגו של פרסומת מאושרת — הערכים זהים ל-.pro-title-top/.pro-title/.ad-logo
       שבבילדר, כי מסגרת התצוגה החיה שם רחבה 140px והמשבצת כאן 144px. */
    .ad-title-top {
        position: absolute;
        inset-inline: 0;
        top: 0;
        z-index: 5;
        padding: 0.55rem 0.7rem 0.85rem;
        text-align: center;
        background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.78) 0%,
            rgba(0, 0, 0, 0.45) 55%,
            rgba(0, 0, 0, 0) 100%
        );
        pointer-events: none;
    }
    /* לוגו בפינה העליונה יושב באותו גובה של הכותרת. בלי שמירת המקום הזאת
       הוא היה מכסה את המילה האחרונה - המשבצת רחבה 144px בלבד. */
    .ad-title-top.has-corner-logo {
        padding-inline-end: 46px;
    }
    .ad-title {
        margin: 0;
        color: white;
        font-weight: 900;
        font-size: 1.15rem;
        line-height: 1.15;
        letter-spacing: 0.005em;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.95);
    }
    .ad-logo {
        position: absolute;
        z-index: 6;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        background: white;
        padding: 3px;
        object-fit: contain;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    }
    .ad-logo-right {
        top: 6px;
        inset-inline-end: 6px;
    }
    /* כותרת ארוכה: הלוגו יורד לפינה התחתונה, מעל רצועת ה-CTA */
    .ad-logo-cta {
        bottom: 6px;
        inset-inline-end: 6px;
    }
</style>
