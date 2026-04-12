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
}

export const ads: Ad[] = [
    {
        id: 1,
        title: "בתי הפיוס",
        description: "מתנדבים לתת לך עזרה מלאה בדין / פיוס בכל סיכסוך",
        cta: "יש לך סיכסוך? לחץ לפתרון",
        href: "https://www.melecshop.com/page/peace-on-earth",
        image: "/images/bati-hapius.png",
        color: "from-orange-600 to-red-600"
    },
    {
        id: 9,
        title: 'הגמ"ח הארצי',
        description: 'כל הגמחים תחת קורת גג אחת',
        cta: 'הגמ"ח הארצי – כל הגמחים תחת קורת גג אחת',
        href: "https://national-gemach.vercel.app/",
        image: "/images/gemach-harzi.png",
        color: "from-pink-600 via-fuchsia-600 to-purple-700",
    },
    {
        id: 2,
        title: "ועדי שכונות",
        description: "מהפכת משילות העם על המוסדות",
        cta: "הכר והשתתף במהפכת משילות העם על מוסדותיו",
        href: "https://www.melecshop.com/page/peace-on-earth_VRHH",
        image: "/images/news/vaadei-shchunot.png",
        color: "from-blue-600 to-cyan-600"
    },
    {
        id: 5,
        title: "מבקר רשויות המדינה",
        description: "מבקרים את הרשויות, ממצים את זכות התושב",
        cta: "מבקרים את הרשויות, ממצים את זכות התושב",
        href: "https://right-to-live.vercel.app/",
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
        href: "https://public-rating-il.vercel.app/",
        image: "/images/public-rating.jpeg",
        color: "from-indigo-600 to-blue-600",
        imageHeight: "200px",
        imageScale: 0.9,
    },
    {
        id: 3,
        title: "קבוצת רכישה",
        description: "הוזל את ההוצאות שלך",
        cta: "הצטרף לקבוצת הרכישה שלנו והוזל מיד את ההוצאות!",
        href: "https://purchasing-groups.vercel.app/",
        image: "/images/whatsapp_cta.png",
        color: "from-green-800 to-emerald-900"
    },
    {
        id: 4,
        title: "מועדון המשקיעים החברתי",
        description: "התחבר עם קבוצת המשקיעים שלנו",
        cta: "התחבר עם קבוצת המשקיעים שלנו",
        href: "https://www.melecshop.com/page/free",
        image: "/images/partners/investments.png",
        color: "from-amber-600 to-orange-600"
    },
    {
        id: 6,
        title: "בעלי מקצוע כשירים",
        description: "חתמו על תנאי הקהילה ונותנים לנו הנחות והטבות יחודיות",
        cta: "מחפש בעל מקצוע איכותי באזורך?",
        href: "https://index-chi-sage.vercel.app/",
        image: "/images/professionals.png",
        color: "from-yellow-500 to-orange-500"
    },
    {
        id: 8,
        title: "נפגת?",
        description: "אנו נסייע לך!",
        cta: "סיוע לנפגעי תקיפה מינית",
        href: "https://www.melecshop.com/page/kids_FNL3",
        image: "/images/support-victims.jpeg",
        color: "from-fuchsia-600 to-pink-600"
    }
];
