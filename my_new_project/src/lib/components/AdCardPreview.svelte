<script lang="ts">
    // ============================================================
    // AdCardPreview — עותק סטטי של כרטיס הפרסומת מהטור הימני באתר
    // (RightAdBanner), בלי קישור, בלי סבב ובלי דהיית-ריחוף. משמש את
    // מסך הניהול לתצוגה מקדימה: ריחוף על כותרת ברשימת המאושרות (דסקטופ)
    // או הקשה עליה (נייד). אותן שכבות ואותם משתני עיצוב מהבילדר —
    // מה שרואים כאן הוא בדיוק מה שמוצג על האתר.
    // ============================================================
    import { adImgFit, parseAdImageFit } from '$lib/adImageFit';
    import {
        parseAdStyle, legacyAdStyle, adStyleVars, logoAnchorClass, logoFreeStyle, logoBgStyle, logoSizeStyle, titleSizeStyle, logoCornerSide,
    } from '$lib/adStyle';
    import { logoClearance } from '$lib/logoClearance';

    interface PreviewAd {
        title: string;
        subtitle?: string;
        cta?: string;
        gradient?: string;
        logo?: string;
        mainImage?: string;
        mainImageFit?: unknown;
        adStyle?: unknown;
        shop?: boolean;
    }

    let { ad }: { ad: PreviewAd } = $props();

    let st = $derived(parseAdStyle(ad.adStyle) ?? legacyAdStyle(ad.title));
    let cornerSide = $derived(logoCornerSide(st, Boolean(ad.logo)));
</script>

<!-- אותן מידות של כרטיס הטור הימני: רוחב 144px, תמונה ביחס 144/450 ורצועת CTA מתחתיה -->
<div class="block w-36 overflow-hidden rounded-lg shadow-lg relative bg-gray-900"
     style={adStyleVars(st)}>
    <div class="relative overflow-hidden w-full aspect-[144/450]" use:logoClearance={ad}>
        {#if ad.mainImage}
            <div class="absolute inset-0 overflow-hidden">
                <img src={ad.mainImage} alt={ad.title}
                     loading="lazy" decoding="async"
                     class="w-full h-full object-cover"
                     use:adImgFit={parseAdImageFit(ad.mainImageFit)} />
            </div>
        {/if}
        <div class="promo-diag bg-gradient-to-br {ad.gradient}"></div>
        <div class="promo-title-top"
             class:has-corner-logo-right={cornerSide === 'right'}
             class:has-corner-logo-left={cornerSide === 'left'}
             style="transform: translateY({st.titleOffsetY}px);">
            <h3 class="promo-title" style="color: {st.titleColor};{titleSizeStyle(st.titleFontSize)}"><span class="logo-avoid" aria-hidden="true"></span>{ad.title}</h3>
        </div>
        {#if ad.subtitle}
            <div class="promo-sub-wrap">
                <p class="promo-sub"><span class="logo-avoid" data-anchor="bottom" aria-hidden="true"></span>{ad.subtitle}</p>
            </div>
        {/if}
        {#if ad.logo}
            <img src={ad.logo} alt="" loading="lazy" decoding="async"
                 data-ad-logo
                 class="promo-logo {logoAnchorClass(st, 'promo')} {st.logoShape === 'circle' ? 'promo-logo-circle' : ''}"
                 style={logoFreeStyle(st) + logoBgStyle(st.logoBg) + logoSizeStyle(st.logoSize)} />
        {/if}
    </div>
    {#if !ad.shop && ad.cta}
        <div class="p-2.5 text-center bg-gradient-to-r {ad.gradient}">
            <p class="text-white font-bold text-xs leading-tight">{ad.cta}</p>
        </div>
    {/if}
</div>

<style>
    /* שמות המחלקות מתחילים ב-promo ולא ב-ad בכוונה: EasyList מכילה כלל
       קוסמטי גנרי `##.ad-title` שמסתיר כל אלמנט עם המחלקה הזאת בכל אתר.
       עם השם הישן חוסמי פרסומות מחקו את כותרת המפרסם וְהשאירו פס שחור ריק,
       בזמן שכל שאר הכרטיס - תמונה, לוגו, תת-כותרת ו-CTA - נשאר על המסך. */
    /* כותרת ולוגו של פרסומת מאושרת — הערכים זהים ל-.pro-title-top/.pro-title/.promo-logo
       שבבילדר, כי מסגרת התצוגה החיה שם רחבה 140px והמשבצת כאן 144px. */
    .promo-title-top {
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
       הוא היה מכסה את המילה האחרונה - המשבצת רחבה 144px בלבד.
       padding פיזי ולא inset-inline: הדף כולו RTL, והקצה הלוגי הפוך
       לצד שבו הלוגו באמת נמצא. אותם כללים בדיוק קיימים בבילדר. */
    .promo-title-top.has-corner-logo-right {
        padding-right: 46px;
    }
    .promo-title-top.has-corner-logo-left {
        padding-left: 46px;
    }

    /* הרצועה האלכסונית שמתחת לתמונה - אותו clip-path של .pro-diag בבילדר.
       המשתנים --diag-top-* נקבעים רק בעמוד הבילדר; כאן נופלים לברירת
       המחדל, שהיא בדיוק מה שהמפרסם רואה כשהוא לא נוגע בגובה הרצועה. */
    .promo-diag {
        position: absolute;
        inset: 0;
        clip-path: polygon(
            0 var(--diag-top-left, 88%),
            100% var(--diag-top-right, 78%),
            100% 100%,
            0 100%
        );
        opacity: 0.96;
        pointer-events: none;
    }
    /* פס הברק הלבן שחוצה את האלכסון */
    .promo-diag::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
            125deg,
            transparent 30%,
            rgba(255, 255, 255, 0.18) 45%,
            transparent 60%
        );
        pointer-events: none;
    }
    /* גודל/רווח/יישור מגיעים מ-adStyleVars — מה שהמפרסם כיוון בשלב 5.
       ה-fallback הוא הערך שהיה קבוע כאן, כדי שמודעות ותיקות לא ישתנו. */
    .promo-sub-wrap {
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        z-index: 4;
        padding: 0.55rem 0.7rem 1.1rem;
        text-align: var(--sub-align, right);
        pointer-events: none;
    }
    .promo-sub {
        margin: 0;
        color: rgba(255, 255, 255, 0.95);
        font-weight: 600;
        font-size: var(--sub-size, 0.88rem);
        line-height: var(--sub-lh, 1.3);
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    }
    /* משולש בלתי-נראה שגורם לשורה הראשונה להתקצר לפי שיפוע האלכסון.
       כשהלוגו בצד שמאל, logoClearance מחליף אותו ב-float משולב ומכבה
       אותו דרך --logo-avoid-tri. */
    .promo-sub::before {
        content: "";
        display: var(--logo-avoid-tri, block);
        float: left;
        width: 28%;
        height: 1.35em;
        shape-outside: polygon(0 0, 100% 0, 0 100%);
    }
    .promo-title {
        margin: 0;
        color: white;
        font-weight: 900;
        font-size: 1.15rem;
        line-height: 1.15;
        letter-spacing: 0.005em;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85), 0 1px 2px rgba(0, 0, 0, 0.95);
    }
    /* ה-float שגורם לטקסט לעקוף את הלוגו - מוצג ומוצב רק ע"י logoClearance */
    .logo-avoid {
        display: none;
    }
    .promo-logo {
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
    /* right/left פיזיים - כמו בבילדר. עם inset-inline-end הלוגו קפץ לצד
       שמאל, כי הדף RTL והקצה הלוגי שם הוא שמאל. */
    .promo-logo-right {
        top: 6px;
        right: 6px;
        left: auto;
    }
    .promo-logo-left {
        top: 6px;
        left: 6px;
        right: auto;
    }
    /* עוגן "מעל ה-CTA": הלוגו רוכב על הפינה הימנית של הרצועה האלכסונית,
       מרכזו על --diag-top-right (18px = חצי מגובה הלוגו) - כמו .ad-logo-cta
       בבילדר. */
    .promo-logo-cta {
        top: auto;
        bottom: calc(100% - var(--diag-top-right, 78%) - 18px);
        right: 6px;
        left: auto;
    }
    /* מיקום חופשי שהמפרסם גרר: הנקודה המדויקת מגיעה ב-style inline */
    .promo-logo-free {
        top: auto;
        bottom: auto;
        right: auto;
        left: auto;
    }
    .promo-logo-circle {
        border-radius: 50%;
    }
</style>
