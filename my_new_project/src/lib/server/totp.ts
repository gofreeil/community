// ============================================================
// totp.ts - אימות דו-שלבי (2FA) לסופר-אדמין ולרכזים
//
// • TOTP (RFC 6238, תואם Google Authenticator) - מומש עם node:crypto בלבד,
//   בלי תלות חיצונית.
// • "מכשיר מהימן" - אחרי אימות TOTP מוצלח קובעים עוגייה חתומה; באותו דפדפן
//   לא מבקשים קוד שוב. מכשיר/דפדפן חדש = אין עוגייה = מבקשים קוד.
//
// הסוד עצמו נשמר פר-משתמש ב-DB (שדה totp_secret על המשתמש) — ראה
// getUserTotpSecret/setUserTotpSecret ב-db.ts. ההפעלה אטומית: מאמתים קוד מול
// הסוד ושומרים אותו באותו צעד, כך שלעולם אין פער בין ה-QR שנסרק לסוד השמור.
// ============================================================

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

const AUTH_SECRET = process.env.AUTH_SECRET ?? '';
const PERIOD = 30; // שניות לכל קוד
const DIGITS = 6;
const TRUST_COOKIE = 'admin_trust';
const TRUST_MAX_AGE = 60 * 60 * 24 * 180; // 180 יום

// ============================================================
// ---- Base32 (RFC 4648) ----
// ============================================================

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Buffer {
    const clean = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const ch of clean) {
        const idx = B32_ALPHABET.indexOf(ch);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bits -= 8;
            out.push((value >>> bits) & 0xff);
        }
    }
    return Buffer.from(out);
}

function base32Encode(buf: Buffer): string {
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            out += B32_ALPHABET[(value >>> bits) & 31];
        }
    }
    if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
    return out;
}

// ============================================================
// ---- TOTP ----
// ============================================================

/** מחשב קוד TOTP ל-counter נתון */
function hotp(secret: Buffer, counter: number): string {
    const buf = Buffer.alloc(8);
    // counter ל-8 בייט big-endian (JS bitwise מוגבל ל-32 ביט → מחלקים)
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter >>> 0, 4);
    const hmac = createHmac('sha1', secret).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    return (code % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/**
 * מאמת קוד TOTP. window=2 → סובלנות של ±60 שניות לסחיפת שעון בין הטלפון לשרת
 * (סיבה נפוצה ל"קוד שגוי" כשהשעון בטלפון לא מסונכרן לגמרי).
 * משווה בזמן-קבוע כדי למנוע timing attacks.
 */
export function verifyTotp(secretBase32: string, token: string, window = 2): boolean {
    const cleaned = (token ?? '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleaned)) return false;
    const secret = base32Decode(secretBase32);
    if (secret.length === 0) return false;
    const counter = Math.floor(Date.now() / 1000 / PERIOD);
    for (let i = -window; i <= window; i++) {
        const expected = hotp(secret, counter + i);
        if (
            expected.length === cleaned.length &&
            timingSafeEqual(Buffer.from(expected), Buffer.from(cleaned))
        ) {
            return true;
        }
    }
    return false;
}

// ============================================================
// ---- ניהול הסוד ----
// הסוד נשמר/נקרא ב-DB (db.ts: getUserTotpSecret/setUserTotpSecret).
// כאן רק חישוב ה-TOTP, חילול סוד, ובניית ה-otpauth URI.
// ============================================================

/** מחולל סוד base32 חדש (להגדרה ראשונית) */
export function generateSecret(): string {
    return base32Encode(randomBytes(20));
}

/** בונה otpauth:// URI לסריקה ב-Google Authenticator */
export function buildOtpauthUri(email: string, secret: string, issuer = 'קהילה בשכונה'): string {
    const label = encodeURIComponent(`${issuer}:${email}`);
    const params = new URLSearchParams({
        secret,
        issuer,
        algorithm: 'SHA1',
        digits: String(DIGITS),
        period: String(PERIOD),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}

// ============================================================
// ---- עוגיית מכשיר מהימן (חתומה) ----
// ============================================================

/**
 * חתימת אסימון מכשיר-מהימן. קשור גם לאימייל וגם לסוד ה-TOTP, כך שהחלפת
 * הסוד (rotate) פוסלת אוטומטית את כל המכשירים המהימנים - מנגנון "נתק הכל".
 */
function sign(email: string, secret: string): string {
    return createHmac('sha256', `${AUTH_SECRET}:${secret}`)
        .update(email.trim().toLowerCase())
        .digest('hex');
}

export const TRUST_COOKIE_NAME = TRUST_COOKIE;
export const TRUST_COOKIE_MAX_AGE = TRUST_MAX_AGE;

/** עוגיית מכשיר-מהימן נפרדת לאזור הרכזים (בלתי תלויה בעוגיית האדמין) */
export const COORD_TRUST_COOKIE_NAME = 'coord_trust';

/** ערך העוגייה לקביעה אחרי אימות מוצלח */
export function makeTrustToken(email: string, secret: string): string {
    return sign(email, secret);
}

/** בדיקה שעוגיית המכשיר המהימן תקפה לאדמין הזה */
export function verifyTrustToken(
    token: string | undefined,
    email: string | null | undefined,
    secret: string,
): boolean {
    if (!token || !email) return false;
    const expected = sign(email, secret);
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

// ============================================================
// ---- קוד חילוץ חד-פעמי למייל (כשאין גישה לאפליקציית האימות) ----
//
// אתגר חתום (nonce + תפוגה) יושב בעוגייה קצרת-חיים בדפדפן שביקש אותו,
// והקוד שנגזר ממנו נשלח למייל של המנהל. אין שום מצב בשרת: האימות בודק
// חתימה + תוקף + התאמת קוד בלבד, והצלחה מוחקת את העוגייה — חד-פעמיות בפועל.
// הגזירה קשורה גם לסוד ה-TOTP, כך שאיפוס הסוד מבטל מיד כל קוד שכבר נשלח.
// ============================================================

const RESCUE_COOKIE = 'admin_rescue';
const RESCUE_MAX_AGE = 60 * 10; // 10 דקות
const RESCUE_DIGITS = 8;

export const RESCUE_COOKIE_NAME = RESCUE_COOKIE;
export const RESCUE_COOKIE_MAX_AGE = RESCUE_MAX_AGE;

function rescueSig(identity: string, payload: string): string {
    return createHmac('sha256', `${AUTH_SECRET}:rescue-cookie`)
        .update(`${identity.trim().toLowerCase()}:${payload}`)
        .digest('hex');
}

function rescueCode(identity: string, secret: string, payload: string): string {
    const mac = createHmac('sha256', `${AUTH_SECRET}:${secret}:rescue-code`)
        .update(`${identity.trim().toLowerCase()}:${payload}`)
        .digest();
    return (mac.readBigUInt64BE(0) % BigInt(10 ** RESCUE_DIGITS)).toString().padStart(RESCUE_DIGITS, '0');
}

/** אתגר חילוץ חדש: ערך עוגייה חתום + הקוד שיישלח למייל (לא נשמר בשום מקום) */
export function makeRescueChallenge(identity: string, secret: string): { cookie: string; code: string } {
    const payload = `${randomBytes(16).toString('hex')}.${Math.floor(Date.now() / 1000) + RESCUE_MAX_AGE}`;
    return { cookie: `${payload}.${rescueSig(identity, payload)}`, code: rescueCode(identity, secret, payload) };
}

/** אימות קוד חילוץ מול עוגיית האתגר: חתימה, תוקף, והשוואת קוד בזמן-קבוע */
export function verifyRescueChallenge(
    cookieValue: string | undefined,
    identity: string | null | undefined,
    secret: string,
    code: string,
): boolean {
    if (!cookieValue || !identity) return false;
    const parts = cookieValue.split('.');
    if (parts.length !== 3) return false;

    const payload = `${parts[0]}.${parts[1]}`;
    const expectedSig = Buffer.from(rescueSig(identity, payload));
    const actualSig = Buffer.from(parts[2]);
    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) return false;
    if (!/^\d+$/.test(parts[1]) || Number(parts[1]) < Math.floor(Date.now() / 1000)) return false;

    const cleaned = (code ?? '').replace(/\s+/g, '');
    if (!new RegExp(`^\\d{${RESCUE_DIGITS}}$`).test(cleaned)) return false;
    const expectedCode = Buffer.from(rescueCode(identity, secret, payload));
    const actualCode = Buffer.from(cleaned);
    return expectedCode.length === actualCode.length && timingSafeEqual(expectedCode, actualCode);
}
