import { json } from '@sveltejs/kit';
import { createItem, getAllItems, incrementItemViewCount, getItemsByCategory, getItemsByUserId, updateItem, getAllSuperAdmins } from '$lib/server/db';
import { categoryConfig, getCategoryIcon, getCategoryColor } from '$lib/categoryFields';
import { resolveItemCoords } from '$lib/server/geocode';
import { Resend } from 'resend';
import type { RequestHandler } from './$types';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// קטגוריות שבהן מותר כרטיס אחד בלבד לכל משתמש.
// פנויים/פנויות: לכל אדם פרופיל יחיד - "פרסום נוסף" מעדכן את הכרטיס הקיים במקום ליצור כפילות.
const ONE_PER_USER_CATEGORIES = new Set(['singles']);

// קטגוריות רגישות לפרטיות: קואורדינטות ברמת שכונה בלבד (בלי geocoding לכתובת מדויקת).
// עדיין מקבלות נקודה כדי להיספר כפריט בשכונה ולהופיע על המפה - רק לא במיקום מדויק.
const NEIGHBORHOOD_ONLY_CATEGORIES = new Set(['singles']);

async function notifyShabbatMatches(
    newItemId: string,
    newLabel: string,
    newContact: string,
    extraFields: Record<string, unknown>,
) {
    const isNewHost = String(extraFields.offer_type ?? '').includes('מציע');
    const cutoff = Date.now() - THREE_DAYS_MS;

    const existing = await getItemsByCategory('shabbat_hosting');
    const candidates = existing.filter(item => {
        if (!item.user_id) return false;
        if (item.id === newItemId) return false;
        if (new Date(item.created_at).getTime() < cutoff) return false;
        let ef: Record<string, unknown> = {};
        try { ef = item.extra_fields ? JSON.parse(String(item.extra_fields)) : {}; } catch { ef = {}; }
        const offerType = String(ef.offer_type ?? '');
        return isNewHost ? offerType.includes('מחפש') : offerType.includes('מציע');
    });

    await Promise.all(candidates.map(target => {
        if (isNewHost) {
            return createItem({
                category: 'message',
                label: '🕯️ מישהו יכול לארח אותך השבת!',
                description: `פרסמת שאתה מחפש אירוח לשבת - "${newLabel}" הציע לארח. היכנס ללוח האירוח ובדוק אם זה מתאים לך!`,
                contact: newContact || newLabel,
                user_id: target.user_id!,
                icon: '/icons/shavat-shalom.png',
                color: 'amber',
                extra_fields: { type: 'shabbat_hosting_match', matched_item_id: newItemId, read: false },
            });
        } else {
            return createItem({
                category: 'message',
                label: '🎒 מישהו מחפש אירוח לשבת!',
                description: `פרסמת שאתה מציע לארח - "${newLabel}" מחפש אירוח. היכנס ללוח האירוח וצור קשר להזמינו!`,
                contact: newContact || newLabel,
                user_id: target.user_id!,
                icon: '🎒',
                color: 'blue',
                extra_fields: { type: 'shabbat_hosting_match', matched_item_id: newItemId, read: false },
            });
        }
    }));
}

// קטגוריות שדורשות אישור אדמין לפני שעולות לאתר (בדיקת תמונות צניעות וכו').
const MODERATED_CATEGORIES = new Set(['singles']);

// שולח לכל סופר-אדמין הודעה פנימית שכרטיס פנויים חדש ממתין לאישור (בדיקת תמונות).
async function notifySinglesReview(itemLabel: string, ef: Record<string, unknown>) {
    const admins = await getAllSuperAdmins();
    const imgCount = Array.isArray(ef.images) ? ef.images.length : 0;
    await Promise.all(
        admins
            .filter((a) => a.id)
            .map((a) =>
                createItem({
                    category: 'message',
                    label: '🔞 כרטיס פנויים חדש ממתין לאישור',
                    description: `כרטיס "${itemLabel}" (${imgCount} תמונות) ממתין לבדיקת צניעות ואישור. היכנס לדף האישור: /admin/singles-review`,
                    contact: '',
                    user_id: a.id,
                    icon: '💑',
                    color: 'pink',
                    extra_fields: { type: 'singles_review', read: false, link: '/admin/singles-review' },
                }),
            ),
    );
}

// ---- GET: list all active items ----
export const GET: RequestHandler = async () => {
    const items = await getAllItems();
    return json(items);
};

// ---- POST: create a new item ----
export const POST: RequestHandler = async (event) => {
    // קבל את פרטי המשתמש המחובר (אופציונלי - guard נעשה בדף הטופס)
    const session = await event.locals.auth();

    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ success: false, message: 'נתונים לא תקינים' }, { status: 400 });
    }

    const { category, label, extra_fields, neighborhood, city, lat, lng, ...rest } = body as {
        category: string;
        label: string;
        extra_fields?: Record<string, unknown>;
        neighborhood?: string;
        city?: string;
        lat?: number;
        lng?: number;
        description?: string;
        contact?: string;
        phone?: string;
        address?: string;
    };

    if (!category || !label) {
        return json({ success: false, message: 'חסרים שדות חובה' }, { status: 400 });
    }

    if (!categoryConfig[category]) {
        return json({ success: false, message: 'קטגוריה לא תקינה' }, { status: 400 });
    }

    const icon  = getCategoryIcon(category);
    const color = getCategoryColor(category);
    const userId = session?.user?.id ?? undefined;

    // קואורדינטות: פין מפורש → geocoding של הכתובת → מרכז השכונה/עיר.
    // כך פריט עם כתובת בלבד (בלי פין) עדיין מקבל נקודה ומופיע על המפה.
    const coords = await resolveItemCoords({
        lat, lng,
        address: rest.address,
        neighborhood,
        city,
        neighborhoodOnly: NEIGHBORHOOD_ONLY_CATEGORIES.has(category),
    });

    // ---- כרטיס אחד למשתמש (פנויים/פנויות): עדכן קיים במקום ליצור חדש ----
    if (userId && ONE_PER_USER_CATEGORIES.has(category)) {
        try {
            const existing = (await getItemsByUserId(String(userId)))
                .find(it => it.category === category);
            if (existing) {
                await updateItem(existing.id, {
                    label:        String(label),
                    description:  String(rest.description ?? ''),
                    contact:      String(rest.contact ?? ''),
                    phone:        String(rest.phone ?? ''),
                    address:      String(rest.address ?? ''),
                    neighborhood: String(neighborhood ?? ''),
                    city:         String(city ?? ''),
                    lat:          coords.lat,
                    lng:          coords.lng,
                    extra_fields: (extra_fields ?? {}) as Record<string, unknown>,
                    // עריכת כרטיס פנויים מחזירה אותו לאישור מחדש (התמונות עשויות להשתנות)
                    ...(MODERATED_CATEGORIES.has(category) ? { status: 'pending' } : {}),
                });
                if (MODERATED_CATEGORIES.has(category)) {
                    notifySinglesReview(String(label), (extra_fields ?? {}) as Record<string, unknown>)
                        .catch((e) => console.warn('[api/items] singles review notify failed:', e));
                }
                return json({ success: true, id: existing.id, updated: true, pending: MODERATED_CATEGORIES.has(category) });
            }
        } catch (e) {
            // אם בדיקת/עדכון הכרטיס הקיים נכשלה - לא נכשיל את המשתמש, ניפול ליצירה רגילה
            console.warn('[api/items] one-per-user upsert failed, falling back to create:', e);
        }
    }

    let item;
    try {
        item = await createItem({
            category,
            label: String(label),
            description: String(rest.description ?? ''),
            contact:     String(rest.contact ?? ''),
            phone:       String(rest.phone ?? ''),
            address:     String(rest.address ?? ''),
            icon,
            color,
            neighborhood: String(neighborhood ?? ''),
            city:         String(city ?? ''),
            lat:          coords.lat,
            lng:          coords.lng,
            extra_fields: (extra_fields ?? {}) as Record<string, unknown>,
            user_id:     session?.user?.id ?? undefined,
            // קטגוריות מבוקרות (פנויים) עולות כ-pending עד אישור אדמין
            status:      MODERATED_CATEGORIES.has(category) ? 'pending' : undefined,
        });
    } catch (e) {
        // אל תיתן לשגיאת Strapi להתפוצץ ל-500 אטום ("Internal Error") אצל המשתמש.
        // לוגג את הסיבה האמיתית (כולל גוף התשובה מ-Strapi) ומחזיר הודעה ידידותית.
        console.error('[api/items] createItem failed:', e);
        return json(
            { success: false, message: 'שמירת הפריט נכשלה. נסה שוב בעוד רגע, ואם זה חוזר פנה לתמיכה.' },
            { status: 500 },
        );
    }

    // ---- כרטיס פנויים חדש: התראה לסופר-אדמינים לבדיקת תמונות/אישור ----
    if (MODERATED_CATEGORIES.has(category)) {
        notifySinglesReview(String(label), (extra_fields ?? {}) as Record<string, unknown>)
            .catch((e) => console.warn('[api/items] singles review notify failed:', e));
    }

    // ---- התאמת אירוח לשבת ----
    if (category === 'shabbat_hosting') {
        notifyShabbatMatches(
            item.id,
            String(label),
            String(rest.contact ?? ''),
            (extra_fields ?? {}) as Record<string, unknown>,
        ).catch(e => console.warn('shabbat match notify failed:', e));
    }

    // ---- שלח מייל לאדמין ----
    try {
        const resend  = new Resend(process.env.RESEND_API_KEY);
        const fromAddr = process.env.FROM_EMAIL || 'onboarding@resend.dev';
        const catLabel = categoryConfig[category]?.label ?? category;
        const ef = (extra_fields ?? {}) as Record<string, unknown>;
        const isModerated = MODERATED_CATEGORIES.has(category);
        const extraStr = Object.entries(ef)
            .filter(([k]) => k !== 'images')
            .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#94a3b8;font-size:13px;">${k}</td><td style="padding:4px 8px;color:#e2e8f0;font-size:13px;">${typeof v === 'object' ? JSON.stringify(v) : v}</td></tr>`)
            .join('');

        // לכרטיסי פנויים: הצג את התמונות וקישור ישיר לדף האישור
        const images = Array.isArray(ef.images) ? (ef.images as unknown[]).filter((x): x is string => typeof x === 'string') : [];
        const imagesHtml = isModerated && images.length
            ? `<div style="margin-top:16px;"><p style="color:#f59e0b;font-weight:700;margin:0 0 8px;">🖼️ תמונות לבדיקת צניעות (${images.length}):</p>${images.map((u) => `<a href="${u}" target="_blank"><img src="${u}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;margin:4px;border:1px solid #1e2a3a;" /></a>`).join('')}</div>`
            : '';
        const reviewLink = isModerated
            ? `<p style="margin-top:16px;"><a href="https://community.gofreeil.com/admin/singles-review" style="display:inline-block;background:#ec4899;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:700;">💑 לדף אישור הפנויים</a></p>`
            : '';

        await resend.emails.send({
            from: `קהילה בשכונה <${fromAddr}>`,
            to:   ['ads@shchuna.co.il'],
            subject: isModerated ? `🔞 כרטיס פנויים ממתין לאישור: ${label}` : `🆕 פריט חדש נוסף: ${label} (${catLabel})`,
            html: `<!DOCTYPE html><html dir="rtl"><body style="font-family:Arial,sans-serif;background:#070b14;color:#e2e8f0;padding:24px;">
              <h2 style="color:#f59e0b;">📌 פריט חדש נוסף לאתר</h2>
              <table style="border-collapse:collapse;width:100%;max-width:600px;background:#0f172a;border-radius:12px;overflow:hidden;border:1px solid #1e2a3a;">
                <tr><td style="padding:8px 16px;background:#1e2a3a;color:#94a3b8;font-size:12px;font-weight:700;">שדה</td><td style="padding:8px 16px;background:#1e2a3a;color:#94a3b8;font-size:12px;font-weight:700;">ערך</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">מזהה</td><td style="padding:8px 16px;">${item.id}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">קטגוריה</td><td style="padding:8px 16px;">${icon} ${catLabel}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">כותרת</td><td style="padding:8px 16px;font-weight:700;">${label}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">שכונה</td><td style="padding:8px 16px;">${neighborhood ?? ''}, ${city ?? ''}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">כתובת</td><td style="padding:8px 16px;">${rest.address ?? ''}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">טלפון</td><td style="padding:8px 16px;">${rest.phone ?? ''}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">איש קשר</td><td style="padding:8px 16px;">${rest.contact ?? ''}</td></tr>
                <tr><td style="padding:8px 16px;color:#94a3b8;">תיאור</td><td style="padding:8px 16px;">${rest.description ?? ''}</td></tr>
                ${extraStr}
              </table>
              ${imagesHtml}
              ${reviewLink}
              <p style="color:#64748b;font-size:12px;margin-top:16px;">${isModerated ? '⏳ הכרטיס ממתין לאישור ולא יוצג בלוח עד שתאשר אותו.' : 'הפריט כבר פעיל באתר. ניתן להסיר מה-Admin אם נדרש.'}</p>
            </body></html>`,
        });
    } catch (e) {
        // מייל לאדמין הוא best-effort - לא נכשיל את הבקשה
        console.warn('Admin email failed:', e);
    }

    return json({ success: true, id: item.id });
};

// ---- PATCH: increment view count ----
export const PATCH: RequestHandler = async (event) => {
    let body: Record<string, unknown>;
    try {
        body = await event.request.json();
    } catch {
        return json({ success: false, message: 'נתונים לא תקינים' }, { status: 400 });
    }

    const { id } = body as { id: string };
    if (!id) {
        return json({ success: false, message: 'חסר מזהה הפריט' }, { status: 400 });
    }

    try {
        await incrementItemViewCount(id);
        return json({ success: true });
    } catch (e) {
        console.error('Failed to increment view count:', e);
        return json({ success: false, message: 'שגיאה בעדכון ספירה' }, { status: 500 });
    }
};
