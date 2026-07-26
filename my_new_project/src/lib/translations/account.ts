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
        err_credentials: "אימייל או סיסמה שגויים. אפשר לשחזר סיסמה ב\"שכחתי סיסמה\", או להתחבר עם גוגל/פייסבוק אם נרשמת דרכם.",
        err_unknown: "שגיאה לא ידועה. נסה שוב.",
        err_unconfirmed: "החשבון עדיין לא אומת. חפש את מייל האישור בתיבת הדואר (גם בספאם), או שלח אותו מחדש:",
        err_server_temp: "תקלה זמנית בשרת - הפרטים שלך כנראה תקינים. נסה שוב בעוד רגע.",
        err_too_many: "יותר מדי ניסיונות - המתן כמה דקות ונסה שוב.",
        err_signin_finalize: "ההתחברות כמעט הושלמה אבל משהו השתבש - נסה שוב.",
        resend_confirmation_btn: "שלח לי שוב את מייל האישור",
        resend_sent: "מייל האישור נשלח! בדוק את תיבת הדואר (גם בספאם).",
        resend_failed: "שליחת המייל נכשלה - נסה שוב בעוד רגע.",

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
        register_success_connecting: "נרשמת בהצלחה! מחבר אותך...",
        confirm_step_1: "פתח את תיבת המייל שלך",
        confirm_step_2: "לחץ על הקישור במייל שקיבלת מאיתנו",
        confirm_step_3: "תחובר לאתר אוטומטית - זהו!",
        confirm_spam_note: "לא רואה את המייל? בדוק בתיקיית הספאם / דואר זבל.",

        // forgot-password
        locked_title: "נעילה זמנית",
        forgot_title: "שכחתי סיסמה",
        locked_subtitle: "אפשר לנסות שוב בעוד כשעה, או לפנות לרכז השכונה לעזרה",
        security_question_subtitle: "ענה על שאלת הביטחון כדי לאפס את הסיסמה",
        reset_link_subtitle: "נשלח אליך קישור לאיפוס הסיסמה",
        locked_after_attempts: "שחזור הסיסמה ננעל זמנית לשעה לאחר 3 ניסיונות כושלים",
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
        password_updated_connecting: "מחבר אותך עם הסיסמה החדשה...",
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
        confirming_connecting: "החשבון אושר - מחבר אותך...",

        // banned
        banned_title: "חשבונך הושעה",
        banned_desc_1: "חשבונך הושעה על ידי מנהל הקהילה בגלל הפרת כללי השימוש.",
        banned_desc_2: "אם אתה חושב שזו טעות, פנה למנהל השכונה.",
        contact_support: "📧 צור קשר עם התמיכה",

        // sso-adopt
        sso_identifying: 'מזהה אותך דרך "יוצאים לחירות"…',

        // דפדפן בתוך אפליקציה (WebView) — אזהרה לפני התחברות עם גוגל
        inapp_title: "נפתח בתוך אפליקציה?",
        inapp_warning: "נראה שהדף נפתח בתוך אפליקציה (וואטסאפ, פייסבוק וכד'). התחברות עם Google לא עובדת שם — פתח את האתר בדפדפן רגיל (Chrome או Safari) דרך תפריט ⋮ ואז \"פתיחה בדפדפן\".",
        inapp_copy_link: "העתקת קישור לפתיחה בדפדפן",
        inapp_copied: "הקישור הועתק ✓",
        inapp_copy_manual: "העתק את הקישור:",

        // בורר חשבונות גוגל לפי דרישה (ברירת המחדל: חיבור אוטומטי לחשבון היחיד)
        google_other_account: "להתחבר עם חשבון גוגל אחר",
    },
};

export const en = {
    account: {
        // login — OAuth/Credentials errors (keyed by Auth.js error code)
        err_oauth_signin: "Sign-in error. Please try again.",
        err_oauth_callback: "Error returning from the provider. Please try again.",
        err_oauth_not_linked: "This account already exists with a different provider.",
        err_callback: "Error during the sign-in process.",
        err_credentials: "Incorrect email or password. You can recover your password via \"Forgot password\", or sign in with Google/Facebook if you registered that way.",
        err_unknown: "Unknown error. Please try again.",
        err_unconfirmed: "Your account is not confirmed yet. Look for the confirmation email in your inbox (including spam), or resend it:",
        err_server_temp: "Temporary server issue - your details are probably fine. Please try again in a moment.",
        err_too_many: "Too many attempts - please wait a few minutes and try again.",
        err_signin_finalize: "Sign-in almost completed but something went wrong - please try again.",
        resend_confirmation_btn: "Resend the confirmation email",
        resend_sent: "Confirmation email sent! Check your inbox (including spam).",
        resend_failed: "Sending the email failed - please try again in a moment.",

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
        register_success_connecting: "Registered successfully! Signing you in...",
        confirm_step_1: "Open your email inbox",
        confirm_step_2: "Click the link in the email we sent you",
        confirm_step_3: "You'll be signed in automatically - that's it!",
        confirm_spam_note: "Don't see the email? Check your spam / junk folder.",

        // forgot-password
        locked_title: "Temporarily locked",
        forgot_title: "Forgot password",
        locked_subtitle: "You can try again in about an hour, or contact your neighborhood coordinator for help",
        security_question_subtitle: "Answer your security question to reset the password",
        reset_link_subtitle: "We'll send you a password-reset link",
        locked_after_attempts: "Password recovery was temporarily locked for an hour after 3 failed attempts",
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
        password_updated_connecting: "Signing you in with the new password...",
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
        confirming_connecting: "Account confirmed - signing you in...",

        // banned
        banned_title: "Your account has been suspended",
        banned_desc_1: "Your account was suspended by the community manager due to a violation of the terms of use.",
        banned_desc_2: "If you believe this is a mistake, contact the neighborhood manager.",
        contact_support: "📧 Contact support",

        // sso-adopt
        sso_identifying: 'Identifying you via "Out to Freedom"…',

        // in-app browser (WebView) — warning before Google sign-in
        inapp_title: "Opened inside an app?",
        inapp_warning: "It looks like this page was opened inside an app (WhatsApp, Facebook, etc.). Google sign-in doesn't work there — open the site in a regular browser (Chrome or Safari) via the ⋮ menu and \"Open in browser\".",
        inapp_copy_link: "Copy link to open in a browser",
        inapp_copied: "Link copied ✓",
        inapp_copy_manual: "Copy the link:",

        // Google account chooser on demand (default: auto-connect the single account)
        google_other_account: "Use another Google account",
    },
};

export const ru = {
    account: {
        // login — ошибки OAuth/Credentials (по коду ошибки Auth.js)
        err_oauth_signin: "Ошибка входа. Попробуйте ещё раз.",
        err_oauth_callback: "Ошибка при возврате от провайдера. Попробуйте ещё раз.",
        err_oauth_not_linked: "Этот аккаунт уже существует с другим провайдером.",
        err_callback: "Ошибка в процессе входа.",
        err_credentials: "Неверный email или пароль. Вы можете восстановить пароль через «Забыли пароль» или войти через Google/Facebook, если регистрировались так.",
        err_unknown: "Неизвестная ошибка. Попробуйте ещё раз.",
        err_unconfirmed: "Аккаунт ещё не подтверждён. Найдите письмо с подтверждением в почте (включая спам) или отправьте его заново:",
        err_server_temp: "Временная ошибка сервера — ваши данные, скорее всего, верны. Попробуйте ещё раз через минуту.",
        err_too_many: "Слишком много попыток — подождите несколько минут и попробуйте снова.",
        err_signin_finalize: "Вход почти завершён, но что-то пошло не так — попробуйте ещё раз.",
        resend_confirmation_btn: "Отправить письмо с подтверждением ещё раз",
        resend_sent: "Письмо с подтверждением отправлено! Проверьте почту (включая спам).",
        resend_failed: "Не удалось отправить письмо — попробуйте ещё раз через минуту.",

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
        register_success_connecting: "Регистрация прошла успешно! Выполняем вход...",
        confirm_step_1: "Откройте свою почту",
        confirm_step_2: "Нажмите на ссылку в письме от нас",
        confirm_step_3: "Вход выполнится автоматически — и всё!",
        confirm_spam_note: "Не видите письмо? Проверьте папку «Спам».",

        // forgot-password
        locked_title: "Временная блокировка",
        forgot_title: "Забыли пароль",
        locked_subtitle: "Попробуйте снова примерно через час или обратитесь к координатору района",
        security_question_subtitle: "Ответьте на секретный вопрос, чтобы сбросить пароль",
        reset_link_subtitle: "Мы отправим вам ссылку для сброса пароля",
        locked_after_attempts: "Восстановление пароля временно заблокировано на час после 3 неудачных попыток",
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
        password_updated_connecting: "Выполняем вход с новым паролем...",
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
        confirming_connecting: "Аккаунт подтверждён — выполняем вход...",

        // banned
        banned_title: "Ваш аккаунт приостановлен",
        banned_desc_1: "Ваш аккаунт был приостановлен администратором сообщества за нарушение правил использования.",
        banned_desc_2: "Если вы считаете, что это ошибка, обратитесь к управляющему района.",
        contact_support: "📧 Связаться со службой поддержки",

        // sso-adopt
        sso_identifying: "Идентифицируем вас через «Навстречу свободе»…",

        // встроенный браузер (WebView) — предупреждение перед входом через Google
        inapp_title: "Открыто внутри приложения?",
        inapp_warning: "Похоже, страница открыта внутри приложения (WhatsApp, Facebook и т.п.). Вход через Google там не работает — откройте сайт в обычном браузере (Chrome или Safari) через меню ⋮ и «Открыть в браузере».",
        inapp_copy_link: "Скопировать ссылку для открытия в браузере",
        inapp_copied: "Ссылка скопирована ✓",
        inapp_copy_manual: "Скопируйте ссылку:",

        // выбор аккаунта Google по запросу (по умолчанию: автоматический вход)
        google_other_account: "Войти с другим аккаунтом Google",
    },
};
