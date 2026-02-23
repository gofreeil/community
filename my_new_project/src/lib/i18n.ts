import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('he', () => Promise.resolve({
    welcome: "קהילה בשכונה",
    app_description: "כל יתרונות השכונה תחת קורת גג אחת",
    hello: "שלום",
    greeting: "שלום,",
    logout: "התנתקות",
    login_register: "התחבר",
    about_us: "אודותינו",
    footer_description: "הפלטפורמה המובילה למיצוי זכויות וקידום הקהילות המקומיות בישראל. ביחד בונים עתיד טוב יותר.",
    quick_links: "קישורים מהירים",
    about: "אודות",
    terms: "תנאי שימוש",
    privacy: "פרטיות",
    partners: "שותפים",
    contact_us: "צור קשר",
    email: "אימייל",
    all_rights_reserved: "כל הזכויות שמורות",
    
    // כותרות ראשיות
    neighborhood_advantages: "יתרונות השכונה",
    all_neighborhoods: "לכלל השכונות",
    discover_neighborhood: "גלה את כל מה שהשכונה שלך מציעה",
    
    // קטגוריות
    all_benefits: "כל היתרונות",
    gemachim: "גמ\"חים",
    giveaway: "למסירה",
    babysitter: "בייבי סיטר",
    judaism: "יהדות",
    classes: "חוגים",
    accommodation: "בתי הארחה לשבת",
    zimmer: "צימרים",
    for_kids: "לילדים",
    shops: "חנויות",
    restaurants: "מסעדות",
    rides: "טרמפים",
    
    // פריטי קטגוריות
    restaurant: "מסעדה",
    fast_food: "מזון מהיר",
    regular_passenger: "נוסע קבוע ל...",
    offer_ride: "מציע טרמפ",
    need_ride: "דרוש טרמפ",
    
    // כפתורים ופעולות
    add_advantage: "הוסף",
    add_item: "הוסף פריט",
    raise_hand: "הרמת יד",
    hand_raised: "יד מורמת - לחץ להורדה",
    open_call: "פתח קריאה",
    cancel: "ביטול",
    details: "פרטים",
    
    // אפשרויות עזרה
    lost_child: "הלך ילד לאיבוד",
    lost_dog: "אבד כלב",
    elderly_help: "מבוגר זקוק לעזרה",
    car_help: "זקוק לעזרה עם הרכב להתנעה",
    other_help: "אחר - כתוב את העזרה הזקוקה לך",
    
    // הודעות מערכת
    login_required: "יש להירשם כדי להוסיף פריטים. מעבר לדף הרשמה...",
    help_sent: "בקשת עזרה נשלחה",
    call_sent_success: "הקריאה נשלחה בהצלחה!",
    community_helped: "הקהילה עזרה לי",
    problem_solved_other: "הבעיה נפתרה אחרת",
    waiting_for_help: "ממתין לעזרה מהקהילה...",
    
    // באנרים
    wishing_wall: "כותל המשאלות",
    community_fund_help: "קופת השכונה לסייע לנזקקים",
    ask_help_fund: "בקש עזרה מקופת הקהילה",
    contact_committee: "פנה לוועד השכונה",
    committee_suggestion: "יש לך הצעה? רוצה לשפר את השכונה? הוועד כאן בשבילך!",
    contact_committee_btn: "צור קשר עם הוועד",
    emergency_team: "כיתת כוننות",
    strengthen_security: "חזק את ביטחון השכונה",
    join_emergency: "הצטרף לכיתת הכוננות של השכונה",
    active_members: "חברים פעילים",
    join_now: "הצטרף עכשיו",
    
    // חדשות
    news_community: "חדשות הקהילה:",
    
    // פרסומות
    peace_houses: "בתי הפיוס",
    have_conflict: "יש לך סיכסוך? לחץ לפתרון",
    volunteers_help: "מתנדבים לתת לך עזרה מלאה בדין / פיוס בכל סיכסוך",
    
    // כותל המשאלות
    add_wish: "הוסף משאלה",
    your_wish: "המשאלה שלך",
    write_wish: "כתוב כאן את המשאלה שלך...",
    wish_tip: "טיפ: כתוב משאלה חיובית ומלאת תקווה",
    add_wish_wall: "הוסף משאלה לכותל",
    wish_added: "המשאלה נוספה בהצלחה!",
    wish_added_wall: "המשאלה שלך נוספה לכותל",
    back_home: "חזרה לדף הבית",
    
    // ערים ושכונות
    select_city_neighborhood: "בחר עיר ושכונה",
    close: "סגור"
}));

register('en', () => Promise.resolve({
    welcome: "Neighborhood Community",
    app_description: "All neighborhood advantages under one roof",
    hello: "Hello",
    greeting: "Hello,",
    logout: "Logout",
    login_register: "Login",
    about_us: "About Us",
    footer_description: "The leading platform for local rights and community advancement in Israel. Together building a better future.",
    quick_links: "Quick Links",
    about: "About",
    terms: "Terms of Use",
    privacy: "Privacy",
    partners: "Partners",
    contact_us: "Contact Us",
    email: "Email",
    all_rights_reserved: "All rights reserved",
    
    // Main titles
    neighborhood_advantages: "Neighborhood Advantages",
    all_neighborhoods: "All Neighborhoods",
    discover_neighborhood: "Discover everything your neighborhood has to offer",
    
    // Categories
    all_benefits: "All Benefits",
    gemachim: "Gemachim",
    giveaway: "Giveaway",
    babysitter: "Babysitter",
    judaism: "Judaism",
    classes: "Classes",
    accommodation: "Shabbat Accommodation",
    zimmer: "Vacation Rentals",
    for_kids: "For Kids",
    shops: "Shops",
    restaurants: "Restaurants",
    rides: "Rides",
    
    // Category items
    restaurant: "Restaurant",
    fast_food: "Fast Food",
    regular_passenger: "Regular passenger to...",
    offer_ride: "Offering ride",
    need_ride: "Need ride",
    
    // Buttons and actions
    add_advantage: "Add",
    add_item: "Add Item",
    raise_hand: "Raise Hand",
    hand_raised: "Hand Raised - Click to Lower",
    open_call: "Open Call",
    cancel: "Cancel",
    details: "Details",
    
    // Help options
    lost_child: "Lost Child",
    lost_dog: "Lost Dog",
    elderly_help: "Elderly Needs Help",
    car_help: "Need Help with Car",
    other_help: "Other - Describe the help you need",
    
    // System messages
    login_required: "Please register to add items. Go to registration page...",
    help_sent: "Help request sent",
    call_sent_success: "Call sent successfully!",
    community_helped: "The community helped me",
    problem_solved_other: "Problem solved otherwise",
    waiting_for_help: "Waiting for community help...",
    
    // Banners
    wishing_wall: "Wishing Wall",
    community_fund_help: "Neighborhood fund to help those in need",
    ask_help_fund: "Ask for help from community fund",
    contact_committee: "Contact Neighborhood Committee",
    committee_suggestion: "Have a suggestion? Want to improve the neighborhood? The committee is here for you!",
    contact_committee_btn: "Contact the Committee",
    emergency_team: "Emergency Team",
    strengthen_security: "Strengthen neighborhood security",
    join_emergency: "Join the neighborhood emergency team",
    active_members: "active members",
    join_now: "Join Now",
    
    // News
    news_community: "Community News:",
    
    // Ads
    peace_houses: "Peace Houses",
    have_conflict: "Have a conflict? Click for solution",
    volunteers_help: "Volunteers to give you full help in law / mediation in any conflict",
    
    // Wishing wall
    add_wish: "Add Wish",
    your_wish: "Your Wish",
    write_wish: "Write your wish here...",
    wish_tip: "Tip: Write a positive and hopeful wish",
    add_wish_wall: "Add Wish to Wall",
    wish_added: "Wish added successfully!",
    wish_added_wall: "Your wish was added to the wall",
    back_home: "Back to Home",
    
    // Cities and neighborhoods
    select_city_neighborhood: "Select City and Neighborhood",
    close: "Close"
}));

register('ru', () => Promise.resolve({
    welcome: "Сообщество района",
    app_description: "Все преимущества района под одной крышей",
    hello: "Привет",
    greeting: "Привет,",
    logout: "Выйти",
    login_register: "Войти",
    about_us: "О нас",
    footer_description: "Ведущая платформа для реализации прав и развития местных сообществ в Израиле. Вместе строим лучшее будущее.",
    quick_links: "Быстрые ссылки",
    about: "О проекте",
    terms: "Условия использования",
    privacy: "Конфиденциальность",
    partners: "Партнеры",
    contact_us: "Связаться с нами",
    email: "Email",
    all_rights_reserved: "Все права защищены",
    
    // Основные заголовки
    neighborhood_advantages: "Преимущества района",
    all_neighborhoods: "Все районы",
    discover_neighborhood: "Откройте для себя все, что может предложить ваш район",
    
    // Категории
    all_benefits: "Все преимущества",
    gemachim: "Гемахи",
    giveaway: "Раздача",
    babysitter: "Няня",
    judaism: "Иудаизм",
    classes: "Кружки",
    accommodation: "Жилье на шаббат",
    zimmer: "Цимеры",
    for_kids: "Для детей",
    shops: "Магазины",
    restaurants: "Рестораны",
    rides: "Поездки",
    
    // Элементы категорий
    restaurant: "Ресторан",
    fast_food: "Быстрое питание",
    regular_passenger: "Постоянный пассажир в...",
    offer_ride: "Предлагаю поездку",
    need_ride: "Нужна поездка",
    
    // Кнопки и действия
    add_advantage: "Добавить",
    add_item: "Добавить элемент",
    raise_hand: "Поднять руку",
    hand_raised: "Рука поднята - нажмите, чтобы опустить",
    open_call: "Открыть вызов",
    cancel: "Отмена",
    details: "Подробности",
    
    // Варианты помощи
    lost_child: "Потерялся ребенок",
    lost_dog: "Потерялась собака",
    elderly_help: "Пожилому нужна помощь",
    car_help: "Нужна помощь с машиной",
    other_help: "Другое - опишите нужную помощь",
    
    // Системные сообщения
    login_required: "Пожалуйста, зарегистрируйтесь для добавления элементов. Перейти на страницу регистрации...",
    help_sent: "Запрос о помощи отправлен",
    call_sent_success: "Вызов отправлен успешно!",
    community_helped: "Сообщество помогло мне",
    problem_solved_other: "Проблема решена по-другому",
    waiting_for_help: "Ожидание помощи от сообщества...",
    
    // Баннеры
    wishing_wall: "Стена желаний",
    community_fund_help: "Фонд района для помощи нуждающимся",
    ask_help_fund: "Попросить помощь у фонда сообщества",
    contact_committee: "Связаться с комитетом района",
    committee_suggestion: "Есть предложение? Хотите улучшить район? Комитет здесь для вас!",
    contact_committee_btn: "Связаться с комитетом",
    emergency_team: "Команда экстренного реагирования",
    strengthen_security: "Укрепить безопасность района",
    join_emergency: "Присоединиться к команде экстренного реагирования района",
    active_members: "активных участников",
    join_now: "Присоединиться сейчас",
    
    // Новости
    news_community: "Новости сообщества:",
    
    // Реклама
    peace_houses: "Дома мира",
    have_conflict: "Есть конфликт? Нажмите для решения",
    volunteers_help: "Волонтеры окажут вам полную помощь в правовых вопросах / посредничестве в любом конфликте",
    
    // Стена желаний
    add_wish: "Добавить желание",
    your_wish: "Ваше желание",
    write_wish: "Напишите здесь ваше желание...",
    wish_tip: "Совет: напишите позитивное и полное надежды желание",
    add_wish_wall: "Добавить желание на стену",
    wish_added: "Желание успешно добавлено!",
    wish_added_wall: "Ваше желание добавлено на стену",
    back_home: "Вернуться домой",
    
    // Города и районы
    select_city_neighborhood: "Выберите город и район",
    close: "Закрыть"
}));

init({
    fallbackLocale: 'he',
    initialLocale: 'he' || getLocaleFromNavigator(),
});