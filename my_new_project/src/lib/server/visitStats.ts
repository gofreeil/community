// ============================================================
// visitStats.ts - ספירת כניסות חודשית לאתר
//
// כל כניסה (session חדש בדפדפן) שולחת beacon ל-/api/track-visit,
// שמעלה ב-1 את מונה החודש הנוכחי ב-Strapi (content-type: visit-stat).
// הקריאה לתצוגה עוברת דרך cached() עם TTL של יממה - הספירה המוצגת
// מתעדכנת פעם ביום, כפי שהוגדר.
// ============================================================

import { strapiGet, strapiPost } from './strapiClient';
import { cached } from './cache';

export interface VisitStat {
    month: string; // "YYYY-MM"
    count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// היסט תצוגה: הספירה המוצגת באתר גבוהה תמיד ב-2 מהספירה האמיתית שנשמרת ב-Strapi
// (בקשת המשתמש, 1.9.2026 - "עד הודעה חדשה"). לביטול: להחזיר ל-0.
// ההיסט מוחל רק בקריאה לתצוגה - הנתונים השמורים נשארים אמיתיים.
const DISPLAY_OFFSET = 2;

interface StrapiListResponse {
    data?: Array<{ month?: string; count?: number }>;
}

/** רישום כניסה אחת למונה של החודש הנוכחי (החודש נקבע בבאקאנד לפי שעון ישראל) */
export async function trackVisit(): Promise<void> {
    await strapiPost('/api/visit-stats/track', {});
}

/** כל היסטוריית הכניסות החודשית, ממוינת מהחדש לישן. מתרענן פעם ביממה. */
export async function getVisitStats(): Promise<VisitStat[]> {
    const raw = await cached('visitStats:all', DAY_MS, async () => {
        const res = await strapiGet<StrapiListResponse>('/api/visit-stats', {
            'sort': 'month:desc',
            'pagination[pageSize]': '500',
        });
        return (res.data ?? [])
            .filter((s) => typeof s.month === 'string')
            .map((s) => ({ month: s.month as string, count: s.count ?? 0 }));
    });
    // ה-cache שומר את המספרים האמיתיים; ההיסט מוחל על עותק חדש בכל קריאה
    return raw.map((s) => ({ ...s, count: s.count + DISPLAY_OFFSET }));
}

/** מספר הכניסות בחודש הנוכחי (לפי שעון ישראל). גם בלי רשומה עדיין מוחל ההיסט. */
export async function getVisitsThisMonth(): Promise<number> {
    const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }).slice(0, 7);
    const stats = await getVisitStats();
    return stats.find((s) => s.month === month)?.count ?? DISPLAY_OFFSET;
}
