import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isSuperAdmin, isAdmin } from '$lib/server/auth';
import {
    getAllItems, getAllUsers, getDbItemByIdFresh, updateItem, createItem,
    getNeighborhoods, getUserById, getUserByEmail,
} from '$lib/server/db';
import { isFamilyItem } from '$lib/itemCategories';
import { canonicalCity, citiesAndNeighborhoods } from '$lib/neighborhoodsData';
import { locationProblems, needsCompletion, locationAssignee, isLocationApproved } from '$lib/incompleteItems';

/**
 * הרשאה: סופר-אדמין רואה את כל הפריטים להשלמה; אדמין שכונה רואה רק את מה
 * שהועבר אליו. כך אפשר להעביר משימה הלאה בלי לפתוח את כל לוח הניהול.
 */
async function resolveRole(event: Parameters<PageServerLoad>[0]) {
    const session = await event.locals.auth();
    let superAdmin = isSuperAdmin(session);
    if (!superAdmin && session?.user?.id) {
        try {
            let u = await getUserById(session.user.id);
            if (!u && session.user.email) u = await getUserByEmail(session.user.email);
            superAdmin = u?.role === 'super_admin';
        } catch { /* נשארים עם מה שיש בסשן */ }
    }
    return { session, superAdmin, admin: superAdmin || isAdmin(session) };
}

export const load: PageServerLoad = async (event) => {
    const { session, superAdmin, admin } = await resolveRole(event);
    if (!admin) throw error(403, 'נדרשת הרשאת ניהול');

    const myId = session?.user?.id ?? '';

    const [items0, approvedNeighborhoods, users] = await Promise.all([
        getAllItems().catch((e) => { console.warn('[admin/incomplete] getAllItems failed:', e); return []; }),
        getNeighborhoods('approved').catch(() => []),
        // רשימת היעדים להעברה נחוצה רק לסופר-אדמין
        superAdmin
            ? getAllUsers(event.cookies.get('strapi_jwt')).catch((e) => {
                console.warn('[admin/incomplete] getAllUsers failed:', e); return [];
            })
            : Promise.resolve([]),
    ]);

    const all = items0.filter((i) => isFamilyItem(i.category));

    const rows = all
        .filter((i) => needsCompletion(i, approvedNeighborhoods, true))
        .map((i) => {
            const assignee = locationAssignee(i);
            return {
                id:           i.id,
                label:        i.label,
                category:     i.category,
                icon:         i.icon,
                description:  (i.description ?? '').slice(0, 120),
                city:         i.city ?? '',
                neighborhood: i.neighborhood ?? '',
                address:      i.address ?? '',
                phone:        i.phone ?? '',
                contact:      i.contact ?? '',
                lat:          i.lat,
                lng:          i.lng,
                created_at:   i.created_at,
                problems:     locationProblems(i, approvedNeighborhoods),
                assignee,
            };
        })
        // אדמין שכונה רואה רק את מה שהועבר אליו
        .filter((r) => superAdmin || r.assignee?.id === myId)
        .sort((a, b) => {
            // הכי חמור קודם, ובתוך אותה חומרה - החדש קודם
            const sev = (r: typeof a) => (r.problems[0] === 'city_unknown' ? 3 : r.problems[0] === 'neighborhood_unknown' ? 2 : r.problems[0] === 'neighborhood_missing' ? 1 : 0);
            if (sev(b) !== sev(a)) return sev(b) - sev(a);
            return (b.created_at || '').localeCompare(a.created_at || '');
        });

    // יעדי העברה: סופר-אדמינים ואדמיני שכונה (לא כולל אני עצמי)
    const assignableAdmins = users
        .filter((u) => (u.role === 'super_admin' || u.role === 'neighborhood_admin') && u.id !== myId)
        .map((u) => ({
            id:   u.id,
            name: u.name || u.nickname || u.email || u.id,
            role: u.role,
            area: [u.neighborhood, u.city].filter(Boolean).join(', '),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'he'));

    return {
        rows,
        superAdmin,
        myId,
        assignableAdmins,
        cities: Object.keys(citiesAndNeighborhoods).sort((a, b) => a.localeCompare(b, 'he')),
        approvedNeighborhoods,
        // כמה כבר סומנו "תקין כמו שהוא" - כדי להראות התקדמות אמיתית
        approvedCount: all.filter(isLocationApproved).length,
    };
};

/** בדיקת הרשאה לפעולה על פריט ספציפי: סופר-אדמין, או האדמין שהמשימה הועברה אליו. */
async function guardItem(event: Parameters<Actions[string]>[0], itemId: string) {
    const { session, superAdmin, admin } = await resolveRole(event as Parameters<PageServerLoad>[0]);
    if (!admin) throw error(403, 'נדרשת הרשאת ניהול');
    const item = await getDbItemByIdFresh(itemId);
    if (!item) return { error: fail(404, { error: 'הפריט לא נמצא' }) };
    if (!superAdmin && locationAssignee(item)?.id !== (session?.user?.id ?? '')) {
        return { error: fail(403, { error: 'המשימה הזו לא הועברה אליך' }) };
    }
    let ef: Record<string, unknown> = {};
    try { ef = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { ef = {}; }
    return { item, ef, session, superAdmin };
}

export const actions: Actions = {
    /** השלמת המיקום: עיר + שכונה. הפריט יורד מהרשימה ברגע ששניהם מזוהים. */
    fixLocation: async (event) => {
        const fd = await event.request.formData();
        const itemId = String(fd.get('itemId') ?? '');
        const city = String(fd.get('city') ?? '').trim();
        const neighborhood = String(fd.get('neighborhood') ?? '').trim();
        if (!itemId) return fail(400, { error: 'חסר מזהה פריט' });
        if (!city) return fail(400, { error: 'יש לבחור עיר' });

        const g = await guardItem(event, itemId);
        if (g.error) return g.error;

        const canon = canonicalCity(city);
        if (!citiesAndNeighborhoods[canon]) return fail(400, { error: `"${city}" אינה עיר ברשימה` });

        try {
            await updateItem(itemId, {
                city: canon,
                neighborhood,
                // המיקום הושלם ידנית - מסירים את סימון ההעברה כדי שלא יישאר
                // "משויך" אחרי שהמשימה נגמרה.
                extra_fields: {
                    ...g.ef,
                    // undefined נושר ב-JSON.stringify - כך סימון ההעברה נמחק
                    location_assignee: undefined,
                    location_assignee_name: undefined,
                    location_fixed_by: g.session?.user?.id ?? '',
                    location_fixed_at: new Date().toISOString(),
                },
            });
            return { success: true, message: `המיקום של "${g.item.label}" עודכן ל-${[neighborhood, canon].filter(Boolean).join(', ')}` };
        } catch (e) {
            return fail(500, { error: `עדכון נכשל: ${e instanceof Error ? e.message : e}` });
        }
    },

    /**
     * "תקין כמו שהוא" - לגמ"ח ארצי ולכל פריט שאין לו באמת עיר. בלי זה הוא היה
     * נשאר ברשימה לנצח, ואי-אפשר היה להגיע לאפס.
     */
    markOk: async (event) => {
        const fd = await event.request.formData();
        const itemId = String(fd.get('itemId') ?? '');
        if (!itemId) return fail(400, { error: 'חסר מזהה פריט' });

        const g = await guardItem(event, itemId);
        if (g.error) return g.error;

        try {
            await updateItem(itemId, {
                extra_fields: {
                    ...g.ef,
                    location_ok: true,
                    location_ok_by: g.session?.user?.id ?? '',
                    location_ok_at: new Date().toISOString(),
                    location_assignee: undefined,
                    location_assignee_name: undefined,
                },
            });
            return { success: true, message: `"${g.item.label}" סומן כתקין - ירד מהרשימה` };
        } catch (e) {
            return fail(500, { error: `העדכון נכשל: ${e instanceof Error ? e.message : e}` });
        }
    },

    /** העברת המשימה לאדמין אחר + הודעה פנימית אליו עם קישור ישיר. */
    assign: async (event) => {
        const { session, superAdmin } = await resolveRole(event as unknown as Parameters<PageServerLoad>[0]);
        if (!superAdmin) return fail(403, { error: 'רק מנהל ראשי יכול להעביר משימות' });

        const fd = await event.request.formData();
        const itemId = String(fd.get('itemId') ?? '');
        const adminId = String(fd.get('adminId') ?? '').trim();
        const adminName = String(fd.get('adminName') ?? '').trim();
        if (!itemId) return fail(400, { error: 'חסר מזהה פריט' });

        const item = await getDbItemByIdFresh(itemId);
        if (!item) return fail(404, { error: 'הפריט לא נמצא' });
        let ef: Record<string, unknown> = {};
        try { ef = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { ef = {}; }

        // adminId ריק = ביטול ההעברה
        if (!adminId) {
            try {
                await updateItem(itemId, {
                    extra_fields: { ...ef, location_assignee: undefined, location_assignee_name: undefined },
                });
                return { success: true, message: `ההעברה של "${item.label}" בוטלה` };
            } catch (e) {
                return fail(500, { error: `הביטול נכשל: ${e instanceof Error ? e.message : e}` });
            }
        }

        try {
            await updateItem(itemId, {
                extra_fields: {
                    ...ef,
                    location_assignee: adminId,
                    location_assignee_name: adminName,
                    location_assigned_by: session?.user?.id ?? '',
                    location_assigned_at: new Date().toISOString(),
                },
            });

            // הודעה פנימית לאדמין שקיבל את המשימה. await חובה - ב-Vercel עבודה
            // לא-מוחכה אחרי ה-return מתה וההודעה לא הייתה נכתבת.
            const problems = locationProblems(item).map((p) => p).join(', ');
            await createItem({
                category: 'message',
                label: '📍 הועברה אליך השלמת מיקום של פריט',
                description:
                    `הפריט "${item.label}" צריך השלמת מיקום (${problems}).\n` +
                    `כרגע רשום: ${[item.neighborhood, item.city].filter(Boolean).join(', ') || 'ללא מיקום'}.\n\n` +
                    `להשלמה: /admin/incomplete`,
                contact: '',
                user_id: adminId,
                icon: '📍',
                color: 'blue',
                extra_fields: { type: 'location_task', read: false, link: '/admin/incomplete', item_id: itemId },
            });

            return { success: true, message: `"${item.label}" הועבר ל${adminName ? '־' + adminName : 'אדמין'} - נשלחה לו הודעה` };
        } catch (e) {
            return fail(500, { error: `ההעברה נכשלה: ${e instanceof Error ? e.message : e}` });
        }
    },
};
