// src/lib/itemsData.ts

export interface Item {
    id: string;
    label: string;
    category: string;
    description: string;
    contact?: string;
    phone?: string;
    address?: string;
    icon: string;
    color: string;
    image?: string;
}

export const items: Item[] = [
    {
        id: "gemach-books",
        label: 'גמ"ח ספרים',
        category: "gemachim",
        description: "מגוון רחב של ספרי קודש וקריאה לכל הגילאים. השאלה ללא עלות לתקופה של עד חודש.",
        contact: "משפחת כהן",
        phone: "050-1234567",
        address: "רחוב המגיד 12, קרית משה",
        icon: "🎁",
        color: "purple",
        image: "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=800&auto=format&fit=crop&q=60"
    },
    {
        id: "babysitter-shira",
        label: "שירה בייביסיטר",
        category: "business",
        description: "בייביסיטר מנוסה ואחראית בערבים ובסופי שבוע. אוהבת ילדים וסבלנית מאוד.",
        contact: "שירה לוי",
        phone: "052-7654321",
        address: "רחוב קרית משה 5",
        icon: "👶",
        color: "pink",
        image: "https://images.unsplash.com/photo-1544126592-807daa215a75?w=800&auto=format&fit=crop&q=60"
    },
    {
        id: "minyan-shacharit",
        label: "מניין שחרית מרכזי",
        category: "minyanim",
        description: "מניין שחרית יומיומי בשעה 7:00. אווירה נעימה ומכובדת.",
        address: "בית הכנסת האזורי, קרית משה",
        icon: "✡️",
        color: "blue",
        image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&auto=format&fit=crop&q=60"
    },
    {
        id: "shop-makolet",
        label: "מכולת השכונה 24/7",
        category: "shops",
        description: "כל מוצרי הצריכה הבסיסיים, פירות וירקות טריים בכל שעות היממה.",
        phone: "03-1234567",
        address: "רחוב הרצל 20",
        icon: "🏪",
        color: "green",
        image: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&auto=format&fit=crop&q=60"
    },
    {
        id: "giveaway-sofa",
        label: "ספה למסירה",
        category: "giveaway",
        description: "ספה דו-מושבית במצב מצוין, נוחה מאוד. למסירה עקב מעבר דירה.",
        contact: "אבי גולדשטיין",
        phone: "054-9876543",
        address: "רחוב הכנפיים 8",
        icon: "📦",
        color: "orange",
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=60"
    },
    {
        id: "activity-soccer",
        label: "חוג כדורגל לילדים",
        category: "education",
        description: "חוג כדורגל מקצועי לילדים בגילאי 6-12. דגש על עבודת צוות וכושר גופני.",
        contact: "יוסי המאמן",
        phone: "058-1234567",
        address: "המגרש הקהילתי",
        icon: "🎨",
        color: "red",
        image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=60"
    }
];

export function getItemById(id: string): Item | undefined {
    return items.find(item => item.id === id);
}
