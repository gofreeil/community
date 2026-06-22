export interface Ad {
    id: number;
    title: string;
    description: string;
    cta: string;
    href: string;
    image: string;
    color: string;
    imageHeight?: string;   // גובה מותאם לתמונה (ברירת מחדל: auto)
    imageScale?: number;    // זום על התמונה (ברירת מחדל: 1)
    hover?: string;         // טקסט tooltip בריחוף מעל כפתור ה-CTA
}

export const ads: Ad[] = [
    {
        id: 1,
        title: "בתי הפיוס",
        description: "מתנדבים לתת לך עזרה מלאה בדין / פיוס בכל סיכסוך",
        cta: "יש לך סיכסוך? לחץ לפתרון",
        href: "https://chachmim.gofreeil.com/",
        image: "/images/bati-hapius.png",
        color: "from-orange-600 to-red-600"
    },
    {
        id: 9,
        title: 'הגמ"ח הארצי',
        description: 'כל הגמחים תחת קורת גג אחת',
        cta: 'לאתר הגמ"ח הארצי',
        hover: 'מצא כל גמח בקלות!',
        href: "https://gemach.gofreeil.com/",
        image: "/images/gemach-harzi.png",
        color: "from-pink-600 via-fuchsia-600 to-purple-700",
    },
    {
        id: 2,
        title: "ועדי שכונות",
        description: "מהפכת משילות העם על המוסדות",
        cta: "הכר והשתתף במהפכת משילות העם על מוסדותיו",
        href: "https://neighborhoods.gofreeil.com/",
        image: "/images/news/vaadei-shchunot.png",
        color: "from-blue-600 to-cyan-600",
        imageHeight: "110px"
    },
    {
        id: 5,
        title: "מבקר רשויות המדינה",
        description: "מבקרים את הרשויות, ממצים את זכות התושב",
        cta: "מבקרים את הרשויות, ממצים את זכות התושב",
        href: "https://criticism.gofreeil.com/",
        image: "/images/mevaker-rashuyot.png",
        color: "from-blue-700 to-indigo-700",
        imageHeight: "120px",
        imageScale: 1.2,
    },
    {
        id: 10,
        title: "דירוג ציבורי",
        description: "העם מדרג את הרשויות ועובדי הציבור",
        cta: "העם מדרג את הרשויות ועובדי הציבור",
        href: "https://rating.gofreeil.com/",
        image: "/images/public-rating.jpeg",
        color: "from-indigo-600 to-blue-600",
        imageHeight: "110px",
        imageScale: 0.9,
    },
    {
        id: 8,
        title: "משאלי העם",
        description: "הבע דעתך על הסוגיות האקטואליות",
        cta: "הבע דעתך על הסוגיות האקטואליות",
        hover: "הבע דעתך על הסוגיות האקטואליות",
        href: "https://referendum.gofreeil.com/",
        image: "/images/referendum.png",
        color: "from-purple-600 to-indigo-700"
    },
    {
        id: 3,
        title: "קבוצת רכישה",
        description: "הוזל את ההוצאות שלך",
        cta: "הצטרף לקבוצת הרכישה שלנו והוזל מיד את ההוצאות!",
        href: "https://groups.gofreeil.com/",
        image: "/images/whatsapp_cta.png",
        color: "from-green-800 to-emerald-900"
    },
    {
        id: 6,
        title: "בעלי מקצוע כשירים",
        description: "חתמו על תנאי הקהילה ונותנים לנו הנחות והטבות יחודיות",
        cta: "מחפש בעל מקצוע איכותי באזורך?",
        href: "https://index.gofreeil.com/",
        image: "/images/professionals.png",
        color: "from-yellow-500 to-orange-500",
        imageHeight: "110px"
    },
    {
        id: 7,
        title: "חנות החירות",
        description: "מוצרים נבחרים לבריאות טבעית, חקלאות ביתית, טכנולוגיה ועוד",
        cta: "כנסו לחנות לחיים טובים יותר",
        hover: "החנות שלנו!",
        href: "https://shop.gofreeil.com/",
        image: "/images/shop.png",
        color: "from-emerald-600 to-teal-700",
        imageHeight: "110px"
    }
];
