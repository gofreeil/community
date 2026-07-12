// המרת כתובת/שכונה לקואורדינטות (lat/lng) בצד השרת.
//
// למה: מונה "על המפה" והמפה עצמה צריכים lat/lng *שמורים* על הפריט. עד היום
// הקואורדינטות הגיעו רק מפין שהמשתמש גרר על המפה, אבל חלק מהקטגוריות (למשל
// "מרחב מוגן") כוללות רק שדה כתובת טקסט בלי פין - ולכן הפריט נשמר בלי קואורדינטות
// ולא הופיע על המפה. כאן אנחנו גוזרים קואורדינטות מהכתובת, ואם אין - ממרכז השכונה/עיר.

import { getCoordsFor } from '$lib/neighborhoodCoords';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

// reverse geocoding: קואורדינטות (מ-GPS של הנייד) → כתובת קריאה בעברית.
// משמש בטופס קריאת המצוקה - התושב "לוקח" את מיקומו מה-GPS ואנחנו ממלאים
// עבורו כתובת ברורה (רחוב + שכונה + עיר) בלי שיצטרך להקליד דבר.
// best-effort: מחזיר '' אם נכשל/אין תוצאה - הפין לבדו עדיין תקף כמיקום.
export async function reverseGeocodeParts(
    lat: number,
    lng: number,
): Promise<{ address: string; neighborhood: string; city: string }> {
    const empty = { address: '', neighborhood: '', city: '' };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return empty;
    try {
        const url = new URL(NOMINATIM_REVERSE);
        url.searchParams.set('lat', String(lat));
        url.searchParams.set('lon', String(lng));
        url.searchParams.set('format', 'json');
        url.searchParams.set('zoom', '18');           // רמת רחוב/בית
        url.searchParams.set('accept-language', 'he');

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'gofreeil-community/1.0 (https://community.gofreeil.com)',
            },
            signal: ctrl.signal,
        }).finally(() => clearTimeout(timer));

        if (!res.ok) return empty;
        const data = (await res.json()) as {
            display_name?: string;
            address?: Record<string, string>;
        };
        const a = data.address ?? {};
        // שם השכונה (לפי הזמינות ב-OSM): שכונה → פרבר → רובע → רובע-עיר → אזור מגורים
        const neighborhood = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.residential || '';
        const town   = a.city || a.town || a.village || a.municipality || '';
        // בונים כתובת תמציתית: רחוב+מספר, שכונה, עיר - במקום ה-display_name הארוך
        const street = [a.road, a.house_number].filter(Boolean).join(' ');
        const concise = [street, neighborhood, town].filter(Boolean).join(', ');
        return { address: concise || (data.display_name ?? ''), neighborhood, city: town };
    } catch {
        return empty;
    }
}

// תאימות לאחור: מחזיר רק את הכתובת התמציתית (משמש את קליטת ה-GPS בטופס המצוקה).
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    return (await reverseGeocodeParts(lat, lng)).address;
}

// geocoding חיצוני של כתובת חופשית דרך OpenStreetMap (Nominatim).
// best-effort: מחזיר null אם נכשל/אין תוצאה, והקורא נופל למרכז השכונה.
// exported גם עבור /api/geocode - תצוגה מקדימה של הפין בזמן מילוי הטופס.
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const url = new URL(NOMINATIM);
        url.searchParams.set('q', query);
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '1');
        url.searchParams.set('countrycodes', 'il');
        url.searchParams.set('accept-language', 'he');

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(url, {
            headers: {
                // מדיניות Nominatim מחייבת User-Agent שמזהה את האפליקציה
                'User-Agent': 'gofreeil-community/1.0 (https://community.gofreeil.com)',
            },
            signal: ctrl.signal,
        }).finally(() => clearTimeout(timer));

        if (!res.ok) return null;
        const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (!Array.isArray(arr) || arr.length === 0) return null;
        const lat = Number(arr[0].lat);
        const lng = Number(arr[0].lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
    } catch {
        return null;
    }
}

/**
 * מבטיח קואורדינטות לפריט לפי סדר עדיפויות:
 *   1. פין מפורש שהמשתמש סימן (lat/lng שהגיעו מהטופס)
 *   2. geocoding של הכתובת החופשית (מדויק לרחוב/מספר)
 *   3. מרכז השכונה/העיר (getCoordsFor) - גיבוי שתמיד קיים כשיש שכונה/עיר
 * מחזיר {lat:null,lng:null} רק אם באמת אין שום מידע מיקום.
 */
export async function resolveItemCoords(input: {
    lat?: number | null;
    lng?: number | null;
    address?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    /**
     * רמת שכונה בלבד: לא מבצעים geocoding של הכתובת המדויקת אלא נופלים ישר
     * למרכז השכונה/עיר. משמש בקטגוריות רגישות לפרטיות (פנויים/פנויות) - עדיין
     * מקבלים נקודה כדי להיספר כפריט בשכונה, בלי לחשוף כתובת מדויקת.
     */
    neighborhoodOnly?: boolean;
}): Promise<{ lat: number | null; lng: number | null }> {
    // 1. פין מפורש - מכבדים אותו כמו שהוא
    if (Number.isFinite(Number(input.lat)) && Number.isFinite(Number(input.lng))) {
        return { lat: Number(input.lat), lng: Number(input.lng) };
    }

    const address = (input.address ?? '').trim();
    const city = (input.city ?? '').trim();
    const neighborhood = (input.neighborhood ?? '').trim();

    // 2. geocoding של הכתובת (מוסיפים עיר + "ישראל" לדיוק) -
    //    מדלגים בקטגוריות רגישות לפרטיות כדי לא לחשוף מיקום מדויק.
    if (address && !input.neighborhoodOnly) {
        const query = [address, city, 'ישראל'].filter(Boolean).join(', ');
        const hit = await geocodeAddress(query);
        if (hit) return hit;
    }

    // 3. גיבוי: מרכז השכונה/העיר. getCoordsFor נופל לירושלים כברירת מחדל,
    //    ולכן משתמשים בו רק כשבאמת יש שכונה או עיר.
    //    לקטגוריות פרטיות (neighborhoodOnly, כמו פנויים) לא מקבעים את המרכז
    //    בתוך הפריט - משאירים lat/lng ריקים כדי שהמפה תגזור את המיקום מ-getCoordsFor
    //    החי בזמן רינדור (+jitter). כך תיקוני קואורדינטות עתידיים חלים על פריטים
    //    קיימים, והם לא נערמים בדיוק על אותה נקודה.
    if ((neighborhood || city) && !input.neighborhoodOnly) {
        const [lat, lng] = getCoordsFor(neighborhood || undefined, city || undefined);
        return { lat, lng };
    }

    return { lat: null, lng: null };
}
