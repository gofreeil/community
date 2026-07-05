import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDbItemByIdFresh, updateItem, deleteItem, getUserByAnyId } from '$lib/server/db';
import { isSuperAdmin, isCoordinatorOfArea } from '$lib/server/auth';

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
        if (Array.isArray(fields.images)) {
            extra = extra ?? loadExtra();
            extra.images = (fields.images as unknown[]).filter(isSafeImage).slice(0, 5);
        }
        if (Array.isArray(fields.links)) {
            extra = extra ?? loadExtra();
            extra.links = sanitizeLinks(fields.links);
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

        // אחד את סוגי הפעילויות לתוך type (המולטי-סלקט) כדי שהסינון/המפה ימשיכו לתפוס
        const existingTypes = String(extra.type ?? '').split(',').map(s => s.trim()).filter(Boolean);
        const merged = Array.from(new Set([...existingTypes, ...activities.map(a => a.type).filter(Boolean)]));
        extra.type = merged.join(',');

        try {
            await updateItem(id, { extra_fields: extra });
            return json({ success: true, activities });
        } catch (e) {
            console.error('[items/:id PATCH activities] failed:', e);
            return json({ success: false, message: 'שגיאה בשמירה' }, { status: 500 });
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

    try {
        await deleteItem(id);
        return json({ success: true });
    } catch (e) {
        console.error('[items/:id DELETE] failed:', e);
        return json({ success: false, message: 'שגיאה במחיקה' }, { status: 500 });
    }
};
