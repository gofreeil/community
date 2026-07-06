// מילון תרגומים לדפי חשבון: login, register, forgot-password, reset-password,
// confirm-email, banned, sso-adopt
// כל המפתחות תחת namespace "account" — שימוש: $_('account.key') / tFn('account.key')

export const he = {
    account: {
        // login — שגיאות OAuth/Credentials (מפתח לפי קוד שגיאה של Auth.js)
        err_oauth_signin: "שגיאה בהתחברות. נסה שוב.",
        err_oauth_callback: "שגיאה בחזרה מהספק. נסה שוב.",
        err_oauth_not_linked: "החשבון כבר קיים עם ספק אחר.",
        err_callback: "שגיאה בתהליך ההתחברות.",
        err_credentials: "אימייל או סיסמה שגויים. אם נרשמת לאחרונה - ודא שאישרת את האימייל.",
        err_unknown: "שגיאה לא ידועה. נסה שוב.",

        // login — טופס
        forgot_password_link: "שכחתי סיסמה",
        logging_in: "מתחבר...",
        login_submit: "התחבר",
        login_submit_email: "התחבר עם אימייל וסיסמה",
        terms_privacy_link: "תנאי השימוש ומדיניות הפרטיות",

        // register — הצלחה + נגישות
        email_sent_title: "נשלח אימייל אישור!",
        email_sent_to: "שלחנו קישור אישור לכתובת:",
        email_sent_instructions: "לחץ על הקישור במייל כדי להפעיל את החשבון ואז תוכל להתחבר.",
        go_to_login: "עבור לכניסה",
        show_confirm_password: "הצג אישור סיסמה",
        hide_confirm_password: "הסתר אישור סיסמה",

        // forgot-password
        locked_title: "חשבון ננעל",
        forgot_title: "שכחתי סיסמה",
        locked_subtitle: "יש לפנות לרכז השכונה לפתיחת החשבון",
        security_question_subtitle: "ענה על שאלת הביטחון כדי לאפס את הסיסמה",
        reset_link_subtitle: "נשלח אליך קישור לאיפוס הסיסמה",
        locked_after_attempts: "החשבון ננעל לאחר 3 ניסיונות כושלים",
        locked_coordinator_notified: "רכז השכונה קיבל הודעה ויצור קשר איתך בהקדם.",
        locked_email: "אימייל: {email}",
        email_sent_ok: "המייל נשלח!",
        email_sent_note: "אם האימייל רשום במערכת, תקבל קישור לאיפוס סיסמה בדקות הקרובות.",
        back_to_login: "חזרה לכניסה",
        your_security_question: "שאלת הביטחון שלך:",
        answer_label: "תשובה",
        answer_placeholder: "הכנס את תשובתך",
        checking: "בודק...",
        verify_and_send: "אמת ושלח קישור",
        try_another_email: "הזן אימייל אחר",
        email_address_label: "כתובת אימייל",
        continue_btn: "המשך",

        // reset-password
        reset_title: "איפוס סיסמה",
        reset_subtitle: "בחר סיסמה חדשה לחשבון שלך",
        password_updated: "הסיסמה עודכנה!",
        password_updated_note: "כעת תוכל להתחבר עם הסיסמה החדשה.",
        login_to_account: "כניסה לחשבון",
        invalid_link: "קישור לא תקין.",
        request_new_link: "בקש קישור חדש",
        new_password_label: "סיסמה חדשה",
        confirm_password: "אישור סיסמה",
        repeat_password_placeholder: "חזור על הסיסמה",
        show_short: "הצג",
        hide_short: "הסתר",
        updating: "מעדכן...",
        update_password: "עדכן סיסמה",

        // confirm-email
        verify_failed_title: "האימות נכשל",
        verify_failed_desc: "הקישור אינו תקין או פג תוקפו.",
        register_again: "הרשמה מחדש",
        email_confirmed_title: "האימייל אושר!",
        email_confirmed_desc: "החשבון שלך פעיל. כעת תוכל להתחבר.",

        // banned
        banned_title: "חשבונך הושעה",
        banned_desc_1: "חשבונך הושעה על ידי מנהל הקהילה בגלל הפרת כללי השימוש.",
        banned_desc_2: "אם אתה חושב שזו טעות, פנה למנהל השכונה.",
        contact_support: "📧 צור קשר עם התמיכה",

        // sso-adopt
        sso_identifying: 'מזהה אותך דרך "יוצאים לחירות"…',
    },
};

export const en = {
    account: {
        // login — OAuth/Credentials errors (keyed by Auth.js error code)
        err_oauth_signin: "Sign-in error. Please try again.",
        err_oauth_callback: "Error returning from the provider. Please try again.",
        err_oauth_not_linked: "This account already exists with a different provider.",
        err_callback: "Error during the sign-in process.",
        err_credentials: "Incorrect email or password. If you registered recently, make sure you confirmed your email.",
        err_unknown: "Unknown error. Please try again.",

        // login — form
        forgot_password_link: "Forgot password",
        logging_in: "Signing in...",
        login_submit: "Sign in",
        login_submit_email: "Sign in with email and password",
        terms_privacy_link: "Terms of Use and Privacy Policy",

        // register — success + accessibility
        email_sent_title: "Confirmation email sent!",
        email_sent_to: "We sent a confirmation link to:",
        email_sent_instructions: "Click the link in the email to activate your account, then you can sign in.",
        go_to_login: "Go to sign-in",
        show_confirm_password: "Show password confirmation",
        hide_confirm_password: "Hide password confirmation",

        // forgot-password
        locked_title: "Account locked",
        forgot_title: "Forgot password",
        locked_subtitle: "Please contact your neighborhood coordinator to unlock the account",
        security_question_subtitle: "Answer your security question to reset the password",
        reset_link_subtitle: "We'll send you a password-reset link",
        locked_after_attempts: "The account was locked after 3 failed attempts",
        locked_coordinator_notified: "Your neighborhood coordinator has been notified and will contact you soon.",
        locked_email: "Email: {email}",
        email_sent_ok: "Email sent!",
        email_sent_note: "If this email is registered, you'll receive a password-reset link in the next few minutes.",
        back_to_login: "Back to sign-in",
        your_security_question: "Your security question:",
        answer_label: "Answer",
        answer_placeholder: "Enter your answer",
        checking: "Checking...",
        verify_and_send: "Verify and send link",
        try_another_email: "Enter a different email",
        email_address_label: "Email address",
        continue_btn: "Continue",

        // reset-password
        reset_title: "Reset password",
        reset_subtitle: "Choose a new password for your account",
        password_updated: "Password updated!",
        password_updated_note: "You can now sign in with your new password.",
        login_to_account: "Sign in to your account",
        invalid_link: "Invalid link.",
        request_new_link: "Request a new link",
        new_password_label: "New password",
        confirm_password: "Confirm password",
        repeat_password_placeholder: "Repeat the password",
        show_short: "Show",
        hide_short: "Hide",
        updating: "Updating...",
        update_password: "Update password",

        // confirm-email
        verify_failed_title: "Verification failed",
        verify_failed_desc: "The link is invalid or has expired.",
        register_again: "Register again",
        email_confirmed_title: "Email confirmed!",
        email_confirmed_desc: "Your account is active. You can now sign in.",

        // banned
        banned_title: "Your account has been suspended",
        banned_desc_1: "Your account was suspended by the community manager due to a violation of the terms of use.",
        banned_desc_2: "If you believe this is a mistake, contact the neighborhood manager.",
        contact_support: "📧 Contact support",

        // sso-adopt
        sso_identifying: 'Identifying you via "Out to Freedom"…',
    },
};

export const ru = {
    account: {
        // login — ошибки OAuth/Credentials (по коду ошибки Auth.js)
        err_oauth_signin: "Ошибка входа. Попробуйте ещё раз.",
        err_oauth_callback: "Ошибка при возврате от провайдера. Попробуйте ещё раз.",
        err_oauth_not_linked: "Этот аккаунт уже существует с другим провайдером.",
        err_callback: "Ошибка в процессе входа.",
        err_credentials: "Неверный email или пароль. Если вы недавно зарегистрировались — убедитесь, что подтвердили email.",
        err_unknown: "Неизвестная ошибка. Попробуйте ещё раз.",

        // login — форма
        forgot_password_link: "Забыли пароль",
        logging_in: "Вход...",
        login_submit: "Войти",
        login_submit_email: "Войти с email и паролем",
        terms_privacy_link: "Условиями использования и Политикой конфиденциальности",

        // register — успех + доступность
        email_sent_title: "Письмо с подтверждением отправлено!",
        email_sent_to: "Мы отправили ссылку для подтверждения на адрес:",
        email_sent_instructions: "Нажмите на ссылку в письме, чтобы активировать аккаунт, после чего сможете войти.",
        go_to_login: "Перейти ко входу",
        show_confirm_password: "Показать подтверждение пароля",
        hide_confirm_password: "Скрыть подтверждение пароля",

        // forgot-password
        locked_title: "Аккаунт заблокирован",
        forgot_title: "Забыли пароль",
        locked_subtitle: "Обратитесь к координатору района для разблокировки аккаунта",
        security_question_subtitle: "Ответьте на секретный вопрос, чтобы сбросить пароль",
        reset_link_subtitle: "Мы отправим вам ссылку для сброса пароля",
        locked_after_attempts: "Аккаунт заблокирован после 3 неудачных попыток",
        locked_coordinator_notified: "Координатор района получил уведомление и вскоре свяжется с вами.",
        locked_email: "Email: {email}",
        email_sent_ok: "Письмо отправлено!",
        email_sent_note: "Если этот email зарегистрирован в системе, вы получите ссылку для сброса пароля в ближайшие минуты.",
        back_to_login: "Назад ко входу",
        your_security_question: "Ваш секретный вопрос:",
        answer_label: "Ответ",
        answer_placeholder: "Введите ваш ответ",
        checking: "Проверка...",
        verify_and_send: "Подтвердить и отправить ссылку",
        try_another_email: "Ввести другой email",
        email_address_label: "Адрес электронной почты",
        continue_btn: "Продолжить",

        // reset-password
        reset_title: "Сброс пароля",
        reset_subtitle: "Выберите новый пароль для вашего аккаунта",
        password_updated: "Пароль обновлён!",
        password_updated_note: "Теперь вы можете войти с новым паролем.",
        login_to_account: "Войти в аккаунт",
        invalid_link: "Недействительная ссылка.",
        request_new_link: "Запросить новую ссылку",
        new_password_label: "Новый пароль",
        confirm_password: "Подтверждение пароля",
        repeat_password_placeholder: "Повторите пароль",
        show_short: "Показать",
        hide_short: "Скрыть",
        updating: "Обновление...",
        update_password: "Обновить пароль",

        // confirm-email
        verify_failed_title: "Проверка не удалась",
        verify_failed_desc: "Ссылка недействительна или её срок истёк.",
        register_again: "Зарегистрироваться заново",
        email_confirmed_title: "Email подтверждён!",
        email_confirmed_desc: "Ваш аккаунт активен. Теперь вы можете войти.",

        // banned
        banned_title: "Ваш аккаунт приостановлен",
        banned_desc_1: "Ваш аккаунт был приостановлен администратором сообщества за нарушение правил использования.",
        banned_desc_2: "Если вы считаете, что это ошибка, обратитесь к управляющему района.",
        contact_support: "📧 Связаться со службой поддержки",

        // sso-adopt
        sso_identifying: "Идентифицируем вас через «Навстречу свободе»…",
    },
};
