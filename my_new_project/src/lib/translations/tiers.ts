// מילון דרגות ההרשמה (namespace "tiers"). שימוש: $_('tiers.key') / tFn('tiers.key')
// משמש את LevelUpCard ואת באנר הדרגה בפרופיל.

export const he = {
    tiers: {
        // שמות ותיאורי דרגות
        tier1_name: 'חבר',
        tier1_desc: 'נרשמת — אפשר לגלוש, להגיב ולבקש עזרה',
        tier2_name: 'תושב מאומת',
        tier2_desc: 'מיקום וטלפון — כדי לפרסם מודעות בשכונה',
        tier3_name: 'פרופיל מלא',
        tier3_desc: 'פרטים אישיים — ללוח פנויים ושידוכים',

        // סיבות (מוצג בפאנל: *למה* צריך להשלים)
        reason_publish: 'כדי לפרסם מודעה צריך רק עוד כמה פרטים — כדי שהמודעה תופיע בשכונה הנכונה ושכן יוכל ליצור קשר.',
        reason_singles: 'לוח הפנויים דורש פרופיל מלא — עוד כמה פרטים אישיים להתאמות.',

        // כותרת הפאנל
        levelup_title: 'עוד צעד קטן: דרגה {tier} · {name}',
        save_and_continue: 'שמור והמשך',
        saving: 'שומר...',
        choose_city: 'בחר עיר',
        gender_male: 'זכר',
        gender_female: 'נקבה',

        // שדות + הדרכה
        field_name: 'שם',
        hint_name: 'איך יקראו לך בקהילה',
        field_city: 'עיר',
        hint_city: 'לאיזו עיר משתייכת המודעה',
        field_neighborhood: 'שכונה',
        hint_neighborhood: 'כדי שהמודעה תופיע בלוח השכונתי הנכון',
        field_phone: 'טלפון',
        hint_phone: 'כדי ששכן יוכל ליצור איתך קשר. לא מוצג בפומבי בלי אישורך',
        field_gender: 'מין',
        hint_gender: 'נדרש להתאמות בלוח הפנויים',
        field_birth_date: 'תאריך לידה',
        hint_birth_date: 'הגיל מסייע להתאמות; התאריך המדויק לא מוצג',
        field_email_verify: 'אימות אימייל',
        hint_email_verify: 'שלחנו לך קישור אימות. לחץ עליו במייל כדי להשלים',
        email_verify_btn: 'שלח לי מייל אימות',
        email_verify_sent: 'נשלח! בדוק את תיבת הדואר (גם בספאם)',

        // שגיאות
        err_save: 'השמירה נכשלה — נסה שוב',
        err_phone: 'מספר טלפון לא תקין',
        err_network: 'תקלת רשת — נסה שוב',
        err_email_verify: 'שליחת המייל נכשלה — נסה שוב',

        // באנר בפרופיל
        banner_you_are: 'הדרגה שלך: {name}',
        banner_next_unlock: 'השלם דרגה {tier} כדי {benefit}',
        banner_benefit_2: 'לפרסם מודעות בשכונה',
        banner_benefit_3: 'להשתתף בלוח הפנויים',
        banner_complete: 'הפרופיל שלך מלא — כל הכבוד! 🎉',
        banner_upgrade_btn: 'להשלמה',
    },
};

export const en = {
    tiers: {
        tier1_name: 'Member',
        tier1_desc: 'Registered — browse, comment and ask for help',
        tier2_name: 'Verified resident',
        tier2_desc: 'Location and phone — to publish neighborhood listings',
        tier3_name: 'Full profile',
        tier3_desc: 'Personal details — for the singles board and matchmaking',

        reason_publish: 'To publish a listing we just need a few more details — so it appears in the right neighborhood and a neighbor can reach you.',
        reason_singles: 'The singles board requires a full profile — a few personal details for matching.',

        levelup_title: 'One small step: tier {tier} · {name}',
        save_and_continue: 'Save and continue',
        saving: 'Saving...',
        choose_city: 'Choose a city',
        gender_male: 'Male',
        gender_female: 'Female',

        field_name: 'Name',
        hint_name: 'How the community will know you',
        field_city: 'City',
        hint_city: 'Which city this listing belongs to',
        field_neighborhood: 'Neighborhood',
        hint_neighborhood: 'So your listing appears on the right neighborhood board',
        field_phone: 'Phone',
        hint_phone: 'So a neighbor can reach you. Not shown publicly without your consent',
        field_gender: 'Gender',
        hint_gender: 'Required for singles-board matching',
        field_birth_date: 'Date of birth',
        hint_birth_date: 'Age helps matching; the exact date is not shown',
        field_email_verify: 'Email verification',
        hint_email_verify: 'We sent you a verification link. Click it in the email to finish',
        email_verify_btn: 'Send me a verification email',
        email_verify_sent: 'Sent! Check your inbox (including spam)',

        err_save: 'Save failed — please try again',
        err_phone: 'Invalid phone number',
        err_network: 'Network error — please try again',
        err_email_verify: 'Sending the email failed — please try again',

        banner_you_are: 'Your tier: {name}',
        banner_next_unlock: 'Complete tier {tier} to {benefit}',
        banner_benefit_2: 'publish neighborhood listings',
        banner_benefit_3: 'join the singles board',
        banner_complete: 'Your profile is complete — well done! 🎉',
        banner_upgrade_btn: 'Complete',
    },
};

export const ru = {
    tiers: {
        tier1_name: 'Участник',
        tier1_desc: 'Вы зарегистрированы — просмотр, комментарии и просьбы о помощи',
        tier2_name: 'Проверенный житель',
        tier2_desc: 'Район и телефон — чтобы публиковать объявления',
        tier3_name: 'Полный профиль',
        tier3_desc: 'Личные данные — для доски знакомств и сватовства',

        reason_publish: 'Чтобы опубликовать объявление, нужно ещё несколько данных — чтобы оно попало в нужный район и сосед мог с вами связаться.',
        reason_singles: 'Доска знакомств требует полного профиля — ещё несколько личных данных для подбора.',

        levelup_title: 'Ещё один шаг: уровень {tier} · {name}',
        save_and_continue: 'Сохранить и продолжить',
        saving: 'Сохранение...',
        choose_city: 'Выберите город',
        gender_male: 'Мужской',
        gender_female: 'Женский',

        field_name: 'Имя',
        hint_name: 'Как вас будут знать в сообществе',
        field_city: 'Город',
        hint_city: 'К какому городу относится объявление',
        field_neighborhood: 'Район',
        hint_neighborhood: 'Чтобы объявление появилось на нужной доске района',
        field_phone: 'Телефон',
        hint_phone: 'Чтобы сосед мог связаться с вами. Не показывается публично без вашего согласия',
        field_gender: 'Пол',
        hint_gender: 'Требуется для подбора на доске знакомств',
        field_birth_date: 'Дата рождения',
        hint_birth_date: 'Возраст помогает в подборе; точная дата не показывается',
        field_email_verify: 'Подтверждение email',
        hint_email_verify: 'Мы отправили вам ссылку для подтверждения. Нажмите на неё в письме',
        email_verify_btn: 'Отправить письмо для подтверждения',
        email_verify_sent: 'Отправлено! Проверьте почту (включая спам)',

        err_save: 'Не удалось сохранить — попробуйте ещё раз',
        err_phone: 'Неверный номер телефона',
        err_network: 'Ошибка сети — попробуйте ещё раз',
        err_email_verify: 'Не удалось отправить письмо — попробуйте ещё раз',

        banner_you_are: 'Ваш уровень: {name}',
        banner_next_unlock: 'Завершите уровень {tier}, чтобы {benefit}',
        banner_benefit_2: 'публиковать объявления района',
        banner_benefit_3: 'участвовать в доске знакомств',
        banner_complete: 'Ваш профиль заполнен — отлично! 🎉',
        banner_upgrade_btn: 'Завершить',
    },
};
