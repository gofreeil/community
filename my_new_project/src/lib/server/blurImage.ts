// ============================================================
// blurImage.ts — גרסה מטושטשת של תמונת כרטיס (מצב "בלוח עם פנים מטושטשות")
//
// הטשטוש נעשה בשרת ולא ב-CSS: filter: blur על התמונה המקורית נעקף בכלי המפתחים,
// כי המקור עצמו כבר הגיע לדפדפן. כאן התמונה מוקטנת לרשת של GRID פיקסלים
// (בגודל כזה פנים אינן ניתנות לזיהוי) ומוגדלת חזרה בהחלקה — המקור לא יוצא מהשרת.
//
// jpeg-js הוא JS טהור, בלי בינארים — רץ גם ב-Vercel וגם בשרת Node.
// הטפסים בשני האתרים דוחסים תמונות ל-JPEG; תמונה ישנה בפורמט אחר → null,
// והנתיב מגיש במקומה ממלא-מקום (BLUR_PLACEHOLDER).
// ============================================================

import jpeg from 'jpeg-js';

/** הצד הארוך של הרשת המוקטנת */
const GRID = 16;
/** הצד הארוך של התמונה המוגשת */
const OUT = 160;

export function blurJpeg(bytes: ArrayBuffer): ArrayBuffer | null {
    let src: { width: number; height: number; data: Uint8Array };
    try {
        src = jpeg.decode(new Uint8Array(bytes), { useTArray: true, maxResolutionInMP: 30, maxMemoryUsageInMB: 256 });
    } catch {
        return null;
    }
    const { width: w, height: h, data } = src;
    if (!w || !h) return null;

    // 1) הקטנה לרשת: ממוצע של כל הפיקסלים בכל תא
    const gw = w >= h ? GRID : Math.max(1, Math.round((GRID * w) / h));
    const gh = h >= w ? GRID : Math.max(1, Math.round((GRID * h) / w));
    const grid = new Float32Array(gw * gh * 3);
    for (let gy = 0; gy < gh; gy++) {
        const y0 = Math.floor((gy * h) / gh), y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * h) / gh));
        for (let gx = 0; gx < gw; gx++) {
            const x0 = Math.floor((gx * w) / gw), x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * w) / gw));
            let r = 0, g = 0, b = 0;
            for (let y = y0; y < y1; y++) {
                let i = (y * w + x0) * 4;
                for (let x = x0; x < x1; x++, i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
            }
            const n = (y1 - y0) * (x1 - x0), o = (gy * gw + gx) * 3;
            grid[o] = r / n; grid[o + 1] = g / n; grid[o + 2] = b / n;
        }
    }

    // 2) הגדלה דו-ליניארית חזרה לגודל תצוגה — מעברי צבע רכים במקום ריבועים
    const ow = w >= h ? OUT : Math.max(1, Math.round((OUT * w) / h));
    const oh = h >= w ? OUT : Math.max(1, Math.round((OUT * h) / w));
    const out = new Uint8Array(ow * oh * 4);
    for (let y = 0; y < oh; y++) {
        const fy = Math.min(gh - 1, Math.max(0, ((y + 0.5) * gh) / oh - 0.5));
        const y0 = Math.floor(fy), y1 = Math.min(gh - 1, y0 + 1), ty = fy - y0;
        for (let x = 0; x < ow; x++) {
            const fx = Math.min(gw - 1, Math.max(0, ((x + 0.5) * gw) / ow - 0.5));
            const x0 = Math.floor(fx), x1 = Math.min(gw - 1, x0 + 1), tx = fx - x0;
            const o = (y * ow + x) * 4;
            for (let c = 0; c < 3; c++) {
                const a = grid[(y0 * gw + x0) * 3 + c] * (1 - tx) + grid[(y0 * gw + x1) * 3 + c] * tx;
                const b = grid[(y1 * gw + x0) * 3 + c] * (1 - tx) + grid[(y1 * gw + x1) * 3 + c] * tx;
                out[o + c] = Math.round(a * (1 - ty) + b * ty);
            }
            out[o + 3] = 255;
        }
    }

    try {
        const enc = jpeg.encode({ data: out, width: ow, height: oh }, 70).data;
        return enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength) as ArrayBuffer;
    } catch {
        return null;
    }
}

/** ממלא-מקום לתמונה שלא ניתן לטשטש (לא JPEG / פגומה): מעבר צבע ניטרלי */
export const BLUR_PLACEHOLDER =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs>' +
    '<rect width="120" height="120" fill="url(#g)"/><circle cx="60" cy="48" r="22" fill="#e2e8f0" opacity=".7"/>' +
    '<ellipse cx="60" cy="112" rx="40" ry="30" fill="#e2e8f0" opacity=".7"/></svg>';
