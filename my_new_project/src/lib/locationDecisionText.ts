// טקסט ההודעה שנשלחת למבקש כשבקשת שכונה/מיקום מאושרת או נדחית.
// מודול משותף לשרת (locationDecision.ts) וללקוח (כרטיס ההודעה בפרופיל) - הטיוטה
// שהאדמין רואה ויכול לערוך לפני הדחייה זהה למה שהיה נשלח אוטומטית.
import { isKnownNeighborhood } from '$lib/neighborhoodsData';

export interface DecisionMessage {
    label: string;
    description: string;
    /** דחייה של שכונה שכבר קיימת ברשימת העיר - הנוסח מסביר זאת במקום "החליט שלא להוסיף" */
    existsAlready: boolean;
}

export function locationDecisionMessage(
    decision: 'approve' | 'reject',
    location: string,
    city?: string,
): DecisionMessage {
    if (decision === 'approve') {
        return {
            existsAlready: false,
            label:       `✅ בקשתך אושרה: "${location}" נוסף לרשימה`,
            description: `המנהל אישר את בקשתך — "${location}"${city ? ` (${city})` : ''} נוסף לרשימת השכונות וכעת ניתן לבחור בו בפרופיל ובפרסום.`,
        };
    }
    // דחייה של שכונה שכבר קיימת ברשימת העיר (קרה: "עין גנים" בפתח תקווה) -
    // אומרים למבקש במפורש שהיא קיימת ושיבחר אותה.
    const existsAlready = !!city && isKnownNeighborhood(city, location);
    if (existsAlready) {
        return {
            existsAlready,
            label:       `ℹ️ "${location}" כבר קיימת ברשימת השכונות של ${city}`,
            description: `השכונה "${location}" כבר נמצאת ברשימת השכונות של ${city}, ולכן אין צורך להוסיף אותה. פשוט בחרו אותה מהרשימה בפרופיל (או בטופס הפרסום) ותוכלו להמשיך.`,
        };
    }
    return {
        existsAlready,
        label:       `❌ בקשתך להוספת "${location}" לא אושרה`,
        description: `המנהל בחן את בקשתך להוסיף את "${location}" והחליט שלא להוסיף אותו כרגע. אפשר לבחור שכונה קיימת או לפנות אלינו דרך "כתוב למערכת" בפרופיל.`,
    };
}
