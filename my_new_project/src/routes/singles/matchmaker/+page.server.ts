import { redirect } from '@sveltejs/kit';
import { getItemsByCategory, getUserById, getUserByEmail } from '$lib/server/db';
import { dbItemToProfile } from '$lib/singlesMap';
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
    const profiles = (await getItemsByCategory('singles').catch(() => [])).map(dbItemToProfile);

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

    // המלצות לפי גילאים דומים (קריטריון ראשון; בהמשך יתווספו נוספים)
    const pairs: Pair[] = [];
    for (const a of males) {
        for (const b of females) {
            const ageDiff = Math.abs(a.age - b.age);
            if (ageDiff > AGE_MATCH_THRESHOLD) continue;
            pairs.push({
                a,
                b,
                ageDiff,
                sameCity: !!a.city && a.city === b.city,
                sameReligiosity: !!a.religiosity && a.religiosity === b.religiosity,
            });
        }
    }
    // מיון: פער גיל קטן קודם, ואז התאמת עיר/מגזר כבונוס
    pairs.sort((x, y) =>
        x.ageDiff - y.ageDiff ||
        Number(y.sameCity) - Number(x.sameCity) ||
        Number(y.sameReligiosity) - Number(x.sameReligiosity),
    );

    return {
        pairs: pairs.slice(0, MAX_PAIRS),
        totalPairs: pairs.length,
        maleCount: males.length,
        femaleCount: females.length,
        ageThreshold: AGE_MATCH_THRESHOLD,
    };
};
