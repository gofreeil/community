import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // TEMP_BYPASS — if (!session?.user?.id) { throw redirect(302, '/login?redirect=/receipts'); }
    if (!session?.user?.id) {
        return { user: null, receipts: [], balance: 0 };
    }

    let user = null;
    try {
        user = await getUserById(session.user.id);
    } catch (e) {
        console.warn('[receipts] getUserById failed:', e);
    }

    // לדוגמה: תקבולים דמה — בהמשך יבואו מ-Strapi
    const receipts = [
        { id: 1, date: '2025-03-10', description: 'תרומה לקהילה',   amount: -50,  type: 'out' },
        { id: 2, date: '2025-03-08', description: 'פרסום מודעה',     amount: -30,  type: 'out' },
        { id: 3, date: '2025-03-05', description: 'קרדיט הצטרפות',  amount: +100, type: 'in'  },
        { id: 4, date: '2025-02-20', description: 'פרסום מודעה',     amount: -30,  type: 'out' },
        { id: 5, date: '2025-02-15', description: 'בונוס פעילות',    amount: +25,  type: 'in'  },
    ];

    return {
        user,
        receipts,
        balance: (user as { balance?: number } | null)?.balance ?? 0,
    };
};
