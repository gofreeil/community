// "הבקשה הראשונה" של מי שנשלח להירשם/להתחבר באמצע פעולה.
//
// אורח שלוחץ על פעולה שדורשת חשבון נשלח להתחברות/הרשמה עם יעד חזרה (נשמר גם
// בדפדפן, ראו postAuthReturn.ts). בסיום ההרשמה (סוף האשף) או ההתחברות הוא נוחת
// ביעד עם ?welcome=..., ומסך הפתיחה (WelcomeScreen) מציג:
// "השלמת את ההרשמה! כעת תועבר לבקשתך הראשונה — <תיאור>" ונסגר אל הבקשה עצמה.
// תיאור יש רק ליעדים שהם פעולה; דף הבית, דפי עיון והאזור האישי אינם "בקשה".
// הערכים הם מפתחות תרגום (extras.req_*).

const ROUTE_LABELS: Array<[RegExp, string]> = [
    [/^\/singles\/matchmaker\/join$/, 'extras.req_mm_join'],
    [/^\/singles\/matchmaker\/quiz(\/|$)/, 'extras.req_mm_quiz'],
    [/^\/singles\/matchmaker(\/|$)/, 'extras.req_mm_tools'],
    [/^\/singles\/match\/[^/]+$/, 'extras.req_match'],
    [/^\/singles\/[^/]+$/, 'extras.req_single_card'],
    [/^\/add\/singles$/, 'extras.req_add_single'],
    [/^\/add\/[^/]+$/, 'extras.req_add_item'],
    [/^\/rides\/add$/, 'extras.req_ride'],
    [/^\/jobs\/add$/, 'extras.req_job'],
    [/^\/giveaways\/add$/, 'extras.req_giveaway'],
    [/^\/giveaways\/edit\/[^/]+$/, 'extras.req_giveaway_edit'],
    [/^\/lost-and-found\/add$/, 'extras.req_lost_found'],
    [/^\/gmachim\/add$/, 'extras.req_gmach'],
    [/^\/coordinator\/apply$/, 'extras.req_coord_apply'],
    [/^\/coordinator(\/|$)/, 'extras.req_coord'],
    [/^\/admin(\/|$)/, 'extras.req_admin'],
];

/** מפתח התרגום של תיאור הבקשה לפי נתיב היעד (כולל query), או null כשהיעד אינו בקשה */
export function describeReturn(pathAndSearch: string): string | null {
    let path: string;
    try { path = new URL(pathAndSearch, 'http://x').pathname.replace(/\/+$/, '') || '/'; } catch { return null; }
    for (const [re, label] of ROUTE_LABELS) if (re.test(path)) return label;
    return null;
}
