import { json, type RequestHandler } from '@sveltejs/kit';
import { createItem, getUserById } from '$lib/server/db';

/**
 * Sends a "landing page editor is ready" message to the logged-in user's personal area
 * (messages tab). Triggered when the user completes step 7 in the ad builder and the
 * landing-page editor opens in a separate page.
 */
export const POST: RequestHandler = async ({ locals }) => {
    let session = null;
    try { session = await locals.auth?.(); } catch { /* anonymous */ }

    const userId = session?.user?.id ? String(session.user.id) : '';
    if (!userId) {
        // Anonymous flow - nothing to deliver to a personal area. Treat as success
        // so the client doesn't block; the user simply won't see a message.
        return json({ success: true, delivered: false });
    }

    let userNickname = '';
    let userName     = session?.user?.name ?? '';
    try {
        const dbUser = await getUserById(userId);
        userNickname = dbUser?.nickname ?? '';
    } catch { /* ignore */ }

    const editPath = '/about/advertise/builder/landing';
    const description =
        `הפרסומת שלך מוכנה - והגעת לשלב עיצוב דף הנחיתה.\n\n` +
        `דף הנחיתה הוא הדף הפנימי שיוצג לגולש כשהוא לוחץ על הפרסומת שלך - שם תוכל להציג ` +
        `את העסק/השירות במלואו: כותרת, תיאור, יתרונות, תמונה גדולה ועוד.\n\n` +
        `לחיצה על הקישור תפתח את עורך דף הנחיתה - הטיוטה שלך נשמרת אוטומטית.\n\n` +
        `קישור לעריכה: ${editPath}`;

    try {
        await createItem({
            category: 'message',
            label:    `📝 דף עריכת הפרסום שלך מוכן`,
            description,
            icon:     '📝',
            color:    'amber',
            user_id:  userId,
            extra_fields: {
                type:         'ad_landing_ready',
                edit_link:    editPath,
                user_id:      userId,
                user_name:    userName,
                user_nickname: userNickname,
                created_at:   new Date().toISOString(),
            },
        });
    } catch (e) {
        console.warn('[landing-ready] notify user failed:', e);
        return json({ success: false, delivered: false }, { status: 500 });
    }

    return json({ success: true, delivered: true });
};
