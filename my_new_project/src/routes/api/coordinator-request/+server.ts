import { json, type RequestHandler } from '@sveltejs/kit';
import { strapiPost } from '$lib/server/strapiClient';

export const POST: RequestHandler = async ({ request, locals }) => {
    const session = await locals.auth?.();
    if (!session?.user?.id) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await request.json();
        const { name, phone, neighborhoods, experience, motivation } = data;

        if (!name || !phone || !neighborhoods || neighborhoods.length === 0) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // שמור בקשה ב-Strapi
        await strapiPost('/api/coordinator-requests', {
            data: {
                user_id: session.user.id,
                name,
                phone,
                neighborhoods: neighborhoods.join(','),
                experience: experience || '',
                motivation: motivation || '',
                status: 'pending',
                publishedAt: new Date().toISOString(),
            },
        });

        return json({ success: true });
    } catch (error) {
        console.error('[coordinator-request]', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
};
