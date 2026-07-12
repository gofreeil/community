import type { RequestEvent } from '@sveltejs/kit';
import { getUserById } from './db';
import { categoryTier, tierMet, type Tier, type TierUserFields } from '$lib/tiers';

export interface TierGate {
    requiredTier: Tier;
    tierUser: TierUserFields | null;
    needsUpgrade: boolean;
}

/**
 * שער דרגה לטופסי פרסום ייעודיים (giveaways/gmachim/jobs/rides...).
 * מחזיר את הדרגה הנדרשת + פרטי המשתמש הרלוונטיים + האם חסר לו כדי לפרסם.
 * המשתמש המחובר עם דרגה חסרה יראה LevelUpCard במקום הטופס (השלמה במקום).
 * אורח (לא מחובר) — needsUpgrade=false; הזרימה הקיימת (טיוטה→לוגין) נשמרת.
 */
export async function loadTierGate(event: RequestEvent, category: string): Promise<TierGate> {
    const requiredTier = categoryTier(category);
    let session = null;
    try { session = await event.locals.auth(); } catch { /* עוגייה פגומה */ }

    let tierUser: TierUserFields | null = null;
    let needsUpgrade = false;
    if (session?.user?.id) {
        try {
            const u = await getUserById(session.user.id as string, event.cookies.get('strapi_jwt'));
            if (u) {
                tierUser = {
                    name: u.name, email: u.email, email_confirmed: u.email_confirmed,
                    phone: u.phone, city: u.city, neighborhood: u.neighborhood,
                    gender: u.gender, birth_date: u.birth_date,
                };
                needsUpgrade = !tierMet(u, requiredTier);
            }
        } catch { /* תקלת Strapi — לא חוסמים; הטופס עצמו יאמת בשמירה */ }
    }
    return { requiredTier, tierUser, needsUpgrade };
}
