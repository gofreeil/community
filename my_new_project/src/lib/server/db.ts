// ============================================================
// db.ts - שכבת הנתונים
//
// פריטים + קופת קהילה + משתמשים → Strapi 5 (async, cloud-persistent)
// ============================================================

import { strapiGet, strapiPost, strapiPut, strapiDelete, StrapiContentTypeError, findStrapiUpUsers, updateStrapiUpUser } from './strapiClient.js';
import { DEFAULT_DISCOUNT_CODES, type DiscountCode } from '$lib/discountCodes';
import { cached, invalidate } from './cache.js';

// TTL לערכי ה-cache (במילישניות). קצר מספיק שעדכונים נראים מהר,
// ארוך מספיק שניווט פעיל לא נוגע ב-Strapi כמעט בכלל.
const TTL_ITEMS         = 30_000;
const TTL_EVENTS        = 30_000;
const TTL_NEIGHBORHOODS = 120_000;
const TTL_USER          = 15_000;

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
    lat: number | null;
    lng: number | null;
    extra_fields: string;   // JSON string
    status: string;
    user_id: string | null;
    created_at: string;
    view_count: number;
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
    lat?: number | null;
    lng?: number | null;
    extra_fields?: Record<string, unknown>;
    user_id?: string;
    status?: string;
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
    security_question_2: string;
    security_answer_2: string;
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
    security_question_2?: string;
    security_answer_2?: string;
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
    lat: number | null;
    lng: number | null;
    extra_fields: Record<string, unknown> | null;
    status1: string | null;
    user_id: string | null;
    view_count: number | null;
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
    security_question_2: string | null;
    security_answer_2: string | null;
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
        lat:          item.lat ?? null,
        lng:          item.lng ?? null,
        extra_fields: item.extra_fields && typeof item.extra_fields === 'object'
            ? JSON.stringify(item.extra_fields)
            : '{}',
        status:       item.status1      ?? 'active',
        user_id:      item.user_id      ?? null,
        created_at:   item.createdAt    ?? '',
        view_count:   item.view_count   ?? 0,
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
        security_question:   u.security_question   ?? '',
        security_answer:     u.security_answer     ?? '',
        security_question_2: u.security_question_2 ?? '',
        security_answer_2:   u.security_answer_2   ?? '',
        status:              u.status              ?? 'active',
        coordinator_of: Array.isArray(u.coordinator_of) ? u.coordinator_of : [],
    };
}

// ============================================================
// ---- Items (Strapi) ----
// ============================================================

export async function getAllItems(): Promise<DbItem[]> {
    return cached('items:all', TTL_ITEMS, async () => {
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
    });
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
            lat:          data.lat ?? null,
            lng:          data.lng ?? null,
            extra_fields: data.extra_fields ?? {},
            status1:      data.status ?? 'active',
            user_id:      data.user_id ?? null,
            publishedAt:  new Date().toISOString(),
        },
    });
    invalidate('items:');
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
    return cached(`items:cat:${category}`, TTL_ITEMS, async () => {
        try {
            const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
                'filters[category][$eq]':  category,
                'filters[status1][$eq]':   'active',
                'sort':                    'createdAt:desc',
                'pagination[limit]':       '1000',
            });
            const items = (res.data ?? []).map(mapStrapiItem);
            // אירוח לשבת: מודעה חד-פעמית > 3 ימים → freeze אוטומטי (lazy, fire-and-forget)
            if (category === 'realestate') {
                return autoFreezeExpiredOneTimeAds(items);
            }
            return items;
        } catch (e) {
            if (e instanceof StrapiContentTypeError) return [];
            throw e;
        }
    });
}

/** פריטים לפי קטגוריה מסוננים לפי עיר - ללוחות מחולקים-עיר (אבדות/מציאות).
 *  מונע גלישת מידע מעיר אחת לאחרת. */
export async function getItemsByCategoryAndCity(category: string, city: string): Promise<DbItem[]> {
    return cached(`items:cat:${category}:city:${city}`, TTL_ITEMS, async () => {
        try {
            const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
                'filters[category][$eq]': category,
                'filters[status1][$eq]':  'active',
                'filters[city][$eq]':     city,
                'sort':                   'createdAt:desc',
                'pagination[limit]':      '1000',
            });
            return (res.data ?? []).map(mapStrapiItem);
        } catch (e) {
            if (e instanceof StrapiContentTypeError) return [];
            throw e;
        }
    });
}

/** שליפת פריטים לפי קטגוריה + סטטוס (למשל פנויים שממתינים לאישור: 'singles','pending') */
export async function getItemsByCategoryAndStatus(category: string, status: string): Promise<DbItem[]> {
    try {
        const res = await strapiGet<{ data: StrapiItem[] }>('/api/items', {
            'filters[category][$eq]':  category,
            'filters[status1][$eq]':   status,
            'sort':                    'createdAt:desc',
            'pagination[limit]':       '1000',
        });
        return (res.data ?? []).map(mapStrapiItem);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return [];
        throw e;
    }
}

const ONE_TIME_POSTING_PREFIX = 'לשבת הקרובה';
const THREE_DAYS_MS_DB = 3 * 24 * 60 * 60 * 1000;

/** מסיר מודעות אירוח חד-פעמיות שעברו 3 ימים ומקפיא אותן ב-Strapi ברקע */
function autoFreezeExpiredOneTimeAds(items: DbItem[]): DbItem[] {
    const cutoff = Date.now() - THREE_DAYS_MS_DB;
    const survivors: DbItem[] = [];
    for (const it of items) {
        let ef: Record<string, unknown> = {};
        try { ef = it.extra_fields ? JSON.parse(it.extra_fields) : {}; } catch {}
        const postingType = String(ef.posting_type ?? '');
        const createdMs = new Date(it.created_at).getTime();
        const isOneTime = postingType.startsWith(ONE_TIME_POSTING_PREFIX) || postingType.startsWith('חד-פעמי');
        if (isOneTime && createdMs > 0 && createdMs < cutoff) {
            // freeze בענן ברקע - לא מעכב את התשובה
            updateItem(it.id, { status: 'frozen' }).catch(e => console.warn('[db] auto-freeze failed:', it.id, e));
            continue;
        }
        survivors.push(it);
    }
    return survivors;
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
            description: `[הוסר על ידי הפורסם - טלפון מחזיר: ${resolverPhone}]`,
        },
    });
    invalidate('items:');
}

export async function incrementItemViewCount(documentId: string): Promise<void> {
    try {
        const item = await getDbItemById(documentId);
        if (item) {
            await strapiPut(`/api/items/${documentId}`, {
                data: {
                    view_count: (item.view_count ?? 0) + 1,
                },
            });
        }
    } catch (e) {
        console.warn('[db] incrementItemViewCount failed:', e);
    }
}

export interface UpdateItemData {
    label?: string;
    description?: string;
    contact?: string;
    phone?: string;
    address?: string;
    neighborhood?: string;
    city?: string;
    extra_fields?: Record<string, unknown>;
    status?: string;
}

export async function updateItem(documentId: string, data: UpdateItemData): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (data.label        !== undefined) payload.label        = data.label;
    if (data.description  !== undefined) payload.description  = data.description;
    if (data.contact      !== undefined) payload.contact      = data.contact;
    if (data.phone       !== undefined) payload.phone        = data.phone;
    if (data.address      !== undefined) payload.address      = data.address;
    if (data.neighborhood !== undefined) payload.neighborhood = data.neighborhood;
    if (data.city         !== undefined) payload.city         = data.city;
    if (data.extra_fields !== undefined) payload.extra_fields = data.extra_fields;
    if (data.status       !== undefined) payload.status1      = data.status;
    await strapiPut(`/api/items/${documentId}`, { data: payload });
    invalidate('items:');
}

/** מחיקה לצמיתות של פריט (רק הבעלים - נבדק ב-endpoint) */
export async function deleteItem(documentId: string): Promise<void> {
    await strapiDelete(`/api/items/${documentId}`);
    invalidate('items:');
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

export type EventStatus = 'pending' | 'approved' | 'rejected';

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
    creator_id: string;
    submitted_by_id: string;
    description: string;
    status: EventStatus;
    price: number;
    price_description: string;
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
    creator_id: string;
    submitted_by_id?: string;
    description?: string;
    status?: EventStatus;
    price?: number;
    price_description?: string;
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
    creator_id: string | null;
    submitted_by_id: string | null;
    description: string | null;
    status: EventStatus | null;
    price: number | null;
    price_description: string | null;
    createdAt: string;
}

function mapStrapiEvent(e: StrapiEvent): DbEvent {
    return {
        id:               e.documentId,
        title:            e.title            ?? '',
        date:             e.date             ?? '',
        time:             e.time             ?? '',
        location:         e.location         ?? '',
        icon:             e.icon             ?? '📅',
        color:            e.color            ?? 'blue',
        neighborhood:     e.neighborhood     ?? '',
        city:             e.city             ?? '',
        creator_id:    e.creator_id    ?? '',
        submitted_by_id:  e.submitted_by_id  ?? '',
        description:      e.description      ?? '',
        status:           e.status           ?? 'pending',
        price:            e.price            ?? 0,
        price_description: e.price_description ?? '',
        created_at:       e.createdAt        ?? '',
    };
}

/** מחזיר אירועים מאושרים לעיר (ציבורי). הלוח מחולק לפי עיר - לא לפי שכונה. */
export async function getEvents(city?: string): Promise<DbEvent[]> {
    return cached(`events:city:${city ?? 'all'}`, TTL_EVENTS, async () => {
        try {
            const params: Record<string,string> = {
                'filters[status][$eq]': 'approved',
                'sort':                 'date:asc',
                'pagination[limit]':    '500',
            };
            if (city) params['filters[city][$eq]'] = city;
            const res = await strapiGet<{ data: StrapiEvent[] }>('/api/events', params);
            return (res.data ?? []).map(mapStrapiEvent);
        } catch (e) {
            if (e instanceof StrapiContentTypeError) return [];
            throw e;
        }
    });
}

/** מחזיר אירועים ממתינים לאישור בעיר (לרכז/מנהל בלבד) */
export async function getPendingEvents(city: string): Promise<DbEvent[]> {
    try {
        const res = await strapiGet<{ data: StrapiEvent[] }>('/api/events', {
            'filters[city][$eq]':   city,
            'filters[status][$eq]': 'pending',
            'sort':                 'createdAt:desc',
            'pagination[limit]':    '100',
        });
        return (res.data ?? []).map(mapStrapiEvent);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return [];
        throw e;
    }
}

export async function createEvent(data: CreateEventData): Promise<DbEvent> {
    const res = await strapiPost<{ data: StrapiEvent }>('/api/events', {
        data: {
            title:             data.title,
            date:              data.date,
            time:              data.time              ?? '',
            location:          data.location          ?? '',
            icon:              data.icon              ?? '📅',
            color:             data.color             ?? 'blue',
            neighborhood:      data.neighborhood,
            city:              data.city              ?? '',
            creator_id:     data.creator_id,
            submitted_by_id:   data.submitted_by_id  ?? data.creator_id,
            description:       data.description       ?? '',
            status:            data.status            ?? 'pending',
            price:             data.price             ?? 0,
            price_description: data.price_description ?? '',
        },
    });
    invalidate('events:');
    return mapStrapiEvent(res.data);
}

export async function updateEventStatus(documentId: string, status: EventStatus): Promise<void> {
    await strapiPut(`/api/events/${documentId}`, { data: { status } });
    invalidate('events:');
}

export async function deleteEvent(documentId: string): Promise<void> {
    await strapiDelete(`/api/events/${documentId}`);
    invalidate('events:');
}

// ============================================================
// ---- Gatherings (ערב מפגש / סעודה קהילתית) ----
// סעודה משותפת שמקים תושב: פרטי האירוע, רשימת מאכלים שכל אחד
// משבץ את שמו לידם, ורשימת מגיעים עם כרטיסים. JSON פנימי כדי
// להימנע מטבלאות-קשר נפרדות בסקייל של שכונה.
// ============================================================

export type GatheringStatus = 'pending' | 'approved' | 'rejected';

/** פריט ברשימת המאכלים. claimed = מי שהתחייב להביא אותו (ריק = פנוי). */
export interface GatheringFood {
    id: string;
    name: string;
    qty: string;                    // כמות חופשית: "2 בקבוקים", "סלט גדול"...
    claimed_by_id: string | null;
    claimed_by_name: string | null;
}

/** מגיע לסעודה - מקור לכרטיס שמוצג בלוח (גברים ונשים כאחד). */
export interface GatheringAttendee {
    user_id: string;
    name: string;
    gender: string;
    avatar_url: string | null;
    city: string;
    neighborhood: string;
    count: number;                  // כמה אנשים הוא מביא (כולל עצמו)
    note: string;
}

export interface DbGathering {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
    host_name: string;
    icon: string;
    color: string;
    city: string;
    neighborhood: string;
    creator_id: string;
    manager_ids: string[];
    food_items: GatheringFood[];
    attendees: GatheringAttendee[];
    status: GatheringStatus;
    created_at: string;
}

export interface CreateGatheringData {
    title: string;
    date: string;
    time?: string;
    location?: string;
    description?: string;
    host_name?: string;
    icon?: string;
    color?: string;
    city?: string;
    neighborhood?: string;
    creator_id: string;
    manager_ids?: string[];
    food_items?: GatheringFood[];
    attendees?: GatheringAttendee[];
    status?: GatheringStatus;
}

interface StrapiGathering {
    id: number;
    documentId: string;
    title: string;
    date: string;
    time: string | null;
    location: string | null;
    description: string | null;
    host_name: string | null;
    icon: string | null;
    color: string | null;
    city: string | null;
    neighborhood: string | null;
    creator_id: string | null;
    manager_ids: string[] | null;
    food_items: GatheringFood[] | null;
    attendees: GatheringAttendee[] | null;
    status: GatheringStatus | null;
    createdAt: string;
}

function mapStrapiGathering(g: StrapiGathering): DbGathering {
    return {
        id:           g.documentId,
        title:        g.title        ?? '',
        date:         g.date         ?? '',
        time:         g.time         ?? '',
        location:     g.location     ?? '',
        description:  g.description  ?? '',
        host_name:    g.host_name    ?? '',
        icon:         g.icon         ?? '🍽️',
        color:        g.color        ?? 'amber',
        city:         g.city         ?? '',
        neighborhood: g.neighborhood ?? '',
        creator_id:   g.creator_id   ?? '',
        manager_ids:  Array.isArray(g.manager_ids) ? g.manager_ids : [],
        food_items:   Array.isArray(g.food_items)  ? g.food_items  : [],
        attendees:    Array.isArray(g.attendees)   ? g.attendees   : [],
        status:       g.status       ?? 'approved',
        created_at:   g.createdAt    ?? '',
    };
}

/** סעודות מאושרות לעיר (ציבורי לחברים). מחולק לפי עיר כמו שאר הלוחות. */
export async function getGatherings(city?: string): Promise<DbGathering[]> {
    return cached(`gatherings:city:${city ?? 'all'}`, TTL_EVENTS, async () => {
        try {
            const params: Record<string, string> = {
                'filters[status][$eq]': 'approved',
                'sort':                 'date:asc',
                'pagination[limit]':    '300',
            };
            if (city) params['filters[city][$eq]'] = city;
            const res = await strapiGet<{ data: StrapiGathering[] }>('/api/gatherings', params);
            return (res.data ?? []).map(mapStrapiGathering);
        } catch (e) {
            if (e instanceof StrapiContentTypeError) return [];
            throw e;
        }
    });
}

export async function getGatheringById(documentId: string): Promise<DbGathering | undefined> {
    try {
        const res = await strapiGet<{ data: StrapiGathering | null }>(`/api/gatherings/${documentId}`);
        return res.data ? mapStrapiGathering(res.data) : undefined;
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return undefined;
        throw e;
    }
}

export async function createGathering(data: CreateGatheringData): Promise<DbGathering> {
    const res = await strapiPost<{ data: StrapiGathering }>('/api/gatherings', {
        data: {
            title:        data.title,
            date:         data.date,
            time:         data.time         ?? '',
            location:     data.location     ?? '',
            description:  data.description  ?? '',
            host_name:    data.host_name    ?? '',
            icon:         data.icon         ?? '🍽️',
            color:        data.color        ?? 'amber',
            city:         data.city         ?? '',
            neighborhood: data.neighborhood ?? '',
            creator_id:   data.creator_id,
            manager_ids:  data.manager_ids  ?? [data.creator_id],
            food_items:   data.food_items   ?? [],
            attendees:    data.attendees    ?? [],
            status:       data.status       ?? 'approved',
        },
    });
    invalidate('gatherings:');
    return mapStrapiGathering(res.data);
}

/** עדכון חלקי של סעודה (פרטים / רשימת מאכלים / מגיעים / מנהלים). */
export async function updateGathering(
    documentId: string,
    data: Partial<Omit<CreateGatheringData, 'creator_id'>>,
): Promise<void> {
    await strapiPut(`/api/gatherings/${documentId}`, { data });
    invalidate('gatherings:');
}

export async function deleteGathering(documentId: string): Promise<void> {
    await strapiDelete(`/api/gatherings/${documentId}`);
    invalidate('gatherings:');
}

// ============================================================
// ---- Coordinator requests (בקשות להיות רכז שכונה) ----
// ============================================================

export type CoordinatorRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DbCoordinatorRequest {
    id: string;             // documentId
    user_id: string;
    name: string;
    phone: string;
    neighborhoods: string[];
    experience: string;
    motivation: string;
    status: CoordinatorRequestStatus;
    created_at: string;
}

interface StrapiCoordinatorRequest {
    id: number;
    documentId: string;
    user_id: string;
    name: string;
    phone: string;
    neighborhoods: string | null;
    experience: string | null;
    motivation: string | null;
    status: CoordinatorRequestStatus;
    decided_at: string | null;
    decided_by: string | null;
    rejection_reason: string | null;
    createdAt: string;
}

function mapCoordinatorRequest(r: StrapiCoordinatorRequest): DbCoordinatorRequest {
    return {
        id:            r.documentId,
        user_id:       r.user_id,
        name:          r.name ?? '',
        phone:         r.phone ?? '',
        neighborhoods: (r.neighborhoods ?? '').split(',').map(s => s.trim()).filter(Boolean),
        experience:    r.experience ?? '',
        motivation:    r.motivation ?? '',
        status:        r.status ?? 'pending',
        created_at:    r.createdAt ?? '',
    };
}

/** כל בקשות הרכזות הממתינות (pending) - לטיפול סופר-אדמין */
export async function getCoordinatorRequests(status: CoordinatorRequestStatus = 'pending'): Promise<DbCoordinatorRequest[]> {
    try {
        const res = await strapiGet<{ data: StrapiCoordinatorRequest[] }>('/api/coordinator-requests', {
            'filters[status][$eq]': status,
            'sort':                 'createdAt:desc',
            'pagination[limit]':    '200',
        });
        return (res.data ?? []).map(mapCoordinatorRequest);
    } catch (e) {
        if (e instanceof StrapiContentTypeError) return [];
        throw e;
    }
}

async function getCoordinatorRequestById(documentId: string): Promise<DbCoordinatorRequest | undefined> {
    const res = await strapiGet<{ data: StrapiCoordinatorRequest | null }>(`/api/coordinator-requests/${documentId}`, {});
    return res.data ? mapCoordinatorRequest(res.data) : undefined;
}

/**
 * אישור בקשת רכזות: ממנה את המשתמש לרכז של השכונות שביקש (במיזוג עם הקיימות)
 * ומסמן את הבקשה כ-approved כדי שתעלם מרשימת הממתינים.
 */
export async function approveCoordinatorRequest(documentId: string, decidedBy: string): Promise<void> {
    const req = await getCoordinatorRequestById(documentId);
    if (!req) throw new Error('בקשה לא נמצאה');

    const existing = (await getUserByAnyId(req.user_id))?.coordinator_of ?? [];
    const merged = Array.from(new Set([...existing, ...req.neighborhoods].map(s => s.trim()).filter(Boolean)));
    await setCoordinatorOfAnyId(req.user_id, merged);

    await strapiPut(`/api/coordinator-requests/${documentId}`, {
        data: { status: 'approved', decided_at: new Date().toISOString(), decided_by: decidedBy },
    });

    // שליחת הודעת אישור אוטומטית למשתמש (הודעה באתר = פריט category 'message')
    // try/catch - כשל בהודעה לא יבטל את האישור עצמו
    try {
        const areas = req.neighborhoods.join(', ');
        await createItem({
            category: 'message',
            label: '🎉 אישור מינוי רכז',
            description: `שלום ${req.name || ''}! 🎉\n\nאישרנו את מינויך כרכז קהילה${areas ? ` ב${areas}` : ''}. מעכשיו יש לך גישה לכלי הרכז באתר: אישור אירועים, ועד שכונתי, סקרים וצוות חירום.\n\nתודה רבה על ההתנדבות והנכונות לתרום לקהילה 🙏\n\n— הנהלת קהילה בשכונה`,
            contact: 'הנהלת קהילה בשכונה',
            user_id: req.user_id,
            icon: '🎉',
            color: 'purple',
            extra_fields: {
                type: 'coordinator_approved',
                sender_name: 'הנהלת קהילה בשכונה',
                item_label: `מינוי רכז${areas ? ` – ${areas}` : ''}`,
                read: false,
            },
        });
    } catch (e) {
        console.warn('[approveCoordinatorRequest] notify failed:', e instanceof Error ? e.message : e);
    }
}

/** דחיית בקשת רכזות */
export async function rejectCoordinatorRequest(documentId: string, decidedBy: string, reason = ''): Promise<void> {
    await strapiPut(`/api/coordinator-requests/${documentId}`, {
        data: { status: 'rejected', decided_at: new Date().toISOString(), decided_by: decidedBy, rejection_reason: reason },
    });
}

// ============================================================
// ---- Neighborhoods (שכונות שהוצעו ע"י תושבים עם פין על המפה) ----
// ============================================================

export type NeighborhoodStatus = 'pending' | 'approved' | 'rejected';

export interface DbNeighborhood {
    id: string;             // documentId
    name: string;
    city: string;
    lat: number;
    lng: number;
    user_id: string;
    status: NeighborhoodStatus;
    created_at: string;
}

interface StrapiNeighborhood {
    id: number;
    documentId: string;
    name: string;
    city: string;
    lat: number;
    lng: number;
    user_id: string | null;
    status: NeighborhoodStatus;
    decided_at: string | null;
    decided_by: string | null;
    createdAt: string;
}

function mapNeighborhood(n: StrapiNeighborhood): DbNeighborhood {
    return {
        id:         n.documentId,
        name:       n.name ?? '',
        city:       n.city ?? '',
        lat:        n.lat,
        lng:        n.lng,
        user_id:    n.user_id ?? '',
        status:     n.status ?? 'pending',
        created_at: n.createdAt ?? '',
    };
}

/** שכונות לפי סטטוס (ברירת מחדל: מאושרות) - משמש את הבורר ואת תור האישור באדמין */
export async function getNeighborhoods(status: NeighborhoodStatus = 'approved'): Promise<DbNeighborhood[]> {
    return cached(`neighborhoods:${status}`, TTL_NEIGHBORHOODS, async () => {
        try {
            const res = await strapiGet<{ data: StrapiNeighborhood[] }>('/api/neighborhoods', {
                'filters[status][$eq]': status,
                'sort':                 'createdAt:desc',
                'pagination[limit]':    '500',
            });
            return (res.data ?? []).map(mapNeighborhood);
        } catch (e) {
            if (e instanceof StrapiContentTypeError) return [];
            throw e;
        }
    });
}

/** יצירת בקשת שכונה חדשה (status=pending) - תושב שסימן פין על המפה */
export async function createNeighborhoodRequest(data: {
    name: string;
    city: string;
    lat: number;
    lng: number;
    user_id?: string;
}): Promise<DbNeighborhood> {
    const res = await strapiPost<{ data: StrapiNeighborhood }>('/api/neighborhoods', {
        data: {
            name:    data.name,
            city:    data.city,
            lat:     data.lat,
            lng:     data.lng,
            user_id: data.user_id ?? null,
            status:  'pending',
        },
    });
    invalidate('neighborhoods:');
    return mapNeighborhood(res.data);
}

/** אישור שכונה - מעכשיו תופיע בבורר ובמפה לכל המשתמשים */
export async function approveNeighborhood(documentId: string, decidedBy: string): Promise<void> {
    await strapiPut(`/api/neighborhoods/${documentId}`, {
        data: { status: 'approved', decided_at: new Date().toISOString(), decided_by: decidedBy },
    });
    invalidate('neighborhoods:');
}

/** דחיית שכונה */
export async function rejectNeighborhood(documentId: string, decidedBy: string): Promise<void> {
    await strapiPut(`/api/neighborhoods/${documentId}`, {
        data: { status: 'rejected', decided_at: new Date().toISOString(), decided_by: decidedBy },
    });
    invalidate('neighborhoods:');
}

// ============================================================
// ---- Admin actions ----
// ============================================================

/** מחיקת פריט (אדמין בלבד) - מעביר לסטטוס deleted */
export async function adminDeleteItem(documentId: string, adminId: string): Promise<void> {
    await strapiPut(`/api/items/${documentId}`, {
        data: {
            status1:     'deleted',
            description: `[הוסר ע"י אדמין: ${adminId}]`,
        },
    });
    invalidate('items:');
}

/** שליפת כל הסופר־אדמינים (לשליחת התראות מערכת) */
export async function getAllSuperAdmins(): Promise<DbUser[]> {
    try {
        const arr = await findStrapiUpUsers({
            'filters[app_role][$eq]': 'super_admin',
            'pagination[limit]':      '50',
        });
        return (arr as StrapiUpUser[]).map(mapUpUser);
    } catch (e) {
        console.warn('[db] getAllSuperAdmins failed:', e);
        return [];
    }
}

/** מציאת רכז שכונה - אם אין, מחזיר סופר אדמין */
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
    // fallback - סופר אדמין
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
    invalidate('user:');
}

/** עדכון שכונות שרכז מנהל (סופר-אדמין בלבד) */
export async function setCoordinatorOf(externalId: string, neighborhoods: string[]): Promise<void> {
    const user = await findUpUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await updateStrapiUpUser(user.id, { coordinator_of: neighborhoods });
    invalidate('user:');
}

/** כמו setCoordinatorOf אך מאתר את המשתמש גם לפי id מספרי (משתמשי credentials) */
export async function setCoordinatorOfAnyId(id: string, neighborhoods: string[]): Promise<void> {
    const user = await findUpUserAny(id);
    if (!user) throw new Error('משתמש לא נמצא');
    await updateStrapiUpUser(user.id, { coordinator_of: neighborhoods });
    invalidate('user:');
}

/** חסימת משתמש (אדמין בלבד) */
export async function banUser(externalId: string, _jwt?: string): Promise<void> {
    const user = await findUpUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await updateStrapiUpUser(user.id, { blocked: true });
    invalidate('user:');
}

/** ביטול חסימת משתמש */
export async function unbanUser(externalId: string, _jwt?: string): Promise<void> {
    const user = await findUpUser(externalId);
    if (!user) throw new Error('משתמש לא נמצא');
    await updateStrapiUpUser(user.id, { blocked: false });
    invalidate('user:');
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
            note:        `10% מהזמנת פרסום - ${neighborhood}`,
            publishedAt: new Date().toISOString(),
        },
    });
    return getFundTotal();
}

// ============================================================
// ---- Users (users-permissions - up_users table) ----
// ============================================================

/** מחפש משתמש לפי external_id (מזהה Auth.js) */
async function findUpUser(externalId: string): Promise<StrapiUpUser | undefined> {
    const arr = await findStrapiUpUsers({ 'filters[external_id][$eq]': externalId, 'pagination[limit]': '1' });
    return arr[0] as StrapiUpUser | undefined;
}

/** מחפש משתמש לפי אימייל (מעדיף רשומה ישנה - credentials) */
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
    // avatar_url - מעדכן רק אם אין כבר תמונה מקומית (base64)
    if (data.avatar_url && !user.avatar_url?.startsWith('data:')) {
        updates.avatar_url = data.avatar_url;
    }
    // שם תצוגה מ-OAuth - רק אם המשתמש עדיין לא קבע nickname משלו
    if (data.name && !user.nickname) {
        updates.nickname = data.name;
    }

    if (Object.keys(updates).length > 0) {
        await updateStrapiUpUser(user.id, updates);
        invalidate('user:');
    }
}

export async function getUserById(id: string, _jwt?: string): Promise<DbUser | undefined> {
    return cached(`user:${id}`, TTL_USER, async () => {
        const u = await findUpUser(id);
        return u ? mapUpUser(u) : undefined;
    });
}

/**
 * מאתר up_user לפי המזהה שמופיע ב-mapUpUser.id: external_id אם קיים,
 * אחרת ה-id המספרי של Strapi. כך משתמשי credentials (ללא external_id) נגישים גם הם.
 */
async function findUpUserAny(id: string): Promise<StrapiUpUser | undefined> {
    const byExternal = await findUpUser(id);
    if (byExternal) return byExternal;
    if (/^\d+$/.test(id)) {
        const arr = await findStrapiUpUsers({ 'filters[id][$eq]': id, 'pagination[limit]': '1' });
        return arr[0] as StrapiUpUser | undefined;
    }
    return undefined;
}

/** שליפת משתמש לפי המזהה שמופיע ברשימת המשתמשים (external_id או id מספרי) */
export async function getUserByAnyId(id: string, _jwt?: string): Promise<DbUser | undefined> {
    const u = await findUpUserAny(id);
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
    // "שם" בפרופיל → nickname (לא username - username הוא שם כניסה ויחודי)
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
    if (data.security_question   !== undefined) updates.security_question   = data.security_question;
    if (data.security_answer     !== undefined) updates.security_answer     = data.security_answer;
    if (data.security_question_2 !== undefined) updates.security_question_2 = data.security_question_2;
    if (data.security_answer_2   !== undefined) updates.security_answer_2   = data.security_answer_2;
    if (data.status              !== undefined) updates.status              = data.status;
    if (data.coordinator_of    !== undefined) updates.coordinator_of    = data.coordinator_of;

    if (Object.keys(updates).length === 0) return mapUpUser(user);

    const updated = await updateStrapiUpUser(user.id, updates);
    invalidate('user:');
    return mapUpUser(updated as StrapiUpUser);
}

// ============================================================
// ---- Credentials Auth ----
// ============================================================

/**
 * קישור משתמש שנרשם דרך Strapi users-permissions לשדה external_id
 * נקרא אחרי strapiRegister - המשתמש כבר קיים ב-up_users, רק מגדירים external_id
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

    // אם ה-external_id כבר מוגדר - משתמש קיים
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

// ============================================================
// ---- Discount config (קודי הנחה לדף התשלום) ----
// singleType discount-config ב-Strapi, עם נפילה לברירות-המחדל
// ============================================================

/** קריאת קודי ההנחה. נופל לברירות-המחדל אם Strapi לא נגיש / הרשומה ריקה. */
export async function getDiscountCodes(): Promise<DiscountCode[]> {
    try {
        const res = await strapiGet<{ data: { codes?: DiscountCode[] } | null }>('/api/discount-config');
        const codes = res?.data?.codes;
        if (Array.isArray(codes) && codes.length > 0) return codes;
    } catch {
        // Strapi לא נגיש או content-type טרם נפרס - נשתמש בברירות המחדל
    }
    return DEFAULT_DISCOUNT_CODES;
}

/** שמירת קודי ההנחה (סופר-אדמין בלבד). singleType -> PUT /api/discount-config */
export async function saveDiscountCodes(codes: DiscountCode[]): Promise<void> {
    await strapiPut('/api/discount-config', { data: { codes } });
}
