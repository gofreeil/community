import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createItem, getUserById } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    let session = null;
    try { session = await event.locals.auth(); } catch {}

    // עיר המשתמש - כדי שבורר הרחובות בטופס יציע את הרחובות של העיר הנכונה
    let userCity = '';
    if (session?.user?.id) {
        try {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(session.user.id, jwt ?? undefined);
            userCity = user?.city ?? '';
        } catch {}
    }

    return { userId: session?.user?.id ?? null, userCity };
};

export const actions: Actions = {
    default: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/lost-and-found/add');

        // העיר נלקחת מהפרופיל - הלוח מחולק לפי עיר, כדי שמודעה לא תגלוש לעיר אחרת.
        let userCity = '';
        let userNeighborhood = '';
        try {
            const jwt = event.cookies.get('strapi_jwt');
            const user = await getUserById(session.user.id, jwt ?? undefined);
            userCity         = user?.city ?? '';
            userNeighborhood = user?.neighborhood ?? '';
        } catch {}

        const fd           = await event.request.formData();
        const type         = fd.get('type')?.toString()               ?? '';
        const title        = fd.get('title')?.toString().trim()       ?? '';
        const description  = fd.get('description')?.toString().trim() ?? '';
        const location     = fd.get('location')?.toString().trim()    ?? '';
        const phone        = fd.get('phone')?.toString().trim()       ?? '';
        const contact      = fd.get('contact')?.toString().trim()     ?? '';
        const image_base64 = fd.get('image_base64')?.toString()       ?? '';
        const latRaw       = fd.get('lat')?.toString().trim()         ?? '';
        const lngRaw       = fd.get('lng')?.toString().trim()         ?? '';
        const lat          = latRaw !== '' && Number.isFinite(+latRaw) ? +latRaw : null;
        const lng          = lngRaw !== '' && Number.isFinite(+lngRaw) ? +lngRaw : null;

        // סימון פין על המפה נחשב מיקום תקין גם בלי טקסט - נגזרת כתובת גיבוי מהפרופיל
        const hasPin = lat != null && lng != null;

        if (!type)                 return fail(400, { error: 'יש לבחור אבד או נמצא' });
        if (!title)                return fail(400, { error: 'יש למלא כותרת' });
        if (!location && !hasPin)  return fail(400, { error: 'יש למלא מיקום או לסמן על המפה' });
        if (!phone)                return fail(400, { error: 'יש למלא טלפון ליצירת קשר' });
        if (!userCity)             return fail(400, { error: 'חסרה עיר בפרופיל - עדכן את הפרופיל לפני פרסום מודעה' });

        // כתובת לתצוגה בכרטיס: הטקסט אם הוקלד, אחרת שכונה/עיר מהפרופיל, אחרת ציון שסומן במפה
        const address = location || [userNeighborhood, userCity].filter(Boolean).join(', ') || 'מיקום מסומן על המפה';

        try {
            await createItem({
                category:    'lost_and_found',
                label:       title,
                description: `${type === 'lost' ? '❓ אבד' : '✅ נמצא'} | ${description}`,
                contact:     contact,
                phone:       phone,
                address:     address,
                icon:        type === 'lost' ? '❓' : '✅',
                color:       type === 'lost' ? 'red' : 'green',
                neighborhood: userNeighborhood,
                city:         userCity,
                ...(lat != null && lng != null ? { lat, lng } : {}),
                extra_fields: { type, location, ...(image_base64 ? { image: image_base64 } : {}) },
                user_id:     session.user.id,
            });
        } catch (e) {
            console.error('[lost-and-found] createItem failed:', e);
            return fail(500, { error: 'שגיאה בשמירת המודעה, נסה שוב' });
        }

        return { success: true };
    },
};
