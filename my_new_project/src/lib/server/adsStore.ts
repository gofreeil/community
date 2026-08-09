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
import { AD_SLOT_COUNT } from '../adSlots.js';

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

    /**
     * מספר המקום בטור הפרסומות, 0-based (0 = מקום 1). המספר קבוע לפרסומת:
     * הוא לא זז כשמאשרים פרסומות אחרות, ונשמר לה גם דרך השהיה ופקיעה.
     * undefined = פרסומת ותיקה שטרם הוקצה לה מספר (מקבלת אחד בפעולת
     * הניהול/האישור הבאה, לפי מקומה הנוכחי על האתר).
     */
    order?: number;
    /** מושהית: יורדת מהאתר אבל שומרת את הימים שנותרו לה */
    paused?: boolean;
    /** כמה ימים נותרו לה ברגע ההשהיה - מהם היא ממשיכה כשמפעילים מחדש */
    pausedDaysLeft?: number;

    // ----- מפרסם חוזר: גרסה מעודכנת שמחליפה את הפרסומת הקיימת שלו -----
    /** הפרסומת הקודמת של אותו מפרסם שהגרסה הזו באה להחליף (נשמר ב-landing._replacesAdId) */
    replacesAdId?: string;
    /** כותרת אותה גרסה קודמת - כדי שהמנהל יראה מה בדיוק מוחלף */
    replacesTitle?: string;
    /** הסטטוס של הגרסה הקודמת בזמן השליחה. רק 'approved' באמת יורדת מהאתר באישור */
    replacesStatus?: AdStatus;
    /** מי החליפה אותה. פרסומת מסומנת כך היא היסטוריה - לא באה בחשבון להחלפה נוספת */
    supersededBy?: string;

    // ----- שדות רגעיים: מה קרה בפעולה הנוכחית, לא נשמרים ב-Strapi -----
    /** submitAd: בקשות ממתינות קודמות של אותו מפרסם שהוסרו כרגע מתור האישורים */
    retiredPendingIds?: string[];
    /** approveAd: כותרת הפרסומת שירדה מהאתר כי הגרסה הזו נכנסה במקומה */
    replacedNowTitle?: string;
    /** approveAd: המזהה שלה - כדי שגם ההתראה עליה תרד מתיבת המנהלים */
    replacedNowId?: string;
    /** approveAd: כל מי שירדה עכשיו (מפרסם שנתקע עם יותר מאחת באוויר) */
    replacedNowIds?: string[];

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
    /**
     * פרסומת *נוספת* שנקנתה בכוונה (המפרסם נכנס לסטודיו דרך המחירון ולא
     * דרך "עריכת הפרסומת"). לא מתקשרת לקודמת ולא מורידה אותה באישור.
     */
    standalone?: boolean;
    /** תמונה ייעודית לגרסת הנייד; ריק = הנייד מציג את התמונה הראשית */
    mobileImage: string;
    /** מיקום+זום של תמונת הנייד */
    mobileImageFit: AdImageFit;
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
              _standalone?: unknown;
              mobileImage?: unknown;
              mobileImageFit?: unknown;
              adStyle?: unknown;
              _order?: unknown;
              _paused?: unknown;
              _pausedDaysLeft?: unknown;
              _replacesAdId?: unknown;
              _replacesTitle?: unknown;
              _supersededBy?: unknown;
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
        replacesAdId: typeof s.landing?._replacesAdId === 'string' ? s.landing._replacesAdId : undefined,
        replacesTitle: typeof s.landing?._replacesTitle === 'string' ? s.landing._replacesTitle : undefined,
        supersededBy: typeof s.landing?._supersededBy === 'string' ? s.landing._supersededBy : undefined,
        title: s.title ?? '',
        subtitle: s.subtitle ?? '',
        hoverText: s.hover_text ?? '',
        cta: s.cta ?? '',
        gradient: s.gradient ?? '',
        logo: s.logo ?? '',
        mainImage: s.main_image ?? '',
        mainImageFit: parseAdImageFit(s.landing?.mainImageFit),
        standalone: s.landing?._standalone === true,
        mobileImage: typeof s.landing?.mobileImage === 'string' ? s.landing.mobileImage : '',
        mobileImageFit: parseAdImageFit(s.landing?.mobileImageFit),
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
// מפרסם חוזר: זיהוי גרסה מעודכנת של פרסומת קיימת
// ------------------------------------------------------------
// מפרסם ששב לשפר את הפרסומת שלו שולח רשומה חדשה לגמרי - אין בבילדר
// "עריכה" של רשומה קיימת. בלי הקישור שכאן המנהל היה מקבל התראה שנייה
// שנראית כמו בקשה חדשה, ואישור שלה היה מוסיף פרסומת שנייה ליד הישנה
// במקום להחליף אותה.
// ============================================================

/** טלפון ישראלי מנורמל להשוואה: ספרות בלבד, 972 → 0 */
function normPhone(raw: string | undefined | null): string {
    const digits = (raw ?? '').replace(/\D/g, '').replace(/^972/, '0');
    return digits.length >= 9 ? digits : '';
}

type AdvertiserIdentity = Pick<SubmittedAd, 'submittedBy'> & { landing?: { email?: string; phone?: string } };

/**
 * מפתחות הזהות של מפרסם. יותר ממפתח אחד בכוונה: אפשר לשלוח פרסומת גם
 * בלי להתחבר, ואז אין submittedBy כלל והזיהוי היחיד הוא פרטי הקשר שבדף
 * הנחיתה. שתי פרסומות הן של אותו מפרסם אם הן חולקות ולו מפתח אחד.
 */
function identityKeys(ad: AdvertiserIdentity): string[] {
    const keys: string[] = [];
    if (ad.submittedBy?.id) keys.push(`id:${ad.submittedBy.id}`);
    const email = (ad.submittedBy?.email || ad.landing?.email || '').trim().toLowerCase();
    if (email) keys.push(`email:${email}`);
    const phone = normPhone(ad.landing?.phone);
    if (phone) keys.push(`phone:${phone}`);
    return keys;
}

function sameAdvertiser(a: AdvertiserIdentity, b: AdvertiserIdentity): boolean {
    const keysB = new Set(identityKeys(b));
    return identityKeys(a).some(k => keysB.has(k));
}

const byNewest = (a: SubmittedAd, b: SubmittedAd) =>
    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();

/**
 * מה כבר יש למפרסם הזה במערכת:
 *  target       - הפרסומת שהשליחה החדשה היא גרסה מעודכנת שלה. סדר העדיפות
 *                 מאושרת → ממתינה → נדחתה: המאושרת היא זו שנמצאת בפועל על
 *                 האתר וצריכה לרדת כשהחדשה תאושר.
 *  stalePending - כל הבקשות הממתינות שלו. השליחה החדשה מייתרת את כולן,
 *                 והן יורדות מהתור כדי שהמנהל יראה בקשה אחת לכל מפרסם.
 *
 * גם נדחתה נחשבת: "נדחה, תיקן ושלח שוב" הוא המסלול הנפוץ ביותר של מפרסם
 * חוזר, ובלעדיו ההתראה הייתה מנוסחת כבקשה חדשה לגמרי. מנדחתה אין מה
 * להוריד מהאתר - הקישור שם נועד לניסוח ולהקשר בלבד.
 * שגיאה כאן לעולם לא מפילה שליחה - מפרסם חוזר שלא זוהה מתנהג כמפרסם חדש.
 */
async function findPredecessors(
    identity: AdvertiserIdentity,
): Promise<{ target: SubmittedAd | null; stalePending: SubmittedAd[] }> {
    let candidates: SubmittedAd[];
    try {
        const [approved, pending, rejected] = await Promise.all([
            listByStatus('approved'),
            listByStatus('pending'),
            listByStatus('rejected'),
        ]);
        candidates = [...approved, ...pending, ...rejected];
    } catch (e) {
        console.warn('[adsStore] findPredecessors failed:', e instanceof Error ? e.message : e);
        return { target: null, stalePending: [] };
    }
    const mine = candidates.filter(a => !a.supersededBy && sameAdvertiser(a, identity));
    const live = mine.filter(a => a.status === 'approved').sort(byNewest);
    const stalePending = mine.filter(a => a.status === 'pending').sort(byNewest);
    const past = mine.filter(a => a.status === 'rejected').sort(byNewest);
    return { target: live[0] ?? stalePending[0] ?? past[0] ?? null, stalePending };
}

/**
 * מוציא גרסה ישנה מהמחזור אחרי שגרסה מעודכנת נכנסה במקומה.
 * הסטטוס 'rejected' הוא הארכיון היחיד שיש בסכמה - הפרסומת יורדת מהאתר
 * ומהתור, אבל נשארת בטאב "נדחו" עם הסיבה, כך שאפשר להחזיר אותה אם
 * ההחלפה הייתה בטעות. שום דבר לא נמחק.
 */
async function supersedeAd(old: SubmittedAd, newAdId: string, decidedBy: string, reason: string): Promise<void> {
    await strapiPut(`${ENDPOINT}/${old.id}`, {
        data: {
            ad_status:        'rejected',
            decided_at:       new Date().toISOString(),
            decided_by:       decidedBy,
            rejection_reason: reason,
            landing: {
                ...(old.landing as unknown as Record<string, unknown>),
                _supersededBy: newAdId,
            },
        },
    });
    invalidate('ads:');
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

/**
 * מצב הפרסומת האחרונה של משתמש - לכרטיס "הנכסים שלי" באזור האישי.
 * בלי זה האזור האישי הכיר רק את הטיוטה שב-localStorage, ולכן קרא
 * "פרסומת בעריכה · מחק טיוטה" גם למי שהפרסומת שלו כבר מזמן על האתר.
 * מאושרת קודמת לממתינה קודמת לנדחתה - זה מה שמעניין את המפרסם לראות.
 */
export async function getMyLatestAdStatus(
    identity: { id?: string; email?: string },
): Promise<{ status: AdStatus; title: string; id: string } | null> {
    if (!identity.id && !identity.email) return null;
    try {
        const all = await Promise.all([
            listByStatus('approved'), listByStatus('pending'), listByStatus('rejected'),
        ]);
        const mine = all.flat().filter(a => !a.supersededBy && sameAdvertiser(a, {
            submittedBy: { id: identity.id, email: identity.email },
        }));
        const pick = (s: AdStatus) => mine.filter(a => a.status === s).sort(byNewest)[0];
        const ad = pick('approved') ?? pick('pending') ?? pick('rejected');
        return ad ? { status: ad.status, title: ad.title, id: ad.id } : null;
    } catch (e) {
        console.warn('[adsStore] getMyLatestAdStatus failed:', e instanceof Error ? e.message : e);
        return null;
    }
}

export async function getAd(id: string): Promise<SubmittedAd | null> {
    const s = await findByDocumentId(id);
    return s ? fromStrapi(s) : null;
}

function toAdStatus(raw: unknown): AdStatus | null {
    return raw === 'pending' || raw === 'approved' || raw === 'rejected' ? raw : null;
}

/** בירור סטטוס של פרסומת אחת. null = לא הצלחנו לברר (תקלה) - שונה מ-'missing' */
async function fetchAdStatusOne(id: string): Promise<AdStatus | 'missing' | null> {
    try {
        const res = await strapiGet<{ data: { ad_status?: string } | null }>(
            `${ENDPOINT}/${id}`,
            { 'fields[0]': 'ad_status' },
        );
        if (!res?.data) return 'missing';
        return toAdStatus(res.data.ad_status);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return null;
        const msg = e instanceof Error ? e.message : String(e);
        return msg.includes('404') ? 'missing' : null;
    }
}

/**
 * הסטטוס הנוכחי של פרסומות לפי מזהה - בשליפת ad_status בלבד. הרשומה המלאה
 * נושאת תמונות base64 של ~700KB, ואי אפשר למשוך אותה בכל טעינת עמוד רק כדי
 * לדעת אם הבקשה עדיין ממתינה להחלטה.
 *
 * 'missing' = הרשומה כבר לא קיימת (נמחקה). מזהה שלא הצלחנו לברר עליו כלום
 * פשוט לא נכנס למפה - כדי שהקורא לא יסיק ממנו בטעות שהבקשה טופלה.
 */
export async function getAdStatuses(ids: string[]): Promise<Map<string, AdStatus | 'missing'>> {
    const out = new Map<string, AdStatus | 'missing'>();
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return out;

    const params: Record<string, string> = {
        'fields[0]':         'ad_status',
        'pagination[limit]': String(unique.length),
    };
    unique.forEach((id, i) => { params[`filters[documentId][$in][${i}]`] = id; });
    try {
        const res = await strapiGet<{ data: Array<{ documentId?: string; ad_status?: string }> }>(ENDPOINT, params);
        for (const row of res?.data ?? []) {
            const st = toAdStatus(row?.ad_status);
            if (row?.documentId && st) out.set(row.documentId, st);
        }
    } catch (e) {
        console.warn('[adsStore] getAdStatuses failed:', e instanceof Error ? e.message : e);
    }
    // מה שלא חזר בשליפה הקבוצתית - בדיקה פרטנית, כי "לא חזר" יכול להיות גם
    // רשומה שנמחקה וגם תקלה בשליפה, ורק 404 ודאי מצדיק לסמן בקשה כטופלה.
    await Promise.all(unique.filter(id => !out.has(id)).map(async (id) => {
        const st = await fetchAdStatusOne(id);
        if (st) out.set(id, st);
    }));
    return out;
}

export async function submitAd(payload: Omit<SubmittedAd, 'id' | 'status' | 'submittedAt'>): Promise<SubmittedAd> {
    const now = new Date().toISOString();
    // מפרסם חוזר: מחפשים לפני היצירה, כדי שהרשומה החדשה עצמה לא תופיע ברשימה.
    // פרסומת נוספת שנקנתה בכוונה (הגעה דרך המחירון) לא מחפשת קודמת בכלל -
    // היא לא באה במקום שום דבר, וזיהוי "מפרסם חוזר" לפי זהות היה הורג את
    // הפרסומת שהוא כבר משלם עליה.
    const { target: predecessor, stalePending } = payload.standalone
        ? { target: null, stalePending: [] as SubmittedAd[] }
        : await findPredecessors(payload);
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
            // _replacesAdId מקשר לגרסה הקודמת של אותו מפרסם: ההתראה למנהל
            // מדברת על עדכון, והאישור מחליף את הישנה במקום להוסיף לידה.
            landing:             {
                ...payload.landing,
                mainImageFit: parseAdImageFit(payload.mainImageFit),
                // תמונת הנייד נוסעת גם היא בתוך landing — אין לה עמודה בסכמה
                mobileImage: payload.mobileImage ?? '',
                mobileImageFit: parseAdImageFit(payload.mobileImageFit),
                // נשמר עם המודעה: גם באישור, שבא אחר-כך, אסור להוריד את הקיימת
                ...(payload.standalone ? { _standalone: true } : {}),
                // העיצוב שהמפרסם קבע בבילדר — בלעדיו המודעה מתפרסמת עם
                // ברירות המחדל של האתר ולא עם מה שהוא ראה על המסך
                adStyle: parseAdStyle(payload.adStyle),
                _site: SITE_ID,
                ...(predecessor ? { _replacesAdId: predecessor.id, _replacesTitle: predecessor.title } : {}),
            },
            submitted_by_id:     payload.submittedBy?.id ?? null,
            submitted_by_email:  payload.submittedBy?.email ?? null,
            submitted_by_name:   payload.submittedBy?.name ?? null,
            submitted_at:        now,
            // התקופה שהמפרסם קנה (חודש / חצי שנה). בלי זה approveAd נפל
            // תמיד ל-30 יום, ומי ששילם על חצי שנה קיבל חודש.
            duration_days:       payload.durationDays ?? null,
        },
    });
    // בלי זה הבקשה החדשה לא נראית במסך הניהול עד שה-cache פג, וגם שליחה
    // נוספת בתוך אותו חלון לא הייתה מזהה אותה כקודמת שלה
    invalidate('ads:');
    const ad = fromStrapi(res.data);
    // לא נשענים על מה ש-Strapi מחזיר בתשובת ה-POST: אם עמודת ה-json לא
    // הוחזרה, ההתראה למנהל הייתה מנוסחת בטעות כבקשה חדשה במקום כעדכון
    if (predecessor) {
        ad.replacesAdId   = predecessor.id;
        ad.replacesTitle  = predecessor.title;
        ad.replacesStatus = predecessor.status;
    }
    // כמו replacesAdId: לא נשענים על מה שחזר ב-POST, כדי שההתראה למנהל
    // תדע בוודאות שמדובר במשבצת נוספת ולא בעדכון
    if (payload.standalone) ad.standalone = true;

    // בקשות קודמות שעדיין ממתינות לאישור לא צריכות להישאר בתור: המנהל אמור
    // לראות בקשה אחת לכל מפרסם - האחרונה - ולא שתי בקשות שנראות כפולות.
    // מאושרת קודמת נשארת חיה עד שהחדשה תאושר, אחרת האתר היה נשאר בלי פרסומת.
    const retired: string[] = [];
    for (const stale of stalePending) {
        try {
            await supersedeAd(stale, ad.id, 'system', 'הוחלפה בגרסה מעודכנת שהמפרסם שלח');
            retired.push(stale.id);
        } catch (e) {
            console.warn('[adsStore] retire pending predecessor failed:', e instanceof Error ? e.message : e);
        }
    }
    if (retired.length > 0) ad.retiredPendingIds = retired;
    return ad;
}

/**
 * כל הפרסומות המאושרות שחיות כרגע על האתר לאותו מפרסם - חוץ מזו
 * שמאשרים עכשיו. מפרסם מקבל משבצת אחת; שתי מודעות שלו זו לצד זו הן
 * תמיד תקלה ולא בחירה - מי שבאמת רוצה שתיים מאשר עם keepPrevious.
 * שגיאה כאן לא מפילה את האישור: במקרה הגרוע הישנות יישארו וירדו ידנית.
 */
async function findLiveAdsOfAdvertiser(current: SubmittedAd): Promise<SubmittedAd[]> {
    try {
        const approved = await listByStatus('approved');
        return approved.filter(a => a.id !== current.id && !a.supersededBy && sameAdvertiser(a, current));
    } catch (e) {
        console.warn('[adsStore] findLiveAdsOfAdvertiser failed:', e instanceof Error ? e.message : e);
        return [];
    }
}

export interface ApproveOptions {
    /** אשר כפרסומת נוספת ואל תוריד את הקודמת - למפרסם שבאמת רוצה שתיים במקביל */
    keepPrevious?: boolean;
}

export async function approveAd(
    id: string,
    decidedBy: string,
    durationDays?: number,
    opts: ApproveOptions = {},
): Promise<SubmittedAd | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const current = fromStrapi(existing);

    // פרסומת נוספת שנקנתה בכוונה מתנהגת בדיוק כמו keepPrevious: היא לא
    // באה במקום כלום, והמפרסם משלם על שתי המשבצות.
    const keepPrevious = opts.keepPrevious || current.standalone === true;

    // גרסה מעודכנת של מפרסם קיים: נכנסת *במקום* הישנה - אותו מקום בטור
    // ואותו תאריך סיום - ומיד אחרי האישור הישנה יורדת מהאתר. בלי זה
    // האישור היה מוסיף פרסומת שנייה לאותו מפרסם, ליד הישנה.
    const predecessor = current.replacesAdId && !keepPrevious
        ? await getAd(current.replacesAdId).catch(() => null)
        : null;
    // כל מה שחי כרגע על האתר לאותו מפרסם: הגרסה שנרשמה בשליחה (אם היא
    // עדיין באוויר) וגם כל השאר. _replacesAdId מצביע על מה שהיה חי *בזמן
    // השליחה* בלבד - וזה בדיוק מה ששבר: כששתי גרסאות היו באוויר, האישור
    // הוריד את הישנה, השאיר את השנייה ודחף אותה למטה. מפרסם מקבל משבצת
    // אחת, ולכן ברירת המחדל היא שהחדשה מכסה את *כולן*.
    const liveBefore = keepPrevious ? [] : await findLiveAdsOfAdvertiser(current);
    const replacingAll = predecessor && predecessor.status === 'approved' && !predecessor.supersededBy
        && !liveBefore.some(a => a.id === predecessor.id)
        ? [predecessor, ...liveBefore]
        : liveBefore;
    // הכי חדשה מביניהן היא זו שהחדשה יורשת ממנה את המשבצת בטור
    const replacing = [...replacingAll].sort(byNewest)[0] ?? null;

    const now = new Date();
    // התקופה שהמפרסם כבר שילם עליה ממשיכה כרגיל: אותו תאריך פקיעה, לא
    // ספירה חדשה. שדרוג הפרסומת לא מאריך ולא מקצר את הזמן שנותר לה.
    // מבין כמה גרסאות שיורדות - הרחוקה ביותר, שלא לגזול זמן ששולם עליו.
    const inheritedExpiry = replacingAll
        .filter(a => !a.paused && a.expiresAt && new Date(a.expiresAt).getTime() > now.getTime())
        .map(a => a.expiresAt as string)
        .sort()
        .pop() ?? null;
    const days = durationDays ?? existing.duration_days
        ?? (inheritedExpiry ? (replacing?.durationDays ?? DEFAULT_DURATION_DAYS) : DEFAULT_DURATION_DAYS);
    const expires = inheritedExpiry ?? new Date(now.getTime() + days * DAY_MS).toISOString();

    // ----- מספר המקום בטור (1..12) -----
    // ברירת המחדל: פרסומת חדשה תופסת את המספר הפנוי הנמוך ביותר ואף אחת
    // לא זזה ממקומה. גרסה מחליפה יורשת את המספר של הישנה; פרסומת שהורדה
    // ואושרה מחדש חוזרת למקומה הקודם אם הוא עדיין פנוי.
    let slot: number | undefined;
    try {
        const approvedNow = (await listByStatus('approved')).filter(a => a.id !== id);
        const slots = await ensureSlotsPersisted(approvedNow);
        const taken = new Set(slots.values());
        const inherited = replacing ? slots.get(replacing.id) : undefined;
        if (inherited !== undefined) {
            slot = inherited;
        } else if (typeof current.order === 'number' && current.order >= 0 && !taken.has(current.order)) {
            slot = current.order;
        } else {
            slot = 0;
            while (taken.has(slot)) slot++;
        }
    } catch (e) {
        // כשל בהקצאה לא מפיל אישור - הפרסומת תקבל מספר בפעולת הניהול הבאה
        console.warn('[adsStore] slot assignment failed:', e instanceof Error ? e.message : e);
        slot = typeof current.order === 'number' && current.order >= 0 ? current.order : undefined;
    }

    const data: Record<string, unknown> = {
        ad_status:        'approved',
        decided_at:       now.toISOString(),
        decided_by:       decidedBy,
        rejection_reason: null,
        duration_days:    days,
        expires_at:       expires,
        reminders_sent:   [],
    };
    if (slot !== undefined) {
        const landing: Record<string, unknown> = { ...(current.landing as unknown as Record<string, unknown>), _order: slot };
        // פרסומת שמאושרת עכשיו היא בהגדרה לא "גרסה ישנה שהוחלפה". דגל
        // _supersededBy שנשאר מגלגול קודם גרם לפרסומת חיה להיראות מוחלפת:
        // גרסה מעודכנת של המפרסם לא זיהתה אותה ולא הורידה אותה באישור.
        delete landing._supersededBy;
        data.landing = landing;
    }
    if (replacing?.companyName && !current.companyName)     data.company_name   = replacing.companyName;
    if (replacing?.paymentAmount && !current.paymentAmount) data.payment_amount = replacing.paymentAmount;

    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, { data });
    invalidate('ads:');
    const approved = fromStrapi(res.data);

    // סדר הפעולות מכוון: קודם החדשה עולה, רק אחר-כך הישנות יורדות. כשל
    // כאן משאיר אותן באוויר (מצב שהמנהל רואה ויכול לתקן) - עדיף מלהוריד
    // את הישנה ואז להיכשל בהעלאת החדשה ולהשאיר את המפרסם בלי פרסומת.
    const retiredNow: string[] = [];
    const retiredTitles: string[] = [];
    for (const old of replacingAll) {
        try {
            await supersedeAd(old, id, decidedBy, 'הוחלפה בגרסה מעודכנת שאישרת');
            retiredNow.push(old.id);
            retiredTitles.push(old.title);
        } catch (e) {
            console.warn('[adsStore] supersede on approve failed:', e instanceof Error ? e.message : e);
        }
    }
    if (retiredNow.length > 0) {
        approved.replacedNowTitle = retiredTitles.join('", "');
        approved.replacedNowId    = retiredNow[0];
        approved.replacedNowIds   = retiredNow;
    }
    return approved;
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
    const data: Record<string, unknown> = {
        ad_status:        'pending',
        decided_at:       null,
        decided_by:       null,
        rejection_reason: null,
    };
    // פרסומת שירדה כי גרסה מעודכנת נכנסה במקומה, והמנהל מחזיר אותה בכוונה:
    // מסירים את סימון ההחלפה כדי שתתנהג שוב כבקשה ממתינה רגילה
    if (existing.landing?._supersededBy != null) {
        const landing = { ...(existing.landing as unknown as Record<string, unknown>) };
        delete landing._supersededBy;
        data.landing = landing;
    }
    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, { data });
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

// ----- מקומות ממוספרים בטור הפרסומות (1..12) -----

export type MoveDirection = 'up' | 'down';

/**
 * כותב מספר מקום לפרסומת. המספר נשמר ב-landing._order, אותה עמודת json
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
 * המספר האפקטיבי של כל פרסומת ברשימה (0-based). מי שכבר נקבע לה מספר -
 * שומרת עליו (בהתנגשות, הראשונה בסדר התצוגה גוברת); מי שאין לה מקבלת את
 * המספר הפנוי הנמוך ביותר, לפי סדר התצוגה הנוכחי. כך פרסומות ותיקות בלי
 * מספר מקבלות בדיוק את מקומן של היום - ההקצאה הראשונה לא מזיזה כלום.
 */
function computeSlots(list: SubmittedAd[]): Map<string, number> {
    const bySlot = new Map<string, number>();
    const taken = new Set<number>();
    const display = [...list].sort(byDisplayOrder);
    for (const ad of display) {
        if (typeof ad.order === 'number' && ad.order >= 0 && !taken.has(ad.order)) {
            bySlot.set(ad.id, ad.order);
            taken.add(ad.order);
        }
    }
    let next = 0;
    for (const ad of display) {
        if (bySlot.has(ad.id)) continue;
        while (taken.has(next)) next++;
        bySlot.set(ad.id, next);
        taken.add(next);
    }
    return bySlot;
}

/** מספרי המקומות לתצוגה (1-based) - לדפי שרת שמציגים "מקום N מתוך 12" */
export function computeAdSlots(list: SubmittedAd[]): Map<string, number> {
    return new Map([...computeSlots(list)].map(([id, s]) => [id, s + 1]));
}

/**
 * מקבע ב-Strapi מספר מקום לכל פרסומת ברשימה שעדיין אין לה (או שהמספר
 * השמור מתנגש). כותב רק את מי שהשתנה - בהקצאה הראשונה זו כל הרשימה,
 * ומכאן והלאה כלום. רץ בפעולות ניהול בלבד, לא בנתיבי קריאה.
 */
async function ensureSlotsPersisted(list: SubmittedAd[]): Promise<Map<string, number>> {
    const slots = computeSlots(list);
    const dirty = list.filter(ad => ad.order !== slots.get(ad.id));
    if (dirty.length > 0) {
        await Promise.all(dirty.map(ad => writeOrder(ad, slots.get(ad.id)!)));
        invalidate('ads:');
    }
    return slots;
}

/**
 * מזיז פרסומת מאושרת מקום אחד למעלה/למטה: מחליפה מספרים עם השכנה
 * בסדר התצוגה. שאר הפרסומות לא זזות.
 * מחזיר null אם הפרסומת לא נמצאה או שהיא כבר בקצה הרשימה.
 */
export async function moveApprovedAd(
    id: string,
    direction: MoveDirection,
): Promise<{ title: string; position: number; total: number } | null> {
    const list = await listApproved();
    const slots = await ensureSlotsPersisted(list);
    const sorted = [...list].sort((a, b) => (slots.get(a.id) ?? 0) - (slots.get(b.id) ?? 0));
    const from = sorted.findIndex(a => a.id === id);
    if (from === -1) return null;
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= sorted.length) return null;

    const moved = sorted[from];
    const other = sorted[to];
    const movedSlot = slots.get(moved.id)!;
    const otherSlot = slots.get(other.id)!;
    await Promise.all([writeOrder(moved, otherSlot), writeOrder(other, movedSlot)]);
    invalidate('ads:');
    return { title: moved.title, position: otherSlot + 1, total: AD_SLOT_COUNT };
}

/**
 * מציב פרסומת מאושרת במקום מספרי מסוים בטור (1..12). מקום תפוס - השתיים
 * מתחלפות זו בזו; שאר הפרסומות לא זזות. המספר נשאר קבוע לפרסומת גם דרך
 * השהיה ופקיעה - כשהיא חוזרת לאוויר היא חוזרת לאותו מקום.
 */
export async function setAdSlot(
    id: string,
    requested: number,
): Promise<{ title: string; slot: number; swappedTitle?: string; swappedSlot?: number } | null> {
    const n = Math.round(Number(requested));
    if (!Number.isFinite(n)) return null;
    const target = Math.min(AD_SLOT_COUNT, Math.max(1, n)) - 1;

    const list = await listApproved();
    const ad = list.find(a => a.id === id);
    if (!ad) return null;
    const slots = await ensureSlotsPersisted(list);
    const cur = slots.get(id) ?? 0;
    if (cur === target) return { title: ad.title, slot: target + 1 };

    const occupant = list.find(a => a.id !== id && slots.get(a.id) === target) ?? null;
    await Promise.all([
        writeOrder(ad, target),
        ...(occupant ? [writeOrder(occupant, cur)] : []),
    ]);
    invalidate('ads:');
    return {
        title: ad.title,
        slot: target + 1,
        ...(occupant ? { swappedTitle: occupant.title, swappedSlot: cur + 1 } : {}),
    };
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
    /** מספר המקום בטור הפרסומות (1..12) - מוזן ב-listSchedules */
    slot?: number;
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
    // המספר האפקטיבי מחושב בזיכרון בלבד - נתיב קריאה לא כותב ל-Strapi
    const slots = computeSlots(approved);
    return approved
        .map(ad => {
            const s = computeSchedule(ad);
            if (s) s.slot = (slots.get(ad.id) ?? 0) + 1;
            return s;
        })
        .filter((s): s is AdSchedule => s !== null)
        .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
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

/**
 * רושם ב-Strapi שהשלב הזה כבר נשלח. מחזיר האם הרישום הצליח.
 *
 * ה-invalidate כאן הוא לב העניין: רשימת המאושרות יושבת ב-cache, וה-PUT
 * לבדו לא נגע בו. לכן כל טעינה נוספת של דף הניהול בתוך חלון ה-cache קראה
 * רשימה ישנה שבה reminders_sent עדיין ריק - ושלחה למפרסם את אותה תזכורת
 * שוב ושוב. כך נערמו ארבע הודעות "הפרסומת שלך תפוג בעוד 30 ימים".
 */
async function markReminderSent(ad: SubmittedAd, stage: ReminderStage): Promise<boolean> {
    const next = Array.from(new Set([...(ad.remindersSent ?? []), stage]));
    try {
        await strapiPut(`${ENDPOINT}/${ad.id}`, { data: { reminders_sent: next } });
        ad.remindersSent = next;   // הרשומה שבזיכרון, למקרה שהיא עוד בשימוש בסבב הזה
        invalidate('ads:');
        return true;
    } catch (e) {
        console.warn('[adsStore] markReminderSent failed:', e);
        return false;
    }
}

// שתי טעינות של דף הניהול באותו רגע היו מריצות את הלולאה במקביל ושולחות
// כפול, כי שתיהן קראו את הרשימה לפני שהראשונה הספיקה לסמן
let remindersInFlight: Promise<{ sent: number; checked: number }> | null = null;

// אידימפוטנטי: רץ ככל שצריך, שולח תזכורת רק אחת לכל שלב.
// קוראים לזה בכל טעינה של דף ה-admin (lazy cron).
export async function processExpiryReminders(): Promise<{ sent: number; checked: number }> {
    if (remindersInFlight) return remindersInFlight;
    remindersInFlight = runExpiryReminders().finally(() => { remindersInFlight = null; });
    return remindersInFlight;
}

async function runExpiryReminders(): Promise<{ sent: number; checked: number }> {
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
        // מסמנים לפני ששולחים: אם הסימון נכשל עדיף לוותר על התזכורת הזו
        // מאשר לשלוח אותה שוב בכל טעינת עמוד
        if (!(await markReminderSent(ad, rule.stage))) continue;
        await sendReminderMessage(ad, rule);
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
    // גרסאות שהוחלפו הן אותה פרסומת בגלגול קודם - ספירה שלהן הייתה מציגה
    // "3 פרסומות" למפרסם שפשוט שיפר פעמיים את הפרסומת האחת שלו
    const all = [...pending, ...approved, ...rejectedAll].filter(a => !a.supersededBy);
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
