// src/lib/restaurantReviews.ts
// דירוגים ותגובות למסעדות. כל מסעדה מקבלת סט דוגמה (mock) דטרמיניסטי כדי שהדף
// לא ייראה ריק, וביקורות שמשתמשים מוסיפים נשמרות ב-localStorage עד לחיבור הבאקהנד.

export interface Review {
    id: string;
    author: string;
    rating: number;       // 1–5
    text: string;
    date: string;         // ISO
    fromUser?: boolean;   // true = נכתב על-ידי המשתמש (localStorage)
}

const LS_PREFIX = 'restaurant_reviews_';

// ====== מאגר ביקורות דוגמה ======
const MOCK_POOL: Omit<Review, 'id' | 'date'>[] = [
    { author: 'נעמה כ.',   rating: 5, text: 'אוכל מעולה ושירות אדיב. נחזור בהחלט!' },
    { author: 'יוסי מ.',   rating: 4, text: 'טעים מאוד, קצת המתנה בשעות העומס אבל שווה.' },
    { author: 'דנה ל.',    rating: 5, text: 'המנות טריות והמחירים הוגנים. ממליצה בחום.' },
    { author: 'אבי ש.',    rating: 4, text: 'מקום נעים לשבת עם המשפחה, צוות חביב.' },
    { author: 'רותם ב.',   rating: 3, text: 'בסדר גמור, שום דבר יוצא דופן אבל הוגן.' },
    { author: 'מיכל ד.',   rating: 5, text: 'מהמקומות הכי טובים בשכונה - האוכל פשוט מנצח.' },
    { author: 'איתי ר.',   rating: 4, text: 'משלוח הגיע מהר וחם. איכות יפה.' },
    { author: 'שירה פ.',   rating: 5, text: 'אווירה מקסימה ויחס אישי. ממש כיף.' },
];

// hash פשוט ויציב לפי מזהה - כדי שכל מסעדה תקבל אותן ביקורות דוגמה תמיד
function hash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function seededReviews(itemId: string): Review[] {
    const h = hash(itemId);
    const count = 2 + (h % 4); // 2–5 ביקורות
    const out: Review[] = [];
    for (let i = 0; i < count; i++) {
        const pick = MOCK_POOL[(h + i * 7) % MOCK_POOL.length];
        const daysAgo = ((h + i * 13) % 60) + 1;
        out.push({
            id: `seed-${itemId}-${i}`,
            author: pick.author,
            rating: pick.rating,
            text: pick.text,
            date: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        });
    }
    return out;
}

function loadUserReviews(itemId: string): Review[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LS_PREFIX + itemId);
        return raw ? (JSON.parse(raw) as Review[]) : [];
    } catch {
        return [];
    }
}

function saveUserReviews(itemId: string, reviews: Review[]) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(LS_PREFIX + itemId, JSON.stringify(reviews));
    } catch {
        /* שקט */
    }
}

/** כל הביקורות למסעדה - דוגמאות + ביקורות שהמשתמש הוסיף, החדשות בראש */
export function getReviews(itemId: string): Review[] {
    const user = loadUserReviews(itemId);
    return [...user, ...seededReviews(itemId)];
}

/** הוספת ביקורת חדשה (נשמרת ב-localStorage). מחזיר את הרשימה המעודכנת */
export function addReview(itemId: string, author: string, rating: number, text: string): Review[] {
    const user = loadUserReviews(itemId);
    const review: Review = {
        id: `user-${Date.now()}`,
        author: author.trim() || 'אנונימי',
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        text: text.trim(),
        date: new Date().toISOString(),
        fromUser: true,
    };
    const updated = [review, ...user];
    saveUserReviews(itemId, updated);
    return getReviews(itemId);
}

export interface RatingSummary {
    avg: number;   // ממוצע מעוגל לעשירית
    count: number;
}

/** סיכום דירוג - ממוצע וכמות, מחושב מכל הביקורות */
export function getRatingSummary(itemId: string): RatingSummary {
    const all = getReviews(itemId);
    if (all.length === 0) return { avg: 0, count: 0 };
    const sum = all.reduce((s, r) => s + r.rating, 0);
    return { avg: Math.round((sum / all.length) * 10) / 10, count: all.length };
}
