// ============================================================
// seo.ts - מקור אמת יחיד ל-SEO + Structured Data (JSON-LD)
//
// כל ה-URLים הקנוניים, שמות המותג ומחוללי ה-schema.org עוברים מכאן.
// משמש גם את ה-sitemap, גם את ה-<svelte:head> בכל דף, וגם את ה-AI crawlers.
// ============================================================

/** הדומיין הקנוני היחיד. כל canonical / og:url / sitemap מצביעים לכאן. */
export const SITE_URL = 'https://community.gofreeil.com';
export const SITE_NAME = 'קהילה בשכונה';
export const SITE_TAGLINE = 'כל יתרונות השכונה במקום אחד';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/community-logo1.png`;

/** בונה URL מוחלט קנוני מנתיב יחסי. */
export function canonical(path = '/'): string {
    if (!path.startsWith('/')) path = '/' + path;
    return path === '/' ? SITE_URL : SITE_URL + path;
}

// ============================================================
// ---- מחוללי schema.org (JSON-LD) ----
// ============================================================

/** WebSite + תיבת חיפוש (Sitelinks Searchbox) - לדף הבית בלבד */
export function websiteSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        alternateName: ['קהילה בשכונה', 'יוצאים לחירות', 'gofreeil'],
        url: SITE_URL,
        inLanguage: 'he-IL',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

/** Organization - זהות המותג למנועי חיפוש ול-AI */
export function organizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: DEFAULT_OG_IMAGE,
        description:
            'פלטפורמת קהילה שכונתית המרכזת במקום אחד יד שנייה, דירות, שידוכים, חוגים, גמ"חים, בייבי סיטר, טרמפים, אבדות ומציאות, אירוח לשבת ועוד — לכל שכונה ויישוב בישראל.',
        areaServed: { '@type': 'Country', name: 'Israel' },
    };
}

/** פירורי לחם - מסלול ניווט שגוגל מציג בתוצאות */
export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: it.name,
            item: canonical(it.path),
        })),
    };
}

/** CollectionPage + רשימת פריטים - לדפי לוח (קטגוריה) */
export function collectionSchema(opts: {
    name: string;
    description: string;
    path: string;
    items?: Array<{ name: string; path: string }>;
}) {
    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: opts.name,
        description: opts.description,
        url: canonical(opts.path),
        inLanguage: 'he-IL',
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    };
    if (opts.items?.length) {
        schema.mainEntity = {
            '@type': 'ItemList',
            numberOfItems: opts.items.length,
            itemListElement: opts.items.slice(0, 50).map((it, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: it.name,
                url: canonical(it.path),
            })),
        };
    }
    return schema;
}

/** FAQPage - שאלות ותשובות שגוגל ו-AI אוהבים לצטט */
export function faqSchema(qa: Array<{ q: string; a: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: qa.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
        })),
    };
}

/** Product / Offer - לפריט יד שנייה / מסירה / מוצר */
export function productSchema(opts: {
    name: string;
    description: string;
    path: string;
    image?: string;
    price?: number;
    availability?: boolean;
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: opts.name,
        description: opts.description,
        url: canonical(opts.path),
        ...(opts.image ? { image: opts.image } : {}),
        offers: {
            '@type': 'Offer',
            price: opts.price ?? 0,
            priceCurrency: 'ILS',
            availability: `https://schema.org/${opts.availability === false ? 'OutOfStock' : 'InStock'}`,
            url: canonical(opts.path),
        },
    };
}

/** Event - לאירוע קהילתי */
export function eventSchema(opts: {
    name: string;
    description: string;
    path: string;
    startDate?: string;
    location?: string;
    image?: string;
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: opts.name,
        description: opts.description,
        url: canonical(opts.path),
        ...(opts.startDate ? { startDate: opts.startDate } : {}),
        ...(opts.image ? { image: opts.image } : {}),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
            '@type': 'Place',
            name: opts.location || 'שכונה',
            address: { '@type': 'PostalAddress', addressCountry: 'IL', addressLocality: opts.location || '' },
        },
    };
}
