import { error } from '@sveltejs/kit';
import { getDbItemById } from '$lib/server/db';
import { getMockRestaurantById } from '$lib/restaurantsData';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const { id } = event.params;

    // פריט אמיתי מ-Strapi, ואם אין - מסעדת דוגמה
    let raw: {
        id: string; label: string; description: string; icon: string;
        city: string; neighborhood: string; phone: string; contact: string;
        category: string; created_at: string; extra_fields: string;
        address?: string; view_count?: number;
    } | null = null;

    try {
        const db = await getDbItemById(id);
        if (db) {
            raw = {
                id: db.id, label: db.label, description: db.description ?? '',
                icon: db.icon ?? '🍽️', city: db.city ?? '', neighborhood: db.neighborhood ?? '',
                phone: db.phone ?? '', contact: db.contact ?? '', category: db.category,
                created_at: db.created_at ?? '', extra_fields: db.extra_fields ?? '{}',
                address: db.address ?? '', view_count: db.view_count,
            };
        }
    } catch (err) {
        console.error('[restaurants/[id]] getDbItemById failed:', err);
    }

    if (!raw) {
        const mock = getMockRestaurantById(id);
        if (mock) raw = { ...mock };
    }

    if (!raw) error(404, 'המסעדה לא נמצאה');

    const extra = (() => {
        try { return JSON.parse(raw.extra_fields || '{}') as Record<string, unknown>; }
        catch { return {}; }
    })();

    return {
        item: {
            id: raw.id,
            label: raw.label,
            description: raw.description,
            icon: raw.icon,
            city: raw.city,
            neighborhood: raw.neighborhood,
            address: raw.address ?? '',
            phone: raw.phone,
            contact: raw.contact,
            createdAt: raw.created_at,
            viewCount: raw.view_count ?? 0,
            extra,
        },
    };
};
