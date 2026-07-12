// דף סטטיסטיקה לרכז שכונה — מראה בדיוק כמו /admin/statistics אך מסונן
// לנתוני השכונה/ות שהרכז מנהל בלבד. הדף "נוצר בפועל" עבור כל רכז: ברגע
// שמשתמש מוגדר כרכז שכונה (coordinator_of), הראוט הדינמי הזה עובד עבורו
// ומציג רק את פרטי שכונתו.
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById, getAllItems, getAllUsers, getItemsByCategory } from '$lib/server/db';
import { SYSTEM_CATEGORIES, type ItemsSummary, type RegistrationsSummary } from '$lib/server/statsSummary';

// "אושיות (רחובות)" → { name: "אושיות", city: "רחובות" }  (זהה ל-/coordinator)
function parseArea(entry: string): { name: string; city: string } {
    const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    return m ? { name: m[1].trim(), city: m[2].trim() } : { name: entry.trim(), city: '' };
}
const stripCity = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();

export interface HelpCallsSummary {
    total: number;
    answered: number;
}

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator/statistics');

    const jwt = event.cookies.get('strapi_jwt');
    const user = await getUserById(session.user.id, jwt ?? undefined);
    if (!user) throw error(403, 'משתמש לא נמצא');

    const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
    const isAdmin       = user.role === 'neighborhood_admin' || user.role === 'super_admin';
    if (!isCoordinator && !isAdmin) {
        throw error(403, 'דף זה זמין רק לרכזי שכונות');
    }

    // השכונות שהרכז מנהל (סופר־אדמין רואה את שכונתו כברירת מחדל) — זהה ל-/coordinator.
    // סופר-אדמין יכול לצפות בכל שכונה דרך ?neighborhood=<שם> (לתצוגה מקדימה/דוגמה).
    const isSuper = user.role === 'super_admin';
    const previewParam = event.url.searchParams.get('neighborhood')?.trim();
    const isPreview = isSuper && !!previewParam;
    const neighborhoods = isPreview
        ? [previewParam!]
        : isSuper
            ? (user.coordinator_of?.length ? user.coordinator_of : [user.neighborhood].filter(Boolean))
            : (user.coordinator_of ?? []);

    // התאמה לפי שכונה + עיר (זהה ל-/coordinator ו-/api/coordinators)
    const areas = neighborhoods.map(parseArea);
    const inMyNeighborhoods = (it: { neighborhood?: string | null; city?: string | null }) => {
        if (!it.neighborhood) return false;
        const n = stripCity(it.neighborhood);
        return areas.some(a => a.name === n && (a.city ? it.city === a.city : true));
    };

    // כל הנתונים במקביל
    const [allItems, allUsers, rawHelp] = await Promise.all([
        getAllItems().catch(() => []),
        getAllUsers().catch(() => []),
        getItemsByCategory('raise_hand').catch(() => []),
    ]);

    // ---- סיכום התוכן שהועלה בשכונה (זהה ל-buildItemsSummary אך מסונן לשכונה) ----
    const myRealItems = allItems.filter(inMyNeighborhoods).filter((it) => !SYSTEM_CATEGORIES.has(it.category));
    const byCat = new Map<string, number>();
    const byMonthItems = new Map<string, number>();
    for (const it of myRealItems) {
        byCat.set(it.category, (byCat.get(it.category) ?? 0) + 1);
        const m = (it.created_at || '').slice(0, 7); // YYYY-MM
        if (/^\d{4}-\d{2}$/.test(m)) byMonthItems.set(m, (byMonthItems.get(m) ?? 0) + 1);
    }
    const itemsSummary: ItemsSummary = {
        total: myRealItems.length,
        byCategory: [...byCat.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
        byMonth: [...byMonthItems.entries()].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
    };

    // ---- נרשמים חדשים בשכונה לפי חודש (זהה ל-buildRegistrationsSummary אך מסונן) ----
    const myUsers = allUsers.filter(inMyNeighborhoods);
    const byMonthReg = new Map<string, number>();
    for (const u of myUsers) {
        const m = (u.created_at || '').slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(m)) byMonthReg.set(m, (byMonthReg.get(m) ?? 0) + 1);
    }
    const registrations: RegistrationsSummary = {
        total: myUsers.length,
        byMonth: [...byMonthReg.entries()].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
    };

    // ---- קריאות עזרה ("הרמת יד") בשכונה: סה״כ וכמה נענו ----
    const myHelp = rawHelp.filter(inMyNeighborhoods);
    let answered = 0;
    for (const it of myHelp) {
        let helpers: unknown = [];
        try { helpers = (JSON.parse(it.extra_fields || '{}') as { helpers?: unknown }).helpers; } catch { /* ignore */ }
        if (Array.isArray(helpers) && helpers.length > 0) answered++;
    }
    const helpCalls: HelpCallsSummary = { total: myHelp.length, answered };

    return { neighborhoods, itemsSummary, registrations, helpCalls, isPreview };
};
