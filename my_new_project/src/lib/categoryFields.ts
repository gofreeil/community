import { FREE_PROMO } from './freePromo';

export interface FieldDef {
    key: string;
    label: string;
    type: 'text' | 'tel' | 'textarea' | 'select' | 'toggle' | 'number' | 'time' | 'date' | 'email' | 'availability_grid' | 'opening_hours' | 'multi_select' | 'neighborhood_select' | 'images' | 'map_pin' | 'address';
    required: boolean;
    placeholder?: string;
    options?: string[];
    hint?: string;
    default?: string;
    half?: boolean;
    maxLength?: number;
    /** הצג שדה זה רק כאשר ערך של שדה אחר תואם - לוגיקה מותנית */
    showIf?: { field: string; equals: string };
    /**
     * בקטגוריות mapFirst: 'map' = מוצג בטופס "הוספת יתרון במפה" (רק מה שצריך כדי לעלות למפה);
     * 'details' = נערך בדף הפריט. ברירת מחדל נקבעת לפי MAP_STEP_KEYS.
     */
    step?: 'map' | 'details';
}

export interface CategoryConfig {
    label: string;
    icon: string;
    color: string;
    /** שורה בטבלת המחירים (1-7). null = ללא תשלום */
    priceRow: number | null;
    /** כותרת מותאמת לדף ההוספה. אם לא מוגדר - "הוסף {label}" */
    addPageTitle?: string;
    /**
     * קטגוריית "מקום" - הטופס מצומצם ל"הוספת יתרון במפה" (שם, כתובת, סימון, לוגו),
     * וכל שאר הפרטים (שעות, מחיר, תיאור...) נערכים בדף הפריט. ראו mapStepFields/detailStepFields.
     */
    mapFirst?: boolean;
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
            { key: 'address',     label: 'כתובת לאיסוף',       type: 'address',  required: false, placeholder: 'רחוב לאיסוף הפריט' },
            { key: 'location',    label: 'סימון על המפה',      type: 'map_pin',  required: false },
            { key: 'contact',     label: 'שם',                 type: 'text',     required: true,  placeholder: 'שמך' },
            { key: 'phone',       label: 'טלפון',              type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    business: {
        label: 'בייבי סיטר',
        icon: '👶',
        color: 'pink',
        priceRow: 2,
        addPageTitle: 'הוספת כרטיס בייבי סיטר',
        fields: [
            { key: 'label',       label: 'שמך המלא',           type: 'text',     required: true,  placeholder: 'שם פרטי ומשפחה', half: true },
            { key: 'age',         label: 'גילך',                 type: 'number',   required: true,  placeholder: '22', half: true },
            { key: 'sector',      label: 'מגזר',                 type: 'toggle',   required: true,  options: ['כללי', 'דתי', 'חרדי'] },
            { key: 'age_range',   label: 'גילאי ילדים',         type: 'multi_select', required: true, options: ['כל הגילאים', 'תינוקות', '4+'] },
            { key: 'experience',  label: 'ניסיון',              type: 'select',   required: true,  options: ['ללא ניסיון', 'שנה אחת', '2-3 שנים', '4+ שנים'] },
            { key: 'availability',label: 'זמינות',              type: 'availability_grid', required: true },
            { key: 'languages',   label: 'שפות נוספות',          type: 'multi_select', required: false, options: ['אנגלית', 'רוסית', 'צרפתית'], hint: 'בנוסף לעברית - בחרו שפות שאתם דוברים' },
            { key: 'advantages',  label: 'יתרונות נוספים',        type: 'multi_select', required: false, options: [
                'עזרה ראשונה',
                'עזרה בשיעורי בית',
                'בישול לילדים',
                'נקיון קל',
                'כביסה וקיפול',
                'מומחיות בתינוקות',
            ], hint: 'בחרו את היתרונות שיש לכם להציע - יוצגו בכרטיסיה' },
            { key: 'price_hour',  label: 'מחיר לשעה (₪)',       type: 'number',   required: false, placeholder: '40' },
            { key: 'description', label: 'טקסט חופשי',           type: 'textarea', required: false },
            { key: 'address',     label: 'שכונה',               type: 'neighborhood_select', required: false },
            { key: 'phone',       label: 'טלפון',               type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    minyanim: {
        label: 'יהדות',
        icon: '✡️',
        color: 'blue',
        priceRow: null,
        mapFirst: true,
        // שלב 1 בלבד: פרטים ראשוניים שמעלים את המקום למפה. השאר (תמונות, לוח
        // פעילויות ושעות, שם הרב, תיאור, קישורים) מושלם בדף הפריט במצב בנייה.
        fields: [
            { key: 'label',       label: 'שם המקום',            type: 'text',     required: true,  placeholder: 'בית הכנסת "אהל יוסף", מניין דף היומי...' },
            { key: 'type',        label: 'מה יש במקום (אפשר לבחור כמה)', type: 'multi_select', required: true, options: ['בית כנסת', 'תפילה / מניין', 'שיעור תורה', 'מקווה', 'אחר'] },
            { key: 'address',     label: 'כתובת',               type: 'address',  required: true,  placeholder: 'שם הרחוב' },
            { key: 'location',    label: 'סימון על המפה',       type: 'map_pin',  required: false },
            { key: 'phone',       label: 'טלפון ליצירת קשר',    type: 'tel',      required: false, placeholder: '05X-XXXXXXX',
              hint: 'אחרי הפרסום נעבור יחד לדף המלא של המקום - שם מוסיפים תמונות, לוח פעילויות ושעות, שם הרב וכל השאר' },
        ],
    },

    education: {
        label: 'חוגים',
        icon: '🎨',
        color: 'red',
        priceRow: 3,
        addPageTitle: 'הוסף חוג',
        mapFirst: true,
        fields: [
            { key: 'label',       label: 'שם החוג',             type: 'text',     required: true,  placeholder: 'חוג ציור, כדורגל לילדים...' },
            { key: 'contact',     label: 'שם המדריך',            type: 'text',     required: true,  placeholder: 'שמך המלא' },
            { key: 'age_group',   label: 'קבוצת גיל',           type: 'text',     required: true,  placeholder: 'גילאי 6-12' },
            { key: 'days',        label: 'ימים',                 type: 'multi_select', required: true,  options: ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'], hint: 'בחרו את הימים שבהם החוג מתקיים' },
            { key: 'time',        label: 'שעה',                  type: 'time',     required: true },
            { key: 'price_month', label: 'מחיר לחודש (₪)',       type: 'number',   required: false, placeholder: '200' },
            { key: 'address',     label: 'כתובת',                type: 'address',  required: true,  placeholder: 'רחוב מיקום החוג' },
            { key: 'location',    label: 'סימון על המפה',        type: 'map_pin',  required: false },
            { key: 'phone',       label: 'טלפון',                type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
            { key: 'description', label: 'תיאור החוג',           type: 'textarea', required: false, placeholder: 'מה לומדים, מה מיוחד בחוג...' },
            { key: 'images',      label: 'תמונות (עד 5)',         type: 'images',   required: false, hint: 'הוסיפו תמונות של החוג. סמנו אחת כתמונה ראשית - היא תופיע בכרטיסיה הראשית של החוג.' },
            { key: 'website',     label: 'אתר אינטרנט',          type: 'text',     required: false, placeholder: 'https://example.com', hint: 'יוצג רק בדף המורחב של החוג' },
            { key: 'facebook',    label: 'פייסבוק',               type: 'text',     required: false, placeholder: 'https://facebook.com/...', half: true, hint: 'יוצג רק בדף המורחב' },
            { key: 'instagram',   label: 'אינסטגרם',              type: 'text',     required: false, placeholder: 'https://instagram.com/...', half: true, hint: 'יוצג רק בדף המורחב' },
        ],
    },

    realestate: {
        label: 'אירוח לשבת',
        icon: '/icons/shavat-shalom.png',
        color: 'yellow',
        priceRow: null,
        fields: [
            { key: 'offer_type',  label: 'אני',                  type: 'toggle',   required: true,  options: ['מציע לארח', 'מחפש להתארח'] },
            { key: 'family_name', label: 'שם המשפחה',             type: 'text',     required: true,  placeholder: 'לדוגמה: כהן', showIf: { field: 'offer_type', equals: 'מציע לארח' } },
            { key: 'meal',        label: 'סעודה',                 type: 'select',   required: false, options: ['ליל שבת', 'יום שבת (סעודת בוקר)', 'סעודה שלישית', 'כל הסעודות'] },
            { key: 'food_style',  label: 'סגנון אוכל',            type: 'select',   required: false, options: ['ספרדי', 'אשכנזי', 'תימני', 'מעורב', 'אחר'] },
            { key: 'capacity',    label: 'כמה אנשים',             type: 'number',   required: false, placeholder: '4', default: '1', half: true },
            { key: 'guest_type',  label: 'מתאים ל',               type: 'select',   required: false, options: ['משפחה', 'זוג', 'יחיד/ה', 'קבוצה', 'הכל מתאים'], default: 'יחיד/ה', half: true },
            { key: 'preferences', label: 'הערות / טקסט חופשי',     type: 'textarea', required: false, placeholder: 'רמת דתיות, ללא אלרגיות, לינה...' },
            { key: 'posting_type', label: 'משך הפרסום',           type: 'toggle',   required: true,  options: ['לשבת הקרובה בלבד', 'קבוע'], default: 'קבוע', hint: 'קבוע: הכרטיס יישאר עד למחיקה ידנית.' },
            { key: 'address',     label: 'שכונה / אזור',          type: 'text',     required: false, placeholder: 'קרית משה, ירושלים' },
            { key: 'contact',     label: 'איש קשר',                type: 'text',     required: false, placeholder: 'יוסי מירושלים' },
            { key: 'phone',       label: 'טלפון / וואטסאפ',       type: 'tel',      required: false, placeholder: '05X-XXXXXXX', hint: 'הטלפון שלך ייחשף למעוניין להתארח רק לאחר אישורך האישי' },
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
        mapFirst: true,
        fields: [
            { key: 'label',       label: 'שם העסק',               type: 'text',     required: true,  placeholder: 'מכולת השכונה' },
            { key: 'biz_type',    label: 'סוג עסק',                type: 'text',     required: true,  placeholder: 'מכולת, מאפייה, בגדים...' },
            { key: 'address',     label: 'כתובת',                  type: 'address',  required: true,  placeholder: 'שם הרחוב' },
            { key: 'location',    label: 'סימון על המפה',          type: 'map_pin',  required: false },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
            { key: 'hours',       label: 'שעות פתיחה',             type: 'opening_hours', required: false },
            { key: 'kosher',      label: 'כשרות',                  type: 'select',   required: false, options: ['ללא', 'כשר', 'כשר למהדרין', 'חלב ישראל', 'מהדרין'] },
            { key: 'description', label: 'תיאור העסק',             type: 'textarea', required: false, placeholder: 'מה מיוחד בעסק שלך...' },
            { key: 'contact',     label: 'שם בעל העסק',            type: 'text',     required: false, placeholder: 'שם מלא' },
        ],
    },

    restaurants: {
        label: 'מזון ומסעדות',
        icon: '🍱',
        color: 'orange',
        priceRow: 7,
        addPageTitle: 'הוספת מסעדה / עסק מזון',
        mapFirst: true,
        fields: [
            { key: 'label',       label: 'שם העסק',               type: 'text',     required: true,  placeholder: 'פיצה השכונה' },
            { key: 'venue_type',  label: 'סוג העסק',              type: 'toggle',   required: true,  step: 'map', options: ['מסעדה', 'מזון מהיר'], default: 'מסעדה', hint: FREE_PROMO ? '🎉 בתקופה הראשונית הפרסום חינם - עם הקוד "יוצאים לחירות" בדף התשלום' : 'מסעדה - 45 ₪ לחודש · מזון מהיר (פלאפל, שווארמה, פיצה, גלידה) - 30 ₪ לחודש' },
            { key: 'food_type',   label: 'סוג מטבח / מזון',         type: 'text',     required: true,  placeholder: 'פיצה, פלאפל, סושי, איטלקי...', half: true },
            { key: 'price_range', label: 'טווח מחירים',            type: 'select',   required: false, half: true, options: ['זול', 'בינוני', 'יקר'] },
            { key: 'kosher',      label: 'כשרות',                  type: 'select',   required: false, half: true, options: ['ללא', 'כשר רבנות', 'למהדרין', 'אחר'] },
            { key: 'meat_dairy',  label: 'חלבי / בשרי / פרווה',     type: 'select',   required: false, half: true, options: ['חלבי', 'בשרי', 'פרווה'] },
            { key: 'kosher_other', label: 'פרטו את הכשרות',         type: 'text',     required: false, placeholder: 'איזו כשרות?', showIf: { field: 'kosher', equals: 'אחר' } },
            { key: 'service',     label: 'אופן הגשה',              type: 'multi_select', required: true, options: ['ישיבה במקום', 'טייק-אווי', 'משלוחים', 'הזמנת מקום מראש', 'קטרינג'], hint: 'בחרו את כל האפשרויות שהעסק מציע - יוצג בבירור בכרטיסיה' },
            { key: 'delivery_by', label: 'משלוחים באמצעות',         type: 'multi_select', required: false, options: ['שליח עצמאי', 'Wolt', 'תן ביס', 'משלוחה'], hint: 'מלאו רק אם סימנתם "משלוחים" באופן ההגשה' },
            { key: 'amenities',   label: 'שירותים ונוחות',         type: 'multi_select', required: false, options: ['ישיבה בחוץ', 'נגישות לכיסא גלגלים', 'Wi-Fi חופשי', 'מתאים למשפחות', 'פינת ילדים', 'אפשרות הפרדה'] },
            { key: 'parking',     label: 'חניה',                   type: 'toggle',   required: true,  options: ['יש חניה', 'אין חניה'], default: 'יש חניה' },
            { key: 'parking_notes', label: 'פרטי חניה (חופשי)',     type: 'text',     required: false, placeholder: 'חניון סמוך, חניה כחול-לבן, חניה חינם בערב...' },
            { key: 'club_discount', label: 'הנחה לחברי מועדון',     type: 'toggle',   required: true,  options: ['ללא הנחה', 'יש הנחה'], default: 'ללא הנחה', hint: 'חברי מועדון הקהילה יקבלו תג מיוחד בכרטיסיה' },
            { key: 'club_discount_detail', label: 'פרטי ההנחה',     type: 'text',     required: false, placeholder: 'לדוגמה: 10% הנחה בהצגת כרטיס חבר', showIf: { field: 'club_discount', equals: 'יש הנחה' } },
            { key: 'hours',       label: 'שעות פתיחה',             type: 'opening_hours', required: false },
            { key: 'address',     label: 'כתובת',                  type: 'address',  required: true,  placeholder: 'שם הרחוב' },
            { key: 'location',    label: 'סימון על המפה',          type: 'map_pin',  required: false },
            { key: 'waze_link',   label: 'קישור Waze',             type: 'text',     required: false, placeholder: 'https://waze.com/ul/...', half: true, hint: 'הדבקת קישור ניווט ב-Waze תעזור ללקוחות להגיע אליכם בקלות' },
            { key: 'gmaps_link',  label: 'קישור Google Maps',       type: 'text',     required: false, placeholder: 'https://maps.app.goo.gl/...', half: true },
            { key: 'transport',   label: 'הגעה בתחבורה ציבורית',     type: 'textarea', required: false, placeholder: 'אילו קווי אוטובוס / רכבת מגיעים לאזור, מהיכן נוחה ההגעה...' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX', half: true },
            { key: 'facebook',    label: 'פייסבוק',                type: 'text',     required: false, placeholder: 'https://facebook.com/...', half: true },
            { key: 'instagram',   label: 'אינסטגרם',               type: 'text',     required: false, placeholder: 'https://instagram.com/...', half: true },
            { key: 'custom_link_url',   label: 'הקישור הנוסף',      type: 'text',    required: false, placeholder: 'https://...', half: true },
            { key: 'custom_link_label', label: 'כותרת לקישור נוסף', type: 'text',    required: false, placeholder: 'למשל: הזמנת מקום, תפריט אירועים', half: true, hint: 'תנו שם לקישור - הוא יוצג ככפתור בדף המסעדה' },
            { key: 'description', label: 'תיאור',                  type: 'textarea', required: false, placeholder: 'מה מיוחד במסעדה - מנת הדגל, אווירה, קהל יעד...' },
            { key: 'images',      label: 'תמונות העסק (עד 5)',      type: 'images',   required: false, hint: 'תמונות של העסק והמנות. סמנו אחת כתמונה ראשית.' },
            { key: 'menu_images', label: 'תמונות התפריט (עד 5)',     type: 'images',   required: true,  hint: 'חובה - צלמו או העלו קובץ של התפריט בנפרד משאר התמונות - ברור, מואר וקריא.' },
        ],
    },

    rides: {
        label: 'טרמפים ומסירות',
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
            { key: 'nickname',    label: 'שם או כינוי',             type: 'text',     required: true,  placeholder: 'שם פרטי או כינוי' },
            { key: 'gender',      label: 'מין',                     type: 'select',   required: true,  options: ['גבר', 'אישה'] },
            { key: 'birth_date',  label: 'תאריך לידה',                type: 'date',     required: true,  hint: 'הגיל יחושב אוטומטית' },
            { key: 'sector',      label: 'מגזר / רקע',              type: 'select',   required: false, options: ['דתי', 'דתי-לאומי', 'חרדי', 'מסורתי', 'חילוני'] },
            { key: 'marital_status', label: 'מצב משפחתי',           type: 'select',   required: false, options: ['רווק/ה', 'גרוש/ה', 'אלמן/ה', 'פרוד/ה'], default: 'רווק/ה' },
            { key: 'education',   label: 'מקצוע / תעסוקה / השכלה',  type: 'text',     required: false, placeholder: 'תואר / ישיבה / מקצוע...' },
            { key: 'interests',   label: 'תחומי עניין',              type: 'textarea', required: false, placeholder: 'ספורט, מוזיקה, בישול...' },
            { key: 'description', label: 'קצת עליי',                type: 'textarea', required: true,  placeholder: 'כמה מילים על עצמך (לא יוצג שם)' },
            { key: 'looking_for_m', label: 'מחפש',                  type: 'textarea', required: false, placeholder: 'למשל: רגישה, חכמה, יראת שמיים, עם חוש הומור...', maxLength: 100, showIf: { field: 'gender', equals: 'גבר' } },
            { key: 'looking_for_f', label: 'מחפשת',                 type: 'textarea', required: false, placeholder: 'למשל: רגיש, חכם, ירא שמיים, עם חוש הומור...',  maxLength: 100, showIf: { field: 'gender', equals: 'אישה' } },
            { key: 'inspiration', label: 'משפט מעורר השראה (אופציונלי)', type: 'textarea', required: false, placeholder: 'משפט או ציטוט שאתה שואב ממנו השראה', maxLength: 150 },
            { key: 'images',      label: 'גלריית תמונות',           type: 'images',   required: false },
            { key: 'visibility',  label: 'מי יראה את הכרטיס?',      type: 'toggle',   required: false, options: ['גלוי לכולם', 'רק לשדכנים שלנו'], default: 'גלוי לכולם', hint: '“גלוי לכולם” — הכרטיס מופיע בלוח הפומבי לכל המשתמשים. “רק לשדכנים שלנו” — הכרטיס לא מופיע בלוח; רק צוות השדכנים שלנו רואה אותו, ומפנה אותו בדיסקרטיות רק להצעות רלוונטיות.' },
            { key: 'matchmaker',  label: 'שדכן או חבר (אופציונלי)',    type: 'text',     required: false, placeholder: 'שם וטלפון', hint: '⚠️ הטלפון שתזין כאן יוצג בגלוי בכרטיס שלך ובדף הפרופיל - זוהי דרך הקשר היחידה שתוצג לציבור.' },
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
            { key: 'address',     label: 'מיקום',                   type: 'address',  required: true,  placeholder: 'רחוב האירוע' },
            { key: 'location',    label: 'סימון על המפה',           type: 'map_pin',  required: false },
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
            { key: 'address',     label: 'מיקום',                   type: 'address',  required: true,  placeholder: 'רחוב הפעילות' },
            { key: 'location',    label: 'סימון על המפה',           type: 'map_pin',  required: false },
            { key: 'price',       label: 'מחיר',                    type: 'text',     required: false, placeholder: 'חינם / 20₪' },
            { key: 'description', label: 'תיאור',                   type: 'textarea', required: false, placeholder: 'על הפעילות...' },
            { key: 'contact',     label: 'שם',                      type: 'text',     required: true,  placeholder: 'שמך' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    attractions: {
        label: 'שירות ציבורי',
        addPageTitle: 'הוסף שירות ציבורי',
        icon: '🏛️',
        color: 'indigo',
        priceRow: null,
        mapFirst: true,
        fields: [
            { key: 'label',       label: 'שם השירות',               type: 'text',     required: true,  placeholder: 'בנק, עירייה, דואר, בית ספר...' },
            { key: 'address',     label: 'כתובת מדויקת',            type: 'address',  required: true,  placeholder: 'שם הרחוב', hint: 'בחרו רחוב מהרשימה של העיר והוסיפו מספר בית' },
            { key: 'location',    label: 'סימון על המפה',           type: 'map_pin',  required: false },
            { key: 'hours',       label: 'שעות פתיחה',              type: 'opening_hours', required: false },
            { key: 'price',       label: 'מחיר',                    type: 'text',     required: false, placeholder: 'חינם / מחיר' },
            { key: 'description', label: 'תיאור',                   type: 'textarea', required: true,  placeholder: 'תאר את השירות...' },
            { key: 'phone',       label: 'טלפון',                   type: 'tel',      required: false, placeholder: '05X-XXXXXXX' },
            { key: 'contact',     label: 'שם',                      type: 'text',     required: false },
        ],
    },

    halls: {
        label: 'אולמות וחללים',
        icon: '🏛️',
        color: 'teal',
        priceRow: 2,
        addPageTitle: 'הוסף אולם / חלל להשכרה',
        mapFirst: true,
        fields: [
            { key: 'label',       label: 'שם האולם / החלל',         type: 'text',     required: true,  placeholder: 'אולם השמחות, סטודיו יצירה...' },
            { key: 'usage_type',  label: 'מתאים ל',                   type: 'multi_select', required: true, options: ['אירועים חד-פעמיים', 'חוגים קבועים', 'הרצאות וסדנאות', 'חתונות ובר-מצוות', 'ימי הולדת', 'ישיבות ופגישות'], hint: 'אפשר לבחור כמה' },
            { key: 'capacity',    label: 'קיבולת (אנשים)',            type: 'number',   required: true,  placeholder: '50', half: true },
            { key: 'size_sqm',    label: 'גודל (מ"ר)',                 type: 'number',   required: false, placeholder: '80', half: true },
            { key: 'price_hour',  label: 'מחיר לשעה (₪)',             type: 'number',   required: false, placeholder: '150', half: true, hint: 'מתאים לחוגים קבועים' },
            { key: 'price_event', label: 'מחיר לאירוע (₪)',           type: 'number',   required: false, placeholder: '2500', half: true, hint: 'מתאים לאירוע חד-פעמי' },
            { key: 'amenities',   label: 'מה כלול',                    type: 'textarea', required: false, placeholder: 'מיזוג, מטבחון, מקרן, הגברה, חניה...' },
            { key: 'kosher',      label: 'כשרות (אם רלוונטי)',          type: 'select',   required: false, options: ['לא רלוונטי', 'כשר', 'כשר למהדרין', 'ללא אוכל'] },
            { key: 'address',     label: 'כתובת',                      type: 'address',  required: true,  placeholder: 'שם הרחוב' },
            { key: 'location',    label: 'סימון על המפה',              type: 'map_pin',  required: false },
            { key: 'description', label: 'תיאור',                      type: 'textarea', required: true,  placeholder: 'תאר את האולם / החלל...' },
            { key: 'images',      label: 'תמונות (עד 5)',              type: 'images',   required: false, hint: 'הוסיפו תמונות של החלל. סמנו אחת כתמונה ראשית.' },
            { key: 'website',     label: 'אתר אינטרנט',                type: 'text',     required: false, placeholder: 'https://example.com', hint: 'יוצג רק בדף המורחב' },
            { key: 'facebook',    label: 'פייסבוק',                     type: 'text',     required: false, placeholder: 'https://facebook.com/...', half: true, hint: 'יוצג רק בדף המורחב' },
            { key: 'instagram',   label: 'אינסטגרם',                    type: 'text',     required: false, placeholder: 'https://instagram.com/...', half: true, hint: 'יוצג רק בדף המורחב' },
            { key: 'contact',     label: 'שם איש קשר',                  type: 'text',     required: true,  placeholder: 'שמך המלא' },
            { key: 'phone',       label: 'טלפון',                       type: 'tel',      required: true,  placeholder: '05X-XXXXXXX' },
        ],
    },

    'safe-space': {
        label: 'מרחב מוגן',
        icon: '🛡️',
        color: 'yellow',
        priceRow: null,
        mapFirst: true,
        fields: [
            { key: 'label',       label: 'שם המרחב',                type: 'text',     required: true,  placeholder: 'מקלט ציבורי, מרחב מוגן...' },
            { key: 'address',     label: 'כתובת מדויקת',            type: 'address',  required: true,  placeholder: 'שם הרחוב' },
            { key: 'location',    label: 'סימון על המפה',           type: 'map_pin',  required: false },
            { key: 'capacity',    label: 'קיבולת (אנשים)',           type: 'number',   required: false },
            { key: 'description', label: 'פרטים',                   type: 'textarea', required: false, placeholder: 'מידע נוסף על המרחב...' },
            { key: 'contact',     label: 'טלפון אחראי',             type: 'tel',      required: false, placeholder: '05X-XXXXXXX' },
        ],
    },
};

// ============================================================
// ---- שלב "מפה" מול שלב "פרטים" (קטגוריות mapFirst) ----
// ============================================================

/** מפתחות ברירת מחדל שנחשבים "שלב המפה" בקטגוריית mapFirst (מה שצריך כדי לעלות למפה) */
const MAP_STEP_KEYS = new Set(['label', 'address', 'location', 'type']);

/** האם שדה שייך לטופס "הוספת יתרון במפה" (שלב המפה). קטגוריה רגילה - הכל בטופס. */
export function isMapStepField(cfg: CategoryConfig, field: FieldDef): boolean {
    if (!cfg.mapFirst) return true;
    if (field.step === 'map') return true;
    if (field.step === 'details') return false;
    return MAP_STEP_KEYS.has(field.key);
}

/** שדות שמוצגים בטופס ההוספה */
export function mapStepFields(cfg: CategoryConfig): FieldDef[] {
    return cfg.fields.filter(f => isMapStepField(cfg, f));
}

/** שדות שנערכים בדף הפריט (רק בקטגוריות mapFirst; אחרת ריק) */
export function detailStepFields(cfg: CategoryConfig): FieldDef[] {
    return cfg.mapFirst ? cfg.fields.filter(f => !isMapStepField(cfg, f)) : [];
}

// ============================================================
// ---- תרגום תוויות התצוגה (i18n) ----
// הערכים בעברית נשארים כאן כ-fallback; הצרכנים (.svelte) פותרים את התווית
// דרך $_ בנקודת התצוגה. המפתחות במילון labels.ts (namespace "labels").
// ============================================================

/**
 * מחזיר את הערך המתורגם למפתח, או את ה-fallback העברי אם המפתח חסר.
 * svelte-i18n מחזיר את שם המפתח עצמו כשאין תרגום - במקרה כזה נחזיר את ה-fallback.
 * @param t פונקציית התרגום (הערך של ה-store $_)
 */
export function trOr(t: (key: string) => string, key: string, fallback: string): string {
    const v = t(key);
    return v === key ? fallback : v;
}

/** מפתח i18n לשם קטגוריה (config.label) */
export function cfCatKey(cat: string): string {
    return `labels.cf_${cat}`;
}

/** מפתח i18n לכותרת דף ההוספה (config.addPageTitle) */
export function cfAddTitleKey(cat: string): string {
    return `labels.cf_${cat}__title`;
}

/** מפתח i18n לתווית / placeholder / hint של שדה */
export function cfFieldKey(cat: string, field: FieldDef, kind: 'label' | 'ph' | 'hint' = 'label'): string {
    const suffix = kind === 'label' ? '' : `_${kind}`;
    return `labels.cf_${cat}_${field.key}${suffix}`;
}

/** מפתח i18n לתווית אפשרות (לפי אינדקס ב-field.options) */
export function cfOptKey(cat: string, field: FieldDef, opt: string): string {
    const i = field.options?.indexOf(opt) ?? 0;
    return `labels.cf_${cat}_${field.key}_o${i}`;
}

/** צבע ברירת מחדל לפי category id */
export function getCategoryColor(categoryId: string): string {
    return categoryConfig[categoryId]?.color ?? 'purple';
}

/** אייקון ברירת מחדל לפי category id */
export function getCategoryIcon(categoryId: string): string {
    return categoryConfig[categoryId]?.icon ?? '📌';
}
