// דף סטטיסטיקה - היסטוריית כניסות חודשיות לאתר (סופר-אדמין בלבד).
// הנתונים מגיעים מ-visit-stat ב-Strapi דרך cache של יממה - מתעדכנים פעם ביום.
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById, getUserByEmail, getItemsByCategory } from '$lib/server/db';
import { getVisitStats, getVisitsThisMonth } from '$lib/server/visitStats';
import { getServerHealth } from '$lib/server/serverHealth';
import { buildItemsSummary, buildRegistrationsSummary, type ItemsSummary, type RegistrationsSummary } from '$lib/server/statsSummary';

export interface HelpCallsSummary {
    total: number;
    answered: number;
    byYear: { year: number; calls: number; answered: number }[];
}

/** סיכום קריאות העזרה מהקהילה ("הרמת יד"): סה״כ, כמה נענו, ופילוח לפי שנה.
 *  קריאה "נענתה" כשמישהו לחץ "אני עוזר" → נוסף ל-extra_fields.helpers. */
async function buildHelpCallsSummary(): Promise<HelpCallsSummary> {
    const calls = await getItemsByCategory('raise_hand');
    const byYear = new Map<number, { calls: number; answered: number }>();
    let total = 0;
    let answered = 0;

    for (const it of calls) {
        total++;
        let helpers: unknown = [];
        try {
            helpers = (JSON.parse(it.extra_fields || '{}') as { helpers?: unknown }).helpers;
        } catch { /* extra_fields לא תקין - נחשב כלא-נענתה */ }
        const isAnswered = Array.isArray(helpers) && helpers.length > 0;
        if (isAnswered) answered++;

        const y = Number((it.created_at || '').slice(0, 4));
        if (Number.isFinite(y) && y > 2000) {
            if (!byYear.has(y)) byYear.set(y, { calls: 0, answered: 0 });
            const rec = byYear.get(y)!;
            rec.calls++;
            if (isAnswered) rec.answered++;
        }
    }

    return {
        total,
        answered,
        byYear: [...byYear.entries()].map(([year, v]) => ({ year, calls: v.calls, answered: v.answered })),
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSuperAdmin(event: any) {
    const session = await event.locals.auth();
    let isSA = session?.user?.role === 'super_admin';
    if (!isSA && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            isSA = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    if (!isSA) throw error(403, 'נדרשת הרשאת מנהל ראשי');
    return session;
}

export const load: PageServerLoad = async (event) => {
    await ensureSuperAdmin(event);

    let stats: Awaited<ReturnType<typeof getVisitStats>> = [];
    try {
        stats = await getVisitStats();
    } catch (e) {
        console.warn('[statistics] getVisitStats failed:', e);
    }

    let itemsSummary: ItemsSummary = { total: 0, byCategory: [], byMonth: [] };
    try {
        itemsSummary = await buildItemsSummary();
    } catch (e) {
        console.warn('[statistics] buildItemsSummary failed:', e);
    }

    let helpCalls: HelpCallsSummary = { total: 0, answered: 0, byYear: [] };
    try {
        helpCalls = await buildHelpCallsSummary();
    } catch (e) {
        console.warn('[statistics] buildHelpCallsSummary failed:', e);
    }

    let registrations: RegistrationsSummary = { total: 0, byMonth: [] };
    try {
        registrations = await buildRegistrationsSummary();
    } catch (e) {
        console.warn('[statistics] buildRegistrationsSummary failed:', e);
    }

    // לוח מכוונים של השרת (הבאקאנד) + כניסות החודש - לבאנר בתחתית הדף
    const serverHealth = await getServerHealth().catch((e) => {
        console.warn('[statistics] getServerHealth failed:', e);
        return null;
    });
    const monthlyVisits = await getVisitsThisMonth().catch(() => 0);

    return { stats, itemsSummary, helpCalls, registrations, serverHealth, monthlyVisits };
};
