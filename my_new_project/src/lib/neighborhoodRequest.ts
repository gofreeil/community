// שליחת בקשה להוספת שכונה/אזור חדש לרשימה, מכל טופס באתר.
//
// חשוב: הבקשה הזו *אינה* חוסמת את המשתמש. הוא ממשיך לפרסם מיד עם השם שהקליד -
// הפריט מוצג ברמת העיר (JerusalemMap.belongsToMyArea נופל ל-isKnownNeighborhood)
// וברגע שהמנהל מאשר, האזור הופך לשכונה מלאה והפריט משתבץ אליה. השליחה כאן היא
// best-effort בלבד: כשלון רשת לא ייכשל את הפרסום.

import { isKnownNeighborhood } from '$lib/neighborhoodsData';

export interface NeighborhoodRequestInput {
    name: string;
    city: string;
    lat: number | null;
    lng: number | null;
    /** שם וטלפון שהמפרסם כבר מילא בטופס הפריט - מועתקים לבקשה כדי שהאדמין
     *  יראה מי ביקש גם כשהגולש לא מחובר, בלי לבקש ממנו למלא פעמיים. */
    requesterName?: string;
    requesterPhone?: string;
}

export interface NeighborhoodRequestResult {
    ok: boolean;
    alreadyPending?: boolean;
    alreadyApproved?: boolean;
}

/**
 * שולח בקשת שכונה חדשה לאדמין. מחזיר ok=false בשקט בכל תקלה - הקורא ממשיך
 * בפרסום בכל מקרה, ולעולם לא מציג למשתמש שגיאה שתעצור אותו.
 */
export async function submitNeighborhoodRequest(
    input: NeighborhoodRequestInput,
): Promise<NeighborhoodRequestResult> {
    const name = input.name.trim();
    const city = input.city.trim();
    // בלי פין אין מה לשלוח: השרת דורש קואורדינטה כדי שהמנהל ידע איפה למקם את השכונה
    if (!name || !city || input.lat == null || input.lng == null) return { ok: false };
    // השם כבר ברשימת השכונות המובנית של העיר (למשל "מרכז" ברמלה) - אין מה לבקש.
    // בלי זה האדמין קיבל בקשות "שכונה חדשה" על שכונות שקיימות מזמן.
    if (isKnownNeighborhood(city, name)) return { ok: true, alreadyApproved: true };

    try {
        const requester_name  = (input.requesterName  ?? '').trim();
        const requester_phone = (input.requesterPhone ?? '').trim();
        const res = await fetch('/api/neighborhoods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, city, lat: input.lat, lng: input.lng,
                ...(requester_name  ? { requester_name }  : {}),
                ...(requester_phone ? { requester_phone } : {}),
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) return { ok: false };
        return {
            ok: true,
            alreadyPending:  !!data.alreadyPending,
            alreadyApproved: !!data.alreadyApproved,
        };
    } catch {
        return { ok: false };
    }
}
