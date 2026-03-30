import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const GET = () => json({ key: env.VAPID_PUBLIC_KEY ?? env.PUBLIC_VAPID_PUBLIC_KEY ?? '' });
