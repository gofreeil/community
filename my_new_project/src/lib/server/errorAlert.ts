import type { RequestEvent } from '@sveltejs/kit';
import { getAllSuperAdmins, createItem, getUserById } from '$lib/server/db';

/**
 * התראת תקלה לסופר-אדמינים ("הצוות שלנו קיבל על כך התראה" בעמוד השגיאה — באמת):
 * כל תקלה שהפילה עמוד שולחת admin_alert לתיבת ההודעות של כל סופר-אדמין, עם
 * מזהה התקלה שהמשתמש רואה — כך תלונה ("קיבלתי 9R8B08") ניתנת לשיוך מיידי.
 *
 * המודול הזה משותף לשני מקורות התקלה: `handleError` בצד השרת (hooks.server.ts)
 * ודיווח תקלת דפדפן מ-hooks.client.ts דרך /api/client-error. שניהם חולקים את
 * אותו ריסון, כך שבאג שמפיל גם את ה-SSR וגם את הניווט בצד הלקוח לא מכפיל התראות.
 *
 * ריסון: פעם ב-15 דק' לכל חתימת (מקור+סטטוס+מסלול+שגיאה) ולכל היותר 8 התראות
 * לאינסטנס — כדי שבאג בדף פופולרי לא יציף את התיבה בעשרות הודעות זהות.
 * כשל בשליחה (למשל Strapi עצמו נפל) לעולם לא מפיל את עמוד השגיאה עצמו;
 * הלוג עם ה-ref נשאר תמיד כגיבוי.
 */
const ERROR_ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const ERROR_ALERT_MAX_PER_INSTANCE = 8;
const errorAlertLastSent = new Map<string, number>();
let errorAlertsSent = 0;

/** מזהה תקלה קצר שמוצג לגולש בדף השגיאה ונרשם בלוג — לשיוך תלונה מול הסטאק. */
export function newErrorRef(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * מי היה הגולש שנפל עליו הדף. בלי זה ההתראה אומרת "משהו נפל" אבל לא *למי* —
 * ואי-אפשר לפנות אליו ולהתנצל. שולפים מהסשן, ואם יש מזהה גם את הרשומה המלאה
 * (שם/מגדר/טלפון) כדי שכפתור "כתוב לגולש" בכרטיס ייצור טיוטה בלשון הנכונה.
 * best-effort לחלוטין: כל כשל כאן משאיר את ההתראה בלי זהות, לא מפיל אותה.
 */
export type ErrorActor = { id: string; name: string; email: string; gender: string; phone: string };

export async function resolveActor(event: RequestEvent): Promise<ErrorActor | null> {
    try {
        const session = await event.locals.auth?.();
        const id = session?.user?.id;
        if (!id) return null;
        const actor: ErrorActor = {
            id,
            name:  session.user?.name  ?? '',
            email: session.user?.email ?? '',
            gender: '',
            phone:  '',
        };
        const full = await getUserById(id).catch(() => undefined);
        if (full) {
            actor.name   = full.name  ?? actor.name;
            actor.email  = full.email ?? actor.email;
            actor.gender = full.gender ?? '';
            actor.phone  = full.phone  ?? '';
        }
        return actor;
    } catch {
        return null;
    }
}

/** 'server' = קריסה ב-load/render/action; 'client' = קריסה בניווט/רינדור בדפדפן. */
export type ErrorOrigin = 'server' | 'client';

export type ErrorAlert = {
    ref: string;
    status: number;
    /** מזהה המסלול (או הנתיב, כשאין) — משמש גם ככותרת ההתראה וגם לחתימת הריסון */
    routeId: string;
    /** "GET /path?query" — לתצוגה בגוף ההתראה */
    url: string;
    /** הנתיב בלבד, לשדות המובנים */
    path: string;
    method: string;
    errMsg: string;
    stackHead?: string;
    origin?: ErrorOrigin;
    /** thunk ולא ערך: לא משלמים על שליפת הגולש כשההתראה ממילא מרוסנת */
    getActor: () => Promise<ErrorActor | null>;
};

export async function notifySuperAdminsOfError(alert: ErrorAlert): Promise<void> {
    try {
        const origin = alert.origin ?? 'server';
        const sig = `${origin}:${alert.status}:${alert.routeId}:${alert.errMsg.slice(0, 80)}`;
        const now = Date.now();
        if (now - (errorAlertLastSent.get(sig) ?? 0) < ERROR_ALERT_COOLDOWN_MS) return;
        if (errorAlertsSent >= ERROR_ALERT_MAX_PER_INSTANCE) return;
        errorAlertLastSent.set(sig, now);
        errorAlertsSent++;

        const isClient = origin === 'client';
        const kind    = isClient ? 'תקלת דפדפן' : 'תקלת שרת';
        const opening = isClient
            ? 'תקלה בצד הדפדפן (ניווט/רינדור) הפילה עמוד באתר, והגולש קיבל את עמוד השגיאה.'
            : 'תקלה לא-מטופלת הפילה עמוד באתר, והגולש קיבל את עמוד השגיאה.';
        const logTag  = isClient ? 'client-error' : 'error';

        const actor = await alert.getActor();
        const actorLine = actor
            ? `הגולש: ${actor.name || 'ללא שם'}${actor.email ? ` (${actor.email})` : ''}${actor.phone ? ` · ${actor.phone}` : ''}`
            : `הגולש: אנונימי - לא היה מחובר בזמן התקלה`;
        const admins = await getAllSuperAdmins();
        await Promise.allSettled(admins.map((a) => createItem({
            category:    'admin_alert',
            label:       `🌩️ ${kind} ${alert.status} - ${alert.routeId}`,
            description:
                `${opening}\n\n` +
                `מזהה תקלה: ${alert.ref} (מוצג לגולש בתחתית עמוד השגיאה)\n` +
                `${actorLine}\n` +
                `כתובת: ${alert.url}\n` +
                `שגיאה: ${alert.errMsg.slice(0, 300)}\n` +
                (alert.stackHead ? `\nתחילת ה-stack:\n${alert.stackHead}\n` : '') +
                `\nהפרטים המלאים בלוג השרת תחת [${logTag} ${alert.ref}].`,
            icon:        '🌩️',
            color:       'red',
            user_id:     a.id,
            extra_fields: {
                type:          isClient ? 'client_error' : 'server_error',
                origin,
                ref:           alert.ref,
                status:        alert.status,
                url:           alert.path,
                method:        alert.method,
                error_message: alert.errMsg.slice(0, 300),
                // זהות הגולש - מזינה את כפתור "כתוב לגולש" בכרטיס ההתראה
                actor_id:     actor?.id     ?? '',
                actor_name:   actor?.name   ?? '',
                actor_email:  actor?.email  ?? '',
                actor_gender: actor?.gender ?? '',
                actor_phone:  actor?.phone  ?? '',
            },
        })));
    } catch (e) {
        console.warn('[errorAlert] error alert to admins failed:', e instanceof Error ? e.message : e);
    }
}
