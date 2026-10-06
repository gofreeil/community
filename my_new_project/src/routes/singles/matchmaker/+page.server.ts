import { redirect } from '@sveltejs/kit';
import { getItemsByCategory, getUserById, getUserByEmail } from '$lib/server/db';
import { dbItemToProfile } from '$lib/singlesMap';
import { candidateFromItem, scoreMatch, isQuizBased, type MatchResult, type MatchCandidate } from '$lib/singlesMatching';
import { withSinglesImageUrls } from '$lib/server/singlesImages';
import { getMatchmakerStatus, AGE_MATCH_THRESHOLD } from '$lib/server/matchmaker';
import type { PageServerLoad } from './$types';

interface MiniCard {
    id: string;
    nickname: string;
    age: number;
    city: string;
    avatar: string;
    religiosity: string;
    visibility: string;
}
interface Pair {
    a: MiniCard;   // גבר
    b: MiniCard;   // אישה
    ageDiff: number;
    sameCity: boolean;
    sameReligiosity: boolean;
    /** ציון ההתאמה (1-100) והפירוט שלו - ראה singlesMatching.ts */
    match: MatchResult;
}

const MAX_PAIRS = 80;

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* guest */ }
    const uid = session?.user?.id as string | undefined;
    if (!uid) throw redirect(302, '/login?next=' + encodeURIComponent('/singles/matchmaker'));

    // הרשאת שדכן (סופר-אדמין תמיד מאושר). כפילות בדיקת התפקיד מול ה-DB למקרה
    // שה-role בסשן לא עודכן.
    let isSuperAdmin = session?.user?.role === 'super_admin';
    if (!isSuperAdmin) {
        try {
            let u = await getUserById(uid);
            if (!u && session?.user?.email) u = await getUserByEmail(session.user.email);
            if (u?.role === 'super_admin') isSuperAdmin = true;
        } catch { /* ignore */ }
    }

    const status = await getMatchmakerStatus(uid, isSuperAdmin);
    if (status !== 'approved') {
        // לא שדכן מאושר — חזרה ללוח (שם אפשר לבקש להיות שדכן)
        throw redirect(302, '/singles');
    }

    // כל הכרטיסים הפעילים — שדכן רואה גם כרטיסים "רק לשדכנים שלנו"
    const items = await getItemsByCategory('singles').catch(() => []);
    const profiles = items.map(dbItemToProfile).map(withSinglesImageUrls);
    // הפרופיל שחושב משאלון ההתאמה + פרטי הכרטיס, פעם אחת לכל כרטיס
    const cands = new Map<string, MatchCandidate>();
    for (const it of items) {
        const c = candidateFromItem(it);
        if (c) cands.set(c.id, c);
    }

    const toMini = (p: ReturnType<typeof dbItemToProfile>): MiniCard | null => {
        const age = parseInt(p.age, 10);
        if (!Number.isFinite(age) || age <= 0) return null;
        return {
            id: p.id,
            nickname: p.nickname,
            age,
            city: p.city,
            avatar: p.avatar,
            religiosity: p.religiosity,
            visibility: p.visibility ?? 'public',
        };
    };

    const males = profiles.filter((p) => p.gender === 'male').map(toMini).filter((m): m is MiniCard => !!m);
    const females = profiles.filter((p) => p.gender === 'female').map(toMini).filter((m): m is MiniCard => !!m);

    // המלצות: טווח גילאים סביר, ואז דירוג לפי ציון ההתאמה המלא מהשאלון
    const pairs: Pair[] = [];
    for (const a of males) {
        for (const b of females) {
            const ageDiff = Math.abs(a.age - b.age);
            if (ageDiff > AGE_MATCH_THRESHOLD) continue;
            const ca = cands.get(a.id), cb = cands.get(b.id);
            // רק זוגות ששניהם מילאו שאלון: בלעדיו הציון נשען על גיל/מגזר/עיר בלבד
            if (!ca || !cb || !isQuizBased(ca, cb)) continue;
            pairs.push({
                a,
                b,
                ageDiff,
                sameCity: !!a.city && a.city === b.city,
                sameReligiosity: !!a.religiosity && a.religiosity === b.religiosity,
                match: scoreMatch(ca, cb),
            });
        }
    }
    // מיון: ציון ההתאמה הגבוה קודם; בשוויון - פער גיל קטן, ואז עיר/מגזר
    pairs.sort((x, y) =>
        y.match.score - x.match.score ||
        x.ageDiff - y.ageDiff ||
        Number(y.sameCity) - Number(x.sameCity) ||
        Number(y.sameReligiosity) - Number(x.sameReligiosity),
    );

    return {
        pairs: pairs.slice(0, MAX_PAIRS),
        totalPairs: pairs.length,
        maleCount: males.length,
        femaleCount: females.length,
        quizCount: [...cands.values()].filter((c) => c.profile).length,
        ageThreshold: AGE_MATCH_THRESHOLD,
    };
};
