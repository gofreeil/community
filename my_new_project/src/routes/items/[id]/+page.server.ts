import { getDbItemById, getItemsByCategory } from '$lib/server/db';
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
        return {
            origin,
            item: {
                id:          dbItem.id,
                label:       dbItem.label,
                category:    dbItem.category,
                description: dbItem.description,
                contact:     dbItem.contact,
                phone,
                address:     dbItem.address,
                icon:        dbItem.icon,
                color:       dbItem.color,
                image:       galleryImages[0],
                images:      galleryImages,
                neighborhood: dbItem.neighborhood,
                city:        dbItem.city,
                extraFields,
                isUserSubmitted: true,
                isOwner,
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
