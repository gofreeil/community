import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireSuperAdmin, requireAdmin } from '$lib/server/auth';
import { withUserAvatarUrl } from '$lib/server/userAvatar';
import { getAllUsers, banUser, unbanUser, deleteUserAccounts, setCoordinatorOf, getAllItems, adminDeleteItem, getUserById, getUserByAnyId, getUserByEmail, createItem, getCoordinatorRequests, approveCoordinatorRequest, rejectCoordinatorRequest, getNeighborhoods, getNeighborhoodById, approveNeighborhood, rejectNeighborhood, createNeighborhoodRequest, getDiscountCodes, saveDiscountCodes, getItemsByCategoryAndStatus, getUserTotpSecret, coordinatorCovers, closeFulfilledCoordinatorRequests, updateItem, getDbItemByIdFresh, getAllSuperAdmins, getMessagesByUserId, getAllUsersRaw, updateUserProfile, markUsersSmsNudged, markUsersSmsCampaign, adminSmsSend, adminSmsStatus, userSchemaHasField, type DbItem } from '$lib/server/db';
import { markCoordinatorMessagesHandled } from '$lib/server/coordinatorNotifications';
import { finalizeLocationDecision } from '$lib/server/locationDecision';
import { finalizeWishDecision } from '$lib/server/wishDecision';
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
        // תמונות פרופיל מוטבעות → כתובות עם קאש (userAvatar.ts); extra_fields של
        // הפריטים (גלריות פנויים, לוגואים על המפה...) לא נקראים בעמוד הזה בכלל -
        // הסיכומים חושבו כבר כאן בשרת. יחד: 6.8MB/12 שניות → מאות KB.
        users: users.map(withUserAvatarUrl),
        items: items.map((i) => (i.extra_fields && i.extra_fields !== '{}' ? { ...i, extra_fields: '{}' } : i)),
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
export const actions: Actions = {
    /**
     * השלמה רטרואקטיבית של עיר/שכונה למשתמשים שנרשמו בלי (רוב המשתמשים): לוקחים
     * את העיר השכיחה ביותר מהפריטים שהמשתמש עצמו פרסם, ואת השכונה השכיחה באותה עיר.
     * לא נוגע במי שכבר יש לו עיר. הודעות/בקשות פנימיות לא נחשבות "מיקום".
     */
    backfillUserLocations: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const SKIP_CATEGORIES = new Set(['message', 'location_request', 'coordinator_request', 'wish']);
        try {
            const [users, items] = await Promise.all([getAllUsersRaw(), getAllItems()]);

            // פריטים עם מיקום, מקובצים לפי המפרסם
            const byUser = new Map<string, { city: string; neighborhood: string }[]>();
            for (const it of items) {
                if (!it.user_id || !it.city?.trim() || SKIP_CATEGORIES.has(it.category)) continue;
                const list = byUser.get(it.user_id) ?? [];
                list.push({ city: it.city.trim(), neighborhood: (it.neighborhood ?? '').trim() });
                byUser.set(it.user_id, list);
            }
            const mostCommon = (vals: string[]): string => {
                const counts = new Map<string, number>();
                for (const v of vals) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
                let best = '', n = 0;
                for (const [v, c] of counts) if (c > n) { best = v; n = c; }
                return best;
            };

            let filled = 0, candidates = 0;
            for (const u of users) {
                if (u.city?.trim()) continue;
                const locs = byUser.get(u.id);
                if (!locs?.length) continue;
                candidates++;
                const city = mostCommon(locs.map((l) => l.city));
                if (!city) continue;
                // שכונה: השכיחה בין הפריטים של אותה עיר; "מרכז" רק אם אין אחרת
                const inCity = locs.filter((l) => l.city === city).map((l) => l.neighborhood);
                const neighborhood = mostCommon(inCity.filter((n) => n && n !== 'מרכז')) || mostCommon(inCity);
                try {
                    await updateUserProfile(u.id, { city, ...(neighborhood ? { neighborhood } : {}) });
                    filled++;
                } catch (e) {
                    console.warn('[admin] backfill user location failed:', u.id, e instanceof Error ? e.message : e);
                }
            }
            const noCity = users.filter((u) => !u.city?.trim()).length;
            return {
                success: true,
                message: `הושלמו עיר/שכונה ל-${filled} משתמשים מתוך ${candidates} שיש להם פרסומים עם מיקום. ` +
                         `${Math.max(0, noCity - filled)} משתמשים נשארו בלי עיר (אין להם פרסומים - יתמלאו כשיבחרו שכונה באתר).`,
            };
        } catch (e) {
            return fail(500, { error: `שגיאה בהשלמת מיקומים: ${e instanceof Error ? e.message : e}` });
        }
    },

    /**
     * SMS קבוצתי מעמוד הניהול - מנה אחת לכל קריאה (עד 20), הפרונט קורא שוב עד שנגמר.
     * mode=test → רק לנייד של המנהל עצמו (הנוסח נבדק לפני שליחה לכולם).
     * קהלים (audience):
     *   no_city  - בלי עיר בפרופיל; דדופ לפי sms_profile_nudge_at.
     *   imported - נוספו מייבוא (import_source), אפשר לסנן למקור אחד; דדופ לפי מפתח קמפיין
     *              (campaign) שנרשם ב-sms_campaigns של המשתמש - כך קמפיין חדש לא נחסם ע"י קודם.
     * תמיד: נייד ישראלי תקין, לא חסום. מי שהצליח מסומן מיד - ריצה שנעצרה לא שולחת פעמיים.
     */
    smsIncompleteProfiles: async (event) => {
        const session = await event.locals.auth();
        requireSuperAdmin(session);

        const form = await event.request.formData();
        const message  = form.get('message')?.toString().trim() ?? '';
        const mode     = form.get('mode')?.toString() === 'test' ? 'test' : 'batch';
        const audience = form.get('audience')?.toString() === 'imported' ? 'imported' : 'no_city';
        const source   = form.get('source')?.toString().trim() ?? '';        // '' = כל המקורות
        const campaign = form.get('campaign')?.toString().trim().slice(0, 60) ?? '';
        if (!message) return fail(400, { smsError: 'חסר נוסח ההודעה' });
        if (message.length > 600) return fail(400, { smsError: 'ההודעה ארוכה מדי (עד 600 תווים)' });
        if (audience === 'imported' && !/^[a-z0-9-]{3,60}$/i.test(campaign)) {
            return fail(400, { smsError: 'חסר מפתח קמפיין תקין (אותיות/ספרות/מקף) - לפיו נמנעת שליחה כפולה' });
        }

        const isMobile = (p: string | null | undefined) => {
            let d = (p ?? '').replace(/\D/g, '');
            if (d.startsWith('972')) d = '0' + d.slice(3);
            return /^05\d{8}$/.test(d);
        };

        try {
            const status = await adminSmsStatus();
            if (!status.enabled) return fail(503, { smsError: 'בבאקאנד לא מוגדר ספק SMS (SMSGATE / TRACCAR / TWILIO)' });
            const perCall = Math.max(1, Math.min(20, status.maxPerCall || 20));

            // שער בטיחות: בלי השדה sms_campaigns בבאקאנד, הסימון "נשלח" נכשל בשקט והמנה
            // הבאה שולחת שוב לאותם אנשים. עוצרים לפני שנשלחת הודעה אחת.
            if (audience === 'imported' && mode !== 'test' && !(await userSchemaHasField('sms_campaigns'))) {
                return fail(503, { smsError: 'הבאקאנד עדיין לא פרוס עם שדה sms_campaigns - בלי רישום "נשלח" ההודעה תצא פעמיים. נסה שוב בעוד כמה דקות.' });
            }

            if (mode === 'test') {
                const me = session?.user?.id ? await getUserById(session.user.id as string) : undefined;
                if (!isMobile(me?.phone)) return fail(400, { smsError: 'בפרופיל שלך אין נייד תקין לשליחת בדיקה' });
                const [r] = await adminSmsSend([{ phone: me!.phone, name: me?.name ?? '', city: me?.city ?? '' }], message);
                if (!r?.ok) return fail(502, { smsError: `שליחת הבדיקה נכשלה: ${r?.error ?? 'unknown'}` });
                return { smsResult: { mode: 'test', sent: 1, failed: 0, remaining: 0, provider: status.provider } };
            }

            const users = await getAllUsersRaw();
            const pending = users.filter((u) => {
                if (u.banned || !isMobile(u.phone)) return false;
                if (audience === 'imported') {
                    return !!u.import_source && (!source || u.import_source === source) && !u.sms_campaigns.includes(campaign);
                }
                return !u.city?.trim() && !u.sms_profile_nudge_at;
            });
            const batch = pending.slice(0, perCall);
            if (!batch.length) {
                return { smsResult: { mode: 'batch', sent: 0, failed: 0, remaining: 0, provider: status.provider } };
            }

            const results = await adminSmsSend(
                batch.map((u) => ({ phone: u.phone, name: u.name ?? '', city: u.city ?? '' })), message,
            );
            const okPhones = new Set(results.filter((r) => r.ok).map((r) => r.phone));
            const okIds = batch.filter((u) => okPhones.has(u.phone)).map((u) => u.id);
            if (okIds.length) {
                if (audience === 'imported') await markUsersSmsCampaign(okIds, campaign);
                else await markUsersSmsNudged(okIds);
            }

            const failed = results.filter((r) => !r.ok);
            return {
                smsResult: {
                    mode: 'batch',
                    sent: okIds.length,
                    failed: failed.length,
                    // מי שנכשל לא סומן - ייכלל שוב במנה הבאה; כדי לא להסתובב לנצח על
                    // אותם כשלים, "נותרו" לא כולל אותם בקריאה הזו
                    remaining: Math.max(0, pending.length - batch.length),
                    failedSample: failed.slice(0, 3).map((r) => `${r.phone}: ${r.error ?? ''}`),
                    provider: status.provider,
                },
            };
        } catch (e) {
            return fail(500, { smsError: `שגיאה בשליחת SMS: ${e instanceof Error ? e.message : e}` });
        }
    },

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
                // ההתראה על בקשה שהמינוי הידני מימש יורדת יחד עם סגירתה - אחרת
                // היא נשארת בתיבה כבקשה שלא נקראה על מישהו שכבר מונה. best-effort.
                if (closed.length > 0) {
                    try { await markCoordinatorMessagesHandled(closed, 'approve'); }
                    catch (e) { console.warn('[admin/setCoordinator] mark messages failed:', e instanceof Error ? e.message : e); }
                }
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
            const req = await approveCoordinatorRequest(requestId, session?.user?.id ?? 'admin');
            // ההתראה "🙋 בקשת רכז חדשה" בתיבות המנהלים יורדת יחד עם ההחלטה -
            // אחרת היא נשארת כהודעה שלא נקראה על בקשה שכבר טופלה. best-effort.
            try { await markCoordinatorMessagesHandled([req], 'approve'); }
            catch (e) { console.warn('[admin/approveCoordRequest] mark messages failed:', e instanceof Error ? e.message : e); }
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
            const req = await rejectCoordinatorRequest(requestId, session?.user?.id ?? 'admin', reason);
            // גם דחייה מורידה את ההתראה מהתיבה - הבקשה הוכרעה. best-effort.
            if (req) {
                try { await markCoordinatorMessagesHandled([req], 'reject'); }
                catch (e) { console.warn('[admin/rejectCoordRequest] mark messages failed:', e instanceof Error ? e.message : e); }
            }
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
