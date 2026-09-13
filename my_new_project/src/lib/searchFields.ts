// ============================================================
// שדות חיפוש לפריטים - איזה טקסטים נכנסים ל"ערימת החיפוש" של פריט.
//
// למה: פריט שומר את הקטגוריה כמזהה לוגי (למשל "gemachim"), אבל המשתמש מקליד
// את התווית שהוא רואה ("גמחים" / "Gemachim"). כדי שחיפוש "גמח" ימצא פריטים
// בקטגוריה גם כשהמילה לא מופיעה בכותרת, מוסיפים לשדות החיפוש את תוויות
// הקטגוריה מהמילון של המפה (map.cat_<id>). הקובץ בטוח ללקוח - מייבא רק את
// מילון התרגומים (אובייקטים סטטיים), בלי שום תלות בשרת.
// ============================================================

import { he as mapHe, en as mapEn } from './translations/map';

/** מזהה קטגוריה → מפתח תרגום, בדיוק כמו catKey() ב-JerusalemMap.svelte
 *  ("for-kids" → "cat_for_kids"). */
function catKey(id: string): string {
    return 'cat_' + id.replace(/-/g, '_');
}

const HE_CATS = mapHe.map as Record<string, string>;
const EN_CATS = mapEn.map as Record<string, string>;

/**
 * תוויות התצוגה (עברית + אנגלית) של מזהה קטגוריה, בתוספת המזהה הגולמי עצמו.
 * מזהה לא מוכר → [id]; ריק/חסר → [].
 */
export function categoryLabelsForSearch(categoryId: string | null | undefined): string[] {
    if (!categoryId) return [];
    const key = catKey(categoryId);
    const out: string[] = [];
    const heLabel = HE_CATS[key];
    const enLabel = EN_CATS[key];
    if (heLabel) out.push(heLabel);
    if (enLabel) out.push(enLabel);
    out.push(categoryId);
    return out;
}

export interface SearchableItem {
    label?: string | null;
    description?: string | null;
    category?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    address?: string | null;
}

/**
 * שדות החיפוש של פריט בסדר קבוע: הכותרת ראשונה (מקבלת את משקל הכותרת
 * באוצר המילים של heSearch), אחריה תוויות הקטגוריה, התיאור והמיקום.
 *
 * @example heSearch(q, items, itemSearchFields)
 */
export function itemSearchFields(item: SearchableItem): (string | null | undefined)[] {
    return [
        item.label,
        ...categoryLabelsForSearch(item.category),
        item.description,
        item.address,
        item.neighborhood,
        item.city,
    ];
}
