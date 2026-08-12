import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { addFundContribution, getFundTotal, getAllSuperAdmins, createItem, getUserById } from '$lib/server/db';
import type { RequestHandler, RequestEvent } from './$types';

// המייל לא מחשב מחירים - הוא מציג את מה שהמחשבון בדף כבר חישב.
// הלקוח שולח שורות מוכנות: שם מתורגם + הסכום הסופי של אותה שורה.
interface OrderItem {
    type: string;
    plan: 'half' | 'single';
    price: number;
}

interface OrderPayload {
    email: string;
    selectedItems: OrderItem[];
    neighborhoodLabel: string;
    neighborhoodCount: number;
    totalPayment: number;
    totalMonthly: number;
    discountLabel?: string;
    discountValue?: number;
    mapImageAddon?: boolean;
    mapImageAddonPrice?: number;
}

function buildEmailHtml(payload: OrderPayload): string {
    const { selectedItems, neighborhoodLabel, neighborhoodCount, totalPayment, totalMonthly } = payload;
    const discountValue = payload.discountValue ?? 0;
    const discountLabel = payload.discountLabel ?? '';

    const halfItems  = selectedItems.filter(r => r.plan === 'half');
    const singleItems = selectedItems.filter(r => r.plan === 'single');

    const itemsRows = selectedItems.map(item => {
        const price = item.price ?? 0;
        const planLabel = item.plan === 'half' ? 'חצי שנה' : 'חודש בודד';
        const color = item.plan === 'half' ? '#f59e0b' : '#3b82f6';
        return `
        <tr>
          <td style="padding:12px 16px; border-bottom:1px solid #1e2a3a; color:#e2e8f0; font-size:15px;">${item.type}</td>
          <td style="padding:12px 16px; border-bottom:1px solid #1e2a3a; text-align:center;">
            <span style="background:${color}22; color:${color}; border:1px solid ${color}44;
                         border-radius:20px; padding:3px 10px; font-size:12px; font-weight:700;">${planLabel}</span>
          </td>
          <td style="padding:12px 16px; border-bottom:1px solid #1e2a3a; text-align:left; color:${color}; font-weight:700; font-size:15px;">₪${price}</td>
        </tr>`;
    }).join('');

    const summaryLine = halfItems.length > 0 && singleItems.length === 0
        ? `<p style="margin:0; color:#94a3b8; font-size:13px;">חבילת חצי שנה · ₪${totalMonthly} לחודש</p>`
        : halfItems.length === 0 && singleItems.length > 0
        ? `<p style="margin:0; color:#94a3b8; font-size:13px;">${singleItems.length} פרסומות לחודש אחד</p>`
        : `<p style="margin:0; color:#94a3b8; font-size:13px;">${halfItems.length} חצי שנה + ${singleItems.length} חודשים בודדים</p>`;

    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>אישור הזמנת פרסום - קהילה בשכונה</title>
</head>
<body style="margin:0; padding:0; background:#070b14; font-family:'Segoe UI', Arial, sans-serif; direction:rtl;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070b14; padding:40px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#0f172a; border-radius:20px; border:1px solid #1e2a3a; overflow:hidden;">

        <!-- Header gradient -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d1b69 50%,#4a1942 100%); padding:36px 32px; text-align:center;">
            <div style="font-size:42px; margin-bottom:12px;">📢</div>
            <h1 style="margin:0 0 6px; color:#ffffff; font-size:26px; font-weight:900; letter-spacing:-0.5px;">
              קהילה בשכונה
            </h1>
            <p style="margin:0; color:#a5b4fc; font-size:15px; font-weight:600;">
              ✅ בקשת הפרסום שלך התקבלה!
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <p style="margin:0 0 24px; color:#cbd5e1; font-size:16px; line-height:1.7;">
              שלום,<br/>
              קיבלנו את בקשת הפרסום שלך. להלן סיכום ההזמנה שלך -
              ניצור איתך קשר תוך <strong style="color:#f59e0b;">24 שעות</strong> לתיאום הסופי.
            </p>

            <!-- Order summary box -->
            <div style="background:#0a1628; border:1px solid #1e2a3a; border-radius:14px; margin-bottom:24px; overflow:hidden;">

              <!-- Section title -->
              <div style="background:#111827; padding:12px 16px; border-bottom:1px solid #1e2a3a;">
                <p style="margin:0; color:#64748b; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">
                  📋 פרסומות שנבחרו
                </p>
              </div>

              <!-- Items table -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr style="background:#0f172a;">
                    <th style="padding:10px 16px; color:#64748b; font-size:12px; font-weight:700; text-align:right; border-bottom:1px solid #1e2a3a;">סוג פרסום</th>
                    <th style="padding:10px 16px; color:#64748b; font-size:12px; font-weight:700; text-align:center; border-bottom:1px solid #1e2a3a;">תוכנית</th>
                    <th style="padding:10px 16px; color:#64748b; font-size:12px; font-weight:700; text-align:left; border-bottom:1px solid #1e2a3a;">מחיר</th>
                  </tr>
                </thead>
                <tbody>${itemsRows}${payload.mapImageAddon ? `
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #1e2a3a; color:#e2e8f0; font-size:15px;">🗺️ תמונה או לוגו על המפה</td>
                  <td style="padding:12px 16px; border-bottom:1px solid #1e2a3a; text-align:center;">
                    <span style="background:#a855f722; color:#a855f7; border:1px solid #a855f744;
                                 border-radius:20px; padding:3px 10px; font-size:12px; font-weight:700;">לשנה</span>
                  </td>
                  <td style="padding:12px 16px; border-bottom:1px solid #1e2a3a; text-align:left; color:#a855f7; font-weight:700; font-size:15px;">₪${payload.mapImageAddonPrice ?? 0}</td>
                </tr>` : ''}</tbody>
              </table>

              <!-- Neighborhood row -->
              <div style="padding:12px 16px; border-top:1px solid #1e2a3a; background:#0f1f35;">
                <p style="margin:0; color:#94a3b8; font-size:13px;">
                  📍 שכונות: <strong style="color:#f59e0b;">${neighborhoodLabel}</strong>
                  ${neighborhoodCount > 1 ? `<span style="color:#64748b;"> (×${neighborhoodCount} שכונות)</span>` : ''}
                </p>
              </div>
            </div>

            <!-- Total box -->
            <div style="background:linear-gradient(135deg,#1a2744 0%,#1a1a3e 100%);
                         border:2px solid #334155; border-radius:14px; padding:24px; text-align:center; margin-bottom:28px;">
              <p style="margin:0 0 4px; color:#64748b; font-size:13px; font-weight:700;">סה"כ לתשלום</p>
              ${discountValue > 0 ? `<p style="margin:0 0 8px; color:#22c55e; font-size:13px; font-weight:700;">🎟️ הנחה (${discountLabel}): -₪${discountValue}</p>` : ''}
              <p style="margin:0 0 6px; color:#ffffff; font-size:48px; font-weight:900; line-height:1;">₪${totalPayment}</p>
              ${summaryLine}
            </div>

            <!-- What's next -->
            <div style="background:#0a1628; border:1px solid #1e2a3a; border-radius:14px; padding:20px; margin-bottom:28px;">
              <p style="margin:0 0 14px; color:#e2e8f0; font-size:14px; font-weight:700;">מה קורה עכשיו?</p>
              <table cellpadding="0" cellspacing="0">
                ${[
                    ['📧', 'קיבלנו את בקשתך', 'הבקשה רשומה במערכת שלנו'],
                    ['📞', 'ניצור איתך קשר', 'תוך 24 שעות לתיאום פרטי הפרסום'],
                    ['🎯', 'הפרסום יעלה', 'לאחר אישור סופי ותשלום'],
                ].map(([icon, title, desc]) => `
                <tr>
                  <td style="padding:6px 12px 6px 0; vertical-align:top; font-size:18px;">${icon}</td>
                  <td style="padding:6px 0 6px 0; vertical-align:top;">
                    <p style="margin:0; color:#e2e8f0; font-size:14px; font-weight:700;">${title}</p>
                    <p style="margin:0; color:#64748b; font-size:12px;">${desc}</p>
                  </td>
                </tr>`).join('')}
              </table>
            </div>

            <!-- Contact -->
            <p style="margin:0; color:#64748b; font-size:13px; text-align:center; line-height:1.8;">
              שאלות? צרו קשר בכל עת:<br/>
              <a href="mailto:ads@shchuna.co.il" style="color:#f59e0b; text-decoration:none; font-weight:700;">ads@shchuna.co.il</a>
              &nbsp;·&nbsp;
              <a href="https://wa.me/972500000000" style="color:#22c55e; text-decoration:none; font-weight:700;">WhatsApp</a>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#070b14; border-top:1px solid #1e2a3a; padding:20px 32px; text-align:center;">
            <p style="margin:0; color:#334155; font-size:12px;">
              © 2026 קהילה בשכונה · <a href="https://shchuna.co.il" style="color:#475569; text-decoration:none;">shchuna.co.il</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * הזמנה שנכשלה היא לקוח שנעלם: הוא ראה שגיאה, המייל לא יצא, ואף אחד לא ידע
 * שהוא בכלל היה כאן. לכן כל כשל שולח התראה לסופר-אדמינים עם האימייל שהוא הקליד
 * ועם סכום ההזמנה - כדי שאפשר יהיה לחזור אליו ידנית.
 *
 * זהות: אם הוא היה מחובר שומרים גם actor_id/gender - מזין את כפתור "כתוב לגולש"
 * בכרטיס ההתראה. אם לא, ה-actor_email לבדו מספיק לכפתור המייל.
 * best-effort: כשל בהתראה עצמה לעולם לא משנה את התשובה ללקוח.
 */
async function notifyAdminsOrderFailed(event: RequestEvent, payload: OrderPayload, reason: string): Promise<void> {
    try {
        let actorId = '', actorName = '', actorGender = '', actorPhone = '';
        try {
            const session = await event.locals.auth?.();
            if (session?.user?.id) {
                actorId   = session.user.id;
                actorName = session.user.name ?? '';
                const full = await getUserById(actorId).catch(() => undefined);
                if (full) {
                    actorName   = full.name ?? actorName;
                    actorGender = full.gender ?? '';
                    actorPhone  = full.phone  ?? '';
                }
            }
        } catch { /* ignore - זהות היא בונוס, האימייל הוא העיקר */ }

        const lines = (payload.selectedItems ?? [])
            .map(i => `• ${i.type} (${i.plan === 'half' ? 'חצי שנה' : 'חודש בודד'}) - ₪${i.price}`)
            .join('\n');
        const admins = await getAllSuperAdmins();
        await Promise.allSettled(admins.map(a => createItem({
            category:    'admin_alert',
            label:       `💸 הזמנת פרסום נכשלה - ${payload.email}`,
            description:
                `גולש מילא את מחשבון הפרסום ולחץ לשלוח, אבל מייל האישור לא יצא - ` +
                `ההזמנה לא הגיעה לאף אחד והוא ראה הודעת שגיאה.\n\n` +
                `אימייל שהוקלד: ${payload.email}\n` +
                (actorName ? `שם: ${actorName}${actorPhone ? ` · ${actorPhone}` : ''}\n` : '') +
                `שכונות: ${payload.neighborhoodLabel} (×${payload.neighborhoodCount})\n` +
                `סה"כ: ₪${payload.totalPayment}\n` +
                (lines ? `\n${lines}\n` : '') +
                `\nסיבת הכשל: ${reason}`,
            icon:        '💸',
            color:       'red',
            user_id:     a.id,
            extra_fields: {
                type:         'order_failed',
                reason,
                actor_id:     actorId,
                actor_name:   actorName,
                actor_email:  payload.email,
                actor_gender: actorGender,
                actor_phone:  actorPhone,
                total:        payload.totalPayment,
            },
        })));
    } catch (e) {
        console.warn('[send-order-email] admin alert failed:', e instanceof Error ? e.message : e);
    }
}

export const POST: RequestHandler = async (event) => {
    const { request } = event;
    let payload: OrderPayload;

    try {
        payload = await request.json();
    } catch {
        return json({ success: false, message: 'נתונים לא תקינים' }, { status: 400 });
    }

    const { email, selectedItems } = payload;

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ success: false, message: 'כתובת אימייל לא תקינה' }, { status: 400 });
    }
    if (!selectedItems || selectedItems.length === 0) {
        return json({ success: false, message: 'לא נבחרו פרסומות' }, { status: 400 });
    }

    // המפתח נקרא דרך $env/dynamic/private (עובד גם ב-Vercel וגם ב-adapter-node),
    // עם נפילה חזרה ל-process.env לסביבות שמזריקות אותו ישירות.
    //
    // הבדיקה המפורשת קריטית: `new Resend(undefined)` *זורק* ("Missing API key"),
    // והבנייה הזאת ישבה מחוץ ל-try — כך שסביבה בלי RESEND_API_KEY הפילה את כל
    // ה-endpoint ל-500, הגולש קיבל את עמוד השגיאה הכללי, וכל סופר-אדמין קיבל
    // התראת "תקלת שרת". עכשיו: תשובת JSON מסודרת שהדף יודע להציג, בלי קריסה.
    const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('[send-order-email] RESEND_API_KEY missing - הזמנה התקבלה אך לא נשלח מייל:', email);
        await notifyAdminsOrderFailed(event, payload, 'RESEND_API_KEY חסר בסביבת הייצור');
        return json(
            { success: false, message: 'שירות המייל אינו זמין כרגע. הבקשה לא נשלחה - נסו שוב או פנו ל-ads@shchuna.co.il' },
            { status: 503 },
        );
    }

    const resend = new Resend(apiKey);
    const fromEmail = env.FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';

    try {
        const { error } = await resend.emails.send({
            from: `קהילה בשכונה <${fromEmail}>`,
            to: [email],
            subject: `✅ בקשת הפרסום שלך התקבלה - ₪${payload.totalPayment}`,
            html: buildEmailHtml(payload),
        });

        if (error) {
            console.error('Resend error:', error);
            await notifyAdminsOrderFailed(event, payload, `Resend: ${error.message ?? String(error)}`);
            return json({ success: false, message: 'שגיאה בשליחת המייל' }, { status: 500 });
        }

        // ---- 10% לקופת השכונה ----
        let fundTotal = 0;
        try {
            fundTotal = await addFundContribution(payload.neighborhoodLabel, payload.totalPayment);
        } catch (fundErr) {
            console.warn('[send-order-email] fund contribution failed:', fundErr);
            try { fundTotal = await getFundTotal(); } catch { fundTotal = 0; }
        }

        return json({ success: true, message: 'המייל נשלח בהצלחה!', fundTotal });

    } catch (err) {
        console.error('Unexpected error sending email:', err);
        await notifyAdminsOrderFailed(event, payload, err instanceof Error ? err.message : String(err));
        return json({ success: false, message: 'שגיאה לא צפויה' }, { status: 500 });
    }
};
