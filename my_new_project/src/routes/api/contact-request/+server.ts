import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// process.env (לא $env/static/private) כדי שהבנייה לא תיכשל כשהמשתנה חסר בזמן build
const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? '';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return error(401, 'Not authenticated');

		const { receiverId, message } = await request.json();
		if (!receiverId || !message) return error(400, 'Missing fields');

		const res = await fetch(`${STRAPI_URL}/api/contact-requests`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${STRAPI_TOKEN}`,
			},
			body: JSON.stringify({
				data: {
					requester: session.user.id,
					receiver: receiverId,
					message,
					status: 'pending',
				},
			}),
		});

		if (!res.ok) {
			console.error('Strapi error:', await res.text());
			return error(500, 'Failed to create request');
		}

		const data = await res.json();
		return json({ success: true, id: data.data.id });
	} catch (e) {
		console.error('Error:', e);
		return error(500, 'Server error');
	}
};
