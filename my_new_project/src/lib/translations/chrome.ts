// מילון תרגומים ל"מסגרת" האתר: Header, Footer, +layout
// כל המפתחות תחת namespace "chrome" — שימוש: $_('chrome.key') / tFn('chrome.key')

export const he = {
    chrome: {
        // Header
        about_community_aria: "אודות קהילה",
        choose_language: "בחר שפה",
        login: "כניסה",
        login_personal_area: "כניסה לאזור האישי",
        personal_area: "האזור האישי",
        to_personal_area: "לאזור האישי – {name}",
        unread_messages: "{n} הודעות חדשות",
        unread_system: "{n} התראות מערכת – ממתינות לטיפול",
        unread_private: "{n} התראות פרטיות – הודעות אליי",
        notif_panel_all: "ההתראות שלי",
        notif_panel_system: "התראות מערכת",
        notif_panel_private: "התראות פרטיות",
        notif_panel_all_link: "לכל ההודעות באזור האישי ←",
        online_now: "{n} משתמשים מחוברים כעת",
        my_profile_tooltip: "👤 לפרופיל שלי",

        // Footer
        freedom_movement: "יוצאים לחירות",
        freedom_tagline: "לכלל פעילות התנועה החברתית",
        freedom_link_aria: "יוצאים לחירות – לכלל פעילות התנועה החברתית (נפתח בחלון חדש)",
        footer_nav_aria: "ניווט תחתון",
        legal_links: "תנאי שימוש, הצהרת נגישות וכו'",
        legal_links_l1: "תנאי שימוש",
        legal_links_l2: "הצהרת נגישות וכו'",
        contact_email_aria: "צור קשר – שלח אימייל",
        advertise: "פרסם אצלנו",

        // Layout
        skip_to_content: "דלג לתוכן הראשי",
        close: "סגירה",
        navigating: "טוען את העמוד…",
        register_nudge_text: "כדי שהפלטפורמה תזכור את השכונה שבחרת בפעם הבאה — כדאי להירשם.",
        register_nudge_cta: "הרשמה מהירה",
        profile_nb_saved_text: "השכונה \"{neighborhood}\" ({city}) נשמרה בפרופיל שלך. אפשר לשנות בכל עת.",
        profile_nb_saved_cta: "לפרופיל",

        // כפתור "הורד את האפליקציה" (InstallApp)
        install_app: "להורדת האפליקציה",
        install_ios_1: "לחצו על כפתור השיתוף ⬆️ בסרגל של Safari.",
        install_ios_2: "בחרו ״הוסף למסך הבית״.",
        install_ios_3: "אשרו עם ״הוסף״ — האייקון יופיע ליד שאר האפליקציות.",
        install_ios_note: "לא רואים את האפשרות? פתחו את האתר ב-Safari.",
        install_android_1: "פתחו את תפריט הדפדפן ⋮.",
        install_android_2: "בחרו ״התקנת אפליקציה״ (או ״הוספה למסך הבית״).",
        install_android_note: "מומלץ לפתוח את האתר ב-Chrome.",
        install_desktop_1: "ב-Chrome או Edge: לחצו על סמל ההתקנה ⊕ בקצה שורת הכתובת.",
        install_desktop_2: "או דרך התפריט ⋮ ← ״התקנת קהילה בשכונה״.",
        install_close: "הבנתי",
    },
};

export const en = {
    chrome: {
        // Header
        about_community_aria: "About the community",
        choose_language: "Choose language",
        login: "Sign in",
        login_personal_area: "Sign in to your personal area",
        personal_area: "Personal area",
        to_personal_area: "Go to your personal area – {name}",
        unread_messages: "{n} new messages",
        unread_system: "{n} system alerts awaiting action",
        unread_private: "{n} personal notifications for you",
        notif_panel_all: "My notifications",
        notif_panel_system: "System alerts",
        notif_panel_private: "Personal notifications",
        notif_panel_all_link: "Open all messages →",
        online_now: "{n} users online right now",
        my_profile_tooltip: "👤 My profile",

        // Footer
        freedom_movement: "Out to Freedom",
        freedom_tagline: "All the social movement's activities",
        freedom_link_aria: "Out to Freedom – all the social movement's activities (opens in a new window)",
        footer_nav_aria: "Footer navigation",
        legal_links: "Terms of use, accessibility statement & more",
        legal_links_l1: "Terms of use",
        legal_links_l2: "Accessibility statement & more",
        contact_email_aria: "Contact us – send an email",
        advertise: "Advertise with us",

        // Layout
        skip_to_content: "Skip to main content",
        close: "Close",
        navigating: "Loading the page…",
        register_nudge_text: "Sign up so the platform remembers the neighborhood you chose next time.",
        register_nudge_cta: "Quick sign-up",
        profile_nb_saved_text: "The neighborhood \"{neighborhood}\" ({city}) was saved to your profile. You can change it anytime.",
        profile_nb_saved_cta: "Profile",

        // "Download the app" button (InstallApp)
        install_app: "Download the app",
        install_ios_1: "Tap the Share button ⬆️ in Safari's toolbar.",
        install_ios_2: "Choose \"Add to Home Screen\".",
        install_ios_3: "Confirm with \"Add\" — the icon will appear next to your other apps.",
        install_ios_note: "Don't see it? Open the site in Safari.",
        install_android_1: "Open the browser menu ⋮.",
        install_android_2: "Choose \"Install app\" (or \"Add to Home screen\").",
        install_android_note: "We recommend opening the site in Chrome.",
        install_desktop_1: "In Chrome or Edge: click the install icon ⊕ at the end of the address bar.",
        install_desktop_2: "Or via the menu ⋮ → \"Install app\".",
        install_close: "Got it",
    },
};

export const ru = {
    chrome: {
        // Header
        about_community_aria: "О сообществе",
        choose_language: "Выбрать язык",
        login: "Войти",
        login_personal_area: "Вход в личный кабинет",
        personal_area: "Личный кабинет",
        to_personal_area: "В личный кабинет – {name}",
        unread_messages: "Новых сообщений: {n}",
        unread_system: "Системных уведомлений: {n} — ждут обработки",
        unread_private: "Личных уведомлений: {n}",
        notif_panel_all: "Мои уведомления",
        notif_panel_system: "Системные уведомления",
        notif_panel_private: "Личные уведомления",
        notif_panel_all_link: "Все сообщения в личном кабинете →",
        online_now: "Пользователей онлайн: {n}",
        my_profile_tooltip: "👤 Мой профиль",

        // Footer
        freedom_movement: "Навстречу свободе",
        freedom_tagline: "Вся деятельность общественного движения",
        freedom_link_aria: "Навстречу свободе – вся деятельность общественного движения (откроется в новом окне)",
        footer_nav_aria: "Нижняя навигация",
        legal_links: "Условия использования, декларация о доступности и др.",
        legal_links_l1: "Условия использования",
        legal_links_l2: "Декларация о доступности и др.",
        contact_email_aria: "Связаться с нами – отправить письмо",
        advertise: "Разместить рекламу у нас",

        // Layout
        skip_to_content: "Перейти к основному содержанию",
        close: "Закрыть",
        navigating: "Загрузка страницы…",
        register_nudge_text: "Чтобы платформа запомнила выбранный вами район, стоит зарегистрироваться.",
        register_nudge_cta: "Быстрая регистрация",
        profile_nb_saved_text: "Район «{neighborhood}» ({city}) сохранён в вашем профиле. Его можно изменить в любое время.",
        profile_nb_saved_cta: "В профиль",

        // Кнопка «Скачать приложение» (InstallApp)
        install_app: "Скачать приложение",
        install_ios_1: "Нажмите кнопку «Поделиться» ⬆️ в панели Safari.",
        install_ios_2: "Выберите «На экран “Домой”».",
        install_ios_3: "Подтвердите «Добавить» — значок появится рядом с другими приложениями.",
        install_ios_note: "Не видите этот пункт? Откройте сайт в Safari.",
        install_android_1: "Откройте меню браузера ⋮.",
        install_android_2: "Выберите «Установить приложение» (или «Добавить на главный экран»).",
        install_android_note: "Рекомендуем открыть сайт в Chrome.",
        install_desktop_1: "В Chrome или Edge: нажмите значок установки ⊕ в конце адресной строки.",
        install_desktop_2: "Или через меню ⋮ → «Установить приложение».",
        install_close: "Понятно",
    },
};
