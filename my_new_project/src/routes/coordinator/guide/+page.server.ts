import { redirect, error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserById, getUserByEmail, getItemsByCategory, createItem, updateItem } from '$lib/server/db';
import { DEFAULT_GUIDE, mergeGuide, type GuideContent } from './defaults';

// רשומת התוכן של המדריך: קטגוריה בקידומת '__' = רשומת תשתית, חסומה אוטומטית
// מכל מסלול ציבורי (חיפוש, מפה, מונים, sitemap) דרך isPrivateCategory/isFamilyItem
const GUIDE_CATEGORY = '__site_content';
const GUIDE_LABEL    = 'coordinator_guide';

/** התוכן השמור מ-Strapi ממוזג מעל ברירות המחדל; כל כשל → ברירות המחדל */
async function loadStoredGuide(): Promise<GuideContent> {
    try {
        const rows = await getItemsByCategory(GUIDE_CATEGORY);
        const row = rows.find((r) => r.label === GUIDE_LABEL);
        if (!row?.extra_fields) return DEFAULT_GUIDE;
        return mergeGuide(DEFAULT_GUIDE, JSON.parse(row.extra_fields));
    } catch {
        return DEFAULT_GUIDE;
    }
}

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) throw redirect(302, '/login?redirect=/coordinator/guide');

    // תקלת Strapi זמנית (throw) = 503 "נסה שוב" - לא 403 שמרגיש כמו גירוש
    const jwt = event.cookies.get('strapi_jwt');
    let user;
    try {
        user = await getUserById(session.user.id, jwt ?? undefined);
    } catch (e) {
        console.warn('[coordinator/guide] getUserById failed:', e instanceof Error ? e.message : e);
        throw error(503, 'תקלה זמנית בשרת - נסה שוב בעוד רגע');
    }
    // חשבון ממוזג (OAuth+אימייל) לא נמצא לפי id - נופלים לאימייל, כמו בפרופיל
    if (!user && session.user.email) {
        try { user = await getUserByEmail(session.user.email); } catch { /* ignore */ }
    }
    if (!user) throw error(403, 'משתמש לא נמצא');

    const isCoordinator = (user.coordinator_of?.length ?? 0) > 0;
    const isAdmin       = user.role === 'neighborhood_admin' || user.role === 'super_admin';
    if (!isCoordinator && !isAdmin) {
        throw error(403, 'המדריך זמין רק לרכזי שכונות');
    }

    return {
        guide:   await loadStoredGuide(),
        isSuper: user.role === 'super_admin',
    };
};

export const actions: Actions = {
    // שמירת תוכן המדריך שנערך מהאתר (גלגל השיניים) - סופר-אדמין בלבד.
    // הרשומה נוצרת בפעם הראשונה ומעודכנת מאז; כולם רואים את הגרסה השמורה.
    saveGuide: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'נדרשת התחברות' });

        let isSuper = session.user.role === 'super_admin';
        if (!isSuper) {
            try {
                let dbUser = await getUserById(session.user.id);
                if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
                isSuper = dbUser?.role === 'super_admin';
            } catch { /* ignore */ }
        }
        if (!isSuper) return fail(403, { error: 'עריכת המדריך שמורה למנהל הראשי' });

        const raw = (await event.request.formData()).get('content')?.toString() ?? '';
        if (!raw || raw.length > 300_000) return fail(400, { error: 'תוכן לא תקין' });
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { return fail(400, { error: 'תוכן לא תקין' }); }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return fail(400, { error: 'תוכן לא תקין' });
        }
        // מיזוג מעל ברירות המחדל גם בשמירה - מהדק את המבנה לצורת המדריך בלבד
        const content = mergeGuide(DEFAULT_GUIDE, parsed);

        try {
            const rows = await getItemsByCategory(GUIDE_CATEGORY);
            const row = rows.find((r) => r.label === GUIDE_LABEL);
            if (row) {
                await updateItem(row.id, { extra_fields: content });
            } else {
                await createItem({
                    category:     GUIDE_CATEGORY,
                    label:        GUIDE_LABEL,
                    description:  'תוכן מדריך הרכזים - נערך מדף המדריך באתר בלבד',
                    icon:         '📘',
                    color:        'amber',
                    user_id:      session.user.id,
                    extra_fields: content,
                });
            }
            return { saved: true };
        } catch (e) {
            console.warn('[coordinator/guide] save failed:', e);
            return fail(500, { error: 'השמירה נכשלה - נסה שוב' });
        }
    },
};
