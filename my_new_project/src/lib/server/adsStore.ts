// ============================================================
// adsStore.ts — מאגר פרסומות שנשלחו לאישור / אושרו
// אחסון פשוט מבוסס JSON על דיסק (MVP — לפני מעבר ל-Strapi)
// ============================================================

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PENDING_FILE = path.join(DATA_DIR, 'pending-ads.json');
const APPROVED_FILE = path.join(DATA_DIR, 'approved-ads.json');

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

async function ensureFile(file: string) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(file);
    } catch {
        await fs.writeFile(file, '[]', 'utf-8');
    }
}

async function readList(file: string): Promise<SubmittedAd[]> {
    await ensureFile(file);
    try {
        const raw = await fs.readFile(file, 'utf-8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

async function writeList(file: string, list: SubmittedAd[]): Promise<void> {
    await ensureFile(file);
    await fs.writeFile(file, JSON.stringify(list, null, 2), 'utf-8');
}

function genId(): string {
    return 'ad_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export async function listPending(): Promise<SubmittedAd[]> {
    return readList(PENDING_FILE);
}

export async function listApproved(): Promise<SubmittedAd[]> {
    return readList(APPROVED_FILE);
}

export async function getAd(id: string): Promise<SubmittedAd | null> {
    const [pending, approved] = await Promise.all([listPending(), listApproved()]);
    return [...pending, ...approved].find(a => a.id === id) ?? null;
}

export async function submitAd(payload: Omit<SubmittedAd, 'id' | 'status' | 'submittedAt'>): Promise<SubmittedAd> {
    const pending = await listPending();
    const ad: SubmittedAd = {
        ...payload,
        id: genId(),
        status: 'pending',
        submittedAt: new Date().toISOString(),
    };
    pending.push(ad);
    await writeList(PENDING_FILE, pending);
    return ad;
}

export async function approveAd(id: string, decidedBy: string): Promise<SubmittedAd | null> {
    const pending = await listPending();
    const idx = pending.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const [ad] = pending.splice(idx, 1);
    const approvedAd: SubmittedAd = {
        ...ad,
        status: 'approved',
        decidedAt: new Date().toISOString(),
        decidedBy,
    };
    const approved = await listApproved();
    approved.push(approvedAd);
    await Promise.all([writeList(PENDING_FILE, pending), writeList(APPROVED_FILE, approved)]);
    return approvedAd;
}

export async function rejectAd(id: string, decidedBy: string, reason?: string): Promise<SubmittedAd | null> {
    const pending = await listPending();
    const idx = pending.findIndex(a => a.id === id);
    if (idx === -1) return null;
    pending[idx] = {
        ...pending[idx],
        status: 'rejected',
        decidedAt: new Date().toISOString(),
        decidedBy,
        rejectionReason: reason,
    };
    // משאיר בקובץ pending עם status='rejected' כדי שהמשתמש יראה מה קרה.
    // אם תרצה — אפשר להעביר לקובץ נפרד rejected-ads.json.
    await writeList(PENDING_FILE, pending);
    return pending[idx];
}

// ----- ניהול נוסף לסופר־אדמין -----

// מחזיר פרסומת שנדחתה לסטטוס pending (ביטול דחייה)
export async function unrejectAd(id: string): Promise<SubmittedAd | null> {
    const pending = await listPending();
    const idx = pending.findIndex(a => a.id === id);
    if (idx === -1) return null;
    pending[idx] = {
        ...pending[idx],
        status: 'pending',
        decidedAt: undefined,
        decidedBy: undefined,
        rejectionReason: undefined,
    };
    await writeList(PENDING_FILE, pending);
    return pending[idx];
}

// מחזיר פרסומת שאושרה לסטטוס pending (ביטול פרסום)
export async function unapproveAd(id: string): Promise<SubmittedAd | null> {
    const approved = await listApproved();
    const idx = approved.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const [ad] = approved.splice(idx, 1);
    const reverted: SubmittedAd = {
        ...ad,
        status: 'pending',
        decidedAt: undefined,
        decidedBy: undefined,
        rejectionReason: undefined,
    };
    const pending = await listPending();
    pending.push(reverted);
    await Promise.all([writeList(APPROVED_FILE, approved), writeList(PENDING_FILE, pending)]);
    return reverted;
}

// מסיר פרסומת לחלוטין מכל המאגרים
export async function removeAd(id: string): Promise<boolean> {
    const [pending, approved] = await Promise.all([listPending(), listApproved()]);
    const pIdx = pending.findIndex(a => a.id === id);
    const aIdx = approved.findIndex(a => a.id === id);
    if (pIdx === -1 && aIdx === -1) return false;
    if (pIdx !== -1) pending.splice(pIdx, 1);
    if (aIdx !== -1) approved.splice(aIdx, 1);
    await Promise.all([writeList(PENDING_FILE, pending), writeList(APPROVED_FILE, approved)]);
    return true;
}

type EditableFields = Partial<Pick<SubmittedAd, 'title' | 'subtitle' | 'cta' | 'hoverText'>>;

// עריכה מהירה של שדות בסיסיים בכרטיס (מאפשרת לסופר־אדמין לתקן טעויות לפני אישור)
export async function updateAdFields(id: string, fields: EditableFields): Promise<SubmittedAd | null> {
    const clean: EditableFields = {};
    if (typeof fields.title === 'string')     clean.title     = fields.title;
    if (typeof fields.subtitle === 'string')  clean.subtitle  = fields.subtitle;
    if (typeof fields.cta === 'string')       clean.cta       = fields.cta;
    if (typeof fields.hoverText === 'string') clean.hoverText = fields.hoverText;
    if (Object.keys(clean).length === 0) return null;

    const pending = await listPending();
    const pIdx = pending.findIndex(a => a.id === id);
    if (pIdx !== -1) {
        pending[pIdx] = { ...pending[pIdx], ...clean };
        await writeList(PENDING_FILE, pending);
        return pending[pIdx];
    }
    const approved = await listApproved();
    const aIdx = approved.findIndex(a => a.id === id);
    if (aIdx !== -1) {
        approved[aIdx] = { ...approved[aIdx], ...clean };
        await writeList(APPROVED_FILE, approved);
        return approved[aIdx];
    }
    return null;
}

export interface AdsStats {
    pending: number;
    rejected: number;
    approved: number;
    approvedThisWeek: number;
    submittedThisWeek: number;
    total: number;
}

export async function getAdsStats(): Promise<AdsStats> {
    const [pending, approved] = await Promise.all([listPending(), listApproved()]);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const submittedThisWeek = [...pending, ...approved]
        .filter(a => new Date(a.submittedAt).getTime() >= weekAgo).length;
    const approvedThisWeek = approved
        .filter(a => a.decidedAt && new Date(a.decidedAt).getTime() >= weekAgo).length;
    return {
        pending: pending.filter(a => a.status === 'pending').length,
        rejected: pending.filter(a => a.status === 'rejected').length,
        approved: approved.length,
        approvedThisWeek,
        submittedThisWeek,
        total: pending.length + approved.length,
    };
}

// ספירת ממתינות בלבד — לבאדג' מהיר בפרופיל
export async function countPending(): Promise<number> {
    const pending = await listPending();
    return pending.filter(a => a.status === 'pending').length;
}
