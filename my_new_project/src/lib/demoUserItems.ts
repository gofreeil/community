// ============================================================
// demoUserItems.ts — פריטי דמו פיקטיביים למסירה
//
// משמש לתצוגה ציבורית ולדף "הפריטים שלי" — מוזרק ב-page.server.ts.
// בעת ריצה ה-user_id מוחלף ב-id של המשתמש המחובר כדי שהפריטים
// יופיעו כאילו הוא יצר אותם (כולל סימן "שלי" וכפתורי ניהול).
// ============================================================

import type { DbItem } from './server/db';

interface DemoItemSpec {
    id: string;
    label: string;
    description: string;
    address: string;
    phone: string;
    contact: string;
    condition: 'כחדש' | 'משומש' | 'דורש תיקון קל';
    category: string;
    price?: number;
    images: string[];
    tags?: string[];
    daysAgo: number;
    viewCount: number;
}

const DEMO_SPECS: DemoItemSpec[] = [
    {
        id: 'demo-armchair',
        label: 'כורסא נוחה דמוי-עור',
        description:
            'כורסא יחיד דמוי-עור צבע חום שוקולד, נוחה במיוחד לקריאה ולסלון. במצב כמעט חדש — בשימוש פחות משנה, נמסרת חינם בעקבות שיפוץ הסלון. ניתן לראות בתיאום מראש.',
        address: 'רחוב הפסגה 14, קרית משה',
        phone: '054-1234567',
        contact: 'יוסי',
        condition: 'כחדש',
        category: 'furniture',
        images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&q=80&auto=format&fit=crop',
        ],
        tags: ['כורסא', 'סלון', 'ריהוט'],
        daysAgo: 1,
        viewCount: 47,
    },
    {
        id: 'demo-mini-fridge',
        label: 'מקרר משרד / סטודנטים — 90 ליטר',
        description:
            'מקרר חד-דלת קומפקטי במצב עבודה מצוין, מתאים למשרד / חדר סטודנטים / מרפסת. צריכת חשמל נמוכה, שקט יחסית. כולל מגירת ירקות ומקפיא קטן בפנים.',
        address: 'רחוב בית הדפוס 22, גבעת שאול',
        phone: '052-7654321',
        contact: 'יוסי',
        condition: 'משומש',
        category: 'electronics',
        price: 120,
        images: [
            '/images/categories/electronics.jpg',
        ],
        tags: ['מקרר', 'מטבח', 'חשמל'],
        daysAgo: 3,
        viewCount: 132,
    },
    {
        id: 'demo-stroller',
        label: 'עגלת תינוק טיולון משולבת',
        description:
            'עגלה משולבת (סלקל + טיולון) במצב מצוין, נשמרה היטב. מתקפלת בקלות, גלגלים סובבים, גגון רחב, סל אחסון תחתון. שירתה תינוק אחד בלבד עד גיל שנתיים.',
        address: 'שדרות הרצל 50, קרית משה',
        phone: '054-1234567',
        contact: 'יוסי ואשתי',
        condition: 'כחדש',
        category: 'baby',
        price: 250,
        images: [
            '/images/categories/baby.jpg',
        ],
        tags: ['עגלה', 'תינוק', 'טיולון'],
        daysAgo: 5,
        viewCount: 89,
    },
    {
        id: 'demo-shas',
        label: 'ש"ס וילנא מהדורה ישנה — 20 כרכים',
        description:
            'סט ש"ס וילנא שלם, 20 כרכים בכריכה קשה. סימני שימוש קלים בשוליים אך הדפים נקיים וקריאים לחלוטין. מתאים למי שמחפש סט ראשון ללימוד או לישיבה. נמסר חינם — חבל שיתעלם.',
        address: 'בית כנסת "אהל יוסף", קרית משה',
        phone: '054-1234567',
        contact: 'יוסי',
        condition: 'משומש',
        category: 'judaica_books',
        images: [
            'https://images.unsplash.com/photo-1602536052359-ef94c21c5948?w=900&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&q=80&auto=format&fit=crop',
        ],
        tags: ['ש"ס', 'גמרא', 'ספרי קודש', 'יודאיקא'],
        daysAgo: 7,
        viewCount: 215,
    },
    {
        id: 'demo-lego',
        label: 'לגו סיטי — 4 ערכות (סה"כ ~1200 חלקים)',
        description:
            'אוסף ערכות לגו סיטי — תחנת כיבוי אש, מרכז משטרה, גרר ומסוק. כל החלקים נספרו ונארזו בשקיות קוד. רק 2 חלקים חסרים מהמקור (לא קריטי). הוראות הבנייה כלולות ב-PDF.',
        address: 'רחוב הפסגה 14, קרית משה',
        phone: '054-1234567',
        contact: 'יוסי',
        condition: 'משומש',
        category: 'kids',
        price: 80,
        images: [
            'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=900&q=80&auto=format&fit=crop',
        ],
        tags: ['לגו', 'משחק', 'ילדים', 'צעצוע'],
        daysAgo: 10,
        viewCount: 64,
    },
    {
        id: 'demo-dishes',
        label: 'מערכת כלי אוכל פורצלן ל-12 סועדים',
        description:
            'מערכת כלי אוכל לבנה קלאסית, פורצלן איכותי. כוללת: 12 צלחות אוכל, 12 קטנות, 12 קעריות מרק, 4 קעריות הגשה. ללא שברים, ללא סדקים. נמסרת חינם — קיבלנו מתנה ויש לנו כבר.',
        address: 'רחוב בית הדפוס 22, גבעת שאול',
        phone: '054-1234567',
        contact: 'יוסי',
        condition: 'כחדש',
        category: 'kitchen',
        images: [
            'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80&auto=format&fit=crop',
        ],
        tags: ['כלי אוכל', 'מטבח', 'פורצלן'],
        daysAgo: 12,
        viewCount: 38,
    },
    {
        id: 'demo-drill',
        label: 'מקדחה Bosch + סט מקדחים',
        description:
            'מקדחה ביתית Bosch, עובדת מצוין. כולל סט מקדחים לעץ, מתכת ובטון, מטען מקורי וקופסה לאחסון. הסוללה מחזיקה כ-30 דקות עבודה רצופה (מומלץ להחליף לסוללה חדשה — לא חובה).',
        address: 'שדרות הרצל 50, קרית משה',
        phone: '054-1234567',
        contact: 'יוסי',
        condition: 'דורש תיקון קל',
        category: 'tools',
        price: 90,
        images: [
            'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=900&q=80&auto=format&fit=crop',
        ],
        tags: ['מקדחה', 'כלי עבודה', 'Bosch'],
        daysAgo: 14,
        viewCount: 52,
    },
    {
        id: 'demo-bike',
        label: 'אופני הרים 26" — 21 הילוכים',
        description:
            'אופני הרים בוגרים, מסגרת אלומיניום, 21 הילוכים שימאנו, בלמים בעבודה תקינה. הצמיגים חודשו לפני חודשיים. שינוי גובה אוכף + ידיות אחיזה במצב טוב. מתאים לרוכב 1.65מ׳-1.85מ׳.',
        address: 'רחוב הפסגה 14, קרית משה',
        phone: '054-1234567',
        contact: 'יוסי',
        condition: 'משומש',
        category: 'sports',
        price: 180,
        images: [
            'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=900&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900&q=80&auto=format&fit=crop',
        ],
        tags: ['אופניים', 'ספורט', 'הרים'],
        daysAgo: 18,
        viewCount: 174,
    },
];

/** מחזיר פריט דמו ספציפי לפי id (לתצוגת פריט בודד), או null אם לא קיים. */
export function getDemoItemById(id: string, userId: string = 'demo-user'): DbItem | null {
    return buildDemoUserItems(userId).find(i => i.id === id) ?? null;
}

/** בונה DbItem-ים מתוך המפרט הסטטי, עם user_id רצוי וזמני יצירה יחסיים. */
export function buildDemoUserItems(userId: string): DbItem[] {
    const now = Date.now();
    return DEMO_SPECS.map((spec) => {
        const created = new Date(now - spec.daysAgo * 86400_000).toISOString();
        const extra: Record<string, unknown> = {
            condition: spec.condition,
            category:  spec.category,
            tags:      spec.tags ?? [],
            image:     spec.images[0],
            images:    spec.images,
        };
        if (spec.price && spec.price > 0) extra.price = spec.price;
        return {
            id:           spec.id,
            category:     'giveaway',
            label:        spec.label,
            description:  spec.description,
            contact:      spec.contact,
            phone:        spec.phone,
            address:      spec.address,
            icon:         '📦',
            color:        'orange',
            neighborhood: 'קרית משה',
            city:         'ירושלים',
            extra_fields: JSON.stringify(extra),
            status:       'active',
            user_id:      userId,
            created_at:   created,
            view_count:   spec.viewCount,
        };
    });
}
