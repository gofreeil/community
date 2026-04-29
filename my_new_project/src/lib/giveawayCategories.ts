export interface GiveawayCategory {
    key: string;
    label: string;
    icon: string;
    color: string;
    keywords: string[];
    /** תמונת ברירת מחדל לקטגוריה (Unsplash) */
    image: string;
}

const UNSPLASH = (id: string, w = 600) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

export const giveawayCategories: GiveawayCategory[] = [
    { key: 'all',         label: 'הכל',            icon: '🌍', color: 'orange',  keywords: [],
      image: UNSPLASH('photo-1607082348824-0a96f2a4b9da') },
    { key: 'furniture',   label: 'ריהוט',          icon: '🛋️', color: 'amber',   keywords: ['ספה', 'כיסא', 'שולחן', 'מיטה', 'ארון', 'מדף', 'ריהוט', 'כורסא', 'שידה', 'מזרן', 'דרגש'],
      image: UNSPLASH('photo-1555041469-a586c61ea9bc') },
    { key: 'electronics', label: 'מוצרי חשמל',     icon: '⚡', color: 'sky',     keywords: ['מקרר', 'תנור', 'מיקרוגל', 'מכונת', 'טלוויזיה', 'מחשב', 'מסך', 'טלפון', 'חשמל', 'שואב', 'קומקום', 'מאוורר', 'מיזוג'],
      image: UNSPLASH('photo-1556909114-f6e7ad7d3136') },
    { key: 'baby',        label: 'תינוקות וילדים', icon: '👶', color: 'pink',    keywords: ['תינוק', 'עגלה', 'מיטת תינוק', 'בייבי', 'לול', 'סלקל', 'בגד תינוק', 'מנשא'],
      image: UNSPLASH('photo-1515488042361-ee00e0ddd4e4') },
    { key: 'kids',        label: 'משחקים וצעצועים', icon: '🧸', color: 'fuchsia', keywords: ['משחק', 'צעצוע', 'בובה', 'לגו', 'פאזל', 'משחקי קופסה'],
      image: UNSPLASH('photo-1558877385-1ba9b7c46c54') },
    { key: 'clothing',    label: 'ביגוד והנעלה',    icon: '👕', color: 'rose',    keywords: ['חולצה', 'מכנס', 'שמלה', 'מעיל', 'נעל', 'ביגוד', 'מכנסיים', 'גופייה', 'סוודר', 'כובע', 'תיק'],
      image: UNSPLASH('photo-1489987707025-afc232f7ea0f') },
    { key: 'books',       label: 'ספרים',          icon: '📚', color: 'emerald', keywords: ['ספר', 'ספרים', 'מילון', 'אנציקלופדיה', 'קומיקס', 'חוברת'],
      image: UNSPLASH('photo-1497633762265-9d179a990aa6') },
    { key: 'kitchen',     label: 'מטבח ובית',      icon: '🍴', color: 'yellow',  keywords: ['מטבח', 'סיר', 'מחבת', 'צלחת', 'כוס', 'סכו"ם', 'כלי בית', 'אגרטל', 'שטיח', 'וילון'],
      image: UNSPLASH('photo-1556909114-f6e7ad7d3136') },
    { key: 'tools',       label: 'כלי עבודה',      icon: '🔧', color: 'orange',  keywords: ['כלי עבודה', 'מקדחה', 'פטיש', 'מברגה', 'מסור', 'כלים'],
      image: UNSPLASH('photo-1530124566582-a618bc2615dc') },
    { key: 'sports',      label: 'ספורט ופנאי',    icon: '⚽', color: 'teal',    keywords: ['ספורט', 'אופניים', 'אופנוע', 'כדור', 'משקולות', 'יוגה', 'ריצה', 'אימון', 'גלגיליות'],
      image: UNSPLASH('photo-1517649763962-0c623066013b') },
    { key: 'judaica',     label: 'יודאיקה וספרי קודש', icon: '📜', color: 'indigo', keywords: ['גמרא', 'משנה', 'תנ"ך', 'סידור', 'מחזור', 'חומש', 'קודש', 'יהדות', 'מזוזה', 'ציצית', 'תפילין'],
      image: UNSPLASH('photo-1604544648021-dc2a84f8ec4d') },
    { key: 'other',       label: 'אחר',            icon: '📦', color: 'gray',    keywords: [],
      image: UNSPLASH('photo-1607082348824-0a96f2a4b9da') },
];

export function detectCategory(input: { label?: string; description?: string; tags?: string[]; explicit?: string }): string {
    if (input.explicit && giveawayCategories.some(c => c.key === input.explicit)) {
        return input.explicit!;
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
    return giveawayCategories.find(c => c.key === key);
}
