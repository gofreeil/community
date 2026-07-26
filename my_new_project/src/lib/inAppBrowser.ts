// זיהוי "דפדפן בתוך אפליקציה" (WebView) — כשפותחים את האתר מתוך וואטסאפ/
// פייסבוק/אינסטגרם/ג'ימייל וכו'. גוגל חוסמת שם התחברות OAuth
// (Error 403: disallowed_useragent), ואנדרואיד מקפיץ שם חלוניות
// "פתיחה באמצעות" שמבלבלות משתמשים. במקרה כזה מציגים הנחיה לפתוח בדפדפן.
export function isInAppBrowser(ua?: string): boolean {
    const agent = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    if (!agent) return false;

    // אתר שהותקן למסך הבית ב-iOS (PWA): ה-UA חסר "Safari/" בדיוק כמו WebView,
    // אבל שם ההתחברות עובדת - לא מציגים אזהרת שווא
    if (typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true) {
        return false;
    }

    // סמנים מפורשים של אפליקציות עם דפדפן פנימי
    // FBAN/FBAV/FB_IAB - פייסבוק ומסנג'ר | GSA - אפליקציית גוגל (כולל Gmail viewer)
    if (/FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Snapchat|musical_ly|TikTok|BytedanceWebview|MicroMessenger|Line\/|GSA\//i.test(agent)) {
        return true;
    }

    // אנדרואיד: WebView סטנדרטי מסומן בטוקן "; wv)"
    if (/Android/i.test(agent) && /;\s*wv\)/i.test(agent)) return true;

    // iOS: ב-WKWebView מוטמע יש "Mobile/" בלי "Safari/" (דפדפנים אמיתיים
    // ב-iOS — ספארי/כרום/פיירפוקס — תמיד כוללים "Safari/" ב-UA שלהם)
    if (/iPhone|iPad|iPod/i.test(agent) && /Mobile\//.test(agent) && !/Safari\//.test(agent)) {
        return true;
    }

    return false;
}
