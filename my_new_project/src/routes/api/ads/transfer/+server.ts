import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAd, transferAdOwner } from '$lib/server/adsStore';
import { resolveRole } from '$lib/server/adsAdmin';
import { getUserByAnyId, getUserByEmail, getUserByPhone, createItem } from '$lib/server/db';

/**
 * POST /api/ads/transfer  { id, recipient }
 * העברת בעלות על פרסומת למשתמש רשום אחר (לפי אימייל או טלפון) - מתוך
 * "הפרסומות שלי" באזור האישי. הבעלים או סופר-אדמין בלבד; הבדיקה עצמה
 * ב-transferAdOwner. אותו דגם כמו העברת נכס (transfer_owner ב-/api/items).
 */
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth().catch(() => null);
    const userId = session?.user?.id as string | undefined;
    if (!userId && !session?.user?.email) {
        return json({ success: false, message: 'נדרשת התחברות' }, { status: 401 });
    }

    const body = await event.request.json().catch(() => null) as { id?: unknown; recipient?: unknown } | null;
    const id = String(body?.id ?? '').trim();
    const recipientRaw = String(body?.recipient ?? '').trim();
    if (!id) return json({ success: false, message: 'חסר מזהה פרסומת' }, { status: 400 });
    if (!recipientRaw) {
        return json({ success: false, message: 'יש להזין אימייל או טלפון של המקבל' }, { status: 400 });
    }

    // פרסומות המוצרים של החנות נוצרות ע"י המערכת ומנוהלות מ-/admin/shop-ads
    const existing = await getAd(id).catch(() => null);
    if (!existing) return json({ success: false, message: 'הפרסומת לא נמצאה' }, { status: 404 });
    if ((existing.landing as { _shopProduct?: unknown })._shopProduct) {
        return json({ success: false, message: 'פרסומת של מוצר מהחנות אינה ניתנת להעברה' }, { status: 403 });
    }

    const recipient = recipientRaw.includes('@')
        ? await getUserByEmail(recipientRaw)
        : await getUserByPhone(recipientRaw);
    if (!recipient) {
        return json({ success: false, message: 'לא נמצא משתמש רשום עם הפרטים האלה. ודאו שהמקבל רשום לאתר.' }, { status: 404 });
    }
    if (String(recipient.id) === String(userId)) {
        return json({ success: false, message: 'הפרסומת כבר שלך - אי אפשר להעביר לעצמך' }, { status: 400 });
    }
    if (recipient.banned) {
        return json({ success: false, message: 'לא ניתן להעביר למשתמש הזה' }, { status: 403 });
    }

    const giver = userId ? await getUserByAnyId(userId).catch(() => undefined) : undefined;
    const giverName = giver?.name || giver?.nickname || session?.user?.name || 'משתמש/ת';
    const recipientName = recipient.name || recipient.nickname || 'משתמש/ת';
    const role = await resolveRole(event).catch(() => '');

    let ad;
    try {
        ad = await transferAdOwner(
            id,
            { id: userId, email: session?.user?.email ?? undefined, name: giverName },
            { id: String(recipient.id), email: recipient.email ?? undefined, name: recipient.name ?? recipientName },
            { asSuperAdmin: role === 'super_admin' },
        );
    } catch (e) {
        console.error('[ads/transfer] failed:', e);
        return json({ success: false, message: 'שגיאה בהעברת הפרסומת' }, { status: 500 });
    }
    if (!ad) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });

    // הודעה למקבל - best-effort, כשל בה לא מבטל העברה שכבר בוצעה
    try {
        await createItem({
            category: 'message',
            label: '🎁 קיבלת פרסומת',
            description: `${giverName} העביר/ה אליך את הפרסומת "${ad.title}".\n\nהיא מופיעה עכשיו ב"הפרסומות שלי" באזור האישי, ומשם אפשר לערוך אותה. הפרסומת נשארת באתר כמו שהיא - באותו מקום בטור ועם אותו תוקף.`,
            contact: giverName,
            user_id: String(recipient.id),
            icon: '🎁',
            color: 'purple',
            extra_fields: {
                type: 'ad_transferred',
                sender_name: giverName,
                ad_title: ad.title,
                ad_id: ad.id,
                read: false,
            },
        });
    } catch (e) {
        console.warn('[ads/transfer] notify failed:', e instanceof Error ? e.message : e);
    }

    return json({ success: true, recipientName });
};
