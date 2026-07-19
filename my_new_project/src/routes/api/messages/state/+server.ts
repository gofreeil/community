import { json, type RequestHandler } from '@sveltejs/kit';
import { getDbItemByIdFresh, updateItem } from '$lib/server/db';

// שמירת מצב-הודעה חוצה-מכשירים: "נקרא" / ארכיון / נודניק / הוסתר.
// עד היום המצב נשמר רק ב-localStorage (פר-מכשיר), ולכן משתמש שקרא/הסתיר הודעה
// בנייח ראה אותה שוב כלא-נקראה בנייד. כאן שומרים את המצב על רשומת ההודעה עצמה
// (extra_fields.read/dismissed/snooze_until ו-status='archived') כדי שכל המכשירים יסתנכרנו.
//
// גוף הבקשה: { id, read?, dismissed?, archived?, snooze_until? } — כל שדה אופציונלי,
// מעדכנים רק את מה שנשלח. read/dismissed/snooze_until יושבים על extra_fields (מיזוג,
// לא דריסה); archived ממופה ל-status. הפעולות לא-הרסניות והפיכות (ההודעה נשארת ב-DB).
export const POST: RequestHandler = async ({ request, locals }) => {
    const session = await locals.auth?.();
    if (!session?.user?.id) return json({ error: 'unauthorized' }, { status: 401 });

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, { status: 400 }); }

    const id = String(body?.id ?? '');
    if (!id) return json({ error: 'missing id' }, { status: 400 });

    // שליפה טרייה (לא מה-cache) - חובה במסלול קריאה-שינוי-כתיבה של extra_fields,
    // אחרת עותק ישן מ-cache/אינסטנס אחר עלול למחוק בשקט שדה שנשמר הרגע
    const item = await getDbItemByIdFresh(id);
    // רק הבעלים של ההודעה רשאי לשנות את מצבה
    if (!item || item.category !== 'message' || item.user_id !== String(session.user.id)) {
        return json({ error: 'forbidden' }, { status: 403 });
    }

    let ef: Record<string, unknown> = {};
    try { ef = JSON.parse(item.extra_fields || '{}') ?? {}; } catch { /* הודעה ישנה בלי extra_fields */ }

    const patch: { extra_fields?: Record<string, unknown>; status?: string } = {};
    let efChanged = false;

    if ('read' in body)      { ef.read = !!body.read; efChanged = true; }
    if ('dismissed' in body) { ef.dismissed = !!body.dismissed; efChanged = true; }
    if ('snooze_until' in body) {
        const n = Number(body.snooze_until);
        if (Number.isFinite(n) && n > 0) ef.snooze_until = n;
        else delete ef.snooze_until;
        efChanged = true;
    }
    if ('archived' in body) {
        patch.status = body.archived ? 'archived' : 'active';
    }
    if (efChanged) patch.extra_fields = ef;

    // שום שדה מוכר לא נשלח - אין מה לעדכן (לא שגיאה)
    if (patch.extra_fields === undefined && patch.status === undefined) {
        return json({ ok: true });
    }

    try {
        await updateItem(id, patch);
        return json({ ok: true });
    } catch (e) {
        console.warn('[messages/state] update failed:', e);
        return json({ error: 'update failed' }, { status: 500 });
    }
};
