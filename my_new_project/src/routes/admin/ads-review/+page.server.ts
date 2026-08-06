import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserById, getUserByEmail } from '$lib/server/db';
import {
    listPending,
    listApproved,
    approveAd,
    rejectAd,
    unrejectAd,
    unapproveAd,
    removeAd,
    updateAdFields,
    getAdsStats,
    listSchedules,
    listAdvertisers,
    processExpiryReminders,
    moveApprovedAd,
    setAdDuration,
    normalizeDurationDays,
    pauseAd,
    resumeAd,
} from '$lib/server/adsStore';
import { markAdMessagesHandled } from '$lib/server/adNotifications';

const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** התפקיד האמיתי של המשתמש - מה-session, ובנפילה לאחור מה-DB (session ישן) */
async function resolveRole(event: any): Promise<string> {
    const session = await event.locals.auth();
    let role = session?.user?.role ?? '';
    if (role !== 'super_admin' && role !== 'neighborhood_admin' && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            role = dbUser?.role ?? role;
        } catch { /* ignore */ }
    }
    return role;
}

/** אישור פרסומות פתוח לסופר-אדמין וגם לאדמין שמונה - שניהם מקבלים את ההתראה */
async function ensureAdsAdmin(event: any) {
    const session = await event.locals.auth();
    const role = await resolveRole(event);
    if (role !== 'super_admin' && role !== 'neighborhood_admin') {
        throw error(403, 'נדרשת הרשאת ניהול');
    }
    return { session, role };
}

/** מחיקה לצמיתות שמורה לסופר-אדמין; אדמין שמונה מוריד מהאתר ולא מוחק */
async function ensureSuperAdmin(event: any) {
    const { session, role } = await ensureAdsAdmin(event);
    if (role !== 'super_admin') throw error(403, 'נדרשת הרשאת מנהל ראשי');
    return session;
}

export const load: PageServerLoad = async (event) => {
    const { role } = await ensureAdsAdmin(event);
    // Lazy cron: בכל טעינה של הדף - בודק אם יש פרסומות שצריך לשלוח עליהן תזכורת.
    // אידימפוטנטי, שולח רק פעם אחת לכל שלב (30/7/1 ימים לפני פקיעה).
    const reminderRun = await processExpiryReminders().catch(() => ({ sent: 0, checked: 0 }));
    const [pendingRes, approvedRes, statsRes, schedulesRes, advertisersRes] = await Promise.allSettled([
        listPending(),
        listApproved(),
        getAdsStats(),
        listSchedules(),
        listAdvertisers(),
    ]);

    const emptyStats = { pending: 0, rejected: 0, approved: 0, approvedThisWeek: 0, submittedThisWeek: 0, total: 0 };
    const pending     = pendingRes.status     === 'fulfilled' ? pendingRes.value     : [];
    const approved    = approvedRes.status    === 'fulfilled' ? approvedRes.value    : [];
    const stats       = statsRes.status       === 'fulfilled' ? statsRes.value       : emptyStats;
    const schedules   = schedulesRes.status   === 'fulfilled' ? schedulesRes.value   : [];
    const advertisers = advertisersRes.status === 'fulfilled' ? advertisersRes.value : [];

    const failures = [pendingRes, approvedRes, statsRes, schedulesRes, advertisersRes]
        .filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length > 0) {
        for (const f of failures) {
            console.warn('[admin/ads-review] load failed:', f.reason instanceof Error ? f.reason.message : f.reason);
        }
    }
    const backendUnavailable = failures.length > 0;

    return { pending, approved, stats, schedules, advertisers, reminderRun, backendUnavailable, role };
};

function parseIds(formData: FormData): string[] {
    const raw = formData.getAll('id');
    const single = raw.map(v => String(v)).filter(Boolean);
    if (single.length > 0) return Array.from(new Set(single));
    const csv = formData.get('ids')?.toString() ?? '';
    return Array.from(new Set(csv.split(',').map(s => s.trim()).filter(Boolean)));
}

export const actions: Actions = {
    approve: async (event) => {
        const { session } = await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        // ברירת המחדל לגרסה מעודכנת היא החלפה. keepPrevious הוא המקרה ההפוך:
        // מפרסם שבאמת רוצה שתי פרסומות במקביל ולא שדרג את הקיימת.
        const keepPrevious = formData.get('keepPrevious') === '1';
        const result = await approveAd(id, session?.user?.id ?? 'super_admin', undefined, { keepPrevious });
        if (!result) return fail(404, { error: 'הפרסומת לא נמצאה' });
        // ההתראה על הבקשה יורדת מהתיבה של *כל* האדמינים. בלי זה היא נשארה
        // שם עם כפתורי אשר/דחה על בקשה שכבר טופלה - וזה מה שנראה ככפילות
        // מול ההתראה על השליחה הבאה של אותו מפרסם.
        await markAdMessagesHandled([id], 'approve');
        // גרסה מעודכנת של מפרסם קיים - המנהל צריך לראות שהישנה ירדה, ולא
        // להישאר בספק אם נוספה פרסומת שנייה לאותו מפרסם
        return {
            success: true,
            message: result.replacedNowTitle
                ? `אושרה ופורסמה: ${result.title} - נכנסה במקום "${result.replacedNowTitle}", שירדה מהאתר`
                : `אושרה ופורסמה: ${result.title}`,
        };
    },

    reject: async (event) => {
        const { session } = await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        const reason = (formData.get('reason') as string) || undefined;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const result = await rejectAd(id, session?.user?.id ?? 'super_admin', reason);
        if (!result) return fail(404, { error: 'הפרסומת לא נמצאה' });
        await markAdMessagesHandled([id], 'reject');
        return { success: true, message: `נדחתה: ${result.title}` };
    },

    bulkApprove: async (event) => {
        const { session } = await ensureAdsAdmin(event);
        const ids = parseIds(await event.request.formData());
        if (ids.length === 0) return fail(400, { error: 'לא נבחרו פרסומות' });
        let ok = 0;
        let replaced = 0;
        for (const id of ids) {
            const r = await approveAd(id, session?.user?.id ?? 'super_admin');
            if (r) ok++;
            if (r?.replacedNowTitle) replaced++;
        }
        await markAdMessagesHandled(ids, 'approve');
        return {
            success: true,
            message: `אושרו ופורסמו ${ok} פרסומות` +
                (replaced > 0 ? ` (${replaced} החליפו גרסה קודמת שירדה מהאתר)` : ''),
        };
    },

    bulkReject: async (event) => {
        const { session } = await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const ids = parseIds(formData);
        const reason = (formData.get('reason') as string) || undefined;
        if (ids.length === 0) return fail(400, { error: 'לא נבחרו פרסומות' });
        let ok = 0;
        for (const id of ids) {
            const r = await rejectAd(id, session?.user?.id ?? 'super_admin', reason);
            if (r) ok++;
        }
        await markAdMessagesHandled(ids, 'reject');
        return { success: true, message: `נדחו ${ok} פרסומות` };
    },

    unreject: async (event) => {
        await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const r = await unrejectAd(id);
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `הוחזרה לממתינות: ${r.title}` };
    },

    unapprove: async (event) => {
        await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const r = await unapproveAd(id);
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `הורדה מהאתר: ${r.title}` };
    },

    // קציבת תקופת פרסום - התקופה נספרת מיום הפרסום
    setDuration: async (event) => {
        await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const days = normalizeDurationDays(formData.get('days'));
        let r;
        try {
            r = await setAdDuration(id, days);
        } catch (e) {
            console.warn('[admin/ads-review] setDuration failed:', e instanceof Error ? e.message : e);
            return fail(502, { error: 'קציבת התקופה נכשלה - נסה שוב בעוד רגע' });
        }
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        const suffix = r.daysLeft < 0 ? ' - התקופה כבר חלפה, הפרסומת ירדה מהאתר' : '';
        return { success: true, message: `${r.title}: ${days} ימים, עד ${fmtDay(r.expiresAt)}${suffix}` };
    },

    // השהיה - יורדת מהאתר ושומרת את הימים שנותרו
    pause: async (event) => {
        await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        let r;
        try {
            r = await pauseAd(id);
        } catch (e) {
            console.warn('[admin/ads-review] pause failed:', e instanceof Error ? e.message : e);
            return fail(502, { error: 'ההשהיה נכשלה - נסה שוב בעוד רגע' });
        }
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `${r.title} הושהתה - ${r.daysLeft} ימים שמורים לה` };
    },

    // המשך אחרי השהיה - הימים השמורים נספרים מהיום
    resume: async (event) => {
        await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        let r;
        try {
            r = await resumeAd(id);
        } catch (e) {
            console.warn('[admin/ads-review] resume failed:', e instanceof Error ? e.message : e);
            return fail(502, { error: 'ההפעלה מחדש נכשלה - נסה שוב בעוד רגע' });
        }
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `${r.title} חזרה לאוויר - ${r.daysLeft} ימים, עד ${fmtDay(r.expiresAt)}` };
    },

    // החלפת מקום בסדר התצוגה באתר - סופר-אדמין ואדמין שמונה
    move: async (event) => {
        await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        const dir = formData.get('dir') === 'down' ? 'down' : 'up';
        if (!id) return fail(400, { error: 'חסר מזהה' });
        let r;
        try {
            r = await moveApprovedAd(id, dir);
        } catch (e) {
            console.warn('[admin/ads-review] move failed:', e instanceof Error ? e.message : e);
            return fail(502, { error: 'החלפת המקום נכשלה - נסה שוב בעוד רגע' });
        }
        if (!r) return fail(400, { error: 'הפרסומת כבר בקצה הרשימה' });
        return { success: true, message: `${r.title} - מקום ${r.position} מתוך ${r.total}` };
    },

    remove: async (event) => {
        await ensureSuperAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const ok = await removeAd(id);
        if (!ok) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: 'נמחקה לצמיתות' };
    },

    update: async (event) => {
        await ensureAdsAdmin(event);
        const formData = await event.request.formData();
        const id = formData.get('id') as string;
        if (!id) return fail(400, { error: 'חסר מזהה' });
        const r = await updateAdFields(id, {
            title:     (formData.get('title')     as string | null) ?? undefined,
            subtitle:  (formData.get('subtitle')  as string | null) ?? undefined,
            cta:       (formData.get('cta')       as string | null) ?? undefined,
            hoverText: (formData.get('hoverText') as string | null) ?? undefined,
        });
        if (!r) return fail(404, { error: 'הפרסומת לא נמצאה' });
        return { success: true, message: `עודכנה: ${r.title}` };
    },
};
