// בוטים של רשתות חברתיות וסקרפרים שצריכים לראות תגי OG בלי לוגין.
// משמש את דפי הפריט (/items/[id]) והפנויים (/singles/[id]) כדי לעקוף את
// שער ההתחברות עבור קדימוני שיתוף — הבוט מקבל את ה-head עם תגי ה-OG,
// אבל בלי השדות הרגישים (טלפון/טקסטים חופשיים).
export const BOT_UA_RX =
	/(WhatsApp|TelegramBot|facebookexternalhit|facebookcatalog|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|Pinterest|redditbot|Googlebot|bingbot|YandexBot|DuckDuckBot|Applebot|baiduspider|Embedly|ia_archiver|vkShare|W3C_Validator|Snapchat|Bytespider|TikTokBot)/i;
