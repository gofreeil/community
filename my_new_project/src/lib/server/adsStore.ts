// ============================================================
// adsStore.ts — מאגר פרסומות שנשלחו לאישור / אושרו
// אחסון מבוסס Strapi (Content Type: submitted-ad)
// API ציבורי זהה לגרסה הקודמת (JSON-on-disk) כדי שלא ישבר קוד קורא.
// ============================================================

import { strapiGet, strapiPost, strapiPut, strapiDelete, StrapiContentTypeError } from './strapiClient.js';

const ENDPOINT = '/api/submitted-ads';

export type AdStatus = 'pending' | 'approved' | 'rejected';

export interface SubmittedAd {
    id: string;
    status: AdStatus;
    submittedBy?: { id?: string; email?: string; name?: string };
    submittedAt: string;
    decidedAt?: string;
    decidedBy?: string;
    rejectionReason?: string;

    // Card fields
    title: string;
    subtitle: string;
    hoverText: string;
    cta: string;
    gradient: string;
    logo: string;
    mainImage: string;

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
    landing: SubmittedAd['landing'] | null;
    submitted_by_id: string | null;
    submitted_by_email: string | null;
    submitted_by_name: string | null;
    submitted_at: string | null;
    decided_at: string | null;
    decided_by: string | null;
    rejection_reason: string | null;
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
        title: s.title ?? '',
        subtitle: s.subtitle ?? '',
        hoverText: s.hover_text ?? '',
        cta: s.cta ?? '',
        gradient: s.gradient ?? '',
        logo: s.logo ?? '',
        mainImage: s.main_image ?? '',
        landing: s.landing ?? emptyLanding(),
    };
}

async function listByStatus(status: AdStatus): Promise<SubmittedAd[]> {
    try {
        const res = await strapiGet<{ data: StrapiAd[] }>(ENDPOINT, {
            'filters[ad_status][$eq]': status,
            'sort':                    'submitted_at:desc',
            'pagination[limit]':       '1000',
        });
        return (res.data ?? []).map(fromStrapi);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) {
            console.warn('[adsStore] submitted-ad content type לא רשום ב-Strapi — מחזיר []');
            return [];
        }
        throw e;
    }
}

async function findByDocumentId(id: string): Promise<StrapiAd | null> {
    try {
        const res = await strapiGet<{ data: StrapiAd | null }>(`${ENDPOINT}/${id}`);
        return res.data ?? null;
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return null;
        // 404 — לא קיים
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

export async function listApproved(): Promise<SubmittedAd[]> {
    return listByStatus('approved');
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
            landing:             payload.landing,
            submitted_by_id:     payload.submittedBy?.id ?? null,
            submitted_by_email:  payload.submittedBy?.email ?? null,
            submitted_by_name:   payload.submittedBy?.name ?? null,
            submitted_at:        now,
        },
    });
    return fromStrapi(res.data);
}

export async function approveAd(id: string, decidedBy: string): Promise<SubmittedAd | null> {
    const existing = await findByDocumentId(id);
    if (!existing) return null;
    const res = await strapiPut<{ data: StrapiAd }>(`${ENDPOINT}/${id}`, {
        data: {
            ad_status:   'approved',
            decided_at:  new Date().toISOString(),
            decided_by:  decidedBy,
            rejection_reason: null,
        },
    });
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
    return fromStrapi(res.data);
}

export async function removeAd(id: string): Promise<boolean> {
    const existing = await findByDocumentId(id);
    if (!existing) return false;
    try {
        await strapiDelete(`${ENDPOINT}/${id}`);
        return true;
    } catch {
        return false;
    }
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
