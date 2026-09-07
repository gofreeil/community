// ============================================================
// aboutFaq.ts - מקור אמת יחיד לשאלות ותשובות בדף "אודותינו" (/about)
//
// גם התצוגה הגלויה בדף (<details>) וגם סכמת FAQPage (JSON-LD) נבנות
// מהרשימה הזו - כך שהטקסט שמנועי החיפוש ומנועי ה-AI קוראים בסכמה זהה
// בדיוק לטקסט שהגולש רואה בדף. שלוש שפות, בעקבות i18n של דפי about.
// ============================================================

export interface FaqItem {
    q: string;
    a: string;
}

export type FaqLocale = 'he' | 'en' | 'ru';

export const ABOUT_FAQ: Record<FaqLocale, FaqItem[]> = {
    he: [
        {
            q: 'מה זה "קהילה בשכונה" ומה מטרתו?',
            a: 'קהילה בשכונה (community.gofreeil.com) הוא פלטפורמה שכונתית שמרכזת במקום אחד את כל יתרונות השכונה: גמ"חים, פריטים למסירה ויד שנייה, בייבי סיטר, יהדות, חוגים, אירוח לשבת, צימרים, חנויות ומסעדות, טרמפים, עבודות, שידוכים ואירועים. המטרה היא לחבר תושבים לשירותים המקומיים וליוזמות הקהילתיות בשכונה שלהם, כדי שהעזרה ההדדית תתחיל קרוב לבית.',
        },
        {
            q: 'למי האתר מיועד?',
            a: 'לתושבי השכונות והיישובים בישראל - מי שמחפש או מציע שירות מקומי, ולעסקים מקומיים שרוצים להופיע במפת השכונה. האתר התחיל בירושלים (קרית משה) ותומך בשכונות ובערים נוספות; כל לוח מסונן לפי השכונה שבוחרים. הממשק זמין בעברית, באנגלית וברוסית.',
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
            a: 'For residents of neighborhoods and towns across Israel - anyone looking for or offering a local service - and for local businesses that want to appear on the neighborhood map. The site started in Jerusalem (Kiryat Moshe) and supports additional neighborhoods and cities; every board is filtered by the neighborhood you choose. The interface is available in Hebrew, English and Russian.',
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
    ru: [
        {
            q: 'Что такое «Община в районе» и какова его цель?',
            a: '«Община в районе» (community.gofreeil.com) - это районная платформа, которая собирает в одном месте все преимущества района: гмахи (бесплатный прокат), вещи в дар и б/у, няни, иудаизм, кружки, гостеприимство на шаббат, дома отдыха, магазины и рестораны, попутки, работа, знакомства и мероприятия. Цель - связать жителей с местными услугами и общественными инициативами в их собственном районе, чтобы взаимопомощь начиналась рядом с домом.',
        },
        {
            q: 'Для кого предназначен сайт?',
            a: 'Для жителей районов и населённых пунктов Израиля - тех, кто ищет или предлагает местную услугу, - и для местных бизнесов, которые хотят появиться на карте района. Сайт начался в Иерусалиме (Кирьят-Моше) и поддерживает дополнительные районы и города; каждая доска фильтруется по выбранному району. Интерфейс доступен на иврите, английском и русском.',
        },
        {
            q: 'Что можно найти и сделать на сайте?',
            a: 'Просматривать интерактивную карту района с бизнесами, гмахами и услугами; искать на досках по категориям - в дар, няни, кружки, гостеприимство на шаббат, попутки, знакомства, вакансии, мероприятия и бюро находок; публиковать собственную вещь или услугу; «поднять руку» и попросить помощи у соседей; добавить желание на Стену желаний; и увидеть, кто входит в районный комитет и в группу быстрого реагирования.',
        },
        {
            q: 'Платное ли использование сайта?',
            a: 'Нет. Просмотр, поиск и публикации жителей - вещи в дар, просьбы о помощи, попутки и тому подобное - бесплатны. Бизнесы и рекламодатели, желающие разместить спонсорскую рекламу на сайте, могут приобрести её через страницу «Разместить рекламу у нас» по указанному там прайс-листу.',
        },
        {
            q: 'Как присоединиться и опубликовать объявление?',
            a: 'Зарегистрируйтесь (или войдите в существующий аккаунт), заполните в профиле город и район, затем нажмите «Добавить» в нужной категории и заполните короткую форму - при необходимости отметив место на карте. Некоторые категории требуют более высокого уровня профиля (например, «Проверенный житель»), а некоторые публикации - мероприятия, встречи и знакомства - выходят после одобрения администратора.',
        },
        {
            q: 'Кто стоит за сайтом?',
            a: 'Сайт входит в сеть сайтов общественного движения «Выходим на свободу» (Йоцим ле-Херут, gofreeil.com). В этой сети «Община в районе» - местный сайт: в то время как другие сайты сети занимаются всеизраильскими гмахами, специалистами, групповыми закупками или контролем над властями, здесь внимание сосредоточено на том, что происходит внутри самого района. Деятельность на местах ведут районные координаторы, а модель доходов сайта и их распределение прозрачно представлены на странице «О проекте».',
        },
        {
            q: 'Чем сайт отличается от похожих сайтов?',
            a: 'Всё организовано по районам, а не по всей стране, поэтому то, что вы видите, действительно рядом с домом. Платформа объединяет области, обычно разбросанные по разным сайтам и группам, - гмах, вещи в дар, няни, кружки, попутки, знакомства и мероприятия - под одной крышей. Использование бесплатно для жителей, без посредничества и без комиссии за то, что передаётся между соседями, а доходы от рекламы открыто делятся между платформой, районными координаторами и благотворительностью.',
        },
        {
            q: 'Что такое «поднять руку» на сайте?',
            a: 'Поднять руку - это быстрый призыв о помощи к соседям: вы выбираете тип просьбы, и она появляется на карте района на сутки и на главной странице, пока какой-нибудь житель не нажмёт «Я помогу». Так небольшая просьба - перевозка, одолжить что-то, срочная помощь - доходит до того, кто находится совсем рядом.',
        },
        {
            q: 'Как связаться или сообщить о проблеме?',
            a: 'По электронной почте freedomhasbegun@gmail.com - адрес также есть в ссылке «Связаться с нами» внизу каждой страницы. Обращения по вопросам доступности, конфиденциальности и условий использования принимаются через страницу юридических документов сайта.',
        },
    ],
};

/** השו"ת בשפה המבוקשת, עם נפילה לעברית. */
export function aboutFaq(locale: string | null | undefined): FaqItem[] {
    const key = (locale || 'he').slice(0, 2) as FaqLocale;
    return ABOUT_FAQ[key] ?? ABOUT_FAQ.he;
}
