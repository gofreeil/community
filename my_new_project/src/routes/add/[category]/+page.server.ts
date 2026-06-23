import { error, redirect } from '@sveltejs/kit';
import { categoryConfig } from '$lib/categoryFields';
import { getUserById, getDbItemById } from '$lib/server/db';
import type { PageServerLoad } from './$types';

const DEDICATED_ROUTES: Record<string, string> = {
    gemachim: '/gmachim/add',
};

export const load: PageServerLoad = async (event) => {
    const dedicated = DEDICATED_ROUTES[event.params.category];
    if (dedicated) throw redirect(302, dedicated);

    const session = await event.locals.auth();

    const config = categoryConfig[event.params.category];
    if (!config) {
        error(404, `קטגוריה "${event.params.category}" לא קיימת`);
    }

    let userProfile: { nickname: string; phone: string; neighborhood: string; city: string; family_status: string } | null = null;
    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            const u = await getUserById(session.user.id as string, jwt);
            if (u) userProfile = {
                nickname:      (u.nickname || u.name || '') as string,
                phone:         u.phone         ?? '',
                neighborhood:  u.neighborhood  ?? '',
                city:          u.city          ?? '',
                family_status: u.family_status ?? '',
            };
        } catch { /* שקט */ }
    }

    // ---- Edit mode: ?edit=<id> טוען את הפריט הקיים לעריכה ----
    // רק בעל הפריט יכול לערוך (בודקים user_id מול session).
    const editId = event.url.searchParams.get('edit');
    let editItem: {
        id: string;
        label: string;
        description: string;
        phone: string;
        contact: string;
        address: string;
        neighborhood: string;
        city: string;
        image: string;
        images: string[];
        extra_fields: Record<string, unknown>;
    } | null = null;
    if (editId && session?.user?.id) {
        try {
            const dbItem = await getDbItemById(editId);
            if (dbItem && dbItem.user_id === session.user.id) {
                editItem = {
                    id: dbItem.id,
                    label: dbItem.label ?? '',
                    description: dbItem.description ?? '',
                    phone: dbItem.phone ?? '',
                    contact: dbItem.contact ?? '',
                    address: dbItem.address ?? '',
                    neighborhood: dbItem.neighborhood ?? '',
                    city: dbItem.city ?? '',
                    image: dbItem.image ?? '',
                    images: Array.isArray(dbItem.images) ? dbItem.images : [],
                    extra_fields: typeof dbItem.extra_fields === 'string'
                        ? (() => { try { return JSON.parse(dbItem.extra_fields); } catch { return {}; } })()
                        : (dbItem.extra_fields ?? {}),
                };
            }
        } catch { /* פריט לא נמצא או שגיאה - נמשיך כיצירת פריט חדש */ }
    }

    return {
        categoryId: event.params.category,
        config,
        userId: session?.user?.id ?? null,
        userProfile,
        editItem,
    };
};
