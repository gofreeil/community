import { error } from '@sveltejs/kit';
import { getDbItemById, getItemsByCategory } from '$lib/server/db';
import { mockSingles } from '$lib/singlesMock';
import { dbItemToProfile } from '$lib/singlesMap';
import { withSinglesImageUrls, stripSinglesItemImages } from '$lib/server/singlesImages';
import { withCharterAutoDetectOne, ownerEmail } from '$lib/server/charterSignatures';
import { stripMatchmakerOnly, stripMatchmakerItemFields } from '$lib/singlesMap';
import { getMatchmakerStatus, AGE_MATCH_THRESHOLD } from '$lib/server/matchmaker';
import { candidateFromItem, rankMatches, type MatchResult } from '$lib/singlesMatching';
import { buildProfileSummary, type ProfileSummary } from '$lib/singlesProfileSummary';
import { isSuperAdmin } from '$lib/server/auth';
import { BOT_UA_RX } from '$lib/server/botUa';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const ua = event.request.headers.get('user-agent') ?? '';
    const isBot = BOT_UA_RX.test(ua);

    // קישור ישיר לכרטיס פתוח לכולם - הצפייה חופשית, אינטראקציה מחייבת התחברות
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    const isLoggedIn = !!session?.user?.id;
    const viewerId = session?.user?.id as string | undefined;

    const id = event.params.id;
    const origin = event.url.origin;

    let dbItem = null;
    try { dbItem = await getDbItemById(id); } catch { dbItem = null; }

    if (dbItem && dbItem.category === 'singles') {
        // ממפים את הפריט האמיתי למבנה single שהדף יודע להציג
        // תמונות ככתובות ולא base64 בנתוני הדף - ראה singlesImages.ts
        // isOwner: הכפתור "צור כרטיס פנוי משלך" מוצג לכל צופה חוץ מבעל הכרטיס
        const isOwner = !!viewerId && dbItem.user_id === viewerId;
        const full = await withCharterAutoDetectOne(
            withSinglesImageUrls(dbItemToProfile(dbItem)),
            await ownerEmail(dbItem.user_id),
        );

        // "מידע לשדכנים בלבד" יוצא מהשרת רק לשדכן/ית מערכת מאושר/ת (וסופר-אדמין).
        // לכל שאר הצופים - גם לבעלים - התשובות מנוקות מהפרופיל ומהרשומה הגולמית.
        let isMatchmaker = false;
        if (viewerId) {
            try { isMatchmaker = (await getMatchmakerStatus(viewerId, isSuperAdmin(session))) === 'approved'; }
            catch (e) { console.warn('[singles/[id]] matchmaker status failed:', e instanceof Error ? e.message : e); }
        }
        const single = isMatchmaker || !full ? full : stripMatchmakerOnly(full);
        const item = stripSinglesItemImages(dbItem);

        // שדכן/ית מאושר/ת: פרופיל השאלון של הכרטיס + "חיפוש התאמה" - המועמדים/ות עם הציון הגבוה ביותר.
        // השאלון וההשוואות מחושבים בשרת ויוצאים רק לשדכנים (אותו כלל כמו "מידע לשדכנים בלבד").
        let quizProfile: ProfileSummary | null = null;
        let topMatches: { id: string; nickname: string; age: string; city: string; avatar: string; match: MatchResult }[] = [];
        if (isMatchmaker) {
            try {
                const subject = candidateFromItem(dbItem);
                if (subject) {
                    if (subject.profile) quizProfile = buildProfileSummary(subject.g, subject.profile);
                    const items = await getItemsByCategory('singles').catch(() => []);
                    const byId = new Map(items.map((it) => [String(it.id), it]));
                    const pool = items.map(candidateFromItem).filter((c): c is NonNullable<typeof c> => !!c);
                    const ranked = rankMatches(subject, pool, { maxAgeGap: AGE_MATCH_THRESHOLD, limit: 5 });
                    topMatches = ranked.flatMap(({ candidate, result }) => {
                        const it = byId.get(candidate.id);
                        if (!it) return [];
                        const p = withSinglesImageUrls(dbItemToProfile(it));
                        return [{ id: p.id, nickname: p.nickname, age: p.age, city: p.city, avatar: p.avatar, match: result }];
                    });
                }
            } catch (e) {
                console.warn('[singles/[id]] match search failed:', e instanceof Error ? e.message : e);
            }
        }

        return {
            single,
            dbItem: isMatchmaker ? item : stripMatchmakerItemFields(item),
            isBot,
            origin,
            isLoggedIn,
            isOwner,
            isMatchmaker,
            quizProfile,
            topMatches,
        };
    }

    const single = mockSingles.find((s) => s.id === id);
    if (!single) throw error(404, 'הפרופיל לא נמצא');

    return { single, dbItem: null, isBot, origin, isLoggedIn, isOwner: false, isMatchmaker: false, quizProfile: null, topMatches: [] };
};
