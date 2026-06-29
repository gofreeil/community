import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import QRCode from 'qrcode';
import {
    getAdminTotpSecret,
    generateSecret,
    buildOtpauthUri,
    verifyTotp,
} from '$lib/server/totp';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

    const email = session.user.email ?? 'admin';
    const configured = !!getAdminTotpSecret(email);

    // אם כבר מוגדר - לא חושפים אותו שוב; רק מציינים שהוא פעיל.
    if (configured) {
        return { configured: true, email, secret: null, otpauthUri: null, qrDataUrl: null };
    }

    // טרם הוגדר - מחוללים סוד חדש להצגה חד-פעמית (המנהל ישמור אותו ב-env)
    const secret = generateSecret();
    const otpauthUri = buildOtpauthUri(email, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 240 });
    return { configured: false, email, secret, otpauthUri, qrDataUrl };
};

export const actions: Actions = {
    // בדיקה שהסוד הוטמע באפליקציה כראוי - לפני שהמנהל שם אותו ב-env
    test: async (event) => {
        const session = await event.locals.auth();
        if (session?.user?.role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');

        const formData = await event.request.formData();
        const secret = (formData.get('secret') as string) ?? '';
        const code = (formData.get('code') as string) ?? '';
        if (!secret) return { tested: true, ok: false, message: 'חסר סוד' };

        const ok = verifyTotp(secret, code);
        return {
            tested: true,
            ok,
            message: ok
                ? '✅ הקוד תקין! כעת הוסף את הסוד ל-env ב-Vercel ובצע Redeploy.'
                : '❌ קוד שגוי. ודא שסרקת את ה-QR ושהשעון מסונכרן.',
        };
    },
};
