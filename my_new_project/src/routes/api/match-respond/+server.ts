import { json } from '@sveltejs/kit';
import { getDbItemByIdFresh, getDbItemById, updateItem, createItem, getUserById } from '$lib/server/db';
import { parseMatch, sideOf, type MatchResponse, type MatchStage } from '$lib/server/singlesMatch';
import type { RequestHandler } from './$types';

const SHADCHAN_COST_NOTE =
    'לתשומת ליבך: לשידוך יש עלות, שתסוכם ישירות עם השדכן/ית המציע/ה.';

// כל אחד מהצדדים בשידוך מחליט אם להמשיך. כששניהם "מעוניינים" — עניין הדדי:
// השדכן ששידך מקבל התראה עם הטלפונים כדי לקדם ביניהם קשר, ושני הצדדים מקבלים
// אישור + הודעה על העלות.
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    if (!session?.user?.id) {
        return json({ success: false, message: 'יש להתחבר' }, { status: 401 });
    }
    const viewerId = session.user.id as string;

    let body: { matchId?: string; response?: string } = {};
    try { body = await event.request.json(); } catch { /* empty */ }
    const matchId = String(body?.matchId ?? '').trim();
    const response = String(body?.response ?? '').trim() as MatchResponse;
    if (!matchId || !['interested', 'declined'].includes(response)) {
        return json({ success: false, message: 'פרמטרים שגויים' }, { status: 400 });
    }

    try {
        const item = await getDbItemByIdFresh(matchId);
        const m = item ? parseMatch(item) : null;
        if (!item || !m) {
            return json({ success: false, message: 'השידוך לא נמצא' }, { status: 404 });
        }
        const side = sideOf(m, viewerId);
        if (!side) {
            return json({ success: false, message: 'אין לך הרשאה לשידוך זה' }, { status: 403 });
        }
        if (m.stage === 'closed') {
            return json({ success: false, message: 'השידוך כבר נסגר' }, { status: 409 });
        }

        m[side].response = response;
        const other = side === 'a' ? 'b' : 'a';

        let stage: MatchStage = 'proposed';
        if (m.a.response === 'declined' || m.b.response === 'declined') stage = 'closed';
        else if (m.a.response === 'interested' && m.b.response === 'interested') stage = 'mutual';
        m.stage = stage;
        m.updated_at = new Date().toISOString();

        // הפריט נשאר status1='active' תמיד (גם ב-closed) כדי שיישאר שליף לפאנל
        // השדכן ולבדיקת הכפילות. שלב-החיים נשמר ב-extra_fields.stage.
        await updateItem(matchId, { extra_fields: { ...m } });

        // עניין הדדי → התראה לשדכן עם הטלפונים + אישור+עלות לשני הצדדים.
        if (stage === 'mutual') {
            try {
                const [cardA, cardB] = await Promise.all([
                    getDbItemById(m.a.card_id),
                    getDbItemById(m.b.card_id),
                ]);
                const phoneA = cardA?.phone || '—';
                const phoneB = cardB?.phone || '—';

                const notifs: Promise<unknown>[] = [];
                if (m.matchmaker_id) {
                    notifs.push(createItem({
                        category: 'message',
                        label: '💞 עניין הדדי — קדמו את הקשר',
                        description: `שני הצדדים בשידוך שהצעת מעוניינים להמשיך!\n${m.a.name} (${phoneA}) ↔ ${m.b.name} (${phoneB}).\nצרו איתם קשר לתיאום ההיכרות.`,
                        contact: '',
                        user_id: m.matchmaker_id,
                        icon: '💞',
                        color: 'pink',
                        extra_fields: { type: 'singles_match_mutual', read: false, link: `/singles/match/${matchId}` },
                    }));
                }
                const confirmSide = (uid: string) => createItem({
                    category: 'message',
                    label: '💞 יש עניין הדדי בשידוך!',
                    description: `גם הצד השני מעוניין להמשיך 🎉 השדכן/ית ייצור/תיצור איתך קשר בקרוב לתיאום ההיכרות.\n${SHADCHAN_COST_NOTE}`,
                    contact: '',
                    user_id: uid,
                    icon: '💞',
                    color: 'pink',
                    extra_fields: { type: 'singles_match_mutual', read: false, link: `/singles/match/${matchId}` },
                });
                if (m.a.user_id) notifs.push(confirmSide(m.a.user_id));
                if (m.b.user_id) notifs.push(confirmSide(m.b.user_id));
                await Promise.all(notifs);
            } catch (e) {
                console.warn('[match-respond] mutual notify failed:', e instanceof Error ? e.message : e);
            }
        }

        return json({ success: true, stage, otherResponse: m[other].response });
    } catch (e) {
        console.error('[match-respond POST]', e);
        return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
    }
};
