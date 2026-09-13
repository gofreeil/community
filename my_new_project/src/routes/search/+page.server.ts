import type { PageServerLoad } from './$types';
import { getAllItems, type DbItem } from '$lib/server/db';
import { isPrivateCategory } from '$lib/itemCategories';
import { heSearch, looksLatin } from '$lib/search';
import { itemSearchFields } from '$lib/searchFields';
import { getNearbyCities } from '$lib/data/nearbyCities';

/** תקרת התוצאות - כמו ה-pagination[limit] של החיפוש הקודם מול Strapi. */
const SEARCH_LIMIT = 500;

/** הבעלים ביקש (extra_fields.hide_address) לא לפרסם את הכתובת - דף הפריט
 *  מסתיר אותה מהציבור, וגם החיפוש הציבורי לא מחפש בה (ולא מהדהד אותה בהצעת
 *  "מציג תוצאות עבור" מתוך אוצר המילים). החיפוש ציבורי, לכן בלי חריג לרכז. */
function withoutHiddenAddress(item: DbItem): DbItem {
    if (!item.address || !item.extra_fields) return item;
    let hide = false;
    try {
        const ef = JSON.parse(item.extra_fields);
        hide = ef?.hide_address === true || ef?.hide_address === 'true';
    } catch {}
    return hide ? { ...item, address: '' } : item;
}

export const load: PageServerLoad = async ({ url, locals }) => {
    const query = url.searchParams.get('q')?.trim() ?? '';
    // exact=1 - המשתמש לחץ על "לחפש במקום זאת את <המקורי>" ורוצה את השאילתה
    // המילולית, בלי שהתיקון האוטומטי יחליף אותה שוב
    const exact = url.searchParams.get('exact') === '1';
    const session = await locals.auth();
    const user = (session?.user as any) ?? null;
    const userCity         = user?.city         ?? '';
    const userNeighborhood = user?.neighborhood ?? '';

    if (!query) {
        return {
            query,
            effectiveQuery: query,
            correctedQuery: null as string | null,
            usedCorrection: false,
            suggestion: null as string | null,
            wrongLayout: false,
            results: { neighborhood: [] as DbItem[], city: [] as DbItem[], nearby: [] as DbItem[], other: [] as DbItem[] },
            userCity,
            userNeighborhood,
            nearbyCities: [] as string[],
        };
    }

    // חיפוש סלחני בזיכרון על כל הפריטים (cache), במקום $containsi מול Strapi -
    // כך נתפסים גם כתיב מלא/חסר, פריסת מקלדת הפוכה וטעויות הקלדה.
    // חיפוש הוא ציבורי - רשומות פרטיות (הודעות, משוב, בקשות, משאלות) לא
    // נחשפות בו, אחרת חיפוש שם של אדם היה מציג הודעות פרטיות עליו
    const all = (await getAllItems()).filter((i) => !isPrivateCategory(i.category)).map(withoutHiddenAddress);

    let res = heSearch(query, all, itemSearchFields, { limit: SEARCH_LIMIT });
    if (exact && res.usedCorrection) {
        // ריצה חוזרת בלי אוצר מילים - כך אין הצעה אפשרית והתוצאות הן של השאילתה
        // המילולית (fuzzy בלבד). ההצעה מהריצה הראשונה נשמרת כ"האם התכוונת ל..."
        // כדי שתהיה דרך חזרה לתוצאות המתוקנות.
        const literal = heSearch(query, all, itemSearchFields, { limit: SEARCH_LIMIT, vocabulary: new Map() });
        res = { ...literal, correctedQuery: res.correctedQuery, suggestion: res.suggestion };
    }

    // השאילתה שהתוצאות באמת שייכות לה (המתוקנת כשהתיקון הופעל)
    const effectiveQuery = res.usedCorrection && res.correctedQuery ? res.correctedQuery : query;
    // רמז "הוקלד בפריסה אנגלית": השאילתה לטינית וההצעה עברית
    const wrongLayout = !!res.correctedQuery && looksLatin(query) && !looksLatin(res.correctedQuery);

    const nearbyCities = getNearbyCities(userCity);

    // הקיבוץ שומר על סדר הדירוג של heSearch בתוך כל קבוצה
    const neighborhood: DbItem[] = [];
    const city:         DbItem[] = [];
    const nearby:       DbItem[] = [];
    const other:        DbItem[] = [];

    for (const item of res.hits) {
        if (userNeighborhood && item.neighborhood === userNeighborhood && item.city === userCity) {
            neighborhood.push(item);
        } else if (userCity && item.city === userCity) {
            city.push(item);
        } else if (nearbyCities.includes(item.city)) {
            nearby.push(item);
        } else {
            other.push(item);
        }
    }

    return {
        query,
        effectiveQuery,
        correctedQuery: res.correctedQuery,
        usedCorrection: res.usedCorrection,
        suggestion: res.suggestion,
        wrongLayout,
        results: { neighborhood, city, nearby, other },
        userCity,
        userNeighborhood,
        nearbyCities,
    };
};
