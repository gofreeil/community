// ============================================================
// indexBusinesses.ts — ייבוא העסקים מאתר האינדקס (index.gofreeil.com).
//
// באתר האינדקס מופיעים רק בעלי עסקים שעמדו בשני תנאים:
//   1. חתמו על תנאי השימוש של האינדקס (ובתוכם אמנת המוסר העולמית).
//   2. התחייבו להנחה בלעדית לחברי תנועת "יוצאים לחירות".
// לכן כל מי שמופיע שם ראוי להופיע גם אצלנו — ומיובא אוטומטית.
//
// למה קריאה-דרך (read-through) ולא שכפול ל-Strapi:
// מקור האמת של האינדקס הוא Google Sheet, לא Strapi. שכפול היה יוצר כפילויות
// ורשומות מיותמות כשעסק יורד מהגיליון. במקום זה אנחנו קוראים את ה-endpoint
// הציבורי שלהם עם cache — הגיליון נשאר מקור האמת, עסק שיורד ממנו נעלם אצלנו
// מיד, ואין לנו נתונים כפולים לתחזק. הם נספרים במונה "פרטים במפה" ובפילוח
// הקטגוריות דרך buildItemsSummary — בלי להיות מאוחסנים אצלנו.
//
// עסק עם כתובת ("מיקום המפעל") מקבל פין על המפה בעיר שנגזרת מהכתובת: אם האינדקס
// כבר החזיר lat/lng — משתמשים בהם; אחרת נפתרים ב-geocoding אצלנו. עסק בלי כתובת
// (ארצי/אונליין) נשאר ברשימה ובלוח בלבד, בלי פין — אך *נספר* ככל פריט אחר.
// ה-geocoding מדורג — כמה כתובות בכל טעינה, עם cache קבוע (ראו getIndexBusinesses).
// ============================================================
import type { DbItem } from '$lib/server/db';
import { geocodeAddressDetailed } from '$lib/server/geocode';
import { citiesData } from '$lib/neighborhoodsData';

/** שמות היישובים המוכרים — כתובת בת מילה אחת תקפה רק אם היא שם יישוב. */
const KNOWN_CITIES = new Set(citiesData.map((c) => c.city));

/** חלק-הכתובת בלבד: תיאור שנדחף אחרי "/" או שורה חדשה נחתך. */
function cleanAddress(addr: string): string {
	return addr.split(/[/\n]/)[0].trim();
}

/**
 * האם הכתובת "מספיק ספציפית" כדי לסמוך על פין שנגזר ממנה: מספר בית, שתי מילים
 * לפחות, או שם יישוב מוכר. מילה גנרית בודדת ("בית", "משרד", "ארה״ב") מייצרת פין
 * שגוי — גם ב-Nominatim אצלנו ("ארה״ב" → באר שבע) וגם ב-geocoding של האינדקס
 * עצמו, שמיקם "בית" ו"משרד" במרכז ירושלים ו"ארה״ב" בבאר שבע. עסק כזה נשאר
 * ברשימה בלבד, בלי פין.
 */
function isSpecificAddress(addr: string): boolean {
	const clean = cleanAddress(addr);
	if (!clean) return false;
	return /\d/.test(clean)
		|| clean.split(/\s+/).filter(Boolean).length >= 2
		|| KNOWN_CITIES.has(clean);
}

const INDEX_URL = 'https://index.gofreeil.com';
const TTL_MS = 15 * 60 * 1000; // ריענון עצל — כמו ה-cache של האינדקס עצמו

/**
 * הקטגוריה שתחתיה הם מוצגים אצלנו: אריח ייעודי "בעלי מקצוע" בסרגל הקטגוריות
 * של המפה (ולא "חנויות ועסקים", שנשארה לחנויות השכונתיות שנרשמו אצלנו).
 * הפרדה זו מאפשרת לסנן את המפה/הרשימה לבעלי המקצוע של האינדקס בלבד.
 * ה-slug נשאר business-owners — מזהה לוגי; התצוגה מתורגמת (map.cat_business_owners).
 */
export const INDEX_CATEGORY = 'business-owners';

// עמודות הגיליון הן נוסח שאלות הטופס — מתאימים לפי תת-מחרוזת, לא לפי טקסט מדויק,
// כדי ששינוי ניסוח קל בטופס לא ישבור את הייבוא.
const COL = {
	name:     'שם העסק',
	contact:  'שם איש קשר',
	phone:    'טלפון',
	location: 'מיקום המפעל',
	unique:   'תוכן ייחודי',
	desc:     'תיאור העסק',
	category: 'קטגוריה',
	discount: 'ההנחה הבלעדית',
	terms:    'אני מקבל על עצמי את תנאי הקהילה',
	area:     'אזור מכירה',
	whatsapp: 'קישור לווצאפ',
	facebook: 'קישור לדף הפייסבוק',
	website:  'קישור לאתר שלך',
	instagram:'קישור לאינסטגרם',
	stamp:    'חותמת זמן',
} as const;

type Row = Record<string, unknown>;

/** מחרוזת מנוקה משדה ישיר של ה-API (או '' אם אינו מחרוזת/ריק). */
function str(v: unknown): string {
	return typeof v === 'string' && v.trim() ? v.trim() : '';
}

/** מספר תקין משדה ישיר של ה-API (או null). */
function num(v: unknown): number | null {
	const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
	return Number.isFinite(n) && n !== 0 ? n : null;
}

/** ערך העמודה הראשונה ששמה מכיל את the-needle. */
function col(row: Row, needle: string): string {
	for (const k of Object.keys(row)) {
		if (k.includes(needle)) {
			const v = row[k];
			if (typeof v === 'string' && v.trim()) return v.trim();
		}
	}
	return '';
}

/** מזהה יציב לעסק — שם + טלפון. לא תלוי במספר השורה בגיליון (שזז). */
function stableId(name: string, phone: string): string {
	const slug = `${name}|${phone}`
		.replace(/\s+/g, '-')
		.replace(/[^\w֐-׿-]/g, '')
		.slice(0, 60);
	return `index-${slug}`;
}

// האינדקס עבר לבאקאנד Strapi ומחזיר היום שדות מפורשים (name/discount/lat/slug...)
// לצד עמודות הגיליון הישנות, שנשמרו לתאימות. מעדיפים תמיד את השדה המפורש ונופלים
// לעמודת הגיליון רק כשהוא חסר — כך הייבוא עובד בשני העולמות.
function mapRow(row: Row): DbItem | null {
	const label    = str(row.name)     || col(row, COL.name);
	const discount = str(row.discount) || col(row, COL.discount);
	const terms    = row.accepted_terms === true || !!col(row, COL.terms);

	// שני התנאים שמזכים הופעה — ללא אחד מהם העסק לא מיובא.
	if (!label || !discount || !terms) return null;

	const phone   = str(row.phone)   || col(row, COL.phone);
	const address = str(row.address) || col(row, COL.location);
	// מזהה העסק באינדקס — יציב לאורך זמן ומאפשר קישור לעמוד העסק שלו שם.
	const slug    = str(row.slug) || str(row.documentId);

	const extra: Record<string, unknown> = {
		source:       'index',
		discount,                       // ההנחה הבלעדית לחברי יוצאים לחירות
		terms_signed: true,             // חתם על התנאים + אמנת המוסר
		area:         str(row.sales_area) || col(row, COL.area),
		biz_type:     str(row.category)   || col(row, COL.category),
		// לחיצה על הכרטיס מובילה לעמוד העסק באינדקס — הפריט לא קיים ב-Strapi שלנו.
		// בלי slug (שורת גיליון ישנה) נופלים לדף הבית של האינדקס.
		external_url: slug ? `${INDEX_URL}/business/${slug}` : `${INDEX_URL}/`,
	};
	if (str(row.subcategory)) extra.biz_subtype = str(row.subcategory);
	for (const [k, needle] of [
		['whatsapp', COL.whatsapp], ['facebook', COL.facebook],
		['website', COL.website], ['instagram', COL.instagram],
	] as const) {
		const v = str(row[k]) || col(row, needle);
		if (v) extra[k] = v;
	}
	const logo = str(row.logo) || str(row.logoFromColumnJ);
	if (logo) extra.logo = logo;

	return {
		// מזהה מהאינדקס כשיש; אחרת שם+טלפון (לא תלוי במספר השורה בגיליון, שזז).
		id:           slug ? `index-${slug}` : stableId(label, phone),
		category:     INDEX_CATEGORY,
		label,
		description:  str(row.unique_content) || str(row.description)
		              || col(row, COL.unique) || col(row, COL.desc),
		contact:      str(row.contact_name) || col(row, COL.contact),
		phone,
		address,
		icon:         '🧑‍💼',
		color:        'green',
		neighborhood: '',
		city:         '',
		// קואורדינטות שהאינדקס עצמו כבר פתר — מתקבלות רק מכתובת ספציפית (ראו
		// isSpecificAddress). חסרות? יושלמו ב-getIndexBusinesses מ-geocoding.
		lat:          isSpecificAddress(address) ? num(row.lat) : null,
		lng:          isSpecificAddress(address) ? num(row.lng) : null,
		extra_fields: JSON.stringify(extra),
		status:       'active',
		user_id:      null,
		created_at:   str(row.created_at) || col(row, COL.stamp),
		view_count:   0,
	};
}

let cache: { at: number; items: DbItem[] } | null = null;

// ---- geocoding של כתובות עסקים → פין על המפה ----
// כתובת → מיקום. נשמר לכל חיי התהליך (שורד את רענון ה-15 דק' של רשימת העסקים),
// כדי שכל כתובת תיפתר פעם אחת בלבד. גם כישלון/כתובת-לא-תקינה נשמר (null) כדי לא
// לנסות שוב-ושוב; אם בעל העסק יתקן את הכתובת באינדקס — זו מחרוזת חדשה, מפתח חדש,
// וניסיון חדש ממילא.
type Geo = { lat: number; lng: number; city: string; neighborhood: string };
const geoCache = new Map<string, Geo | null>();
// כמה כתובות *חדשות* לפתור בכל קריאה. יש ~14 כתובות, ולכן מתכנס תוך כמה טעינות-דף
// בלי להשהות טעינה בודדת יותר מדי. אחרי שכולן ב-cache — עלות אפס.
const GEO_BATCH = 4;

/** פותר עד GEO_BATCH כתובות שעדיין לא נוסו ושומר ל-geoCache (הצלחה או null). */
async function resolveSomeAddresses(addresses: string[]): Promise<void> {
	const todo = [...new Set(addresses)].filter((a) => a && !geoCache.has(a)).slice(0, GEO_BATCH);
	if (!todo.length) return;
	await Promise.all(
		todo.map(async (addr) => {
			// תיאור שנדחף לשדה הכתובת אחרי "/" או שורה חדשה — משאירים את חלק הכתובת
			// בלבד, אחרת Nominatim לא מזהה ("רמת גן /מכשור לשימוש ביתי" → "רמת גן").
			// רק כתובת "מספיק ספציפית" עוברת geocoding (ראו isSpecificAddress).
			geoCache.set(
				addr,
				isSpecificAddress(addr)
					? await geocodeAddressDetailed(`${cleanAddress(addr)}, ישראל`)
					: null,
			);
		}),
	);
}

/** מצמיד קואורדינטות+עיר שנפתרו (מ-geoCache) לכל עסק שיש לו כתובת. */
function withCoords(items: DbItem[]): DbItem[] {
	return items.map((it) => {
		const geo = it.address ? geoCache.get(it.address) : undefined;
		if (!geo) return it;
		// שכונה לא נקבעת בכוונה — כדי שהעסק יופיע במפת כל שכונות העיר שלו,
		// ולא ייפסל בגלל אי-התאמת-שם-שכונה מול הבורר.
		// קואורדינטות שהאינדקס עצמו סיפק מדויקות יותר מ-Nominatim ולכן גוברות;
		// ה-geocoding משמש להשלמת חסר ולגזירת העיר (שהאינדקס לא מחזיר).
		return {
			...it,
			lat:  it.lat ?? geo.lat,
			lng:  it.lng ?? geo.lng,
			city: geo.city || it.city,
		};
	});
}

/**
 * העסקים המאושרים מאתר האינדקס, כפריטים בצורת DbItem.
 * עסק עם כתובת מקבל פין על המפה: ה-geocoding מדורג (כמה כתובות בכל קריאה, cache
 * קבוע), והצמדת הקואורדינטות נעשית בכל קריאה מ-geoCache — כך הפין מופיע ברגע
 * שהכתובת נפתרה, בלי להשהות טעינת דף בודדת.
 * נכשל ברכות: תקלה באינדקס לא מפילה את דף הבית — פשוט מחזיר את ה-cache הישן
 * (או רשימה ריקה), כי אלו נתוני-בונוס ולא ליבת האתר.
 */
export async function getIndexBusinesses(): Promise<DbItem[]> {
	if (cache && Date.now() - cache.at < TTL_MS) {
		await resolveSomeAddresses(cache.items.map((i) => i.address));
		return withCoords(cache.items);
	}
	try {
		const res = await fetch(`${INDEX_URL}/api/businesses`, {
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) throw new Error(`index → ${res.status}`);
		const rows = await res.json();
		if (!Array.isArray(rows)) throw new Error('index: תשובה לא צפויה');

		const items = rows.map(mapRow).filter((x): x is DbItem => x !== null);
		cache = { at: Date.now(), items };
		await resolveSomeAddresses(items.map((i) => i.address));
		return withCoords(items);
	} catch (e) {
		console.warn('[indexBusinesses] שליפה נכשלה:', e instanceof Error ? e.message : e);
		return withCoords(cache?.items ?? []);
	}
}
