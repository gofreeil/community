import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { strapiPost, strapiGet } from '$lib/server/strapiClient.js';
import { env } from '$env/dynamic/private';
const STRAPI_API_TOKEN = env.STRAPI_API_TOKEN ?? '';

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    const { subscription, userId } = body as {
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
        userId?: string;
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        throw error(400, 'Invalid subscription');
    }

    // שמור ב-Strapi
    await strapiPost(
        '/api/push-subscriptions',
        {
            data: {
                endpoint:   subscription.endpoint,
                p256dh:     subscription.keys.p256dh,
                auth:       subscription.keys.auth,
                user_id:    userId ?? null,
                user_agent: request.headers.get('user-agent') ?? '',
            },
        },
        STRAPI_API_TOKEN
    );

    return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
    const { endpoint } = await request.json() as { endpoint: string };
    if (!endpoint) throw error(400, 'Missing endpoint');

    // מצא ומחק מנוי ב-Strapi
    try {
        const res = await strapiGet<{ data: { id: number }[] }>(
            '/api/push-subscriptions',
            { 'filters[endpoint][$eq]': endpoint, 'pagination[pageSize]': '1' },
            STRAPI_API_TOKEN
        );
        if (res.data?.[0]) {
            await fetch(`${process.env.STRAPI_URL}/api/push-subscriptions/${res.data[0].id}`, {
                method:  'DELETE',
                headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
            });
        }
    } catch {
        // מנוי כבר לא קיים — OK
    }

    return json({ ok: true });
};
