// ============================================================
// db.ts — שכבת הנתונים
//
// פריטים + קופת קהילה  → Strapi 5 (async)
// משתמשים              → Turso / libSQL (async, cloud-persistent)
// ============================================================

import { createClient, type Client } from '@libsql/client';
import { strapiGet, strapiPost } from './strapiClient.js';
import bcrypt from 'bcryptjs';

// ============================================================
// ---- libSQL Singleton ----
// ============================================================

const globalWithDb = globalThis as typeof globalThis & {
    __libsqlClient?: Client;
    __libsqlReady?: boolean;
};

function getClient(): Client {
    if (globalWithDb.__libsqlClient) return globalWithDb.__libsqlClient;
    globalWithDb.__libsqlClient = createClient({
        url:       process.env.TURSO_DATABASE_URL ?? 'file:community.db',
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return globalWithDb.__libsqlClient;
}

async function ensureSchema(): Promise<void> {
    if (globalWithDb.__libsqlReady) return;
    const db = getClient();
    await db.executeMultiple(`
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            name          TEXT,
            email         TEXT UNIQUE,
            phone         TEXT DEFAULT '',
            neighborhood  TEXT DEFAULT '',
            city          TEXT DEFAULT '',
            avatar_url    TEXT,
            provider      TEXT,
            password_hash TEXT,
            nickname      TEXT DEFAULT '',
            business      TEXT DEFAULT '',
            notifications INTEGER DEFAULT 1,
            family_status TEXT DEFAULT '',
            gender        TEXT DEFAULT '',
            birth_date    TEXT DEFAULT '',
            balance       REAL DEFAULT 0,
            created_at    TEXT DEFAULT (datetime('now'))
        );
    `);
    globalWithDb.__libsqlReady = true;
}

// ============================================================
// ---- Types ----
// ============================================================

export interface DbItem {
    id: string;
    category: string;
    label: string;
    description: string;
    contact: string;
    phone: string;
    address: string;
    icon: string;
    color: string;
    neighborhood: string;
    city: string;
    extra_fields: string;   // JSON string (תואם לשאר הקוד)
    status: string;
    user_id: string | null;
    created_at: string;
}

export interface CreateItemData {
    id?: string;            // לא בשימוש — Strapi מייצר documentId
    category: string;
    label: string;
    description?: string;
    contact?: string;
    phone?: string;
    address?: string;
    icon?: string;
    color?: string;
    neighborhood?: string;
    city?: string;
    extra_fields?: Record<string, unknown>;
    user_id?: string;
}

export interface DbUser {
    id: string;
    name: string | null;
    email: string | null;
    phone: string;
    neighborhood: string;
    city: string;
    avatar_url: string | null;
    provider: string | null;
    nickname: string;
    business: string;
    notifications: number;
    family_status: string;
    gender: string;
    birth_date: string;
    balance: number;
    created_at: string;
}

export interface UpsertUserData {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    provider?: string;
}

export interface UpdateProfileData {
    name?: string;
    email?: string;
    phone?: string;
    neighborhood?: string;
    city?: string;
    nickname?: string;
    business?: string;
    notifications?: number;
    family_status?: string;
    gender?: string;
    avatar_url?: string;
    birth_date?: string;
}

// ============================================================
// ---- Strapi internal types (Strapi 5 — attributes at top-level) ----
// ============================================================

interface StrapiItem {
    id: number;
    documentId: string;
    label: string;
    category: string;
    description: string | null;
    contact: string | null;
    phone: string | null;
    address: string | null;
    icon: string | null;
    color: string | null;
    neighborhood: string | null;
    city: string | null;
    extra_fields: Record<string, unknown> | null;
    status1: string | null;
    user_id: string | null;
    createdAt: string;
}

interface StrapiFundEntry {
    id: number;
    documentId: string;
    amount: number;
}

// ממיר StrapiItem → DbItem (תואם לכל הקוד הקיים)
function mapStrapiItem(item: StrapiItem): DbItem {
    return {
        id:           item.documentId,
        category:     item.category     ?? '',
        label:        item.label        ?? '',
        description:  item.description  ?? '',
        contact:      item.contact      ?? '',
        phone:        item.phone        ?? '',
        address:      item.address      ?? '',
        icon:         item.icon         ?? '📌',
        color:        item.color        ?? 'purple',
        neighborhood: item.neighborhood ?? '',
        city:         item.city         ?? '',
        extra_fields: item.extra_fields && typeof item.extra_fields === 'object'
            ? JSON.stringify(item.extra_fields)
            : '{}',
        status:       item.status1      ?? 'active',
        user_id:      item.user_id      ?? null,
        created_at:   item.createdAt    ?? '',
    };
}

// ============================================================
// ---- Items (Strapi) ----
// ============================================================

export async function getAllItems(): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[status1][$eq]': 'active',
        'sort':                  'createdAt:desc',
        'pagination[limit]':     '1000',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

export async function createItem(data: CreateItemData): Promise<DbItem> {
    const res = await strapiPost<{ data: StrapiItem }>('/api/items', {
        data: {
            label:        data.label,
            category:     data.category,
            description:  data.description  ?? '',
            contact:      data.contact      ?? '',
            phone:        data.phone        ?? '',
            address:      data.address      ?? '',
            icon:         data.icon         ?? '📌',
            color:        data.color        ?? 'purple',
            neighborhood: data.neighborhood ?? '',
            city:         data.city         ?? '',
            extra_fields: data.extra_fields ?? {},
            status1:      'active',
            user_id:      data.user_id ?? null,
            publishedAt:  new Date().toISOString(),   // פרסם מיד (לא draft)
        },
    });
    return mapStrapiItem(res.data);
}

export async function getDbItemById(id: string): Promise<DbItem | undefined> {
    try {
        // ב-Strapi 5 ניתן לבקש לפי documentId ישירות
        const res = await strapiGet<{ data: StrapiItem }>(`/api/items/${id}`);
        if (!res.data) return undefined;
        return mapStrapiItem(res.data);
    } catch {
        return undefined;
    }
}

export async function getItemsByCategory(category: string): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[category][$eq]':  category,
        'filters[status1][$eq]':   'active',
        'sort':                    'createdAt:desc',
        'pagination[limit]':       '1000',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

export async function getItemsByUserId(userId: string): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[user_id][$eq]': userId,
        'sort':                  'createdAt:desc',
        'pagination[limit]':     '1000',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

// ============================================================
// ---- Community Fund (Strapi) ----
// ============================================================

export async function getFundTotal(): Promise<number> {
    const res = await strapiGet<{ data: StrapiFundEntry[] }>('/api/community-funds', {
        'pagination[limit]': '1000',
    });
    return (res.data ?? []).reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
}

export async function addFundDonation(amount: number): Promise<number> {
    await strapiPost('/api/community-funds', {
        data: {
            amount,
            source:      'donation',
            publishedAt: new Date().toISOString(),
        },
    });
    return getFundTotal();
}

// נקרא מ-send-order-email: מחשב 10% ומוסיף לקופה
export async function addFundContribution(neighborhood: string, totalPayment: number): Promise<number> {
    const tithe = Math.round(totalPayment * 0.1);
    await strapiPost('/api/community-funds', {
        data: {
            amount:      tithe,
            source:      'order',
            note:        `10% מהזמנת פרסום — ${neighborhood}`,
            publishedAt: new Date().toISOString(),
        },
    });
    return getFundTotal();
}

// ============================================================
// ---- Users (Turso / libSQL — cloud-persistent) ----
// ============================================================

export async function upsertUser(data: UpsertUserData): Promise<void> {
    await ensureSchema();
    await getClient().execute({
        sql: `INSERT INTO users (id, name, email, avatar_url, provider)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                  name       = COALESCE(excluded.name, users.name),
                  email      = COALESCE(excluded.email, users.email),
                  avatar_url = CASE
                      WHEN users.avatar_url LIKE 'data:%' THEN users.avatar_url
                      ELSE COALESCE(excluded.avatar_url, users.avatar_url)
                  END,
                  provider   = COALESCE(excluded.provider, users.provider)`,
        args: [data.id, data.name ?? null, data.email ?? null, data.avatar_url ?? null, data.provider ?? null],
    });
}

export async function getUserById(id: string): Promise<DbUser | undefined> {
    await ensureSchema();
    const res = await getClient().execute({
        sql:  `SELECT * FROM users WHERE id = ?`,
        args: [id],
    });
    return res.rows[0] as unknown as DbUser | undefined;
}

export async function getUserByEmail(email: string): Promise<DbUser | undefined> {
    await ensureSchema();
    const res = await getClient().execute({
        sql:  `SELECT * FROM users WHERE email = ?`,
        args: [email],
    });
    return res.rows[0] as unknown as DbUser | undefined;
}

export async function updateUserProfile(id: string, data: UpdateProfileData): Promise<DbUser | undefined> {
    await ensureSchema();
    const fields: string[] = [];
    const args: unknown[]  = [];

    if (data.name          !== undefined) { fields.push('name = ?');          args.push(data.name); }
    if (data.email         !== undefined) { fields.push('email = ?');         args.push(data.email); }
    if (data.phone         !== undefined) { fields.push('phone = ?');         args.push(data.phone); }
    if (data.neighborhood  !== undefined) { fields.push('neighborhood = ?');  args.push(data.neighborhood); }
    if (data.city          !== undefined) { fields.push('city = ?');          args.push(data.city); }
    if (data.nickname      !== undefined) { fields.push('nickname = ?');      args.push(data.nickname); }
    if (data.business      !== undefined) { fields.push('business = ?');      args.push(data.business); }
    if (data.notifications !== undefined) { fields.push('notifications = ?'); args.push(data.notifications); }
    if (data.family_status !== undefined) { fields.push('family_status = ?'); args.push(data.family_status); }
    if (data.gender        !== undefined) { fields.push('gender = ?');        args.push(data.gender); }
    if (data.avatar_url    !== undefined) { fields.push('avatar_url = ?');    args.push(data.avatar_url); }
    if (data.birth_date    !== undefined) { fields.push('birth_date = ?');    args.push(data.birth_date); }

    if (fields.length === 0) return getUserById(id);

    args.push(id);
    const res = await getClient().execute({
        sql:  `UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
        args,
    });
    return res.rows[0] as unknown as DbUser | undefined;
}

// ============================================================
// ---- Credentials Auth (סיסמאות מוצפנות) ----
// ============================================================

export async function registerWithCredentials(
    name: string,
    email: string,
    password: string,
): Promise<DbUser> {
    const existing = await getUserByEmail(email);
    if (existing) throw new Error('Email already taken');

    const password_hash = await bcrypt.hash(password, 12);
    const id = `credentials_${email}`;

    await getClient().execute({
        sql:  `INSERT INTO users (id, name, email, provider, password_hash) VALUES (?, ?, ?, 'credentials', ?)`,
        args: [id, name, email, password_hash],
    });

    return (await getUserById(id))!;
}

export async function verifyCredentials(
    email: string,
    password: string,
): Promise<DbUser | null> {
    await ensureSchema();
    const res = await getClient().execute({
        sql:  `SELECT * FROM users WHERE email = ? AND provider = 'credentials'`,
        args: [email],
    });
    const row = res.rows[0] as unknown as (DbUser & { password_hash?: string }) | undefined;
    if (!row?.password_hash) return null;
    const valid = await bcrypt.compare(password, row.password_hash);
    return valid ? row : null;
}
