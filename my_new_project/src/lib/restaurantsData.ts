// src/lib/restaurantsData.ts
// מסעדות דוגמה (mock) — מוצגות בלוח המסעדות ובדף הפרטים כל עוד אין פריטים אמיתיים.
// משותף בין דף הלוח (national/[category]) לבין דף הפרטים (/restaurants/[id]).

export interface RestaurantItem {
    id: string;
    label: string;
    description: string;
    icon: string;
    city: string;
    neighborhood: string;
    phone: string;
    contact: string;
    category: string;
    created_at: string;
    status: string;
    extra_fields: string; // JSON string
    view_count?: number;
}

function ago(hours: number): string {
    return new Date(Date.now() - 1000 * 60 * 60 * hours).toISOString();
}

export const mockRestaurants: RestaurantItem[] = [
    {
        id: 'mock-rest-1', label: 'פיצה קרית משה',
        description: 'פיצרייה משפחתית עם בצק דק במקום, מבחר תוספות טריות ופינת ישיבה נעימה.',
        icon: '🍕', city: 'ירושלים', neighborhood: 'קרית משה',
        phone: '02-6519988', contact: 'משה', category: 'restaurants',
        created_at: ago(5), status: 'active',
        extra_fields: JSON.stringify({
            venue_type: 'מזון מהיר',
            food_type: 'פיצה', price_range: 'בינוני', kosher: 'למהדרין', meat_dairy: 'חלבי',
            service: ['ישיבה במקום', 'טייק-אווי', 'משלוחים'],
            delivery_by: ['שליח עצמאי', 'Wolt'],
            amenities: ['מתאים למשפחות', 'פינת ילדים', 'Wi-Fi חופשי'],
            parking: 'יש חניה', parking_notes: 'חניון ציבורי במרחק דקה הליכה',
            club_discount: 'יש הנחה', club_discount_detail: '10% הנחה לחברי מועדון בהצגת כרטיס',
            hours: 'א-ה 11:00-23:00, מוצ"ש משעה לאחר צאת השבת',
            transport: 'קווי אוטובוס 14, 75 ו-66 עוצרים בסמוך.',
        }),
        view_count: 412,
    },
    {
        id: 'mock-rest-2', label: 'פלאפל הנסיך',
        description: 'דוכן פלאפל ותיק — מנה חמה, סלטים ביתיים וחומוס טחון במקום.',
        icon: '🧆', city: 'ירושלים', neighborhood: 'קרית משה',
        phone: '054-7712233', contact: 'יענקי', category: 'restaurants',
        created_at: ago(20), status: 'active',
        extra_fields: JSON.stringify({
            venue_type: 'מזון מהיר',
            food_type: 'פלאפל, חומוס', price_range: 'זול', kosher: 'כשר רבנות', meat_dairy: 'פרווה',
            service: ['טייק-אווי'],
            amenities: ['נגישות לכיסא גלגלים'],
            parking: 'אין חניה',
            club_discount: 'יש הנחה', club_discount_detail: 'מנה 11 חינם לחברי מועדון',
            hours: 'א-ה 09:00-19:00, שישי 09:00-14:00',
        }),
        view_count: 287,
    },
    {
        id: 'mock-rest-3', label: 'מסעדת הגליל',
        description: 'מסעדה בשרית עם תפריט עשיר, אווירה חמה ואפשרות הזמנת מקום לאירועים קטנים.',
        icon: '🍷', city: 'ירושלים', neighborhood: 'בקעה',
        phone: '02-5667788', contact: 'הנהלת המסעדה', category: 'restaurants',
        created_at: ago(30), status: 'active',
        extra_fields: JSON.stringify({
            venue_type: 'מסעדה',
            food_type: 'בשרים, מטבח ים-תיכוני', price_range: 'יקר', kosher: 'למהדרין', meat_dairy: 'בשרי',
            service: ['ישיבה במקום', 'הזמנת מקום מראש'],
            amenities: ['ישיבה בחוץ', 'אפשרות הפרדה'],
            parking: 'יש חניה', parking_notes: 'חניה פרטית לסועדים',
            club_discount: 'ללא הנחה',
            hours: 'א-ה 12:00-23:00',
        }),
        view_count: 198,
    },
    {
        id: 'mock-rest-4', label: 'סושי בר תל אביב',
        description: 'סושי טרי במשלוח מהיר, רולים מיוחדים ותפריט טבעוני נרחב.',
        icon: '🍣', city: 'תל אביב', neighborhood: 'פלורנטין',
        phone: '03-5512345', contact: 'דניאל', category: 'restaurants',
        created_at: ago(48), status: 'active',
        extra_fields: JSON.stringify({
            venue_type: 'מסעדה',
            food_type: 'סושי, אסייתי', price_range: 'יקר', kosher: 'ללא',
            service: ['ישיבה במקום', 'משלוחים', 'טייק-אווי'],
            delivery_by: ['Wolt', 'תן ביס'],
            amenities: ['Wi-Fi חופשי'],
            parking: 'אין חניה', parking_notes: 'חניה כחול-לבן ברחובות הסמוכים',
            club_discount: 'יש הנחה', club_discount_detail: 'משלוח חינם לחברי מועדון',
            hours: 'כל יום 12:00-23:30',
        }),
        view_count: 356,
    },
    {
        id: 'mock-rest-5', label: 'בורגר בית בני ברק',
        description: 'המבורגר עסיסי על האש, בשר טחון במקום וצ׳יפס בלגי. מתאים למשפחות.',
        icon: '🍔', city: 'בני ברק', neighborhood: '',
        phone: '03-6778899', contact: 'אבי', category: 'restaurants',
        created_at: ago(60), status: 'active',
        extra_fields: JSON.stringify({
            venue_type: 'מזון מהיר',
            food_type: 'המבורגר', price_range: 'בינוני', kosher: 'למהדרין', meat_dairy: 'בשרי',
            service: ['ישיבה במקום', 'טייק-אווי', 'משלוחים'],
            delivery_by: ['שליח עצמאי'],
            amenities: ['מתאים למשפחות', 'פינת ילדים'],
            parking: 'יש חניה',
            club_discount: 'ללא הנחה',
            hours: 'א-ה 11:30-22:00',
        }),
        view_count: 244,
    },
    {
        id: 'mock-rest-6', label: 'קפה פינתי',
        description: 'בית קפה שכונתי עם מאפים טריים, ארוחות בוקר ופינת ישיבה חוץ נעימה.',
        icon: '☕', city: 'ירושלים', neighborhood: 'רחביה',
        phone: '054-8899001', contact: 'שירה', category: 'restaurants',
        created_at: ago(72), status: 'active',
        extra_fields: JSON.stringify({
            venue_type: 'מסעדה',
            food_type: 'בית קפה, מאפים', price_range: 'בינוני', kosher: 'כשר רבנות', meat_dairy: 'חלבי',
            service: ['ישיבה במקום', 'טייק-אווי'],
            amenities: ['ישיבה בחוץ', 'Wi-Fi חופשי', 'מתאים למשפחות'],
            parking: 'אין חניה',
            club_discount: 'יש הנחה', club_discount_detail: 'קפה שני ב-50% לחברי מועדון',
            hours: 'א-ה 07:00-19:00, שישי 07:00-14:00',
        }),
        view_count: 167,
    },
];

export function getMockRestaurantById(id: string): RestaurantItem | null {
    return mockRestaurants.find((r) => r.id === id) ?? null;
}
