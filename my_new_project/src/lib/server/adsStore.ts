// ============================================================
// adsStore.ts - מאגר פרסומות שנשלחו לאישור / אושרו
// אחסון מבוסס Strapi (Content Type: submitted-ad)
// API ציבורי זהה לגרסה הקודמת (JSON-on-disk) כדי שלא ישבר קוד קורא.
// ============================================================

import { strapiGet, strapiGetAll, strapiPost, strapiPut, strapiDelete, StrapiContentTypeError } from './strapiClient.js';
import { createItem } from './db.js';
import { cached, invalidate } from './cache.js';
import { parseAdImageFit, type AdImageFit } from '../adImageFit.js';
import { parseAdStyle, type AdStyle } from '../adStyle.js';

// פרסומות מאושרות נטענות בכל ניווט (ב-+layout.server) — cache קצר חוסך round-trip
const TTL_ADS = 120_000;
// ממתינות/נדחו משתנות תוך כדי עבודה של המנהל, ולכן TTL קצר. המטרה העיקרית
// כאן היא dedup: טעינה אחת של /admin/ads-review קוראת לאותן רשימות חמש פעמים
// (רשימות, סטטיסטיקות, תזמון, מפרסמים, תזכורות).
const TTL_REVIEW = 15_000;

const ENDPOINT = '/api/submitted-ads';

// האוסף הזה משותף עם אתרים אחרים ברשת (index) ואין בו עמודת אתר. הסימון
// נשמר ב-landing._site, עמודת json שכבר נושאת מפתחות פנימיים, ולכן לא נדרש
// שינוי סכמה. פרסומת בלי _site היא פרסומת ותיקה של האתר הזה - ממשיכה
// להיות מוצגת כאן, ובאתרים האחרים היא מסוננת החוצה.
const SITE_ID = 'community';

/** האם הפרסומת שייכת לאתר הזה (כולל ותיקות בלי סימון). */
function belongsToThisSite(s: { landing?: unknown }): boolean {
    const site = (s?.landing as { _site?: unknown } | null | undefined)?._site;
    return site === undefined || site === null || site === SITE_ID;
}

const DEFAULT_DURATION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AdStatus = 'pending' | 'approved' | 'rejected';
export type ReminderStage = '30d' | '7d' | '1d';

export interface SubmittedAd {
    id: string;
    status: AdStatus;
    submittedBy?: { id?: string; email?: string; name?: string };
    submittedAt: string;
    decidedAt?: string;
    decidedBy?: string;
    rejectionReason?: string;

    // תזמון, תשלום, תזכורות
    expiresAt?: string;
    durationDays?: number;
    companyName?: string;
    paymentAmount?: number;
    remindersSent?: ReminderStage[];

    /** מיקום התצוגה באתר (0 = ראשונה). undefined = לא נקבע מיקום ידני */
    order?: number;
    /** מושהית: יורדת מהאתר אבל שומרת את הימים שנותרו לה */
    paused?: boolean;
    /** כמה ימים נותרו לה ברגע ההשהיה - מהם היא ממשיכה כשמפעילים מחדש */
    pausedDaysLeft?: number;

    // Card fields
    title: string;
    subtitle: string;
    hoverText: string;
    cta: string;
    gradient: string;
    logo: string;
    mainImage: string;
    /** מיקום+זום של התמונה הראשית במשבצת (מהבילדר) */
    mainImageFit: AdImageFit;
    /** העיצוב שנקבע בבילדר (לוגו, רצועה, כותרת). null = מודעה ותיקה */
    adStyle: AdStyle | null;

    // Landing
    landing: {
        headline: string;
        pitch: string;
        extended: string;
        image: string;
        advantages: [string, string, string];
        uniqueness: string;
        phone: string;
        whatsapp: string;
        website: string;
        email: string;
        address: string;
        hours: string;
        products: Array<{ id: number; name: string; price: string; image: string; description: string }>;
    };
}

// ----- מיפוי בין סכמת Strapi לטיפוס שלנו -----

interface StrapiAdAttrs {
    ad_status: AdStatus;
    title: string;
    subtitle: string | null;
    hover_text: string | null;
    cta: string | null;
    gradient: string | null;
    logo: string | null;
    main_image: string | null;
    // ה-fit ומיקום התצוגה חיים בתוך ה-JSON של landing — לסכמת submitted-ad
    // ב-Strapi אין עמודות ייעודיות, ושדה json מקבל מפתחות נוספים בלי שינוי סכמה.
    landing:
        | (SubmittedAd['landing'] & {
              mainImageFit?: unknown;
              adStyle?: unknown;
              _order?: unknown;
              _paused?: unknown;
              _pausedDaysLeft?: unknown;
          })
        | null;
    submitted_by_id: string | null;
    submitted_by_email: string | null;
    submitted_by_name: string | null;
    submitted_at: string | null;
    decided_at: string | null;
    decided_by: string | null;
    rejection_reason: string | null;
    expires_at: string | null;
    duration_days: number | null;
    company_name: string | null;
    payment_amount: number | string | null;
    reminders_sent: ReminderStage[] | null;
}

interface StrapiAd extends StrapiAdAttrs {
    id: number;
    documentId: string;
    createdAt?: string;
    updatedAt?: string;
}

function emptyLanding(): SubmittedAd['landing'] {
    return {
        headline: '', pitch: '', extended: '', image: '',
        advantages: ['', '', ''],
        uniqueness: '', phone: '', whatsapp: '', website: '', email: '',
        address: '', hours: '', products: [],
    };
}

function fromStrapi(s: StrapiAd): SubmittedAd {
    return {
        id: s.documentId,
        status: s.ad_status,
        submittedBy: (s.submitted_by_id || s.submitted_by_email || s.submitted_by_name)
            ? {
                id: s.submitted_by_id ?? undefined,
                email: s.submitted_by_email ?? undefined,
                name: s.submitted_by_name ?? undefined,
              }
            : undefined,
        submittedAt: s.submitted_at ?? s.createdAt ?? new Date().toISOString(),
        decidedAt: s.decided_at ?? undefined,
        decidedBy: s.decided_by ?? undefined,
        rejectionReason: s.rejection_reason ?? undefined,
        expiresAt: s.expires_at ?? undefined,
        durationDays: s.duration_days ?? undefined,
        companyName: s.company_name ?? undefined,
        paymentAmount: s.payment_amount != null ? Number(s.payment_amount) : undefined,
        remindersSent: Array.isArray(s.reminders_sent) ? s.reminders_sent : [],
        order: typeof s.landing?._order === 'number' ? s.landing._order : undefined,
        paused: s.landing?._paused === true,
        pausedDaysLeft: typeof s.landing?._pausedDaysLeft === 'number' ? s.landing._pausedDaysLeft : undefined,
        title: s.title ?? '',
        subtitle: s.subtitle ?? '',
        hoverText: s.hover_text ?? '',
        cta: s.cta ?? '',
        gradient: s.gradient ?? '',
        logo: s.logo ?? '',
        mainImage: s.main_image ?? '',
        mainImageFit: parseAdImageFit(s.landing?.mainImageFit),
        // null במודעות שנשלחו לפני שהעיצוב נשמר — הצרכן נופל ל-legacyAdStyle
        adStyle: parseAdStyle(s.landing?.adStyle),
        landing: s.landing ?? emptyLanding(),
    };
}

async function fetchByStatus(status: AdStatus): Promise<SubmittedAd[]> {
    try {
        const data = await strapiGetAll<StrapiAd>(ENDPOINT, {
            'filters[ad_status][$eq]': status,
            'sort':                    'submitted_at:desc',
        });
        // סינון לפי אתר: האוסף משותף, ובלי זה פרסומות של אתרים אחרים ברשת
        // היו נכנסות לכאן. בקוד ולא ב-Strapi כי אין עמודה ייעודית.
        return data.filter(belongsToThisSite).map(fromStrapi);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) {
            console.warn('[adsStore] submitted-ad content type לא רשום ב-Strapi - מחזיר []');
            return [];
        }
        throw e;
    }
}

/**
 * רשימה לפי סטטוס - דרך ה-cache, עם dedup לקריאות מקבילות.
 *
 * חובה: התמונות שמורות כ-base64 בתוך הרשומה, ולכן כל פרסומת שוקלת ~700KB
 * וכל שליפה של הרשימה היא מטען כבד. טעינה אחת של /admin/ads-review קוראת
 * לרשימת המאושרות חמש פעמים במקביל; בלי ה-dedup הזה השרת נחנק, כל בקשה
 * חצתה את ה-timeout של 6 שניות והדף נפתח ריק ("הבאקאנד לא זמין") - בלי
 * הפרסומת הממתינה ובלי כפתורי אשר/דחה.
 */
function listByStatus(status: AdStatus): Promise<SubmittedAd[]> {
    return cached(
        `ads:by-status:${status}`,
        status === 'approved' ? TTL_ADS : TTL_REVIEW,
        () => fetchByStatus(status),
    );
}

/** סדר התצוגה באתר: קודם מי שקיבל מיקום ידני, אחריהם החדשות ביותר. */
function byDisplayOrder(a: SubmittedAd, b: SubmittedAd): number {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
}

async function findByDocumentId(id: string): Promise<StrapiAd | null> {
    try {
        const res = await strapiGet<{ data: StrapiAd | null }>(`${ENDPOINT}/${id}`);
        return res.data ?? null;
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return null;
        // 404 - לא קיים
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('404')) return null;
        throw e;
    }
}

// ============================================================
// API ציבורי
// ============================================================

export async function listPending(): Promise<SubmittedAd[]> {
    // "pending" ו-"rejected" שמורים יחד כדי לשמר את התנהגות הגרסה הקודמת
    // (שם listPending החזיר גם נדחות, וה-UI מסנן לפי status)
    const [pending, rejected] = await Promise.all([
        listByStatus('pending'),
        listByStatus('rejected'),
    ]);
    return [...pending, ...rejected];
}

/** כל המאושרות - כולל מושהות ופגות תוקף. לתצוגת הניהול בלבד. */
export async function listApproved(): Promise<SubmittedAd[]> {
    // עותק לפני מיון - המערך עצמו יושב ב-cache ומשותף לכל הקוראים
    return [...await listByStatus('approved')].sort(byDisplayOrder);
}

/** האם הפרסומת אמורה להיות מוצגת לגולש עכשיו */
function isLiveNow(ad: SubmittedAd, now = Date.now()): boolean {
    if (ad.paused) return false;
    if (!ad.expiresAt) return true;
    const t = new Date(ad.expiresAt).getTime();
    return !Number.isFinite(t) || t > now;
}

/**
 * מה שהאתר עצמו מציג: מאושרות שאינן מושהות ושתוקפן לא פג.
 * בלי הסינון הזה תאריך הפקיעה היה מספר בלבד - פרסומת "פגה" המשיכה
 * להופיע בטור, וקיצוב תקופה במסך הניהול לא היה משפיע על מה שרואים.
 */
export async function listApprovedLive(): Promise<SubmittedAd[]> {
    const now = Date.now();
    return (await listApproved()).filter(a => isLiveNow(a, now));
}

export async function getAd(id: string): Promise<SubmittedAd | null> {
    const s = await findByDocumentId(id);
    return s ? fromStrapi(s) : null;
}

export async function submitAd(payload: Omit<SubmittedAd, 'id' | 'status' | 'submittedAt'>): Promise<SubmittedAd> {
    const now = new Date().toISOString();
    const res = await strapiPost<{ data: StrapiAd }>(ENDPOINT, {
        data: {
            ad_status:           'pending',
            title:               payload.title,
            subtitle:            payload.subtitle,
            hover_text:          payload.hoverText,
            cta:                 payload.cta,
            gradient:            payload.gradient,
            logo:                payload.logo,
            main_image:          payload.mainImage,
            // ה-fit והעיצוב נארזים בתוך landing (json) — אין עמודה ייעודית בסכמה,
            // ומפתח לא-מוכר ברמת ה-attributes היה מפיל את הבקשה ב-400.
            // _site משייך את הפרסומת לאתר הזה באוסף המשותף
            landing:             {
                ...payload.landing,
                mainImageFit: parseAdImageFit(payload.mainImageFit),
                // העיצוב שהמפרסם קבע בבילדר — בלעדיו המודעה מתפרסמת עם
                // ברירות המחדל של האתר ולא עם מה שהוא ראה על המסך
                adStyle: parseAdStyle(payload.adStyle),
                _site: SITE_ID,
            },
            submitted_by_id:     payload.submittedBy?.id ?? null,
            submitted_by_email:  payload.submittedBy?.email ?? null,
            submitted_by_name:   payload.submittedBy?.name ?? null,
            submitted_at:        now,
        },
    });
    return fromStrapi(res.data);
}

export async function approveAd(id: string, decidedBy: string, durationDays?: number): Promise<SubmittedAd | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const days = durationDays ?? existing.duration_days ?? DEFAULT_DURATION_DAYS;
    const now = new Date();
    const expires = new Date(now.getTime() + days * DAY_MS);
    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, {
        data: {
            ad_status:        'approved',
            decided_at:       now.toISOString(),
            decided_by:       decidedBy,
            rejection_reason: null,
            duration_days:    days,
            expires_at:       expires.toISOString(),
            reminders_sent:   [],
        },
    });
    invalidate('ads:');
    return fromStrapi(res.data);
}

export async function rejectAd(id: string, decidedBy: string, reason?: string): Promise<SubmittedAd | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, {
        data: {
            ad_status:        'rejected',
            decided_at:       new Date().toISOString(),
            decided_by:       decidedBy,
            rejection_reason: reason ?? null,
        },
    });
    invalidate('ads:');
    return fromStrapi(res.data);
}

export async function unrejectAd(id: string): Promise<SubmittedAd | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, {
        data: {
            ad_status:        'pending',
            decided_at:       null,
            decided_by:       null,
            rejection_reason: null,
        },
    });
    invalidate('ads:');
    return fromStrapi(res.data);
}

export async function unapproveAd(id: string): Promise<SubmittedAd | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, {
        data: {
            ad_status:        'pending',
            decided_at:       null,
            decided_by:       null,
            rejection_reason: null,
        },
    });
    invalidate('ads:');
    return fromStrapi(res.data);
}

export async function removeAd(id: string): Promise<boolean> {
    const existing = await findByDocumentId(id);
    if (!existing) return false;
    try {
        await strapiDelete(`${ENDPOINT}/${id}`);
        invalidate('ads:');
        return true;
    } catch {
        return false;
    }
}

// ----- מיקום התצוגה באתר -----

export type MoveDirection = 'up' | 'down';

/**
 * כותב מיקום תצוגה לפרסומת. הסדר נשמר ב-landing._order, אותה עמודת json
 * שכבר נושאת מפתחות פנימיים (_site, mainImageFit) - כדי לא לשנות סכמה
 * ב-Strapi. שולחים את כל אובייקט ה-landing כי Strapi מחליף עמודת json
 * במלואה, ומפתח חסר היה נמחק.
 */
async function writeOrder(ad: SubmittedAd, order: number): Promise<void> {
    await strapiPut(`${ENDPOINT}/${ad.id}`, {
        data: { landing: { ...(ad.landing as unknown as Record<string, unknown>), _order: order } },
    });
}

/**
 * מזיז פרסומת מאושרת מקום אחד למעלה/למטה בסדר התצוגה באתר.
 * מחזיר null אם הפרסומת לא נמצאה או שהיא כבר בקצה הרשימה.
 */
export async function moveApprovedAd(
    id: string,
    direction: MoveDirection,
): Promise<{ title: string; position: number; total: number } | null> {
    const list = await listApproved();
    const from = list.findIndex(a => a.id === id);
    if (from === -1) return null;
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= list.length) return null;

    const reordered = [...list];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];

    // כותבים רק את מי שהמיקום שלו באמת השתנה: בפעם הראשונה זו כל הרשימה
    // (לאף פרסומת אין עדיין _order), ומכאן והלאה שתי הפרסומות שהוחלפו בלבד.
    await Promise.all(
        reordered
            .map((ad, i) => ({ ad, i }))
            .filter(({ ad, i }) => ad.order !== i)
            .map(({ ad, i }) => writeOrder(ad, i)),
    );
    invalidate('ads:');
    return { title: reordered[to].title, position: to + 1, total: reordered.length };
}

// ----- ניהול תקופת הפרסום: קציבה, השהיה, המשך -----

const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 730;

/** מנרמל קלט ימים מהטופס לטווח שפוי */
export function normalizeDurationDays(raw: unknown): number {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return DEFAULT_DURATION_DAYS;
    return Math.min(MAX_DURATION_DAYS, Math.max(MIN_DURATION_DAYS, n));
}

/**
 * קוצב לפרסומת תקופה חדשה. התקופה נספרת מיום הפרסום, ולכן קציבה ל-7 ימים
 * לפרסומת שכבר רצה 10 ימים מורידה אותה מהאתר מיד - וזו בדיוק המשמעות של
 * "לקצוב". התזכורות מתאפסות כדי שהמפרסם יקבל התראה לפי התאריך החדש.
 */
export async function setAdDuration(id: string, days: number): Promise<{ title: string; expiresAt: string; daysLeft: number } | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const from = existing.decided_at ?? existing.submitted_at ?? existing.createdAt ?? new Date().toISOString();
    const expires = new Date(new Date(from).getTime() + days * DAY_MS);
    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, {
        data: {
            duration_days:  days,
            expires_at:     expires.toISOString(),
            reminders_sent: [],
        },
    });
    invalidate('ads:');
    const ad = fromStrapi(res.data);
    return {
        title: ad.title,
        expiresAt: expires.toISOString(),
        daysLeft: Math.ceil((expires.getTime() - Date.now()) / DAY_MS),
    };
}

/**
 * השהיה: הפרסומת יורדת מהאתר אבל שומרת את הימים שנותרו לה, וממשיכה
 * מאותה נקודה כשמפעילים אותה מחדש. בשונה מ"הורד מהאתר" - המפרסם לא
 * מפסיד ימים ששילם עליהם, והפרסומת לא חוזרת לתור האישורים.
 */
export async function pauseAd(id: string): Promise<{ title: string; daysLeft: number } | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const ad = fromStrapi(existing);
    if (ad.paused) return { title: ad.title, daysLeft: ad.pausedDaysLeft ?? 0 };
    const daysLeft = ad.expiresAt
        ? Math.max(0, Math.ceil((new Date(ad.expiresAt).getTime() - Date.now()) / DAY_MS))
        : (ad.durationDays ?? DEFAULT_DURATION_DAYS);
    await strapiPut(`${ENDPOINT}/${id}`, {
        data: {
            landing: {
                ...(ad.landing as unknown as Record<string, unknown>),
                _paused: true,
                _pausedDaysLeft: daysLeft,
            },
        },
    });
    invalidate('ads:');
    return { title: ad.title, daysLeft };
}

/** המשך אחרי השהיה: הימים שנשמרו נספרים מחדש מהיום. */
export async function resumeAd(id: string): Promise<{ title: string; expiresAt: string; daysLeft: number } | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const ad = fromStrapi(existing);
    const daysLeft = ad.pausedDaysLeft ?? ad.durationDays ?? DEFAULT_DURATION_DAYS;
    const expires = new Date(Date.now() + daysLeft * DAY_MS);
    const landing = { ...(ad.landing as unknown as Record<string, unknown>) };
    delete landing._paused;
    delete landing._pausedDaysLeft;
    await strapiPut(`${ENDPOINT}/${id}`, {
        data: {
            landing,
            expires_at:     expires.toISOString(),
            reminders_sent: [],
        },
    });
    invalidate('ads:');
    return { title: ad.title, expiresAt: expires.toISOString(), daysLeft };
}

type EditableFields = Partial<Pick<SubmittedAd, 'title' | 'subtitle' | 'cta' | 'hoverText'>>;

export async function updateAdFields(id: string, fields: EditableFields): Promise<SubmittedAd | null> {
    const data: Record<string, string> = {};
    if (typeof fields.title === 'string')     data.title      = fields.title;
    if (typeof fields.subtitle === 'string')  data.subtitle   = fields.subtitle;
    if (typeof fields.cta === 'string')       data.cta        = fields.cta;
    if (typeof fields.hoverText === 'string') data.hover_text = fields.hoverText;
    if (Object.keys(data).length === 0) return null;

    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, { data });
    invalidate('ads:');
    return fromStrapi(res.data);
}

// ----- סטטיסטיקות -----

export interface AdsStats {
    pending: number;
    rejected: number;
    approved: number;
    approvedThisWeek: number;
    submittedThisWeek: number;
    total: number;
}

export async function getAdsStats(): Promise<AdsStats> {
    const [pending, rejected, approved] = await Promise.all([
        listByStatus('pending'),
        listByStatus('rejected'),
        listByStatus('approved'),
    ]);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const submittedThisWeek = [...pending, ...rejected, ...approved]
        .filter(a => new Date(a.submittedAt).getTime() >= weekAgo).length;
    const approvedThisWeek = approved
        .filter(a => a.decidedAt && new Date(a.decidedAt).getTime() >= weekAgo).length;
    return {
        pending: pending.length,
        rejected: rejected.length,
        approved: approved.length,
        approvedThisWeek,
        submittedThisWeek,
        total: pending.length + rejected.length + approved.length,
    };
}

export async function countPending(): Promise<number> {
    const list = await listByStatus('pending');
    return list.length;
}

// ============================================================
// תזמון + תזכורות פגות תוקף
// ============================================================

export interface AdSchedule {
    id: string;
    title: string;
    advertiserName: string;
    advertiserEmail: string;
    publishedAt: string;
    expiresAt: string;
    durationDays: number;
    daysLeft: number;
    state: 'expired' | 'ending' | 'active' | 'paused';   // ending = ≤7 ימים
    paymentAmount: number;
}

export function computeSchedule(ad: SubmittedAd): AdSchedule | null {
    if (ad.status !== 'approved' || !ad.decidedAt) return null;
    const days = ad.durationDays ?? DEFAULT_DURATION_DAYS;
    const publishedAt = ad.decidedAt;
    const expiresAt = ad.expiresAt ?? new Date(new Date(publishedAt).getTime() + days * DAY_MS).toISOString();
    // מושהית: הזמן לא רץ. הימים שנותרו הם אלה שנשמרו ברגע ההשהיה.
    const daysLeft = ad.paused
        ? (ad.pausedDaysLeft ?? days)
        : Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY_MS);
    const state: AdSchedule['state'] = ad.paused ? 'paused'
        : daysLeft < 0 ? 'expired'
        : daysLeft <= 7 ? 'ending'
        : 'active';
    return {
        id: ad.id,
        title: ad.title,
        advertiserName: ad.submittedBy?.name ?? ad.companyName ?? '-',
        advertiserEmail: ad.submittedBy?.email ?? '',
        publishedAt,
        expiresAt,
        durationDays: days,
        daysLeft,
        state,
        paymentAmount: ad.paymentAmount ?? 0,
    };
}

export async function listSchedules(): Promise<AdSchedule[]> {
    const approved = await listByStatus('approved');
    return approved.map(computeSchedule).filter((s): s is AdSchedule => s !== null);
}

// ----- תזכורות אוטומטיות לאזור האישי של המפרסמים -----

interface ReminderRule {
    stage: ReminderStage;
    label: string;
    minDays: number;   // כולל
    maxDays: number;   // כולל
}

const REMINDER_RULES: ReminderRule[] = [
    { stage: '30d', label: '30 ימים',  minDays: 25, maxDays: 30 },
    { stage: '7d',  label: 'שבוע',     minDays: 5,  maxDays: 7 },
    { stage: '1d',  label: 'יום אחרון', minDays: 0,  maxDays: 1 },
];

function nextReminderForAd(ad: SubmittedAd): ReminderRule | null {
    const sched = computeSchedule(ad);
    // מושהית: הזמן עצר, ואין טעם להתריע על פקיעה שלא מתקרבת
    if (!sched || sched.state === 'expired' || sched.state === 'paused') return null;
    const sent = new Set(ad.remindersSent ?? []);
    for (const rule of REMINDER_RULES) {
        if (sent.has(rule.stage)) continue;
        if (sched.daysLeft >= rule.minDays && sched.daysLeft <= rule.maxDays) {
            return rule;
        }
    }
    return null;
}

async function sendReminderMessage(ad: SubmittedAd, rule: ReminderRule): Promise<void> {
    const userId = ad.submittedBy?.id;
    if (!userId) return;
    const sched = computeSchedule(ad);
    if (!sched) return;
    const expiryDate = new Date(sched.expiresAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const label =
        rule.stage === '30d' ? `הפרסומת שלך "${ad.title}" תפוג בעוד ${rule.label}` :
        rule.stage === '7d'  ? `נותר ${rule.label} עד שהפרסומת שלך "${ad.title}" תפוג`  :
                                `היום היום האחרון של הפרסומת שלך "${ad.title}"`;
    const description = rule.stage === '1d'
        ? `הפרסומת תוסר מהאתר בסוף היום (${expiryDate}).\n\nרוצה להאריך? הכנס לאזור האישי שלך וצור איתנו קשר.`
        : `הפרסומת תפוג בתאריך ${expiryDate}.\n\nכדי להאריך את הפרסום או לעדכן את התוכן - היכנס לאזור האישי שלך.`;
    try {
        await createItem({
            category:    'message',
            label,
            description,
            icon:        rule.stage === '1d' ? '⏰' : '📅',
            color:       rule.stage === '1d' ? 'red' : rule.stage === '7d' ? 'amber' : 'blue',
            user_id:     userId,
            extra_fields: {
                type:        'ad_expiry_reminder',
                stage:       rule.stage,
                ad_id:       ad.id,
                ad_title:    ad.title,
                expires_at:  sched.expiresAt,
                sent_at:     new Date().toISOString(),
            },
        });
    } catch (e) {
        console.warn('[adsStore] sendReminderMessage failed:', e);
    }
}

async function markReminderSent(ad: SubmittedAd, stage: ReminderStage): Promise<void> {
    const next = Array.from(new Set([...(ad.remindersSent ?? []), stage]));
    try {
        await strapiPut(`${ENDPOINT}/${ad.id}`, { data: { reminders_sent: next } });
    } catch (e) {
        console.warn('[adsStore] markReminderSent failed:', e);
    }
}

// אידימפוטנטי: רץ ככל שצריך, שולח תזכורת רק אחת לכל שלב.
// קוראים לזה בכל טעינה של דף ה-admin (lazy cron).
export async function processExpiryReminders(): Promise<{ sent: number; checked: number }> {
    let approved: SubmittedAd[];
    try {
        approved = await listByStatus('approved');
    } catch {
        return { sent: 0, checked: 0 };
    }
    let sent = 0;
    for (const ad of approved) {
        const rule = nextReminderForAd(ad);
        if (!rule) continue;
        await sendReminderMessage(ad, rule);
        await markReminderSent(ad, rule.stage);
        sent++;
    }
    return { sent, checked: approved.length };
}

// ============================================================
// סיכומי מפרסמים - קיבוץ לפי email/id
// ============================================================

export interface AdvertiserSummary {
    key: string;             // email או id (לא שני אנשים שונים)
    name: string;
    email: string;
    phone: string;
    address: string;
    companyName: string;
    totalPaid: number;
    adsCount: number;
    activeCount: number;
    firstSubmittedAt: string;
    lastSubmittedAt: string;
    isReturning: boolean;    // יותר מפרסומת אחת
}

export async function listAdvertisers(): Promise<AdvertiserSummary[]> {
    const [pending, approved, rejectedAll] = await Promise.all([
        listByStatus('pending'),
        listByStatus('approved'),
        listByStatus('rejected'),
    ]);
    const all = [...pending, ...approved, ...rejectedAll];
    const map = new Map<string, AdvertiserSummary>();
    for (const ad of all) {
        const key = ad.submittedBy?.email || ad.submittedBy?.id || ad.id;
        const existing = map.get(key);
        // "פעילה עכשיו" = באמת על האתר: לא פגה ולא מושהית
        const schedState = computeSchedule(ad)?.state;
        const isActiveNow = ad.status === 'approved' && schedState !== 'expired' && schedState !== 'paused';
        if (!existing) {
            map.set(key, {
                key,
                name: ad.submittedBy?.name ?? '',
                email: ad.submittedBy?.email ?? '',
                phone: ad.landing?.phone ?? '',
                address: ad.landing?.address ?? '',
                companyName: ad.companyName || ad.title || '',
                totalPaid: ad.paymentAmount ?? 0,
                adsCount: 1,
                activeCount: isActiveNow ? 1 : 0,
                firstSubmittedAt: ad.submittedAt,
                lastSubmittedAt: ad.submittedAt,
                isReturning: false,
            });
        } else {
            existing.adsCount++;
            existing.activeCount += isActiveNow ? 1 : 0;
            existing.totalPaid += ad.paymentAmount ?? 0;
            if (!existing.name && ad.submittedBy?.name) existing.name = ad.submittedBy.name;
            if (!existing.phone && ad.landing?.phone)   existing.phone = ad.landing.phone;
            if (!existing.address && ad.landing?.address) existing.address = ad.landing.address;
            if (!existing.companyName && (ad.companyName || ad.title)) existing.companyName = ad.companyName || ad.title;
            if (new Date(ad.submittedAt) < new Date(existing.firstSubmittedAt)) existing.firstSubmittedAt = ad.submittedAt;
            if (new Date(ad.submittedAt) > new Date(existing.lastSubmittedAt)) existing.lastSubmittedAt = ad.submittedAt;
            existing.isReturning = existing.adsCount > 1;
        }
    }
    return Array.from(map.values()).sort((a, b) => b.totalPaid - a.totalPaid);
}
