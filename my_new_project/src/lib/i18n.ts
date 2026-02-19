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
    all_rights_reserved: "כל הזכויות שמורות"
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
    all_rights_reserved: "All rights reserved"
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
    contact_us: "Связаться עם נ",
    email: "Email",
    all_rights_reserved: "Все права защищены"
}));

init({
    fallbackLocale: 'he',
    initialLocale: 'he' || getLocaleFromNavigator(),
});
