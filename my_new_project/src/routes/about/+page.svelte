<script lang="ts">
    // דף "אודותינו" (/about): פסקת פתיחה + אגף שאלות ותשובות.
    // השו"ת הגלוי וסכמת ה-FAQPage (JSON-LD) נבנים מאותו מקור אמת (aboutFaq.ts),
    // כך שמנועי החיפוש ומנועי ה-AI קוראים בדיוק את הטקסט שהגולש רואה.
    import { _, locale } from 'svelte-i18n';
    import JsonLd from '$lib/components/JsonLd.svelte';
    import { faqSchema, breadcrumbSchema, canonical, SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE, PARENT_BRAND } from '$lib/seo';
    import { aboutFaq } from '$lib/aboutFaq';

    const faq = $derived(aboutFaq($locale));
    const pageTitle = $derived(`${$_('aboutPages.about_title')} | ${SITE_NAME} | ${PARENT_BRAND}`);
    const schemas = $derived([
        {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: pageTitle,
            description: $_('aboutPages.about_meta_desc'),
            url: canonical('/about'),
            inLanguage: 'he-IL',
            isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
            about: { '@id': `${SITE_URL}/#organization` },
        },
        breadcrumbSchema([{ name: 'בית', path: '/' }, { name: 'אודותינו', path: '/about' }]),
        faqSchema(faq),
    ]);
</script>

<svelte:head>
    <title>{pageTitle}</title>
    <meta name="description" content={$_('aboutPages.about_meta_desc')} />
    <meta name="robots" content="index, follow, max-snippet:-1" />
    <link rel="canonical" href={canonical('/about')} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={SITE_NAME} />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={$_('aboutPages.about_meta_desc')} />
    <meta property="og:url" content={canonical('/about')} />
    <meta property="og:image" content={DEFAULT_OG_IMAGE} />
    <meta property="og:locale" content="he_IL" />
</svelte:head>

<JsonLd schema={schemas} />

<div class="min-h-screen py-12 px-4" dir="rtl">
    <div class="max-w-3xl mx-auto">

        <!-- כותרת -->
        <div class="mb-10">
            <h1 class="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                {$_('aboutPages.about_title')}
            </h1>
            <p class="text-gray-400 text-sm">{$_('aboutPages.about_intro_p2')}</p>
        </div>

        <!-- פסקת פתיחה -->
        <section class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6" aria-labelledby="about-intro-heading">
            <h2 id="about-intro-heading" class="sr-only">{SITE_NAME}</h2>
            <p class="text-gray-300 leading-relaxed">
                {$_('aboutPages.about_intro_p1')}
            </p>
        </section>

        <!-- שאלות ותשובות: שתי הראשונות פתוחות כברירת מחדל, כל התשובות ב-DOM גם כשסגורות -->
        <section id="faq" class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6" aria-labelledby="faq-title">
            <h2 id="faq-title" class="text-xl font-bold text-white mb-4">{$_('aboutPages.faq_title')}</h2>
            <div class="space-y-3">
                {#each faq as item, i (item.q)}
                    <details
                        class="faq-item group rounded-xl border border-white/10 bg-[#0f172a]/60 open:border-purple-400/40 transition-colors"
                        open={i < 2}
                    >
                        <summary class="flex items-center justify-between gap-3 cursor-pointer select-none px-4 py-3 text-white font-bold leading-snug list-none">
                            <span>{item.q}</span>
                            <span class="faq-chevron text-purple-300 flex-shrink-0 transition-transform duration-200" aria-hidden="true">▾</span>
                        </summary>
                        <p class="px-4 pb-4 text-gray-300 leading-relaxed">{item.a}</p>
                    </details>
                {/each}
            </div>
        </section>

        <!-- קישורים לשאר דפי האודות הקיימים -->
        <nav class="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6 mb-6" aria-labelledby="about-more-heading">
            <h2 id="about-more-heading" class="text-xl font-bold text-white mb-3">{$_('aboutPages.about_more_title')}</h2>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300">
                <li><a href="/about/revenue" class="text-blue-400 hover:text-blue-300 underline">{$_('aboutPages.about_link_revenue')}</a></li>
                <li><a href="/about/charter" class="text-blue-400 hover:text-blue-300 underline">{$_('aboutPages.about_link_charter')}</a></li>
                <li><a href="/about/advertise" class="text-blue-400 hover:text-blue-300 underline">{$_('aboutPages.about_link_advertise')}</a></li>
                <li><a href="/about/legal" class="text-blue-400 hover:text-blue-300 underline">{$_('aboutPages.about_link_legal')}</a></li>
            </ul>
        </nav>

        <!-- חזרה לדף הבית -->
        <div class="text-center mt-8">
            <a
                href="/"
                class="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
                aria-label={$_('aboutPages.back_home_aria')}
            >
                {$_('aboutPages.back_home')}
            </a>
        </div>

    </div>
</div>

<style>
    /* מסתיר את משולש ברירת המחדל של הדפדפן - יש חץ מותאם ב-summary */
    .faq-item > summary::-webkit-details-marker { display: none; }
    .faq-item[open] .faq-chevron { transform: rotate(180deg); }
</style>
