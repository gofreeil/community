import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('he', () => Promise.resolve({
    welcome: "ברוכים הבאים לקהילה",
    app_description: "מיצוי פוטנציאל הקהילה שלך",
    hello: "שלום",
    greeting: "שלום,",
    logout: "התנתקות",
    login_register: "כניסה / הרשמה"
}));

register('en', () => Promise.resolve({
    welcome: "Welcome to Community",
    app_description: "Empowering your local community",
    hello: "Hello",
    greeting: "Hello,",
    logout: "Logout",
    login_register: "Login / Register"
}));

register('ru', () => Promise.resolve({
    welcome: "Добро пожаловать",
    app_description: "Расширение возможностей вашего сообщества",
    hello: "Привет",
    greeting: "Привет,",
    logout: "Выйти",
    login_register: "Вход / Регистрация"
}));

init({
    fallbackLocale: 'he',
    initialLocale: 'he' || getLocaleFromNavigator(),
});
