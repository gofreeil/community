// ---- מודל שעות פתיחה לימים שונים ----
// נשמר כמחרוזת JSON בשדה (למשל extra_fields.hours), עם תאימות לאחור לטקסט חופשי ישן
// ולפורמט הישן של טווח בודד ליום ({from,to} במקום ranges[]).

export interface TimeRange {
    from: string; // "HH:MM"
    to: string;   // "HH:MM"
}

export interface DayHours {
    open: boolean;
    /** טווחי שעות ליום — למשל בוקר וערב. לפחות טווח אחד */
    ranges: TimeRange[];
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
            ranges: [{ from: '10:00', to: '18:00' }],
        })),
    };
}

/** מציע טווח המשך אחרי הטווח האחרון (למשל 10:00–18:00 → 19:00–21:00) */
export function nextRangeAfter(last: TimeRange | undefined): TimeRange {
    const toMin = (s: string) => {
        const [h, m] = s.split(':').map(Number);
        return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };
    const toStr = (min: number) => {
        const clamped = Math.min(min, 23 * 60 + 59);
        return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
    };
    const start = last ? toMin(last.to) + 60 : 19 * 60;
    return { from: toStr(start), to: toStr(start + 120) };
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

type LegacyDay = Partial<DayHours> & { from?: string; to?: string };

function normalizeRanges(src: LegacyDay, fallback: TimeRange[]): TimeRange[] {
    if (Array.isArray(src.ranges)) {
        const clean = src.ranges
            .filter((r) => r && typeof r.from === 'string' && typeof r.to === 'string')
            .map((r) => ({ from: r.from, to: r.to }));
        if (clean.length) return clean;
    }
    // פורמט ישן: from/to ישירות על היום
    if (typeof src.from === 'string' && src.from && typeof src.to === 'string' && src.to) {
        return [{ from: src.from, to: src.to }];
    }
    return fallback.map((r) => ({ ...r }));
}

function normalize(raw: Partial<OpeningHours>): OpeningHours {
    const base = emptyOpeningHours();
    const days: LegacyDay[] = Array.isArray(raw.days) ? raw.days : [];
    return {
        uniform: raw.uniform ?? true,
        days: base.days.map((d, i) => {
            const src: LegacyDay = days[i] ?? {};
            return {
                open: typeof src.open === 'boolean' ? src.open : d.open,
                ranges: normalizeRanges(src, d.ranges),
            };
        }),
    };
}

export function serializeOpeningHours(oh: OpeningHours): string {
    return JSON.stringify(oh);
}

function formatRanges(ranges: TimeRange[]): string {
    return ranges.map((r) => `${r.from}–${r.to}`).join(', ');
}

/**
 * שורות תצוגה קריאות, מקבצות ימים רצופים בעלי שעות זהות לטווח - שורה לכל קבוצה.
 * דוגמה: ["א׳–ה׳ 10:00–18:00", "ו׳ 09:00–13:00, 16:00–18:00", "שבת סגור"]
 * אם הערך אינו מובנה (טקסט ישן) - מוחזר כשורה אחת כמו שהוא.
 */
export function formatOpeningHoursLines(
    value: unknown,
    // תוויות תצוגה מתורגמות (אופציונלי) - ברירת מחדל עברית כ-fallback.
    // days = 7 שמות ימים קצרים; closed = המילה "סגור".
    opts?: { days?: string[]; closed?: string },
): string[] {
    const oh = parseOpeningHours(value);
    if (!oh) {
        const s = value == null ? '' : String(value);
        return s.trim() ? [s] : [];
    }

    const dayNames = opts?.days && opts.days.length === 7 ? opts.days : DAY_SHORT;
    const closedWord = opts?.closed ?? 'סגור';

    const keyOf = (d: DayHours) => (d.open ? formatRanges(d.ranges) : 'closed');
    const parts: string[] = [];
    let i = 0;
    while (i < 7) {
        const d = oh.days[i];
        // מצא רצף ימים עם אותו סטטוס ואותן שעות
        let j = i;
        while (j + 1 < 7 && keyOf(oh.days[j + 1]) === keyOf(d)) {
            j++;
        }
        const label = i === j ? dayNames[i] : `${dayNames[i]}–${dayNames[j]}`;
        parts.push(d.open ? `${label} ${formatRanges(d.ranges)}` : `${label} ${closedWord}`);
        i = j + 1;
    }
    return parts;
}

/** גרסת שורה-אחת (מופרדת ב-·) - לתצוגות צפופות ולתאימות לאחור */
export function formatOpeningHours(
    value: unknown,
    opts?: { days?: string[]; closed?: string },
): string {
    return formatOpeningHoursLines(value, opts).join(' · ');
}

/** מספר דקות מחצות עבור "HH:MM" (חסין לערכים לא-תקינים) */
function hhmmToMinutes(s: string): number {
    const [h, m] = String(s).split(':').map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * האם הנכס פתוח כרגע לפי שעות הפתיחה המובנות.
 * מחזיר:
 *   null  – אין שעות מובנות (טקסט חופשי ישן / ריק) → אין להסיק פתוח/סגור
 *   true  – פתוח כרגע
 *   false – סגור כרגע
 * תומך בטווח שחוצה חצות (למשל 22:00–02:00): החלק שלפני חצות מיוחס ליום ההתחלה,
 * וההמשך שאחרי חצות נבדק גם מול היום הקודם.
 * @param now לבדיקות/דטרמיניזם – ברירת מחדל הזמן הנוכחי.
 */
export function isOpenNow(value: unknown, now: Date = new Date()): boolean | null {
    const oh = parseOpeningHours(value);
    if (!oh) return null;

    const day = now.getDay();                          // 0=ראשון ... 6=שבת — תואם ל-days[]
    const mins = now.getHours() * 60 + now.getMinutes();

    // טווח רגיל (to>from): [from,to). טווח שחוצה חצות (to<=from): מ-from עד חצות.
    const openTodayIn = (d: DayHours | undefined): boolean =>
        !!d?.open && d.ranges.some((r) => {
            const from = hhmmToMinutes(r.from);
            const to = hhmmToMinutes(r.to);
            return to > from ? mins >= from && mins < to : mins >= from;
        });

    if (openTodayIn(oh.days[day])) return true;

    // המשך טווח-לילה שהתחיל אתמול (22:00–02:00 → פתוח גם ב-01:00 של היום הבא)
    const prev = oh.days[(day + 6) % 7];
    if (prev?.open && prev.ranges.some((r) => {
        const from = hhmmToMinutes(r.from);
        const to = hhmmToMinutes(r.to);
        return to <= from && mins < to;
    })) return true;

    return false;
}
