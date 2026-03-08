import Database from 'better-sqlite3';
import { join } from 'path';

// ---- Singleton lazy (לא נפתח בזמן build — רק בזמן runtime) ----
const globalDb = globalThis as typeof globalThis & { __communityDb?: Database.Database };

function getDb(): Database.Database {
    if (globalDb.__communityDb) return globalDb.__communityDb;

    const dbPath = process.env.NODE_ENV === 'production'
        ? '/tmp/community.db'
        : join(process.cwd(), 'community.db');

    const db = new Database(dbPath);
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

    // ---- Schema: טבלת community_fund ----
    db.exec(`
      CREATE TABLE IF NOT EXISTS community_fund (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        amount     REAL    NOT NULL,
        created_at TEXT    DEFAULT (datetime('now'))
      )
    `);

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

export function createItem(data: CreateItemData): DbItem {
    const db = getDb();
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
    db.prepare(`
        INSERT INTO items (id, category, label, description, contact, phone, address, icon, color, neighborhood, city, extra_fields, user_id)
        VALUES (@id, @category, @label, @description, @contact, @phone, @address, @icon, @color, @neighborhood, @city, @extra_fields, @user_id)
    `).run(row);
    return db.prepare(`SELECT * FROM items WHERE id = ? AND status = 'active'`).get(row.id) as DbItem;
}

export function getAllItems(): DbItem[] {
    return getDb().prepare(`SELECT * FROM items WHERE status = 'active' ORDER BY created_at DESC`).all() as DbItem[];
}

export function getDbItemById(id: string): DbItem | undefined {
    return getDb().prepare(`SELECT * FROM items WHERE id = ? AND status = 'active'`).get(id) as DbItem | undefined;
}

export function getItemsByUserId(userId: string): DbItem[] {
    return getDb().prepare(`SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC`).all(userId) as DbItem[];
}

export function getItemsByCategory(category: string): DbItem[] {
    return getDb().prepare(`SELECT * FROM items WHERE category = ? AND status = 'active' ORDER BY created_at DESC`).all(category) as DbItem[];
}

// ============================================================
// ---- Users ----
// ============================================================

export function upsertUser(data: UpsertUserData): void {
    getDb().prepare(`
        INSERT INTO users (id, name, email, avatar_url, provider)
        VALUES (@id, @name, @email, @avatar_url, @provider)
        ON CONFLICT(id) DO UPDATE SET
            name      = COALESCE(excluded.name, users.name),
            email     = COALESCE(excluded.email, users.email),
            avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
            provider  = COALESCE(excluded.provider, users.provider)
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

// ============================================================
// ---- Community Fund ----
// ============================================================

export function addFundDonation(amount: number): number {
    const db = getDb();
    db.prepare(`INSERT INTO community_fund (amount) VALUES (?)`).run(amount);
    const row = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM community_fund`).get() as { total: number };
    return row.total;
}

// נקרא מ-send-order-email: מחשב 10% ומוסיף לקופה
export function addFundContribution(_neighborhood: string, totalPayment: number): number {
    const tithe = Math.round(totalPayment * 0.1);
    return addFundDonation(tithe);
}

export function getFundTotal(): number {
    const row = getDb().prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM community_fund`).get() as { total: number };
    return row.total;
}

// ============================================================
// ---- Users ----
// ============================================================

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

