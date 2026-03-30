import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import webpush from 'web-push';
import { strapiGet } from '$lib/server/strapiClient.js';
import { env } from '$env/dynamic/private';
const VAPID_PUBLIC_KEY  = env.PUBLIC_VAPID_PUBLIC_KEY ?? env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL       = env.VAPID_EMAIL       ?? 'mailto:admin@kahal.co.il';
const STRAPI_API_TOKEN  = env.STRAPI_API_TOKEN  ?? '';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const POST: RequestHandler = async ({ request, locals }) => {
    // רק מנהלים יכולים לשלוח push
    const session = await locals.auth();
    if (!session?.user) throw error(401, 'Unauthorized');

    const body = await request.json() as {
        title: string;
        body:  string;
        url?:  string;
        icon?: string;
        tag?:  string;
        userId?: string; // אם ריק → שלח לכולם
    };

    if (!body.title || !body.body) throw error(400, 'title and body required');

    // טען את כל המנויים (או לפי userId)
    const params: Record<string, string> = {
        'pagination[pageSize]': '500',
        'pagination[page]':     '1',
    };
    if (body.userId) params['filters[user_id][$eq]'] = body.userId;

    const res = await strapiGet<{ data: { id: number; attributes: { endpoint: string; p256dh: string; auth: string } }[] }>(
        '/api/push-subscriptions',
        params,
        STRAPI_API_TOKEN
    );

    const payload = JSON.stringify({
        title:   body.title,
        body:    body.body,
        url:     body.url   ?? '/',
        icon:    body.icon  ?? '/images/logos/לוגו2.png',
        tag:     body.tag   ?? 'kahal',
    });

    let sent = 0;
    let failed = 0;
    const staleIds: number[] = [];

    await Promise.allSettled(
        (res.data ?? []).map(async ({ id, attributes: sub }) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    payload
                );
                sent++;
            } catch (err: unknown) {
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 410 || status === 404) staleIds.push(id); // מנוי פג תוקף
                failed++;
            }
        })
    );

    // נקה מנויים פגי תוקף
    await Promise.allSettled(
        staleIds.map((id) =>
            fetch(`${process.env.STRAPI_URL}/api/push-subscriptions/${id}`, {
                method:  'DELETE',
                headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
            })
        )
    );

    return json({ sent, failed, stale: staleIds.length });
};
