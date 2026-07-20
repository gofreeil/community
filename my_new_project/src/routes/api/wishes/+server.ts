import { json } from '@sveltejs/kit';
import { createItem, getUserById, getAllSuperAdmins, getMessagesByUserId, getItemsByCategoryAndStatus } from '$lib/server/db';
import type { RequestHandler } from './$types';

// ============================================================
// כותל המשאלות - משאלות נשמרות כפריטי items עם category:'wish'
// (אותה תבנית כמו לוח הפנויים: pending → אישור סופר-אדמין → active)
// ============================================================

// ---- GET: משאלות מאושרות לתצוגה פומבית בכותל ----
// פרטיות: מחזיר טקסט + תאריך בלבד - בלי שמות ובלי מזהי משתמשים.
export const GET: RequestHandler = async () => {
    const items = await getItemsByCategoryAndStatus('wish', 'active').catch(() => []);
    return json(items.map((it) => ({
        text:      it.description || it.label,
        createdAt: it.created_at,
    })));
};

// ---- POST: תושב שולח משאלה חדשה (גם בלי חשבון - כמו בקשת שכונה) ----
export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth();

    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ success: false, error: 'נתונים לא תקינים' }, { status: 400 });
    }

    const text = String(body.text ?? '').trim();
    if (text.length < 3) {
        return json({ success: false, error: 'נא לכתוב משאלה באורך 3 תווים לפחות' }, { status: 400 });
    }
    if (text.length > 500) {
        return json({ success: false, error: 'המשאלה ארוכה מדי - עד 500 תווים' }, { status: 400 });
    }

    // שם המבקש - מהפרופיל אם מחובר. נשלח רק בהודעה הפרטית לאדמין;
    // בכוונה לא נשמר על פריט המשאלה עצמו, כדי ששום נתיב ציבורי (דף פריט,
    // sitemap, payload של דף הבית) לא יחשוף זהות. הפאנל פותר שם דרך user_id.
    let requesterName = '';
    if (session?.user?.id) {
        try {
            const u = await getUserById(session.user.id);
            requesterName = u?.name ?? u?.nickname ?? session.user.name ?? '';
        } catch {
            requesterName = session?.user?.name ?? '';
        }
    }

    // המשאלה נשמרת כ-pending - שום דבר לא מוצג לציבור לפני אישור סופר-אדמין
    const created = await createItem({
        category:    'wish',
        label:       text.length > 80 ? `${text.slice(0, 77)}…` : text,
        description: text,
        icon:        '🙏',
        color:       'purple',
        status:      'pending',
        user_id:     session?.user?.id ?? undefined,
        extra_fields: {
            submitted_at: new Date().toISOString(),
        },
    });

    // הודעה לכל סופר-אדמין - שהמשאלה תופיע גם בתיבת ההודעות שלו, לא רק בפאנל.
    // best-effort: כשל בהתראה לא מפיל את שליחת המשאלה עצמה.
    try {
        const admins = await getAllSuperAdmins();
        const requesterLine = requesterName
            ? `👤 מבקש: ${requesterName}\n`
            : `👤 המבקש לא היה מחובר\n`;
        await Promise.all(admins.map(async (admin) => {
            // דדופ פר-אדמין: אם כבר יש לו הודעת "משאלה חדשה" *פתוחה* (לא "טופל")
            // עם אותו טקסט - לא שולחים כפילות (שליחה חוזרת של אותו טופס).
            try {
                const inbox = await getMessagesByUserId(admin.id);
                const dup = (inbox ?? []).some((m) => {
                    let ef: Record<string, unknown> = {};
                    try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { return false; }
                    return String(ef?.type ?? '') === 'wish_request' &&
                        !ef?.handled &&
                        String(ef?.wish_text ?? '').trim() === text;
                });
                if (dup) return;
            } catch { /* אם הבדיקה נכשלה - עדיף לשלוח מאשר להחסיר בקשה */ }
            await createItem({
                category:    'message',
                label:       '🙏 משאלה חדשה ממתינה לאישור בכותל המשאלות',
                description:
                    `התקבלה משאלה חדשה לכותל המשאלות:\n\n"${text}"\n\n` +
                    requesterLine +
                    `אשר/דחה בעמוד הניהול תחת "משאלות ממתינות לאישור".`,
                icon:        '🙏',
                color:       'purple',
                user_id:     admin.id,
                extra_fields: {
                    type:            'wish_request',
                    wish_item_id:    created.id,
                    wish_text:       text,
                    requester_name:  requesterName,
                    requested_by_id: session?.user?.id ?? '',
                    requested_at:    new Date().toISOString(),
                },
            });
        }));
    } catch (e) {
        console.warn('[api/wishes] notify super_admins failed:', e);
    }

    return json({ success: true, id: created.id });
};
