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

        // ===== CameraCapture =====
        cam_take_photo: "צלם עכשיו",
        cam_open_aria: "צילום תמונה במצלמה",
        cam_title: "צילום תמונה",
        cam_shutter: "צלם",
        cam_shutter_aria: "לחץ לצילום",
        cam_switch: "החלף מצלמה",
        cam_cancel: "ביטול",
        cam_starting: "מפעיל מצלמה...",
        cam_no_access: "אין גישה למצלמה. יש לאשר הרשאה בדפדפן או להעלות תמונה מהמכשיר.",

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
        np_expand_map_title: "פתיחה למסך מלא",
        np_expand: "הגדל",
        np_zoom_in: "התקרב",
        np_zoom_out: "התרחק",
        np_drag_map: "הזיזו את המפה כך שהסמן 📍 יהיה על המיקום",
        np_confirm: "אישור המיקום",
        np_confirmed: "המיקום נקבע — אפשר לגרור לכוונון",
        np_position_then_confirm: "מקמו את הסמן על המיקום ולחצו אישור",
        np_center_here: "הסמן נמצא על המיקום? לחצו אישור",
        np_drag_to_adjust: "אפשר להמשיך לגרור את המפה לכוונון מדויק",
        np_manual_coords: "הזנת קואורדינטות ידנית",
        np_location_set: "המיקום נקבע!",
        np_change_location: "שינוי מיקום",
        np_lat_placeholder: "lat (קו רוחב)",
        np_lng_placeholder: "lng (קו אורך)",
        np_gps: "המיקום שלי",
        np_gps_title: "שיתוף המיקום הנוכחי מהמכשיר (GPS)",
        np_gps_locating: "מאתר…",
        np_gps_denied: "הגישה למיקום נחסמה - אפשרו מיקום בהגדרות הדפדפן ונסו שוב",
        np_gps_timeout: "לא נקלט מיקום - נסו שוב",
        np_gps_unavailable: "המיקום אינו זמין כרגע - נסו שוב",
        np_gps_unsupported: "הדפדפן לא תומך בשיתוף מיקום",
        np_gps_insecure: "שיתוף מיקום עובד רק בחיבור מאובטח (https)",
        np_gps_out_of_area: "המיקום הנוכחי שלכם מחוץ לתחום העיר שנבחרה",

        // ===== NeighborhoodFallback (השכונה שלי לא ברשימה) =====
        nf_title: "📍 השכונה או האזור שלכם לא ברשימה?",
        nf_hint: "כתבו את שם המקום וסמנו אותו על המפה - אפשר להמשיך ולפרסם מיד, בלי להמתין לאישור. המנהל יוסיף אותו לרשימה כדי שגם השכנים ימצאו אותו.",
        nf_name_label: "שם השכונה או האזור",
        nf_name_placeholder: "לדוגמה: אזור התעשייה",
        nf_map_title: "🗺️ סמנו את המיקום המדויק",
        nf_map_hint: "גררו את המפה עד שהסמן 📍 יהיה על המקום, או לחצו \"המיקום שלי\". הפין הוא מה שממקם את המודעה על המפה.",
        nf_ready: "המיקום מוכן - \"{name}\" יישמר כמיקום המודעה",
        nf_back: "↩ חזרה לרשימת השכונות",
        nf_need_name: "נא לכתוב את שם השכונה או האזור",
        nf_need_pin: "נא לסמן את המיקום על המפה וללחוץ \"אישור המיקום\" - בלי זה המודעה לא תופיע במקום הנכון",
        nf_not_in_list: "📍 השכונה שלי לא ברשימה",

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
        as_ads_partners_aria: "אתרי יוצאים לחירות",
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

        // ===== CameraCapture =====
        cam_take_photo: "Take a photo",
        cam_open_aria: "Take a photo with the camera",
        cam_title: "Take a photo",
        cam_shutter: "Capture",
        cam_shutter_aria: "Press to capture",
        cam_switch: "Switch camera",
        cam_cancel: "Cancel",
        cam_starting: "Starting camera...",
        cam_no_access: "No camera access. Allow the permission in your browser, or upload a photo from your device.",

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
        np_expand_map_title: "Open full screen",
        np_expand: "Expand",
        np_zoom_in: "Zoom in",
        np_zoom_out: "Zoom out",
        np_drag_map: "Move the map so the 📍 pin sits on your location",
        np_confirm: "Confirm location",
        np_confirmed: "Location set — drag to fine-tune",
        np_position_then_confirm: "Place the pin on your location, then confirm",
        np_center_here: "Is the pin on your spot? Tap confirm",
        np_drag_to_adjust: "You can keep dragging the map to fine-tune",
        np_manual_coords: "Enter coordinates manually",
        np_location_set: "Location set!",
        np_change_location: "Change location",
        np_lat_placeholder: "lat (latitude)",
        np_lng_placeholder: "lng (longitude)",
        np_gps: "My location",
        np_gps_title: "Share your current location from the device (GPS)",
        np_gps_locating: "Locating…",
        np_gps_denied: "Location access is blocked - allow location in your browser settings and try again",
        np_gps_timeout: "Couldn't get a location fix - try again",
        np_gps_unavailable: "Location is unavailable right now - try again",
        np_gps_unsupported: "This browser doesn't support location sharing",
        np_gps_insecure: "Location sharing only works over a secure (https) connection",
        np_gps_out_of_area: "Your current location is outside the selected city area",

        // ===== NeighborhoodFallback =====
        nf_title: "📍 Your neighborhood or area isn't on the list?",
        nf_hint: "Type the name of the place and mark it on the map - you can go on and publish right away, no need to wait for approval. The admin will add it to the list so your neighbors can find it too.",
        nf_name_label: "Neighborhood or area name",
        nf_name_placeholder: "For example: the industrial zone",
        nf_map_title: "🗺️ Mark the exact location",
        nf_map_hint: "Drag the map until the 📍 marker is on the spot, or tap \"My location\". The pin is what places your listing on the map.",
        nf_ready: "Location ready - \"{name}\" will be saved as the listing's location",
        nf_back: "↩ Back to the neighborhood list",
        nf_need_name: "Please write the neighborhood or area name",
        nf_need_pin: "Please mark the location on the map and tap \"Confirm location\" - without it your listing won't show in the right place",
        nf_not_in_list: "📍 My neighborhood isn't on the list",

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
        as_ads_partners_aria: "Yotzim LaHerut network sites",
        as_header: "Advancing toward a better, independent society",
    },
};
