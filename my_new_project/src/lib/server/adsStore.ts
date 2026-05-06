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
