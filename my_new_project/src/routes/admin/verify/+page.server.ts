import { error, fail, redirect } from '@sveltejs/kit';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import type { RequestEvent } from '@sveltejs/kit';
import {
    verifyTotp,
    makeTrustToken,
    TRUST_COOKIE_NAME,
    TRUST_COOKIE_MAX_AGE,
    makeRescueChallenge,
    verifyRescueChallenge,
    RESCUE_COOKIE_NAME,
    RESCUE_COOKIE_MAX_AGE,
} from '$lib/server/totp';
import { getUserTotpSecret, getUserById } from '$lib/server/db';

function safeRedirect(raw: string | null): string {
    if (!raw) return '/admin';
    return raw.startsWith('/') && !raw.startsWith('//') && raw.startsWith('/admin') ? raw : '/admin';
}

/** סופר-אדמין מחובר שנעול מאחורי שער ה-2FA (יש סוד שמור). אחרת — החוצה. */
async function requireLockedSuperAdmin(event: RequestEvent) {
    const session = await event.locals.auth();
    if (session?.user?.role !== 'super_admin' || !session.user.id) {
        throw error(403, 'נדרשת הרשאת מנהל ראשי');
    }
    const secret = await getUserTotpSecret(session.user.id);
    if (!secret) throw redirect(302, '/admin'); // 2FA לא פעיל — אין מה לאמת
    return { session, secret, userId: session.user.id };
}

function maskEmail(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0) return '•••';
    return `${email[0]}•••${email.slice(at)}`;
}

/** המייל שאליו נשלח קוד החילוץ: המייל שעל רשומת המשתמש, ואם אין — זה שבסשן */
async function rescueEmail(userId: string, sessionEmail: string | null | undefined): Promise<string | null> {
    let email: string | null = null;
    try { email = (await getUserById(userId))?.email ?? null; } catch { /* ignore */ }
    return email || sessionEmail || null;
}

// מגבלות ניסיונות (best-effort, בזיכרון התהליך): שליחה אחת לדקה,
// ועד 5 ניסיונות הקלדה לכל אתגר. הקוד עצמו ממילא תקף 10 דקות בלבד.
const lastSend = new Map<string, number>();
const failCount = new Map<string, number>();
const SEND_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;

function rescueEmailHtml(code: string): string {
    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /><title>קוד חילוץ לכניסת מנהל</title></head>
<body style="margin:0; padding:0; background:#070b14; font-family:'Segoe UI', Arial, sans-serif; direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070b14; padding:40px 16px;">
    <tr><td align="center">
      <table width="440" cellpadding="0" cellspacing="0" style="background:#0f172a; border-radius:20px; border:1px solid #1e2a3a; overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d1b69 50%,#4a1942 100%); padding:28px 32px; text-align:center;">
            <div style="font-size:38px; margin-bottom:8px;">🔐</div>
            <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:900;">קוד חילוץ לכניסת מנהל</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px; text-align:center;">
            <p style="margin:0 0 20px; color:#cbd5e1; font-size:15px; line-height:1.7;">
              ביקשת להיכנס לאזור הניהול ללא אפליקציית האימות.<br/>הקוד החד-פעמי שלך:
            </p>
            <div style="background:#0a1628; border:1px solid #334155; border-radius:14px; padding:18px; margin-bottom:20px;">
              <span style="color:#f59e0b; font-size:36px; font-weight:900; letter-spacing:8px; direction:ltr; display:inline-block;">${code}</span>
            </div>
            <p style="margin:0; color:#64748b; font-size:13px; line-height:1.7;">
              הקוד תקף ל-10 דקות ורק בדפדפן שממנו נשלחה הבקשה.<br/>
              <strong style="color:#f87171;">לא ביקשת קוד?</strong> מישהו מנסה להיכנס לחשבון הניהול שלך — החלף סיסמה מיד.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#070b14; border-top:1px solid #1e2a3a; padding:16px 32px; text-align:center;">
            <p style="margin:0; color:#334155; font-size:12px;">© 2026 קהילה בשכונה</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const load: PageServerLoad = async (event) => {
    const { userId, session } = await requireLockedSuperAdmin(event);
    // האם בכלל קיים מייל לחילוץ — קובע אם להציג את מסלול המייל בדף
    const email = await rescueEmail(userId, session.user?.email);
    return {
        redirect: safeRedirect(event.url.searchParams.get('redirect')),
        canEmail: !!email,
        maskedEmail: email ? maskEmail(email) : null,
    };
};

export const actions: Actions = {
    // אימות רגיל בקוד מאפליקציית האימות
    totp: async (event) => {
        const { session, secret } = await requireLockedSuperAdmin(event);

        const formData = await event.request.formData();
        const code = (formData.get('code') as string) ?? '';
        const redirectTo = safeRedirect(formData.get('redirect') as string);

        if (!verifyTotp(secret, code)) {
            return fail(400, { error: 'קוד שגוי. ודא שהשעון בטלפון מסונכרן ונסה שוב.' });
        }

        // אימות הצליח → סימון המכשיר כמהימן (עוגייה חתומה, מוגבלת לאתר זה בלבד)
        const identity = session.user!.email ?? session.user!.id!;
        event.cookies.set(TRUST_COOKIE_NAME, makeTrustToken(identity, secret), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: TRUST_COOKIE_MAX_AGE,
        });

        throw redirect(303, redirectTo);
    },

    // "שכחתי את הטלפון" — שליחת קוד חילוץ חד-פעמי למייל של המנהל
    sendCode: async (event) => {
        const { session, secret, userId } = await requireLockedSuperAdmin(event);

        const now = Date.now();
        if (now - (lastSend.get(userId) ?? 0) < SEND_COOLDOWN_MS) {
            return fail(429, { error: 'קוד כבר נשלח לאחרונה — המתן דקה לפני שליחה חוזרת.', sent: true });
        }

        const email = await rescueEmail(userId, session.user?.email);
        if (!email) {
            return fail(400, { error: 'לא רשום מייל בחשבון. בקש ממנהל ראשי אחר לאפס את האימות דרך דף המשתמש שלך בפאנל.' });
        }

        const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
        if (!apiKey) {
            return fail(503, { error: 'שירות המייל אינו זמין כרגע. בקש ממנהל ראשי אחר לאפס את האימות דרך דף המשתמש שלך בפאנל.' });
        }

        const identity = session.user!.email ?? userId;
        const { cookie, code } = makeRescueChallenge(identity, secret);

        try {
            const resend = new Resend(apiKey);
            const fromEmail = env.FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
            const { error: sendErr } = await resend.emails.send({
                from: `קהילה בשכונה <${fromEmail}>`,
                to: [email],
                subject: '🔐 קוד חילוץ לכניסת מנהל — קהילה בשכונה',
                html: rescueEmailHtml(code),
            });
            if (sendErr) throw new Error(sendErr.message ?? String(sendErr));
        } catch (e) {
            console.error('[admin/verify] rescue email failed:', e instanceof Error ? e.message : e);
            return fail(500, { error: 'שליחת המייל נכשלה. נסה שוב בעוד רגע.' });
        }

        // האתגר נקבע רק אחרי שהמייל באמת יצא — עוגייה בדפדפן הזה בלבד
        event.cookies.set(RESCUE_COOKIE_NAME, cookie, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: RESCUE_COOKIE_MAX_AGE,
        });
        lastSend.set(userId, now);
        failCount.delete(userId);

        return { sent: true, maskedEmail: maskEmail(email) };
    },

    // אימות קוד החילוץ שהגיע במייל → אותה עוגיית מכשיר-מהימן כמו אימות TOTP
    emailCode: async (event) => {
        const { session, secret, userId } = await requireLockedSuperAdmin(event);

        const formData = await event.request.formData();
        const code = (formData.get('code') as string) ?? '';
        const redirectTo = safeRedirect(formData.get('redirect') as string);

        const fails = failCount.get(userId) ?? 0;
        if (fails >= MAX_ATTEMPTS) {
            event.cookies.delete(RESCUE_COOKIE_NAME, { path: '/' });
            return fail(429, { error: 'יותר מדי ניסיונות. שלח קוד חדש למייל ונסה שוב.' });
        }

        const identity = session.user!.email ?? userId;
        if (!verifyRescueChallenge(event.cookies.get(RESCUE_COOKIE_NAME), identity, secret, code)) {
            failCount.set(userId, fails + 1);
            return fail(400, { error: 'הקוד שגוי או שפג תוקפו. אפשר לשלוח קוד חדש.', sent: true });
        }

        // הצלחה: האתגר נשרף (חד-פעמי) והמכשיר מסומן כמהימן
        event.cookies.delete(RESCUE_COOKIE_NAME, { path: '/' });
        failCount.delete(userId);
        event.cookies.set(TRUST_COOKIE_NAME, makeTrustToken(identity, secret), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: TRUST_COOKIE_MAX_AGE,
        });

        throw redirect(303, redirectTo);
    },
};
