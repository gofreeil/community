import { json } from '@sveltejs/kit';
import { getUserById, updateUserProfile } from '$lib/server/db';
import { invalidateCachedUser } from '$lib/server/userCache';
import { resendConfirmation } from '$lib/server/strapiClient';
import { userTier, type TierUserFields } from '$lib/tiers';
import type { RequestHandler } from './$types';

/**
 * שדרוג דרגת הרשמה: מקבל בדיוק את השדות החסרים מפאנל ה-LevelUpCard (עיר/שכונה/
 * טלפון/מין/תאריך-לידה), מעדכן את הפרופיל ומחזיר את הדרגה החדשה. כך המשתמש
 * משלים במקום וממשיך בפעולה — בלי ניתוב לדף הפרופיל וחזרה.
 *
 * action: 'verify_email' → שולח מייל אימות (למי שאימות-מייל מופעל עבורו).
 */
export const POST: RequestHandler = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* עוגייה פגומה */ }
    if (!session?.user?.id) return json({ ok: false, error: 'not_authenticated' }, { status: 401 });
    const uid = session.user.id as string;

    let body: Record<string, unknown> = {};
    try { body = (await event.request.json()) ?? {}; } catch { /* גוף ריק */ }

    // בקשת אימות מייל — פעולה נפרדת
    if (body.action === 'verify_email') {
        const email = (session.user.email as string | undefined) ?? '';
        if (!email) return json({ ok: false, error: 'no_email' }, { status: 400 });
        try {
            await resendConfirmation(email);
            return json({ ok: true, emailSent: true });
        } catch (e) {
            console.warn('[tier/upgrade] verify_email failed:', e);
            return json({ ok: false, error: 'send_failed' }, { status: 503 });
        }
    }

    // ---- עדכון שדות פרופיל ----
    const updates: Record<string, string> = {};
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

    const city         = str(body.city);
    const neighborhood = str(body.neighborhood);
    const phone        = str(body.phone);
    const gender       = str(body.gender);
    const birth_date   = str(body.birth_date);

    if (city)         updates.city         = city;
    if (neighborhood) updates.neighborhood = neighborhood;
    if (phone) {
        if (phone.replace(/\D/g, '').length < 9) {
            return json({ ok: false, error: 'invalid_phone' }, { status: 400 });
        }
        updates.phone = phone;
    }
    if (gender)     updates.gender     = gender;
    if (birth_date) updates.birth_date = birth_date;

    if (Object.keys(updates).length === 0) {
        return json({ ok: false, error: 'nothing_to_update' }, { status: 400 });
    }

    try {
        const jwt = event.cookies.get('strapi_jwt');
        await updateUserProfile(uid, updates, jwt);
        invalidateCachedUser(uid);
    } catch (e) {
        console.error('[tier/upgrade] update failed:', e);
        return json({ ok: false, error: 'update_failed' }, { status: 503 });
    }

    // דרגה מעודכנת מהמשתמש הטרי (אחרי ה-invalidate)
    let tier = 1;
    try {
        const fresh = await getUserById(uid, event.cookies.get('strapi_jwt'));
        tier = userTier(fresh as TierUserFields | undefined);
    } catch { /* לא קריטי — הקליינט יחשב לבד */ }

    return json({ ok: true, tier });
};
