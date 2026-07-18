// מילון תרגומים לדף השגיאה המותאם (+error.svelte)
// כל המפתחות תחת namespace "errors" — שימוש: $_('errors.key')

export const he = {
    errors: {
        code_label: "קוד שגיאה",
        title_500: "אופס, משהו השתבש",
        body_500: "אירעה תקלה זמנית מצידנו בטעינת העמוד. הצוות שלנו קיבל על כך התראה ונטפל בזה. אפשר לנסות שוב או לחזור לדף הבית.",
        title_404: "העמוד לא נמצא",
        body_404: "הקישור שביקשתם אינו קיים או שהוסר. אפשר לחזור לדף הבית ולהמשיך משם.",
        title_403: "אין הרשאה לצפות בעמוד",
        body_403: "העמוד הזה דורש הרשאה מתאימה או התחברות. נסו להתחבר, או חזרו לדף הבית.",
        try_again: "נסה שוב",
        back_home: "חזרה לדף הבית",
        ref_prefix: "מזהה תקלה",
    },
};

export const en = {
    errors: {
        code_label: "Error code",
        title_500: "Oops, something went wrong",
        body_500: "We hit a temporary glitch loading this page. Our team has been notified and is on it. You can try again or head back home.",
        title_404: "Page not found",
        body_404: "The page you're looking for doesn't exist or was moved. Let's get you back home.",
        title_403: "You don't have access to this page",
        body_403: "This page requires the right permission or a login. Try signing in, or head back home.",
        try_again: "Try again",
        back_home: "Back to home",
        ref_prefix: "Reference",
    },
};

export const ru = {
    errors: {
        code_label: "Код ошибки",
        title_500: "Упс, что-то пошло не так",
        body_500: "Произошёл временный сбой при загрузке страницы. Наша команда уже получила уведомление и разбирается. Попробуйте ещё раз или вернитесь на главную.",
        title_404: "Страница не найдена",
        body_404: "Запрашиваемая страница не существует или была перемещена. Вернитесь на главную и продолжите оттуда.",
        title_403: "Нет доступа к этой странице",
        body_403: "Эта страница требует соответствующего разрешения или входа в систему. Попробуйте войти или вернитесь на главную.",
        try_again: "Попробовать снова",
        back_home: "На главную",
        ref_prefix: "Идентификатор",
    },
};
