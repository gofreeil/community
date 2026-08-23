import type { RequestHandler } from './$types';
import {
    newErrorRef,
    resolveActor,
    notifySuperAdminsOfError,
} from '$lib/server/errorAlert';

/**
 * קליטת דיווח תקלה מצד הדפדפן (hooks.client.ts) והזרמתו לאותו מסלול של תקלות
 * שרת: שורת לוג עם מזהה התקלה + התראה לסופר-אדמינים.
 *
 * הנתיב פתוח בהכרח — תקלת ניווט קורית גם לגולש אנונימי, ודווקא הוא זה שאין
 * עליו שום מידע אחר. לכן ההקשחה כאן היא על *כמות* ולא על זהות:
 *   • גוף מוגבל ל-8KB, וכל שדה נחתך לאורך קבוע (ולא נכתב ללוג עם שורות חדשות)
 *   • 5 דיווחים לכל היותר ל-IP בכל 10 דקות
 *   • הריסון המשותף ב-errorAlert (15 דק' לחתימה, 8 התראות לאינסטנס) חוסם הצפה
 *     של תיבת ההודעות גם אם מישהו יעקוף את המגבלה לפי IP מכמה כתובות
 * בפיתוח רק רושמים ללוג — ה-.env המקומי מדבר עם ה-Strapi הייצורי, ואין טעם
 * להציף את תיבת האדמינים בכל באג של פיתוח (זהה להתנהגות ב-hooks.server.ts).
 */
const MAX_BODY_BYTES = 8 * 1024;
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_IN_WINDOW = 5;
const ipHits = new Map<string, number[]>();

function ipAllowed(ip: string): boolean {
    const now = Date.now();
    const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
    if (hits.length >= IP_MAX_IN_WINDOW) {
        ipHits.set(ip, hits);
        return false;
    }
    hits.push(now);
    ipHits.set(ip, hits);
    // ניקוי עצל כדי שהמפה לא תגדל בלי גבול לאורך חיי האינסטנס
    if (ipHits.size > 500) {
        for (const [k, v] of ipHits) if (v.every((t) => now - t >= IP_WINDOW_MS)) ipHits.delete(k);
    }
    return true;
}

/** חיתוך אורך + הסרת שורות חדשות: שדה מהדפדפן לא יזייף שורות בלוג השרת. */
function oneLine(v: unknown, max: number): string {
    return String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, max);
}

export const POST: RequestHandler = async (event) => {
    const ip = event.getClientAddress();
    if (!ipAllowed(ip)) return new Response(null, { status: 429 });

    const raw = await event.request.text().catch(() => '');
    if (!raw || raw.length > MAX_BODY_BYTES) return new Response(null, { status: 400 });

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return new Response(null, { status: 400 });
    }

    // ה-ref מגיע מהלקוח כדי שיתאים למה שהגולש רואה על המסך — אבל רק אם הוא
    // בפורמט שאנחנו מייצרים; אחרת מנפיקים חדש ולא נותנים ללקוח לכתוב ללוג מה שירצה.
    const clientRef = oneLine(body.ref, 8);
    const ref = /^[A-Z0-9]{4,8}$/.test(clientRef) ? clientRef : newErrorRef();

    const statusNum = Number(body.status);
    const status = Number.isFinite(statusNum) ? Math.trunc(statusNum) : 500;
    const path    = oneLine(body.path, 200) || '/';
    const routeId = oneLine(body.routeId, 120) || path;
    const errMsg  = oneLine(body.message, 300) || 'Unknown client error';
    const stackHead = String(body.stack ?? '').split('\n').slice(0, 8).join('\n').slice(0, 1200);

    console.error(`[client-error ${ref}] ${status} "${errMsg}" @ CLIENT ${path} (ip ${ip})`);
    if (stackHead) console.error(stackHead);

    if (process.env.NODE_ENV === 'production') {
        await Promise.race([
            notifySuperAdminsOfError({
                ref,
                status,
                routeId,
                url:    `CLIENT ${path}`,
                path,
                method: 'CLIENT',
                errMsg,
                stackHead,
                origin: 'client',
                getActor: () => resolveActor(event),
            }),
            new Promise<void>((resolve) => setTimeout(resolve, 2500)),
        ]);
    }

    return new Response(null, { status: 204 });
};
