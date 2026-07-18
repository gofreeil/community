import { json } from '@sveltejs/kit';
import { createItem, getDbItemById } from '$lib/server/db';
import { getMatchmakerStatus } from '$lib/server/matchmaker';
import type { RequestHandler } from './$types';

function nameOf(item: { contact: string; extra_fields: string }): string {
    try {
        const ef = JSON.parse(item.extra_fields || '{}');
        if (typeof ef.nickname === 'string' && ef.nickname.trim()) return ef.nickname.trim();
    } catch { /* ignore */ }
    return item.contact || 'פנוי/ה';
}

// שדכן מאושר ממליץ על זוג: שולח לכל אחד מבעלי הכרטיסים הודעה שתפנה אותו
// לעיין בכרטיס של השני. אין חשיפת פרטים — רק הפניה לכרטיס הפומבי.
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    }
    const isSuperAdmin = session.user.role === 'super_admin';

    // אימות הרשאת שדכנות
    const status = await getMatchmakerStatus(session.user.id as string, isSuperAdmin);
    if (status !== 'approved') {
        return json({ success: false, message: 'נדרשת הרשאת שדכן מערכת' }, { status: 403 });
    }

    let body: { aId?: string; bId?: string } = {};
    try { body = await event.request.json(); } catch { /* empty */ }
    const aId = String(body?.aId ?? '').trim();
    const bId = String(body?.bId ?? '').trim();
    if (!aId || !bId || aId === bId) {
        return json({ success: false, message: 'פרמטרים שגויים' }, { status: 400 });
    }

    try {
        const [a, b] = await Promise.all([getDbItemById(aId), getDbItemById(bId)]);
        if (!a || !b || a.category !== 'singles' || b.category !== 'singles') {
            return json({ success: false, message: 'כרטיס לא נמצא' }, { status: 404 });
        }
        if (!a.user_id && !b.user_id) {
            return json({ success: false, message: 'לכרטיסים אלה אין בעלים לשליחת הודעה' }, { status: 400 });
        }

        const aName = nameOf(a);
        const bName = nameOf(b);
        const msg = (otherName: string, otherId: string) => ({
            category: 'message' as const,
            label: '💘 שדכן/ית ממליץ/ה — הצצה לכרטיס',
            description: `שדכן/ית מ"קהילה בשכונה" חושב/ת שאולי יש כאן התאמה. הצצו לכרטיס של ${otherName}: /items/${otherId}`,
            contact: '',
            icon: '💘',
            color: 'pink',
            extra_fields: { type: 'matchmaker_recommendation', read: false, link: `/items/${otherId}` },
        });

        const sends: Promise<unknown>[] = [];
        if (a.user_id) sends.push(createItem({ ...msg(bName, b.id), user_id: a.user_id }));
        if (b.user_id) sends.push(createItem({ ...msg(aName, a.id), user_id: b.user_id }));
        await Promise.all(sends);

        return json({ success: true, notified: sends.length });
    } catch (e) {
        console.error('[matchmaker-recommend POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
