import type { RequestHandler } from './$types';
import { getUserByAnyId } from '$lib/server/db';
import { decodeDataImage, immutableImageResponse } from '$lib/server/inlineImage';
import { userAvatarToken, userAvatarTokenMatches } from '$lib/server/userAvatar';

/**
 * תמונת פרופיל שהועלתה ידנית - במקום base64 מוטבע בנתוני /admin.
 * מוגש רק עם ?v=<HMAC> תואם (userAvatar.ts). עוקף את שרשרת ה-auth
 * (PUBLIC_IMAGE_PATH ב-hooks.server) כדי שהקצה ישמור בקאש.
 */
export const GET: RequestHandler = async ({ params, url }) => {
    const notFound = () => new Response(null, { status: 404 });
    let user;
    try { user = await getUserByAnyId(params.id); } catch { return notFound(); }
    const raw = user?.avatar_url ?? '';
    if (!user || !raw.startsWith('data:')) return notFound();
    if (!userAvatarTokenMatches(userAvatarToken(user.id, raw), url.searchParams.get('v'))) return notFound();
    const img = decodeDataImage(raw);
    if (!img) return notFound();
    return immutableImageResponse(img);
};
