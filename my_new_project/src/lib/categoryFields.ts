export interface FieldDef {
    key: string;
    label: string;
    type: 'text' | 'tel' | 'textarea' | 'select' | 'number' | 'time' | 'date' | 'email';
    required: boolean;
    placeholder?: string;
    options?: string[];
    hint?: string;
}

export interface CategoryConfig {
    label: string;
    icon: string;
    color: string;
    /** שורה בטבלת המחירים (1-7). null = ללא תשלום */
    priceRow: number | null;
    fields: FieldDef[];
}

export const categoryConfig: Record<string, CategoryConfig> = {

    giveaway: {
        label: 'למסירה',
        icon: '📦',
        color: 'orange',
        priceRow: null,
        fields: [
            { key: 'label',       label: 'שם הפריט',          type: 'text',     required: true,  placeholder: 'ספה דו-מושבית' },
            { key: 'condition',   label: 'מצב הפריט',          type: 'select',   required: true,  options: ['כחדש', 'משומש', 'דורש תיקון קל'] },
            { key: 'description', label: 'תיאור',              type: 'textarea', required: true,  placeholder: 'תאר את הפריט בפירוט' },
            { key: 'address',     label: 'כתובת לאיסוף',       type: 'text',     required: false, placeholder: 'כתובת לאיסוף הפריט' },
            { key: 'contact',     label: 'שם',                 type: 'text',     required: true,  placeholder: 'שמך' },
            { key: 'phone',       label: 'טלפון',              type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    business: {
        label: 'בייבי סיטר',
        icon: '👶',
        color: 'pink',
        priceRow: 2,
        fields: [
            { key: 'label',       label: 'שמך המלא',           type: 'text',     required: true,  placeholder: 'שם פרטי ומשפחה' },
            { key: 'age_range',   label: 'גילאי ילדים',         type: 'text',     required: true,  placeholder: 'מגיל 0 עד גיל 10' },
            { key: 'experience',  label: 'ניסיון',              type: 'select',   required: true,  options: ['ללא ניסיון', 'שנה אחת', '2-3 שנים', '4+ שנים'] },
            { key: 'availability',label: 'זמינות',              type: 'text',     required: true,  placeholder: 'ערבים + סופי שבוע, א-ה מ-17:00' },
            { key: 'price_hour',  label: 'מחיר לשעה (₪)',       type: 'number',   required: false, placeholder: '40' },
            { key: 'description', label: 'קצת עלייך',           type: 'textarea', required: false, placeholder: 'ספרי קצת על עצמך...' },
            { key: 'address',     label: 'שכונה',               type: 'text',     required: false, placeholder: 'קרית משה' },
            { key: 'phone',       label: 'טלפון',               type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    minyanim: {
        label: 'יהדות',
        icon: '✡️',
        color: 'blue',
        priceRow: null,
        fields: [
            { key: 'label',       label: 'שם / סוג',           type: 'text',     required: true,  placeholder: 'מניין שחרית, שיעור דף יומי...' },
            { key: 'type',        label: 'סוג',                 type: 'select',   required: true,  options: ['מניין', 'שיעור תורה', 'מקווה', 'אחר'] },
            { key: 'time',        label: 'שעה',                 type: 'time',     required: true },
            { key: 'days',        label: 'ימים',                type: 'text',     required: false, placeholder: 'כל יום, א-ה, שישי בלבד...' },
            { key: 'address',     label: 'כתובת',               type: 'text',     required: true,  placeholder: 'שם בית הכנסת, כתובת' },
            { key: 'contact',     label: 'שם הרב / מארגן',      type: 'text',     required: false, placeholder: 'הרב ישראל ישראלי' },
            { key: 'phone',       label: 'טלפון ליצירת קשר',    type: 'tel',      required: false, placeholder: '05X-XXXXXXX' },
            { key: 'description', label: 'פרטים נוספים',        type: 'textarea', required: false, placeholder: 'מידע נוסף על המניין / שיעור' },
        ],
    },

    education: {
        label: 'חוגים',
        icon: '🎨',
        color: 'red',
        priceRow: 3,
        fields: [
            { key: 'label',       label: 'שם החוג',             type: 'text',     required: true,  placeholder: 'חוג ציור, כדורגל לילדים...' },
            { key: 'age_group',   label: 'קבוצת גיל',           type: 'text',     required: true,  placeholder: 'גילאי 6-12' },
            { key: 'days',        label: 'ימים',                 type: 'text',     required: true,  placeholder: 'שני ורביעי' },
            { key: 'time',        label: 'שעה',                  type: 'time',     required: true },
            { key: 'price_month', label: 'מחיר לחודש (₪)',       type: 'number',   required: false, placeholder: '200' },
            { key: 'address',     label: 'כתובת',                type: 'text',     required: true,  placeholder: 'מיקום החוג' },
            { key: 'contact',     label: 'שם המדריך',            type: 'text',     required: true,  placeholder: 'שמך המלא' },
            { key: 'phone',       label: 'טלפון',                type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
            { key: 'description', label: 'תיאור החוג',           type: 'textarea', required: false, placeholder: 'מה לומדים, מה מיוחד בחוג...' },
        ],
    },

    realestate: {
        label: 'אירוח לשבת',
        icon: '🕯️',
        color: 'yellow',
        priceRow: null,
        fields: [
            { key: 'offer_type',  label: 'אני',                  type: 'select',   required: true,  options: ['מציע לארח', 'מחפש להתארח'] },
            { key: 'label',       label: 'כותרת',                 type: 'text',     required: true,  placeholder: 'מציע לארח משפחה לשבת' },
            { key: 'capacity',    label: 'כמה אנשים',             type: 'number',   required: false, placeholder: '4' },
            { key: 'preferences', label: 'העדפות',                type: 'textarea', required: false, placeholder: 'רמת דתיות, ללא אלרגיות...' },
            { key: 'address',     label: 'שכונה / אזור',          type: 'text',     required: true,  placeholder: 'קרית משה, ירושלים' },
            { key: 'contact',     label: 'שמך',                   type: 'text',     required: true,  placeholder: 'שם משפחה' },
            { key: 'phone',       label: 'טלפון / וואטסאפ',       type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    security: {
        label: 'צימרים',
        icon: '🏡',
        color: 'green',
        priceRow: 4,
        fields: [
            { key: 'label',       label: 'שם הצימר',              type: 'text',     required: true,  placeholder: 'צימר הגינה' },
            { key: 'address',     label: 'מיקום',                  type: 'text',     required: true,  placeholder: 'ישוב, אזור' },
            { key: 'capacity',    label: 'קיבולת (אנשים)',          type: 'number',   required: true,  placeholder: '4' },
            { key: 'price_night', label: 'מחיר ללילה (₪)',          type: 'number',   required: true,  placeholder: '500' },
            { key: 'amenities',   label: 'מה כלול',                type: 'textarea', required: false, placeholder: 'בריכה, ג\'קוזי, מיזוג, מטבח...' },
            { key: 'description', label: 'תיאור',                  type: 'textarea', required: true,  placeholder: 'תאר את הצימר...' },
            { key: 'contact',     label: 'שם',                     type: 'text',     required: true,  placeholder: 'שמך המלא' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    shops: {
        label: 'חנויות',
        icon: '🏪',
        color: 'green',
        priceRow: 2,
        fields: [
            { key: 'label',       label: 'שם העסק',               type: 'text',     required: true,  placeholder: 'מכולת השכונה' },
            { key: 'biz_type',    label: 'סוג עסק',                type: 'text',     required: true,  placeholder: 'מכולת, מאפייה, בגדים...' },
            { key: 'address',     label: 'כתובת',                  type: 'text',     required: true,  placeholder: 'רחוב ומספר' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
            { key: 'hours',       label: 'שעות פתיחה',             type: 'text',     required: false, placeholder: 'א-ה 8:00-20:00, שישי 8:00-13:00' },
            { key: 'kosher',      label: 'כשרות',                  type: 'select',   required: false, options: ['ללא', 'כשר', 'כשר למהדרין', 'חלב ישראל', 'מהדרין'] },
            { key: 'description', label: 'תיאור העסק',             type: 'textarea', required: false, placeholder: 'מה מיוחד בעסק שלך...' },
            { key: 'contact',     label: 'שם בעל העסק',            type: 'text',     required: false, placeholder: 'שם מלא' },
        ],
    },

    restaurants: {
        label: 'חנות מזון',
        icon: '🍱',
        color: 'orange',
        priceRow: 2,
        fields: [
            { key: 'label',       label: 'שם העסק',               type: 'text',     required: true,  placeholder: 'פיצה השכונה' },
            { key: 'food_type',   label: 'סוג מזון',               type: 'text',     required: true,  placeholder: 'פיצה, פלאפל, סושי...' },
            { key: 'address',     label: 'כתובת',                  type: 'text',     required: true,  placeholder: 'רחוב ומספר' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
            { key: 'hours',       label: 'שעות פתיחה',             type: 'text',     required: false, placeholder: 'א-ה 12:00-22:00' },
            { key: 'kosher',      label: 'כשרות',                  type: 'select',   required: false, options: ['ללא', 'כשר', 'כשר למהדרין', 'חלב', 'בשרי'] },
            { key: 'delivery',    label: 'משלוחים',                 type: 'select',   required: false, options: ['לא', 'כן', 'Wolt', 'Ten Bis'] },
            { key: 'description', label: 'תיאור',                  type: 'textarea', required: false, placeholder: 'מה מיוחד במסעדה...' },
            { key: 'contact',     label: 'שם',                     type: 'text',     required: false, placeholder: 'שם מלא' },
        ],
    },

    rides: {
        label: 'טרמפים',
        icon: '🚗',
        color: 'green',
        priceRow: null,
        fields: [
            { key: 'offer_type',  label: 'אני',                    type: 'select',   required: true,  options: ['מציע טרמפ', 'מחפש טרמפ'] },
            { key: 'from_place',  label: 'מאיפה',                  type: 'text',     required: true,  placeholder: 'קרית משה, ירושלים' },
            { key: 'to_place',    label: 'לאן',                    type: 'text',     required: true,  placeholder: 'תל אביב / בני ברק...' },
            { key: 'depart_time', label: 'שעת יציאה',              type: 'time',     required: true },
            { key: 'days',        label: 'ימים',                    type: 'text',     required: true,  placeholder: 'ראשון-חמישי, או כל יום...' },
            { key: 'seats',       label: 'מספר מקומות',             type: 'number',   required: false, placeholder: '3' },
            { key: 'label',       label: 'כותרת מקוצרת',           type: 'text',     required: true,  placeholder: 'טרמפ יומי לתל אביב 7:00' },
            { key: 'contact',     label: 'שם',                     type: 'text',     required: true,  placeholder: 'שמך' },
            { key: 'phone',       label: 'טלפון / וואטסאפ',         type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    jobs: {
        label: 'דרושים',
        icon: '💼',
        color: 'blue',
        priceRow: 5,
        fields: [
            { key: 'label',       label: 'שם המשרה',               type: 'text',     required: true,  placeholder: 'מנהל/ת חשבונות, מורה פרטית...' },
            { key: 'employer',    label: 'שם המעסיק / חברה',        type: 'text',     required: false, placeholder: 'שם החברה או "אנונימי"' },
            { key: 'job_type',    label: 'סוג משרה',                type: 'select',   required: true,  options: ['משרה מלאה', 'משרה חלקית', 'עבודה מזדמנת', 'התנדבות', 'פרילנס'] },
            { key: 'hours',       label: 'שעות עבודה',              type: 'text',     required: false, placeholder: 'ראשון-חמישי 9:00-17:00' },
            { key: 'salary',      label: 'שכר (₪)',                 type: 'text',     required: false, placeholder: '40₪/שעה או שכר לפי ניסיון' },
            { key: 'requirements',label: 'דרישות',                  type: 'textarea', required: false, placeholder: 'ניסיון רלוונטי, תואר...' },
            { key: 'description', label: 'תיאור המשרה',             type: 'textarea', required: true,  placeholder: 'פרט על תפקיד זה...' },
            { key: 'contact',     label: 'שם',                     type: 'text',     required: true,  placeholder: 'שם ליצירת קשר' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    singles: {
        label: 'פנויים/פנויות',
        icon: '❤️',
        color: 'red',
        priceRow: 6,
        fields: [
            { key: 'label',       label: 'כותרת הפרופיל',           type: 'text',     required: true,  placeholder: 'פנויה, 28, ירושלים' },
            { key: 'gender',      label: 'מין',                     type: 'select',   required: true,  options: ['גבר', 'אישה'] },
            { key: 'age',         label: 'גיל',                     type: 'number',   required: true,  placeholder: '28' },
            { key: 'sector',      label: 'מגזר / רקע',              type: 'select',   required: false, options: ['דתי', 'דתי-לאומי', 'חרדי', 'מסורתי', 'חילוני'] },
            { key: 'interests',   label: 'תחומי עניין',              type: 'textarea', required: false, placeholder: 'ספורט, מוזיקה, בישול...' },
            { key: 'description', label: 'קצת עליי',                type: 'textarea', required: true,  placeholder: 'כמה מילים על עצמך (לא יוצג שם)' },
            { key: 'matchmaker',  label: 'שדכן/ית (אופציונלי)',       type: 'text',     required: false, placeholder: 'שם ומספר שדכן/ית' },
            { key: 'contact',     label: 'דרך קשר',                  type: 'text',     required: true,  placeholder: 'דרך שדכן/ית / וואטסאפ' },
            { key: 'phone',       label: 'טלפון (לא מוצג)',           type: 'tel',      required: true,  placeholder: '05X-XXXXXXX', hint: 'הטלפון יישמר פנימית ולא יוצג לציבור' },
        ],
    },

    events: {
        label: 'אירועים',
        icon: '📅',
        color: 'purple',
        priceRow: 1,
        fields: [
            { key: 'label',       label: 'שם האירוע',               type: 'text',     required: true,  placeholder: 'הרצאה מרתקת: תחום X' },
            { key: 'event_date',  label: 'תאריך',                   type: 'date',     required: true },
            { key: 'time',        label: 'שעה',                     type: 'time',     required: true },
            { key: 'address',     label: 'מיקום',                   type: 'text',     required: true,  placeholder: 'כתובת האירוע' },
            { key: 'price',       label: 'מחיר כניסה',               type: 'text',     required: false, placeholder: 'חינם / 50₪' },
            { key: 'description', label: 'על האירוע',                type: 'textarea', required: true,  placeholder: 'תאר את האירוע...' },
            { key: 'contact',     label: 'שם המארגן',                type: 'text',     required: true,  placeholder: 'שמך' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    for_kids: {
        label: 'לילדים',
        icon: '🎈',
        color: 'pink',
        priceRow: null,
        fields: [
            { key: 'label',       label: 'שם הפעילות',              type: 'text',     required: true,  placeholder: 'ג\'ימבורי, שעת סיפור...' },
            { key: 'age_group',   label: 'קבוצת גיל',               type: 'text',     required: true,  placeholder: 'גילאי 2-6' },
            { key: 'days',        label: 'ימים / תאריכים',           type: 'text',     required: true,  placeholder: 'כל שלישי, או תאריך ספציפי' },
            { key: 'time',        label: 'שעה',                     type: 'time',     required: false },
            { key: 'address',     label: 'מיקום',                   type: 'text',     required: true,  placeholder: 'כתובת הפעילות' },
            { key: 'price',       label: 'מחיר',                    type: 'text',     required: false, placeholder: 'חינם / 20₪' },
            { key: 'description', label: 'תיאור',                   type: 'textarea', required: false, placeholder: 'על הפעילות...' },
            { key: 'contact',     label: 'שם',                      type: 'text',     required: true,  placeholder: 'שמך' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    attractions: {
        label: 'אטרקציות',
        icon: '🎡',
        color: 'indigo',
        priceRow: null,
        fields: [
            { key: 'label',       label: 'שם האטרקציה',             type: 'text',     required: true,  placeholder: 'פארק שעשועים, מוזיאון...' },
            { key: 'address',     label: 'כתובת',                   type: 'text',     required: true,  placeholder: 'מיקום' },
            { key: 'hours',       label: 'שעות פתיחה',              type: 'text',     required: false, placeholder: 'א-ה 10:00-18:00' },
            { key: 'price',       label: 'מחיר',                    type: 'text',     required: false, placeholder: 'חינם / מחיר' },
            { key: 'description', label: 'תיאור',                   type: 'textarea', required: true,  placeholder: 'תאר את האטרקציה...' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: false, placeholder: '05X-XXXXXXX' },
            { key: 'contact',     label: 'שם',                      type: 'text',     required: false },
        ],
    },

    'safe-space': {
        label: 'מרחב מוגן',
        icon: '🛡️',
        color: 'yellow',
        priceRow: null,
        fields: [
            { key: 'label',       label: 'שם המרחב',                type: 'text',     required: true,  placeholder: 'מקלט ציבורי, מרחב מוגן...' },
            { key: 'address',     label: 'כתובת מדויקת',            type: 'text',     required: true,  placeholder: 'רחוב ומספר, כניסה...' },
            { key: 'capacity',    label: 'קיבולת (אנשים)',           type: 'number',   required: false },
            { key: 'description', label: 'פרטים',                   type: 'textarea', required: false, placeholder: 'מידע נוסף על המרחב...' },
            { key: 'contact',     label: 'טלפון אחראי',             type: 'tel',      required: false, placeholder: '05X-XXXXXXX' },
        ],
    },
};

/** צבע ברירת מחדל לפי category id */
export function getCategoryColor(categoryId: string): string {
    return categoryConfig[categoryId]?.color ?? 'purple';
}

/** אייקון ברירת מחדל לפי category id */
export function getCategoryIcon(categoryId: string): string {
    return categoryConfig[categoryId]?.icon ?? '📌';
}
