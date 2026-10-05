// הצעות שדכנים לשאלון ההתאמה - טיפוסים ותוויות משותפים לשרת ולקליינט.
// ההצעות נשמרות כפריטי Strapi בקטגוריה quiz_suggestion (extra_fields), כמו בקשות השדכנות.

export const QUIZ_SUGGESTION_CATEGORY = 'quiz_suggestion';

export type SuggestionKind = 'edit' | 'remove' | 'comment' | 'add';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'done';
export type SuggestionGender = 'm' | 'f' | 'both';

export const KIND_LABELS: Record<SuggestionKind, string> = {
    edit: '✏️ עריכת ניסוח',
    remove: '🗑️ הסרת שאלה',
    comment: '💬 הערה',
    add: '➕ שאלה חדשה',
};

export const STATUS_LABELS: Record<SuggestionStatus, string> = {
    pending: '⏳ ממתינה',
    accepted: '✅ אושרה',
    rejected: '✖️ נדחתה',
    done: '🛠️ יושמה',
};

export const GENDER_LABELS: Record<SuggestionGender, string> = {
    m: 'נוסח גברים',
    f: 'נוסח נשים',
    both: 'שני המינים',
};

export const MAX_SUGGESTION_TEXT = 1500;

export interface QuizSuggestion {
    id: string;
    userId: string;
    authorName: string;
    kind: SuggestionKind;
    gender: SuggestionGender;
    /** מזהה השאלה בבנק (ריק בהצעת שאלה חדשה) */
    qid: string;
    sectionId: string;
    sectionTitle: string;
    /** נוסח השאלה כפי שנראה לשדכן/ית בעת ההצעה */
    originalText: string;
    text: string;
    status: SuggestionStatus;
    adminNote: string;
    createdAt: string;
    decidedAt: string;
}
