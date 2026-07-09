import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireSuperAdmin, requireAdmin } from '$lib/server/auth';
import { getAllUsers, banUser, unbanUser, setUserRole, setCoordinatorOf, getAllItems, adminDeleteItem, getUserById, getUserByEmail, getCoordinatorRequests, approveCoordinatorRequest, rejectCoordinatorRequest, getNeighborhoods, getNeighborhoodById, approveNeighborhood, rejectNeighborhood, getDiscountCodes, saveDiscountCodes, getItemsByCategoryAndStatus, getUserTotpSecret } from '$lib/server/db';
import { finalizeLocationDecision } from '$lib/server/locationDecision';
import { DEFAULT_DISCOUNT_CODES, type DiscountCode } from '$lib/discountCodes';
import { countPending } from '$lib/server/adsStore';
import { getVisitsThisMonth } from '$lib/server/visitStats';
import { getServerHealth } from '$lib/server/serverHealth';

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

    const [users, items0, coordinatorRequests, pendingNeighborhoods] = await Promise.all([
        getAllUsers(jwt).catch((e) => { console.warn('[admin] getAllUsers failed:', e); return [] as Awaited<ReturnType<typeof getAllUsers>>; }),
        getAllItems().catch((e) => { console.warn('[admin] getAllItems failed:', e); return [] as Awaited<ReturnType<typeof getAllItems>>; }),
        getCoordinatorRequests('pending').catch((e) => { console.warn('[admin] getCoordinatorRequests failed:', e); return [] as Awaited<ReturnType<typeof getCoordinatorRequests>>; }),
        getNeighborhoods('pending').catch((e) => { console.warn('[admin] getNeighborhoods failed:', e); return [] as Awaited<ReturnType<typeof getNeighborhoods>>; }),
    ]);
    let items = items0;

    // הודעות מערכת (category='message') הן התראות אישיות למשתמש, לא פרסומים -
    // בלעדיהן מונה "פרסומים בקהילה" וטאב הפרסומים משקפים רק תוכן אמיתי בלוחות.
    items = items.filter((i) => i.category !== 'message');

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

    // בקשות רכזות - אותו הקשר מלא (מקום מגורים רשום + פרטי קשר) לכל כרטיס
    const coordinatorRequestsWithContext = coordinatorRequests.map((r) => ({
        ...r,
        requester: requesterContextFor(r.user_id, { name: r.name, phone: r.phone }),
    }));

    // ---- סטטיסטיקת רכזים: לכל רכז כמה פריטים כבר יש על המפה בשכונתו וכמה תושבים רשומים ----
    // התאמה לפי שכונה + עיר, בדיוק כמו /api/coordinators. פריט "על המפה" = בעל קואורדינטות (lat/lng).
    const coordinatorStats = buildCoordinatorStats(users, items);

    // ---- סיכום ללוח הבקרה (באנר עליון) ----
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const inThisMonth = (iso?: string | null) => {
        if (!iso) return false;
        const t = new Date(iso).getTime();
        return !isNaN(t) && t >= monthStart;
    };
    // כניסות החודש - נספר ב-visit-stat, מוצג עם רענון של פעם ביום (cache בשכבת visitStats).
    // ה-promise יצא לדרך בתחילת ה-load, כאן רק אוספים את התוצאה.
    const monthlyVisits = await monthlyVisitsPromise;

    const dashboard = {
        totalUsers:        users.length,
        totalItems:        items.length,
        totalCoordinators: users.filter(u => ((u as any).coordinator_of?.length ?? 0) > 0).length,
        newUsersThisMonth: users.filter(u => inThisMonth((u as any).created_at)).length,
        newItemsThisMonth: items.filter(i => inThisMonth((i as any).created_at)).length,
        monthlyVisits,
    };

    const [pendingAdsCount, pendingSinglesCount, discountCodes, totpSecret, serverHealth] =
        await Promise.all([pendingAdsPromise, pendingSinglesPromise, discountCodesPromise, totpPromise, serverHealthPromise]);

    return {
        users,
        items,
        coordinatorRequests: coordinatorRequestsWithContext,
        pendingNeighborhoods: pendingNeighborhoodsWithRequester,
        currentUserId: session?.user?.id ?? '',
        pendingAdsCount,
        pendingSinglesCount,
        coordinatorStats,
        dashboard,
        discountCodes,
        twoFAConfigured: !!totpSecret,
        serverHealth,
    };
};

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

    setRole: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const formData = await event.request.formData();
        const userId = formData.get('userId') as string;
        const role = formData.get('role') as string;
        const neighborhood = formData.get('neighborhood') as string || undefined;

        if (!userId || !role) return fail(400, { error: 'חסרים פרטים' });

        try {
            await setUserRole(userId, role, neighborhood);
            return { success: true, message: `תפקיד עודכן ל-${role}` };
        } catch (e) {
            return fail(500, { error: `שגיאה בעדכון תפקיד: ${e instanceof Error ? e.message : e}` });
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
            await setCoordinatorOf(userId, neighborhoods);
            const msg = neighborhoods.length > 0
                ? `המשתמש מונה לרכז של: ${neighborhoods.join(', ')}`
                : 'הרכזות הוסרה מהמשתמש';
            return { success: true, message: msg };
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
