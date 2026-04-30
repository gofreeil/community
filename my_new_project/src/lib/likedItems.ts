// מועדפים של המשתמש — נשמרים ב-localStorage כתצלום מלא (snapshot)
// כך דף הפרופיל יכול להציג קיצורי דרך + תקציר לכל פריט שאהב המשתמש,
// בלי תלות בנתוני שרת או בנתוני mock.

export type LikedItemType = 'giveaway' | 'single';

export interface LikedItem {
    type: LikedItemType;
    id: string;
    label: string;
    image?: string;
    url: string;        // קיצור הדרך אליו ינווט המשתמש מהפרופיל
    summary?: string;   // תקציר קצר (כתובת/גיל+עיר/תיאור)
    likedAt: string;    // ISO date
}

const KEY = 'liked_items_v1';

function safeParse(): LikedItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(x => x && typeof x === 'object' && x.id && x.type) : [];
    } catch {
        return [];
    }
}

function persist(list: LikedItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(KEY, JSON.stringify(list));
    } catch {}
}

export function getLikedItems(): LikedItem[] {
    return safeParse();
}

export function isLiked(type: LikedItemType, id: string): boolean {
    return safeParse().some(x => x.type === type && x.id === id);
}

export function toggleLike(item: Omit<LikedItem, 'likedAt'>): boolean {
    const list = safeParse();
    const idx = list.findIndex(x => x.type === item.type && x.id === item.id);
    if (idx >= 0) {
        list.splice(idx, 1);
        persist(list);
        return false;
    }
    list.unshift({ ...item, likedAt: new Date().toISOString() });
    persist(list);
    return true;
}

export function removeLike(type: LikedItemType, id: string): void {
    const list = safeParse().filter(x => !(x.type === type && x.id === id));
    persist(list);
}
