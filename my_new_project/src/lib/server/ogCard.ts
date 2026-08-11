// עזרים משותפים לייצור תמונות Open Graph בעזרת @vercel/og (satori).
import { readFileSync } from 'fs';
import { join } from 'path';

const HEBREW_RX = /[֐-׿]/;

/**
 * satori (@vercel/og) לא מיישם bidi — טקסט עברי מצויר בסדר לוגי ולכן יוצא הפוך
 * ("הנוכשב הליהק"). התיקון: היפוך ידני — הופכים את סדר המילים, והופכים אותיות
 * רק במילים עבריות (מספרים ולטינית נשארים כמו שהם).
 * עובד לשורה בודדת בלבד — לא לטקסט שעוטף שורות.
 */
export function satoriRtl(text: string): string {
	return text
		.split(' ')
		.map((w) => (HEBREW_RX.test(w) ? [...w].reverse().join('') : w))
		.reverse()
		.join(' ');
}

/** הלוגו כ-data URL (בקריאת קובץ מקומית), עם נפילה חזרה ל-URL ציבורי בפרודקשן */
export function loadLogoBase64(): string {
	try {
		const logoPath = join(process.cwd(), 'static', 'images', 'community-logo1.png');
		return `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
	} catch {
		return 'https://community.gofreeil.com/images/community-logo1.png';
	}
}
