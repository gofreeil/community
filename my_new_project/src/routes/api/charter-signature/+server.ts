import { json, type RequestHandler } from '@sveltejs/kit';
import { strapiPost, StrapiContentTypeError } from '$lib/server/strapiClient';
import fs from 'node:fs/promises';
import path from 'node:path';

// fallback רק כשה-Strapi לא זמין. append-only (JSONL) במקום read-modify-write של כל
// המערך: O(1) לכל כתיבה במקום O(n²), ובלי לקרוא קובץ ענק לזיכרון. גבול קשיח על גודל
// הקובץ מונע מילוי דיסק תחת הצפה (הגנה על השרת).
const FALLBACK_FILE = path.resolve('data', 'charter-signatures.jsonl');
const MAX_FALLBACK_BYTES = 20 * 1024 * 1024; // 20MB

async function appendToFile(entry: Record<string, unknown>) {
	await fs.mkdir(path.dirname(FALLBACK_FILE), { recursive: true });
	const st = await fs.stat(FALLBACK_FILE).catch(() => null);
	if (st && st.size > MAX_FALLBACK_BYTES) {
		console.error('[charter-signature] fallback file at size cap - dropping entry');
		return;
	}
	await fs.appendFile(FALLBACK_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { fullName, idNumber, birthDate, signature, signedAt } = body ?? {};

		if (!fullName || !idNumber || !birthDate || !signature) {
			return json({ success: false, message: 'חסרים שדות חובה' }, { status: 400 });
		}

		// חתימה = data URL מצוירת (בד"כ < 100KB). דוחים ענק כדי לא לנפח אחסון/DB.
		if (String(signature).length > 800_000) {
			return json({ success: false, message: 'החתימה גדולה מדי' }, { status: 413 });
		}

		// תקרות אורך על שדות הטקסט - חוסמות payload מנופח
		const entry = {
			fullName: String(fullName).trim().slice(0, 120),
			idNumber: String(idNumber).trim().slice(0, 32),
			birthDate: String(birthDate).slice(0, 40),
			signature: String(signature).trim(),
			signedAt: (typeof signedAt === 'string' ? signedAt : '').slice(0, 40) || new Date().toISOString()
		};

		try {
			await strapiPost('/api/charter-signatures', {
				data: { ...entry, publishedAt: new Date().toISOString() }
			});
		} catch (err) {
			if (err instanceof StrapiContentTypeError) {
				await appendToFile(entry);
			} else {
				await appendToFile(entry);
				console.error('[charter-signature] strapi failed, saved locally', err);
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error('[charter-signature]', err);
		return json({ success: false, message: 'שגיאת שרת' }, { status: 500 });
	}
};
