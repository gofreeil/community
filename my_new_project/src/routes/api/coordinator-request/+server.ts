import { json, type RequestHandler } from '@sveltejs/kit';
import { strapiPost } from '$lib/server/strapiClient';
import { Resend } from 'resend';

/** שולח מייל לאדמין על בקשת רכז חדשה - best-effort, לא מכשיל את הבקשה */
async function notifyAdmin(data: {
    name: string;
    phone: string;
    neighborhoods: string[];
    experience: string;
    motivation: string;
    user_id: string;
}) {
    const resend   = new Resend(process.env.RESEND_API_KEY);
    const fromAddr = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    await resend.emails.send({
        from: `קהילה בשכונה <${fromAddr}>`,
        to:   ['ads@shchuna.co.il'],
        subject: `🙋 בקשת רכז חדשה: ${data.name} (${data.neighborhoods.join(', ')})`,
        html: `<!DOCTYPE html><html dir="rtl"><body style="font-family:Arial,sans-serif;background:#070b14;color:#e2e8f0;padding:24px;">
          <h2 style="color:#60a5fa;">🙋 בקשה חדשה להיות רכז שכונה</h2>
          <table style="border-collapse:collapse;width:100%;max-width:600px;background:#0f172a;border-radius:12px;overflow:hidden;border:1px solid #1e2a3a;">
            <tr><td style="padding:8px 16px;background:#1e2a3a;color:#94a3b8;font-size:12px;font-weight:700;">שדה</td><td style="padding:8px 16px;background:#1e2a3a;color:#94a3b8;font-size:12px;font-weight:700;">ערך</td></tr>
            <tr><td style="padding:8px 16px;color:#94a3b8;">שם</td><td style="padding:8px 16px;font-weight:700;">${data.name}</td></tr>
            <tr><td style="padding:8px 16px;color:#94a3b8;">טלפון</td><td style="padding:8px 16px;">${data.phone}</td></tr>
            <tr><td style="padding:8px 16px;color:#94a3b8;">שכונות</td><td style="padding:8px 16px;">${data.neighborhoods.join(', ')}</td></tr>
            <tr><td style="padding:8px 16px;color:#94a3b8;">ניסיון</td><td style="padding:8px 16px;">${data.experience || '—'}</td></tr>
            <tr><td style="padding:8px 16px;color:#94a3b8;">מוטיבציה</td><td style="padding:8px 16px;">${data.motivation || '—'}</td></tr>
            <tr><td style="padding:8px 16px;color:#94a3b8;">מזהה משתמש</td><td style="padding:8px 16px;">${data.user_id}</td></tr>
          </table>
          <p style="margin-top:16px;"><a href="https://community.gofreeil.com/admin#coord-requests" style="color:#60a5fa;font-weight:700;">➜ לאישור/דחייה בפאנל הניהול</a></p>
        </body></html>`,
    });
}

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

        // הודעה לאדמין - best-effort, לא מכשיל את הבקשה אם המייל נכשל
        try {
            await notifyAdmin({
                name,
                phone,
                neighborhoods,
                experience: experience || '',
                motivation: motivation || '',
                user_id: String(session.user.id),
            });
        } catch (e) {
            console.warn('[coordinator-request] admin email failed:', e);
        }

        return json({ success: true });
    } catch (error) {
        console.error('[coordinator-request]', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
};
