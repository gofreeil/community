import { getItemsByCategory, getUserById } from '$lib/server/db';
import { dbItemToProfile } from '$lib/singlesMap';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    let currentUserGender: 'male' | 'female' | null = null;
    let currentUser: {
        nickname: string;
        name: string | null;
        avatar_url: string | null;
        gender: string;
        city: string;
        phone: string;
        birth_date: string;
        family_status: string;
    } | null = null;
    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(session.user.id, jwt);
            const g = (user?.gender ?? '').toLowerCase();
            if (g === 'male' || g === 'female') currentUserGender = g;
            if (user) {
                currentUser = {
                    nickname: user.nickname || '',
                    name: user.name,
                    avatar_url: user.avatar_url,
                    gender: user.gender ?? '',
                    city: user.city ?? '',
                    phone: user.phone ?? '',
                    birth_date: user.birth_date ?? '',
                    family_status: user.family_status ?? '',
                };
            }
        } catch (e) {
            console.warn('[singles] getUserById failed:', e instanceof Error ? e.message : e);
        }
    }

    try {
        const items = await getItemsByCategory('singles');
        // כל הכרטיסים הפעילים מוצגים - כולל כאלה שלא שילמו
        const profiles = items.map(dbItemToProfile);
        // הכרטיס האמיתי של המשתמש המחובר (מסונן החוצה מהרשת בגלל נעילת המגדר),
        // כדי שנוכל להציג לו אותו בדיוק כפי שאחרים רואים אותו ב"כך נראה הכרטיס שלך".
        const ownItem = session?.user?.id ? items.find((i) => String(i.user_id) === String(session.user.id)) : null;
        const selfProfile = ownItem ? dbItemToProfile(ownItem) : null;
        return { items, profiles, selfProfile, currentUserId: session?.user?.id ?? null, currentUserGender, currentUser };
    } catch (e) {
        console.warn('[singles] load failed:', e instanceof Error ? e.message : e);
        return { items: [], profiles: [], selfProfile: null, currentUserId: null, currentUserGender, currentUser };
    }
};
