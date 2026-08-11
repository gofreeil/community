<script lang="ts">
    // דף הנחיתה של פרסומת מאושרת.
    // עיצוב מינימליסטי: הלוגו, הכותרת, משפט הפתיחה, היתרונות ודרכי הקשר
    // יושבים *ליד* התמונה ולא מתחתיה — כך כל העיקר נכנס למסך הראשון בלי גלילה.
    import type { PageData } from './$types';
    import type { SubmitFunction } from '@sveltejs/kit';
    import { enhance } from '$app/forms';
    import { toExternalUrl, waHref } from '$lib/urlNormalize';
    let { data }: { data: PageData } = $props();
    // $derived: מעבר בין מודעות בניווט צד-לקוח משתמש באותה קומפוננטה
    const ad = $derived(data.ad);
    const lp = $derived(ad.landing);

    // כפתור הסופר-אדמין "פרסם בכל האתרים" - שולח לאותו action של עמוד אישור
    // הפרסומות (cross-route), כך שכל הלוגיקה וההרשאות נשארות במקום אחד.
    let syndicating = $state(false);
    let syncedLocally = $state(false);
    let syndicateMsg = $state('');
    let syndicateOk = $state(false);
    const synced = $derived(syncedLocally ||
        typeof (ad.landing as unknown as { _syndicatedAt?: unknown })?._syndicatedAt === 'string');
    const syndicate: SubmitFunction = ({ cancel }) => {
        if (!confirm(synced
            ? `לעדכן את "${ad.title}" בכל האתרים לפי הגרסה הנוכחית?`
            : `לפרסם את "${ad.title}" בכל האתרים שלך (אינדקס העסקים, קבוצות רכישה, הגמח הארצי)?`)) {
            cancel();
            return;
        }
        syndicating = true;
        return async ({ result }) => {
            syndicating = false;
            if (result.type === 'success') {
                syndicateOk = true;
                syncedLocally = true;
                syndicateMsg = (result.data as { message?: string } | undefined)?.message ?? 'פורסמה בכל האתרים';
            } else if (result.type === 'failure') {
                syndicateOk = false;
                syndicateMsg = (result.data as { error?: string } | undefined)?.error ?? 'הפרסום בכל האתרים נכשל';
            } else {
                syndicateOk = false;
                syndicateMsg = 'הפרסום בכל האתרים נכשל - נסה שוב';
            }
        };
    };

    const gradient = $derived(ad.gradient || 'from-amber-500 to-orange-600');
    // לוגו שנחתך לעיגול בבילדר נשאר עגול גם כאן — ריבוע היה מחזיר לו
    // פינות לבנות שהמפרסם דווקא הסיר
    const logoCircle = $derived(ad.adStyle?.logoShape === 'circle');
    // תמונת דף הנחיתה קודמת לתמונת הכרטיס — היא הועלתה במיוחד לדף הזה
    const heroImage = $derived(lp.image || ad.mainImage || '');
    const advList = $derived((lp.advantages ?? []).filter((a) => a?.trim()));

    const waUrl = $derived(lp.whatsapp ? waHref(lp.whatsapp) : '');
    const siteUrl = $derived(lp.website ? toExternalUrl(lp.website) : '');

    // כל דרך קשר מופיעה *פעם אחת*: מה שכבר יושב ככפתור בהדר לא חוזר שוב
    // בגלולות של "פרטי קשר". האתר יורד לפרטי הקשר כשהוואטסאפ תפס את
    // מקומו בהדר, ומספר/כתובת שלא ניתן לייצר מהם קישור מוצגים כטקסט.
    const siteInHero = $derived(!waUrl && Boolean(siteUrl));
    const contactWhatsapp = $derived(Boolean(lp.whatsapp) && !waUrl);
    const contactWebsite = $derived(Boolean(lp.website) && !siteInHero);
    const hasContactDetails = $derived(
        Boolean(lp.email) || contactWhatsapp || contactWebsite || Boolean(lp.address) || Boolean(lp.hours)
    );

    // היתרונות נכנסים לטור שליד התמונה רק כשמשפט הפתיחה קצר; אחרת הטור היה
    // גבוה מהתמונה ונשבר האיזון, ואז הם יורדים לשורה רחבה אחת מתחת (עדיין
    // בלי גלילה מיותרת). נמדד לפי האורך *המוצג* — כתובות ארוכות מתכווצות.
    const pitchLength = $derived(
        segments(lp.pitch).reduce((n, s) => n + s.text.length, 0)
    );
    const advInHero = $derived(Boolean(heroImage) && advList.length > 0 && pitchLength <= 300);

    // כתובת שהמפרסם הדביק בתוך הטקסט הופכת לגלולה קצרה עם שם האתר, במקום
    // שורת URL ארוכה שנשברת לכמה שורות ומנפחת את הדף.
    type Seg = { text: string; url: string };
    function segments(raw: string | null | undefined): Seg[] {
        const text = String(raw ?? '');
        const out: Seg[] = [];
        let last = 0;
        for (const m of text.matchAll(/https?:\/\/\S+/g)) {
            const start = m.index ?? 0;
            const url = m[0].replace(/[.,;:!?)\]]+$/, '');
            if (start > last) out.push({ text: text.slice(last, start), url: '' });
            out.push({ text: linkLabel(url), url });
            last = start + url.length;
        }
        if (last < text.length) out.push({ text: text.slice(last), url: '' });
        return out;
    }
    function linkLabel(url: string): string {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }
</script>

<svelte:head>
    <title>{ad.title} - קהילה בשכונה</title>
</svelte:head>

{#snippet rich(raw: string)}{#each segments(raw) as s}{#if s.url}<a class="al-link" href={s.url} target="_blank" rel="noopener noreferrer">{s.text} ↗</a>{:else}{s.text}{/if}{/each}{/snippet}

<div class="ad-landing" dir="rtl">
    <!-- פס סופר-אדמין: סנדיקציה לכל אתרי הרשת ישירות מדף הנחיתה. לגולש
         רגיל הפס לא נשלח בכלל - isSuperAdmin נקבע צד-שרת בלבד. -->
    {#if data.isSuperAdmin && ad.status === 'approved'}
        <div class="al-syndbar">
            {#if synced}
                <!-- חיווי מצב בולט: הפרסומת כבר חיה בכל אתרי הרשת -->
                <span class="al-syndbadge">✅ מפורסם בכל האתרים</span>
            {/if}
            <form method="POST" action="/admin/ads-review?/publishEverywhere" use:enhance={syndicate}>
                <input type="hidden" name="id" value={ad.id} />
                <button type="submit" class="al-syndbtn" disabled={syndicating}
                        title={synced
                            ? 'לחיצה מעדכנת את העותקים בכל האתרים לפי הגרסה הנוכחית'
                            : 'יצירת עותק מאושר בטור הפרסומות של כל אתרי הרשת: אינדקס העסקים, קבוצות רכישה והגמח הארצי'}>
                    {syndicating ? '⏳ מפרסם...' : synced ? '🌐 עדכן בכל האתרים' : '🌐 פרסם בכל האתרים'}
                </button>
            </form>
            {#if syndicateMsg}
                <p class="al-syndmsg" class:ok={syndicateOk}>{syndicateMsg}</p>
            {/if}
        </div>
    {/if}

    <!-- כותרת + פתיח + יתרונות + קשר — הכל ליד התמונה, במסך אחד -->
    <header class="al-hero bg-gradient-to-br {gradient}">
        <div class="al-hero-inner" class:has-media={!!heroImage}>
            <div class="al-copy">
                {#if ad.logo}
                    <img src={ad.logo} alt="" class="al-logo" class:is-circle={logoCircle} />
                {/if}
                <h1>{lp.headline || ad.title}</h1>
                {#if lp.pitch}
                    <p class="al-pitch">{@render rich(lp.pitch)}</p>
                {/if}

                {#if advInHero}
                    <ul class="al-advantages on-hero">
                        {#each advList as adv}
                            <li><span class="al-check" aria-hidden="true">✓</span><span>{adv}</span></li>
                        {/each}
                    </ul>
                {/if}

                {#if lp.phone || waUrl || siteUrl}
                    <div class="al-actions">
                        {#if lp.phone}
                            <a href={`tel:${lp.phone}`} class="al-btn light">📞 {lp.phone}</a>
                        {/if}
                        {#if waUrl}
                            <a href={waUrl} target="_blank" rel="noopener noreferrer" class="al-btn wa">וואטסאפ</a>
                        {:else if siteUrl}
                            <a href={siteUrl} target="_blank" rel="noopener noreferrer" class="al-btn ghost">לאתר ←</a>
                        {/if}
                    </div>
                {/if}
            </div>

            {#if heroImage}
                <div class="al-media">
                    <img src={heroImage} alt={ad.title} />
                </div>
            {/if}
        </div>
    </header>

    <!-- יתרונות — רק אם לא נכנסו ליד התמונה; שורה רחבה, לא רשימה גבוהה -->
    {#if advList.length && !advInHero}
        <section class="al-section">
            <ul class="al-advantages strip">
                {#each advList as adv}
                    <li>
                        <span class="al-check tinted bg-gradient-to-br {gradient}" aria-hidden="true">✓</span>
                        <span>{adv}</span>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}

    <!-- הסיפור והייחוד זה לצד זה, במקום שתי קומות נפרדות -->
    {#if lp.extended || lp.uniqueness}
        <section class="al-section al-about">
            {#if lp.extended}
                <article>
                    <h2>הסיפור שלנו</h2>
                    <p class="pre-line">{@render rich(lp.extended)}</p>
                </article>
            {/if}
            {#if lp.uniqueness}
                <article>
                    <h2>מה מייחד אותנו</h2>
                    <p class="pre-line">{@render rich(lp.uniqueness)}</p>
                </article>
            {/if}
        </section>
    {/if}

    {#if lp.products?.length}
        <section class="al-section">
            <h2>מוצרים / שירותים</h2>
            <div class="al-products">
                {#each lp.products as p (p.id)}
                    <article class="al-product">
                        {#if p.image}
                            <img src={p.image} alt={p.name} />
                        {/if}
                        <div class="al-product-info">
                            <h3 class="al-product-name">{p.name}</h3>
                            {#if p.description}<p class="al-product-desc">{p.description}</p>{/if}
                            {#if p.price}<p class="al-product-price">{p.price} ₪</p>{/if}
                        </div>
                    </article>
                {/each}
            </div>
        </section>
    {/if}

    <!-- פרטי קשר — רק מה שלא כבר מופיע ככפתור בהדר, כדי לא לחזור פעמיים -->
    {#if hasContactDetails}
        <section class="al-section al-contact">
            <h2>פרטי קשר</h2>
            {#if contactWhatsapp || lp.email || contactWebsite}
                <div class="al-pills">
                    <!-- 05x מקומי חייב קידומת 972, אחרת wa.me מחזיר "המספר אינו קיים" -->
                    {#if contactWhatsapp}<span class="al-pill">💬 {lp.whatsapp}</span>{/if}
                    {#if lp.email}<a class="al-pill" href={`mailto:${lp.email}`}>✉️ {lp.email}</a>{/if}
                    <!-- כתובת בלי https:// היא יחסית: היא הייתה מובילה ל-/ads/<כתובת>
                         על הדומיין שלנו במקום לאתר של המפרסם -->
                    {#if contactWebsite}
                        {#if siteUrl}<a class="al-pill" href={siteUrl} target="_blank" rel="noopener noreferrer">🌐 {linkLabel(siteUrl)}</a>{:else}<span class="al-pill">🌐 {lp.website}</span>{/if}
                    {/if}
                </div>
            {/if}
            {#if lp.address || lp.hours}
                <p class="al-meta">
                    {#if lp.address}📍 {lp.address}{/if}{#if lp.address && lp.hours} · {/if}{#if lp.hours}🕒 {lp.hours}{/if}
                </p>
            {/if}
        </section>
    {/if}
</div>

<style>
    .ad-landing {
        max-width: 64rem;
        margin: 0 auto;
        background: #0f172a;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        overflow: hidden;
    }

    /* ===== פס סופר-אדמין (סנדיקציה) - שמות בלי קידומת ad-, ראו EasyList ===== */
    .al-syndbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.6rem;
        padding: 0.5rem 1rem;
        background: rgba(14, 165, 233, 0.07);
        border-bottom: 1px solid rgba(14, 165, 233, 0.22);
    }
    .al-syndbtn {
        padding: 0.4rem 0.9rem;
        border-radius: 999px;
        background: rgba(14, 165, 233, 0.18);
        border: 1px solid rgba(14, 165, 233, 0.4);
        color: #bae6fd;
        font-weight: 800;
        font-size: 0.8rem;
        font-family: inherit;
        cursor: pointer;
    }
    .al-syndbtn:hover { background: rgba(14, 165, 233, 0.3); }
    .al-syndbtn:disabled { opacity: 0.6; cursor: wait; }
    .al-syndbadge {
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.4);
        color: #86efac;
        font-weight: 800;
        font-size: 0.8rem;
        white-space: nowrap;
    }
    .al-syndmsg { color: #fca5a5; font-size: 0.8rem; font-weight: 700; margin: 0; }
    .al-syndmsg.ok { color: #86efac; }

    /* ===== כותרת+פתיח+יתרונות+קשר זה לצד זה ===== */
    .al-hero { padding: 1.75rem 1.5rem; }
    .al-hero-inner {
        display: grid;
        gap: 1.5rem;
        align-items: center;
        text-align: center;
    }
    @media (min-width: 860px) {
        .al-hero { padding: 2.25rem 2rem; }
        .al-hero-inner.has-media {
            grid-template-columns: minmax(0, 1fr) minmax(0, 22rem);
            text-align: right;
        }
    }
    .al-copy { min-width: 0; }
    .al-logo {
        width: 64px;
        height: 64px;
        border-radius: 0.9rem;
        background: white;
        padding: 6px;
        object-fit: contain;
        margin-bottom: 0.7rem;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    }
    .al-logo.is-circle { border-radius: 9999px; }
    @media (min-width: 860px) {
        .al-logo { width: 84px; height: 84px; border-radius: 1.1rem; padding: 7px; }
        .al-logo.is-circle { border-radius: 9999px; }
    }
    .al-hero h1 {
        color: white;
        font-size: 1.7rem;
        font-weight: 900;
        line-height: 1.25;
        margin: 0 0 0.6rem;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    @media (min-width: 860px) {
        .al-hero h1 { font-size: 2rem; }
    }
    .al-pitch {
        color: rgba(255, 255, 255, 0.95);
        font-size: 1rem;
        line-height: 1.55;
        margin: 0;
        overflow-wrap: anywhere;
        white-space: pre-line;
    }
    .al-link {
        display: inline-block;
        padding: 0.05rem 0.5rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        color: #fff;
        font-size: 0.85rem;
        font-weight: 700;
        text-decoration: none;
        white-space: nowrap;
    }
    .al-link:hover { background: rgba(255, 255, 255, 0.3); }

    .al-media { min-width: 0; }
    .al-media img {
        display: block;
        width: auto;
        max-width: 100%;
        max-height: 15rem;
        margin-inline: auto;
        border-radius: 0.9rem;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    }
    /* בדסקטופ התמונה גדלה עד לגובה טור הטקסט שלידה — פרופורציה מאוזנת */
    @media (min-width: 860px) {
        .al-media img { max-height: 26rem; border-radius: 1.1rem; }
    }

    .al-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;
        margin-top: 1rem;
    }
    @media (min-width: 860px) {
        .has-media .al-actions { justify-content: flex-start; }
    }
    .al-btn {
        display: inline-flex;
        align-items: center;
        padding: 0.55rem 1.1rem;
        border-radius: 999px;
        font-weight: 800;
        font-size: 0.95rem;
        text-decoration: none;
    }
    .al-btn.light { background: #fff; color: #111827; }
    .al-btn.wa { background: #16a34a; color: #fff; }
    .al-btn.ghost {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.35);
    }

    /* ===== יתרונות ===== */
    .al-advantages {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.5rem;
        text-align: right;
    }
    .al-advantages li {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.95rem;
        font-weight: 600;
        line-height: 1.35;
    }
    .al-advantages.on-hero {
        margin-top: 1rem;
        color: rgba(255, 255, 255, 0.95);
    }
    .al-advantages.strip {
        color: #e5e7eb;
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
        gap: 0.6rem 1.25rem;
    }
    .al-check {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(255, 255, 255, 0.92);
        color: #111827;
        font-size: 0.75rem;
        font-weight: 900;
        line-height: 1;
    }
    /* הגרדיאנט מגיע ממחלקות Tailwind על האלמנט - רק צבע הרקע מתבטל */
    .al-check.tinted { background-color: transparent; color: #fff; }

    /* ===== שאר הדף — צפוף ומינימלי ===== */
    .al-section {
        padding: 1.25rem 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .al-section h2 {
        color: white;
        font-size: 1.05rem;
        font-weight: 900;
        margin: 0 0 0.5rem;
    }
    .al-section p {
        color: #d1d5db;
        font-size: 0.925rem;
        line-height: 1.6;
        margin: 0;
        overflow-wrap: anywhere;
    }
    .pre-line { white-space: pre-line; }

    .al-about {
        display: grid;
        gap: 1.25rem;
    }
    @media (min-width: 860px) {
        .al-about { grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 2rem; }
    }

    .al-products {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.75rem;
    }
    .al-product {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 0.75rem;
        overflow: hidden;
    }
    .al-product img {
        width: 100%;
        height: 110px;
        object-fit: cover;
    }
    .al-product-info { padding: 0.6rem 0.7rem; }
    .al-product-name {
        color: white;
        font-weight: 700;
        font-size: 0.9rem;
        margin: 0 0 0.2rem;
    }
    .al-product-desc {
        color: #9ca3af;
        font-size: 0.78rem;
        margin: 0 0 0.25rem;
        line-height: 1.4;
    }
    .al-product-price {
        color: #fbbf24;
        font-weight: 900;
        font-size: 1rem;
        margin: 0;
    }

    .al-contact { text-align: center; }
    .al-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;
    }
    .al-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.45rem 0.9rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #e5e7eb;
        font-size: 0.875rem;
        font-weight: 700;
        text-decoration: none;
    }
    .al-pill:hover {
        background: rgba(251, 191, 36, 0.12);
        border-color: rgba(251, 191, 36, 0.45);
        color: #fde68a;
    }
    .al-meta {
        color: #9ca3af;
        font-size: 0.825rem;
        margin: 0.75rem 0 0;
    }
</style>
