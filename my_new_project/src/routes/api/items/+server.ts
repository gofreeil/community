import { json } from '@sveltejs/kit';
import { createItem, getAllItems, getDbItemByIdFresh, incrementItemViewCount, getItemsByCategory, getItemsByUserId, updateItem, getAllSuperAdmins, getUserById, getMessagesByUserId, deleteItem } from '$lib/server/db';
import { categoryConfig, getCategoryIcon, getCategoryColor } from '$lib/categoryFields';
import { isPrivateCategory } from '$lib/itemCategories';
import { categoryTier, tierMet } from '$lib/tiers';
import { resolveItemCoords } from '$lib/server/geocode';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
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

// ---- המלצה להצטרף לאינדקס בעלי העסקים (index.gofreeil.com) ----
// באינדקס מופיעים רק עסקים שחתמו על תנאי השימוש שם (ובתוכם אמנת המוסר העולמית)
// והתחייבו להנחה בלעדית לחברי תנועת "יוצאים לחירות". לכן אי-אפשר לרשום אותם
// אוטומטית מכאן — הם חייבים לחתום שם בעצמם. במקום זה שולחים למפרסם הודעה
// אישית עם ההמלצה והתנאים. (הכיוון ההפוך אוטומטי: כל מי שמופיע באינדקס
// מיובא אלינו — ראה src/lib/server/indexBusinesses.ts)
const INDEX_URL = 'https://index.gofreeil.com';

async function notifyIndexInvite(userId: string, bizLabel: string) {
    await createItem({
        category: 'message',
        label:    '🎁 רוצה שהעסק שלך יופיע גם באינדקס הארצי?',
        description:
            `פרסמת את "${bizLabel}" בקהילה בשכונה — כל הכבוד!\n\n` +
            `אתה מוזמן להופיע גם באינדקס בעלי העסקים הארצי של יוצאים לחירות, ` +
            `שנחשף לכל חברי התנועה בארץ. עסק שמופיע שם מיובא אוטומטית גם למפה שלנו.\n\n` +
            `כדי להופיע באינדקס יש לעמוד בשני תנאים:\n` +
            `1. חתימה על תנאי השימוש באתר האינדקס — ובתוכם אמנת המוסר העולמית.\n` +
            `2. מתן הנחה בלעדית לחברי תנועת "יוצאים לחירות" (הנחה ייעודית, לא הנחת VIP רגילה).\n\n` +
            `להרשמה: ${INDEX_URL}`,
        contact:  '',
        user_id:  userId,
        icon:     '🏪',
        color:    'amber',
        extra_fields: { type: 'index_invite', read: false, link: INDEX_URL },
    });
}

// קטגוריות שדורשות אישור אדמין לפני שעולות לאתר (בדיקת תמונות צניעות וכו').
const MODERATED_CATEGORIES = new Set(['singles']);

// שולח לכל סופר-אדמין הודעה פנימית שכרטיס פנויים חדש ממתין לאישור (בדיקת תמונות).
// עדכון חוזר של כרטיס שטרם אושר מחליף את ההודעה הקודמת עליו במקום להוסיף עוד אחת,
// כדי שלא יצטברו אצל האדמין כמה הודעות סרק על אותו כרטיס.
async function notifySinglesReview(cardId: string, itemLabel: string, ef: Record<string, unknown>) {
    const admins = await getAllSuperAdmins();
    const imgCount = Array.isArray(ef.images) ? ef.images.length : 0;
    await Promise.all(
        admins
            .filter((a) => a.id)
            .map(async (a) => {
                // מחיקת הודעות קודמות על אותו כרטיס. הודעות ישנות (מלפני שנשמר item_id)
                // מזוהות לפי שם הכרטיס בתוך הטקסט - כך גם הכפילויות הקיימות מתנקות.
                try {
                    const stale = (await getMessagesByUserId(a.id)).filter((m) => {
                        let mef: Record<string, unknown> = {};
                        try { mef = m.extra_fields ? JSON.parse(String(m.extra_fields)) : {}; } catch { mef = {}; }
                        if (mef.type !== 'singles_review') return false;
                        return mef.item_id ? mef.item_id === cardId : String(m.description).includes(`"${itemLabel}"`);
                    });
                    await Promise.all(stale.map((m) => deleteItem(m.id)));
                } catch (e) {
                    // כשל בניקוי לא מונע את ההודעה החדשה - במקרה הגרוע תהיה כפילות זמנית
                    console.warn('[api/items] stale singles review message cleanup failed:', e);
                }
                await createItem({
                    category: 'message',
                    label: '🔞 כרטיס פנויים חדש ממתין לאישור',
                    description: `כרטיס "${itemLabel}" (${imgCount} תמונות) ממתין לבדיקת צניעות ואישור. היכנס לדף האישור: /admin/singles-review`,
                    contact: '',
                    user_id: a.id,
                    icon: '💑',
                    color: 'pink',
                    extra_fields: { type: 'singles_review', item_id: cardId, read: false, link: '/admin/singles-review' },
                });
            }),
    );
}

// ---- GET: list all active items ----
export const GET: RequestHandler = async () => {
    // endpoint ציבורי - מסננים רשומות פרטיות (הודעות, משוב, בקשות, משאלות),
    // אחרת כל גולש היה מקבל אותן עם extra_fields מלא
    const items = await getAllItems();
    return json(items.filter((i) => !isPrivateCategory(i.category)));
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
    // פנויים/פנויות (וכל משפחת singles_*) הם אנשים, לא מקום — לעולם בלי קואורדינטות,
    // כדי שלא ייווצר פין על המפה (הלוח נגיש רק דרך /singles).
    const coords = category.startsWith('singles')
        ? { lat: null, lng: null }
        : await resolveItemCoords({
            lat, lng,
            address: rest.address,
            neighborhood,
            city,
            neighborhoodOnly: NEIGHBORHOOD_ONLY_CATEGORIES.has(category),
        });

    // ---- עריכת פריט קיים (?edit= בטופס): עדכון במקום - בלי ליצור כפילות ----
    const editId = typeof (body as { edit_id?: unknown }).edit_id === 'string'
        ? String((body as { edit_id: string }).edit_id)
        : '';
    if (editId) {
        if (!userId) return json({ success: false, message: 'לא מחובר' }, { status: 401 });
        // קריאה טרייה (לא דרך cache) - מיזוג מול עותק ישן היה מוחק שדות שנשמרו הרגע
        const existing = await getDbItemByIdFresh(editId);
        if (!existing || existing.user_id !== String(userId)) {
            return json({ success: false, message: 'אין הרשאה לערוך את הפריט' }, { status: 403 });
        }
        if (existing.category !== category) {
            return json({ success: false, message: 'קטגוריה לא תואמת לפריט' }, { status: 400 });
        }
        // moderation לפי הקטגוריה האמיתית של הפריט, לא לפי מה שהלקוח שלח
        const isModerated = MODERATED_CATEGORIES.has(existing.category);
        // מיזוג extra_fields: הטופס שולח רק את השדות שלו - אסור למחוק שדות
        // שנוספו במצב בניית הדף (תמונות, לוח פעילויות, קישורים, time/days ישנים)
        const prevExtra: Record<string, unknown> = (() => {
            try { return existing.extra_fields ? JSON.parse(existing.extra_fields) : {}; } catch { return {}; }
        })();
        try {
            await updateItem(editId, {
                label:        String(label),
                // שדה שהטופס לא מרנדר לא נשלח בכלל - ואז לא דורסים את הערך הקיים
                ...(rest.description !== undefined ? { description: String(rest.description) } : {}),
                ...(rest.contact     !== undefined ? { contact:     String(rest.contact) }     : {}),
                ...(rest.phone       !== undefined ? { phone:       String(rest.phone) }       : {}),
                ...(rest.address     !== undefined ? { address:     String(rest.address) }     : {}),
                neighborhood: String(neighborhood ?? ''),
                city:         String(city ?? ''),
                lat:          coords.lat,
                lng:          coords.lng,
                extra_fields: { ...prevExtra, ...((extra_fields ?? {}) as Record<string, unknown>) },
                ...(isModerated ? { status: 'pending' } : {}),
            });
            if (isModerated) {
                // await חובה: ב-Vercel עבודה לא-מוחכה אחרי ה-return מתה - ההודעה
                // הישנה הייתה נמחקת בלי שהחדשה נכתבת (או לא נכתבת בכלל)
                try {
                    await notifySinglesReview(editId, String(label), (extra_fields ?? {}) as Record<string, unknown>);
                } catch (e) {
                    console.warn('[api/items] singles review notify failed:', e);
                }
            }
            return json({ success: true, id: editId, updated: true, pending: isModerated });
        } catch (e) {
            console.error('[api/items] edit update failed:', e);
            return json({ success: false, message: 'עדכון הפריט נכשל. נסה שוב בעוד רגע.' }, { status: 500 });
        }
    }

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
                    // await חובה: ב-Vercel כל עבודה לא-מוחכה אחרי ה-return מתה, וכאן
                    // ה-return מיד אחריו - בלי await ההתראה לסופר-אדמין לא נכתבת כלל.
                    try {
                        await notifySinglesReview(existing.id, String(label), (extra_fields ?? {}) as Record<string, unknown>);
                    } catch (e) {
                        console.warn('[api/items] singles review notify failed:', e);
                    }
                }
                return json({ success: true, id: existing.id, updated: true, pending: MODERATED_CATEGORIES.has(category) });
            }
        } catch (e) {
            // אם בדיקת/עדכון הכרטיס הקיים נכשלה - לא נכשיל את המשתמש, ניפול ליצירה רגילה
            console.warn('[api/items] one-per-user upsert failed, falling back to create:', e);
        }
    }

    // ---- אכיפת שער דרגה בצד שרת (לא רק ב-UI) ----
    // יצירת פריט חדש בקטגוריה שדורשת דרגה 2/3 מחייבת פרופיל מתאים. עריכה
    // וכרטיס-אחד-למשתמש כבר חזרו למעלה, אז כאן זה תמיד יצירה אמיתית.
    // fail-open על תקלת lookup: לא חוסמים משתמש לגיטימי על בליפ רגעי של Strapi.
    if (userId) {
        const requiredTier = categoryTier(category);
        if (requiredTier > 1) {
            try {
                const u = await getUserById(String(userId), event.cookies.get('strapi_jwt'));
                if (u && !tierMet(u, requiredTier)) {
                    return json({
                        success: false,
                        message: 'יש להשלים את פרטי הפרופיל לפני פרסום',
                        needsUpgrade: true,
                        requiredTier,
                    }, { status: 403 });
                }
            } catch { /* fail-open — תקלת Strapi לא חוסמת פרסום */ }
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
            { success: false, message: 'שמירת הפריט נכשלה. נסה שוב בעוד רגע, ואם זה חוזר - פנה לתמיכה דרך "כתוב למערכת" בדף הפרופיל שלך.' },
            { status: 500 },
        );
    }

    // ---- כרטיס פנויים חדש: התראה לסופר-אדמינים לבדיקת תמונות/אישור ----
    // await חובה כדי שההודעה תיכתב ל-Strapi לפני שה-lambda ב-Vercel נסגר.
    if (MODERATED_CATEGORIES.has(category)) {
        try {
            await notifySinglesReview(item.id, String(label), (extra_fields ?? {}) as Record<string, unknown>);
        } catch (e) {
            console.warn('[api/items] singles review notify failed:', e);
        }
    }

    // ---- פרסם עסק? המלץ לו להופיע גם באינדקס הארצי ----
    // await חובה: ב-Vercel עבודה לא-מוחכה אחרי ה-return מתה, וההודעה לא תיכתב.
    if (category === 'shops' && userId) {
        try {
            await notifyIndexInvite(String(userId), String(label));
        } catch (e) {
            console.warn('[api/items] index invite notify failed:', e);
        }
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
        const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
        if (!apiKey) throw new Error('RESEND_API_KEY missing - מייל לאדמין על פריט חדש לא נשלח');
        const resend  = new Resend(apiKey);
        const fromAddr = env.FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
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
