import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import QRCode from 'qrcode';
import {
    generateSecret,
    buildOtpauthUri,
    verifyTotp,
    makeTrustToken,
    COORD_TRUST_COOKIE_NAME,
    TRUST_COOKIE_MAX_AGE,
} from '$lib/server/totp';
import { getUserById, getUserTotpSecret, setUserTotpSecret } from '$lib/server/db';
import type { DbUser } from '$lib/server/db';

/** רכז (יש לו שכונה אחת לפחות) או מנהל זכאי להפעיל 2FA על אזור הרכזים */
function isEligible(user: DbUser): boolean {
    return (user.coordinator_of?.length ?? 0) > 0
        || user.role === 'neighborhood_admin'
        || user.role === 'super_admin';
}

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* ignore */ }
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator/2fa-setup');

    const user = await getUserById(session.user.id);
    if (!user || !isEligible(user)) throw error(403, 'דף זה זמין רק לרכזי שכונות');

    // כבר מופעל — לא חושפים סוד שוב, רק מציינים שהוא פעיל
    if (await getUserTotpSecret(session.user.id)) {
        return { configured: true, secret: null, qrDataUrl: null };
    }

    const label = user.email || user.name || 'רכז';
    const secret = generateSecret();
    const otpauthUri = buildOtpauthUri(label, secret, 'קהילה בשכונה (רכז)');
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 240 });
    return { configured: false, secret, qrDataUrl };
};

export const actions: Actions = {
    // הפעלה: מאמתים קוד מול הסוד שהוצג, ואז שומרים אותו על המשתמש
    enable: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch { /* ignore */ }
        if (!session?.user?.id) throw error(401, 'נדרשת התחברות');

        const user = await getUserById(session.user.id);
        if (!user || !isEligible(user)) throw error(403, 'אין הרשאה');

        const formData = await event.request.formData();
        const secret = (formData.get('secret') as string) ?? '';
        const code = (formData.get('code') as string) ?? '';
        if (!secret) return { done: true, ok: false, message: 'חסר סוד' };

        if (!verifyTotp(secret, code)) {
            return { done: true, ok: false, message: '❌ קוד שגוי. ודא שסרקת את ה-QR ושהשעון בטלפון מסונכרן.' };
        }

        await setUserTotpSecret(session.user.id, secret);

        // מסמנים את המכשיר הנוכחי כמהימן כדי שלא נבקש קוד מיד אחרי ההפעלה
        const identity = session.user.email ?? session.user.id;
        event.cookies.set(COORD_TRUST_COOKIE_NAME, makeTrustToken(identity, secret), {
            path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: TRUST_COOKIE_MAX_AGE,
        });

        return { done: true, ok: true, message: '✅ אימות דו-שלבי הופעל! מעכשיו תתבקש קוד בכל כניסה ממכשיר חדש.' };
    },

    // ביטול: דורש קוד תקף מהאפליקציה כדי לכבות 2FA
    disable: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch { /* ignore */ }
        if (!session?.user?.id) throw error(401, 'נדרשת התחברות');

        const secret = await getUserTotpSecret(session.user.id);
        if (!secret) return { done: true, ok: true, disabled: true, message: '2FA כבר אינו פעיל.' };

        const formData = await event.request.formData();
        const code = (formData.get('code') as string) ?? '';
        if (!verifyTotp(secret, code)) {
            return { done: true, ok: false, message: '❌ קוד שגוי. לביטול ה-2FA נדרש קוד תקף מהאפליקציה.' };
        }

        await setUserTotpSecret(session.user.id, null);
        event.cookies.delete(COORD_TRUST_COOKIE_NAME, { path: '/' });
        return { done: true, ok: true, disabled: true, message: '🔓 אימות דו-שלבי בוטל.' };
    },
};
