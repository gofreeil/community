import { json, error } from '@sveltejs/kit';
import { AUTH_TOKEN, STRAPI_URL } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return error(401, 'Not authenticated');

		const { receiverId, content } = await request.json();
		if (!receiverId || !content) return error(400, 'Missing fields');

		const res = await fetch(`${STRAPI_URL}/api/messages`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${AUTH_TOKEN}`,
			},
			body: JSON.stringify({
				data: {
					sender: session.user.id,
					receiver: receiverId,
					content,
					read: false,
				},
			}),
		});

		if (!res.ok) {
			console.error('Strapi error:', await res.text());
			return error(500, 'Failed to send message');
		}

		const data = await res.json();
		return json({ success: true, id: data.data.id });
	} catch (e) {
		console.error('Error:', e);
		return error(500, 'Server error');
	}
};

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return error(401, 'Not authenticated');

		const userId = session.user.id;
		const res = await fetch(
			`${STRAPI_URL}/api/messages?filters[receiver][id][$eq]=${userId}&populate=*&sort=createdAt:desc`,
			{
				headers: {
					'Authorization': `Bearer ${AUTH_TOKEN}`,
				},
			}
		);

		if (!res.ok) return error(500, 'Failed to fetch messages');

		const data = await res.json();
		return json(data.data || []);
	} catch (e) {
		console.error('Error:', e);
		return error(500, 'Server error');
	}
};
