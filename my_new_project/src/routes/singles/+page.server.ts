import { getItemsByCategory, getUserById, getUserByEmail, getItemsByUserId } from '$lib/server/db';
import { dbItemToProfile } from '$lib/singlesMap';
import { getSinglesAccessStatus } from '$lib/server/singlesAccess';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    let currentUserGender: 'male' | 'female' | null = null;
    let isSuperAdmin = session?.user?.role === 'super_admin';
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
            let user = await getUserById(session.user.id, jwt);
            if (!user && session.user.email) user = await getUserByEmail(session.user.email);
            const g = (user?.gender ?? '').toLowerCase();
            if (g === 'male' || g === 'female') currentUserGender = g;
            if (user?.role === 'super_admin') isSuperAdmin = true;
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

    // הכרטיס האישי של המשתמש (בכל סטטוס) — מוצג גם בשער וגם בלוח.
    let selfProfile: ReturnType<typeof dbItemToProfile> | null = null;
    let selfStatus: string | null = null;
    if (session?.user?.id) {
        try {
            const ownItem = (await getItemsByUserId(String(session.user.id)))
                .find((i) => i.category === 'singles' && i.status !== 'deleted');
            if (ownItem) {
                selfProfile = dbItemToProfile(ownItem);
                selfStatus = ownItem.status;
            }
        } catch (e) {
            console.warn('[singles] own item lookup failed:', e instanceof Error ? e.message : e);
        }
    }

    // ── שער גישה: לוח סגור. רואים את הכרטיסים רק אם אושרה גישה ──
    const access = await getSinglesAccessStatus(session?.user?.id, isSuperAdmin);
    const base = {
        selfProfile,
        selfStatus,
        isSuperAdmin,
        currentUserId: session?.user?.id ?? null,
        currentUserGender,
        currentUser,
    };
    if (access !== 'granted') {
        // לא טוענים את הכרטיסים כלל — לא מדליפים מידע למי שלא אושר.
        return { ...base, gated: true, accessStatus: access, items: [], profiles: [] };
    }

    try {
        const items = await getItemsByCategory('singles');
        // כל הכרטיסים הפעילים מוצגים - כולל כאלה שלא שילמו.
        // כרטיסים שסומנו "רק לשדכנים שלנו" לא מופיעים בלוח הפומבי (רק צוות
        // השדכנים רואה אותם בדף /admin/singles-review ומפנה אותם בדיסקרטיות).
        const profiles = items.map(dbItemToProfile).filter((p) => p.visibility !== 'matchmakers');
        return { ...base, gated: false, accessStatus: 'granted' as const, items, profiles };
    } catch (e) {
        console.warn('[singles] load failed:', e instanceof Error ? e.message : e);
        return { ...base, gated: false, accessStatus: 'granted' as const, items: [], profiles: [] };
    }
};
