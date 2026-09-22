<script lang="ts">
    // ============================================================
    // ShopAdPreviewCard - הכרטיס של פרסומת מוצר, בדיוק כפי שהוא ייראה
    // בטור הימני, לתצוגה מקדימה במסך הניהול (/admin/shop-ads).
    //
    // הסימון והעיצוב הועתקו מ-RightAdBanner: אותו יחס 144/450, אותה
    // רצועה אלכסונית, אותה כותרת ותת-כותרת ואותה רצועת CTA. בלי הריחוף
    // ובלי הקישור - זו תצוגה ולא פרסומת חיה. אם המראה בטור משתנה שם,
    // צריך לעדכן גם כאן, אחרת הטיוטה תשקר.
    // ============================================================
    import { adImgFit, type AdImageFit } from '$lib/adImageFit';
    import { adStyleVars, DEFAULT_AD_STYLE } from '$lib/adStyle';

    let {
        title,
        subtitle = '',
        cta = '',
        gradient,
        mainImage,
        fit,
        bandHeight = DEFAULT_AD_STYLE.bandHeight,
    }: {
        title: string;
        subtitle?: string;
        cta?: string;
        /** זוג מחלקות Tailwind, כמו בטור של קהילה בשכונה */
        gradient: string;
        mainImage: string;
        fit: AdImageFit;
        /** גובה הרצועה הצבעונית - עולה עם אורך הטקסט, בלי להאריך את הכרטיס */
        bandHeight?: number;
    } = $props();

    let st = $derived({ ...DEFAULT_AD_STYLE, bandHeight });
</script>

<div class="w-36 overflow-hidden rounded-lg shadow-lg relative bg-gray-900" style={adStyleVars(st)}>
    <div class="relative overflow-hidden w-full aspect-[144/450]">
        <div class="absolute inset-0 overflow-hidden">
            <img src={mainImage} alt={title} loading="lazy" decoding="async"
                 class="w-full h-full object-cover" use:adImgFit={fit} />
        </div>
        <div class="promo-diag bg-gradient-to-br {gradient}"></div>
        <div class="promo-title-top">
            <h3 class="promo-title" style="color: {st.titleColor};">{title}</h3>
        </div>
        {#if subtitle}
            <div class="promo-sub-wrap"><p class="promo-sub">{subtitle}</p></div>
        {/if}
    </div>
    <div class="bg-gradient-to-r {gradient} p-2.5 text-center">
        <p class="text-white font-bold text-xs leading-tight">{cta || title}</p>
    </div>
</div>

<style>
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
    .promo-sub::before {
        content: "";
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
</style>
