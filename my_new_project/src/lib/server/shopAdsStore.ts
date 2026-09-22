// ============================================================
// shopAdsStore.ts - מנוע הסנכרון של פרסומות המוצרים מחנות החירות
// ------------------------------------------------------------
// מושך את המוצרים האחרונים שאושרו ב-shop.gofreeil.com ומפרסם אותם
// כפרסומות מאושרות בטור הימני של כל אתרי הרשת, במקומות 3, 7, 11, 15
// (אותה קומה בכל אחת מארבע הקבוצות של הסבב - ראה shopAds.ts).
//
// אידמפוטנטי: כל רשומה נושאת את מזהה המוצר שממנו נוצרה
// (landing._shopProduct / extra_fields.shop_product), ולכן סנכרון חוזר
// מעדכן את הקיימות, יוצר רק את מה שחסר, ומוחק פרסומות של מוצרים
// שכבר אינם ברשימה. שום רשומה שאינה מסומנת כך לא נגעת בה.
//
// מקום תפוס לא נדחק: אם מפרסם משלם יושב על מקום 7, המוצר עובר למקום
// הפנוי הבא. פרסומת שפג תוקפה או מושהית אינה "תופסת" - היא כבר לא
// על המסך.
//
// כשל באתר אחד לא עוצר את השאר; כל אתר מדווח בנפרד.
// ============================================================

import { strapiGet, strapiGetAll, strapiPost, strapiPut, strapiDelete } from './strapiClient.js';
import { invalidate } from './cache.js';
import { AD_SLOT_COUNT } from '../adSlots.js';
import { DEFAULT_AD_STYLE } from '../adStyle.js';
import {
    SHOP_URL,
    SHOP_AD_SITES,
    normalizeShopAdsConfig,
    preferredSlots,
    shopAdGradient,
    type ShopAdSite,
    type ShopAdsConfig,
} from '../shopAds.js';

const ADS_ENDPOINT   = '/api/submitted-ads';
const PG_ENDPOINT    = '/api/pg-submitted-ads';
const ITEMS_ENDPOINT = '/api/items';
const PR_ENDPOINT    = '/api/pr-items';
const NG_CATEGORY    = '__ng_ad';
const PR_CATEGORY    = 'pr_ad';

/** תקרת התמונות המוטבעות באתר הדירוג הציבורי (MAX_AD_TOTAL_BYTES שלו) */
const PR_MAX_IMAGE_BYTES = 600 * 1024;

/** הקטגוריה הפנימית שבה נשמרות ההגדרות. status1='inactive' כדי שלא
 *  תיכנס לרשימות/למפה של האתר, שמושכות רק פריטים פעילים. */
const CONFIG_CATEGORY = '__shop_ads_config';
const CONFIG_STATUS   = 'inactive';

type Row = Record<string, any>;

// ============================================================
// המוצרים מהחנות
// ============================================================

export interface ShopProduct {
    /** מזהה המוצר ב-Strapi של החנות - מפתח הזיהוי של הפרסומת */
    documentId: string;
    /** המזהה המספרי שבו החנות פותחת את המוצר (/p/<id>) */
    id: number;
    name: string;
    desc: string;
    price: number;
    oldPrice: number | null;
    store: string;
    storePhone: string;
    storeWhatsapp: string;
    /** כתובת מלאה לתמונה הראשית (החנות מחזירה נתיב יחסי) */
    image: string;
    approvedAt: string;
    quantity: number | null;
    visibility: string;
}

function absoluteShopUrl(path: string): string {
    if (!path) return '';
    return /^https?:\/\//i.test(path) ? path : `${SHOP_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * המוצרים האחרונים שאושרו בחנות. ההזנה הציבורית כבר ממוינת לפי מועד
 * האישור (חדש→ישן); מסננים כאן מוצר בלי תמונה (הכרטיס בטור הוא תמונה),
 * מוצר שהמוכר הסתיר או הגביל לשכונות, ומוצר שאזל.
 */
export async function fetchNewestShopProducts(count: number): Promise<ShopProduct[]> {
    const res = await fetch(`${SHOP_URL}/api/seller-products`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`חנות החירות החזירה ${res.status}`);
    const body = await res.json() as { items?: Row[] };
    const items = Array.isArray(body?.items) ? body.items : [];

    const out: ShopProduct[] = [];
    for (const p of items) {
        if (out.length >= count) break;
        const image = absoluteShopUrl(String(p.image ?? ''));
        if (!image) continue;
        if ((p.visibility ?? 'visible') !== 'visible') continue;
        if (p.quantity != null && Number(p.quantity) <= 0) continue;
        const documentId = String(p.documentId ?? '').trim();
        if (!documentId) continue;
        out.push({
            documentId,
            id:            Number(p.id) || 0,
            name:          String(p.name ?? '').trim(),
            desc:          String(p.desc ?? '').trim(),
            price:         Number(p.price) || 0,
            oldPrice:      p.oldPrice != null ? Number(p.oldPrice) : null,
            store:         String(p.store ?? '').trim(),
            storePhone:    String(p.storePhone ?? '').trim(),
            storeWhatsapp: String(p.storeWhatsapp ?? '').trim(),
            image,
            approvedAt:    String(p.approvedAt ?? ''),
            quantity:      p.quantity != null ? Number(p.quantity) : null,
            visibility:    String(p.visibility ?? 'visible'),
        });
    }
    return out;
}

/**
 * תמונת המוצר כ-data URI. נחוץ רק לאתר הדירוג הציבורי, שמאחסן את
 * תמונות הפרסומת מוטבעות ודוחה כתובת חיצונית. תמונה מעל התקרה שלו
 * מוחזרת ריקה - המוצר פשוט לא יפורסם שם, במקום לשבור את הכתיבה.
 */
async function fetchAsDataUri(url: string, maxBytes: number): Promise<string> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) return '';
        const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        if (!/^image\/(png|jpe?g|webp)$/.test(type)) return '';
        const buf = Buffer.from(await res.arrayBuffer());
        const b64 = buf.toString('base64');
        if (b64.length > maxBytes) return '';
        return `data:${type === 'image/jpg' ? 'image/jpeg' : type};base64,${b64}`;
    } catch {
        return '';
    }
}

// ============================================================
// מוצר -> תוכן הפרסומת
// ============================================================

function trim(s: string, max: number): string {
    const clean = s.replace(/\s+/g, ' ').trim();
    return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + '…';
}

const shekel = (n: number) => `₪${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** כתובת דף המוצר בחנות - היעד של "לרכישה" בדף הנחיתה */
export function productUrl(p: ShopProduct): string {
    return p.id > 0 ? `${SHOP_URL}/p/${p.id}` : `${SHOP_URL}/products`;
}

interface AdContent {
    title: string;
    subtitle: string;
    hoverText: string;
    cta: string;
    gradient: string;
    mainImage: string;
    landing: Record<string, unknown>;
    companyName: string;
}

function adContent(p: ShopProduct, index: number, site: ShopAdSite): AdContent {
    const price = p.oldPrice && p.oldPrice > p.price
        ? `${shekel(p.price)} במקום ${shekel(p.oldPrice)}`
        : shekel(p.price);
    return {
        title:     trim(p.name, 42),
        subtitle:  p.store ? trim(`${price} · ${p.store}`, 60) : price,
        hoverText: trim(p.desc || `${p.name} - בחנות החירות`, 160),
        cta:       trim(`${price} · לצפייה בחנות`, 48),
        gradient:  shopAdGradient(index, site.gradient),
        mainImage: p.image,
        companyName: p.store || 'חנות החירות',
        landing: {
            headline:   trim(p.name, 80),
            pitch:      trim(p.desc || `${p.name} - מוצר של ${p.store || 'מוכר מהקהילה'} בחנות החירות`, 300),
            extended:   '',
            image:      p.image,
            advantages: [
                price,
                p.store ? `נמכר על ידי ${trim(p.store, 40)}` : 'נמכר על ידי מוכר מהקהילה',
                '90% ממחיר המכירה נשאר אצל המוכר',
            ],
            uniqueness: '',
            phone:      p.storePhone,
            whatsapp:   p.storeWhatsapp,
            website:    productUrl(p),
            email:      '',
            address:    '',
            hours:      '',
            products:   [],
        },
    };
}

// ============================================================
// חישוב המקומות
// ============================================================

/**
 * המקומות (0-based) שתפוסים על המסך באתר: פרסומות מאושרות שאינן שלנו,
 * שאינן מושהות ושתוקפן לא פג. מי שאין לה מספר מקבלת - כמו באתר עצמו -
 * את המקום הפנוי הנמוך ביותר, כדי שלא נתנגש איתה.
 */
function takenOrders(rows: Array<{ order?: number }>): Set<number> {
    const taken = new Set<number>();
    const noOrder: Array<{ order?: number }> = [];
    for (const r of rows) {
        if (typeof r.order === 'number' && r.order >= 0 && !taken.has(r.order)) taken.add(r.order);
        else noOrder.push(r);
    }
    let next = 0;
    for (const _ of noOrder) {
        while (taken.has(next)) next++;
        taken.add(next);
    }
    return taken;
}

/**
 * המקום בפועל של כל מוצר (0-based): המקום המבוקש אם הוא פנוי, אחרת
 * המקום הפנוי הבא (בסריקה מעגלית על פני הלוח). אם כל הלוח תפוס -
 * המוצר נכנס אחרי סופו (הטור מציג גלישה בסוף) ולא דוחק אף מפרסם.
 */
export function placeOrders(wanted: number[], taken: Set<number>): number[] {
    const used = new Set(taken);
    return wanted.map((want, i) => {
        for (let step = 0; step < AD_SLOT_COUNT; step++) {
            const cand = (want + step) % AD_SLOT_COUNT;
            if (!used.has(cand)) { used.add(cand); return cand; }
        }
        const overflow = AD_SLOT_COUNT + i;
        used.add(overflow);
        return overflow;
    });
}

// ============================================================
// קריאת הרשומות הקיימות
// ============================================================

/** שליפה רזה של אוסף - בלי logo/main_image שהם base64 כבד */
async function leanRows(endpoint: string, jsonField: string, filters: Record<string, string> = {}): Promise<Row[]> {
    const lean = {
        ...filters,
        'fields[0]': 'documentId',
        'fields[1]': 'ad_status',
        'fields[2]': 'expires_at',
        'fields[3]': jsonField,
    };
    try {
        return await strapiGetAll<Row>(endpoint, lean);
    } catch {
        return await strapiGetAll<Row>(endpoint, filters);
    }
}

function landingOf(r: Row): Record<string, any> {
    const l = r?.landing;
    return l && typeof l === 'object' ? l : {};
}

function extraOf(r: Row): Record<string, any> {
    const x = r?.extra_fields;
    return x && typeof x === 'object' ? x : {};
}

function isLive(status: string, expiresAt: unknown, paused: unknown): boolean {
    if (status !== 'approved') return false;
    if (paused === true) return false;
    const raw = typeof expiresAt === 'string' ? expiresAt : '';
    if (!raw) return true;
    const t = Date.parse(raw);
    return !Number.isFinite(t) || t > Date.now();
}

/** רשומה של האתר הזה באוסף המשותף (קהילה בשכונה גם בלי הסימון) */
function belongsTo(site: ShopAdSite, r: Row): boolean {
    const tag = landingOf(r)._site;
    if (site.siteTag === 'community') return tag === undefined || tag === null || tag === 'community';
    return tag === site.siteTag;
}

export interface PlacedShopAd {
    /** מזהה הרשומה באתר היעד */
    id: string;
    /** מזהה המוצר בחנות */
    product: string;
    /** המקום בטור (1-based) */
    slot: number;
}

// ============================================================
// מתאם לכל סוג אחסון
// ============================================================

interface SiteRows {
    /** רשומות הפרסומות של המוצרים שלנו באתר */
    ours: Array<{ id: string; product: string; order?: number; submittedAt?: string }>;
    /** המקומות שתפוסים ע"י פרסומות אחרות שעל המסך */
    taken: Set<number>;
}

async function readSubmittedSite(site: ShopAdSite, allRows: Row[]): Promise<SiteRows> {
    const mine = allRows.filter(r => belongsTo(site, r));
    const ours: SiteRows['ours'] = [];
    const others: Array<{ order?: number }> = [];
    for (const r of mine) {
        const l = landingOf(r);
        const order = typeof l._order === 'number' ? l._order : undefined;
        if (typeof l._shopProduct === 'string' && l._shopProduct) {
            ours.push({ id: String(r.documentId), product: l._shopProduct, order });
        } else if (isLive(String(r.ad_status ?? ''), r.expires_at, l._paused)) {
            others.push({ order });
        }
    }
    return { ours, taken: takenOrders(others) };
}

async function readPgSite(): Promise<SiteRows> {
    const rows = await leanRows(PG_ENDPOINT, 'landing');
    const ours: SiteRows['ours'] = [];
    const others: Array<{ order?: number }> = [];
    for (const r of rows) {
        const l = landingOf(r);
        const order = typeof l._order === 'number' ? l._order : undefined;
        if (typeof l._shopProduct === 'string' && l._shopProduct) {
            ours.push({ id: String(r.documentId), product: l._shopProduct, order });
        } else if (isLive(String(r.ad_status ?? ''), r.expires_at, l._paused)) {
            others.push({ order });
        }
    }
    return { ours, taken: takenOrders(others) };
}

async function readNgSite(): Promise<SiteRows> {
    const rows = await strapiGetAll<Row>(ITEMS_ENDPOINT, {
        'filters[category][$eq]': NG_CATEGORY,
        'fields[0]': 'documentId',
        'fields[1]': 'status1',
        'fields[2]': 'extra_fields',
    }).catch(() => [] as Row[]);
    const ours: SiteRows['ours'] = [];
    const others: Array<{ order?: number }> = [];
    for (const r of rows) {
        const x = extraOf(r);
        const order = typeof x.slot_order === 'number' ? x.slot_order : undefined;
        if (typeof x.shop_product === 'string' && x.shop_product) {
            // חותמת ההגשה המקורית נשמרת: סדר המשבצות בגמח נגזר ממנה
            const submittedAt = typeof x.submitted_at === 'string' ? x.submitted_at : undefined;
            ours.push({ id: String(r.documentId), product: x.shop_product, order, submittedAt });
        } else if (isLive(r.status1 === 'active' ? 'approved' : '', x.expires_at, x.paused)) {
            others.push({ order });
        }
    }
    return { ours, taken: takenOrders(others) };
}

/** דירוג ציבורי: אותו רעיון, באוסף pr-items ובקטגוריה pr_ad */
async function readPrSite(): Promise<SiteRows> {
    const rows = await strapiGetAll<Row>(PR_ENDPOINT, {
        'filters[category][$eq]': PR_CATEGORY,
        'fields[0]': 'documentId',
        'fields[1]': 'status1',
        'fields[2]': 'extra_fields',
    }).catch(() => [] as Row[]);
    const ours: SiteRows['ours'] = [];
    const others: Array<{ order?: number }> = [];
    for (const r of rows) {
        const x = extraOf(r);
        const order = typeof x.slot_order === 'number' ? x.slot_order : undefined;
        if (typeof x.shop_product === 'string' && x.shop_product) {
            const submittedAt = typeof x.submitted_at === 'string' ? x.submitted_at : undefined;
            ours.push({ id: String(r.documentId), product: x.shop_product, order, submittedAt });
        } else if (isLive(r.status1 === 'active' ? 'approved' : '', x.expires_at, x.paused)) {
            others.push({ order });
        }
    }
    return { ours, taken: takenOrders(others) };
}

/** הקריאה המתאימה לסוג האחסון של האתר */
function readSite(site: ShopAdSite, allAdRows: Row[]): Promise<SiteRows> {
    if (site.kind === 'pg') return readPgSite();
    if (site.kind === 'ng') return readNgSite();
    if (site.kind === 'pr') return readPrSite();
    return readSubmittedSite(site, allAdRows);
}

/** הנתיב שממנו מוחקים פרסומת של האתר */
function endpointOf(site: ShopAdSite): string {
    if (site.kind === 'pg') return PG_ENDPOINT;
    if (site.kind === 'ng') return ITEMS_ENDPOINT;
    if (site.kind === 'pr') return PR_ENDPOINT;
    return ADS_ENDPOINT;
}

// ----- כתיבה -----

function submittedColumns(c: AdContent, landing: Record<string, unknown>, now: string, decidedBy: string) {
    return {
        ad_status:          'approved',
        title:              c.title,
        subtitle:           c.subtitle,
        hover_text:         c.hoverText,
        cta:                c.cta,
        gradient:           c.gradient,
        logo:               '',
        main_image:         c.mainImage,
        landing,
        submitted_by_id:    null,
        submitted_by_email: null,
        submitted_by_name:  null,
        decided_at:         now,
        decided_by:         decidedBy,
        rejection_reason:   null,
        // פרסומת של החנות לא פגה: היא יורדת כשהמוצר יוצא מהרשימה
        expires_at:         null,
        duration_days:      null,
        company_name:       c.companyName,
    };
}

/** המפתחות הפנימיים ב-landing, בשמות שהאתר היעד קורא */
function internalLanding(site: ShopAdSite, c: AdContent, order: number, product: string, now: string) {
    const fit = { x: 50, y: 45, z: 0.6 };
    const base: Record<string, unknown> = {
        ...c.landing,
        _order:                 order,
        _payment:               'code',
        _codeRequested:         false,
        _requestedDurationDays: 30,
        _shopProduct:           product,
        _shopSyncedAt:          now,
    };
    if (site.siteTag) base._site = site.siteTag;
    if (site.underscoreKeys) {
        base._mainImageFit = fit;
        base._adStyle = { ...DEFAULT_AD_STYLE };
    } else {
        base.mainImageFit = fit;
        base.adStyle = { ...DEFAULT_AD_STYLE };
    }
    return base;
}

// ============================================================
// סנכרון
// ============================================================

export interface SiteSyncResult {
    site: string;
    label: string;
    ok: boolean;
    created: number;
    updated: number;
    removed: number;
    /** המקומות בפועל (1-based) - כולל הסטה ממקום תפוס */
    slots: number[];
    error?: string;
}

export interface SyncResult {
    products: ShopProduct[];
    wanted: number[];
    results: SiteSyncResult[];
    syncedAt: string;
}

async function syncSite(
    site: ShopAdSite,
    products: ShopProduct[],
    wanted: number[],
    decidedBy: string,
    allAdRows: Row[],
): Promise<SiteSyncResult> {
    const base: SiteSyncResult = { site: site.id, label: site.label, ok: true, created: 0, updated: 0, removed: 0, slots: [] };
    const state = await readSite(site, allAdRows);

    // מבקשים מקום רק לכמות המוצרים שבאמת נמצאה
    const orders = placeOrders(wanted.slice(0, products.length).map(s => s - 1), state.taken);
    base.slots = orders.map(o => o + 1);
    const now = new Date().toISOString();
    const keep = new Set(products.map(p => p.documentId));

    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const c = adContent(p, i, site);
        const existing = state.ours.find(r => r.product === p.documentId);
        if (site.kind === 'ng') {
            const extra = {
                hover_text:      c.hoverText,
                cta:             c.cta,
                gradient:        c.gradient,
                logo:            '',
                main_image:      c.mainImage,
                main_image_fit:  { x: 50, y: 45, z: 0.6 },
                ad_style:        { ...DEFAULT_AD_STYLE },
                landing:         c.landing,
                submitted_by:    { id: '', email: '', name: '' },
                submitted_at:    existing?.submittedAt ?? now,
                decided_at:      now,
                decided_by:      decidedBy,
                payment:         'code',
                code_requested:  false,
                expires_at:      '',
                duration_days:   null,
                slot_order:      orders[i],
                shop_product:    p.documentId,
                shop_synced_at:  now,
            };
            const columns = { category: NG_CATEGORY, label: c.title, description: c.subtitle, status1: 'active' };
            if (existing) {
                await strapiPut(`${ITEMS_ENDPOINT}/${encodeURIComponent(existing.id)}`, { data: { ...columns, extra_fields: extra } });
                base.updated++;
            } else {
                await strapiPost(ITEMS_ENDPOINT, { data: { ...columns, extra_fields: extra, publishedAt: now } });
                base.created++;
            }
            continue;
        }

        if (site.kind === 'pr') {
            // הדירוג הציבורי מאחסן את התמונה מוטבעת ודוחה כתובת חיצונית
            const embedded = await fetchAsDataUri(p.image, PR_MAX_IMAGE_BYTES);
            if (!embedded) {
                console.warn(`[shopAds] ${site.id}: דילוג על "${p.name}" - התמונה גדולה מדי או לא נטענה`);
                continue;
            }
            const extra = {
                hover_text:              trim(c.hoverText, 90),
                cta:                     trim(c.cta, 30),
                gradient_id:             c.gradient,
                logo:                    '',
                main_image:              embedded,
                style:                   {},
                // אותו תוכן, בלי תמונת דף הנחיתה - כדי לא לשלם עליה פעמיים בתקרה
                landing:                 { ...c.landing, image: '' },
                submitted_by:            { name: c.companyName },
                contact_email:           '',
                submitted_at:            existing?.submittedAt ?? now,
                decided_at:              now,
                decided_by:              decidedBy,
                expires_at:              '',
                duration_days:           30,
                requested_duration_days: 30,
                payment:                 'owner',
                bytes:                   embedded.length,
                slot_order:              orders[i],
                shop_product:            p.documentId,
                shop_synced_at:          now,
            };
            const columns = {
                category:    PR_CATEGORY,
                label:       trim(c.title, 35),
                description: trim(c.subtitle, 70),
                user_id:     null,
                status1:     'active',
                icon:        '📢',
                color:       'amber',
            };
            if (existing) {
                await strapiPut(`${PR_ENDPOINT}/${encodeURIComponent(existing.id)}`, { data: { ...columns, extra_fields: extra } });
                base.updated++;
            } else {
                await strapiPost(PR_ENDPOINT, { data: { ...columns, extra_fields: extra, publishedAt: now } });
                base.created++;
            }
            continue;
        }

        const endpoint = site.kind === 'pg' ? PG_ENDPOINT : ADS_ENDPOINT;
        const landing = internalLanding(site, c, orders[i], p.documentId, now);
        const columns: Record<string, unknown> = submittedColumns(c, landing, now, decidedBy);
        if (site.kind === 'pg') {
            // לאוסף של רכישות קבוצתיות אין את העמודות האלה
            delete columns.decided_by;
            delete columns.company_name;
            columns.submitted_by_id = '';
            columns.submitted_by_email = '';
            columns.submitted_by_name = '';
            columns.rejection_reason = '';
        }
        if (existing) {
            await strapiPut(`${endpoint}/${encodeURIComponent(existing.id)}`, { data: columns });
            base.updated++;
        } else {
            await strapiPost(endpoint, { data: { ...columns, submitted_at: now } });
            base.created++;
        }
    }

    // מוצר שירד מהרשימה - הפרסומת שלו יורדת מהאתר
    for (const row of state.ours) {
        if (keep.has(row.product)) continue;
        await strapiDelete(`${endpointOf(site)}/${encodeURIComponent(row.id)}`);
        base.removed++;
    }

    return base;
}

/**
 * מסנכרן את המוצרים האחרונים מהחנות לכל האתרים שבהגדרה.
 * כשל באתר אחד מדווח ולא עוצר את השאר.
 */
export async function syncShopAds(opts: { decidedBy: string; config?: ShopAdsConfig }): Promise<SyncResult> {
    const cfg = opts.config ?? await readShopAdsConfig();
    const wanted = preferredSlots(cfg);
    const products = await fetchNewestShopProducts(wanted.length);
    const sites = SHOP_AD_SITES.filter(s => cfg.sites.includes(s.id));

    // האוסף המשותף נקרא פעם אחת לכל האתרים שיושבים בו
    const needsShared = sites.some(s => s.kind === 'submitted');
    const allAdRows = needsShared ? await leanRows(ADS_ENDPOINT, 'landing') : [];

    const results: SiteSyncResult[] = [];
    // בזה אחר זה: כולם כותבים לאותו Strapi, ומקביליות כאן סיכנה timeout
    for (const site of sites) {
        try {
            results.push(await syncSite(site, products, wanted, opts.decidedBy, allAdRows));
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[shopAds] sync to ${site.id} failed:`, msg);
            results.push({ site: site.id, label: site.label, ok: false, created: 0, updated: 0, removed: 0, slots: [], error: msg });
        }
    }

    const syncedAt = new Date().toISOString();
    if (results.some(r => r.ok)) {
        await writeShopAdsConfig({ ...cfg, syncedAt }).catch(() => { /* הסנכרון עצמו הצליח */ });
    }
    invalidate('ads:');
    return { products, wanted, results, syncedAt };
}

/** מוריד את כל פרסומות המוצרים מהאתרים שבהגדרה (בלי לגעת בשאר) */
export async function removeShopAds(config?: ShopAdsConfig): Promise<SiteSyncResult[]> {
    const cfg = config ?? await readShopAdsConfig();
    const sites = SHOP_AD_SITES.filter(s => cfg.sites.includes(s.id));
    const needsShared = sites.some(s => s.kind === 'submitted');
    const allAdRows = needsShared ? await leanRows(ADS_ENDPOINT, 'landing') : [];

    const out: SiteSyncResult[] = [];
    for (const site of sites) {
        const r: SiteSyncResult = { site: site.id, label: site.label, ok: true, created: 0, updated: 0, removed: 0, slots: [] };
        try {
            const state = await readSite(site, allAdRows);
            for (const row of state.ours) {
                await strapiDelete(`${endpointOf(site)}/${encodeURIComponent(row.id)}`);
                r.removed++;
            }
        } catch (e) {
            r.ok = false;
            r.error = e instanceof Error ? e.message : String(e);
            console.warn(`[shopAds] remove from ${site.id} failed:`, r.error);
        }
        out.push(r);
    }
    invalidate('ads:');
    return out;
}

/** מה מוצב כרגע בכל אתר - למסך הניהול */
export async function getShopAdsPlacement(config?: ShopAdsConfig): Promise<Array<{ site: string; label: string; ads: PlacedShopAd[]; error?: string }>> {
    const cfg = config ?? await readShopAdsConfig();
    const sites = SHOP_AD_SITES.filter(s => cfg.sites.includes(s.id));
    const needsShared = sites.some(s => s.kind === 'submitted');
    let allAdRows: Row[] = [];
    try {
        allAdRows = needsShared ? await leanRows(ADS_ENDPOINT, 'landing') : [];
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return sites.map(s => ({ site: s.id, label: s.label, ads: [], error: msg }));
    }
    const out: Array<{ site: string; label: string; ads: PlacedShopAd[]; error?: string }> = [];
    for (const site of sites) {
        try {
            const state = await readSite(site, allAdRows);
            out.push({
                site: site.id,
                label: site.label,
                ads: state.ours
                    .map(r => ({ id: r.id, product: r.product, slot: (r.order ?? 0) + 1 }))
                    .sort((a, b) => a.slot - b.slot),
            });
        } catch (e) {
            out.push({ site: site.id, label: site.label, ads: [], error: e instanceof Error ? e.message : String(e) });
        }
    }
    return out;
}

// ============================================================
// ההגדרות
// ============================================================

async function findConfigRow(): Promise<Row | null> {
    try {
        const res = await strapiGet<{ data: Row[] }>(ITEMS_ENDPOINT, {
            'filters[category][$eq]': CONFIG_CATEGORY,
            'pagination[pageSize]':   '1',
        });
        return Array.isArray(res?.data) && res.data[0] ? res.data[0] : null;
    } catch {
        return null;
    }
}

export async function readShopAdsConfig(): Promise<ShopAdsConfig> {
    const row = await findConfigRow();
    return normalizeShopAdsConfig(extraOf(row ?? {}));
}

export async function writeShopAdsConfig(cfg: ShopAdsConfig): Promise<ShopAdsConfig> {
    const clean = normalizeShopAdsConfig(cfg);
    const row = await findConfigRow();
    const data = {
        category:     CONFIG_CATEGORY,
        label:        'הגדרות פרסומות חנות החירות',
        description:  'רשומה פנימית - לא מוצגת באתר',
        status1:      CONFIG_STATUS,
        extra_fields: clean as unknown as Record<string, unknown>,
    };
    if (row?.documentId) {
        await strapiPut(`${ITEMS_ENDPOINT}/${encodeURIComponent(String(row.documentId))}`, { data });
    } else {
        await strapiPost(ITEMS_ENDPOINT, { data: { ...data, publishedAt: new Date().toISOString() } });
    }
    invalidate('items:');
    return clean;
}

/**
 * Lazy cron: מסנכרן אם הסנכרון פעיל והסנכרון האחרון ישן מ-maxAgeMs.
 * מוחזר null כשלא היה צורך לרוץ.
 */
export async function syncShopAdsIfStale(decidedBy: string, maxAgeMs = 6 * 60 * 60 * 1000): Promise<SyncResult | null> {
    const cfg = await readShopAdsConfig();
    if (!cfg.enabled) return null;
    const last = cfg.syncedAt ? Date.parse(cfg.syncedAt) : 0;
    if (Number.isFinite(last) && Date.now() - last < maxAgeMs) return null;
    return syncShopAds({ decidedBy, config: cfg });
}
