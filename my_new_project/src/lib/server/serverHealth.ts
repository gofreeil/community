// ============================================================
// serverHealth.ts - שליפת מדדי בריאות/עומס של שרת ה-VPS (הבאקאנד)
//
// הבאקאנד חושף GET /api/server-health עם מדדי מערכת חיים (מעבד/זיכרון/
// דיסק/זמן-תגובה). כאן שולפים אותם עם TTL קצר כך שלוח המכוונים בלוח האדמין
// יהיה כמעט בזמן-אמת, אך בלי להציף את השרת ברענונים תכופים.
// ============================================================

import { strapiGet } from './strapiClient';
import { cached } from './cache';
import type { ServerHealth } from '$lib/serverHealthTypes';

export type { ServerHealth } from '$lib/serverHealthTypes';

const TTL_MS = 10_000; // 10 שניות - מדדי חיים, אך מונע הצפת השרת

/** מדדי בריאות השרת. מחזיר null אם הבאקאנד לא זמין / הנתיב עוד לא פרוס. */
export async function getServerHealth(): Promise<ServerHealth | null> {
    try {
        return await cached('serverHealth', TTL_MS, () => strapiGet<ServerHealth>('/api/server-health'));
    } catch (e) {
        console.warn('[serverHealth] failed:', e);
        return null;
    }
}
