// מילון תרגומים לרכיבי UI כלליים (chrome) בתיקיית components
// כל המפתחות תחת namespace "components" — שימוש: $_('components.key')
// הערה: תוכן פרסומות ותוכן שהעלו משתמשים/רכזים נשאר עברית — כאן רק כרום ה-UI.

export const he = {
    components: {
        // ===== משותף =====
        close: "סגור",
        close_ads_aria: "סגור פרסומות",
        close_ad_aria: "סגור פרסומת",
        opens_new_window_suffix: " (נפתח בחלון חדש)",

        // ===== MobileAdsDrawer =====
        mad_drawer_aria: "האזור האישי וההטבות מהקהילה הארצית",
        mad_personal_area: "האזור האישי",
        mad_personal_messages: "📩 הודעות אישיות",
        mad_to_personal_area: "לאזור האישי ←",
        mad_wallet_alt: "ארנק",
        mad_to_my_area: "לאזור האישי שלי ←",
        mad_login_register: "התחברות / הרשמה",
        mad_to_your_area: "לאזור האישי שלך ←",
        mad_benefits_national: "הטבות ארציות",
        mad_open_benefits_aria: "פתח הטבות לקהילה",
        mad_tab_text: "לאזור האישי ולהטבות",

        // ===== ReferendumBanner =====
        rf_region_aria: "משאל עם קהילתי",
        rf_tip_democracy: "דמוקרטיה ישירה",
        rf_tip_impact: "השפעה אמיתית",
        rf_tip_instant: "תוצאות מיידיות",
        rf_title_poll: "משאל",
        rf_title_am: "עם",
        rf_subtitle: "הקול שלך משנה את המציאות",
        rf_participate_aria: "השתתף במשאל הקהילה עכשיו",
        rf_participate_now: "השתתף עכשיו",
        rf_voice_heard: "קולך נשמע! 📢",
        rf_stat_participants: "משתתפים",
        rf_stat_active_polls: "משאלים פעילים",
        rf_stat_satisfaction: "שביעות רצון",
        rf_example_poll: "משאל לדוגמה",
        rf_example_question: "האם אתם מעוניינים לעבור למערכת מיחזור אשפה קהילתית חדשה שתוזיל את העלויות ב-30% ותשפר את השירות",
        rf_vote_options_aria: "אפשרויות הצבעה",
        rf_option_yes: "כן, אני בעד!",
        rf_option_no: "לא, אני מעדיף להשאר במצב הנוכחי",
        rf_option_maybe: "צריך לבדוק עוד פרטים",
        rf_voted_so_far: "תושבים הצביעו עד כה",

        // ===== RightAdBanner =====
        rb_ads_aria: "פרסומות",
        rb_marketing_content: "תוכן שיווקי",
        rb_this_ad_space: "מקום פרסום זה",
        rb_could_be_yours: "- יכול להיות שלך",
        rb_details: "לפרטים",

        // ===== StreetPicker =====
        sp_street_name: "שם הרחוב",
        sp_loading_streets: "טוען רחובות...",
        sp_use_street: '➕ השתמש ברחוב "{street}" (לא ברשימה)',
        sp_no_such_street: "אין רחוב כזה ברשימה - אפשר להמשיך בהקלדה חופשית",
        sp_house_num: "מס'",
        sp_from_official_list: "✓ רחוב מהרשימה הרשמית של {city}",
        sp_free_typing: "✏️ רחוב בהקלדה חופשית - ודאו שהאיות נכון (או בחרו מהרשימה)",
        sp_start_typing: "התחילו להקליד ובחרו רחוב מהרשימה של {city}",

        // ===== NeighborhoodPicker =====
        np_close_map_aria: "סגור מפה",
        np_expand_map_aria: "הגדל מפה",
        np_close_map_title: "סגירת המפה",
        np_expand_map_title: "הגדלת המפה",
        np_expand: "הגדל",
        np_zoom_in: "התקרב",
        np_zoom_out: "התרחק",
        np_drag_pin: "👇 גררו את הפין למיקום המדויק",
        np_got_it: "הבנתי ✓",
        np_how_to_mark_aria: "איך מסמנים מיקום",
        np_show_demo_title: "הצג הדגמה",
        np_lat_placeholder: "lat (קו רוחב)",
        np_lng_placeholder: "lng (קו אורך)",
        np_location_marked: "✓ מיקום סומן: {lat}, {lng}",

        // ===== RestaurantReviewsModal =====
        rr_choose_rating: "בחרו דירוג בכוכבים",
        rr_write_experience: "כתבו כמה מילים על החוויה",
        rr_ratings_reviews: "⭐ דירוגים ותגובות",
        rr_reviews_count: "{n} ביקורות",
        rr_rate_restaurant: "דרגו את המסעדה",
        rr_thanks_added: "✓ תודה! הביקורת שלך נוספה.",
        rr_rating_aria: "דירוג",
        rr_stars_aria: "{n} כוכבים",
        rr_name_placeholder: "השם שלך (אופציונלי)",
        rr_text_placeholder: "ספרו על החוויה שלכם - האוכל, השירות, האווירה...",
        rr_publish: "פרסם ביקורת",
        rr_your_review: "· הביקורת שלך",

        // ===== NeighborhoodChat =====
        nc_header: "צ'אט שכונתי חברתי",
        nc_subtitle: "דברו, שאלו ושתפו עם השכנים בזמן אמת - בלי צורך בחשבון חיצוני",
        nc_message_placeholder: "כתבו הודעה לשכונה...",
        nc_message_aria: "הודעה",
        nc_send_aria: "שלח הודעה",
        nc_send: "שלח",
        nc_soon: "בקרוב - צ'אט שכונתי חי לכל השכנים",

        // ===== CoaliEmbed =====
        ce_header: "הבע את דעתך במשאלי העם",
        ce_open_app: "פתח באפליקציה ↗",
        ce_loading: "טוען את ההצבעות...",
        ce_unavailable: "ההצבעות אינן זמינות כרגע",
        ce_error: "אירעה תקלה זמנית בטעינת ההצבעות. אנא נסו שוב מאוחר יותר.",
        ce_activate_aria: "לחץ להפעלת ההצבעות",
        ce_activate: "🗳️ לחץ להפעלת ההצבעות",
        ce_open: "פתח ↗",

        // ===== FacebookComments =====
        fb_header: "תגובות פייסבוק",
        fb_subtitle: "התחבר עם חשבון הפייסבוק שלך כדי להגיב ולהצטרף לשיחה",
        fb_appid_required: "⚠️ נדרש הגדרת App ID של פייסבוק",
        fb_appid_note: "כדי להפעיל את מערכת התגובות, יש צורך ב-App ID מפייסבוק",
        fb_create_appid_aria: "צור App ID בפייסבוק (נפתח בחלון חדש)",
        fb_create_appid: "צור App ID בפייסבוק",

        // ===== MobileAdsBanner =====
        mb_community_ads_aria: "פרסומות קהילתיות",

        // ===== AdsSidebar =====
        as_ads_partners_aria: "פרסומות ושותפים",
        as_header: "מתקדמים לחברה מתוקנת ועצמאית",
    },
};

export const en = {
    components: {
        // ===== shared =====
        close: "Close",
        close_ads_aria: "Close ads",
        close_ad_aria: "Close ad",
        opens_new_window_suffix: " (opens in a new window)",

        // ===== MobileAdsDrawer =====
        mad_drawer_aria: "Personal area and benefits from the national community",
        mad_personal_area: "Personal Area",
        mad_personal_messages: "📩 Personal messages",
        mad_to_personal_area: "To personal area ←",
        mad_wallet_alt: "Wallet",
        mad_to_my_area: "To my personal area ←",
        mad_login_register: "Login / Register",
        mad_to_your_area: "To your personal area ←",
        mad_benefits_national: "National benefits",
        mad_open_benefits_aria: "Open community benefits",
        mad_tab_text: "Personal area & benefits",

        // ===== ReferendumBanner =====
        rf_region_aria: "Community referendum",
        rf_tip_democracy: "Direct democracy",
        rf_tip_impact: "Real impact",
        rf_tip_instant: "Instant results",
        rf_title_poll: "Public",
        rf_title_am: "Referendum",
        rf_subtitle: "Your voice changes reality",
        rf_participate_aria: "Participate in the community referendum now",
        rf_participate_now: "Participate now",
        rf_voice_heard: "Your voice is heard! 📢",
        rf_stat_participants: "Participants",
        rf_stat_active_polls: "Active polls",
        rf_stat_satisfaction: "Satisfaction",
        rf_example_poll: "Sample poll",
        rf_example_question: "Would you like to switch to a new community waste recycling system that would cut costs by 30% and improve service?",
        rf_vote_options_aria: "Voting options",
        rf_option_yes: "Yes, I'm in favor!",
        rf_option_no: "No, I prefer to keep things as they are",
        rf_option_maybe: "Need to check more details",
        rf_voted_so_far: "residents have voted so far",

        // ===== RightAdBanner =====
        rb_ads_aria: "Advertisements",
        rb_marketing_content: "Sponsored content",
        rb_this_ad_space: "This ad space",
        rb_could_be_yours: "- could be yours",
        rb_details: "Details",

        // ===== StreetPicker =====
        sp_street_name: "Street name",
        sp_loading_streets: "Loading streets...",
        sp_use_street: '➕ Use street "{street}" (not in list)',
        sp_no_such_street: "No such street in the list - you can continue typing freely",
        sp_house_num: "No.",
        sp_from_official_list: "✓ Street from the official list of {city}",
        sp_free_typing: "✏️ Freely typed street - make sure the spelling is correct (or pick from the list)",
        sp_start_typing: "Start typing and choose a street from {city}'s list",

        // ===== NeighborhoodPicker =====
        np_close_map_aria: "Close map",
        np_expand_map_aria: "Expand map",
        np_close_map_title: "Close the map",
        np_expand_map_title: "Expand the map",
        np_expand: "Expand",
        np_zoom_in: "Zoom in",
        np_zoom_out: "Zoom out",
        np_drag_pin: "👇 Drag the pin to the exact location",
        np_got_it: "Got it ✓",
        np_how_to_mark_aria: "How to mark a location",
        np_show_demo_title: "Show demo",
        np_lat_placeholder: "lat (latitude)",
        np_lng_placeholder: "lng (longitude)",
        np_location_marked: "✓ Location marked: {lat}, {lng}",

        // ===== RestaurantReviewsModal =====
        rr_choose_rating: "Choose a star rating",
        rr_write_experience: "Write a few words about your experience",
        rr_ratings_reviews: "⭐ Ratings & reviews",
        rr_reviews_count: "{n} reviews",
        rr_rate_restaurant: "Rate the restaurant",
        rr_thanks_added: "✓ Thanks! Your review has been added.",
        rr_rating_aria: "Rating",
        rr_stars_aria: "{n} stars",
        rr_name_placeholder: "Your name (optional)",
        rr_text_placeholder: "Tell us about your experience - the food, the service, the atmosphere...",
        rr_publish: "Publish review",
        rr_your_review: "· your review",

        // ===== NeighborhoodChat =====
        nc_header: "Neighborhood social chat",
        nc_subtitle: "Talk, ask and share with neighbors in real time - no external account needed",
        nc_message_placeholder: "Write a message to the neighborhood...",
        nc_message_aria: "Message",
        nc_send_aria: "Send message",
        nc_send: "Send",
        nc_soon: "Coming soon - live neighborhood chat for all neighbors",

        // ===== CoaliEmbed =====
        ce_header: "Share your opinion in public referendums",
        ce_open_app: "Open in app ↗",
        ce_loading: "Loading the votes...",
        ce_unavailable: "The votes are currently unavailable",
        ce_error: "A temporary error occurred while loading the votes. Please try again later.",
        ce_activate_aria: "Click to activate the votes",
        ce_activate: "🗳️ Click to activate the votes",
        ce_open: "Open ↗",

        // ===== FacebookComments =====
        fb_header: "Facebook comments",
        fb_subtitle: "Log in with your Facebook account to comment and join the conversation",
        fb_appid_required: "⚠️ A Facebook App ID must be configured",
        fb_appid_note: "To enable the comments system, a Facebook App ID is required",
        fb_create_appid_aria: "Create an App ID on Facebook (opens in a new window)",
        fb_create_appid: "Create an App ID on Facebook",

        // ===== MobileAdsBanner =====
        mb_community_ads_aria: "Community ads",

        // ===== AdsSidebar =====
        as_ads_partners_aria: "Ads & partners",
        as_header: "Advancing toward a better, independent society",
    },
};

export const ru = {
    components: {
        // ===== общее =====
        close: "Закрыть",
        close_ads_aria: "Закрыть рекламу",
        close_ad_aria: "Закрыть рекламу",
        opens_new_window_suffix: " (открывается в новом окне)",

        // ===== MobileAdsDrawer =====
        mad_drawer_aria: "Личный кабинет и льготы от национального сообщества",
        mad_personal_area: "Личный кабинет",
        mad_personal_messages: "📩 Личные сообщения",
        mad_to_personal_area: "В личный кабинет ←",
        mad_wallet_alt: "Кошелёк",
        mad_to_my_area: "В мой личный кабинет ←",
        mad_login_register: "Вход / Регистрация",
        mad_to_your_area: "В ваш личный кабинет ←",
        mad_benefits_national: "Национальные льготы",
        mad_open_benefits_aria: "Открыть льготы сообщества",
        mad_tab_text: "Личный кабинет и льготы",

        // ===== ReferendumBanner =====
        rf_region_aria: "Общинный референдум",
        rf_tip_democracy: "Прямая демократия",
        rf_tip_impact: "Реальное влияние",
        rf_tip_instant: "Мгновенные результаты",
        rf_title_poll: "Народный",
        rf_title_am: "референдум",
        rf_subtitle: "Ваш голос меняет реальность",
        rf_participate_aria: "Примите участие в референдуме сообщества сейчас",
        rf_participate_now: "Участвовать сейчас",
        rf_voice_heard: "Ваш голос услышан! 📢",
        rf_stat_participants: "Участников",
        rf_stat_active_polls: "Активных опросов",
        rf_stat_satisfaction: "Удовлетворённость",
        rf_example_poll: "Пример опроса",
        rf_example_question: "Хотите ли вы перейти на новую общинную систему переработки отходов, которая снизит расходы на 30% и улучшит сервис?",
        rf_vote_options_aria: "Варианты голосования",
        rf_option_yes: "Да, я за!",
        rf_option_no: "Нет, я предпочитаю оставить всё как есть",
        rf_option_maybe: "Нужно уточнить детали",
        rf_voted_so_far: "жителей проголосовали на данный момент",

        // ===== RightAdBanner =====
        rb_ads_aria: "Реклама",
        rb_marketing_content: "Рекламный контент",
        rb_this_ad_space: "Это рекламное место",
        rb_could_be_yours: "- может быть вашим",
        rb_details: "Подробнее",

        // ===== StreetPicker =====
        sp_street_name: "Название улицы",
        sp_loading_streets: "Загрузка улиц...",
        sp_use_street: '➕ Использовать улицу «{street}» (нет в списке)',
        sp_no_such_street: "Такой улицы нет в списке — можно продолжить свободный ввод",
        sp_house_num: "№",
        sp_from_official_list: "✓ Улица из официального списка {city}",
        sp_free_typing: "✏️ Улица введена вручную — проверьте правильность написания (или выберите из списка)",
        sp_start_typing: "Начните вводить и выберите улицу из списка {city}",

        // ===== NeighborhoodPicker =====
        np_close_map_aria: "Закрыть карту",
        np_expand_map_aria: "Развернуть карту",
        np_close_map_title: "Закрыть карту",
        np_expand_map_title: "Развернуть карту",
        np_expand: "Развернуть",
        np_zoom_in: "Приблизить",
        np_zoom_out: "Отдалить",
        np_drag_pin: "👇 Перетащите булавку в точное место",
        np_got_it: "Понятно ✓",
        np_how_to_mark_aria: "Как отметить место",
        np_show_demo_title: "Показать демонстрацию",
        np_lat_placeholder: "lat (широта)",
        np_lng_placeholder: "lng (долгота)",
        np_location_marked: "✓ Место отмечено: {lat}, {lng}",

        // ===== RestaurantReviewsModal =====
        rr_choose_rating: "Выберите оценку в звёздах",
        rr_write_experience: "Напишите несколько слов о впечатлении",
        rr_ratings_reviews: "⭐ Оценки и отзывы",
        rr_reviews_count: "{n} отзывов",
        rr_rate_restaurant: "Оцените ресторан",
        rr_thanks_added: "✓ Спасибо! Ваш отзыв добавлен.",
        rr_rating_aria: "Оценка",
        rr_stars_aria: "{n} звёзд",
        rr_name_placeholder: "Ваше имя (необязательно)",
        rr_text_placeholder: "Расскажите о впечатлении — еда, обслуживание, атмосфера...",
        rr_publish: "Опубликовать отзыв",
        rr_your_review: "· ваш отзыв",

        // ===== NeighborhoodChat =====
        nc_header: "Соседский чат",
        nc_subtitle: "Общайтесь, спрашивайте и делитесь с соседями в реальном времени — без внешнего аккаунта",
        nc_message_placeholder: "Напишите сообщение соседям...",
        nc_message_aria: "Сообщение",
        nc_send_aria: "Отправить сообщение",
        nc_send: "Отправить",
        nc_soon: "Скоро — живой соседский чат для всех соседей",

        // ===== CoaliEmbed =====
        ce_header: "Выскажите своё мнение в народных референдумах",
        ce_open_app: "Открыть в приложении ↗",
        ce_loading: "Загрузка голосований...",
        ce_unavailable: "Голосования сейчас недоступны",
        ce_error: "Произошла временная ошибка при загрузке голосований. Пожалуйста, попробуйте позже.",
        ce_activate_aria: "Нажмите, чтобы активировать голосования",
        ce_activate: "🗳️ Нажмите, чтобы активировать голосования",
        ce_open: "Открыть ↗",

        // ===== FacebookComments =====
        fb_header: "Комментарии Facebook",
        fb_subtitle: "Войдите через аккаунт Facebook, чтобы комментировать и присоединиться к беседе",
        fb_appid_required: "⚠️ Требуется настройка App ID Facebook",
        fb_appid_note: "Чтобы включить систему комментариев, нужен App ID от Facebook",
        fb_create_appid_aria: "Создать App ID в Facebook (открывается в новом окне)",
        fb_create_appid: "Создать App ID в Facebook",

        // ===== MobileAdsBanner =====
        mb_community_ads_aria: "Общинная реклама",

        // ===== AdsSidebar =====
        as_ads_partners_aria: "Реклама и партнёры",
        as_header: "Движемся к обновлённому и независимому обществу",
    },
};
