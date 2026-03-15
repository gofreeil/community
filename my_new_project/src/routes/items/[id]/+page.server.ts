import { getDbItemById } from '$lib/server/db';
import { getItemById as getStaticItemById } from '$lib/itemsData';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    // נסה קודם ב-DB (פריטים שהמשתמשים הוסיפו)
    const dbItem = await getDbItemById(params.id);
    if (dbItem) {
        // המר לפורמט תואם עם ממשק Item הקיים
        const extraFields = (() => {
            try { return JSON.parse(dbItem.extra_fields ?? '{}'); } catch { return {}; }
        })();
        return {
            item: {
                id:          dbItem.id,
                label:       dbItem.label,
                category:    dbItem.category,
                description: dbItem.description,
                contact:     dbItem.contact,
                phone:       dbItem.phone,
                address:     dbItem.address,
                icon:        dbItem.icon,
                color:       dbItem.color,
                image:       undefined as string | undefined,
                neighborhood: dbItem.neighborhood,
                city:        dbItem.city,
                extraFields,
                isUserSubmitted: true,
            },
        };
    }

    // Fallback ל-static data הקיים
    const staticItem = getStaticItemById(params.id);
    if (staticItem) {
        return {
            item: {
                ...staticItem,
                neighborhood: undefined as string | undefined,
                city:         undefined as string | undefined,
                extraFields:  {} as Record<string, unknown>,
                isUserSubmitted: false,
            },
        };
    }

    return { item: null };
};
