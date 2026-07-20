import { redirect, error } from '@sveltejs/kit';
import { getDbItemById, getItemsByCategory, getUserByAnyId } from '$lib/server/db';
import { isSuperAdmin, isCoordinatorOfArea } from '$lib/server/auth';
import { getSinglesAccessStatus } from '$lib/server/singlesAccess';
import { getItemById as getStaticItemById } from '$lib/itemsData';
import { getDemoItemById } from '$lib/demoUserItems';
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

    // נסה קודם ב-DB (פריטים שהמשתמשים הוסיפו), ואחר-כך פריטי דמו
    const dbItem = (await getDbItemById(params.id)) ?? getDemoItemById(params.id, demoOwnerId);
    if (dbItem) {
        // המר לפורמט תואם עם ממשק Item הקיים
        const extraFields = (() => {
            try { return JSON.parse(dbItem.extra_fields ?? '{}'); } catch { return {}; }
        })();
        const galleryImages: string[] = Array.isArray(extraFields?.images)
            ? (extraFields.images as unknown[]).filter((s): s is string => typeof s === 'string')
            : (typeof extraFields?.image === 'string' ? [extraFields.image] : []);

        // ---- Singles: הסתר טלפון אלא אם בעלים / מבקש מאושר ----
        let phone = dbItem.phone;
        let singlesStatus: SinglesPhoneStatus | undefined;
        let incomingRequests: IncomingSinglesRequest[] | undefined;

        if (dbItem.category === 'singles') {
            const isOwner = !!viewerId && dbItem.user_id === viewerId;

            // שער גישה: כרטיס פנויים נגיש רק לבעלים / סופר-אדמין / מי שאושרה לו גישה ללוח.
            // גולש שאין לו גישה מנותב לשער ב-/singles (או להתחברות אם אינו מחובר).
            if (!isOwner && !isSuperAdmin(session)) {
                const access = await getSinglesAccessStatus(viewerId, false);
                // תקלת Strapi זמנית ≠ אין גישה: לא זורקים משתמש מאושר מהלוח
                if (access === 'unavailable') {
                    throw error(503, 'תקלה זמנית בטעינת ההרשאות - נסה שוב בעוד רגע');
                }
                if (access !== 'granted') {
                    throw redirect(302, viewerId ? '/singles' : '/login?redirect=' + encodeURIComponent('/singles'));
                }
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

        // נכס שנמחק (מחיקה רכה) גלוי רק לבעלים/רכז/סופר-אדמין - כדי לשחזר. לגולש רגיל = לא נמצא.
        // משאלה (wish) לעולם אינה דף פריט ציבורי - היא מוצגת רק ככרטיס טקסט בכותל המשאלות,
        // ודף הפריט שלה היה חושף user_id ו-extra_fields לכל גולש.
        if ((dbItem.status === 'deleted' || dbItem.category === 'wish') && !canEditActivities) {
            return { origin, item: null };
        }

        return {
            origin,
            isLoggedIn: !!viewerId,
            viewerId,
            item: {
                id:          dbItem.id,
                label:       dbItem.label,
                category:    dbItem.category,
                description: dbItem.description,
                contact:     dbItem.contact,
                phone,
                address:     dbItem.address,
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
            },
        };
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
        };
    }

    return { origin, item: null };
};
