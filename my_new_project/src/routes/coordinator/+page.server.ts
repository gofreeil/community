import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserById, getUserByAnyId, getItemsByCategory, getPendingEvents, getAllUsers, getAllItems, getEvents, createItem } from '$lib/server/db';
import { getVisitsThisMonth } from '$lib/server/visitStats';

// "אושיות (רחובות)" → { name: "אושיות", city: "רחובות" }
function parseArea(entry: string): { name: string; city: string } {
    const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    return m ? { name: m[1].trim(), city: m[2].trim() } : { name: entry.trim(), city: '' };
}
const stripCity = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();

/** בודק-שיוך לשכונות (שכונה + עיר, זהה ל-/api/coordinators) - משותף ל-load ולפעולת sendMessage */
function makeNeighborhoodMatcher(neighborhoods: string[]) {
    const areas = neighborhoods.map(parseArea);
    return (it: { neighborhood?: string | null; city?: string | null }) => {
        if (!it.neighborhood) return false;
        const n = stripCity(it.neighborhood);
        return areas.some(a => a.name === n && (a.city ? it.city === a.city : true));
    };
}

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator');

    const jwt = event.cookies.get('strapi_jwt');
    // תקלת Strapi זמנית (throw) = 503 "נסה שוב" - לא 403 שמרגיש כמו גירוש
    let user;
    try {
        user = await getUserById(session.user.id, jwt ?? undefined);
    } catch (e) {
        console.warn('[coordinator] getUserById failed:', e instanceof Error ? e.message : e);
        throw error(503, 'תקלה זמנית בשרת - נסה שוב בעוד רגע');
    }
    if (!user) throw error(403, 'משתמש לא נמצא');

    const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
    const isAdmin       = user.role === 'neighborhood_admin' || user.role === 'super_admin';
    if (!isCoordinator && !isAdmin) {
        throw error(403, 'דף זה זמין רק לרכזי שכונות');
    }

    // השכונות שהרכז מנהל (סופר־אדמין רואה את שכונתו כברירת מחדל)
    const neighborhoods = isAdmin && user.role === 'super_admin'
        ? (user.coordinator_of?.length ? user.coordinator_of : [user.neighborhood].filter(Boolean))
        : user.coordinator_of;

    // התאמה לפי שכונה + עיר (זהה ל-/api/coordinators): שם השכונה תואם, ואם צוינה עיר בסוגריים - גם היא.
    const inMyNeighborhoods = makeNeighborhoodMatcher(neighborhoods ?? []);

    // סיכום "רק השכונה שלי" ללוח הבקרה של הרכז
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const inThisMonth = (iso?: string | null) => {
        if (!iso) return false;
        const t = new Date(iso).getTime();
        return !isNaN(t) && t >= monthStart;
    };

    // ספירות מהירות לדשבורד
    let emergencyCount = 0, vaadCount = 0, activePollsCount = 0, pendingEventsCount = 0, residentsCount = 0;
    let itemsCount = 0, itemsOnMap = 0, newItemsThisMonth = 0, newResidentsThisMonth = 0;
    // רשימת הרשומים של הרכז — מזהה/שם/שכונה/תאריך בלבד. בכוונה בלי טלפון ואימייל (פרטיות התושבים).
    // ה-id נדרש למיעון הודעה אישית דרך האתר ואינו חושף פרטי קשר.
    let residents: Array<{ id: string; name: string; neighborhood: string; city: string; joinedAt: string; avatarUrl: string | null }> = [];
    // נתוני האתר הכלליים - אותו פאנל כמו בלוח הניהול, גלוי לכל רכז מאושר
    const site = { totalUsers: 0, totalItems: 0, totalCoordinators: 0, newUsersThisMonth: 0, newItemsThisMonth: 0, monthlyVisits: 0 };
    // אירועי העיר של הרכז - לתצוגה מקדימה של "לוח האירועים" כפי שנראה לתושבים בדף הבית
    let events: Awaited<ReturnType<typeof getEvents>> = [];
    try {
        // הכל במקביל - כולל אירועים ממתינים וספירת הכניסות - כדי שהדף לא יחכה לאף שליפה בטור
        const [emergency, vaad, polls, allUsers, allItems, pending, visits, evts] = await Promise.all([
            getItemsByCategory('emergency_team'),
            getItemsByCategory('vaad_member'),
            getItemsByCategory('poll'),
            getAllUsers().catch(() => []),
            getAllItems().catch(() => []),
            user.city ? getPendingEvents(user.city).catch(() => []) : Promise.resolve([]),
            getVisitsThisMonth().catch(() => 0),
            getEvents(user.city || undefined).catch(() => []),
        ]);
        events = evts;
        emergencyCount   = emergency.filter(inMyNeighborhoods).length;
        vaadCount        = vaad.filter(inMyNeighborhoods).length;
        activePollsCount = polls.filter(inMyNeighborhoods).filter(p => p.status === 'active').length;

        // תושבים שנרשמו תחת השכונה/ות שהרכז מנהל
        const myResidents = allUsers.filter(inMyNeighborhoods);
        residentsCount        = myResidents.length;
        newResidentsThisMonth = myResidents.filter(u => inThisMonth((u as any).created_at)).length;
        // getAllUsers ממוין כבר לפי תאריך יצירה יורד — הרשימה נשארת "החדשים למעלה"
        residents = myResidents.map(u => ({
            id: u.id,
            name: u.name?.trim() || u.nickname?.trim() || 'תושב/ת',
            neighborhood: u.neighborhood || '',
            city: u.city || '',
            joinedAt: (u.created_at || '').slice(0, 10),
            avatarUrl: u.avatar_url ?? null,
        }));

        // כל הפריטים בשכונה של הרכז - סה"כ, כמה על המפה (עם קואורדינטות), וכמה חדשים החודש
        const myItems = allItems.filter(inMyNeighborhoods);
        itemsCount        = myItems.length;
        itemsOnMap        = myItems.filter(it => it.lat != null && it.lng != null).length;
        newItemsThisMonth = myItems.filter(it => inThisMonth((it as any).created_at)).length;

        // לוח האירועים מחולק לפי עיר - סופרים אירועים ממתינים בעיר של הרכז.
        pendingEventsCount = pending.length;

        // נתוני האתר הכלליים (זהה לחישוב בלוח הניהול: הודעות מערכת לא נספרות כפריטים)
        const publicItems = allItems.filter((i) => i.category !== 'message');
        site.totalUsers        = allUsers.length;
        site.totalItems        = publicItems.length;
        site.totalCoordinators = allUsers.filter(u => (((u as any).coordinator_of)?.length ?? 0) > 0).length;
        site.newUsersThisMonth = allUsers.filter(u => inThisMonth((u as any).created_at)).length;
        site.newItemsThisMonth = publicItems.filter(i => inThisMonth((i as any).created_at)).length;
        site.monthlyVisits     = visits;
    } catch (e) {
        console.warn('[coordinator] dashboard counts failed:', e);
    }

    return {
        user,
        neighborhoods,
        emergencyCount,
        vaadCount,
        activePollsCount,
        pendingEventsCount,
        residentsCount,
        residents,
        itemsCount,
        itemsOnMap,
        newItemsThisMonth,
        newResidentsThisMonth,
        site,
        events,
    };
};

export const actions: Actions = {
    // שליחת הודעה אישית פנימית מהרכז לתושב רשום בשכונתו - נשמרת כפריט category 'message'
    // ומופיעה לתושב בתיבת "הודעות" באתר (אותו מנגנון כמו הצ'אט של האדמין).
    sendMessage: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator');

        let sender;
        try { sender = await getUserById(session.user.id); } catch { sender = null; }
        if (!sender) return fail(403, { chatError: 'משתמש לא נמצא' });

        const isCoordinator = (sender.coordinator_of?.length ?? 0) > 0;
        const isSuper       = sender.role === 'super_admin';
        if (!isCoordinator && sender.role !== 'neighborhood_admin' && !isSuper) {
            return fail(403, { chatError: 'שליחת הודעות זמינה רק לרכזי שכונות' });
        }

        const form = await event.request.formData();
        const residentId = form.get('residentId')?.toString() ?? '';
        const text = form.get('text')?.toString().trim() ?? '';
        if (!residentId) return fail(400, { chatError: 'לא נבחר נמען' });
        if (!text) return fail(400, { chatError: 'אי אפשר לשלוח הודעה ריקה' });
        if (text.length > 4000) return fail(400, { chatError: 'ההודעה ארוכה מדי' });

        const target = await getUserByAnyId(residentId);
        if (!target) return fail(404, { chatError: 'התושב לא נמצא' });

        // אכיפה בצד השרת: רכז שולח רק לתושבי השכונות שהוא מנהל (סופר-אדמין - לכל תושב)
        const myNeighborhoods = isSuper && !sender.coordinator_of?.length
            ? [sender.neighborhood].filter(Boolean)
            : (sender.coordinator_of ?? []);
        const inMyNeighborhoods = makeNeighborhoodMatcher(myNeighborhoods);
        if (!isSuper && !inMyNeighborhoods(target)) {
            return fail(403, { chatError: 'אפשר לשלוח הודעות רק לתושבים הרשומים בשכונה שלך' });
        }

        const senderName = sender.name?.trim() || sender.nickname?.trim() || 'רכז השכונה';
        try {
            await createItem({
                category: 'message',
                label: `💬 הודעה מרכז השכונה - ${senderName}`,
                description: text,
                icon: '💬',
                color: 'purple',
                user_id: target.id,
                extra_fields: {
                    chat: true,
                    sender_id: String(session.user.id),
                    sender_name: senderName,
                    sender_phone: sender.phone || '',
                    sent_at: new Date().toISOString(),
                    read: false,
                },
            });
            return { chatSuccess: true };
        } catch (e) {
            console.warn('[coordinator] sendMessage failed:', e);
            return fail(500, { chatError: 'שגיאה בשליחת ההודעה, נסה שוב' });
        }
    },
};
