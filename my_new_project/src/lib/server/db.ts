import Database from 'better-sqlite3';
import { join } from 'path';

// ---- DB Setup ----
const db = new Database(join(process.cwd(), 'community.db'));
db.pragma('journal_mode = WAL');

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
    created_at  TEXT DEFAULT (datetime('now'))
  )
`);

// ---- Types ----
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
}

// ---- Helpers ----
const insertStmt = db.prepare(`
    INSERT INTO items (id, category, label, description, contact, phone, address, icon, color, neighborhood, city, extra_fields)
    VALUES (@id, @category, @label, @description, @contact, @phone, @address, @icon, @color, @neighborhood, @city, @extra_fields)
`);

const getAllStmt   = db.prepare(`SELECT * FROM items WHERE status = 'active' ORDER BY created_at DESC`);
const getByIdStmt = db.prepare(`SELECT * FROM items WHERE id = ? AND status = 'active'`);

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
    };
    insertStmt.run(row);
    return getByIdStmt.get(row.id) as DbItem;
}

export function getAllItems(): DbItem[] {
    return getAllStmt.all() as DbItem[];
}

export function getDbItemById(id: string): DbItem | undefined {
    return getByIdStmt.get(id) as DbItem | undefined;
}

export { db };
