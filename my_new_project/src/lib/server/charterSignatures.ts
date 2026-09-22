// ============================================================
// charterSignatures.ts - זיהוי אוטומטי של חתימה על אמנת המוסר (UECC)
//
// החתימות נשמרות באתר-האחות "חכמי העדה" (chachmim.gofreeil.com), אבל על
// אותו באקאנד Strapi משותף שהקהילה כבר מדברת איתו. במקום לדרוש מהמפרסם
// לסמן תיבה בטופס, בודקים כאן מול רשימת החתומים - ואם יש התאמה, תווית
// "חתום על אמנת המוסר" מופיעה אצלו לבד.
//
// ההתאמה נעשית לפי שלושה מפתחות, כי הטלפון לבדו לא מספיק: בטופס החתימה
// יש מי שהקליד את המספר בלי הקידומת (למשל 8750632 במקום 0508750632),
// ואז שום השוואה מלאה לא תתפוס אותו.
//   1. אימייל של בעל הכרטיס (המדויק מכולם - ראה ownerEmail)
//   2. טלפון מלא, מנורמל
//   3. חתימה שנרשמה בשבע ספרות → השוואה לשבע הספרות האחרונות של הטלפון
//
// השדות phone/email ב-ch-charter-signature מסומנים private בסכמה, ולכן
// חסומים מנקודות הקצה הרגילות של Strapi (REST find/findOne) גם עם
// STRAPI_TOKEN - לכן יש נתיב ייעודי בבאקאנד (GET /ch-charter-signatures/
// signed-contacts, שרת-לשרת בלבד) שחושף רק טלפון+מייל למי שחתום בפועל.
// ============================================================

import { strapiGet } from './strapiClient';
import { cached } from './cache';
import { getUserById } from './db';

// רשימת החתומים כמעט לא משתנה - 5 דקות מספיקות כדי לא להעמיס על הבאקאנד
// המשותף, ומספיק מהר כדי שהתווית תופיע בסמוך לחתימה בפועל.
const TTL_CHARTER_SIGNED = 5 * 60_000;

interface SignedContacts {
    /** טלפונים מלאים, מנורמלים */
    phones: Set<string>;
    /** חתימות שנרשמו בלי קידומת (7 ספרות) - משווים אליהן לפי סוף המספר */
    tails: Set<string>;
    emails: Set<string>;
}

const EMPTY: SignedContacts = { phones: new Set(), tails: new Set(), emails: new Set() };

function normalizePhone(p: string | null | undefined): string {
    let d = (p ?? '').replace(/\D/g, '');
    if (d.startsWith('972')) d = '0' + d.slice(3);
    return d;
}

function normalizeEmail(e: string | null | undefined): string {
    return (e ?? '').trim().toLowerCase();
}

async function fetchSignedContacts(): Promise<SignedContacts> {
    try {
        const res = await strapiGet<{ data: { phone?: string | null; email?: string | null }[] }>(
            '/api/ch-charter-signatures/signed-contacts',
        );
        const phones = new Set<string>();
        const tails = new Set<string>();
        const emails = new Set<string>();
        for (const entry of res?.data ?? []) {
            const p = normalizePhone(entry?.phone);
            if (p.length >= 7) {
                phones.add(p);
                if (p.length === 7) tails.add(p);
            }
            const m = normalizeEmail(entry?.email);
            if (m) emails.add(m);
        }
        return { phones, tails, emails };
    } catch (e) {
        // הבאקאנד עדיין לא פרוס עם הנתיב הזה, או תקלת רשת זמנית - לא מפילים
        // את דף הפנויים בגלל זה, פשוט לא מזהים אוטומטית הפעם.
        console.warn('[charterSignatures] fetch signed-contacts failed:', e instanceof Error ? e.message : e);
        return EMPTY;
    }
}

function getSignedContacts(): Promise<SignedContacts> {
    return cached('charter:signed-contacts', TTL_CHARTER_SIGNED, fetchSignedContacts);
}

function isEmpty(c: SignedContacts): boolean {
    return c.phones.size === 0 && c.emails.size === 0;
}

function matches(c: SignedContacts, phone: string | null | undefined, email: string | null | undefined): boolean {
    const m = normalizeEmail(email);
    if (m && c.emails.has(m)) return true;
    const p = normalizePhone(phone);
    if (!p) return false;
    if (c.phones.has(p)) return true;
    if (p.length >= 9 && c.tails.has(p.slice(-7))) return true;
    return false;
}

/**
 * האימייל של בעל הכרטיס לפי user_id. הטלפון בכרטיס והטלפון שהוקלד בחתימה
 * לא תמיד זהים, האימייל של החשבון כן - ולכן זו ההתאמה החזקה ביותר.
 * getUserById כבר עובד מול cache, ולכן זו לא קריאת רשת נוספת בכל טעינה.
 */
export async function ownerEmail(userId: string | null | undefined): Promise<string | undefined> {
    if (!userId) return undefined;
    try {
        return (await getUserById(String(userId)))?.email ?? undefined;
    } catch (e) {
        console.warn('[charterSignatures] ownerEmail failed:', e instanceof Error ? e.message : e);
        return undefined;
    }
}

/** האם הטלפון/האימייל הזה מופיע ברשימת החתומים על אמנת המוסר (חכמי העדה) */
export async function isCharterSigned(
    phone: string | null | undefined,
    email?: string | null,
): Promise<boolean> {
    if (!normalizePhone(phone) && !normalizeEmail(email)) return false;
    return matches(await getSignedContacts(), phone, email);
}

/**
 * מוסיף `ethicsCharter: true` לפרופילים שזוהו אוטומטית מול רשימת החתומים,
 * בלי לדרוס סימון ידני קיים. שולף את רשימת החתומים פעם אחת לכל הקבוצה
 * (לא לכל פרופיל בנפרד) כדי לא להכביד על דף עם הרבה כרטיסים.
 * בלוח הכרטיסים אין אימייל לכל כרטיס, ולכן שם ההתאמה היא לפי טלפון בלבד.
 */
export async function withCharterAutoDetect<T extends { phone?: string; ethicsCharter?: boolean }>(
    profiles: T[],
): Promise<T[]> {
    if (profiles.length === 0) return profiles;
    const signed = await getSignedContacts();
    if (isEmpty(signed)) return profiles;
    return profiles.map((p) => (
        p.ethicsCharter || !p.phone ? p : { ...p, ethicsCharter: matches(signed, p.phone, null) }
    ));
}

/**
 * כמו withCharterAutoDetect, לפרופיל בודד (או null - עובר דרך בלי שינוי).
 * `email` = האימייל של בעל הכרטיס (ownerEmail / session), לא של הצופה.
 */
export async function withCharterAutoDetectOne<T extends { phone?: string; ethicsCharter?: boolean }>(
    profile: T | null,
    email?: string | null,
): Promise<T | null> {
    if (!profile) return profile;
    if (profile.ethicsCharter) return profile;
    const signed = await getSignedContacts();
    if (isEmpty(signed)) return profile;
    return { ...profile, ethicsCharter: matches(signed, profile.phone, email) };
}
