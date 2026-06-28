import type { PageServerLoad } from './$types';

/** "אושיות (רחובות)" → מפתח השוואה אחיד "אושיות|רחובות" */
function areaKey(entry: string): string {
    const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    const name = (m ? m[1] : entry).trim().toLowerCase();
    const city = (m ? m[2] : '').trim().toLowerCase();
    return `${name}|${city}`;
}

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const session = await locals.auth?.();

        if (!session?.user?.id) {
            return {
                user: null,
                takenAreas: {} as Record<string, string>,
            };
        }

        const { getUserById, getAllUsers } = await import('$lib/server/db');
        const user = await getUserById(session.user.id);

        // מיפוי אזורים שכבר יש להם רכז → שם הרכז (פרט לשכונות של המשתמש הנוכחי עצמו)
        const takenAreas: Record<string, string> = {};
        try {
            const users = await getAllUsers();
            for (const u of users) {
                if (String(u.id) === String(session.user.id)) continue;
                for (const entry of (u.coordinator_of ?? [])) {
                    const key = areaKey(entry);
                    if (key && key !== '|' && !takenAreas[key]) {
                        takenAreas[key] = u.name || u.nickname || 'רכז/ת';
                    }
                }
            }
        } catch (e) {
            console.warn('[coordinator/apply] takenAreas failed:', e);
        }

        return {
            user: user ? {
                name: user.name,
                phone: user.phone,
                neighborhood: user.neighborhood,
                city: user.city,
            } : null,
            takenAreas,
        };
    } catch (error) {
        console.error('Error loading coordinator apply page:', error);
        return {
            user: null,
            takenAreas: {} as Record<string, string>,
        };
    }
};
