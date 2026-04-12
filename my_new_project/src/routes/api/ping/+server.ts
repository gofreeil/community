import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Map בזיכרון: sessionId → last_seen timestamp
const sessions = new Map<string, number>();
const SESSION_TTL = 2 * 60 * 1000; // 2 דקות

function cleanup() {
    const now = Date.now();
    for (const [id, ts] of sessions) {
        if (now - ts > SESSION_TTL) sessions.delete(id);
    }
}

export const POST: RequestHandler = async ({ cookies }) => {
    let sessionId = cookies.get('ping_sid');

    if (!sessionId) {
        sessionId = crypto.randomUUID();
        cookies.set('ping_sid', sessionId, {
            path:     '/',
            httpOnly: true,
            sameSite: 'strict',
            secure:   process.env.NODE_ENV === 'production',
            maxAge:   60 * 60 * 24, // יום
        });
    }

    sessions.set(sessionId, Date.now());
    cleanup();

    return json({ count: sessions.size });
};
