// ============================================================
// Strapi 5 HTTP Client
// כל הבקשות לבאקאנד עוברות דרך כאן
// ============================================================

const STRAPI_URL   = process.env.STRAPI_URL   ?? 'http://localhost:1337';
// STRAPI_TOKEN - Strapi API Token עם הרשאות Full Access.
// משמש כ-fallback כשאין user JWT (למשל: מיזוג חשבונות OAuth+credentials).
// ניצור אותו ב: Strapi Admin → Settings → API Tokens → Create new token
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? '';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;
// timeout לכל ניסיון fetch יחיד. בלי זה, כש-Strapi תקוע, הבקשה יכולה להיתלות
// עשרות שניות (× RETRY_ATTEMPTS) ולחסום את ה-load של הדף → הדף "לא נפתח".
const FETCH_TIMEOUT_MS = 6000;

/** שגיאה ייחודית ל-content type לא רשום (404/400 מ-Strapi) */
export class StrapiContentTypeError extends Error {
    constructor(path: string, status: number) {
        super(`[Strapi] Content type not registered: ${path} (${status})`);
        this.name = 'StrapiContentTypeError';
    }
}

/**
 * שגיאת auth מובחנת (login/register): נושאת את הסטטוס ואת הודעת Strapi המקורית
 * כדי שדפי login/register יבחינו בין "סיסמה שגויה", "אימייל לא מאומת",
 * "יותר מדי ניסיונות" ותקלת שרת — במקום הודעה גנרית אחת.
 * status=0 פירושו כשל רשת/timeout (Strapi לא נגיש).
 */
export class StrapiAuthError extends Error {
    status: number;
    strapiMessage: string;
    constructor(op: string, status: number, bodyText: string) {
        let msg = '';
        try { msg = JSON.parse(bodyText)?.error?.message ?? ''; } catch { msg = bodyText.slice(0, 200); }
        super(`[Strapi] ${op} → ${status}: ${msg || bodyText.slice(0, 200)}`);
        this.name = 'StrapiAuthError';
        this.status = status;
        this.strapiMessage = msg;
    }
    get isUnconfirmed()  { return /not confirmed/i.test(this.strapiMessage); }
    get isBadCredentials() { return /invalid identifier or password/i.test(this.strapiMessage); }
    get isRateLimited()  { return this.status === 429; }
    get isTaken()        { return /already taken/i.test(this.strapiMessage); }
    /** תקלה תשתיתית (רשת/5xx) — לא אשמת המשתמש */
    get isServerIssue()  { return this.status === 0 || this.status >= 500; }
}

function getHeaders(jwt?: string): HeadersInit {
    // עדיפות: user JWT → STRAPI_TOKEN (admin fallback) → ללא auth
    const token = jwt || STRAPI_TOKEN || undefined;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function isRetryable(status: number): boolean {
    return status === 503 || status === 502 || status === 504 || status === 429;
}

function isContentTypeError(status: number, text: string): boolean {
    return status === 404 && (
        text.includes('Route not found') ||
        text.includes('Not Found') ||
        text.includes('url not found')
    );
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function strapiGet<T = unknown>(
    path: string,
    params?: Record<string, string>,
    jwt?: string
): Promise<T> {
    const url = new URL(STRAPI_URL + path);
    if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
            const res = await fetch(url.toString(), {
                headers: getHeaders(jwt),
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            });
            if (res.ok) return res.json() as Promise<T>;

            const text = await res.text();

            // content type לא רשום - אין טעם לנסות שוב
            if (isContentTypeError(res.status, text)) {
                throw new StrapiContentTypeError(path, res.status);
            }
            // שגיאת HTTP שאינה זמנית - אין טעם לנסות שוב
            if (!isRetryable(res.status)) {
                throw new Error(`[Strapi] GET ${path} → ${res.status}: ${text}`);
            }
            // שגיאה זמנית (5xx/429) - נמשיך לנסות
            lastError = new Error(`[Strapi] GET ${path} → ${res.status}: ${text}`);
        } catch (e) {
            // StrapiContentTypeError + שגיאות HTTP קבועות - זורקים מיד בלי retry
            if (e instanceof StrapiContentTypeError) throw e;
            const err = e instanceof Error ? e : new Error(String(e));
            const isHttp = err.message.startsWith('[Strapi] GET') && !err.message.includes('fetch failed');
            if (isHttp) throw err;
            // שגיאת רשת (fetch failed) - נסה שוב
            lastError = err;
        }

        if (attempt < RETRY_ATTEMPTS) {
            console.warn(`[Strapi] GET ${path} - retry ${attempt}/${RETRY_ATTEMPTS - 1}`);
            await delay(RETRY_DELAY_MS * attempt);
        }
    }
    throw lastError!;
}

// גודל עמוד לשליפות "הכל" — תואם ל-maxLimit של השרת (config/api.ts),
// כלומר מספר הבקשות המינימלי האפשרי.
const ALL_PAGE_SIZE = 1000;
// גבול-בטיחות נגד לולאה אינסופית אם השרת מתעלם מ-start (5M רשומות).
const ALL_MAX_PAGES = 5000;

/**
 * שולף את *כל* התוצאות מ-Strapi ללא שום תקרה, ע"י מעבר עמוד-אחר-עמוד.
 *
 * למה: Strapi חוסם כל שאילתה בודדת ב-maxLimit (config/api.ts = 1000). בקשה עם
 * limit גדול יותר לא נכשלת — היא **נחתכת בשקט**, וכל מה שמעבר נעלם בלי שגיאה.
 * כאן מדפדפים עם start/limit עד שנגמרות התוצאות, כך שהאוסף המשותף יכול לגדול
 * ללא הגבלה בלי שפריטים ישנים ייעלמו מהמפה או מהמונים.
 */
export async function strapiGetAll<T = unknown>(
    path: string,
    params: Record<string, string> = {},
    jwt?: string,
): Promise<T[]> {
    const out: T[] = [];
    for (let page = 0; page < ALL_MAX_PAGES; page++) {
        const res = await strapiGet<{ data: T[] }>(path, {
            ...params,
            'pagination[start]': String(page * ALL_PAGE_SIZE),
            'pagination[limit]': String(ALL_PAGE_SIZE),
        }, jwt);
        const batch = res.data ?? [];
        out.push(...batch);
        // עמוד חלקי = הגענו לסוף
        if (batch.length < ALL_PAGE_SIZE) return out;
    }
    console.warn(`[Strapi] strapiGetAll ${path} hit the ${ALL_MAX_PAGES}-page safety bound`);
    return out;
}

export async function strapiPost<T = unknown>(path: string, body: unknown, jwt?: string): Promise<T> {
    const res = await fetch(STRAPI_URL + path, {
        method:  'POST',
        headers: getHeaders(jwt),
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
        const text = await res.text();
        if (isContentTypeError(res.status, text)) throw new StrapiContentTypeError(path, res.status);
        throw new Error(`[Strapi] POST ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

export async function strapiDelete(path: string, jwt?: string): Promise<void> {
    const res = await fetch(STRAPI_URL + path, {
        method:  'DELETE',
        headers: getHeaders(jwt),
        signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] DELETE ${path} → ${res.status}: ${text}`);
    }
}

export async function strapiPut<T = unknown>(path: string, body: unknown, jwt?: string): Promise<T> {
    const res = await fetch(STRAPI_URL + path, {
        method:  'PUT',
        headers: getHeaders(jwt),
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
        const text = await res.text();
        if (isContentTypeError(res.status, text)) throw new StrapiContentTypeError(path, res.status);
        throw new Error(`[Strapi] PUT ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

// ============================================================
// ---- Auth (users-permissions plugin - ללא token) ----
// ============================================================

export interface StrapiUser {
    id: number;
    username: string;
    email: string;
}

export interface StrapiAuthResponse {
    jwt: string;
    user: StrapiUser;
}

/** שליחת מייל לאיפוס סיסמה */
export async function forgotPassword(email: string): Promise<void> {
    let res: Response;
    try {
        res = await fetch(STRAPI_URL + '/api/auth/forgot-password', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email }),
            signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
    } catch (e) {
        throw new StrapiAuthError('FORGOT_PASSWORD', 0, e instanceof Error ? e.message : String(e));
    }
    if (!res.ok) {
        throw new StrapiAuthError('FORGOT_PASSWORD', res.status, await res.text());
    }
}

/**
 * איפוס סיסמה עם קוד מהמייל.
 * מחזיר את תשובת Strapi המלאה (jwt+user) כדי שהמשתמש יחובר אוטומטית
 * מיד אחרי האיפוס — בלי לוגין ידני נוסף.
 */
export async function resetPassword(code: string, password: string, passwordConfirmation: string): Promise<StrapiAuthResponse> {
    let res: Response;
    try {
        res = await fetch(STRAPI_URL + '/api/auth/reset-password', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ code, password, passwordConfirmation }),
            signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
    } catch (e) {
        throw new StrapiAuthError('RESET_PASSWORD', 0, e instanceof Error ? e.message : String(e));
    }
    if (!res.ok) {
        throw new StrapiAuthError('RESET_PASSWORD', res.status, await res.text());
    }
    return res.json() as Promise<StrapiAuthResponse>;
}

/** שליחת מייל אישור מחדש */
export async function resendConfirmation(email: string): Promise<void> {
    let res: Response;
    try {
        res = await fetch(STRAPI_URL + '/api/auth/send-email-confirmation', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email }),
            signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
    } catch (e) {
        throw new StrapiAuthError('RESEND_CONFIRMATION', 0, e instanceof Error ? e.message : String(e));
    }
    if (!res.ok) {
        throw new StrapiAuthError('RESEND_CONFIRMATION', res.status, await res.text());
    }
}

/**
 * אימות JWT מול ה-Strapi המשותף והחזרת המשתמש (GET /api/users/me).
 * משמש את כניסת ה-SSO ("יוצאים לחירות"): העוגייה המשותפת gofreeil-auth מכילה
 * JWT שנשתל ע"י אתר אחר תחת gofreeil.com — מאמתים אותו וקובעים מי המשתמש.
 * מחזיר null אם ה-JWT חסר/פג/לא תקין.
 */
export async function getStrapiMe(jwt: string): Promise<StrapiUser | null> {
    if (!jwt) return null;
    try {
        const res = await fetch(STRAPI_URL + '/api/users/me', {
            headers: { Authorization: `Bearer ${jwt}` },
            signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return null;
        return (await res.json()) as StrapiUser;
    } catch {
        return null;
    }
}

/**
 * כמו getStrapiMe אך מבחין בין דחייה ודאית לתקלה זמנית:
 * definitive=true  → Strapi ענה (טוקן פסול ב-401/403, או משתמש תקף).
 * definitive=false → תקלת רשת/5xx — אסור להסיק שהטוקן מת.
 * משמש את sso-adopt כדי למחוק עוגיית SSO מתה בלי למחוק עוגייה חיה בזמן תקלה.
 */
export async function getStrapiMeVerdict(jwt: string): Promise<{ user: StrapiUser | null; definitive: boolean }> {
    if (!jwt) return { user: null, definitive: true };
    try {
        const res = await fetch(STRAPI_URL + '/api/users/me', {
            headers: { Authorization: `Bearer ${jwt}` },
            signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (res.ok) return { user: (await res.json()) as StrapiUser, definitive: true };
        return { user: null, definitive: res.status === 401 || res.status === 403 };
    } catch {
        return { user: null, definitive: false };
    }
}

/**
 * מנפיק JWT למשתמש קיים דרך נתיב הבאקאנד המותאם (POST /api/sso/issue-jwt),
 * שמאומת ב-STRAPI_TOKEN (Full Access). זו הדרך היחידה שעובדת ל-SSO של משתמש
 * שאין לו סיסמה ידועה (OAuth/מיזוג): איפוס-סיסמה דרך REST לא מייצר סיסמה שמישה
 * לכניסה ב-Strapi 5. מחזיר null אם המשתמש לא קיים / הנתיב עוד לא פרוס / כשל.
 */
export async function issueSsoJwtViaBackend(email: string): Promise<string | null> {
    try {
        const res = await fetch(STRAPI_URL + '/api/sso/issue-jwt', {
            method:  'POST',
            headers: getHeaders(), // STRAPI_TOKEN (Full Access)
            body:    JSON.stringify({ email }),
            signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { jwt?: string };
        return data?.jwt ?? null;
    } catch {
        return null;
    }
}

/** לוגין עם אימייל + סיסמה. זורק StrapiAuthError מובחן (סיסמה/לא-מאומת/rate-limit/שרת) */
export async function strapiLogin(identifier: string, password: string): Promise<StrapiAuthResponse> {
    let res: Response;
    try {
        res = await fetch(STRAPI_URL + '/api/auth/local', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ identifier, password }),
            signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
    } catch (e) {
        throw new StrapiAuthError('LOGIN', 0, e instanceof Error ? e.message : String(e));
    }
    if (!res.ok) {
        throw new StrapiAuthError('LOGIN', res.status, await res.text());
    }
    return res.json() as Promise<StrapiAuthResponse>;
}

// ============================================================
// ---- Users-Permissions User API ----
// ============================================================

/**
 * GET /api/users (users-permissions) - returns array directly (no {data} wrapper)
 * Uses STRAPI_TOKEN for admin access by default
 */
/**
 * כמו findStrapiUpUsers, אך ללא תקרה — מדפדף עמוד-אחר-עמוד עד סוף התוצאות.
 * חשוב לשליפות "כל המשתמשים": ברגע שיעברו 1000 משתמשים, בקשה יחידה הייתה
 * נחתכת בשקט והמונים/רשימות היו מציגים חלק בלבד.
 */
export async function findStrapiUpUsersAll(
    params: Record<string, string> = {},
    jwt?: string,
): Promise<unknown[]> {
    const out: unknown[] = [];
    for (let page = 0; page < ALL_MAX_PAGES; page++) {
        const batch = await findStrapiUpUsers({
            ...params,
            'pagination[start]': String(page * ALL_PAGE_SIZE),
            'pagination[limit]': String(ALL_PAGE_SIZE),
        }, jwt);
        out.push(...batch);
        if (batch.length < ALL_PAGE_SIZE) return out;
    }
    console.warn(`[Strapi] findStrapiUpUsersAll hit the ${ALL_MAX_PAGES}-page safety bound`);
    return out;
}

export async function findStrapiUpUsers(params: Record<string, string>, jwt?: string): Promise<unknown[]> {
    const url = new URL(STRAPI_URL + '/api/users');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
        headers: getHeaders(jwt),
        signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
        // 401/403 → [] (התנהגות מקורית): עשרות קוראים (getUserByEmail/AnyId/
        // getAllUsers כ-fallback) מסתמכים על "ריק"=לא-נמצא ואינם עטופים ב-try/catch;
        // זריקה כאן הייתה מפילה אותם ב-500 על תקלת הרשאה רגעית. את התקיעה הדביקה
        // (15 שניות) פותר getUserById שכבר לא שומר undefined ב-cache.
        if (res.status === 401 || res.status === 403) return [];
        const text = await res.text();
        throw new Error(`[Strapi] GET /api/users → ${res.status}: ${text}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data ?? []);
}

/**
 * PUT /api/users/:id (users-permissions)
 * Uses STRAPI_TOKEN by default; pass user jwt to use user's own permissions
 */
export async function updateStrapiUpUser(id: number, data: Record<string, unknown>, jwt?: string): Promise<unknown> {
    const res = await fetch(STRAPI_URL + `/api/users/${id}`, {
        method:  'PUT',
        headers: getHeaders(jwt),
        body:    JSON.stringify(data),
        signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] PUT /api/users/${id} → ${res.status}: ${text}`);
    }
    return res.json();
}

/**
 * הרשמה עם שם משתמש, אימייל + סיסמה. זורק StrapiAuthError מובחן.
 * כש-email confirmation מופעל בבאקאנד — התשובה חוזרת בלי jwt (המשתמש יאשר במייל);
 * כשהוא כבוי — jwt חוזר מיד וניתן לחבר את המשתמש אוטומטית.
 */
export async function strapiRegister(username: string, email: string, password: string): Promise<Partial<StrapiAuthResponse>> {
    let res: Response;
    try {
        res = await fetch(STRAPI_URL + '/api/auth/local/register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, email, password }),
            signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
    } catch (e) {
        throw new StrapiAuthError('REGISTER', 0, e instanceof Error ? e.message : String(e));
    }
    if (!res.ok) {
        throw new StrapiAuthError('REGISTER', res.status, await res.text());
    }
    return res.json() as Promise<Partial<StrapiAuthResponse>>;
}
