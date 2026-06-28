import type { LayoutServerLoad } from './$types';
import { getUserById, getNeighborhoods } from '$lib/server/db';
import { listApproved } from '$lib/server/adsStore';

export const load: LayoutServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // session לא תקין - נמשיך כמשתמש אנונימי
    }

    // שלוש השליפות בלתי-תלויות זו בזו → רצות במקביל (לא בטור) כדי לחסוך
    // round-trips סדרתיים ל-Strapi בכל ניווט.
    const jwt = event.cookies.get('strapi_jwt');
    const [userRes, adsRes, neighborhoodsRes] = await Promise.allSettled([
        session?.user?.id ? getUserById(session.user.id as string, jwt) : Promise.resolve(null),
        listApproved(),
        getNeighborhoods('approved'),
    ]);

    // פרטי משתמש מלאים לתצוגה בדרואר
    const layoutUser = userRes.status === 'fulfilled' ? userRes.value : null;

    // פרסומות מאושרות - לשתילה ב-AdsSidebar לצד הסטטיות
    const approvedAds = adsRes.status === 'fulfilled'
        ? adsRes.value.map(a => ({
            id: a.id,
            title: a.title,
            subtitle: a.subtitle,
            cta: a.cta,
            hover: a.hoverText,
            gradient: a.gradient,
            mainImage: a.mainImage,
        }))
        : [];

    // שכונות שהוצעו ע"י תושבים ואושרו - מתמזגות לבוררים ולמפה בכל האתר
    const approvedNeighborhoods = neighborhoodsRes.status === 'fulfilled'
        ? neighborhoodsRes.value.map(n => ({ name: n.name, city: n.city, lat: n.lat, lng: n.lng }))
        : [];

    return { session, layoutUser, approvedAds, approvedNeighborhoods };
};
