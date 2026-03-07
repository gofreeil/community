import Database from 'better-sqlite3';
import { join } from 'path';

// ---- Singleton (מונע multiple connections ב-HMR) ----
const globalDb = globalThis as typeof globalThis & { __communityDb?: Database.Database };
// ב-Vercel (production) — הכתיבה מותרת רק ב-/tmp; בפיתוח — בתיקיית הפרויקט
const dbPath = process.env.NODE_ENV === 'production'
    ? '/tmp/community.db'
    : join(process.cwd(), 'community.db');
const db: Database.Database = globalDb.__communityDb ?? new Database(dbPath);
globalDb.__communityDb = db;

db.pragma('journal_mode = WAL');

// ---- Schema: טבלת items ----
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id          TEXT PRIMARY KEY,
    category    TEXT NOT NULL,
    label       TEXT NOT NULL,
    description TEXT,
    contact     TEXT,
    phone       TEXT,
    address     TEXT,
    icon        TEXT DEFAULT '📌',
    color       TEXT DEFAULT 'purple',
    neighborhood TEXT DEFAULT '',
    city        TEXT DEFAULT '',
    extra_fields TEXT DEFAULT '{}',
    status      TEXT DEFAULT 'active',
    user_id     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// Migration: הוסף user_id אם לא קיים (safe for existing DBs)
try {
    db.exec(`ALTER TABLE items ADD COLUMN user_id TEXT`);
} catch {
    // העמודה כבר קיימת — בסדר
}

// ---- Schema: טבלת users ----
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT,
    email       TEXT UNIQUE,
    phone       TEXT DEFAULT '',
    neighborhood TEXT DEFAULT '',
    city        TEXT DEFAULT '',
    avatar_url  TEXT,
    provider    TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

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
    extra_fields: string;   // JSON string
    status: string;
    user_id: string | null;
    created_at: string;
}

export interface CreateItemData {
    id: string;
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
// ---- Items ----
// ============================================================

const insertItemStmt = db.prepare(`
    INSERT INTO items (id, category, label, description, contact, phone, address, icon, color, neighborhood, city, extra_fields, user_id)
    VALUES (@id, @category, @label, @description, @contact, @phone, @address, @icon, @color, @neighborhood, @city, @extra_fields, @user_id)
`);

const getAllItemsStmt      = db.prepare(`SELECT * FROM items WHERE status = 'active' ORDER BY created_at DESC`);
const getItemByIdStmt     = db.prepare(`SELECT * FROM items WHERE id = ? AND status = 'active'`);
const getByUserIdStmt     = db.prepare(`SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC`);
const getByCategoryStmt   = db.prepare(`SELECT * FROM items WHERE category = ? AND status = 'active' ORDER BY created_at DESC`);

export function createItem(data: CreateItemData): DbItem {
    const row = {
        id:           data.id,
        category:     data.category,
        label:        data.label,
        description:  data.description  ?? '',
        contact:      data.contact      ?? '',
        phone:        data.phone        ?? '',
        address:      data.address      ?? '',
        icon:         data.icon         ?? '📌',
        color:        data.color        ?? 'purple',
        neighborhood: data.neighborhood ?? '',
        city:         data.city         ?? '',
        extra_fields: JSON.stringify(data.extra_fields ?? {}),
        user_id:      data.user_id      ?? null,
    };
    insertItemStmt.run(row);
    return getItemByIdStmt.get(row.id) as DbItem;
}

export function getAllItems(): DbItem[] {
    return getAllItemsStmt.all() as DbItem[];
}

export function getDbItemById(id: string): DbItem | undefined {
    return getItemByIdStmt.get(id) as DbItem | undefined;
}

export function getItemsByUserId(userId: string): DbItem[] {
    return getByUserIdStmt.all(userId) as DbItem[];
}

export function getItemsByCategory(category: string): DbItem[] {
    return getByCategoryStmt.all(category) as DbItem[];
}

// ============================================================
// ---- Users ----
// ============================================================

const upsertUserStmt = db.prepare(`
    INSERT INTO users (id, name, email, avatar_url, provider)
    VALUES (@id, @name, @email, @avatar_url, @provider)
    ON CONFLICT(id) DO UPDATE SET
        name      = COALESCE(excluded.name, users.name),
        email     = COALESCE(excluded.email, users.email),
        avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
        provider  = COALESCE(excluded.provider, users.provider)
`);

const getUserByIdStmt    = db.prepare(`SELECT * FROM users WHERE id = ?`);
const getUserByEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);

export function upsertUser(data: UpsertUserData): void {
    upsertUserStmt.run({
        id:         data.id,
        name:       data.name       ?? null,
        email:      data.email      ?? null,
        avatar_url: data.avatar_url ?? null,
        provider:   data.provider   ?? null,
    });
}

export function getUserById(id: string): DbUser | undefined {
    return getUserByIdStmt.get(id) as DbUser | undefined;
}

export function getUserByEmail(email: string): DbUser | undefined {
    return getUserByEmailStmt.get(email) as DbUser | undefined;
}

export function updateUserProfile(id: string, data: UpdateProfileData): DbUser | undefined {
    const fields: string[] = [];
    const values: Record<string, unknown> = { id };

    if (data.name         !== undefined) { fields.push('name = @name');                 values.name         = data.name; }
    if (data.phone        !== undefined) { fields.push('phone = @phone');               values.phone        = data.phone; }
    if (data.neighborhood !== undefined) { fields.push('neighborhood = @neighborhood'); values.neighborhood = data.neighborhood; }
    if (data.city         !== undefined) { fields.push('city = @city');                 values.city         = data.city; }

    if (fields.length === 0) return getUserById(id);

    return db.prepare(
        `UPDATE users SET ${fields.join(', ')} WHERE id = @id RETURNING *`
    ).get(values) as DbUser | undefined;
}

export { db };
