import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import QRCode from 'qrcode';
import {
    generateSecret,
    buildOtpauthUri,
    verifyTotp,
    makeTrustToken,
    TRUST_COOKIE_NAME,
    TRUST_COOKIE_MAX_AGE,
} from '$lib/server/totp';
import { getUserTotpSecret, setUserTotpSecret } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

    const email = session.user.email ?? 'admin';

    // כבר מופעל - לא חושפים אותו שוב; רק מציינים שהוא פעיל.
    if (await getUserTotpSecret(session.user.id!)) {
        return { configured: true, secret: null, qrDataUrl: null };
    }

    // טרם הופעל - מחוללים סוד חדש להצגה. ההפעלה אטומית (action enable מאמת
    // ושומר את אותו הסוד), כך שאין סיכון שה-QR שנסרק לא יתאים לסוד השמור.
    const secret = generateSecret();
    const otpauthUri = buildOtpauthUri(email, secret, 'קהילה בשכונה (מנהל)');
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 240 });
    return { configured: false, secret, qrDataUrl };
};

export const actions: Actions = {
    // הפעלה: מאמתים קוד מול הסוד שהוצג, ואז שומרים אותו על המשתמש ומסמנים
    // את המכשיר הנוכחי כמהימן — הכל בצעד אחד.
    enable: async (event) => {
        const session = await event.locals.auth();
        if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

        const formData = await event.request.formData();
        const secret = (formData.get('secret') as string) ?? '';
        const code = (formData.get('code') as string) ?? '';
        if (!secret) return { done: true, ok: false, message: 'חסר סוד' };

        if (!verifyTotp(secret, code)) {
            return { done: true, ok: false, message: '❌ קוד שגוי. ודא שסרקת את ה-QR ושהשעון בטלפון מסונכרן.' };
        }

        await setUserTotpSecret(session.user.id!, secret);

        const identity = session.user.email ?? session.user.id!;
        event.cookies.set(TRUST_COOKIE_NAME, makeTrustToken(identity, secret), {
            path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: TRUST_COOKIE_MAX_AGE,
        });

        return { done: true, ok: true, message: '✅ אימות דו-שלבי הופעל! מעכשיו תתבקש קוד בכל כניסה ממכשיר חדש.' };
    },

    // ביטול: דורש קוד תקף מהאפליקציה כדי לכבות 2FA
    disable: async (event) => {
        const session = await event.locals.auth();
        if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

        const secret = await getUserTotpSecret(session.user.id!);
        if (!secret) return { done: true, ok: true, disabled: true, message: '2FA כבר אינו פעיל.' };

        const formData = await event.request.formData();
        const code = (formData.get('code') as string) ?? '';
        if (!verifyTotp(secret, code)) {
            return { done: true, ok: false, message: '❌ קוד שגוי. לביטול ה-2FA נדרש קוד תקף מהאפליקציה.' };
        }

        await setUserTotpSecret(session.user.id!, null);
        event.cookies.delete(TRUST_COOKIE_NAME, { path: '/' });
        return { done: true, ok: true, disabled: true, message: '🔓 אימות דו-שלבי בוטל.' };
    },
};
