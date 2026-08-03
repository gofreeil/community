import { redirect, error } from '@sveltejs/kit';
import { getDbItemByIdFresh, getDbItemById, getUserById, getUserByEmail } from '$lib/server/db';
import { dbItemToProfile } from '$lib/singlesMap';
import { parseMatch, sideOf, type MatchData } from '$lib/server/singlesMatch';
import { getMatchmakerStatus } from '$lib/server/matchmaker';
import type { PageServerLoad } from './$types';

// כרטיס "פרטים ראשונים" שמוצג לצד השני — בלי טלפון ובלי פרטי השדכן.
function limitedCard(item: Awaited<ReturnType<typeof getDbItemById>>) {
    if (!item) return null;
    const p = dbItemToProfile(item);
    return {
        id: p.id,
        nickname: p.nickname,
        gender: p.gender,
        age: p.age,
        city: p.city,
        religiosity: p.religiosity,
        maritalStatus: p.maritalStatus,
        education: p.education,
        interests: p.interests,
        description: p.description,
        lookingFor: p.lookingFor,
        inspiration: p.inspiration,
        images: p.images,
        avatar: p.avatar,
        // ⚠️ במכוון: אין phone / matchmaker / contact — הקשר נעשה דרך השדכן בלבד.
    };
}

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* guest */ }
    const viewerId = session?.user?.id as string | undefined;
    if (!viewerId) {
        throw redirect(302, '/login?next=' + encodeURIComponent(`/singles/match/${event.params.id}`));
    }

    const item = await getDbItemByIdFresh(event.params.id);
    const m: MatchData | null = item ? parseMatch(item) : null;
    if (!item || !m) throw error(404, 'השידוך לא נמצא');

    // הרשאה: אחד הצדדים, השדכן ששידך, או סופר-אדמין.
    let isSuperAdmin = session?.user?.role === 'super_admin';
    if (!isSuperAdmin) {
        try {
            let u = await getUserById(viewerId);
            if (!u && session?.user?.email) u = await getUserByEmail(session.user.email);
            if (u?.role === 'super_admin') isSuperAdmin = true;
        } catch { /* ignore */ }
    }
    const side = sideOf(m, viewerId);
    const isMatchmaker = m.matchmaker_id === viewerId
        || (await getMatchmakerStatus(viewerId, isSuperAdmin)) === 'approved';

    if (!side && !isMatchmaker && !isSuperAdmin) {
        throw redirect(302, '/singles');
    }

    // תצוגת צד (פנוי/ה): רואה את הכרטיס של הצד השני + כפתורי החלטה.
    if (side) {
        const otherSide = side === 'a' ? 'b' : 'a';
        const otherCardId = m[otherSide].card_id;
        const otherCard = limitedCard(await getDbItemById(otherCardId));
        return {
            role: 'single' as const,
            matchId: item.id,
            stage: m.stage,
            myResponse: m[side].response,
            otherResponse: m[otherSide].response,
            matchmakerName: m.matchmaker_name,
            otherCard,
        };
    }

    // תצוגת שדכן/אדמין: סקירה של שני הכרטיסים + הסטטוסים (לקריאה בלבד).
    const [cardA, cardB] = await Promise.all([
        getDbItemById(m.a.card_id),
        getDbItemById(m.b.card_id),
    ]);
    return {
        role: 'matchmaker' as const,
        matchId: item.id,
        stage: m.stage,
        matchmakerName: m.matchmaker_name,
        aCard: limitedCard(cardA),
        aResponse: m.a.response,
        aPhone: cardA?.phone || '',
        bCard: limitedCard(cardB),
        bResponse: m.b.response,
        bPhone: cardB?.phone || '',
    };
};
