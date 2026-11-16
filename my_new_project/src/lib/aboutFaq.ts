// ============================================================
// aboutFaq.ts - מקור אמת יחיד לשאלות ותשובות בדף "אודותינו" (/about)
//
// גם התצוגה הגלויה בדף (<details>) וגם סכמת FAQPage (JSON-LD) נבנות
// מהרשימה הזו - כך שהטקסט שמנועי החיפוש ומנועי ה-AI קוראים בסכמה זהה
// בדיוק לטקסט שהגולש רואה בדף. שתי שפות, בעקבות i18n של דפי about.
// ============================================================

export interface FaqItem {
    q: string;
    a: string;
}

export type FaqLocale = 'he' | 'en';

export const ABOUT_FAQ: Record<FaqLocale, FaqItem[]> = {
    he: [
        {
            q: 'מה זה "קהילה בשכונה" ומה מטרתו?',
            a: 'קהילה בשכונה (community.gofreeil.com) הוא פלטפורמה שכונתית שמרכזת במקום אחד את כל יתרונות השכונה: גמ"חים, פריטים למסירה ויד שנייה, בייבי סיטר, יהדות, חוגים, אירוח לשבת, צימרים, חנויות ומסעדות, טרמפים, עבודות, שידוכים ואירועים. המטרה היא לחבר תושבים לשירותים המקומיים וליוזמות הקהילתיות בשכונה שלהם, כדי שהעזרה ההדדית תתחיל קרוב לבית.',
        },
        {
            q: 'למי האתר מיועד?',
            a: 'לתושבי השכונות והיישובים בישראל - מי שמחפש או מציע שירות מקומי, ולעסקים מקומיים שרוצים להופיע במפת השכונה. האתר התחיל בירושלים (קרית משה) ותומך בשכונות ובערים נוספות; כל לוח מסונן לפי השכונה שבוחרים. הממשק זמין בעברית ובאנגלית.',
        },
        {
            q: 'מה אפשר למצוא ולעשות באתר?',
            a: 'לגלוש במפה אינטראקטיבית של השכונה ולראות עליה עסקים, גמ"חים ושירותים; לחפש בלוחות לפי קטגוריה - למסירה, בייבי סיטר, חוגים, אירוח לשבת, טרמפים, שידוכים, דרושים, אירועים ואבדות ומציאות; לפרסם פריט או שירות משלכם; "להרים יד" ולבקש עזרה מהשכנים; להוסיף משאלה לכותל המשאלות; ולראות מי בוועד השכונה ובכיתת הכוננות.',
        },
        {
            q: 'האם השימוש באתר בתשלום?',
            a: 'לא. הגלישה, החיפוש והפרסום של תושבים - פריטים למסירה, בקשות עזרה, טרמפים וכדומה - חינם. עסקים ומפרסמים שמעוניינים בפרסומת ממומנת באתר יכולים לרכוש אותה דרך דף "פרסם אצלנו", לפי המחירון שמופיע שם.',
        },
        {
            q: 'איך מצטרפים ומפרסמים באתר?',
            a: 'נרשמים לאתר (או מתחברים לחשבון קיים), משלימים בפרופיל את העיר והשכונה, ואז לוחצים על "הוסף" בקטגוריה המתאימה וממלאים טופס קצר - כולל סימון המיקום על המפה כשצריך. חלק מהקטגוריות דורשות רמת פרופיל גבוהה יותר (למשל "תושב מאומת"), וחלק מהפרסומים - כמו אירועים, מפגשים ופנויים/פנויות - מתפרסמים לאחר אישור מנהל.',
        },
        {
            q: 'מי עומד מאחורי האתר?',
            a: 'האתר הוא חלק מרשת האתרים של התנועה החברתית "יוצאים לחירות" (gofreeil.com). ברשת הזו "קהילה בשכונה" הוא האתר המקומי: בעוד אתרים אחרים ברשת עוסקים בגמ"חים ארציים, בבעלי מקצוע, ברכישות קבוצתיות או בביקורת על הרשויות - כאן מתמקדים במה שקורה בתוך השכונה עצמה. את הפעילות בשטח מובילים רכזי שכונות, ומודל ההכנסות של האתר וחלוקתן מוצגים בשקיפות בדף "אודות".',
        },
        {
            q: 'במה האתר שונה מאתרים דומים?',
            a: 'הכול מאורגן לפי שכונה ולא לפי ארץ שלמה, כך שמה שרואים באמת קרוב לבית. הפלטפורמה מאחדת תחומים שבדרך כלל מפוזרים באתרים ובקבוצות שונות - גמ"ח, מסירה, בייבי סיטר, חוגים, טרמפים, שידוכים ואירועים - תחת קורת גג אחת. השימוש לתושבים חינם, בלי תיווך ובלי עמלה על מה שעובר בין שכנים, וההכנסות מהפרסום מתחלקות באופן גלוי בין הפלטפורמה, רכזי השכונות וצדקה.',
        },
        {
            q: 'מה זה "הרמת יד" באתר?',
            a: 'הרמת יד היא קריאת עזרה מהירה לשכנים: בוחרים סוג בקשה, והקריאה מופיעה על מפת השכונה למשך יממה ובדף הבית עד שתושב לוחץ "אני עוזר". כך פנייה קטנה - הובלה, השאלה, סיוע דחוף - מגיעה למי שנמצא ממש קרוב.',
        },
        {
            q: 'איך יוצרים קשר או מדווחים על בעיה?',
            a: 'בדוא"ל freedomhasbegun@gmail.com - הכתובת מופיעה גם בקישור "צור קשר" בתחתית כל דף. פניות בנושאי נגישות, פרטיות ותנאי שימוש מרוכזות בדף המסמכים המשפטיים של האתר.',
        },
    ],
    en: [
        {
            q: 'What is "Community in the Neighborhood" and what is its purpose?',
            a: 'Community in the Neighborhood (community.gofreeil.com) is a neighborhood platform that gathers all the advantages of the neighborhood in one place: gemachim (free lending), giveaways and second-hand items, babysitters, Judaism, classes, Shabbat hospitality, holiday rentals, shops and restaurants, rides, jobs, matchmaking and events. Its purpose is to connect residents with local services and community initiatives in their own neighborhood, so that mutual help starts close to home.',
        },
        {
            q: 'Who is the site for?',
            a: 'For residents of neighborhoods and towns across Israel - anyone looking for or offering a local service - and for local businesses that want to appear on the neighborhood map. The site started in Jerusalem (Kiryat Moshe) and supports additional neighborhoods and cities; every board is filtered by the neighborhood you choose. The interface is available in Hebrew and English.',
        },
        {
            q: 'What can you find and do on the site?',
            a: 'Browse an interactive map of the neighborhood showing businesses, gemachim and services; search the boards by category - giveaways, babysitters, classes, Shabbat hospitality, rides, matchmaking, jobs, events and lost & found; post an item or service of your own; "raise a hand" to ask neighbors for help; add a wish to the Wish Wall; and see who is on the neighborhood committee and the emergency response team.',
        },
        {
            q: 'Does using the site cost money?',
            a: 'No. Browsing, searching and residents\' posts - giveaways, help requests, rides and the like - are free. Businesses and advertisers who want a sponsored ad on the site can purchase one through the "Advertise with us" page, according to the price list shown there.',
        },
        {
            q: 'How do I join and post?',
            a: 'Sign up (or log in to an existing account), complete your city and neighborhood in your profile, then click "Add" in the relevant category and fill in a short form - including marking the location on the map when needed. Some categories require a higher profile level (for example "Verified resident"), and some posts - such as events, gatherings and singles - are published after admin approval.',
        },
        {
            q: 'Who is behind the site?',
            a: 'The site is part of the network of sites of the "Going Out to Freedom" (Yotzim LeCherut) social movement (gofreeil.com). Within that network, Community in the Neighborhood is the local site: while other sites in the network deal with national gemachim, professionals, group purchases or oversight of public authorities, this one focuses on what happens inside the neighborhood itself. Neighborhood coordinators lead the activity on the ground, and the site\'s revenue model and its distribution are presented transparently on the "About" page.',
        },
        {
            q: 'How is the site different from similar sites?',
            a: 'Everything is organized by neighborhood rather than by the whole country, so what you see is truly close to home. The platform brings together areas that are usually scattered across different sites and groups - gemach, giveaways, babysitters, classes, rides, matchmaking and events - under one roof. Use is free for residents, with no brokerage and no commission on what passes between neighbors, and advertising revenue is divided openly between the platform, neighborhood coordinators and charity.',
        },
        {
            q: 'What is "raising a hand" on the site?',
            a: 'Raising a hand is a quick call for help to your neighbors: you choose the type of request, and the call appears on the neighborhood map for 24 hours and on the home page until a resident clicks "I\'ll help". This way a small request - a move, a loan, urgent assistance - reaches someone who is really nearby.',
        },
        {
            q: 'How do I get in touch or report a problem?',
            a: 'By email at freedomhasbegun@gmail.com - the address also appears in the "Contact us" link at the bottom of every page. Inquiries about accessibility, privacy and terms of use are handled through the site\'s legal documents page.',
        },
    ],
};

/** השו"ת בשפה המבוקשת, עם נפילה לעברית. */
export function aboutFaq(locale: string | null | undefined): FaqItem[] {
    const key = (locale || 'he').slice(0, 2) as FaqLocale;
    return ABOUT_FAQ[key] ?? ABOUT_FAQ.he;
}
