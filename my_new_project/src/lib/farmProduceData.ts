// src/lib/farmProduceData.ts
// נתוני "חקלאות ישירה" — מוצרים שחקלאים מספקים לשכונה, ומידע על מועד ומקום המכירה.
// כל שכונה רואה רשימת מוצרים ומועד מכירה משלה. כל עוד אין נתון אמיתי לשכונה
// מוצגות דוגמאות mock כדי שהדף לא ייראה ריק.

export interface FarmProduct {
    id: string;
    name: string;        // שם המוצר
    supplier: string;    // שם המספק / החקלאי
    logo: string;        // אמוג'י לוגו
    price: number;       // מחיר ב-₪
    unit: string;        // יחידת מכירה: "שקית ארוזה" / "סלסלה" / 'ק"ג'
    notes: string;       // הערות
}

export interface SaleInfo {
    location: string;    // מקום המכירה
    day: string;         // יום
    time: string;        // שעה
}

// מידע מכירה ברירת מחדל לכל שכונה
export const defaultSaleInfo: SaleInfo = {
    location: 'מרכז המסחרי השכונתי',
    day: 'יום חמישי',
    time: '16:00 – 19:00',
};

// מידע מכירה לפי שכונה
const saleInfoByNeighborhood: Record<string, SaleInfo> = {
    'קרית משה': {
        location: 'חניית בית הכנסת המרכזי, רחוב המגיד',
        day: 'יום שלישי',
        time: '17:00 – 20:00',
    },
};

// מוצרי דוגמה לפי שכונה
const productsByNeighborhood: Record<string, FarmProduct[]> = {
    'קרית משה': [
        { id: 'km-1', name: 'סלסלת ירקות עונתיים', supplier: 'משק שדה לבן', logo: '🥬', price: 65, unit: 'סלסלה', notes: 'נקטף בבוקר המכירה — מגוון 7–9 ירקות' },
        { id: 'km-2', name: 'שקית עגבניות שרי אורגניות', supplier: 'משק שדה לבן', logo: '🍅', price: 22, unit: 'שקית ארוזה', notes: '500 גרם, ללא ריסוס' },
        { id: 'km-3', name: 'ביצים חופש טריות', supplier: 'לול הרי יהודה', logo: '🥚', price: 32, unit: 'תבנית (12)', notes: 'מתרנגולות חופשיות' },
        { id: 'km-4', name: 'דבש פרחי בר', supplier: 'מכוורת הניר', logo: '🍯', price: 48, unit: 'צנצנת 500 גרם', notes: 'קציר אביב — כמות מוגבלת' },
        { id: 'km-5', name: 'סלסלת פירות העונה', supplier: 'מטעי גלעד', logo: '🍑', price: 55, unit: 'סלסלה', notes: 'נשמרי + אפרסקים, לפי הקטיף' },
        { id: 'km-6', name: 'גבינת עיזים כפרית', supplier: 'משק החלב הקטן', logo: '🧀', price: 38, unit: 'מארז 250 גרם', notes: 'מחלב עיזים מקומי' },
    ],
};

// יצירת מוצרי mock גנריים לשכונה ללא נתון אמיתי
function buildMockProducts(): FarmProduct[] {
    return [
        { id: 'mock-1', name: 'סלסלת ירקות עונתיים', supplier: 'משק מקומי', logo: '🥬', price: 60, unit: 'סלסלה', notes: 'מגוון ירקות טריים מהשדה' },
        { id: 'mock-2', name: 'שקית פירות העונה', supplier: 'מטע האזור', logo: '🍎', price: 45, unit: 'שקית ארוזה', notes: 'נקטף סמוך למועד המכירה' },
        { id: 'mock-3', name: 'ביצים חופש טריות', supplier: 'לול שכונתי', logo: '🥚', price: 30, unit: 'תבנית (12)', notes: 'מתרנגולות חופשיות' },
        { id: 'mock-4', name: 'דבש טבעי', supplier: 'מכוורת מקומית', logo: '🍯', price: 45, unit: 'צנצנת 500 גרם', notes: 'כמות מוגבלת' },
    ];
}

export function getProductsForNeighborhood(neighborhood: string): FarmProduct[] {
    return productsByNeighborhood[neighborhood] ?? buildMockProducts();
}

export function getSaleInfoForNeighborhood(neighborhood: string): SaleInfo {
    return saleInfoByNeighborhood[neighborhood] ?? defaultSaleInfo;
}

export function hasRealData(neighborhood: string): boolean {
    return neighborhood in productsByNeighborhood;
}
