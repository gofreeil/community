// ============================================================
// db.ts — שכבת הנתונים
//
// פריטים + קופת קהילה  → Strapi 5 (async)
// משתמשים              → SQLite מקומי (sync) — תואם auth.js
// ============================================================

import Database from 'better-sqlite3';
import { join } from 'path';
import { strapiGet, strapiPost } from './strapiClient.js';

// ============================================================
// ---- SQLite Singleton (למשתמשים בלבד) ----
// ============================================================

const globalDb = globalThis as typeof globalThis & { __communityDb?: Database.Database };

function getDb(): Database.Database {
    if (globalDb.__communityDb) return globalDb.__communityDb;

    const dbPath = process.env.NODE_ENV === 'production'
        ? '/tmp/community.db'
        : join(process.cwd(), 'community.db');

    const db = new Database(dbPath);
    globalDb.__communityDb = db;
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id           TEXT PRIMARY KEY,
        name         TEXT,
        email        TEXT UNIQUE,
        phone        TEXT DEFAULT '',
        neighborhood TEXT DEFAULT '',
        city         TEXT DEFAULT '',
        avatar_url   TEXT,
        provider     TEXT,
        created_at   TEXT DEFAULT (datetime('now'))
      )
    `);

    return db;
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
    phone?: string;
    neighborhood?: string;
    city?: string;
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
        user_id:      null,
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

export async function getItemsByUserId(_userId: string): Promise<DbItem[]> {
    // TODO: לאחר העברת משתמשים ל-Strapi, להחזיר פריטים לפי user relation
    return [];
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
// ---- Users (SQLite — נשאר מקומי לצורך auth.js) ----
// ============================================================

export function upsertUser(data: UpsertUserData): void {
    getDb().prepare(`
        INSERT INTO users (id, name, email, avatar_url, provider)
        VALUES (@id, @name, @email, @avatar_url, @provider)
        ON CONFLICT(id) DO UPDATE SET
            name       = COALESCE(excluded.name, users.name),
            email      = COALESCE(excluded.email, users.email),
            avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
            provider   = COALESCE(excluded.provider, users.provider)
    `).run({
        id:         data.id,
        name:       data.name       ?? null,
        email:      data.email      ?? null,
        avatar_url: data.avatar_url ?? null,
        provider:   data.provider   ?? null,
    });
}

export function getUserById(id: string): DbUser | undefined {
    return getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(id) as DbUser | undefined;
}

export function getUserByEmail(email: string): DbUser | undefined {
    return getDb().prepare(`SELECT * FROM users WHERE email = ?`).get(email) as DbUser | undefined;
}

export function updateUserProfile(id: string, data: UpdateProfileData): DbUser | undefined {
    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    if (data.name         !== undefined) { fields.push('name = @name');                 values.name         = data.name; }
    if (data.phone        !== undefined) { fields.push('phone = @phone');               values.phone        = data.phone; }
    if (data.neighborhood !== undefined) { fields.push('neighborhood = @neighborhood'); values.neighborhood = data.neighborhood; }
    if (data.city         !== undefined) { fields.push('city = @city');                 values.city         = data.city; }

    if (fields.length === 0) return getUserById(id);

    return getDb().prepare(
        `UPDATE users SET ${fields.join(', ')} WHERE id = @id RETURNING *`
    ).get(values) as DbUser | undefined;
}
