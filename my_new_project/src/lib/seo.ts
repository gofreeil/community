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
// ---- רשת "יוצאים לחירות" ----
// קישורים הדדיים בין כל אתרי הרשת: כל אתר מקשר לאחרים בעוגן תיאורי,
// וכל Organization מצהיר על שיוך לתנועת האם. כך גוגל ומנועי ה-AI
// מזהים את כולם כישות אחת ומחלקים ביניהם את האמון (entity consolidation).
// רשימה זהה קיימת בכל מאגרי הרשת — עדכון כאן מחייב עדכון מקביל בכולם.
// ============================================================

export interface NetworkSiteLink {
    /** שם האתר כפי שמופיע בעוגן הקישור */
    name: string;
    url: string;
    /** תיאור קצר — משמש כ-title לקישור וכתוכן ל-llms.txt */
    description: string;
}

/** אתר האם של התנועה — הורה ארגוני לכל אתרי הרשת. */
export const PARENT_SITE: NetworkSiteLink = {
    name: 'יוצאים לחירות',
    url: 'https://gofreeil.com',
    description: 'התנועה החברתית שמאחדת את כל אתרי הרשת — מתקדמים לעולם סולידרי, אחראי וחופשי',
};

export const NETWORK_SITES: NetworkSiteLink[] = [
    PARENT_SITE,
    {
        name: 'קהילה בשכונה',
        url: 'https://community.gofreeil.com',
        description: 'כל יתרונות השכונה במקום אחד: יד שנייה, דירות, שידוכים, חוגים, בייבי סיטר וטרמפים',
    },
    {
        name: 'הגמ"ח הארצי',
        url: 'https://gemach.gofreeil.com',
        description: 'מאגר הגמ"חים הארצי — השאלת ציוד רפואי, ריהוט, שמלות וכלי אירוח בחינם',
    },
    {
        name: 'בעלי מקצוע כשירים',
        url: 'https://index.gofreeil.com',
        description: 'אינדקס בעלי מקצוע מדורגים שהתחייבו לאמנת הקהילה ולהטבות לחברי הקהילה',
    },
    {
        name: 'חכמי העדה — בתי הפיוס',
        url: 'https://chachmim.gofreeil.com',
        description: 'בוררות, פיוס ופתרון סכסוכים על פי תורת ישראל, בהתנדבות',
    },
    {
        name: 'רכישות קבוצתיות',
        url: 'https://groups.gofreeil.com',
        description: 'קבוצות רכישה שמורידות מחירים — סלולר, דלק, ביטוח וחשמל',
    },
    {
        name: 'פינת האבדות',
        url: 'https://avedot.gofreeil.com',
        description: 'לוח אבידות ומציאות ארצי — פרסום וחיפוש חינם',
    },
    {
        name: 'ועדי שכונות',
        url: 'https://neighborhoods.gofreeil.com',
        description: 'ועדי שכונות ומשילות התושבים על המוסדות המקומיים',
    },
    {
        name: 'מבקר רשויות המדינה',
        url: 'https://criticism.gofreeil.com',
        description: 'ביקורת ציבורית על הרשויות ומימוש זכויות התושב',
    },
    {
        name: 'דירוג ציבורי',
        url: 'https://rating.gofreeil.com',
        description: 'העם מדרג את הרשויות ואת עובדי הציבור',
    },
    {
        name: 'משאלי העם',
        url: 'https://referendum.gofreeil.com',
        description: 'הבעת דעה על הסוגיות האקטואליות שעל סדר היום',
    },
    {
        name: 'חנות החירות',
        url: 'https://shop.gofreeil.com',
        description: 'מוצרים נבחרים לבריאות טבעית, חקלאות ביתית וטכנולוגיה',
    },
];

/** אתרי הרשת ללא האתר הנוכחי — לשורת הקישורים בפוטר. */
export const OTHER_NETWORK_SITES = NETWORK_SITES.filter((s) => !SITE_URL.startsWith(s.url));

// ============================================================
// ---- מחוללי schema.org (JSON-LD) ----
// ============================================================

/** WebSite + תיבת חיפוש (Sitelinks Searchbox) - לדף הבית בלבד */
export function websiteSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: ['קהילה בשכונה', 'יוצאים לחירות', 'gofreeil'],
        url: SITE_URL,
        inLanguage: 'he-IL',
        publisher: { '@id': `${SITE_URL}/#organization` },
        relatedLink: OTHER_NETWORK_SITES.map((s) => s.url),
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

/** Organization - זהות המותג למנועי חיפוש ול-AI, כולל שיוך לתנועת האם */
export function organizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: DEFAULT_OG_IMAGE,
        description:
            'פלטפורמת קהילה שכונתית המרכזת במקום אחד יד שנייה, דירות, שידוכים, חוגים, גמ"חים, בייבי סיטר, טרמפים, אבדות ומציאות, אירוח לשבת ועוד — לכל שכונה ויישוב בישראל.',
        areaServed: { '@type': 'Country', name: 'Israel' },
        inLanguage: 'he-IL',
        parentOrganization: {
            '@type': 'Organization',
            name: PARENT_SITE.name,
            url: PARENT_SITE.url,
        },
        sameAs: OTHER_NETWORK_SITES.map((s) => s.url),
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
