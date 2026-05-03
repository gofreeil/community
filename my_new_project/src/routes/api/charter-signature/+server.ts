import { json, type RequestHandler } from '@sveltejs/kit';
import { strapiPost, StrapiContentTypeError } from '$lib/server/strapiClient';
import fs from 'node:fs/promises';
import path from 'node:path';

const FALLBACK_FILE = path.resolve('data', 'charter-signatures.json');

async function appendToFile(entry: Record<string, unknown>) {
	await fs.mkdir(path.dirname(FALLBACK_FILE), { recursive: true });
	let arr: unknown[] = [];
	try {
		const raw = await fs.readFile(FALLBACK_FILE, 'utf-8');
		arr = JSON.parse(raw);
		if (!Array.isArray(arr)) arr = [];
	} catch {
		arr = [];
	}
	arr.push(entry);
	await fs.writeFile(FALLBACK_FILE, JSON.stringify(arr, null, 2), 'utf-8');
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { fullName, idNumber, birthDate, signature, signedAt } = body ?? {};

		if (!fullName || !idNumber || !birthDate || !signature) {
			return json({ success: false, message: 'חסרים שדות חובה' }, { status: 400 });
		}

		const entry = {
			fullName: String(fullName).trim(),
			idNumber: String(idNumber).trim(),
			birthDate: String(birthDate),
			signature: String(signature).trim(),
			signedAt: signedAt || new Date().toISOString()
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
