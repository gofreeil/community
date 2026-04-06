// ============================================================
// Strapi 5 HTTP Client
// כל הבקשות לבאקאנד עוברות דרך כאן
// ============================================================

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

/** שגיאה ייחודית ל-content type לא רשום (404/400 מ-Strapi) */
export class StrapiContentTypeError extends Error {
    constructor(path: string, status: number) {
        super(`[Strapi] Content type not registered: ${path} (${status})`);
        this.name = 'StrapiContentTypeError';
    }
}

function getHeaders(jwt?: string): HeadersInit {
    return {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
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
            const res = await fetch(url.toString(), { headers: getHeaders(jwt) });
            if (res.ok) return res.json() as Promise<T>;

            const text = await res.text();

            if (isContentTypeError(res.status, text)) {
                throw new StrapiContentTypeError(path, res.status);
            }
            if (!isRetryable(res.status)) {
                throw new Error(`[Strapi] GET ${path} → ${res.status}: ${text}`);
            }
            lastError = new Error(`[Strapi] GET ${path} → ${res.status}: ${text}`);
        } catch (e) {
            if (e instanceof StrapiContentTypeError) throw e;
            lastError = e instanceof Error ? e : new Error(String(e));
        }

        if (attempt < RETRY_ATTEMPTS) {
            console.warn(`[Strapi] GET ${path} — retry ${attempt}/${RETRY_ATTEMPTS - 1}`);
            await delay(RETRY_DELAY_MS * attempt);
        }
    }
    throw lastError!;
}

export async function strapiPost<T = unknown>(path: string, body: unknown, jwt?: string): Promise<T> {
    const res = await fetch(STRAPI_URL + path, {
        method:  'POST',
        headers: getHeaders(jwt),
        body:    JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        if (isContentTypeError(res.status, text)) throw new StrapiContentTypeError(path, res.status);
        throw new Error(`[Strapi] POST ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

export async function strapiPut<T = unknown>(path: string, body: unknown, jwt?: string): Promise<T> {
    const res = await fetch(STRAPI_URL + path, {
        method:  'PUT',
        headers: getHeaders(jwt),
        body:    JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        if (isContentTypeError(res.status, text)) throw new StrapiContentTypeError(path, res.status);
        throw new Error(`[Strapi] PUT ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

// ============================================================
// ---- Auth (users-permissions plugin — ללא token) ----
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

/** לוגין עם אימייל + סיסמה */
export async function strapiLogin(identifier: string, password: string): Promise<StrapiAuthResponse> {
    const res = await fetch(STRAPI_URL + '/api/auth/local', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] LOGIN → ${res.status}: ${text}`);
    }
    return res.json() as Promise<StrapiAuthResponse>;
}

/** הרשמה עם שם משתמש, אימייל + סיסמה */
export async function strapiRegister(username: string, email: string, password: string): Promise<StrapiAuthResponse> {
    const res = await fetch(STRAPI_URL + '/api/auth/local/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, email, password }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Strapi] REGISTER → ${res.status}: ${text}`);
    }
    return res.json() as Promise<StrapiAuthResponse>;
}
