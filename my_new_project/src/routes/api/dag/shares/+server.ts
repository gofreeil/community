import { json, type RequestHandler } from '@sveltejs/kit';
import { getDagSharesByEmail } from '$lib/server/dagShares';

// מספר המניות של המשתמש המחובר, מתוך ה-NFT של הפלטפורמה ב-DAG.
// משתמש בלי חשבון DAG מקושר (או כשה-API לא זמין) מקבל shares=0 - הפרופיל נשאר תקין.
export const GET: RequestHandler = async ({ locals }) => {
    const session = await locals.auth?.();
    if (!session?.user?.id) return json({ error: 'unauthorized' }, { status: 401 });

    const res = await getDagSharesByEmail(session.user.email);
    return json(
        { shares: res?.shares ?? 0, percent: res?.percent ?? 0 },
        { headers: { 'cache-control': 'private, no-store' } },
    );
};
