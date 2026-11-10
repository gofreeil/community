// ============================================================
// emailUnsub.ts — קישור חתום לביטול קבלת עותקי הודעות במייל
//
// HMAC על האימייל עם AUTH_SECRET של האתר הזה: בלי התחברות, ובלי שאפשר לבטל
// למישהו אחר (אי אפשר לנחש חתימה). בלי AUTH_SECRET אין קישור ואין ביטול.
// ============================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

const ORIGIN = process.env.PUBLIC_SITE_ORIGIN || 'https://community.gofreeil.com';

function sign(email: string): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return '';
    return createHmac('sha256', secret).update('unsub:' + email.trim().toLowerCase()).digest('hex').slice(0, 32);
}

/** כתובת הביטול למייל נתון ('' כשאין AUTH_SECRET) */
export function unsubUrl(email: string): string {
    const t = sign(email);
    if (!t) return '';
    return `${ORIGIN}/unsubscribe?e=${encodeURIComponent(email.trim())}&t=${t}`;
}

export function verifyUnsub(email: string, token: string): boolean {
    const want = sign(email);
    if (!want || !token || token.length !== want.length) return false;
    return timingSafeEqual(Buffer.from(want), Buffer.from(token));
}
