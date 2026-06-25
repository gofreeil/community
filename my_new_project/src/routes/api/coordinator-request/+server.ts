import { json, type RequestHandler } from '@sveltejs/kit';
import { strapiPost } from '$lib/server/strapiClient';
import { getAllSuperAdmins, createItem } from '$lib/server/db';
import { Resend } from 'resend';

interface CoordRequestInfo {
    name: string;
    phone: string;
    neighborhoods: string[];
    experience: string;
    motivation: string;
    user_id: string;
}

/** שולח מייל לאדמין על בקשת רכז חדשה - best-effort, לא מכשיל את הבקשה */
async function notifyAdminEmail(data: CoordRequestInfo) {
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

/**
 * שולח הודעה אישית (category 'message') לכל סופר־אדמין כדי שהבקשה תופיע מיד
 * בתיבת ההודעות בפרופיל ותיספר בבאדג' ההודעות שלא נקראו - best-effort.
 */
async function notifySuperAdminsInApp(data: CoordRequestInfo) {
    const admins = await getAllSuperAdmins();
    const areas = data.neighborhoods.join(', ');
    await Promise.all(admins.map(admin => createItem({
        category:    'message',
        label:       `🙋 בקשת רכז חדשה: ${data.name}`,
        description:
            `${data.name} (${data.phone}) ביקש/ה להיות רכז שכונה${areas ? ` ב${areas}` : ''}.\n\n` +
            (data.experience ? `ניסיון: ${data.experience}\n` : '') +
            (data.motivation ? `מוטיבציה: ${data.motivation}\n` : '') +
            `\nהיכנס/י לעמוד הניהול תחת "בקשות להיות רכז" כדי לאשר או לדחות.`,
        icon:        '🙋',
        color:       'blue',
        user_id:     admin.id,
        extra_fields: {
            type:               'coordinator_request',
            requested_by_name:  data.name,
            requested_by_phone: data.phone,
            neighborhoods:      areas,
            requested_by_id:    data.user_id,
            requested_at:       new Date().toISOString(),
            read:               false,
        },
    })));
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

        const info: CoordRequestInfo = {
            name,
            phone,
            neighborhoods,
            experience: experience || '',
            motivation: motivation || '',
            user_id: String(session.user.id),
        };

        // התראות לאדמין - כל אחת best-effort בנפרד, לא מכשילות את הבקשה
        try {
            await notifySuperAdminsInApp(info);
        } catch (e) {
            console.warn('[coordinator-request] in-app notify failed:', e);
        }
        try {
            await notifyAdminEmail(info);
        } catch (e) {
            console.warn('[coordinator-request] admin email failed:', e);
        }

        return json({ success: true });
    } catch (error) {
        console.error('[coordinator-request]', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
};
