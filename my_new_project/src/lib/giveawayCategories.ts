export interface GiveawayCategory {
    key: string;
    label: string;
    icon: string;
    color: string;
    keywords: string[];
    /** תמונת ברירת מחדל לקטגוריה */
    image: string;
}

const UNSPLASH = (id: string, w = 600) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;
const LOCAL = (name: string) => `/images/categories/${name}`;

/** מיפוי מפתחות ישנים שיושבים כבר בבסיס הנתונים (extra_fields.category) למפתחות הנוכחיים. */
const LEGACY_KEY_MAP: Record<string, string> = {
    books: 'judaica_books',
    judaica: 'judaica_books',
};

export const giveawayCategories: GiveawayCategory[] = [
    { key: 'all',           label: 'הכל',            icon: '🌍', color: 'orange',  keywords: [],
      image: LOCAL('all.jpg') },
    { key: 'furniture',     label: 'ריהוט',          icon: '🛋️', color: 'amber',   keywords: ['ספה', 'כיסא', 'שולחן', 'מיטה', 'ארון', 'מדף', 'ריהוט', 'כורסא', 'שידה', 'מזרן', 'דרגש'],
      image: LOCAL('furniture.jpg') },
    { key: 'electronics',   label: 'מוצרי חשמל',     icon: '⚡', color: 'sky',     keywords: ['מקרר', 'תנור', 'מיקרוגל', 'מכונת', 'טלוויזיה', 'מחשב', 'מסך', 'טלפון', 'חשמל', 'שואב', 'קומקום', 'מאוורר', 'מיזוג'],
      image: LOCAL('electronics.jpg') },
    { key: 'baby',          label: 'תינוקות וילדים', icon: '👶', color: 'pink',    keywords: ['תינוק', 'עגלה', 'מיטת תינוק', 'בייבי', 'לול', 'סלקל', 'בגד תינוק', 'מנשא'],
      image: LOCAL('baby.jpg') },
    { key: 'kids',          label: 'משחקים וצעצועים', icon: '🧸', color: 'fuchsia', keywords: ['משחק', 'צעצוע', 'בובה', 'לגו', 'פאזל', 'משחקי קופסה'],
      image: LOCAL('kids.jpg') },
    { key: 'clothing',      label: 'ביגוד והנעלה',    icon: '👕', color: 'rose',    keywords: ['חולצה', 'מכנס', 'שמלה', 'מעיל', 'נעל', 'ביגוד', 'מכנסיים', 'גופייה', 'סוודר', 'כובע', 'תיק'],
      image: LOCAL('clothing.jpg') },
    { key: 'judaica_books', label: 'יודיקא וספרים',  icon: '📜', color: 'indigo',
      keywords: ['ספר', 'ספרים', 'מילון', 'אנציקלופדיה', 'קומיקס', 'חוברת', 'גמרא', 'משנה', 'תנ"ך', 'סידור', 'מחזור', 'חומש', 'קודש', 'יהדות', 'מזוזה', 'ציצית', 'תפילין'],
      image: LOCAL('judaica_books.jpg') },
    { key: 'kitchen',       label: 'מטבח ובית',      icon: '🍴', color: 'yellow',  keywords: ['מטבח', 'סיר', 'מחבת', 'צלחת', 'כוס', 'סכו"ם', 'כלי בית', 'אגרטל', 'שטיח', 'וילון'],
      image: LOCAL('kitchen.jpg') },
    { key: 'tools',         label: 'כלי עבודה',      icon: '🔧', color: 'orange',  keywords: ['כלי עבודה', 'מקדחה', 'פטיש', 'מברגה', 'מסור', 'כלים'],
      image: LOCAL('tools.jpg') },
    { key: 'garden',        label: 'גינון',          icon: '🌱', color: 'green',
      keywords: ['עציץ', 'עציצים', 'צמח', 'צמחים', 'פרח', 'פרחים', 'גינה', 'מרפסת', 'מריצה', 'אדנית', 'מזלף', 'שתיל', 'חצר', 'דשא', 'גינון'],
      image: LOCAL('garden.jpg') },
    { key: 'sports',        label: 'ספורט ופנאי',    icon: '⚽', color: 'teal',    keywords: ['ספורט', 'אופניים', 'אופנוע', 'כדור', 'משקולות', 'יוגה', 'ריצה', 'אימון', 'גלגיליות'],
      image: LOCAL('sports.jpg') },
    { key: 'other',         label: 'אחר',            icon: '📦', color: 'gray',    keywords: [],
      image: UNSPLASH('photo-1607082348824-0a96f2a4b9da') },
];

/** מנרמל מפתח קטגוריה — תומך גם בנתונים ישנים שנשמרו לפני המיזוג. */
function normalizeKey(key: string | undefined): string | undefined {
    if (!key) return undefined;
    return LEGACY_KEY_MAP[key] ?? key;
}

export function detectCategory(input: { label?: string; description?: string; tags?: string[]; explicit?: string }): string {
    const explicit = normalizeKey(input.explicit);
    if (explicit && giveawayCategories.some(c => c.key === explicit)) {
        return explicit;
    }
    const haystack = [
        input.label ?? '',
        input.description ?? '',
        ...(input.tags ?? []),
    ].join(' ').toLowerCase();
    if (!haystack.trim()) return 'other';
    for (const cat of giveawayCategories) {
        if (cat.key === 'all' || cat.key === 'other') continue;
        if (cat.keywords.some(k => haystack.includes(k.toLowerCase()))) {
            return cat.key;
        }
    }
    return 'other';
}

export function categoryByKey(key: string): GiveawayCategory | undefined {
    return giveawayCategories.find(c => c.key === normalizeKey(key));
}
