// ============================================================
// userAvatar.ts - תמונת פרופיל שהועלתה ידנית (avatar_url = data:image;base64)
// ------------------------------------------------------------
// עמוד הניהול (/admin) החזיר את כל המשתמשים עם התמונות המוטבעות: 6.8MB,
// 12 שניות טעינה (נמדד 14.9.2026). במקום זה כל תמונה יוצאת ככתובת לנתיב
// /api/user-avatar/<id>?v=<HMAC> שמגיש אותה עם קאש immutable (inlineImage.ts).
// האסימון (HMAC על מזהה+תוכן עם AUTH_SECRET) מונע דפדוף בתמונות לפי מזהים;
// החלפת תמונה משנה אותו ולכן גם את הכתובת.
// ============================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.AUTH_SECRET || 'user-avatar-dev-secret';

export function userAvatarToken(userId: string, dataUri: string): string {
    return createHmac('sha256', SECRET).update(`${userId}:`).update(dataUri).digest('base64url').slice(0, 27);
}

export function userAvatarTokenMatches(expected: string, given: string | null): boolean {
    if (!given || given.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/** מחליף avatar_url מוטבע (data:) בכתובת לנתיב המגיש; כתובת רגילה (גוגל וכו') נשארת */
export function withUserAvatarUrl<T extends { id: string; avatar_url: string | null }>(u: T): T {
    const a = u.avatar_url ?? '';
    if (!a.startsWith('data:')) return u;
    return { ...u, avatar_url: `/api/user-avatar/${encodeURIComponent(u.id)}?v=${userAvatarToken(u.id, a)}` };
}
