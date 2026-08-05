import { json } from '@sveltejs/kit';
import { cached } from '$lib/server/cache';
import type { RequestHandler } from './$types';

// ============================================================
// GET /api/streets?city=<שם עיר>
//
// רשימת הרחובות הרשמית של עיר, מתוך מאגר הרחובות הממשלתי (data.gov.il).
// משרת את בורר הרחובות בטפסי הפרסום - כדי שכולם יבחרו את אותו שם רחוב
// מרשימה אחידה במקום שכל אחד יקליד איות שונה.
//
// גוצ'ות של המאגר הממשלתי (נבדקו מול ה-API בפועל):
//   - שמות השדות בעברית: שם_ישוב / שם_רחוב
//   - ערכי שם_ישוב מסתיימים ברווח נגרר ("ירושלים ")
//   - חלק מהערים בשם רשמי שונה משלנו (תל אביב - יפו, נוף הגליל)
// ============================================================

const RESOURCE_ID = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b';
const GOV_API = 'https://data.gov.il/api/3/action/datastore_search';

// שם אצלנו → שם רשמי במאגר הממשלתי (רק היכן שהם באמת שונים)
const CITY_ALIASES: Record<string, string[]> = {
    'תל אביב':     ['תל אביב - יפו'],
    'נצרת עילית': ['נוף הגליל'],
};

const collator = new Intl.Collator('he');

// תוצאת פנייה למאגר: reachable=false פירושו "לא הצלחנו לברר" (תקלת רשת /
// timeout / תשובה לא תקינה) - להבדיל מ"בירינו, ולישוב הזה אין רחובות במאגר".
// ההבחנה קריטית: הטפסים הופכים את הפין על המפה לחובה כשאין רשימת רחובות,
// ותקלה רגעית שנחשבת בטעות ל"אין רחובות" חוסמת פרסום ליישוב שלם.
interface StreetsResult {
    streets: string[];
    reachable: boolean;
}

async function govFetchStreets(officialCity: string): Promise<string[] | null> {
    const url = new URL(GOV_API);
    url.searchParams.set('resource_id', RESOURCE_ID);
    url.searchParams.set('limit', '32000');
    url.searchParams.set('filters', JSON.stringify({ 'שם_ישוב': officialCity }));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return null;
        const data = (await res.json()) as {
            success?: boolean;
            result?: { records?: Array<Record<string, unknown>> };
        };
        const records = data?.result?.records;
        if (!data?.success || !Array.isArray(records)) return null;

        const seen = new Set<string>();
        for (const r of records) {
            const name = String(r['שם_רחוב'] ?? '').trim();
            // סמל_רחוב 9000 הוא "רחוב" ששמו כשם הישוב עצמו - לא רחוב אמיתי
            if (!name || name === officialCity.trim()) continue;
            seen.add(name);
        }
        // מערך (גם ריק) = המאגר ענה. null = לא הצלחנו לברר.
        return [...seen].sort(collator.compare);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchStreetsFor(city: string): Promise<StreetsResult> {
    // כל וריאנט נבדק עם רווח נגרר (הפורמט של המאגר) ואז בלעדיו - ליתר ביטחון
    const variants = [city, ...(CITY_ALIASES[city] ?? [])];
    let reachable = false;
    for (const v of variants) {
        for (const candidate of [`${v} `, v]) {
            const streets = await govFetchStreets(candidate);
            if (streets === null) continue;
            reachable = true;
            if (streets.length > 0) return { streets, reachable: true };
        }
    }
    return { streets: [], reachable };
}

const DAY_MS  = 24 * 60 * 60 * 1000;
const FAIL_MS = 5 * 60 * 1000;

export const GET: RequestHandler = async ({ url, setHeaders }) => {
    const city = (url.searchParams.get('city') ?? '').trim();
    if (!city) return json({ streets: [], unavailable: false });

    // רשימת רחובות של עיר כמעט לא משתנה - cache נדיב בזיכרון + בדפדפן/CDN.
    // תשובת-כשל נשמרת ל-5 דקות בלבד: אחרת בליפ יחיד של data.gov.il היה
    // מסמן יישוב שלם כ"בלי רשימת רחובות" ליממה שלמה.
    let result: StreetsResult = { streets: [], reachable: false };
    try {
        result = await cached(
            `streets:${city}`,
            DAY_MS,
            () => fetchStreetsFor(city),
            (r) => (r.reachable ? DAY_MS : FAIL_MS),
        );
    } catch {
        result = { streets: [], reachable: false };
    }

    setHeaders({ 'cache-control': result.reachable ? 'public, max-age=86400' : 'no-store' });
    return json({ streets: result.streets, unavailable: !result.reachable });
};
