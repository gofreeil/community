import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireSuperAdmin, requireAdmin } from '$lib/server/auth';
import { getAllUsers, banUser, unbanUser, deleteUserAccounts, setCoordinatorOf, getAllItems, adminDeleteItem, getUserById, getUserByAnyId, getUserByEmail, createItem, getCoordinatorRequests, approveCoordinatorRequest, rejectCoordinatorRequest, getNeighborhoods, getNeighborhoodById, approveNeighborhood, rejectNeighborhood, createNeighborhoodRequest, getDiscountCodes, saveDiscountCodes, getItemsByCategoryAndStatus, getUserTotpSecret, coordinatorCovers, closeFulfilledCoordinatorRequests, updateItem, getDbItemByIdFresh, getAllSuperAdmins, getMessagesByUserId, type DbItem } from '$lib/server/db';
import { finalizeLocationDecision } from '$lib/server/locationDecision';
import { cityCenters } from '$lib/neighborhoodCoords';
import { DEFAULT_DISCOUNT_CODES, type DiscountCode } from '$lib/discountCodes';
import { countPending } from '$lib/server/adsStore';
import { getVisitsThisMonth, getVisitStats } from '$lib/server/visitStats';
import { getServerHealth } from '$lib/server/serverHealth';
import { buildItemsSummary, buildRegistrationsSummary, buildSiteOverview } from '$lib/server/statsSummary';
import { isFamilyItem } from '$lib/itemCategories';
import { needsCompletion } from '$lib/incompleteItems';

// "אושיות (רחובות)" → { name: "אושיות", city: "רחובות" }
function parseArea(entry: string): { name: string; city: string } {
    const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    return m ? { name: m[1].trim(), city: m[2].trim() } : { name: entry.trim(), city: '' };
}
const stripCityName = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();

// לכל רכז: מספר התושבים הרשומים בשכונותיו ומספר הפריטים שכבר על המפה בהן.
// התאמה לפי שכונה + עיר (זהה ל-/api/coordinators). מפתח = מזהה המשתמש.
function buildCoordinatorStats(
    users: Awaited<ReturnType<typeof getAllUsers>>,
    items: Awaited<ReturnType<typeof getAllItems>>,
): Record<string, { residents: number; items: number; itemsOnMap: number }> {
    const stats: Record<string, { residents: number; items: number; itemsOnMap: number }> = {};

    for (const u of users) {
        const coordOf = (u as any).coordinator_of as string[] | null | undefined;
        if (!coordOf || coordOf.length === 0) continue;
        const areas = coordOf.map(parseArea);
        const matchesArea = (neighborhood?: string | null, city?: string | null) => {
            const n = neighborhood ? stripCityName(neighborhood) : '';
            return areas.some(a => {
                // רשומה בלי "(עיר)" ששמה הוא שם העיר = רכז עיר, תופס את כל העיר
                if (!a.city && city && a.name === city) return true;
                return !!n && a.name === n && (a.city ? city === a.city : true);
            });
        };

        let residents = 0;
        for (const r of users) {
            if (matchesArea(r.neighborhood, r.city)) residents++;
        }

        let itemCount = 0;
        let itemsOnMap = 0;
        for (const it of items) {
            if (!matchesArea(it.neighborhood, it.city)) continue;
            itemCount++;
            if (it.lat != null && it.lng != null) itemsOnMap++;
        }

        stats[u.id] = { residents, items: itemCount, itemsOnMap };
    }

    return stats;
}

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // בדיקת הרשאה - ישירות מ-DB + fallback לפי אימייל (מיזוג OAuth+credentials)
    let isSuperAdmin = session?.user?.role === 'super_admin';
    if (!isSuperAdmin && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            // fallback לפי אימייל - כמו בדף הפרופיל
            if (!dbUser && session.user.email) {
                dbUser = await getUserByEmail(session.user.email);
            }
            isSuperAdmin = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!isSuperAdmin) throw error(403, 'נדרשת הרשאת מנהל ראשי');

    const jwt = event.cookies.get('strapi_jwt');

    // כל השליפות עצמאיות זו מזו - יוצאות לדרך מיד ובמקביל, כדי שאף ספירה
    // (כניסות, פרסומות ממתינות, פנויים, קודי הנחה) לא תעכב את פתיחת הדף.
    const monthlyVisitsPromise  = getVisitsThisMonth().catch((e) => { console.warn('[admin] getVisitsThisMonth failed:', e); return 0; });
    const serverHealthPromise   = getServerHealth().catch((e) => { console.warn('[admin] getServerHealth failed:', e); return null; });
    const pendingAdsPromise     = countPending().catch(() => 0);
    const pendingSinglesPromise = getItemsByCategoryAndStatus('singles', 'pending').then((l) => l.length).catch(() => 0);
    const discountCodesPromise  = getDiscountCodes().catch((e) => { console.warn('[admin] getDiscountCodes failed:', e); return DEFAULT_DISCOUNT_CODES; });
    const totpPromise           = session?.user?.id ? getUserTotpSecret(session.user.id).catch(() => null) : Promise.resolve(null);

    // נתוני "הגרף הראשי" (סקירה כללית) — אותו גרף מסכם שבדף הסטטיסטיקה, מוטמע בלוח הניהול.
    // מתרעננים בכל כניסה לדף (getVisitStats מוגן ב-cache יומי, כמו בדף הסטטיסטיקה).
    const statsPromise          = getVisitStats().catch((e) => { console.warn('[admin] getVisitStats failed:', e); return [] as Awaited<ReturnType<typeof getVisitStats>>; });
    // סיכומי "הגרף הראשי" (פריטים/נרשמים) נבנים אחרי טעינת users/items מאותם
    // מערכים — בלי שליפה כפולה מ-Strapi ובאותה הגדרת "פריט קהילה" כמו המונה.

    const [users, items0, coordinatorRequests, pendingNeighborhoods, pendingWishes0] = await Promise.all([
        getAllUsers(jwt).catch((e) => { console.warn('[admin] getAllUsers failed:', e); return [] as Awaited<ReturnType<typeof getAllUsers>>; }),
        getAllItems().catch((e) => { console.warn('[admin] getAllItems failed:', e); return [] as Awaited<ReturnType<typeof getAllItems>>; }),
        getCoordinatorRequests('pending').catch((e) => { console.warn('[admin] getCoordinatorRequests failed:', e); return [] as Awaited<ReturnType<typeof getCoordinatorRequests>>; }),
        getNeighborhoods('pending').catch((e) => { console.warn('[admin] getNeighborhoods failed:', e); return [] as Awaited<ReturnType<typeof getNeighborhoods>>; }),
        getItemsByCategoryAndStatus('wish', 'pending').catch((e) => { console.warn('[admin] pending wishes failed:', e); return [] as Awaited<ReturnType<typeof getItemsByCategoryAndStatus>>; }),
    ]);
    // פריטי תוכן אמיתיים של משפחת האתרים המסונכרנים (קהילה + גמ"ח ארצי +
    // אבידות + בעלי מקצוע...) — כולל קטגוריות של אתרי-אחות כמו 'lost_and_found'.
    // מסוננות רק רשומות מערכת ותוכן של מוצר זר. כך המונה, הגרף המסכם וטאב
    // הפריטים משקפים בדיוק את אותו תוכן.
    const items = items0.filter((i) => isFamilyItem(i.category));

    // כמה פריטים ממתינים להשלמת מיקום (מסך /admin/incomplete). רשימת השכונות
    // המאושרות כבר נטענה ב-layout - נקראת משם ולא בשליפה נוספת מ-Strapi.
    const { approvedNeighborhoods } = await event.parent();
    const incompleteCount = items.filter((i) => needsCompletion(i, approvedNeighborhoods, true)).length;

    // צירוף הקשר מלא של המבקש לכל כרטיס בקשה - כדי שהאדמין יֵדע מי המבקש,
    // מהיכן הוא רשום (עיר/שכונה) ואיך ליצור איתו קשר - בלי לצאת מהכרטיס.
    // קודם מחשבון המשתמש (אם קיים), ואם לא - מהשם/טלפון שנשמרו על הבקשה עצמה
    // (בקשת רכז/פין-על-מפה נשלחות לעיתים בלי חשבון מחובר).
    const usersById = new Map(users.map((u) => [u.id, u]));
    const requesterContextFor = (
        userId?: string | null,
        fallback?: { name?: string | null; phone?: string | null; email?: string | null },
    ) => {
        const u = userId ? usersById.get(userId) : undefined;
        return {
            userId:       u?.id ?? (userId || ''),
            name:         u?.name ?? u?.nickname ?? fallback?.name ?? null,
            phone:        u?.phone || fallback?.phone || '',
            email:        u?.email ?? fallback?.email ?? null,
            city:         u?.city ?? '',
            neighborhood: u?.neighborhood ?? '',
            business:     u?.business ?? '',
        };
    };

    const pendingNeighborhoodsWithRequester = pendingNeighborhoods.map((nb) => ({
        ...nb,
        requester: requesterContextFor(nb.user_id, { name: nb.requester_name, phone: nb.requester_phone }),
    }));

    // משאלות שממתינות לאישור בכותל המשאלות - עם הקשר המבקש (אם היה מחובר).
    // מי שלא היה מחובר: מוצג רק השם שנשמר על המשאלה עצמה (אם קיים).
    const pendingWishes = pendingWishes0.map((w) => {
        let ef: Record<string, unknown> = {};
        try { ef = w.extra_fields ? JSON.parse(w.extra_fields) : {}; } catch { ef = {}; }
        return {
            id:         w.id,
            text:       w.description || w.label,
            created_at: w.created_at,
            user_id:    w.user_id,
            requester:  requesterContextFor(w.user_id, { name: String(ef.requester_name ?? '') || null }),
        };
    });

    // בקשה שכבר מומשה (המבקש כבר רכז של כל האזורים שביקש) עלולה להיתקע כ-pending.
    // מסתירים אותה מהתצוגה *בלבד* — בלי לגעת בסטטוס במסד. אישור בקשת רכז הוא ידני-
    // בלבד: אסור לסמן "approved" אוטומטית ברקע (זה מה שגרם ל"אושר בלי שאישרתי").
    const usersByPhone = new Map(users.filter((u) => u.phone).map((u) => [u.phone, u]));
    const requesterUserFor = (r: (typeof coordinatorRequests)[number]) =>
        (r.user_id ? usersById.get(r.user_id) : undefined) ?? (r.phone ? usersByPhone.get(r.phone) : undefined);
    const alreadyCoordinated = (r: (typeof coordinatorRequests)[number]) =>
        coordinatorCovers((requesterUserFor(r) as any)?.coordinator_of, r.neighborhoods);

    const activeCoordinatorRequests = coordinatorRequests.filter((r) => !alreadyCoordinated(r));

    // בקשות רכזות - אותו הקשר מלא (מקום מגורים רשום + פרטי קשר) לכל כרטיס
    const coordinatorRequestsWithContext = activeCoordinatorRequests.map((r) => ({
        ...r,
        requester: requesterContextFor(r.user_id, { name: r.name, phone: r.phone }),
    }));

    // ---- סטטיסטיקת רכזים: לכל רכז כמה פריטים כבר יש על המפה בשכונתו וכמה תושבים רשומים ----
    // התאמה לפי שכונה + עיר, בדיוק כמו /api/coordinators. פריט "על המפה" = בעל קואורדינטות (lat/lng).
    const coordinatorStats = buildCoordinatorStats(users, items);

    // ---- סיכום ללוח הבקרה (באנר עליון) ----
    // כניסות החודש - נספר ב-visit-stat, מוצג עם רענון של פעם ביום (cache בשכבת visitStats).
    // ה-promise יצא לדרך בתחילת ה-load, כאן רק אוספים את התוצאה.
    const monthlyVisits = await monthlyVisitsPromise;

    // סיכומי הגרף המסכם — מאותם users/items שכבר נטענו, בלי שליפה נוספת מ-Strapi
    // ובאותה הגדרת "פריט קהילה". buildItemsSummary מוסיף גם את עסקי האינדקס,
    // כך שהמונה "פרטים במפה" בבאנר, הגרף המסכם ודף הסטטיסטיקה מציגים בדיוק את
    // אותו מספר (פריטי הקהילה + עסקי האינדקס).
    const itemsSummary  = await buildItemsSummary(items);
    const registrations = await buildRegistrationsSummary(users);

    // באנר הסקירה — buildSiteOverview הוא החישוב היחיד, המשותף גם ללוח הרכז,
    // כך ששני הלוחות מציגים בדיוק אותם מספרים. itemsSummary כבר נבנה למעלה
    // ומועבר כדי לא לבנותו פעמיים.
    const dashboard = await buildSiteOverview(users, items, monthlyVisits, itemsSummary);

    const [pendingAdsCount, pendingSinglesCount, discountCodes, totpSecret, serverHealth, stats] =
        await Promise.all([pendingAdsPromise, pendingSinglesPromise, discountCodesPromise, totpPromise, serverHealthPromise, statsPromise]);

    return {
        users,
        items,
        coordinatorRequests: coordinatorRequestsWithContext,
        pendingNeighborhoods: pendingNeighborhoodsWithRequester,
        pendingWishes,
        currentUserId: session?.user?.id ?? '',
        pendingAdsCount,
        pendingSinglesCount,
        incompleteCount,
        coordinatorStats,
        dashboard,
        discountCodes,
        twoFAConfigured: !!totpSecret,
        serverHealth,
        // "הגרף הראשי" (סקירה כללית) — נתונים לגרף המסכם המוטמע ליד מחוג מצב השרת
        stats,
        itemsSummary,
        registrations,
    };
};

// סגירה אחידה של החלטה על משאלה (אישור/דחייה) - best-effort, באותה תבנית של
// finalizeLocationDecision: 1) הודעת החלטה למבקש (אם היה מחובר) 2) סימון הודעות
// "משאלה חדשה" בתיבות הסופר-אדמינים כ"טופל" - נשארות כהיסטוריה, לא נמחקות.
// כשל בכל אחד מהשלבים לא מבטל את האישור/הדחייה עצמם.
async function finalizeWishDecision(wish: DbItem | undefined, decision: 'approve' | 'reject'): Promise<void> {
    if (!wish) return;
    const wishText = wish.description || wish.label;

    // 1. הודעת החלטה למבקש
    if (wish.user_id) {
        try {
            await createItem({
                category: 'message',
                label: decision === 'approve'
                    ? '✅ המשאלה שלך אושרה ומוצגת בכותל המשאלות'
                    : 'לגבי המשאלה ששלחת לכותל המשאלות',
                description: decision === 'approve'
                    ? `המנהל אישר את המשאלה ששלחת:\n\n"${wishText}"\n\nהיא מוצגת עכשיו בכותל המשאלות 🙏\n/community-fund`
                    : `לאחר בדיקה, המשאלה ששלחת:\n\n"${wishText}"\n\nלא אושרה לפרסום בכותל המשאלות כרגע. אפשר לנסח משאלה חדשה או לפנות אלינו דרך "כתוב למערכת" בפרופיל.`,
                icon:    decision === 'approve' ? '✅' : '💬',
                color:   decision === 'approve' ? 'green' : 'red',
                user_id: wish.user_id,
                extra_fields: {
                    type:       'wish_decision',
                    decision,
                    read:       false,
                    link:       '/community-fund',
                    decided_at: new Date().toISOString(),
                },
            });
        } catch (e) {
            console.warn('[admin/wish] notify requester failed:', e instanceof Error ? e.message : e);
        }
    }

    // 2. סימון הודעות "משאלה חדשה" בתיבות הסופר-אדמינים כ"טופל"
    try {
        const admins = await getAllSuperAdmins();
        const decisionWord = decision === 'approve' ? 'אושרה' : 'נדחתה';
        for (const admin of admins) {
            let msgs;
            try { msgs = await getMessagesByUserId(admin.id); } catch { continue; }
            const related = (msgs ?? []).filter((m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { return false; }
                if (ef?.handled) return false;
                if (String(ef?.type ?? '') !== 'wish_request') return false;
                return String(ef?.wish_item_id ?? '') === wish.id ||
                    String(ef?.wish_text ?? '').trim() === wishText.trim();
            });
            await Promise.all(related.map(async (m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch {}
                await updateItem(m.id, {
                    label: `${decision === 'approve' ? '✅' : '❌'} טופל (${decisionWord}) · ${(m.label ?? '').replace(/^[✅❌🙏]+\s*(טופל\s*\([^)]*\)\s*·\s*)?/, '')}`,
                    icon:  decision === 'approve' ? '✅' : '❌',
                    color: decision === 'approve' ? 'green' : 'red',
                    extra_fields: { ...ef, handled: true, decision, handled_at: new Date().toISOString() },
                });
            }));
        }
    } catch (e) {
        console.warn('[admin/wish] mark admin messages handled failed:', e instanceof Error ? e.message : e);
    }
}

export const actions: Actions = {
    ban: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });

        try {
            await banUser(userId);
            return { success: true, message: `משתמש ${userId} נחסם` };
        } catch (e) {
            return fail(500, { error: `שגיאה בחסימה: ${e instanceof Error ? e.message : e}` });
        }
    },

    unban: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });

        try {
            await unbanUser(userId);
            return { success: true, message: `חסימת ${userId} בוטלה` };
        } catch (e) {
            return fail(500, { error: `שגיאה בביטול חסימה: ${e instanceof Error ? e.message : e}` });
        }
    },

    deleteUser: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });
        // המזהה של המחובר לא נמחק - שלא ינעל את עצמו בחוץ
        if (userId === session?.user?.id) return fail(400, { error: 'אי אפשר למחוק את עצמך' });

        // כל החשבונות שאוחדו לכרטיס הזה (אימייל/טלפון משותפים) נמחקים יחד
        const mergedIds = (formData.get('mergedIds') as string ?? '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const ids = mergedIds.length > 0 ? mergedIds : [userId];

        try {
            const deleted = await deleteUserAccounts(ids);
            if (deleted === 0) return fail(404, { error: 'משתמש לא נמצא' });
            return { success: true, message: `המשתמש נמחק לצמיתות (${deleted} חשבונות)` };
        } catch (e) {
            return fail(500, { error: `שגיאה במחיקה: ${e instanceof Error ? e.message : e}` });
        }
    },

    setCoordinator: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const userId       = formData.get('userId') as string;
        const neighborhoods = (formData.get('neighborhoods') as string ?? '')
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);

        if (!userId) return fail(400, { error: 'חסר מזהה משתמש' });

        try {
            // אזורים שנגרעו בפעולה זו - מרגע העדכון הם נגזרים כ"פנויים" ב-takenAreas
            // של טופס הבקשה, ורכז חדש יכול להתמנות אליהם מיד
            const prior   = await getUserByAnyId(userId).catch(() => undefined);
            const kept    = new Set(neighborhoods);
            const removed = (prior?.coordinator_of ?? []).filter((a) => !kept.has(a.trim()));

            await setCoordinatorOf(userId, neighborhoods);

            // סגירת בקשות רכזות ממתינות שהמינוי הידני כבר מימש. בלי זה הבקשה נשארת
            // pending ורק *מוסתרת* כל עוד האזורים תואמים - ולכן צצה מחדש ככרטיס
            // "בקשה חדשה" בכל החלפת שכונה. כולל את האזורים הקודמים, כדי לסגור גם
            // בקשה שמומשה בעבר ושהאזור שלה מוחלף דווקא עכשיו.
            let closedRequests: string[] = [];
            try {
                const closed = await closeFulfilledCoordinatorRequests(
                    { id: userId, phone: prior?.phone, email: prior?.email },
                    [...(prior?.coordinator_of ?? []), ...neighborhoods],
                    session?.user?.id ?? 'admin',
                );
                closedRequests = closed.map((r) => r.neighborhoods.join(', ') || r.name || r.id);
            } catch (e) {
                console.warn('[admin/setCoordinator] close fulfilled requests failed:', e instanceof Error ? e.message : e);
            }

            // הודעה לרכז ששוחרר - best-effort, כשל בהודעה לא מבטל את ההסרה
            if (removed.length > 0) {
                try {
                    await createItem({
                        category: 'message',
                        label: 'ℹ️ עדכון בתפקיד הרכזות',
                        description: `שלום ${prior?.name || ''},\n\nהוסרת מתפקיד רכז ב${removed.join(', ')}. תודה רבה על תרומתך לקהילה 🙏\n\n— הנהלת קהילה בשכונה`,
                        contact: 'הנהלת קהילה בשכונה',
                        user_id: userId,
                        icon: 'ℹ️',
                        color: 'blue',
                        extra_fields: {
                            type: 'coordinator_removed',
                            sender_name: 'הנהלת קהילה בשכונה',
                            item_label: `סיום רכזות – ${removed.join(', ')}`,
                            read: false,
                        },
                    });
                } catch (e) {
                    console.warn('[admin/setCoordinator] notify removed failed:', e instanceof Error ? e.message : e);
                }
            }

            const msg = neighborhoods.length > 0
                ? `המשתמש מונה לרכז של: ${neighborhoods.join(', ')}`
                : 'הרכזות הוסרה - השכונות התפנו ורכז חדש יכול להתמנות אליהן';
            // הסגירה השקטה של בקשות ישנות תמיד מדווחת - אין פעולה שקטה בפאנל
            const closedMsg = closedRequests.length === 1
                ? ` · נסגרה בקשת רכזות ישנה שכבר מומשה (${closedRequests[0]})`
                : closedRequests.length > 1
                    ? ` · נסגרו ${closedRequests.length} בקשות רכזות ישנות שכבר מומשו (${closedRequests.join(' | ')})`
                    : '';
            return { success: true, message: msg + closedMsg };
        } catch (e) {
            return fail(500, { error: `שגיאה: ${e instanceof Error ? e.message : e}` });
        }
    },

    approveCoordRequest: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const requestId = formData.get('requestId') as string;
        if (!requestId) return fail(400, { error: 'חסר מזהה בקשה' });

        try {
            await approveCoordinatorRequest(requestId, session?.user?.id ?? 'admin');
            return { success: true, message: 'הבקשה אושרה - המשתמש מונה לרכז' };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    rejectCoordRequest: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const requestId = formData.get('requestId') as string;
        const reason = (formData.get('reason') as string) ?? '';
        if (!requestId) return fail(400, { error: 'חסר מזהה בקשה' });

        try {
            await rejectCoordinatorRequest(requestId, session?.user?.id ?? 'admin', reason);
            return { success: true, message: 'הבקשה נדחתה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    approveNeighborhood: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const neighborhoodId = formData.get('neighborhoodId') as string;
        if (!neighborhoodId) return fail(400, { error: 'חסר מזהה שכונה' });

        try {
            // שולפים את הרשומה לפני שינוי הסטטוס - לנתוני המבקש להודעת ההחלטה
            const nb = await getNeighborhoodById(neighborhoodId);
            await approveNeighborhood(neighborhoodId, session?.user?.id ?? 'admin');
            // אותה תוצאה כמו אישור מכרטיס ההודעה: הודעה למבקש + סימון "טופל" בתיבת האדמין
            if (nb) {
                await finalizeLocationDecision({
                    decision:    'approve',
                    location:    nb.name,
                    city:        nb.city,
                    requesterId: nb.user_id || undefined,
                });
            }
            return { success: true, message: 'השכונה אושרה - מעכשיו תופיע בבוררים ובמפה' };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    rejectNeighborhood: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const neighborhoodId = formData.get('neighborhoodId') as string;
        if (!neighborhoodId) return fail(400, { error: 'חסר מזהה שכונה' });

        try {
            const nb = await getNeighborhoodById(neighborhoodId);
            await rejectNeighborhood(neighborhoodId, session?.user?.id ?? 'admin');
            if (nb) {
                await finalizeLocationDecision({
                    decision:    'reject',
                    location:    nb.name,
                    city:        nb.city,
                    requesterId: nb.user_id || undefined,
                });
            }
            return { success: true, message: 'השכונה נדחתה' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    // הוספת שכונה ידנית ע"י הסופר-אדמין - בלי להמתין לבקשת תושב. יוצרת רשומת שכונה
    // (או מאתרת קיימת) ומאשרת אותה מיד, כך שתופיע בכל הבוררים והמפה. ברירת המחדל
    // לקואורדינטות היא מרכז העיר (אם ידוע), אלא אם הועבר פין מדויק מהטופס.
    addNeighborhood: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const name = (formData.get('name') as string ?? '').trim();
        const city = (formData.get('city') as string ?? '').trim();
        const latRaw = parseFloat(formData.get('lat') as string ?? '');
        const lngRaw = parseFloat(formData.get('lng') as string ?? '');
        if (!name || !city) return fail(400, { error: 'יש למלא גם שם שכונה וגם עיר' });

        try {
            const hasPin   = Number.isFinite(latRaw) && Number.isFinite(lngRaw);
            const fallback = cityCenters[city] ?? cityCenters[name] ?? cityCenters['ירושלים'];
            const created  = await createNeighborhoodRequest({
                name,
                city,
                lat: hasPin ? latRaw : fallback[0],
                lng: hasPin ? lngRaw : fallback[1],
            });

            if (created.status === 'approved') {
                return { success: true, message: `השכונה "${name}" (${city}) כבר קיימת ומאושרת` };
            }
            await approveNeighborhood(created.id, session?.user?.id ?? 'admin');
            return { success: true, message: `השכונה "${name}" (${city}) נוספה ואושרה — מעכשיו תופיע בבוררים ובמפה` };
        } catch (e) {
            return fail(500, { error: `שגיאה בהוספת שכונה: ${e instanceof Error ? e.message : e}` });
        }
    },

    approveWish: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const wishId = formData.get('wishId') as string;
        if (!wishId) return fail(400, { error: 'חסר מזהה משאלה' });

        try {
            // שולפים לפני שינוי הסטטוס - לנתוני המבקש להודעת ההחלטה
            const wish = await getDbItemByIdFresh(wishId);
            await updateItem(wishId, { status: 'active' });
            await finalizeWishDecision(wish, 'approve');
            return { success: true, message: 'המשאלה אושרה - מעכשיו תוצג בכותל המשאלות' };
        } catch (e) {
            return fail(500, { error: `שגיאה באישור: ${e instanceof Error ? e.message : e}` });
        }
    },

    rejectWish: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const wishId = formData.get('wishId') as string;
        if (!wishId) return fail(400, { error: 'חסר מזהה משאלה' });

        try {
            const wish = await getDbItemByIdFresh(wishId);
            await updateItem(wishId, { status: 'rejected' });
            await finalizeWishDecision(wish, 'reject');
            return { success: true, message: 'המשאלה נדחתה - לא תוצג בכותל' };
        } catch (e) {
            return fail(500, { error: `שגיאה בדחייה: ${e instanceof Error ? e.message : e}` });
        }
    },

    deleteItem: async (event) => {
        const session = await event.locals.auth();
        requireAdmin(session);

        const formData = await event.request.formData();
        const itemId = formData.get('itemId') as string;
        if (!itemId) return fail(400, { error: 'חסר מזהה פריט' });

        try {
            await adminDeleteItem(itemId, session?.user?.id ?? 'admin');
            return { success: true, message: 'הפריט נמחק' };
        } catch (e) {
            return fail(500, { error: `שגיאה במחיקה: ${e instanceof Error ? e.message : e}` });
        }
    },

    saveDiscounts: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const raw = formData.get('codes') as string;
        if (!raw) return fail(400, { error: 'חסרים נתונים' });

        let codes: DiscountCode[];
        try {
            codes = JSON.parse(raw);
            if (!Array.isArray(codes)) throw new Error('not an array');
        } catch {
            return fail(400, { error: 'מבנה הנתונים אינו תקין' });
        }

        // ולידציה + נירמול בסיסי
        const clean: DiscountCode[] = codes.map((c, i): DiscountCode => ({
            id:    String(c.id || `code_${i}`).trim(),
            label: String(c.label || '').trim(),
            code:  String(c.code || '').trim(),
            kind:  c.kind === 'free' ? 'free' : 'percent',
            percent: c.kind === 'free' ? 100 : Math.max(0, Math.min(100, Number(c.percent) || 0)),
            requiresCoordinator: Boolean(c.requiresCoordinator),
            active: Boolean(c.active),
            note:  c.note ? String(c.note).trim() : '',
        })).filter(c => c.code && c.label);

        try {
            await saveDiscountCodes(clean);
            return { success: true, message: 'קודי ההנחה נשמרו' };
        } catch (e) {
            return fail(500, { error: `שגיאה בשמירה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
