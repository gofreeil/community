import type { LayoutServerLoad } from './$types';
import { getUserById } from '$lib/server/db';
import { listApproved } from '$lib/server/adsStore';

export const load: LayoutServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // session לא תקין - נמשיך כמשתמש אנונימי
    }

    // טעינת פרטי משתמש מלאים לתצוגה בדרואר
    let layoutUser = null;
    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            layoutUser = await getUserById(session.user.id as string, jwt);
        } catch { /* שקט */ }
    }

    // פרסומות מאושרות - לשתילה ב-AdsSidebar לצד הסטטיות
    let approvedAds: Array<{ id: string; title: string; subtitle: string; cta: string; hover: string; gradient: string; mainImage: string }> = [];
    try {
        const all = await listApproved();
        approvedAds = all.map(a => ({
            id: a.id,
            title: a.title,
            subtitle: a.subtitle,
            cta: a.cta,
            hover: a.hoverText,
            gradient: a.gradient,
            mainImage: a.mainImage,
        }));
    } catch { /* שקט */ }

    return { session, layoutUser, approvedAds };
};
