// אוצר-מילים משותף לנושאי הגמ"ח (זהה למפתחות באתר הארצי national-gemach).
// value = key שנשמר ב-Strapi (extra_fields.gmach_type / gmach_types), label = תצוגה בעברית.
export const GMACH_TYPES: { key: string; label: string }[] = [
    { key: 'clothing',    label: '👕 ביגוד' },
    { key: 'baby',        label: '🍼 תינוקות' },
    { key: 'books',       label: '📚 ספרים' },
    { key: 'furniture',   label: '🪑 ריהוט' },
    { key: 'medical',     label: '🏥 ציוד רפואי' },
    { key: 'food',        label: '🥫 מזון' },
    { key: 'tools',       label: '🔧 כלים' },
    { key: 'wedding',     label: '💍 חתונה' },
    { key: 'judaism',     label: '✡️ יהדות' },
    { key: 'initiatives', label: '🌟 מיזמים חשובים לציבור' },
    { key: 'other',       label: '📦 אחר' },
];

const LABEL_BY_KEY = new Map(GMACH_TYPES.map(t => [t.key, t.label]));

/** תווית עברית למפתח נושא גמ"ח (מחזיר את המפתח עצמו אם לא מוכר) */
export function gmachTypeLabel(key: string): string {
    return LABEL_BY_KEY.get(key) ?? key;
}
