import { json } from '@sveltejs/kit';
import { getUserById, updateUserProfile, type UpdateProfileData } from '$lib/server/db';
import { invalidateCachedUser } from '$lib/server/userCache';
import { userTier, type TierUserFields } from '$lib/tiers';
import type { RequestHandler } from './$types';

/**
 * שמירה חלקית מכל שלב באשף ההרשמה (onboarding). מקבל תת-קבוצה של שדות הפרופיל
 * ומעדכן רק את מה שנשלח — updateUserProfile בודק לכל שדה !== undefined, כך
 * שדילוג על שלב לא דורס שדות אחרים. כל השלבים רשות (מלבד אישור התנאים, שנאכף
 * בצד-לקוח בשלב האחרון).
 */
export const POST: RequestHandler = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* עוגייה פגומה */ }
    if (!session?.user?.id) return json({ ok: false, error: 'not_authenticated' }, { status: 401 });
    const uid = session.user.id as string;

    let body: Record<string, unknown> = {};
    try { body = (await event.request.json()) ?? {}; } catch { /* גוף ריק */ }

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const updates: UpdateProfileData = {};

    // שלב 1 — כתובת + בסיס
    if (typeof body.city === 'string')         updates.city         = str(body.city);
    if (typeof body.neighborhood === 'string') updates.neighborhood = str(body.neighborhood);
    if (typeof body.status === 'string')       updates.status       = str(body.status);
    if (typeof body.phone === 'string') {
        const p = str(body.phone);
        if (p) {
            if (p.replace(/\D/g, '').length < 9) return json({ ok: false, error: 'invalid_phone' }, { status: 400 });
            updates.phone = p;
        }
    }
    // תמונת פרופיל: data-URL מוקטן שנוצר בצד-לקוח
    if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('data:image/')) {
        updates.avatar_url = body.avatar_url;
    }

    // שלב 2 — פרטים אישיים
    if (typeof body.family_status === 'string') updates.family_status = str(body.family_status);
    if (typeof body.birth_date === 'string')    updates.birth_date    = str(body.birth_date);
    if (typeof body.gender === 'string')        updates.gender        = str(body.gender);

    // שלב 3 — אבטחה + הסכמות
    if (typeof body.security_question === 'string')   updates.security_question   = str(body.security_question);
    if (typeof body.security_answer === 'string')     updates.security_answer     = str(body.security_answer);
    if (typeof body.security_question_2 === 'string') updates.security_question_2 = str(body.security_question_2);
    if (typeof body.security_answer_2 === 'string')   updates.security_answer_2   = str(body.security_answer_2);
    if (typeof body.notifications === 'boolean')      updates.notifications       = body.notifications ? 1 : 0;

    if (Object.keys(updates).length === 0) {
        return json({ ok: true, tier: 1, nothing: true });
    }

    try {
        const jwt = event.cookies.get('strapi_jwt');
        await updateUserProfile(uid, updates, jwt);
        invalidateCachedUser(uid);
    } catch (e) {
        console.error('[onboarding] update failed:', e);
        return json({ ok: false, error: 'update_failed' }, { status: 503 });
    }

    let tier = 1;
    try {
        const fresh = await getUserById(uid, event.cookies.get('strapi_jwt'));
        tier = userTier(fresh as TierUserFields | undefined);
    } catch { /* הקליינט לא תלוי בזה */ }

    return json({ ok: true, tier });
};
