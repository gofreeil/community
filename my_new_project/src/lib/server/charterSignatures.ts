// ============================================================
// charterSignatures.ts - זיהוי אוטומטי של חתימה על אמנת המוסר (UECC)
//
// החתימות נשמרות באתר-האחות "חכמי העדה" (chachmim.gofreeil.com), אבל על
// אותו באקאנד Strapi משותף שהקהילה כבר מדברת איתו. במקום לדרוש מהמפרסם
// לסמן תיבה בטופס, בודקים כאן מול רשימת החתומים לפי מספר טלפון - ואם יש
// התאמה, תווית "חתום על אמנת המוסר" מופיעה אצלו לבד.
//
// השדות phone/email ב-ch-charter-signature מסומנים private בסכמה, ולכן
// חסומים מנקודות הקצה הרגילות של Strapi (REST find/findOne) גם עם
// STRAPI_TOKEN - לכן יש נתיב ייעודי בבאקאנד (GET /ch-charter-signatures/
// signed-contacts, שרת-לשרת בלבד) שחושף רק טלפון+מייל למי שחתום בפועל.
// ============================================================

import { strapiGet } from './strapiClient';
import { cached } from './cache';

// רשימת החתומים כמעט לא משתנה - 5 דקות מספיקות כדי לא להעמיס על הבאקאנד
// המשותף, ומספיק מהר כדי שהתווית תופיע בסמוך לחתימה בפועל.
const TTL_CHARTER_SIGNED = 5 * 60_000;

function normalizePhone(p: string | null | undefined): string {
    let d = (p ?? '').replace(/\D/g, '');
    if (d.startsWith('972')) d = '0' + d.slice(3);
    return d;
}

async function fetchSignedPhones(): Promise<Set<string>> {
    try {
        const res = await strapiGet<{ data: { phone?: string | null }[] }>('/api/ch-charter-signatures/signed-contacts');
        return new Set(
            (res?.data ?? [])
                .map((e) => normalizePhone(e?.phone))
                .filter((p) => p.length > 0),
        );
    } catch (e) {
        // הבאקאנד עדיין לא פרוס עם הנתיב הזה, או תקלת רשת זמנית - לא מפילים
        // את דף הפנויים בגלל זה, פשוט לא מזהים אוטומטית הפעם.
        console.warn('[charterSignatures] fetch signed-contacts failed:', e instanceof Error ? e.message : e);
        return new Set<string>();
    }
}

function getSignedCharterPhones(): Promise<Set<string>> {
    return cached('charter:signed-phones', TTL_CHARTER_SIGNED, fetchSignedPhones);
}

/** האם הטלפון הזה מופיע ברשימת החתומים על אמנת המוסר (חכמי העדה) */
export async function isCharterSigned(phone: string | null | undefined): Promise<boolean> {
    const p = normalizePhone(phone);
    if (!p) return false;
    const signed = await getSignedCharterPhones();
    return signed.has(p);
}

/**
 * מוסיף `ethicsCharter: true` לפרופילים שזוהו אוטומטית מול רשימת החתומים,
 * בלי לדרוס סימון ידני קיים. שולף את רשימת החתומים פעם אחת לכל הקבוצה
 * (לא לכל פרופיל בנפרד) כדי לא להכביד על דף עם הרבה כרטיסים.
 */
export async function withCharterAutoDetect<T extends { phone?: string; ethicsCharter?: boolean }>(
    profiles: T[],
): Promise<T[]> {
    if (profiles.length === 0) return profiles;
    const signed = await getSignedCharterPhones();
    if (signed.size === 0) return profiles;
    return profiles.map((p) => (
        p.ethicsCharter || !p.phone ? p : { ...p, ethicsCharter: signed.has(normalizePhone(p.phone)) }
    ));
}

/** כמו withCharterAutoDetect, לפרופיל בודד (או null - עובר דרך בלי שינוי) */
export async function withCharterAutoDetectOne<T extends { phone?: string; ethicsCharter?: boolean }>(
    profile: T | null,
): Promise<T | null> {
    if (!profile) return profile;
    const [result] = await withCharterAutoDetect([profile]);
    return result;
}
