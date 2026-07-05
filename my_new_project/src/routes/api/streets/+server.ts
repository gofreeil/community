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
        if (!data?.success || !Array.isArray(records) || records.length === 0) return null;

        const seen = new Set<string>();
        for (const r of records) {
            const name = String(r['שם_רחוב'] ?? '').trim();
            // סמל_רחוב 9000 הוא "רחוב" ששמו כשם הישוב עצמו - לא רחוב אמיתי
            if (!name || name === officialCity.trim()) continue;
            seen.add(name);
        }
        return [...seen].sort(collator.compare);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchStreetsFor(city: string): Promise<string[]> {
    // כל וריאנט נבדק עם רווח נגרר (הפורמט של המאגר) ואז בלעדיו - ליתר ביטחון
    const variants = [city, ...(CITY_ALIASES[city] ?? [])];
    for (const v of variants) {
        for (const candidate of [`${v} `, v]) {
            const streets = await govFetchStreets(candidate);
            if (streets && streets.length > 0) return streets;
        }
    }
    return [];
}

export const GET: RequestHandler = async ({ url, setHeaders }) => {
    const city = (url.searchParams.get('city') ?? '').trim();
    if (!city) return json({ streets: [] });

    // רשימת רחובות של עיר כמעט לא משתנה - cache נדיב בזיכרון + בדפדפן/CDN
    let streets: string[] = [];
    try {
        streets = await cached(`streets:${city}`, 24 * 60 * 60 * 1000, () => fetchStreetsFor(city));
    } catch {
        streets = [];
    }

    setHeaders({ 'cache-control': 'public, max-age=86400' });
    return json({ streets });
};
