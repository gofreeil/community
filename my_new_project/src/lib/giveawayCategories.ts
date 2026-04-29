export interface GiveawayCategory {
    key: string;
    label: string;
    icon: string;
    color: string;
    keywords: string[];
}

export const giveawayCategories: GiveawayCategory[] = [
    { key: 'all',         label: 'הכל',            icon: '🌍', color: 'orange',  keywords: [] },
    { key: 'furniture',   label: 'ריהוט',          icon: '🛋️', color: 'amber',   keywords: ['ספה', 'כיסא', 'שולחן', 'מיטה', 'ארון', 'מדף', 'ריהוט', 'כורסא', 'שידה', 'מזרן', 'דרגש'] },
    { key: 'electronics', label: 'מוצרי חשמל',     icon: '⚡', color: 'sky',     keywords: ['מקרר', 'תנור', 'מיקרוגל', 'מכונת', 'טלוויזיה', 'מחשב', 'מסך', 'טלפון', 'חשמל', 'שואב', 'קומקום', 'מאוורר', 'מיזוג'] },
    { key: 'baby',        label: 'תינוקות וילדים', icon: '👶', color: 'pink',    keywords: ['תינוק', 'עגלה', 'מיטת תינוק', 'בייבי', 'לול', 'סלקל', 'בגד תינוק', 'מנשא'] },
    { key: 'kids',        label: 'משחקים וצעצועים', icon: '🧸', color: 'fuchsia', keywords: ['משחק', 'צעצוע', 'בובה', 'לגו', 'פאזל', 'משחקי קופסה'] },
    { key: 'clothing',    label: 'ביגוד והנעלה',    icon: '👕', color: 'rose',    keywords: ['חולצה', 'מכנס', 'שמלה', 'מעיל', 'נעל', 'ביגוד', 'מכנסיים', 'גופייה', 'סוודר', 'כובע', 'תיק'] },
    { key: 'books',       label: 'ספרים',          icon: '📚', color: 'emerald', keywords: ['ספר', 'ספרים', 'מילון', 'אנציקלופדיה', 'קומיקס', 'חוברת'] },
    { key: 'kitchen',     label: 'מטבח ובית',      icon: '🍴', color: 'yellow',  keywords: ['מטבח', 'סיר', 'מחבת', 'צלחת', 'כוס', 'סכו"ם', 'כלי בית', 'אגרטל', 'שטיח', 'וילון'] },
    { key: 'tools',       label: 'כלי עבודה',      icon: '🔧', color: 'orange',  keywords: ['כלי עבודה', 'מקדחה', 'פטיש', 'מברגה', 'מסור', 'כלים'] },
    { key: 'sports',      label: 'ספורט ופנאי',    icon: '⚽', color: 'teal',    keywords: ['ספורט', 'אופניים', 'אופנוע', 'כדור', 'משקולות', 'יוגה', 'ריצה', 'אימון', 'גלגיליות'] },
    { key: 'judaica',     label: 'יודאיקה וספרי קודש', icon: '📜', color: 'indigo', keywords: ['גמרא', 'משנה', 'תנ"ך', 'סידור', 'מחזור', 'חומש', 'קודש', 'יהדות', 'מזוזה', 'ציצית', 'תפילין'] },
    { key: 'other',       label: 'אחר',            icon: '📦', color: 'gray',    keywords: [] },
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
