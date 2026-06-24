import { json, error } from '@sveltekit/server';
import { AUTH_TOKEN, STRAPI_URL } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return error(401, 'Not authenticated');

		const { user2Id, message } = await request.json();
		if (!user2Id) return error(400, 'Missing fields');

		const res = await fetch(`${STRAPI_URL}/api/card-exchanges`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${AUTH_TOKEN}`,
			},
			body: JSON.stringify({
				data: {
					user1: session.user.id,
					user2: user2Id,
					message: message || '',
					status: 'pending',
				},
			}),
		});

		if (!res.ok) {
			console.error('Strapi error:', await res.text());
			return error(500, 'Failed to create exchange');
		}

		const data = await res.json();
		return json({ success: true, id: data.data.id });
	} catch (e) {
		console.error('Error:', e);
		return error(500, 'Server error');
	}
};
