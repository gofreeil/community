// ---- מודל שעות פתיחה לימים שונים ----
// נשמר כמחרוזת JSON בשדה (למשל extra_fields.hours), עם תאימות לאחור לטקסט חופשי ישן.

export interface DayHours {
    open: boolean;
    from: string; // "HH:MM"
    to: string;   // "HH:MM"
}

export interface OpeningHours {
    /** האם אותן שעות חלות על כל הימים הפתוחים */
    uniform: boolean;
    /** 7 ימים: 0=ראשון(א) ... 6=שבת(ש) */
    days: DayHours[];
}

/** תוויות קצרות עם גרש, לפי אינדקס יום (0=א ... 6=ש) */
export const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
/** תוויות מלאות */
export const DAY_LONG = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function emptyOpeningHours(): OpeningHours {
    return {
        uniform: true,
        days: Array.from({ length: 7 }, (_, i) => ({
            // ברירת מחדל: א׳-ה׳ פתוחים 10:00-18:00, ו׳-שבת סגורים
            open: i <= 4,
            from: '10:00',
            to: '18:00',
        })),
    };
}

/** מנרמל ערך גולמי (JSON או טקסט ישן) לאובייקט OpeningHours, או null אם אינו מובנה */
export function parseOpeningHours(value: unknown): OpeningHours | null {
    if (value == null || value === '') return null;
    if (typeof value === 'object') {
        return normalize(value as Partial<OpeningHours>);
    }
    if (typeof value === 'string') {
        const s = value.trim();
        if (!s.startsWith('{')) return null; // טקסט חופשי ישן - לא מובנה
        try {
            return normalize(JSON.parse(s));
        } catch {
            return null;
        }
    }
    return null;
}

function normalize(raw: Partial<OpeningHours>): OpeningHours {
    const base = emptyOpeningHours();
    const days: Partial<DayHours>[] = Array.isArray(raw.days) ? raw.days : [];
    return {
        uniform: raw.uniform ?? true,
        days: base.days.map((d, i) => {
            const src: Partial<DayHours> = days[i] ?? {};
            return {
                open: typeof src.open === 'boolean' ? src.open : d.open,
                from: typeof src.from === 'string' && src.from ? src.from : d.from,
                to: typeof src.to === 'string' && src.to ? src.to : d.to,
            };
        }),
    };
}

export function serializeOpeningHours(oh: OpeningHours): string {
    return JSON.stringify(oh);
}

/**
 * מחרוזת קריאה בעברית, מקבצת ימים רצופים בעלי שעות זהות לטווח.
 * דוגמה: "א׳–ה׳ 10:00–18:00 · ו׳ 09:00–13:00 · שבת סגור"
 * אם הערך אינו מובנה (טקסט ישן) - מוחזר כמו שהוא.
 */
export function formatOpeningHours(value: unknown): string {
    const oh = parseOpeningHours(value);
    if (!oh) return value == null ? '' : String(value);

    const parts: string[] = [];
    let i = 0;
    while (i < 7) {
        const d = oh.days[i];
        // מצא רצף ימים עם אותו סטטוס ואותן שעות
        let j = i;
        while (
            j + 1 < 7 &&
            oh.days[j + 1].open === d.open &&
            (!d.open || (oh.days[j + 1].from === d.from && oh.days[j + 1].to === d.to))
        ) {
            j++;
        }
        const label = i === j ? DAY_SHORT[i] : `${DAY_SHORT[i]}–${DAY_SHORT[j]}`;
        parts.push(d.open ? `${label} ${d.from}–${d.to}` : `${label} סגור`);
        i = j + 1;
    }
    return parts.join(' · ');
}
