// ============================================================
// adsSyndication.ts - פרסום פרסומת בכל אתרי הרשת בלחיצה אחת
// ------------------------------------------------------------
// פיצ'ר לסופר-אדמין בלבד: לוקח פרסומת מאושרת של האתר הזה ויוצר לה
// עותק מאושר בכל אחד מאתרי הרשת שיש להם טור פרסומות. כל האתרים
// חולקים Strapi אחד (api.gofreeil.com) אבל כל אתר מאחסן פרסומות
// בפורמט משלו, ולכן לכל אתר יש כאן מתאם נפרד:
//   index - אותו אוסף submitted-ads, מסומן landing._site='index',
//           ומפתחות העיצוב בקידומת קו תחתון (_adStyle, _mainImageFit)
//   pg    - אוסף נפרד pg-submitted-ads (בלי decided_by/company_name)
//   ng    - רשומת item בקטגוריה הפנימית __ng_ad, הכל בתוך extra_fields
//
// אידמפוטנטי: מזהי העותקים נשמרים על פרסומת המקור (landing._syndicatedCopies)
// וכל עותק מסומן ב-_syndicatedFrom. לחיצה חוזרת מעדכנת את העותקים
// הקיימים במקום ליצור כפילויות.
//
// כשל באתר אחד לא עוצר את השאר - כל אתר מדווח הצלחה/כשל בנפרד.
// ============================================================

import { strapiGet, strapiGetAll, strapiPost, strapiPut } from './strapiClient.js';
import { getAd, type SubmittedAd } from './adsStore.js';
import { invalidate } from './cache.js';

export type SyndicationSite = 'index' | 'pg' | 'ng';

export interface SyndicationSiteResult {
    site: SyndicationSite;
    /** שם האתר בעברית - להודעת המשוב במסך הניהול */
    label: string;
    ok: boolean;
    action?: 'created' | 'updated';
    error?: string;
}

export interface SyndicationResult {
    title: string;
    results: SyndicationSiteResult[];
}

const SITE_LABELS: Record<SyndicationSite, string> = {
    index: 'אינדקס העסקים',
    pg:    'רכישות קבוצתיות',
    ng:    'הגמח הארצי',
};

/**
 * מפתחות פנימיים בתוך landing של האתר הזה - לא תוכן דף הנחיתה.
 * מפתח בקידומת קו תחתון הוא פנימי בכל אתרי המשפחה; אלה הם המפתחות
 * הפנימיים ההיסטוריים שנשמרו בלי קידומת.
 */
const NON_CONTENT_KEYS = new Set(['mainImageFit', 'mobileImage', 'mobileImageFit', 'adStyle']);

/** תוכן דף הנחיתה בלבד - בלי מפתחות פנימיים של אף אתר */
function contentLanding(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw ?? {})) {
        if (k.startsWith('_') || NON_CONTENT_KEYS.has(k)) continue;
        out[k] = v;
    }
    return out;
}

/** המקום הפנוי הנמוך ביותר (0-based) - כמו בהקצאת מקומות באישור רגיל */
function lowestFreeSlot(taken: Set<number>): number {
    let slot = 0;
    while (taken.has(slot)) slot++;
    return slot;
}

/**
 * שליפה רזה של רשימת רשומות לחישוב מקומות פנויים וזיהוי עותק קיים.
 * fields מצמצם לעמודת ה-json בלבד (בלי logo/main_image שהם base64 כבד);
 * אם Strapi דוחה בחירת עמודת json - נופלים לשליפה מלאה.
 */
async function fetchRows(
    endpoint: string,
    filters: Record<string, string>,
    jsonField: string,
): Promise<Array<Record<string, unknown>>> {
    const lean = {
        ...filters,
        'fields[0]': 'documentId',
        'fields[1]': jsonField,
    };
    try {
        return await strapiGetAll<Record<string, unknown>>(endpoint, lean);
    } catch {
        return await strapiGetAll<Record<string, unknown>>(endpoint, filters);
    }
}

async function fetchOne(endpoint: string, id: string): Promise<Record<string, unknown> | null> {
    try {
        const res = await strapiGet<{ data: Record<string, unknown> | null }>(`${endpoint}/${encodeURIComponent(id)}`);
        return res?.data ?? null;
    } catch {
        return null;
    }
}

/** מזהי העותקים שנשמרו על פרסומת המקור בסנכרון קודם */
function savedCopies(src: SubmittedAd): Partial<Record<SyndicationSite, string>> {
    const raw = (src.landing as unknown as Record<string, unknown>)?._syndicatedCopies;
    return raw && typeof raw === 'object' ? raw as Partial<Record<SyndicationSite, string>> : {};
}

interface SiteAdapter {
    site: SyndicationSite;
    /** מפרסם את הפרסומת באתר; מחזיר את מזהה העותק ואם נוצר או עודכן */
    publish(src: SubmittedAd, decidedBy: string, existingId?: string): Promise<{ id: string; action: 'created' | 'updated' }>;
}

// ------------------------------------------------------------
// index - אותו אוסף submitted-ads, בסימון landing._site='index'.
// שם המפתחות הפנימיים שם שונה משלנו: _adStyle ו-_mainImageFit
// (בקידומת קו תחתון), ואין תמיכה בתמונת נייד.
// ------------------------------------------------------------
const indexAdapter: SiteAdapter = {
    site: 'index',
    async publish(src, decidedBy, existingId) {
        const endpoint = '/api/submitted-ads';
        const rows = await fetchRows(endpoint, { 'filters[ad_status][$eq]': 'approved' }, 'landing');
        const siteRows = rows.filter(r => (r.landing as Record<string, unknown> | null)?._site === 'index');

        // עותק קיים: לפי המיפוי שעל המקור, ובגיבוי - סריקת המאושרות לפי הסימון
        const found = siteRows.find(r => (r.landing as Record<string, unknown>)?._syndicatedFrom === src.id);
        const copyId = existingId ?? (typeof found?.documentId === 'string' ? found.documentId : undefined);
        const existing = copyId ? await fetchOne(endpoint, copyId) : null;

        const taken = new Set<number>();
        for (const r of siteRows) {
            const order = (r.landing as Record<string, unknown> | null)?._order;
            if (typeof order === 'number' && (r.documentId !== copyId)) taken.add(order);
        }
        const existingOrder = (existing?.landing as Record<string, unknown> | null)?._order;
        const slot = typeof existingOrder === 'number' ? existingOrder : lowestFreeSlot(taken);

        const now = new Date().toISOString();
        const landing = {
            ...contentLanding(src.landing as unknown as Record<string, unknown>),
            _site:                  'index',
            _order:                 slot,
            _payment:               'code',
            _codeRequested:         false,
            _requestedDurationDays: src.durationDays ?? 30,
            _mainImageFit:          src.mainImageFit,
            _adStyle:               src.adStyle,
            _syndicatedFrom:        src.id,
        };
        const columns: Record<string, unknown> = {
            ad_status:          'approved',
            title:              src.title,
            subtitle:           src.subtitle,
            hover_text:         src.hoverText,
            cta:                src.cta,
            gradient:           src.gradient,
            logo:               src.logo,
            main_image:         src.mainImage,
            landing,
            submitted_by_id:    src.submittedBy?.id ?? null,
            submitted_by_email: src.submittedBy?.email ?? null,
            submitted_by_name:  src.submittedBy?.name ?? null,
            decided_at:         now,
            decided_by:         decidedBy,
            rejection_reason:   null,
            expires_at:         src.expiresAt ?? null,
            duration_days:      src.durationDays ?? null,
            company_name:       src.companyName ?? null,
        };
        if (existing && copyId) {
            await strapiPut(`${endpoint}/${encodeURIComponent(copyId)}`, { data: columns });
            return { id: copyId, action: 'updated' };
        }
        const res = await strapiPost<{ data: { documentId: string } }>(endpoint, {
            data: { ...columns, submitted_at: now },
        });
        return { id: res.data.documentId, action: 'created' };
    },
};

// ------------------------------------------------------------
// pg - אוסף נפרד pg-submitted-ads. אין בו את העמודות decided_by /
// company_name / payment_amount, והמפתחות הפנימיים כמו ב-index.
// שים לב: ל-content type הזה יש controller שחוסם עדכון שלא מגיע
// מ-super_admin או מ-API token של השרת - כשל עדכון מדווח ולא מפיל.
// ------------------------------------------------------------
const pgAdapter: SiteAdapter = {
    site: 'pg',
    async publish(src, _decidedBy, existingId) {
        const endpoint = '/api/pg-submitted-ads';
        const rows = await fetchRows(endpoint, { 'filters[ad_status][$eq]': 'approved' }, 'landing');

        const found = rows.find(r => (r.landing as Record<string, unknown> | null)?._syndicatedFrom === src.id);
        const copyId = existingId ?? (typeof found?.documentId === 'string' ? found.documentId : undefined);
        const existing = copyId ? await fetchOne(endpoint, copyId) : null;

        const taken = new Set<number>();
        for (const r of rows) {
            const order = (r.landing as Record<string, unknown> | null)?._order;
            if (typeof order === 'number' && (r.documentId !== copyId)) taken.add(order);
        }
        const existingOrder = (existing?.landing as Record<string, unknown> | null)?._order;
        const slot = typeof existingOrder === 'number' ? existingOrder : lowestFreeSlot(taken);

        const now = new Date().toISOString();
        const landing = {
            ...contentLanding(src.landing as unknown as Record<string, unknown>),
            _order:                 slot,
            _payment:               'code',
            _codeRequested:         false,
            _requestedDurationDays: src.durationDays ?? 30,
            _mainImageFit:          src.mainImageFit,
            _adStyle:               src.adStyle,
            _syndicatedFrom:        src.id,
        };
        const columns: Record<string, unknown> = {
            ad_status:          'approved',
            title:              src.title,
            subtitle:           src.subtitle,
            hover_text:         src.hoverText,
            cta:                src.cta,
            gradient:           src.gradient,
            logo:               src.logo,
            main_image:         src.mainImage,
            landing,
            submitted_by_id:    src.submittedBy?.id ?? '',
            submitted_by_email: src.submittedBy?.email ?? '',
            submitted_by_name:  src.submittedBy?.name ?? '',
            decided_at:         now,
            rejection_reason:   '',
            expires_at:         src.expiresAt ?? null,
            duration_days:      src.durationDays ?? null,
        };
        if (existing && copyId) {
            await strapiPut(`${endpoint}/${encodeURIComponent(copyId)}`, { data: columns });
            return { id: copyId, action: 'updated' };
        }
        const res = await strapiPost<{ data: { documentId: string } }>(endpoint, {
            data: { ...columns, submitted_at: now },
        });
        return { id: res.data.documentId, action: 'created' };
    },
};

// ------------------------------------------------------------
// ng - רשומת item בקטגוריה הפנימית __ng_ad באוסף items המשותף:
// label = כותרת, description = שורת משנה, status1 = 'active' (מאושרת),
// וכל שאר שדות המודעה בתוך extra_fields במפתחות snake_case.
// ------------------------------------------------------------
const ngAdapter: SiteAdapter = {
    site: 'ng',
    async publish(src, decidedBy, existingId) {
        const endpoint = '/api/items';
        const rows = await fetchRows(endpoint, {
            'filters[category][$eq]': '__ng_ad',
            'filters[status1][$eq]':  'active',
        }, 'extra_fields');

        const found = rows.find(r => (r.extra_fields as Record<string, unknown> | null)?.syndicated_from === src.id);
        const copyId = existingId ?? (typeof found?.documentId === 'string' ? found.documentId : undefined);
        const existing = copyId ? await fetchOne(endpoint, copyId) : null;
        // ההגנה של getAd בגמח: המסלול הזה נוגע רק ברשומות שהן מודעות
        const existingIsAd = existing?.category === '__ng_ad';

        const taken = new Set<number>();
        for (const r of rows) {
            const order = (r.extra_fields as Record<string, unknown> | null)?.slot_order;
            if (typeof order === 'number' && (r.documentId !== copyId)) taken.add(order);
        }
        const existingOrder = (existing?.extra_fields as Record<string, unknown> | null)?.slot_order;
        const slot = typeof existingOrder === 'number' ? existingOrder : lowestFreeSlot(taken);

        const now = new Date().toISOString();
        const extraFields = {
            hover_text:              src.hoverText,
            cta:                     src.cta,
            gradient:                src.gradient,
            logo:                    src.logo,
            main_image:              src.mainImage,
            main_image_fit:          src.mainImageFit,
            ad_style:                src.adStyle,
            landing:                 contentLanding(src.landing as unknown as Record<string, unknown>),
            submitted_by:            {
                id:    src.submittedBy?.id ?? '',
                email: src.submittedBy?.email ?? '',
                name:  src.submittedBy?.name ?? '',
            },
            decided_at:              now,
            decided_by:              decidedBy,
            payment:                 'code',
            code_requested:          false,
            requested_duration_days: src.durationDays ?? 30,
            expires_at:              src.expiresAt ?? '',
            duration_days:           src.durationDays ?? 30,
            slot_order:              slot,
            syndicated_from:         src.id,
        };
        const columns = {
            category:    '__ng_ad',
            label:       src.title,
            description: src.subtitle,
            status1:     'active',
        };
        if (existingIsAd && copyId) {
            // submitted_at המקורי של העותק נשמר - סדר המשבצות בגמח נגזר ממנו
            const prevSubmittedAt = (existing?.extra_fields as Record<string, unknown> | null)?.submitted_at;
            await strapiPut(`${endpoint}/${encodeURIComponent(copyId)}`, {
                data: { ...columns, extra_fields: { ...extraFields, submitted_at: prevSubmittedAt ?? now } },
            });
            return { id: copyId, action: 'updated' };
        }
        const res = await strapiPost<{ data: { documentId: string } }>(endpoint, {
            data: {
                ...columns,
                extra_fields: { ...extraFields, submitted_at: now },
                publishedAt:  now,
            },
        });
        return { id: res.data.documentId, action: 'created' };
    },
};

const ADAPTERS: SiteAdapter[] = [indexAdapter, pgAdapter, ngAdapter];

/**
 * מפרסם פרסומת מאושרת של האתר הזה בכל אתרי הרשת. לחיצה חוזרת מעדכנת
 * את העותקים הקיימים (רענון תוכן) במקום ליצור כפילויות.
 * מחזיר null אם הפרסומת לא נמצאה או שאינה מאושרת.
 */
export async function publishAdEverywhere(adId: string, decidedBy: string): Promise<SyndicationResult | null> {
    const src = await getAd(adId);
    if (!src || src.status !== 'approved') return null;

    const copies = savedCopies(src);
    const results: SyndicationSiteResult[] = [];
    const newCopies: Partial<Record<SyndicationSite, string>> = { ...copies };

    // בזה אחר זה ולא במקביל - כולם כותבים לאותו Strapi, וכתיבות המודעות
    // כבדות (base64); מקביליות כאן הייתה מסכנת timeout של כל הבקשות יחד.
    for (const adapter of ADAPTERS) {
        try {
            const r = await adapter.publish(src, decidedBy, copies[adapter.site]);
            newCopies[adapter.site] = r.id;
            results.push({ site: adapter.site, label: SITE_LABELS[adapter.site], ok: true, action: r.action });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[adsSyndication] publish to ${adapter.site} failed:`, msg);
            results.push({ site: adapter.site, label: SITE_LABELS[adapter.site], ok: false, error: msg });
        }
    }

    // מיפוי העותקים + חותמת הסנכרון נשמרים על המקור - ככה הלחיצה הבאה
    // מעדכנת במקום לשכפל, והמסך מציג "פורסמה בכל האתרים".
    // נשמר גם כשחלק מהאתרים נכשלו, כדי לא לאבד את מזהי העותקים שכן נוצרו.
    if (results.some(r => r.ok)) {
        try {
            await strapiPut(`/api/submitted-ads/${encodeURIComponent(adId)}`, {
                data: {
                    landing: {
                        ...(src.landing as unknown as Record<string, unknown>),
                        _syndicatedCopies: newCopies,
                        _syndicatedAt:     new Date().toISOString(),
                    },
                },
            });
            invalidate('ads:');
        } catch (e) {
            console.warn('[adsSyndication] marking source ad failed:', e instanceof Error ? e.message : e);
        }
    }

    return { title: src.title, results };
}
