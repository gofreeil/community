import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDbItemByIdFresh, updateItem, deleteItem, getUserByAnyId, createItem } from '$lib/server/db';
import { isSuperAdmin, isCoordinatorOfArea } from '$lib/server/auth';
import { PLACE_STATUS_VALUES, DELETE_RESTORE_DAYS } from '$lib/placeStatus';
import { categoryConfig } from '$lib/categoryFields';

/** קישורי רשתות חברתיות + אתר - מותר לערוך אותם מדף הפריט לכל קטגוריה (הופכים לכפתורים מותגים) */
const SOCIAL_LINK_KEYS = new Set(['website', 'whatsapp', 'telegram', 'facebook', 'instagram', 'youtube', 'tiktok']);

/** נרמול URL של קישור חברתי/אתר: משלים https, מאמת מבנה בסיסי, מחזיר '' לניקוי.
 *  וואטסאפ מקבל גם מספר טלפון (→ wa.me), טלגרם מקבל גם @שם (→ t.me). */
function normalizeSocialUrl(raw: unknown, key = ''): string {
    let u = typeof raw === 'string' ? raw.trim().slice(0, 300) : '';
    if (!u) return '';
    if (key === 'whatsapp' && /^[+\d][\d\s()\-]*$/.test(u)) {
        const digits = u.replace(/\D/g, '').replace(/^0/, '972');
        return digits ? `https://wa.me/${digits}` : '';
    }
    if (key === 'telegram') {
        if (u.startsWith('@')) u = `https://t.me/${u.slice(1)}`;
        else if (/^[A-Za-z0-9_]{4,}$/.test(u)) u = `https://t.me/${u}`;
    }
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    return /^https?:\/\/\S+\.\S+/i.test(u) ? u : '';
}

/** נרמול תשובת שאלת אבטחה להשוואה סלחנית (רווחים/אותיות/סימנים) */
function normAnswer(s: string): string {
    return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

interface Activity { type: string; time: string; days: string; note: string; }

/** תמונה חוקית לגלריה: base64 שהטופס דוחס, URL מלא או נתיב מקומי */
function isSafeImage(v: unknown): v is string {
    if (typeof v !== 'string' || !v) return false;
    if (v.length > 3_500_000) return false; // ~2.5MB אחרי base64 - מעל הדחיסה של הטופס
    return v.startsWith('data:image/') || /^https?:\/\//i.test(v) || v.startsWith('/');
}

/** ניקוי קישורים מותאמים-אישית ({label, url}) שמוצגים ככפתורים בדף הפריט */
function sanitizeLinks(raw: unknown): Array<{ label: string; url: string }> {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
        .map(l => {
            let url = String(l.url ?? '').trim().slice(0, 300);
            if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
            return {
                label: String(l.label ?? '').trim().slice(0, 60) || 'קישור',
                url,
            };
        })
        .filter(l => /^https?:\/\/\S+\.\S+/i.test(l.url))
        .slice(0, 8);
}

/** ניקוי מערך הפעילויות שמגיע מהלקוח */
function sanitizeActivities(raw: unknown): Activity[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
        .map(r => ({
            type: String(r.type ?? '').trim().slice(0, 60),
            time: String(r.time ?? '').trim().slice(0, 40),
            days: String(r.days ?? '').trim().slice(0, 60),
            note: String(r.note ?? '').trim().slice(0, 200),
        }))
        .filter(a => a.type || a.time || a.days || a.note)
        .slice(0, 30);
}

/**
 * PATCH /api/items/[id]
 *
 * Body: { action: 'freeze' | 'unfreeze' } | { status: string }
 *
 * - הקפאת/הפעלת מודעה. רק הבעלים יכול.
 * - מסלול ה'הסר' מהלוח הציבורי משתמש ב-freeze (לא מחיקה).
 */
export const PATCH: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    const userId = session?.user?.id;
    if (!userId) return json({ success: false, message: 'לא מחובר' }, { status: 401 });

    const id = event.params.id;
    if (!id) return json({ success: false, message: 'חסר מזהה' }, { status: 400 });

    let body: Record<string, unknown> = {};
    try { body = await event.request.json(); } catch {}

    // קריאה טרייה - מסלולי קריאה-שינוי-כתיבה אסור שיתבססו על cache
    const item = await getDbItemByIdFresh(id);
    if (!item) return json({ success: false, message: 'פריט לא נמצא' }, { status: 404 });

    const isOwner = item.user_id === userId;
    const action = String(body.action ?? '');

    /** בעלים / רכז השכונה / סופר-אדמין - ההרשאה של מצב בניית הדף ולוח הפעילויות */
    async function canEditPage(): Promise<boolean> {
        if (isOwner || isSuperAdmin(session)) return true;
        const user = await getUserByAnyId(String(userId));
        return isCoordinatorOfArea(user?.coordinator_of, item!.neighborhood, item!.city);
    }

    // ---- מצב בניית הדף: עדכון שדות תוכן ישירות מדף הפריט ----
    if (action === 'update_fields') {
        if (!(await canEditPage())) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });
        // פנויים/פנויות עוברים אישור אדמין - עריכה רק דרך הטופס הייעודי שמחזיר ל-pending
        if (item.category === 'singles') {
            return json({ success: false, message: 'עריכת כרטיס פנויים אפשרית רק דרך טופס העריכה' }, { status: 403 });
        }

        const fields = (body.fields && typeof body.fields === 'object' ? body.fields : {}) as Record<string, unknown>;
        const updates: { label?: string; description?: string; contact?: string; phone?: string } = {};

        if (typeof fields.label === 'string') {
            const v = fields.label.trim().slice(0, 120);
            // כותרת ריקה תשבור את הדף ואת המפה - מתעלמים ממחיקה
            if (v) updates.label = v;
        }
        if (typeof fields.description === 'string') updates.description = fields.description.trim().slice(0, 3000);
        if (typeof fields.contact === 'string') updates.contact = fields.contact.trim().slice(0, 120);
        if (typeof fields.phone === 'string') updates.phone = fields.phone.trim().slice(0, 40);

        let extra: Record<string, unknown> | undefined;
        const loadExtra = (): Record<string, unknown> => {
            try { return item!.extra_fields ? JSON.parse(item!.extra_fields) : {}; } catch { return {}; }
        };

        // מפת הגדרות השדות של הקטגוריה - קובעת אילו מפתחות מותר לכתוב ל-extra_fields ומאיזה טיפוס
        const fieldDefs = new Map((categoryConfig[item.category]?.fields ?? []).map(f => [f.key, f]));
        // מפתחות טופס שכבר טופלו כשדות עמודה (top-level) ואין לכפול אותם ב-extra
        const TOP_LEVEL = new Set(['label', 'description', 'contact', 'phone']);

        for (const [key, raw] of Object.entries(fields)) {
            if (TOP_LEVEL.has(key)) continue;

            // מפתחות מיוחדים שמותרים תמיד (גם בלי הגדרת שדה בקטגוריה)
            if (key === 'images') {
                extra = extra ?? loadExtra();
                extra.images = Array.isArray(raw) ? (raw as unknown[]).filter(isSafeImage).slice(0, 5) : [];
                continue;
            }
            if (key === 'links') {
                extra = extra ?? loadExtra();
                extra.links = sanitizeLinks(raw);
                continue;
            }
            // תמונה/לוגו על המפה (תוספת בתשלום) - תמונה עצמאית שהועלתה בטופס ההוספה; '' מנקה
            if (key === 'map_image') {
                extra = extra ?? loadExtra();
                const chosen = typeof raw === 'string' ? raw.trim() : '';
                extra.map_image = chosen && isSafeImage(chosen) ? chosen : '';
                continue;
            }
            // קישורי רשתות חברתיות + אתר - מותרים תמיד (כפתורים מותגים בדף), עם נרמול URL; '' מנקה
            if (SOCIAL_LINK_KEYS.has(key)) {
                extra = extra ?? loadExtra();
                extra[key] = normalizeSocialUrl(raw, key);
                continue;
            }

            // שאר השדות - רק אם הם מוגדרים בקטגוריה (בטיחות: אי אפשר להזריק מפתחות שרירותיים)
            const def = fieldDefs.get(key);
            if (!def || def.type === 'map_pin') continue;
            if (def.type === 'images') {
                extra = extra ?? loadExtra();
                extra[key] = Array.isArray(raw) ? (raw as unknown[]).filter(isSafeImage).slice(0, 5) : [];
                continue;
            }
            // כל השאר נשמר כמחרוזת (text/select/toggle/multi_select/opening_hours/number/time/date/email/textarea/address)
            extra = extra ?? loadExtra();
            extra[key] = typeof raw === 'string' ? raw.slice(0, 5000) : raw == null ? '' : String(raw).slice(0, 5000);
        }

        if (Object.keys(updates).length === 0 && extra === undefined) {
            return json({ success: false, message: 'אין שדות לעדכון' }, { status: 400 });
        }

        try {
            await updateItem(id, { ...updates, ...(extra !== undefined ? { extra_fields: extra } : {}) });
            return json({ success: true });
        } catch (e) {
            console.error('[items/:id PATCH update_fields] failed:', e);
            return json({ success: false, message: 'שגיאה בשמירה' }, { status: 500 });
        }
    }

    // ---- עדכון לוח פעילויות: בעלים / רכז השכונה / סופר-אדמין ----
    if (action === 'update_activities') {
        if (!(await canEditPage())) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });

        const activities = sanitizeActivities(body.activities);
        let extra: Record<string, unknown> = {};
        try { extra = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { extra = {}; }
        extra.activities = activities;

        // אחד את סוגי הפעילויות לתוך type (המולטי-סלקט) כדי שהסינון/המפה ימשיכו לתפוס.
        // שמות תפילות (שחרית/מנחה/ערבית) הם שורות מניין - לא שירות עצמאי, ואסור שיזהמו את "מה יש במקום".
        const PRAYER_TYPES = new Set(['שחרית', 'מנחה', 'ערבית']);
        const existingTypes = String(extra.type ?? '').split(',').map(s => s.trim()).filter(Boolean);
        const merged = Array.from(new Set([...existingTypes, ...activities.map(a => a.type).filter(t => t && !PRAYER_TYPES.has(t))]));
        extra.type = merged.join(',');

        try {
            await updateItem(id, { extra_fields: extra });
            return json({ success: true, activities });
        } catch (e) {
            console.error('[items/:id PATCH activities] failed:', e);
            return json({ success: false, message: 'שגיאה בשמירה' }, { status: 500 });
        }
    }

    // ---- סטטוס תפעולי של הנכס (פעיל / בשיפוצים / עברנו כתובת / סגור / נפתח בקרוב) ----
    // נשמר ב-extra_fields.place_status ואינו משנה נראות - רק תג תצוגה.
    if (action === 'set_place_status') {
        if (!(await canEditPage())) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });
        const ps = String(body.place_status ?? '');
        if (!PLACE_STATUS_VALUES.includes(ps as (typeof PLACE_STATUS_VALUES)[number])) {
            return json({ success: false, message: 'סטטוס לא תקין' }, { status: 400 });
        }
        let extra: Record<string, unknown> = {};
        try { extra = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { extra = {}; }
        extra.place_status = ps;
        try {
            await updateItem(id, { extra_fields: extra });
            return json({ success: true, place_status: ps });
        } catch (e) {
            console.error('[items/:id PATCH set_place_status] failed:', e);
            return json({ success: false, message: 'שגיאה בשמירה' }, { status: 500 });
        }
    }

    // ---- מחיקה רכה: הנכס יורד מהמפה אך ניתן לשחזור מהפרופיל עד 30 יום ----
    if (action === 'soft_delete') {
        if (!(await canEditPage())) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });
        let extra: Record<string, unknown> = {};
        try { extra = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { extra = {}; }
        extra.deleted_at = new Date().toISOString();
        delete extra.deletion_warned; // איפוס דגל התזכורת - מחיקה חדשה מתחילה מניין נקי
        try {
            await updateItem(id, { status: 'deleted', extra_fields: extra });
            // הודעה מיידית לבעלים: הנכס ירד מהמפה ויש 30 יום לשחזור
            if (item.user_id) {
                try {
                    await createItem({
                        category: 'message',
                        label: '🗑 הנכס ירד מהמפה',
                        description: `הנכס "${item.label}" הוסר מהמפה.\n\nהוא שמור בפרופיל שלך בסטטוס "מחוק" וניתן לשחזר אותו תוך 30 יום דרך "הנכסים שלי". לאחר 30 יום הוא יימחק לצמיתות ולא ניתן יהיה לשחזר - רק ליצור נכס חדש.`,
                        contact: 'מערכת קהילה בשכונה',
                        user_id: item.user_id,
                        icon: '🗑',
                        color: 'red',
                        extra_fields: {
                            type: 'item_soft_deleted',
                            sender_name: 'מערכת קהילה בשכונה',
                            item_label: item.label,
                            read: false,
                        },
                    });
                } catch (e) {
                    console.warn('[items/:id soft_delete] notify failed:', e instanceof Error ? e.message : e);
                }
            }
            return json({ success: true });
        } catch (e) {
            console.error('[items/:id PATCH soft_delete] failed:', e);
            return json({ success: false, message: 'שגיאה במחיקה' }, { status: 500 });
        }
    }

    // ---- שחזור נכס שנמחק (רק בתוך חלון 30 הימים) ----
    if (action === 'restore') {
        if (!(await canEditPage())) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });
        if (item.status !== 'deleted') {
            return json({ success: false, message: 'הנכס אינו מחוק' }, { status: 400 });
        }
        let extra: Record<string, unknown> = {};
        try { extra = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { extra = {}; }
        const deletedAt = typeof extra.deleted_at === 'string' ? Date.parse(extra.deleted_at) : NaN;
        const withinWindow = !Number.isNaN(deletedAt) &&
            (Date.now() - deletedAt) / 86_400_000 < DELETE_RESTORE_DAYS;
        if (!withinWindow) {
            return json({ success: false, message: `חלון השחזור (${DELETE_RESTORE_DAYS} יום) חלף - לא ניתן לשחזר. אפשר ליצור נכס חדש.` }, { status: 400 });
        }
        delete extra.deleted_at;
        delete extra.deletion_warned;
        try {
            await updateItem(id, { status: 'active', extra_fields: extra });
            return json({ success: true });
        } catch (e) {
            console.error('[items/:id PATCH restore] failed:', e);
            return json({ success: false, message: 'שגיאה בשחזור' }, { status: 500 });
        }
    }

    // ---- "אני עוזר/בדרך": כל תושב מחובר יכול להיענות לקריאת עזרה ----
    // מסמן את הקריאה כ"נענתה" (יורדת מהמפה ומטבלת הקריאות הפתוחות) ומודיע למבקש.
    if (action === 'help_respond') {
        if (item.category !== 'raise_hand') {
            return json({ success: false, message: 'לא קריאת עזרה' }, { status: 400 });
        }
        let extra: Record<string, unknown> = {};
        try { extra = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { extra = {}; }

        const helper = await getUserByAnyId(String(userId));
        const helperName = helper?.name || helper?.nickname || 'שכן/ה';

        const helpers = Array.isArray(extra.helpers) ? (extra.helpers as Array<Record<string, unknown>>) : [];
        const already = helpers.some(h => String(h.id) === String(userId));
        if (!already) {
            helpers.push({ id: String(userId), name: helperName, at: new Date().toISOString() });
        }
        extra.helpers = helpers;
        extra.answered = true;
        extra.answered_at = extra.answered_at ?? new Date().toISOString();

        try {
            await updateItem(id, { extra_fields: extra });
        } catch (e) {
            console.error('[items/:id help_respond] update failed:', e);
            return json({ success: false, message: 'שגיאה בעדכון' }, { status: 500 });
        }

        // הודעה למבקש שמישהו בדרך (פעם ראשונה בלבד - כדי לא להציף)
        if (!already && item.user_id && item.user_id !== String(userId)) {
            try {
                await createItem({
                    category: 'message',
                    label: '🤝 מישהו בדרך לעזור לך',
                    description: `${helperName} ראה/תה את קריאת העזרה שלך ("${item.label}") ומגיע/ה לעזור. אפשר ליצור קשר ישירות.`,
                    contact: helperName,
                    user_id: item.user_id,
                    icon: '🤝',
                    color: 'green',
                    extra_fields: {
                        type: 'help_on_the_way',
                        sender_name: helperName,
                        item_label: item.label,
                        read: false,
                    },
                });
            } catch (e) {
                console.warn('[items/:id help_respond] notify failed:', e instanceof Error ? e.message : e);
            }
        }

        return json({ success: true, helperName });
    }

    // ---- תגובות על הפריט: כל תושב מחובר יכול להוסיף תגובה ----
    if (action === 'add_comment') {
        const text = String(body.text ?? '').trim().slice(0, 1000);
        if (!text) return json({ success: false, message: 'תגובה ריקה' }, { status: 400 });

        const author = await getUserByAnyId(String(userId));
        const authorName = author?.name || author?.nickname || 'תושב/ת';

        let extra: Record<string, unknown> = {};
        try { extra = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { extra = {}; }
        const comments = Array.isArray(extra.comments) ? (extra.comments as Array<Record<string, unknown>>) : [];

        const comment = {
            id:      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            user_id: String(userId),
            name:    authorName,
            text,
            at:      new Date().toISOString(),
        };
        // שומרים עד 500 תגובות אחרונות כדי לא לנפח את הרשומה
        comments.push(comment);
        extra.comments = comments.slice(-500);

        try {
            await updateItem(id, { extra_fields: extra });
        } catch (e) {
            console.error('[items/:id add_comment] failed:', e);
            return json({ success: false, message: 'שגיאה בשמירת התגובה' }, { status: 500 });
        }

        // התראה לבעל הפריט (למעט אם הגיב על עצמו)
        if (item.user_id && item.user_id !== String(userId)) {
            try {
                await createItem({
                    category: 'message',
                    label: '💬 תגובה חדשה על הפריט שלך',
                    description: `${authorName} הגיב/ה על "${item.label}":\n\n"${text}"`,
                    contact: authorName,
                    user_id: item.user_id,
                    icon: '💬',
                    color: 'blue',
                    extra_fields: {
                        type: 'item_comment',
                        sender_name: authorName,
                        item_label: item.label,
                        item_id: item.id,
                        read: false,
                    },
                });
            } catch (e) {
                console.warn('[items/:id add_comment] notify failed:', e instanceof Error ? e.message : e);
            }
        }

        return json({ success: true, comment });
    }

    // ---- מחיקת תגובה: כותב התגובה / בעל הפריט / רכז השכונה / סופר-אדמין ----
    if (action === 'delete_comment') {
        const commentId = String(body.comment_id ?? '');
        if (!commentId) return json({ success: false, message: 'חסר מזהה תגובה' }, { status: 400 });

        let extra: Record<string, unknown> = {};
        try { extra = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { extra = {}; }
        const comments = Array.isArray(extra.comments) ? (extra.comments as Array<Record<string, unknown>>) : [];
        const target = comments.find(c => String(c.id) === commentId);
        if (!target) return json({ success: false, message: 'תגובה לא נמצאה' }, { status: 404 });

        const isAuthor = String(target.user_id) === String(userId);
        if (!isAuthor && !(await canEditPage())) {
            return json({ success: false, message: 'אין הרשאה' }, { status: 403 });
        }

        extra.comments = comments.filter(c => String(c.id) !== commentId);
        try {
            await updateItem(id, { extra_fields: extra });
            return json({ success: true });
        } catch (e) {
            console.error('[items/:id delete_comment] failed:', e);
            return json({ success: false, message: 'שגיאה במחיקה' }, { status: 500 });
        }
    }

    // ---- הקפאה/הפעלה: בעלים בלבד. רק frozen/active - לא סטטוס חופשי ----
    if (!isOwner) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });

    let newStatus: string | null = null;
    if (action === 'freeze' || body.status === 'frozen') {
        newStatus = 'frozen';
    } else if (action === 'unfreeze' || body.status === 'active') {
        // פריט בקטגוריה מבוקרת (פנויים) לא חוזר לאוויר ישירות - אלא לאישור מחדש
        newStatus = item.category === 'singles' && !isSuperAdmin(session) ? 'pending' : 'active';
    }

    if (!newStatus) return json({ success: false, message: 'פעולה לא תקינה' }, { status: 400 });

    try {
        await updateItem(id, { status: newStatus });
        return json({ success: true, status: newStatus });
    } catch (e) {
        console.error('[items/:id PATCH] failed:', e);
        return json({ success: false, message: 'שגיאה בעדכון' }, { status: 500 });
    }
};

/**
 * DELETE /api/items/[id]
 *
 * מחיקה לצמיתות. רק דרך דף הפרופיל.
 * נדרש header X-From-Profile=1 כדי להבטיח שהמחיקה מגיעה מדף הפרופיל.
 */
export const DELETE: RequestHandler = async (event) => {
    const session = await event.locals.auth();
    const userId = session?.user?.id;
    if (!userId) return json({ success: false, message: 'לא מחובר' }, { status: 401 });

    const id = event.params.id;
    if (!id) return json({ success: false, message: 'חסר מזהה' }, { status: 400 });

    // מחיקה לצמיתות מותרת רק מדף הפרופיל
    if (event.request.headers.get('X-From-Profile') !== '1') {
        return json({ success: false, message: 'מחיקה לצמיתות אפשרית רק מדף הפרופיל' }, { status: 403 });
    }

    const item = await getDbItemByIdFresh(id);
    if (!item) return json({ success: false, message: 'פריט לא נמצא' }, { status: 404 });
    if (item.user_id !== userId) return json({ success: false, message: 'אין הרשאה' }, { status: 403 });

    // ---- שער דו-שלבי: אימות תשובת שאלת האבטחה של המשתמש (כמו בהרשמה) ----
    // מי שהגדיר שאלת אבטחה חייב לענות נכון כדי למחוק לצמיתות. מי שלא הגדיר -
    // ההגנה היא אישור הכפול בפרופיל בלבד (X-From-Profile + confirm).
    let body: Record<string, unknown> = {};
    try { body = await event.request.json(); } catch {}
    const user = await getUserByAnyId(String(userId));
    const storedAnswer = String(user?.security_answer ?? '').trim();
    if (storedAnswer) {
        const given = normAnswer(String(body.securityAnswer ?? ''));
        if (!given) {
            return json({ success: false, message: 'נדרשת תשובת שאלת האבטחה כדי למחוק לצמיתות', code: 'need_security_answer' }, { status: 400 });
        }
        if (given !== normAnswer(storedAnswer)) {
            return json({ success: false, message: 'תשובת האבטחה שגויה', code: 'wrong_security_answer' }, { status: 403 });
        }
    }

    try {
        await deleteItem(id);
        return json({ success: true });
    } catch (e) {
        console.error('[items/:id DELETE] failed:', e);
        return json({ success: false, message: 'שגיאה במחיקה' }, { status: 500 });
    }
};
