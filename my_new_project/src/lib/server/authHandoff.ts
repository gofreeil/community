import type { Cookies } from '@sveltejs/kit';

/**
 * שתילת עוגיות ה-handoff אחרי אימות מוצלח מול Strapi (login / register /
 * reset-password / confirm-email). מיד אחר-כך הקליינט קורא signIn('credentials')
 * בלי פרטים, וה-authorize מזהה לפי strapi_handoff.
 *
 * שתי עוגיות בכוונה:
 *   • strapi_handoff — קצרת-מועד (5 דק'), נקראת *רק* ב-authorize. ה-hook
 *     setStrApiCookie לא נוגע בה, ולכן היא לא ניתנת לשכתוב חזרה לטוקן של סשן
 *     קיים במחשב משותף (מונע חטיפת חשבון בזמן ה-handoff).
 *   • strapi_jwt — ארוכת-מועד, נצרכת ע"י server actions/loads לקריאות Strapi.
 *     במסלול לוגין רגיל היא זמינה מיד; בסשן שיוקם ה-hook ממילא ידאג לרענן אותה.
 */
const isProd = () => process.env.NODE_ENV === 'production';

export function setHandoffCookies(cookies: Cookies, jwt: string): void {
    cookies.set('strapi_handoff', jwt, {
        httpOnly: true,
        secure:   isProd(),
        sameSite: 'lax', // נשלחת ב-POST חד-מקורי ל-/auth/callback/credentials
        path:     '/',
        maxAge:   60 * 5, // חד-פעמי, פג מהר
    });
    cookies.set('strapi_jwt', jwt, {
        httpOnly: true,
        secure:   isProd(),
        sameSite: 'strict',
        path:     '/',
        maxAge:   60 * 60 * 24 * 365,
    });
}
