import { getAllItems, getUserById, getEvents, type DbItem } from '$lib/server/db';
import { getIndexBusinesses } from '$lib/server/indexBusinesses';
import { PRIVATE_CATEGORIES } from '$lib/itemCategories';
import { isAdmin } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

// extra_fields מלא מכיל תמונות base64 (גלריות פנויים, שעות פתיחה, תגובות...)
// ששקלו ~1MB בכל טעינת דף בית. דף הבית קורא משם רק את המפתחות האלה:
// map_image/service_type (פין על המפה), type (אבידה/מציאה), answered (הרמת יד).
const HOME_EXTRA_KEYS = ['map_image', 'service_type', 'type', 'answered'] as const;

function slimForHome(i: DbItem): DbItem {
    if (!i.extra_fields || i.extra_fields === '{}') return i;
    let extra: Record<string, unknown> = {};
    try { extra = JSON.parse(i.extra_fields); } catch { return { ...i, extra_fields: '{}' }; }
    const slim: Record<string, unknown> = {};
    for (const k of HOME_EXTRA_KEYS) if (extra[k] !== undefined) slim[k] = extra[k];
    return { ...i, extra_fields: JSON.stringify(slim) };
}

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // קבל עיר ושכונה מהפרופיל של המשתמש המחובר
    let userNeighborhood: string | null = null;
    let userCity:         string | null = null;

    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(session.user.id, jwt);
            if (user?.neighborhood) userNeighborhood = user.neighborhood;
            if (user?.city)         userCity         = user.city;
        } catch {}
    }

    const [dbItemsRes, eventsRes, indexRes] = await Promise.allSettled([
        getAllItems(),
        getEvents(userCity ?? undefined),
        getIndexBusinesses(),
    ]);

    const dbItems = dbItemsRes.status === 'fulfilled' ? dbItemsRes.value : [];
    const events  = eventsRes.status === 'fulfilled'  ? eventsRes.value  : [];

    // עסקי האינדקס (index.gofreeil.com) — כולם חתמו על התנאים ומעניקים הנחה
    // לחברי "יוצאים לחירות", ולכן מיובאים אוטומטית ומוצגים תחת "בעלי מקצוע".
    // הם נקראים דרך cache ואינם פריטי Strapi, ולכן אינם משתתפים בספירות
    // השכונתיות כאן (emergencyTeamCount/vaadMembersCount). את המונה הארצי
    // "פרטים במפה" שבלוח הניהול הם כן מגדילים — buildItemsSummary מוסיף אותם.
    const indexItems = indexRes.status === 'fulfilled' ? indexRes.value : [];

    if (dbItemsRes.status === 'rejected') {
        console.warn('[home] getAllItems failed:', dbItemsRes.reason instanceof Error ? dbItemsRes.reason.message : dbItemsRes.reason);
    }
    if (eventsRes.status === 'rejected') {
        console.warn('[home] getEvents failed:', eventsRes.reason instanceof Error ? eventsRes.reason.message : eventsRes.reason);
    }

    // ספירות שכונתיות לכפתורים בדף הבית (מתוך dbItems שכבר נטענו)
    const inMyNeighborhood = (i: { neighborhood: string }) =>
        !userNeighborhood || i.neighborhood === userNeighborhood;
    const emergencyTeamCount = dbItems.filter(i => i.category === 'emergency_team' && inMyNeighborhood(i)).length;
    const vaadMembersCount   = dbItems.filter(i => i.category === 'vaad_member'   && inMyNeighborhood(i)).length;

    return {
        // עסקי האינדקס כבר "רזים" (אין להם extra_fields כבד) — מצורפים אחרי הדילול.
        // רשומות פרטיות (הודעות, משוב, בקשות, משאלות) מוחרגות: שליחתן לדפדפן
        // הייתה חושפת טקסטים פרטיים ו-user_id לכל גולש. raise_hand/emergency_team/
        // vaad_member נשארים - דף הבית והמפה משתמשים בהם.
        dbItems: [...dbItems.filter((i) => !PRIVATE_CATEGORIES.has(i.category)).map(slimForHome), ...indexItems],
        events,
        userNeighborhood,
        userCity,
        emergencyTeamCount,
        vaadMembersCount,
        isAdmin: isAdmin(session),
        userRole: session?.user?.role ?? 'user',
    };
};
