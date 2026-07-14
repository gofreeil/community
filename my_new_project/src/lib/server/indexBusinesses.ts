// ============================================================
// indexBusinesses.ts — ייבוא העסקים מאתר האינדקס (index.gofreeil.com).
//
// באתר האינדקס מופיעים רק בעלי עסקים שעמדו בשני תנאים:
//   1. חתמו על תנאי השימוש של האינדקס (ובתוכם אמנת המוסר העולמית).
//   2. התחייבו להנחה בלעדית לחברי תנועת "יוצאים לחירות".
// לכן כל מי שמופיע שם ראוי להופיע גם אצלנו — ומיובא אוטומטית.
//
// למה קריאה-דרך (read-through) ולא שכפול ל-Strapi:
// מקור האמת של האינדקס הוא Google Sheet, לא Strapi. שכפול היה יוצר כפילויות,
// רשומות מיותמות כשעסק יורד מהגיליון, וניפוח של מונה "פרטים במפה". במקום זה
// אנחנו קוראים את ה-endpoint הציבורי שלהם עם cache — הגיליון נשאר מקור האמת,
// עסק שיורד ממנו נעלם אצלנו מיד, ואין לנו נתונים כפולים לתחזק.
//
// לרוב העסקים אין כתובת (הם ארציים/אונליין) ולכן אין להם lat/lng — הם מופיעים
// ברשימה ובלוח, לא כפינים על המפה. זה מכוון.
// ============================================================
import type { DbItem } from '$lib/server/db';

const INDEX_URL = 'https://index.gofreeil.com';
const TTL_MS = 15 * 60 * 1000; // ריענון עצל — כמו ה-cache של האינדקס עצמו

/** הקטגוריה שתחתיה הם מוצגים אצלנו: "חנויות ועסקים". */
export const INDEX_CATEGORY = 'shops';

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

function mapRow(row: Row): DbItem | null {
	const label    = col(row, COL.name);
	const discount = col(row, COL.discount);
	const terms    = col(row, COL.terms);

	// שני התנאים שמזכים הופעה — ללא אחד מהם העסק לא מיובא.
	if (!label || !discount || !terms) return null;

	const phone   = col(row, COL.phone);
	const address = col(row, COL.location);

	const extra: Record<string, unknown> = {
		source:       'index',
		discount,                       // ההנחה הבלעדית לחברי יוצאים לחירות
		terms_signed: true,             // חתם על התנאים + אמנת המוסר
		area:         col(row, COL.area),
		biz_type:     col(row, COL.category),
		// לחיצה על הכרטיס מובילה לאתר האינדקס — הפריט לא קיים ב-Strapi שלנו
		external_url: `${INDEX_URL}/`,
	};
	for (const [k, needle] of [
		['whatsapp', COL.whatsapp], ['facebook', COL.facebook],
		['website', COL.website], ['instagram', COL.instagram],
	] as const) {
		const v = col(row, needle);
		if (v) extra[k] = v;
	}
	const logo = typeof row.logoFromColumnJ === 'string' ? row.logoFromColumnJ.trim() : '';
	if (logo) extra.logo = logo;

	return {
		id:           stableId(label, phone),
		category:     INDEX_CATEGORY,
		label,
		description:  col(row, COL.unique) || col(row, COL.desc),
		contact:      col(row, COL.contact),
		phone,
		address,
		icon:         '🏪',
		color:        'green',
		neighborhood: '',
		city:         '',
		lat:          null,   // ארציים/אונליין — אין פין על המפה
		lng:          null,
		extra_fields: JSON.stringify(extra),
		status:       'active',
		user_id:      null,
		created_at:   col(row, COL.stamp),
		view_count:   0,
	};
}

let cache: { at: number; items: DbItem[] } | null = null;

/**
 * העסקים המאושרים מאתר האינדקס, כפריטים בצורת DbItem.
 * נכשל ברכות: תקלה באינדקס לא מפילה את דף הבית — פשוט מחזיר את ה-cache הישן
 * (או רשימה ריקה), כי אלו נתוני-בונוס ולא ליבת האתר.
 */
export async function getIndexBusinesses(): Promise<DbItem[]> {
	if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
	try {
		const res = await fetch(`${INDEX_URL}/api/businesses`, {
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) throw new Error(`index → ${res.status}`);
		const rows = await res.json();
		if (!Array.isArray(rows)) throw new Error('index: תשובה לא צפויה');

		const items = rows.map(mapRow).filter((x): x is DbItem => x !== null);
		cache = { at: Date.now(), items };
		return items;
	} catch (e) {
		console.warn('[indexBusinesses] שליפה נכשלה:', e instanceof Error ? e.message : e);
		return cache?.items ?? [];
	}
}
