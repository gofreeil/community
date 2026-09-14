// ============================================================
// userNotifications.ts - התראת ניהול על משתמש חדש שנרשם
// ------------------------------------------------------------
// עד עכשיו הרשמה של משתמש חדש לא הודיעה לאף מנהל: לא בטופס ההרשמה
// ולא בכניסה ראשונה דרך Google/Facebook. כל אדמין מקבל עותק משלו של
// ההודעה (כמו בקשות פרסום/רכזים), עם קישור לכרטיס המשתמש בניהול.
// best-effort: כשל כאן לעולם לא מפיל את ההרשמה עצמה.
// ============================================================

import { createItem, getAllAdminRecipients } from './db.js';

const PROVIDER_LABEL: Record<string, string> = {
    local:       'טופס הרשמה (אימייל + סיסמה)',
    credentials: 'טופס הרשמה (אימייל + סיסמה)',
    google:      'Google',
    facebook:    'Facebook',
};

export async function notifyAdminsNewUser(u: {
    id: string;
    name?: string | null;
    email?: string | null;
    provider?: string | null;
}): Promise<void> {
    try {
        const admins = await getAllAdminRecipients();
        if (admins.length === 0) return;
        const name  = (u.name ?? '').trim() || (u.email ?? '').trim() || u.id;
        const how   = PROVIDER_LABEL[(u.provider ?? '').toLowerCase()] ?? (u.provider || 'לא ידוע');
        const link  = `/admin/users/${encodeURIComponent(u.id)}`;
        await Promise.all(admins.map(admin => createItem({
            category:    'message',
            label:       `👤 משתמש/ת חדש/ה נרשם/ה: ${name}`,
            description:
                `${name} הצטרף/ה עכשיו לאתר.\n` +
                (u.email ? `אימייל: ${u.email}\n` : '') +
                `דרך: ${how}\n\n` +
                `לחיצה על הכרטיס פותחת את עמוד המשתמש/ת בניהול.`,
            icon:        '👤',
            color:       'green',
            user_id:     admin.id,
            extra_fields: {
                type:          'new_user',
                new_user_id:   u.id,
                new_user_name: name,
                provider:      u.provider ?? '',
                link,
            },
        }).catch(e => console.warn('[userNotifications] createItem failed for admin', admin.id, e instanceof Error ? e.message : e))));
    } catch (e) {
        console.warn('[userNotifications] notifyAdminsNewUser failed:', e instanceof Error ? e.message : e);
    }
}
