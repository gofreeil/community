import { getItemsByCategory, getUserById } from '$lib/server/db';
import type { PageServerLoad } from './$types';

function isHostItem(extraFields: string): boolean {
    try {
        return String(JSON.parse(extraFields || '{}').offer_type ?? '').includes('מציע');
    } catch { return false; }
}

export const load: PageServerLoad = async (event) => {
    try {
        const session = await event.locals.auth();
        const userId = (session?.user?.id as string) ?? null;

        const [rawItems, reportItems] = await Promise.all([
            getItemsByCategory('realestate'),
            getItemsByCategory('shabbat_report'),
        ]);

        // phone → set of distinct host user_ids who reported that phone
        const reportMap: Record<string, Set<string>> = {};
        for (const r of reportItems) {
            const p = r.phone?.trim();
            if (!p || !r.user_id) continue;
            if (!reportMap[p]) reportMap[p] = new Set();
            reportMap[p].add(r.user_id);
        }

        // טלפונים חסומים (2+ מארחים שונים דיווחו)
        const bannedPhones = new Set<string>(
            Object.entries(reportMap)
                .filter(([, reporters]) => reporters.size >= 2)
                .map(([phone]) => phone)
        );

        // סנן אורחים חסומים מהרשימה
        const items = rawItems.filter(item =>
            isHostItem(item.extra_fields) ||
            !bannedPhones.has(item.phone?.trim() ?? '')
        );

        let isBanned = false;
        let blockedHostUserIds: string[] = [];

        if (userId) {
            const u = await getUserById(userId);
            const viewerPhone = u?.phone?.trim() ?? '';
            if (viewerPhone) {
                const reporters = reportMap[viewerPhone];
                if (reporters && reporters.size >= 2) isBanned = true;
                blockedHostUserIds = reporters ? [...reporters] : [];
            }
        }

        return { items, city: null as string | null, userId, isBanned, blockedHostUserIds };
    } catch (e) {
        console.warn('[shabbat-hosting] load failed:', e instanceof Error ? e.message : e);
        return { items: [], city: null as string | null, userId: null, isBanned: false, blockedHostUserIds: [] };
    }
};
