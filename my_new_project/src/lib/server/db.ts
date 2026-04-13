// ============================================================
// db.ts — שכבת הנתונים
//
// פריטים + קופת קהילה + משתמשים → Strapi 5 (async, cloud-persistent)
// ============================================================

import { strapiGet, strapiPost, strapiPut, strapiDelete, StrapiContentTypeError, findStrapiUpUsers, updateStrapiUpUser } from './strapiClient.js';

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
    id?: string;
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
    role: 'user' | 'neighborhood_admin' | 'super_admin';
    banned: boolean;
    created_at: string;
    security_question: string;
    security_answer: string;
    status: string;
    coordinator_of: string[];
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
    security_question?: string;
    security_answer?: string;
    status?: string;
    coordinator_of?: string[];
}

// ============================================================
// ---- Strapi internal types (Items) ----
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

// users-permissions User (טבלת up_users)
interface StrapiUpUser {
    id: number;               // מזהה מספרי של Strapi
    username: string;         // שם משתמש לכניסה
    email: string;
    confirmed: boolean;
    blocked: boolean;
    provider: string;
    // שדות מותאמים שהוספנו דרך extension:
    external_id: string | null;
    city: string | null;
    neighborhood: string | null;
    phone: string | null;
    nickname: string | null;
    business: string | null;
    family_status: string | null;
    gender: string | null;
    birth_date: string | null;
    avatar_url: string | null;
    balance: number | null;
    notifications: boolean | null;
    app_role: string | null;
    security_question: string | null;
    security_answer: string | null;
    status: string | null;
    coordinator_of: string[] | null;
    createdAt: string;
}

// ============================================================
// ---- Mappers ----
// ============================================================

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

function mapUpUser(u: StrapiUpUser): DbUser {
    return {
        id:            u.external_id   ?? String(u.id),
        // nickname (שם עריך) גובר על username (שם כניסה)
        name:          u.nickname      || u.username  || null,
        email:         u.email         ?? null,
        phone:         u.phone         ?? '',
        neighborhood:  u.neighborhood  ?? '',
        city:          u.city          ?? '',
        avatar_url:    u.avatar_url    ?? null,
        provider:      u.provider      ?? null,
        nickname:      u.nickname      ?? '',
        business:      u.business      ?? '',
        notifications: u.notifications ? 1 : 0,
        family_status: u.family_status ?? '',
        gender:        u.gender        ?? '',
        birth_date:    u.birth_date    ?? '',
        balance:       u.balance       ?? 0,
        role:              (u.app_role as DbUser['role']) ?? 'user',
        banned:            u.blocked           ?? false,
        created_at:        u.createdAt         ?? '',
        security_question: u.security_question ?? '',
        security_answer:   u.security_answer   ?? '',
        status:            u.status            ?? 'active',
        coordinator_of: Array.isArray(u.coordinator_of) ? u.coordinator_of : [],
    };
}

// ============================================================
// ---- Items (Strapi) ----
// ============================================================

export async function getAllItems(): Promise<DbItem[]> {
    try {
        const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
            'filters[status1][$eq]': 'active',
            'sort':                  'createdAt:desc',
            'pagination[limit]':     '1000',
        });
        return (res.data ?? []).map(mapStrapiItem);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) {
            console.warn('[db] getAllItems: content type not registered, returning []');
            return [];
        }
        throw e;
    }
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
            publishedAt:  new Date().toISOString(),
        },
    });
    return mapStrapiItem(res.data);
}

export async function getDbItemById(id: string): Promise<DbItem | undefined> {
    try {
        const res = await strapiGet<{ data: StrapiItem }>(`/api/items/${id}`);
        if (!res.data) return undefined;
        return mapStrapiItem(res.data);
    } catch {
        return undefined;
    }
}

export async function getItemsByCategory(category: string): Promise<DbItem[]> {
    try {
        const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
            'filters[category][$eq]':  category,
            'filters[status1][$eq]':   'active',
            'sort':                    'createdAt:desc',
            'pagination[limit]':       '1000',
        });
        return (res.data ?? []).map(mapStrapiItem);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return [];
        throw e;
    }
}

export async function searchItems(query: string): Promise<DbItem[]> {
    const q = query.trim();
    if (!q) return [];
    try {
        const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
            'filters[$or][0][label][$containsi]':       q,
            'filters[$or][1][description][$containsi]': q,
            'filters[$or][2][category][$containsi]':    q,
            'filters[status1][$eq]':                    'active',
            'sort':                                     'createdAt:desc',
            'pagination[limit]':                        '500',
        });
        return (res.data ?? []).map(mapStrapiItem);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return [];
        throw e;
    }
}

export async function getItemsByUserId(userId: string): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[user_id][$eq]': userId,
        'sort':                  'createdAt:desc',
        'pagination[limit]':     '1000',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

export async function resolveItem(documentId: string, resolverPhone: string): Promise<void> {
    await strapiPut(`/api/items/${documentId}`, {
        data: {
            status1:     'resolved',
            description: `[הוסר על ידי הפורסם — טלפון מחזיר: ${resolverPhone}]`,
        },
    });
}

export async function getResolvedCount(category: string): Promise<number> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[category][$eq]':  category,
        'filters[status1][$eq]':   'resolved',
        'pagination[limit]':       '1',
        'pagination[withCount]':   'true',
    });
    return (res as unknown as { meta?: { pagination?: { total?: number } } }).meta?.pagination?.total ?? 0;
}

// ============================================================
// ---- Events ----
// ============================================================

export interface DbEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    icon: string;
    color: string;
    neighborhood: string;
    city: string;
    created_by_id: string;
    description: string;
    created_at: string;
}

export interface CreateEventData {
    title: string;
    date: string;
    time?: string;
    location?: string;
    icon?: string;
    color?: string;
    neighborhood: string;
    city?: string;
    created_by_id: string;
    description?: string;
}

interface StrapiEvent {
    id: number;
    documentId: string;
    title: string;
    date: string;
    time: string | null;
    location: string | null;
    icon: string | null;
    color: string | null;
    neighborhood: string | null;
    city: string | null;
    created_by_id: string | null;
    description: string | null;
    createdAt: string;
}

function mapStrapiEvent(e: StrapiEvent): DbEvent {
    return {
        id:            e.documentId,
        title:         e.title        ?? '',
        date:          e.date         ?? '',
        time:          e.time         ?? '',
        location:      e.location     ?? '',
        icon:          e.icon         ?? '📅',
        color:         e.color        ?? 'blue',
        neighborhood:  e.neighborhood ?? '',
        city:          e.city         ?? '',
        created_by_id: e.created_by_id ?? '',
        description:   e.description  ?? '',
        created_at:    e.createdAt    ?? '',
    };
}

export async function getEvents(neighborhood?: string): Promise<DbEvent[]> {
    try {
        const params: Record<string,string> = {
            'sort': 'date:asc',
            'pagination[limit]': '500',
        };
        if (neighborhood) {
            params['filters[neighborhood][$eq]'] = neighborhood;
        }
        const res = await strapiGet<{ data: StrapiEvent[] }>('/api/events', params);
        return (res.data ?? []).map(mapStrapiEvent);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return [];
        throw e;
    }
}

export async function createEvent(data: CreateEventData): Promise<DbEvent> {
    const res = await strapiPost<{ data: StrapiEvent }>('/api/events', {
        data: {
            title:         data.title,
            date:          data.date,
            time:          data.time         ?? '',
            location:      data.location     ?? '',
            icon:          data.icon         ?? '📅',
            color:         data.color        ?? 'blue',
            neighborhood:  data.neighborhood,
            city:          data.city         ?? '',
            created_by_id: data.created_by_id,
            description:   data.description  ?? '',
        },
    });
    return mapStrapiEvent(res.data);
}

export async function deleteEvent(documentId: string): Promise<void> {
    await strapiDelete(`/api/events/${documentId}`);
}

// ============================================================
// ---- Admin actions ----
// ============================================================

/** מחיקת פריט (אדמין בלבד) — מעביר לסטטוס deleted */
export async function adminDeleteItem(documentId: string, adminId: string): Promise<void> {
    await strapiPut(`/api/items/${documentId}`, {
        data: {
            status1:     'deleted',
            description: `[הוסר ע"י אדמין: ${adminId}]`,
        },
    });
}

/** מציאת רכז שכונה — אם אין, מחזיר סופר אדמין */
export async function findAdminForNeighborhood(neighborhood: string): Promise<DbUser | undefined> {
    // קודם מחפש neighborhood_admin של השכונה הספציפית
    if (neighborhood) {
        const arr = await findStrapiUpUsers({
            'filters[app_role][$eq]':    'neighborhood_admin',
            'filters[neighborhood][$eq]': neighborhood,
            'pagination[limit]':          '1',
        });
        if (arr.length > 0) return mapUpUser(arr[0] as StrapiUpUser);
    }
    // fallback — סופר אדמין
    const arr = await findStrapiUpUsers({
        'filters[app_role][$eq]': 'super_admin',
        'pagination[limit]':      '1',
    });
    return arr.length > 0 ? mapUpUser(arr[0] as StrapiUpUser) : undefined;
}

/** שליפת כל המשתמשים (אדמין בלבד) */
export async function getAllUsers(_jwt?: string): Promise<DbUser[]> {
    try {
        const arr = await findStrapiUpUsers({
            'pagination[limit]': '1000',
            'sort':              'createdAt:desc',
        });
        return (arr as StrapiUpUser[]).map(mapUpUser);
    } catch (e) {
        console.warn('[db] getAllUsers failed:', e);
        return [];
    }
}

/** שינוי role של משתמש (סופר-אדמין בלבד) */
export async function setUserRole(externalId: string, role: string, neighborhood?: string, _jwt?: string): Promise<void> {
    const user = await findUpUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await updateStrapiUpUser(user.id, {
        app_role: role,
        ...(neighborhood !== undefined ? { neighborhood } : {}),
    });
}

/** חסימת משתמש (אדמין בלבד) */
export async function banUser(externalId: string, _jwt?: string): Promise<void> {
    const user = await findUpUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await updateStrapiUpUser(user.id, { blocked: true });
}

/** ביטול חסימת משתמש */
export async function unbanUser(externalId: string, _jwt?: string): Promise<void> {
    const user = await findUpUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await updateStrapiUpUser(user.id, { blocked: false });
}

export async function getMessagesByUserId(userId: string): Promise<DbItem[]> {
    const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
        'filters[category][$eq]': 'message',
        'filters[user_id][$eq]':  userId,
        'sort':                   'createdAt:desc',
        'pagination[limit]':      '200',
    });
    return (res.data ?? []).map(mapStrapiItem);
}

// ============================================================
// ---- Community Fund (Strapi) ----
// ============================================================

export async function getFundTotal(): Promise<number> {
    try {
        const res = await strapiGet<{ data: StrapiFundEntry[] }>('/api/community-funds', {
            'pagination[limit]': '1000',
        });
        return (res.data ?? []).reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return 0;
        throw e;
    }
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
// ---- Users (users-permissions — up_users table) ----
// ============================================================

/** מחפש משתמש לפי external_id (מזהה Auth.js) */
async function findUpUser(externalId: string): Promise<StrapiUpUser | undefined> {
    const arr = await findStrapiUpUsers({ 'filters[external_id][$eq]': externalId, 'pagination[limit]': '1' });
    return arr[0] as StrapiUpUser | undefined;
}

/** מחפש משתמש לפי אימייל (מעדיף רשומה ישנה — credentials) */
async function findUpUserByEmail(email: string): Promise<StrapiUpUser | undefined> {
    const arr = await findStrapiUpUsers({
        'filters[email][$eq]': email,
        'sort[0]':             'createdAt:asc',
        'pagination[limit]':   '1',
    });
    return arr[0] as StrapiUpUser | undefined;
}

export async function upsertUser(data: UpsertUserData, _jwt?: string): Promise<void> {
    // מחפש לפי external_id קודם, אחר כך לפי אימייל
    let user = await findUpUser(data.id);
    if (!user && data.email) {
        user = await findUpUserByEmail(data.email);
    }
    if (!user) {
        console.warn('[upsertUser] user not found in users-permissions:', data.id, data.email);
        return;
    }

    const updates: Record<string, unknown> = {};
    if (!user.external_id) updates.external_id = data.id;
    if (data.provider && !user.provider) updates.provider = data.provider;
    // avatar_url — מעדכן רק אם אין כבר תמונה מקומית (base64)
    if (data.avatar_url && !user.avatar_url?.startsWith('data:')) {
        updates.avatar_url = data.avatar_url;
    }

    if (Object.keys(updates).length > 0) {
        await updateStrapiUpUser(user.id, updates);
    }
}

export async function getUserById(id: string, _jwt?: string): Promise<DbUser | undefined> {
    const u = await findUpUser(id);
    return u ? mapUpUser(u) : undefined;
}

export async function getUserByEmail(email: string, _jwt?: string): Promise<DbUser | undefined> {
    const u = await findUpUserByEmail(email);
    return u ? mapUpUser(u) : undefined;
}

export async function updateUserProfile(id: string, data: UpdateProfileData, _jwt?: string): Promise<DbUser | undefined> {
    const user = await findUpUser(id);
    if (!user) return undefined;

    const updates: Record<string, unknown> = {};
    // "שם" בפרופיל → nickname (לא username — username הוא שם כניסה ויחודי)
    if (data.name          !== undefined) updates.nickname      = data.name;
    if (data.email         !== undefined) updates.email         = data.email;
    if (data.phone         !== undefined) updates.phone         = data.phone;
    if (data.neighborhood  !== undefined) updates.neighborhood  = data.neighborhood;
    if (data.city          !== undefined) updates.city          = data.city;
    if (data.nickname      !== undefined) updates.nickname      = data.nickname;
    if (data.business      !== undefined) updates.business      = data.business;
    if (data.notifications !== undefined) updates.notifications = data.notifications === 1;
    if (data.family_status !== undefined) updates.family_status = data.family_status;
    if (data.gender        !== undefined) updates.gender        = data.gender;
    if (data.avatar_url        !== undefined) updates.avatar_url        = data.avatar_url;
    if (data.birth_date        !== undefined) updates.birth_date        = data.birth_date;
    if (data.security_question !== undefined) updates.security_question = data.security_question;
    if (data.security_answer   !== undefined) updates.security_answer   = data.security_answer;
    if (data.status            !== undefined) updates.status            = data.status;
    if (data.coordinator_of    !== undefined) updates.coordinator_of    = data.coordinator_of;

    if (Object.keys(updates).length === 0) return mapUpUser(user);

    const updated = await updateStrapiUpUser(user.id, updates);
    return mapUpUser(updated as StrapiUpUser);
}

// ============================================================
// ---- Credentials Auth ----
// ============================================================

/**
 * קישור משתמש שנרשם דרך Strapi users-permissions לשדה external_id
 * נקרא אחרי strapiRegister — המשתמש כבר קיים ב-up_users, רק מגדירים external_id
 */
export async function registerWithCredentials(
    _name: string,
    email: string,
    _password: string,
    _jwt?: string,
): Promise<DbUser> {
    const externalId = `credentials_${email}`;
    const user = await findUpUserByEmail(email);
    if (!user) throw new Error('Email already taken');

    // אם ה-external_id כבר מוגדר — משתמש קיים
    if (user.external_id && user.external_id !== externalId) {
        throw new Error('Email already taken');
    }

    // הגדרת external_id + provider
    if (!user.external_id) {
        await updateStrapiUpUser(user.id, {
            external_id: externalId,
            provider:    'local',
        });
    }

    return mapUpUser({ ...user, external_id: externalId });
}
