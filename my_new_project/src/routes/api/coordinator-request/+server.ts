import { json, type RequestHandler } from '@sveltejs/kit';
import { strapiPost } from '$lib/server/strapiClient';
import {
    getAllSuperAdmins,
    createItem,
    getUserByAnyId,
    coordinatorCovers,
    findPendingCoordinatorRequest,
    updateCoordinatorRequestDetails,
} from '$lib/server/db';
import { refreshCoordinatorRequestMessages } from '$lib/server/coordinatorNotifications';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

interface CoordRequestInfo {
    name: string;
    phone: string;
    neighborhoods: string[];
    experience: string;
    motivation: string;
    user_id: string;
}

/**
 * תוכן כרטיס ההתראה בתיבת המנהל - מקור אחד גם ליצירה וגם לרענון בהגשה חוזרת,
 * כדי ששני המסלולים לא יתפצלו לשני נוסחים.
 */
function messageContent(data: CoordRequestInfo, resubmitted: boolean) {
    const areas = data.neighborhoods.join(', ');
    return {
        label: `🙋 בקשת רכז ${resubmitted ? 'עודכנה' : 'חדשה'}: ${data.name}`,
        description:
            `${data.name} (${data.phone}) ביקש/ה להיות רכז שכונה${areas ? ` ב${areas}` : ''}.\n\n` +
            (data.experience ? `ניסיון: ${data.experience}\n` : '') +
            (data.motivation ? `מוטיבציה: ${data.motivation}\n` : '') +
            (resubmitted ? `\n🔄 המבקש/ת שלח/ה שוב את הטופס — זו אותה בקשה, עם הפרטים המעודכנים שלמעלה.\n` : '') +
            `\nהיכנס/י לעמוד הניהול תחת "בקשות להיות רכז" כדי לאשר או לדחות.`,
    };
}

/** שולח מייל לאדמין על בקשת רכז חדשה - best-effort, לא מכשיל את הבקשה */
async function notifyAdminEmail(data: CoordRequestInfo, resubmitted = false) {
    // בלי מפתח `new Resend(undefined)` זורק; כאן זה נבלע ע"י ה-try של הקורא
    // ונראה כמו "שליחה נכשלה" סתמית. שורת לוג מפורשת חוסכת את החיפוש.
    const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('[coordinator-request] RESEND_API_KEY missing - מייל לאדמין לא נשלח');
        return;
    }
    const resend   = new Resend(apiKey);
    const fromAddr = env.FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
    await resend.emails.send({
        from: `קהילה בשכונה <${fromAddr}>`,
        to:   ['ads@shchuna.co.il'],
        subject: resubmitted
            ? `🔄 בקשת רכז עודכנה: ${data.name} (${data.neighborhoods.join(', ')})`
            : `🙋 בקשת רכז חדשה: ${data.name} (${data.neighborhoods.join(', ')})`,
        html: `<!DOCTYPE html><html dir="rtl"><body style="font-family:Arial,sans-serif;background:#070b14;color:#e2e8f0;padding:24px;">
          <h2 style="color:#60a5fa;">${resubmitted ? '🔄 עדכון לבקשה קיימת להיות רכז שכונה' : '🙋 בקשה חדשה להיות רכז שכונה'}</h2>
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
async function notifySuperAdminsInApp(data: CoordRequestInfo, resubmitted = false, requestId = '') {
    const admins = await getAllSuperAdmins();
    const areas = data.neighborhoods.join(', ');
    const { label, description } = messageContent(data, resubmitted);
    await Promise.all(admins.map(admin => createItem({
        category:    'message',
        label,
        description,
        icon:        '🙋',
        color:       'blue',
        user_id:     admin.id,
        extra_fields: {
            type:               'coordinator_request',
            requested_by_name:  data.name,
            requested_by_phone: data.phone,
            neighborhoods:      areas,
            requested_by_id:    data.user_id,
            // מזהה רשומת הבקשה - מאפשר אשר/דחה ישירות מכרטיס ההתראה בלי לחפש
            // אותה מחדש. כרטיסים ישנים בלי השדה נפתרים לפי מבקש+אזורים.
            request_id:         requestId,
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

        // מניעת בקשה כפולה: אם המשתמש כבר רכז של כל האזורים המבוקשים - אין טעם בבקשה
        // חדשה (היא הייתה נתקעת כ-pending בפאנל האדמין). לא יוצרים רשומה ולא שולחים התראות.
        let me;
        try {
            me = await getUserByAnyId(String(session.user.id));
            if (me && coordinatorCovers(me.coordinator_of, neighborhoods)) {
                return json({ success: true, alreadyCoordinator: true });
            }
        } catch (e) {
            console.warn('[coordinator-request] already-coordinator check failed:', e);
        }

        const info: CoordRequestInfo = {
            name,
            phone,
            neighborhoods,
            experience: experience || '',
            motivation: motivation || '',
            user_id: String(session.user.id),
        };

        // הגשה חוזרת של אותה בקשה (אותו מבקש, אותם אזורים, עדיין ממתינה): מעדכנים
        // את הרשומה הקיימת ואת כרטיס ההתראה - במקום רשומה שנייה וכרטיס שני על
        // אותה בקשה בדיוק. הסטטוס לא נגע: ההחלטה נשארת ידנית של האדמין.
        const pending = await findPendingCoordinatorRequest(
            { id: String(session.user.id), phone: me?.phone ?? phone, email: me?.email },
            neighborhoods,
        );
        if (pending) {
            await updateCoordinatorRequestDetails(pending.id, {
                name,
                phone,
                experience: experience || '',
                motivation: motivation || '',
            });

            // כרטיס פתוח בתיבה → מתרענן. אין כרטיס פתוח (נמחק/הוסתר/סומן טופל) →
            // נוצר חדש, כדי שבקשה ממתינה לא תישאר בלי התראה בכלל.
            try {
                const { label, description } = messageContent(info, true);
                const refreshed = await refreshCoordinatorRequestMessages(
                    { user_id: pending.user_id, phone: pending.phone || phone, neighborhoods: pending.neighborhoods },
                    { label, description, requestId: pending.id },
                );
                if (refreshed === 0) await notifySuperAdminsInApp(info, true, pending.id);
            } catch (e) {
                console.warn('[coordinator-request] refresh notify failed:', e);
            }
            try {
                await notifyAdminEmail(info, true);
            } catch (e) {
                console.warn('[coordinator-request] admin email (update) failed:', e);
            }

            return json({ success: true, alreadyPending: true, sentAt: pending.created_at });
        }

        // שמור בקשה ב-Strapi. שומרים את המזהה שנוצר כדי לשתול אותו בכרטיס
        // ההתראה - משם האדמין מאשר/דוחה ישירות, בלי לחפש את הבקשה בעמוד הניהול.
        const created = await strapiPost<{ data?: { documentId?: string } }>('/api/coordinator-requests', {
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
        const requestId = created?.data?.documentId ?? '';

        // התראות לאדמין - כל אחת best-effort בנפרד, לא מכשילות את הבקשה
        try {
            await notifySuperAdminsInApp(info, false, requestId);
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
