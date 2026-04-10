import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import webpush from 'web-push';
import { strapiGet } from '$lib/server/strapiClient.js';
import { env } from '$env/dynamic/private';
import { getUserByEmail } from '$lib/server/db.js';

const PUSH_TOKEN       = env.STRAPI_PUSH_TOKEN   ?? '';
const VAPID_PUBLIC_KEY = env.PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY  ?? '';
const VAPID_EMAIL      = env.VAPID_EMAIL          ?? 'mailto:admin@kahal.co.il';

export const POST: RequestHandler = async ({ request, locals }) => {
    // ✅ חובה: מנהל בלבד
    const session = await locals.auth();
    if (!session?.user?.email) throw error(401, 'Unauthorized');

    const dbUser = await getUserByEmail(session.user.email);
    if (!dbUser || (dbUser.role !== 'super_admin' && dbUser.role !== 'neighborhood_admin')) {
        throw error(403, 'נדרשות הרשאות מנהל');
    }

    const body = await request.json() as {
        title:   string;
        body:    string;
        url?:    string;
        icon?:   string;
        tag?:    string;
        userId?: string; // ריק = שלח לכולם
    };

    if (!body.title || !body.body) throw error(400, 'title ו-body חובה');

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const params: Record<string, string> = { 'pagination[pageSize]': '500' };
    if (body.userId) params['filters[user_id][$eq]'] = body.userId;

    const res = await strapiGet<{
        data: { id: number; attributes: { endpoint: string; p256dh: string; auth: string } }[]
    }>('/api/push-subscriptions', params, PUSH_TOKEN);

    const payload = JSON.stringify({
        title: body.title,
        body:  body.body,
        url:   body.url  ?? '/',
        icon:  body.icon ?? '/images/logos/logo2.png',
        tag:   body.tag  ?? 'kahal',
    });

    let sent = 0, failed = 0;
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
                if (status === 410 || status === 404) staleIds.push(id);
                failed++;
            }
        })
    );

    // ניקוי מנויים פגי תוקף
    await Promise.allSettled(
        staleIds.map((id) =>
            fetch(`${process.env.STRAPI_URL ?? 'http://localhost:1337'}/api/push-subscriptions/${id}`, {
                method:  'DELETE',
                headers: { Authorization: `Bearer ${PUSH_TOKEN}` },
            })
        )
    );

    return json({ sent, failed, stale: staleIds.length });
};
