import type { PageServerLoad } from './$types';
import { getUserById, getUserByEmail } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();

    // Super-admin check - allows unlimited testing without payment.
    // Mirrors the pattern in /admin/+page.server.ts (DB lookup + email fallback).
    let isSuperAdmin = session?.user?.role === 'super_admin';
    if (!isSuperAdmin && session?.user?.id) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) {
                dbUser = await getUserByEmail(session.user.email);
            }
            isSuperAdmin = dbUser?.role === 'super_admin';
        } catch {
            // ignore - treat as non-admin
        }
    }

    return { isSuperAdmin };
};
