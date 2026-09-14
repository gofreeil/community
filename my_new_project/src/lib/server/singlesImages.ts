// ============================================================
// singlesImages.ts - תמונות כרטיסי פנויים/פנויות מחוץ לנתוני הדף
// ------------------------------------------------------------
// הכרטיסים שומרים את התמונות כ-data:image/...;base64 בתוך extra_fields.
// עד 14.9.2026 הן נשלחו כמות שהן בתוך נתוני /singles: למשתמש מחובר הדף
// שקל ~4MB ולקח ~18 שניות (לאורח, שהלוח סגור בפניו: 5KB בחצי שנייה).
// לחיצה על אריח "פנויים/פנויות" במפה נראתה "מתה" - הניווט חיכה לנתונים.
//
// במקום זה כל תמונה מקבלת כתובת לנתיב /api/singles-image/<id>/<n>?v=<אסימון>
// שמגיש את הבייטים עם קאש immutable (ראה inlineImage.ts + PUBLIC_IMAGE_PATH
// ב-hooks.server.ts).
//
// פרטיות: הלוח סגור למי שלא אושר, ומספרי הפריטים רציפים - כתובת "גלויה"
// הייתה מאפשרת לכל אחד לדפדף בתמונות. לכן ה-v אינו חותם תוכן סתם אלא
// HMAC על (מזהה, אינדקס, תוכן) עם AUTH_SECRET: הנתיב מגיש רק כשהאסימון
// תואם, ומי שלא קיבל את הדף (= לא אושר) לא יכול לייצר אותו. החלפת תמונה
// משנה את האסימון ולכן גם את הכתובת - קאש ישן לא מציג תמונה ישנה.
// ============================================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SingleProfile } from '$lib/singlesMock';
import type { DbItem } from './db';

const SECRET = process.env.AUTH_SECRET || 'singles-image-dev-secret';

export function singlesImageToken(itemId: string, index: number, dataUri: string): string {
    return createHmac('sha256', SECRET)
        .update(`${itemId}:${index}:`)
        .update(dataUri)
        .digest('base64url')
        .slice(0, 27);
}

export function singlesImageTokenMatches(expected: string, given: string | null): boolean {
    if (!given || given.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

export function singlesImageUrl(itemId: string, index: number, dataUri: string): string {
    return `/api/singles-image/${encodeURIComponent(itemId)}/${index}?v=${singlesImageToken(itemId, index, dataUri)}`;
}

const isDataUri = (s: string) => s.startsWith('data:');

/** מחליף בפרופיל את תמונות ה-base64 (images + avatar) בכתובות לנתיב המגיש */
export function withSinglesImageUrls<T extends Pick<SingleProfile, 'id' | 'images' | 'avatar'>>(p: T): T {
    const srcImages = p.images ?? [];
    const images = srcImages.map((img, i) => (isDataUri(img) ? singlesImageUrl(p.id, i, img) : img));
    let avatar = p.avatar;
    if (isDataUri(avatar)) {
        const i = srcImages.indexOf(avatar);
        avatar = i >= 0 ? images[i] : (images[0] ?? '');
    }
    return { ...p, images, avatar };
}

/**
 * גרסת DbItem שבה מערך התמונות ב-extra_fields מוחלף בכתובות לנתיב המגיש -
 * לדפים שקוראים את הרשומה הגולמית (למשל רשימת הפרסומים בפרופיל).
 */
export function withSinglesItemImageUrls(item: DbItem): DbItem {
    if (item.category !== 'singles' || !item.extra_fields) return item;
    try {
        const ef = JSON.parse(item.extra_fields) as Record<string, unknown>;
        if (!Array.isArray(ef.images)) return item;
        const images = (ef.images as unknown[]).map((img, i) =>
            typeof img === 'string' && isDataUri(img) ? singlesImageUrl(item.id, i, img) : img);
        return { ...item, extra_fields: JSON.stringify({ ...ef, images }) };
    } catch {
        return item;
    }
}

/**
 * גרסת DbItem בלי תמונות ה-base64 ב-extra_fields - לדפים שמחזירים את הרשומה
 * הגולמית לצד הפרופיל (הרשומה נשארת לתאימות, התמונות כבר בפרופיל ככתובות).
 */
export function stripSinglesItemImages(item: DbItem): DbItem {
    if (!item.extra_fields) return item;
    try {
        const ef = JSON.parse(item.extra_fields) as Record<string, unknown>;
        if (!Array.isArray(ef.images)) return item;
        const { images: _images, ...rest } = ef;
        return { ...item, extra_fields: JSON.stringify({ ...rest, images_count: _images.length }) };
    } catch {
        return item;
    }
}
