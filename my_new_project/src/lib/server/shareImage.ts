// תמונת השיתוף (og:image) של פריט - כתובת + מידות + סוג.
// וואטסאפ קפדן יותר מטלגרם/פייסבוק: הוא מעדיף og:image:width/height/type
// מוצהרים, ואחרת עלול ליפול לקדימון גנרי (title + favicon). לכן המידות
// נקראות כאן מה-header של התמונה (בלי ספריית עיבוד תמונה) ומוזרקות לתגים.

export interface ShareImage {
    image: string;
    type?: string;
    width?: number;
    height?: number;
}

interface ImageMeta { type: string; width: number; height: number }

/** מידות וסוג של תמונה מתוך ה-bytes שלה (JPEG / PNG / GIF / WebP). */
export function imageMetaFromBuffer(buf: Buffer): ImageMeta | null {
    if (buf.length < 24) return null;

    // PNG: signature + IHDR (width/height ב-BE בבתים 16..24)
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return { type: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // GIF: "GIF87a"/"GIF89a" + width/height LE
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
        return { type: 'image/gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    // WebP: RIFF....WEBP + chunk VP8 / VP8L / VP8X
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
        const chunk = buf.toString('ascii', 12, 16);
        if (chunk === 'VP8 ' && buf.length >= 30) {
            return { type: 'image/webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
        }
        if (chunk === 'VP8L' && buf.length >= 25) {
            const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
            return {
                type: 'image/webp',
                width: 1 + (((b1 & 0x3f) << 8) | b0),
                height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
            };
        }
        if (chunk === 'VP8X' && buf.length >= 30) {
            return { type: 'image/webp', width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
        }
        return null;
    }
    // JPEG: סריקת markers עד SOFn (C0..CF פרט ל-C4/C8/CC)
    if (buf[0] === 0xff && buf[1] === 0xd8) {
        let i = 2;
        while (i + 9 < buf.length) {
            if (buf[i] !== 0xff) { i++; continue; }
            const marker = buf[i + 1];
            if (marker === 0xff) { i++; continue; }
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                return { type: 'image/jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
            }
            if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
            i += 2 + buf.readUInt16BE(i + 2);
        }
        return null;
    }
    return null;
}

/** מידות וסוג של תמונה שנשמרה כ-data URL (base64). מחזיר null אם לא ניתן לפענח. */
export function imageMetaFromDataUrl(dataUrl: string): ImageMeta | null {
    const m = dataUrl.match(/^data:([^;,]+)?(?:;([^,]*))?,(.*)$/s);
    if (!m) return null;
    try {
        const payload = m[3] || '';
        // מספיקים ~64KB ראשונים כדי להגיע ל-header (גם אחרי EXIF גדול ב-JPEG)
        const buf = m[2] === 'base64'
            ? Buffer.from(payload.slice(0, 96 * 1024), 'base64')
            : Buffer.from(decodeURIComponent(payload.slice(0, 96 * 1024)), 'utf-8');
        const meta = imageMetaFromBuffer(buf);
        if (!meta || !meta.width || !meta.height) return null;
        return meta;
    } catch {
        return null;
    }
}

/** SVG של dicebear → PNG (סקרפרים לא מציגים SVG ב-og:image). */
function toRasterImage(url: string): string {
    if (url.includes('api.dicebear.com') && url.includes('/svg?')) {
        return url.replace('/svg?', '/png?') + (url.includes('size=') ? '' : '&size=512');
    }
    return url;
}

/** מידות הכרטיס הממותג ש-/api/items/[id]/og.jpg מייצר כשאין תמונה. */
const GENERATED_CARD = { type: 'image/png', width: 1200, height: 630 } as const;

/**
 * מחשב את og:image של פריט מהמועמד הראשון (avatar / תמונה ראשונה בגלריה):
 * - data URL: מוגש דרך /api/items/[id]/og.jpg, והמידות נקראות מה-header.
 * - אין תמונה: הכרטיס הממותג (מידות קבועות).
 * - URL רגיל / נתיב באתר: כמו שהוא (dicebear svg → png).
 */
export function buildShareImage(origin: string, itemId: string, candidate: string): ShareImage {
    const endpoint = `${origin}/api/items/${itemId}/og.jpg`;
    if (!candidate) return { image: endpoint, ...GENERATED_CARD };
    if (candidate.startsWith('data:')) {
        const meta = imageMetaFromDataUrl(candidate);
        return meta ? { image: endpoint, ...meta } : { image: endpoint };
    }
    if (/^https?:\/\//i.test(candidate)) {
        const url = toRasterImage(candidate);
        return url.includes('api.dicebear.com') && url.includes('/png?')
            ? { image: url, type: 'image/png', width: 512, height: 512 }
            : { image: url };
    }
    if (candidate.startsWith('/')) return { image: `${origin}${candidate}` };
    return { image: endpoint, ...GENERATED_CARD };
}
