// ---- אנשי קשר נוספים לפריט ----
// כל פריט באתר נושא איש קשר ראשי (contact + phone ברמה העליונה). מעבר לזה
// המפרסם יכול להוסיף עוד אנשי קשר בכפתור "+" בטופס ההוספה של כל קטגוריה.
// הרשימה נשמרת ב-extra_fields.extra_contacts כמחרוזת JSON, כדי שתעבור גם
// בטפסים שמגישים FormData (hidden input) וגם ב-JSON של /api/items.

export interface ExtraContact {
    /** שם איש הקשר (למשל "רות" / "מחסן הגמ\"ח") */
    name: string;
    /** מספר טלפון */
    phone: string;
}

/** המפתח ב-extra_fields שבו נשמרת הרשימה */
export const EXTRA_CONTACTS_KEY = 'extra_contacts';

/** תקרה כדי שהכרטיס לא יתפוצץ - איש קשר ראשי + עוד ארבעה */
export const MAX_EXTRA_CONTACTS = 4;

function clean(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * קורא רשימת אנשי קשר מכל צורה שבה היא עלולה להגיע: מערך אובייקטים
 * (extra_fields שכבר עבר JSON.parse) או מחרוזת JSON (כפי שנשלחה מהטופס).
 * מסנן רשומות ריקות - איש קשר בלי שם ובלי טלפון אינו איש קשר.
 */
export function parseExtraContacts(raw: unknown): ExtraContact[] {
    let source: unknown = raw;
    if (typeof source === 'string') {
        const trimmed = source.trim();
        if (!trimmed) return [];
        try {
            source = JSON.parse(trimmed);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(source)) return [];
    return source
        .map((entry) => {
            const obj = (entry ?? {}) as Record<string, unknown>;
            return { name: clean(obj.name), phone: clean(obj.phone) };
        })
        .filter((c) => c.name || c.phone)
        .slice(0, MAX_EXTRA_CONTACTS);
}

/** מחרוזת JSON לשמירה. רשימה ריקה מוחזרת כ-'' כדי לא לשמור "[]" מיותר. */
export function serializeExtraContacts(list: ExtraContact[]): string {
    const cleaned = parseExtraContacts(list);
    return cleaned.length ? JSON.stringify(cleaned) : '';
}

/**
 * שולף את אנשי הקשר הנוספים מתוך extra_fields של פריט - בין אם הוא כבר אובייקט
 * (דפים שמקבלים פריט מפוענח) ובין אם הוא מחרוזת JSON גולמית מהדאטהבייס.
 */
export function extraContactsOf(extraFields: unknown): ExtraContact[] {
    let ef: unknown = extraFields;
    if (typeof ef === 'string') {
        const trimmed = ef.trim();
        if (!trimmed) return [];
        try { ef = JSON.parse(trimmed); } catch { return []; }
    }
    if (!ef || typeof ef !== 'object') return [];
    return parseExtraContacts((ef as Record<string, unknown>)[EXTRA_CONTACTS_KEY]);
}

/**
 * מקטע extra_fields מוכן לפריסה (spread) בפעולות השרת:
 * `...extraContactsPatch(fd.get(EXTRA_CONTACTS_KEY))`.
 * רשימה ריקה מחזירה אובייקט ריק - כדי לא לכתוב מפתח מיותר לפריט.
 */
export function extraContactsPatch(raw: unknown): Record<string, ExtraContact[]> {
    const list = parseExtraContacts(raw);
    return list.length ? { [EXTRA_CONTACTS_KEY]: list } : {};
}

/** קריאה נוחה מתוך FormData של טופס (hidden input בשם extra_contacts). */
export function extraContactsFromForm(fd: FormData): ExtraContact[] {
    return parseExtraContacts(fd.get(EXTRA_CONTACTS_KEY)?.toString() ?? '');
}
