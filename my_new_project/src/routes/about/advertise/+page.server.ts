import type { PageServerLoad } from './$types';
import { getDiscountCodes } from '$lib/server/db';

export const load: PageServerLoad = async ({ parent }) => {
    // codes - מ-Strapi עם נפילה לברירות מחדל
    const discountCodes = await getDiscountCodes();

    // סטטוס רכז של המשתמש המחובר (מה-layout, ללא קריאה נוספת)
    const { layoutUser } = await parent();
    const isCoordinator = Boolean(
        layoutUser &&
        (
            (Array.isArray(layoutUser.coordinator_of) && layoutUser.coordinator_of.length > 0) ||
            layoutUser.role === 'neighborhood_admin' ||
            layoutUser.role === 'super_admin'
        )
    );

    return { discountCodes, isCoordinator };
};
