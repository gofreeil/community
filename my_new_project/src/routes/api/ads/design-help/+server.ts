import { json, type RequestHandler } from '@sveltejs/kit';
import { getAllSuperAdmins, createItem, getUserById } from '$lib/server/db';

const MAX_LEN = 2000;

export const POST: RequestHandler = async ({ request, locals }) => {
    let session = null;
    try { session = await locals.auth?.(); } catch { /* anonymous OK */ }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const problem      = String(body?.problem ?? '').trim().slice(0, MAX_LEN);
    const contact      = String(body?.contact ?? '').trim().slice(0, 200);
    const draftSummary = String(body?.draftSummary ?? '').trim().slice(0, 600);
    const editPath     = '/about/advertise/builder';

    if (problem.length < 5) {
        return json({ error: 'אנא תאר את הבעיה (לפחות 5 תווים)' }, { status: 400 });
    }

    // Resolve user identity for the admin notification
    let userId   = session?.user?.id ? String(session.user.id) : '';
    let userEmail = session?.user?.email ?? '';
    let userName  = session?.user?.name ?? '';
    let userNickname = '';
    if (userId) {
        try {
            const dbUser = await getUserById(userId);
            userNickname = dbUser?.nickname ?? '';
            if (!userEmail) userEmail = dbUser?.email ?? '';
        } catch { /* ignore */ }
    }
    const identityLine = userId
        ? [userNickname || userName, userEmail, `id:${userId}`].filter(Boolean).join(' · ')
        : (contact || '(אנונימי)');

    if (!userId && !contact) {
        return json({ error: 'אנא ציין אימייל או כינוי כדי שנדע למצוא אותך' }, { status: 400 });
    }

    // Compose admin message — link is relative so it opens within the site
    const description =
        `🆘 בקשת עזרה בעיצוב מהבונה פרסומות\n\n` +
        `🧑 ${identityLine}\n\n` +
        `הבעיה:\n"${problem}"\n\n` +
        (draftSummary ? `מצב הטיוטה:\n${draftSummary}\n\n` : '') +
        `קישור לדף העריכה: ${editPath}`;

    try {
        const admins = await getAllSuperAdmins();
        await Promise.all(admins.map(admin => createItem({
            category:    'message',
            label:       `🆘 בקשת עזרה בעיצוב — ${userNickname || userName || userEmail || contact || 'משתמש'}`,
            description,
            icon:        '🆘',
            color:       'red',
            user_id:     admin.id,
            extra_fields: {
                type:             'design_help_request',
                user_id:          userId,
                user_email:       userEmail,
                user_name:        userName,
                user_nickname:    userNickname,
                fallback_contact: contact,
                problem,
                draft_summary:    draftSummary,
                edit_link:        editPath,
                requested_at:     new Date().toISOString(),
            },
        })));
    } catch (e) {
        console.warn('[design-help] notify super_admins failed:', e);
        // Continue — WhatsApp should still work even if DB write fails.
    }

    return json({
        success: true,
        identityLine,
    });
};
