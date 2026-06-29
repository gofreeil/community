// ---- זיכרון טפסים חוצה-דפים (עוגייה) ----
// שומר את הערכים האישיים שהמשתמש כבר מילא פעם אחת, כדי שלא יצטרך
// להקליד אותם שוב בטופס אחר באתר. נשמר בעוגייה (path=/) לשנה.
//
// נשמרים רק שדות שמשמעותם זהה בכל הטפסים (שם, טלפון, איש קשר, קישורים
// וכו'). שדות תוכן ייחודיים לכל מודעה (label/description/...) לא נשמרים כאן -
// להם יש טיוטה נפרדת לכל קטגוריה (add_draft_<category> ב-localStorage).

import { browser } from '$app/environment';

const COOKIE_NAME = 'community_form_memory';
const MAX_AGE = 60 * 60 * 24 * 365; // שנה

// שדות אישיים שחוזרים בין טפסים שונים - אותה משמעות בכל מקום.
export const SHARED_FIELD_KEYS = new Set([
    'nickname',
    'contact',
    'phone',
    'email',
    'address',
    'family_name',
    'matchmaker',
    'website',
    'facebook',
    'instagram',
]);

function readRaw(): Record<string, string> {
    if (!browser) return {};
    try {
        const m = document.cookie.match(/(?:^|;\s*)community_form_memory=([^;]+)/);
        if (!m) return {};
        const parsed = JSON.parse(decodeURIComponent(m[1]));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

/** מחזיר את כל הערכים האישיים השמורים מטפסים קודמים. */
export function getFormMemory(): Record<string, string> {
    return readRaw();
}

/** שומר לעוגייה את הערכים האישיים מתוך אובייקט שדות (רק מה שב-SHARED_FIELD_KEYS ולא ריק). */
export function rememberFields(values: Record<string, string>): void {
    if (!browser) return;
    const current = readRaw();
    let changed = false;
    for (const [key, raw] of Object.entries(values)) {
        if (!SHARED_FIELD_KEYS.has(key)) continue;
        const val = (raw ?? '').trim();
        if (!val) continue;
        if (current[key] !== val) {
            current[key] = val;
            changed = true;
        }
    }
    if (!changed) return;
    try {
        document.cookie =
            `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(current))};path=/;max-age=${MAX_AGE};samesite=lax`;
    } catch {
        /* עוגיות חסומות - מתעלמים בשקט */
    }
}

// ---- Svelte action: use:formMemory על אלמנט <form> ----
// ממלא אוטומטית שדות אישיים ריקים מהעוגייה (לפי שם השדה), ושומר כל שינוי
// בשדות האישיים בחזרה לעוגייה. עובד גם עם inputs רגילים וגם עם bind:value
// (מפעיל אירוע input כדי לסנכרן את ה-state של Svelte).
export function formMemory(node: HTMLElement) {
    if (!browser) return;

    const mem = getFormMemory();
    const selector = 'input[name], textarea[name], select[name]';

    // מילוי ראשוני - רק שדות ריקים, כדי לא לדרוס ערכי פרופיל/עריכה קיימים.
    for (const el of Array.from(node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector))) {
        const name = el.getAttribute('name') ?? '';
        if (SHARED_FIELD_KEYS.has(name) && !el.value && mem[name]) {
            el.value = mem[name];
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    const onInput = (e: Event) => {
        const el = e.target as HTMLInputElement | null;
        const name = el?.getAttribute?.('name') ?? '';
        if (name && SHARED_FIELD_KEYS.has(name)) {
            rememberFields({ [name]: el!.value });
        }
    };

    node.addEventListener('input', onInput, true);
    return {
        destroy() {
            node.removeEventListener('input', onInput, true);
        },
    };
}
