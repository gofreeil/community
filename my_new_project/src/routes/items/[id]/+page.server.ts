// (redirect/error לא בשימוש יותר: שער הפנויים הוסר - ראו הערה בגוף ה-load)
import { getDbItemById, getItemsByCategory, getUserByAnyId } from '$lib/server/db';
import { isCharterSigned, ownerEmail } from '$lib/server/charterSignatures';
import { isSuperAdmin, isCoordinatorOfArea } from '$lib/server/auth';
import { BOT_UA_RX } from '$lib/server/botUa';
import { getItemById as getStaticItemById } from '$lib/itemsData';
import { isPrivateCategory } from '$lib/itemCategories';
import { categoryConfig } from '$lib/categoryFields';
import { getDemoItemById } from '$lib/demoUserItems';
import { buildShareImage } from '$lib/server/shareImage';
import type { PageServerLoad } from './$types';

export interface SinglesPhoneStatus {
    state: 'owner' | 'guest' | 'none' | 'pending' | 'approved' | 'rejected';
    requestItemId?: string;
}
export interface IncomingSinglesRequest {
    id: string;
    requester_snapshot: Record<string, unknown>;
    requested_at: string;
    status: string;
}

export const load: PageServerLoad = async (event) => {
    const { params } = event;
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    const demoOwnerId = session?.user?.id ?? 'demo-user';
    const viewerId = session?.user?.id as string | undefined;
    const origin = event.url.origin;
    // סקרפרים של רשתות (וואטסאפ/טלגרם/פייסבוק...) צריכים את תגי ה-OG לקדימון
    const isBot = BOT_UA_RX.test(event.request.headers.get('user-agent') ?? '');
    let botOgPreview = false;

    // נסה קודם ב-DB (פריטים שהמשתמשים הוסיפו), ואחר-כך פריטי דמו
    const dbItem = (await getDbItemById(params.id)) ?? getDemoItemById(params.id, demoOwnerId);
    if (dbItem) {
        // המר לפורמט תואם עם ממשק Item הקיים
        const extraFields = (() => {
            try { return JSON.parse(dbItem.extra_fields ?? '{}'); } catch { return {}; }
        })();
        // "מידע לשדכנים" (group=matchmakers) לעולם לא יוצא לדף הפריט - גם לא לבעלים
        // ולא לסופר-אדמין: הוא נאסף לצוות השדכנים בלבד ומוצג רק ב-/admin/singles-review.
        for (const f of categoryConfig[dbItem.category]?.fields ?? []) {
            if (f.group === 'matchmakers') delete extraFields[f.key];
        }
        const galleryImages: string[] = Array.isArray(extraFields?.images)
            ? (extraFields.images as unknown[]).filter((s): s is string => typeof s === 'string')
            : (typeof extraFields?.image === 'string' ? [extraFields.image] : []);

        // ---- Singles: הסתר טלפון אלא אם בעלים / מבקש מאושר ----
        let phone = dbItem.phone;
        let singlesStatus: SinglesPhoneStatus | undefined;
        let incomingRequests: IncomingSinglesRequest[] | undefined;

        if (dbItem.category === 'singles') {
            const isOwner = !!viewerId && dbItem.user_id === viewerId;

            // קישור ישיר לכרטיס פתוח לכולם - הצפייה חופשית, אינטראקציה (טלפון/בקשה)
            // מחייבת התחברות. אותה מדיניות כמו /singles/[id] (64a55d7, 31.8.2026):
            // הלוח /singles נשאר סגור, אבל כרטיס ששותף בקישור נפתח גם לאורח.
            // עד 20.9 נשאר כאן שער ישן שהפנה אורחים להתחברות - ואת זה בדיוק
            // ראה מי שקיבל את הקישור בווטסאפ.
            // בוטים של שיתוף מקבלים תצוגת-קדימון מצומצמת (בלי טלפון וטקסטים חופשיים).
            if (!isOwner && !isSuperAdmin(session) && isBot) {
                botOgPreview = true;
            }

            if (isOwner) {
                singlesStatus = { state: 'owner' };
                try {
                    const all = await getItemsByCategory('singles_request');
                    incomingRequests = all
                        .map(r => {
                            try {
                                const ef = JSON.parse(r.extra_fields || '{}');
                                if (ef.target_item_id !== dbItem.id) return null;
                                if (ef.status && ef.status !== 'pending') return null;
                                return {
                                    id: r.id,
                                    requester_snapshot: (ef.requester_snapshot ?? {}) as Record<string, unknown>,
                                    requested_at: String(ef.requested_at ?? ''),
                                    status: String(ef.status ?? 'pending'),
                                };
                            } catch { return null; }
                        })
                        .filter((r): r is IncomingSinglesRequest => r !== null);
                } catch (e) {
                    console.warn('[items/load] failed to load incoming requests', e);
                }
            } else if (viewerId) {
                try {
                    const all = await getItemsByCategory('singles_request');
                    const mine = all.find(r => {
                        if (r.user_id !== viewerId) return false;
                        try { return JSON.parse(r.extra_fields || '{}').target_item_id === dbItem.id; } catch { return false; }
                    });
                    if (mine) {
                        const ef = JSON.parse(mine.extra_fields || '{}');
                        const st = String(ef.status ?? 'pending') as 'pending' | 'approved' | 'rejected';
                        singlesStatus = { state: st, requestItemId: mine.id };
                        if (st !== 'approved') phone = '';
                    } else {
                        singlesStatus = { state: 'none' };
                        phone = '';
                    }
                } catch (e) {
                    console.warn('[items/load] failed to load singles_request', e);
                    singlesStatus = { state: 'none' };
                    phone = '';
                }
            } else {
                singlesStatus = { state: 'guest' };
                phone = '';
            }

            // חתימה על אמנת המוסר: אם לא סומן ידנית בטופס, בדוק זיהוי אוטומטי מול
            // רשימת החתומים באתר "חכמי העדה" (אותו טלפון) - ראה charterSignatures.ts
            const ethicsAlreadySet = extraFields.ethics_charter != null && extraFields.ethics_charter !== '' && extraFields.ethics_charter !== '0';
            if (!ethicsAlreadySet) {
                try {
                    if (await isCharterSigned(dbItem.phone, await ownerEmail(dbItem.user_id))) extraFields.ethics_charter = true;
                } catch (e) {
                    console.warn('[items/load] charter auto-detect failed', e instanceof Error ? e.message : e);
                }
            }
        }

        const isOwner = !!viewerId && dbItem.user_id === viewerId;

        // האם המשתמש רשאי לערוך את לוח הפעילויות: בעלים / רכז השכונה / סופר-אדמין
        let canEditActivities = isOwner || isSuperAdmin(session);
        if (!canEditActivities && viewerId) {
            // תקלת Strapi זמנית ב-getUserByAnyId (401/403/timeout) לא תפיל את כל
            // דף הפריט ב-500; פשוט לא נציג כפתורי עריכת-רכז עד שה-DB יחזור
            try {
                const u = await getUserByAnyId(viewerId);
                canEditActivities = isCoordinatorOfArea(u?.coordinator_of, dbItem.neighborhood, dbItem.city);
            } catch (e) {
                console.warn('[items/[id]] getUserByAnyId failed:', e instanceof Error ? e.message : e);
            }
        }
        // מצב בניית הדף (עריכה במקום): אותה הרשאה, אבל לא לפנויים - שם יש טופס ייעודי
        const canEditPage = canEditActivities && dbItem.category !== 'singles';

        const hideAddress = (extraFields?.hide_address === true || extraFields?.hide_address === 'true') && !canEditActivities;
        if (hideAddress) {
            // קומה/דירה/הוראות הגעה חושפות את הכתובת בעקיפין - נמחקות יחד איתה
            delete extraFields.floor;
            delete extraFields.apartment;
            delete extraFields.arrival_notes;
        }

        // נכס שנמחק (מחיקה רכה) גלוי רק לבעלים/רכז/סופר-אדמין - כדי לשחזר. לגולש רגיל = לא נמצא.
        // רשומות פרטיות (הודעות, משוב, בקשות, משאלות) לעולם אינן דף פריט ציבורי -
        // דף הפריט היה חושף label/description/extra_fields/user_id לכל גולש שמנחש id.
        if ((dbItem.status === 'deleted' || isPrivateCategory(dbItem.category)) && !canEditActivities) {
            return { origin, item: null };
        }

        const item = {
            id:          dbItem.id,
            label:       dbItem.label,
            category:    dbItem.category,
            description: dbItem.description,
            contact:     dbItem.contact,
            phone,
            // הבעלים ביקש (בגמ"ח הארצי, extra_fields.hide_address) לא לפרסם את הכתובת
            // המדויקת: בציבור נשארים רק שכונה/עיר. בעלים/רכז/סופר-אדמין רואים הכל.
            address:     hideAddress ? "" : dbItem.address,
            lat:         dbItem.lat ?? null,
            lng:         dbItem.lng ?? null,
            icon:        dbItem.icon,
            color:       dbItem.color,
            image:       galleryImages[0],
            images:      galleryImages,
            neighborhood: dbItem.neighborhood,
            city:        dbItem.city,
            status:      dbItem.status,
            extraFields,
            isUserSubmitted: true,
            isOwner,
            canEditActivities,
            canEditPage,
            viewCount:   dbItem.view_count,
            singlesStatus,
            incomingRequests,
        };

        // תמונת השיתוף (og:image + מידות) מחושבת בשרת - כך ה-head לא תלוי
        // בתמונה עצמה בנתוני הדף (בוט לא צריך את ה-base64, רק את הכתובת)
        const shareCandidate =
            (typeof extraFields?.avatar === 'string' && extraFields.avatar)
            || galleryImages[0]
            || '';
        const share = buildShareImage(origin, dbItem.id, shareCandidate);

        if (botOgPreview) {
            // תצוגת-קדימון לבוט: רק מה שתגי ה-OG צריכים (כינוי/גיל/מגדר/עיר).
            // הגיל נגזר בדף מ-birth_date כשאין שדה age - בלעדיו הכותרת יצאה בלי "גיל".
            // הטקסטים החופשיים, הכתובת, פרטי הקשר והתמונה עצמה (base64) לא
            // נחשפים - הבוט מקבל רק את כתובת התמונה דרך share.
            const efBot: Record<string, unknown> = {};
            for (const k of ['nickname', 'age', 'birth_date', 'gender'] as const) {
                if (extraFields?.[k] !== undefined) efBot[k] = extraFields[k];
            }
            Object.assign(item, {
                description: '',
                contact:     '',
                address:     '',
                lat:         null,
                lng:         null,
                extraFields: efBot,
                image:       undefined,
                images:      [],
            });
        }

        return { origin, isLoggedIn: !!viewerId, viewerId, item, share };
    }

    // Fallback ל-static data הקיים
    const staticItem = getStaticItemById(params.id);
    if (staticItem) {
        return {
            origin,
            item: {
                ...staticItem,
                images:       staticItem.image ? [staticItem.image] : [],
                neighborhood: undefined as string | undefined,
                city:         undefined as string | undefined,
                extraFields:  {} as Record<string, unknown>,
                isUserSubmitted: false,
                viewCount:    staticItem.viewCount ?? 0,
            },
            share: buildShareImage(origin, staticItem.id, staticItem.image ?? ''),
        };
    }

    return { origin, item: null };
};
