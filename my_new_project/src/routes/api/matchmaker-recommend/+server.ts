import { json } from '@sveltejs/kit';
import { createItem, getDbItemById, getItemsByCategory, getUserById } from '$lib/server/db';
import { getMatchmakerStatus } from '$lib/server/matchmaker';
import { dbItemToProfile } from '$lib/singlesMap';
import {
    SINGLES_MATCH_CATEGORY,
    parseMatch,
    pairKey,
    type MatchSide,
} from '$lib/server/singlesMatch';
import type { RequestHandler } from './$types';

// שדכן מאושר "מחבר כרטיסים": נוצר שידוך מתועד (singles_match), ושני הצדדים
// מקבלים התראת מערכת "השדכנים שלנו ממליצים לך להכיר — האם מעוניין להמשיך?".
// ההתראה מפנה לדף השידוך הייעודי (/singles/match/[id]) שמציג פרטים ותמונות
// בלי טלפון, ומאפשר לכל צד להחליט.
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    }
    const isSuperAdmin = session.user.role === 'super_admin';

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
        if (!a.user_id || !b.user_id) {
            return json({ success: false, message: 'לאחד הכרטיסים אין בעלים רשום — אי אפשר לשדך' }, { status: 400 });
        }

        // כפילות: אותו זוג עם שידוך פתוח (לא סגור) — לא יוצרים שוב.
        const key = pairKey(aId, bId);
        const existing = (await getItemsByCategory(SINGLES_MATCH_CATEGORY).catch(() => []))
            .map((it) => ({ it, m: parseMatch(it) }))
            .find(({ m }) => m && m.stage !== 'closed' && pairKey(m.a.card_id, m.b.card_id) === key);
        if (existing) {
            return json({ success: true, already: true, id: existing.it.id });
        }

        const pa = dbItemToProfile(a);
        const pb = dbItemToProfile(b);
        const mmId = session.user.id as string;
        let mmName = (session.user.name as string) || '';
        try {
            const mm = await getUserById(mmId);
            mmName = mm?.nickname || mm?.name || mmName || 'שדכן/ית';
        } catch { mmName = mmName || 'שדכן/ית'; }

        const sideA: MatchSide = { card_id: a.id, user_id: a.user_id, name: pa.nickname, gender: pa.gender, response: 'pending' };
        const sideB: MatchSide = { card_id: b.id, user_id: b.user_id, name: pb.nickname, gender: pb.gender, response: 'pending' };

        const created = await createItem({
            category: SINGLES_MATCH_CATEGORY,
            label: 'שידוך',
            user_id: mmId,
            contact: mmName,
            icon: '💘',
            color: 'pink',
            extra_fields: {
                matchmaker_id: mmId,
                matchmaker_name: mmName,
                a: sideA,
                b: sideB,
                stage: 'proposed',
                created_at: new Date().toISOString(),
            },
        });

        // התראה לשני הצדדים — מפנה לדף ההחלטה.
        const link = `/singles/match/${created.id}`;
        const notify = (toUserId: string) => createItem({
            category: 'message',
            label: '💘 השדכנים שלנו ממליצים לך על התאמה',
            description: 'צוות השדכנים של "קהילה בשכונה" מצא כרטיס שאולי מתאים לך. הצצו לפרטים הראשונים ולתמונות (ללא טלפון) והחליטו אם להמשיך 👈',
            contact: '',
            user_id: toUserId,
            icon: '💘',
            color: 'pink',
            extra_fields: { type: 'singles_match', read: false, link },
        });
        await Promise.all([notify(a.user_id), notify(b.user_id)]);

        return json({ success: true, id: created.id });
    } catch (e) {
        console.error('[matchmaker-recommend POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
