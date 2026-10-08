// מניות הפלטפורמה חיות ב-DAG (dag.arxentra.app): הפלטפורמה היא NFT אחד
// ("פלטפורמת קהילה בשכונה"), והבעלות עליו מתחלקת באחוזים - שדה `shares[]` ברשומת ה-NFT.
// כאן שולפים את האחוז של משתמש מה-API הציבורי (בלי התחברות) ומתרגמים אותו למספר מניות.
//
// הערה: ה-API הציבורי לא מגדיר סכמה לתשובה; המבנה נלקח מתשובה אמיתית של
// GET /api/public/profile/{handle} -> nfts[] עם { id, name, status, my_share_percent }.

const DAG_API = 'https://dag.arxentra.app/api';

/** ה-NFT של הפלטפורמה ב-DAG. מזהים גם לפי שם למקרה שהמזהה ישתנה (מדלגים על burned). */
const PLATFORM_NFT_ID = 22;
const PLATFORM_NFT_NAME = 'פלטפורמת קהילה בשכונה';

/**
 * הצעד הקטן ביותר ב-DAG הוא 0.001%, ואחוז מוצג עם 3 ספרות אחרי הנקודה
 * (99.999 / 0.001) => מניה אחת = 0.001%, כלומר 100,000 מניות בסך הכל.
 */
const SHARES_PER_PERCENT = 1000;

/**
 * קישור משתמש-אתר -> @handle ב-DAG. אין עדיין שדה בפרופיל ב-Strapi, אז זה מפה זמנית
 * לפי אימייל; כשיתווסף שדה `dag_handle` מחליפים רק את `getDagHandle`.
 */
const DAG_HANDLE_BY_EMAIL: Record<string, string> = {
    'yahavanter@gmail.com': 'freeil',
};

export function getDagHandle(email: string | null | undefined): string | null {
    return DAG_HANDLE_BY_EMAIL[String(email ?? '').trim().toLowerCase()] ?? null;
}

export interface DagShares {
    /** מספר המניות (שלם) */
    shares: number;
    /** האחוז מהפלטפורמה */
    percent: number;
}

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: DagShares }>();

/** מספר המניות של handle ב-DAG. null = ה-API לא זמין / החשבון לא נמצא (לא נשמר ב-cache). */
export async function getDagShares(handle: string): Promise<DagShares | null> {
    const hit = cache.get(handle);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

    try {
        const res = await fetch(`${DAG_API}/public/profile/${encodeURIComponent(handle)}`, {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return null;
        const body = await res.json();
        const nfts: any[] = Array.isArray(body?.nfts) ? body.nfts : [];
        const nft = nfts.find((n) => n?.status !== 'burned' && (n?.id === PLATFORM_NFT_ID || n?.name === PLATFORM_NFT_NAME));

        // אין לו חלק ב-NFT של הפלטפורמה = 0 מניות (תשובה תקינה, לא שגיאה)
        const percent = Number(nft?.my_share_percent ?? 0);
        const value: DagShares = {
            shares: Number.isFinite(percent) ? Math.round(percent * SHARES_PER_PERCENT) : 0,
            percent: Number.isFinite(percent) ? percent : 0,
        };
        cache.set(handle, { at: Date.now(), value });
        return value;
    } catch (e) {
        console.warn('[dagShares] fetch failed:', e);
        return null;
    }
}

export async function getDagSharesByEmail(email: string | null | undefined): Promise<DagShares | null> {
    const handle = getDagHandle(email);
    return handle ? getDagShares(handle) : null;
}
