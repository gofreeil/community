// ============================================================
// formGuard - "לחצתי פרסם וכלום לא קרה" לא קורה יותר באתר הזה
// ------------------------------------------------------------
// הבעיה שהוא פותר: כשהדפדפן חוסם שליחת טופס בגלל שדה חובה ריק (required),
// הוא אמור להציג בועה ליד השדה. בפועל הבועה נעלמת תוך שנייה, ובחלק
// מהדפדפנים בנייד (בעיקר iOS Safari) היא לא מוצגת כלל - והמשתמש חווה
// "הכפתור לא נלחץ": שום דבר לא זז, שום הודעה, ואין רמז איזה שדה חסם.
//
// הפתרון: מאזין גלובלי יחיד לאירוע invalid. האירוע הזה נורה על כל שדה
// חוסם ברגע שהדפדפן עוצר שליחה, אך אינו מבעבע - ולכן נתפס ב-capture
// ברמת המסמך. המאזין גולל אל השדה הראשון שחוסם, מבליט אותו באדום,
// ומציג הודעה מפורשת בשפת האתר. נרשם פעם אחת ב-+layout.svelte, ולכן
// מגן על כל טופס באתר - קיים ועתידי - בלי לגעת בטפסים עצמם.
//
// אותה שפה חזותית זמינה גם לוולידציה של הטפסים עצמם דרך revealFieldError:
// כך גם שדה שאינו קלט נטיבי (בורר רחוב/שכונה, פין על מפה) מקבל בדיוק את
// אותו טיפול, ולעולם לא נכשל בשקט כשה-id שהועבר לא קיים בדף.
// ============================================================
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';

const FLASH_CLASS = 'field-error-flash';
const FLASH_MS = 1800;
const BANNER_MS = 7000;

let banner: HTMLDivElement | null = null;
let bannerTimer: ReturnType<typeof setTimeout> | null = null;

// ---- הודעה קבועה בתחתית המסך ----
// בתחתית ולא למעלה בכוונה: כפתור השליחה נמצא בתחתית הטופס, ושם העיניים
// והאצבע של המשתמש ברגע הלחיצה. הודעה בראש עמוד ארוך פשוט לא נראית.
function ensureBanner(): HTMLDivElement {
    if (banner?.isConnected) return banner;
    const el = document.createElement('div');
    el.className = 'form-error-banner';
    el.setAttribute('role', 'alert');
    el.innerHTML =
        '<span class="form-error-banner__icon" aria-hidden="true">⚠️</span>' +
        '<span class="form-error-banner__text"></span>' +
        '<button type="button" class="form-error-banner__close"></button>';
    el.querySelector('.form-error-banner__close')?.addEventListener('click', clearFormError);
    document.body.appendChild(el);
    banner = el;
    return el;
}

/** מסיר את הודעת השגיאה הצפה (אם מוצגת) */
export function clearFormError(): void {
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    banner?.remove();
    banner = null;
}

/** מציג הודעת שגיאה צפה בתחתית המסך. נעלמת לבד, או בלחיצה על ✕ */
export function showFormError(message: string): void {
    if (typeof document === 'undefined' || !message) return;
    const el = ensureBanner();
    el.dir = document.documentElement.dir || 'rtl';
    const text = el.querySelector('.form-error-banner__text');
    if (text) text.textContent = message;
    const close = el.querySelector('.form-error-banner__close');
    if (close) {
        close.textContent = '✕';
        close.setAttribute('aria-label', tr('chrome.close', 'סגור'));
    }
    // הנפשת כניסה מחדש גם כשההודעה כבר מוצגת - שיהיה ברור שנלחץ שוב
    el.classList.remove('form-error-banner--in');
    void el.offsetWidth;
    el.classList.add('form-error-banner--in');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(clearFormError, BANNER_MS);
}

/**
 * מפנה את המשתמש אל השדה שחוסם: גלילה אליו, הבהוב אדום, פוקוס, והודעה.
 * לעולם לא נכשל בשקט - גם כשהאלמנט לא נמצא (id שגוי, שדה שאינו קלט
 * נטיבי, שדה שעדיין לא רונדר) ההודעה עצמה תמיד מוצגת.
 */
export function revealFieldError(target: string | Element | null | undefined, message: string): void {
    if (typeof document === 'undefined') return;
    showFormError(message);

    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!(el instanceof HTMLElement)) return;

    // שדה מוסתר לגמרי (display:none) - אין לאן לגלול; ההודעה כבר הוצגה
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;

    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* דפדפן ישן */ }
    el.classList.add(FLASH_CLASS);
    setTimeout(() => el.classList.remove(FLASH_CLASS), FLASH_MS);
    // פוקוס אחרי שהגלילה נרגעה. לא על העלאת קובץ - פתיחת בורר קבצים מעצמה
    // תיראה למשתמש כתקלה ולא כהכוונה.
    if (!(el instanceof HTMLInputElement && el.type === 'file')) {
        setTimeout(() => { try { el.focus({ preventScroll: true }); } catch { /* לא מקבל פוקוס */ } }, 300);
    }
}

// ---- זיהוי שם השדה מתוך ה-DOM ----
// כדי שההודעה תגיד "יש למלא את השדה מספר בניין" ולא "שדה חובה חסר".
function clean(s: string): string {
    return s.replace(/\s+/g, ' ').replace(/[:*]\s*$/, '').trim();
}

function fieldLabel(el: HTMLElement): string {
    if (el.id) {
        try {
            const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lab?.textContent && clean(lab.textContent)) return clean(lab.textContent);
        } catch { /* id לא חוקי כסלקטור */ }
    }
    const aria = el.getAttribute('aria-label');
    if (aria && clean(aria)) return clean(aria);
    const ph = (el as HTMLInputElement).placeholder;
    if (ph && clean(ph)) return clean(ph);
    const wrap = el.closest('label');
    if (wrap?.textContent && clean(wrap.textContent)) return clean(wrap.textContent);
    return '';
}

function tr(key: string, fallback: string, values?: Record<string, string>): string {
    try {
        const out = get(_)(key, values ? { values } : undefined);
        // svelte-i18n מחזיר את המפתח עצמו כשאין תרגום - עדיף נוסח קשיח מאשר מפתח
        return out && out !== key ? out : fallback;
    } catch {
        return fallback;
    }
}

function messageFor(el: HTMLElement): string {
    const v = (el as HTMLInputElement).validity;
    const label = fieldLabel(el);
    if (!label) return tr('errors.field_required_generic', 'יש למלא את השדה המסומן באדום');
    if (v?.valueMissing) {
        return el.tagName === 'SELECT'
            ? tr('errors.field_choose', `יש לבחור ${label}`, { field: label })
            : tr('errors.field_required', `יש למלא את השדה ${label}`, { field: label });
    }
    return tr('errors.field_invalid', `הערך בשדה ${label} אינו תקין`, { field: label });
}

/**
 * רושם את ההגנה הגלובלית. מוחזרת פונקציית ניקוי (לשימוש ב-$effect).
 * בטוח לקריאה חוזרת - רישום כפול מוסר בניקוי של המופע הקודם.
 */
export function installFormGuard(): () => void {
    if (typeof document === 'undefined') return () => {};

    // הדפדפן יורה invalid על כל שדה חוסם ברצף סינכרוני אחד. מטפלים רק
    // בראשון (הוא גם הראשון בטופס) - שתי הודעות/גלילות היו רק מבלבלות.
    let handledThisBatch = false;

    const onInvalid = (e: Event) => {
        const el = e.target;
        if (!(el instanceof HTMLElement)) return;
        // מחליפים את הבועה הנטיבית (חמקמקה, ולעיתים לא מוצגת כלל בנייד)
        e.preventDefault();
        if (handledThisBatch) return;
        handledThisBatch = true;
        queueMicrotask(() => { handledThisBatch = false; });
        revealFieldError(el, messageFor(el));
    };

    // שליחה שהצליחה / ניווט - ההודעה הישנה כבר לא רלוונטית
    const onSubmit = () => clearFormError();

    document.addEventListener('invalid', onInvalid, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
        document.removeEventListener('invalid', onInvalid, true);
        document.removeEventListener('submit', onSubmit, true);
        clearFormError();
    };
}
