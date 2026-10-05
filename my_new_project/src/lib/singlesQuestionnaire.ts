// שאלון אישיות והתאמה (רמה 3 בכרטיס הפנויים) - הזנה למנוע ההתאמה של ה-AI.
//
// שלושה סוגי שאלות, כדי לתפוס גם מה שאדם אומר על עצמו וגם מה שהוא לא מודע לו:
//   1. ישירות (rate)    - דירוג עצמי 1-7 של תכונות אופי.
//   2. עקיפות (react)   - "כמה זה מפריע / מושך אותך" אצל בן/בת זוג. מה שמרתיע ומה שמושך חושף את האופי.
//   3. תרחישים (choice) - בחירה כפויה בין אפשרויות, שבה אין תשובה "נכונה" - ולכן קשה להתייפייף.
//   + בחירת ערכים (pick) ושאלות פתוחות (text).
// כל שאלה עקיפה מצביעה על תכונות (traits) עם משקל חיובי/שלילי; computeTraits מקפל הכול לפרופיל 0-100.
// הפרופיל המחושב נשמר לצד התשובות הגולמיות, כך שה-AI יכול להשתמש בשניהם.

export type TraitId =
    | 'ego' | 'sensitivity' | 'warmth' | 'humor' | 'dominance' | 'independence'
    | 'calm' | 'ambition' | 'order' | 'spontaneity' | 'sociability' | 'generosity'
    | 'jealousy' | 'flexibility' | 'romance' | 'family' | 'depth' | 'directness';

export const TRAITS: Record<TraitId, { label: string; low: string; high: string }> = {
    ego:         { label: 'אגו / התמקדות בעצמי',   low: 'צנוע/ה, שם את עצמי בצד',        high: 'חשוב לי להיות במרכז ולהצליח' },
    sensitivity: { label: 'רגישות',                 low: 'עבה עור, לא נפגע/ת בקלות',      high: 'רגיש/ה מאוד, מרגיש/ה הכול' },
    warmth:      { label: 'חום ונדיבות רגשית',      low: 'מאופק/ת',                         high: 'חם/ה, מחבק/ת, מביע/ה אהבה' },
    humor:       { label: 'חוש הומור',              low: 'רציני/ת',                         high: 'צוחק/ת ומצחיק/ה כל הזמן' },
    dominance:   { label: 'דומיננטיות',             low: 'נוח/ה להיגרר אחרי',               high: 'לוקח/ת פיקוד ומחליט/ה' },
    independence:{ label: 'עצמאות',                 low: 'אוהב/ת לעשות הכול ביחד',          high: 'צריך/ה מרחב משלי' },
    calm:        { label: 'שלווה ויציבות',          low: 'סוער/ת, חווה עליות ומורדות',      high: 'רגוע/ה, כלום לא מוציא אותי משלוותי' },
    ambition:    { label: 'שאפתנות',                low: 'מסתפק/ת במה שיש',                 high: 'שואף/ת רחוק ולא עוצר/ת' },
    order:       { label: 'סדר ושליטה',             low: 'זורם/ת, לא מתכנן/ת',              high: 'מסודר/ת, מתכנן/ת הכול' },
    spontaneity: { label: 'ספונטניות והרפתקנות',    low: 'אוהב/ת שגרה וודאות',              high: 'אוהב/ת הפתעות ושינוי' },
    sociability: { label: 'חברותיות',               low: 'אינטימי/ת, מעדיף/ה מעט אנשים',    high: 'אוהב/ת קהל ואירוח' },
    generosity:  { label: 'נתינה ונדיבות',          low: 'שומר/ת על שלי',                   high: 'נותן/ת בלב רחב' },
    jealousy:    { label: 'קנאה ורכושנות',          low: 'סומך/ת ומשחרר/ת',                 high: 'צריך/ה ביטחון ותשומת לב מתמדת' },
    flexibility: { label: 'גמישות',                 low: 'עומד/ת על שלי',                   high: 'מתפשר/ת ומתאים/ה את עצמי' },
    romance:     { label: 'רומנטיות',               low: 'מעשי/ת',                          high: 'רומנטי/ת, אוהב/ת מחוות' },
    family:      { label: 'דגש על משפחה',           low: 'קריירה ועצמי קודם',               high: 'משפחה וילדים במרכז החיים' },
    depth:       { label: 'עומק ופנימיות',          low: 'קליל/ה, חי/ה את הרגע',            high: 'מהרהר/ת, שיחות עמוקות ומשמעות' },
    directness:  { label: 'ישירות',                 low: 'מעדין/ה, עוקף/ת קונפליקט',        high: 'אומר/ת הכול בפנים, בלי עיגולים' },
};

type Weights = Partial<Record<TraitId, number>>;

export interface RateQ { id: string; kind: 'rate'; trait: TraitId; text: string }
export interface ReactQ { id: string; kind: 'react'; text: string; w: Weights }
export interface ChoiceQ {
    id: string; kind: 'choice'; text: string;
    options: { id: string; text: string; w: Weights }[];
}
export interface PickQ { id: string; kind: 'pick'; text: string; max: number; options: { id: string; text: string }[] }
export interface TextQ { id: string; kind: 'text'; text: string; placeholder?: string }
export type Question = RateQ | ReactQ | ChoiceQ | PickQ | TextQ;

export interface QuizSection {
    id: string;
    icon: string;
    title: string;
    intro: string;
    /** מה סקאלת התשובה (לשאלות react) - מוצג מעל השאלות */
    scale?: { low: string; high: string };
    questions: Question[];
}

const rate = (trait: TraitId, text: string): RateQ => ({ id: `r_${trait}`, kind: 'rate', trait, text });

export const SECTIONS: QuizSection[] = [
    // ───────────── 1. דירוג עצמי ישיר ─────────────
    {
        id: 'self', icon: '🪞', title: 'איך אני רואה את עצמי',
        intro: 'דרגו את עצמכם בכנות, 1-7. אין תכונה "טובה" או "רעה" - ההתאמה נבנית מהאמת, לא מהתמונה היפה.',
        questions: [
            rate('ego',         'עד כמה אני מתמקד/ת בעצמי ובהישגים שלי'),
            rate('sensitivity', 'עד כמה אני רגיש/ה (נפגע/ת, נרגש/ת, קולט/ת מצבי רוח)'),
            rate('warmth',      'עד כמה אני חם/ה ומביע/ה אהבה בגלוי'),
            rate('humor',       'עד כמה אני מצחיק/ה ואוהב/ת הומור'),
            rate('dominance',   'עד כמה אני דומיננטי/ת - מחליט/ה ומוביל/ה'),
            rate('independence','עד כמה אני צריך/ה מרחב ועצמאות'),
            rate('calm',        'עד כמה אני רגוע/ה ויציב/ה'),
            rate('ambition',    'עד כמה אני שאפתן/ית'),
            rate('order',       'עד כמה אני מסודר/ת ומתכנן/ת'),
            rate('spontaneity', 'עד כמה אני ספונטני/ת ואוהב/ת הרפתקאות'),
            rate('sociability', 'עד כמה אני חברותי/ת ואוהב/ת להיות בין אנשים'),
            rate('generosity',  'עד כמה אני נותן/ת ונדיב/ה (זמן, כסף, תשומת לב)'),
            rate('jealousy',    'עד כמה אני קנאי/ת או זקוק/ה לביטחון מתמיד'),
            rate('flexibility', 'עד כמה אני גמיש/ה ומוכן/ה להתפשר'),
            rate('romance',     'עד כמה אני רומנטי/ת'),
            rate('depth',       'עד כמה אני אוהב/ת שיחות עמוקות ומשמעות'),
            rate('directness',  'עד כמה אני אומר/ת בפנים מה שאני חושב/ת'),
            rate('family',      'עד כמה משפחה וילדים הם המרכז של החיים שלי'),
        ],
    },

    // ───────────── 2. מה מרתיע - עקיף ─────────────
    {
        id: 'turnoffs', icon: '🚫', title: 'מה מוריד לי את החשק',
        intro: 'דמיינו בן/בת זוג שמתנהג כך. כמה זה מפריע לכם? (1 = לא מפריע בכלל, 5 = מרתיע עד כדי סיום)',
        scale: { low: 'לא מפריע', high: 'מרתיע מאוד' },
        questions: [
            { id: 't_selftalk',  kind: 'react', text: 'מדבר/ת בעיקר על עצמו/ה ועל ההישגים שלו/ה', w: { ego: -1, depth: 0.4 } },
            { id: 't_late',      kind: 'react', text: 'מאחר/ת באופן קבוע ולא מתנצל/ת', w: { order: 1 } },
            { id: 't_cry',       kind: 'react', text: 'בוכה / נסגר/ת רגשית בקלות', w: { sensitivity: -1, calm: 0.5 } },
            { id: 't_cold',      kind: 'react', text: 'מאופק/ת, לא אומר/ת "אני אוהב/ת" ולא מחבק/ת', w: { warmth: 1, romance: 0.6 } },
            { id: 't_decide',    kind: 'react', text: 'מחליט/ה על הכול לבד, גם בלי לשאול', w: { dominance: -1, independence: 0.5 } },
            { id: 't_indec',     kind: 'react', text: 'לא מצליח/ה להחליט - "מה שאתה/את רוצה"', w: { dominance: 1 } },
            { id: 't_clingy',    kind: 'react', text: 'צריך/ה אותי כל הזמן, מתקשר/ת בכל שעה', w: { independence: 1, jealousy: -0.8 } },
            { id: 't_distant',   kind: 'react', text: 'צריך/ה הרבה זמן לבד ומרחב משלו/ה', w: { independence: -1, jealousy: 0.7 } },
            { id: 't_jokes',     kind: 'react', text: 'מצחיק/ה הכול, גם דברים רציניים', w: { depth: 1, humor: -0.4 } },
            { id: 't_serious',   kind: 'react', text: 'רציני/ת מאוד, כמעט בלי הומור', w: { humor: 1 } },
            { id: 't_messy',     kind: 'react', text: 'בלגן בבית וחוסר סדר מתמשך', w: { order: 1 } },
            { id: 't_rigid',     kind: 'react', text: 'קפדני/ת מאוד - הכול לפי תוכנית, שינוי מוציא אותו/ה מדעתו/ה', w: { order: -1, spontaneity: 1, flexibility: 0.6 } },
            { id: 't_blunt',     kind: 'react', text: 'אומר/ת דברים קשים בפנים, בלי ריפוד', w: { directness: -1, sensitivity: 0.8 } },
            { id: 't_avoid',     kind: 'react', text: 'מתחמק/ת מקונפליקט ולא אומר/ת מה מפריע', w: { directness: 1 } },
            { id: 't_money',     kind: 'react', text: 'מחושב/ת מאוד בכסף ומונע/ת מעצמו/ה הנאות', w: { generosity: 1 } },
            { id: 't_spend',     kind: 'react', text: 'מבזבז/ת, חי/ה את הרגע בלי חשבון', w: { order: 0.7, generosity: -0.3 } },
            { id: 't_party',     kind: 'react', text: 'חייב/ת תמיד חברים, אירוחים ומסיבות', w: { sociability: -1 } },
            { id: 't_hermit',    kind: 'react', text: 'בן/בת בית - לא אוהב/ת לצאת ולא אוהב/ת אורחים', w: { sociability: 1, spontaneity: 0.5 } },
            { id: 't_goalless',  kind: 'react', text: 'בלי שאיפות - מסתפק/ת במה שיש', w: { ambition: 1 } },
            { id: 't_workaholic',kind: 'react', text: 'עסוק/ה בקריירה כל הזמן, משפחה בשוליים', w: { family: 1, ambition: -0.5 } },
            { id: 't_jealous',   kind: 'react', text: 'קנאי/ת ובודק/ת עם מי אני מדבר/ת', w: { jealousy: -1, independence: 0.7 } },
            { id: 't_sarcasm',   kind: 'react', text: 'ציני/ת ועוקצני/ת, גם בצחוק', w: { sensitivity: 1, warmth: 0.6 } },
            { id: 't_drama',     kind: 'react', text: 'דרמטי/ת - כל דבר קטן הופך לסערה', w: { calm: 1 } },
            { id: 't_boring',    kind: 'react', text: 'צפוי/ה ושגרתי/ת, אותם דברים כל יום', w: { spontaneity: 1 } },
            { id: 't_gift',      kind: 'react', text: 'שוכח/ת ימי נישואין, ימי הולדת ומחוות קטנות', w: { romance: 1, warmth: 0.4 } },
        ],
    },

    // ───────────── 3. מה מושך - עקיף ─────────────
    {
        id: 'attractions', icon: '🧲', title: 'מה מושך אותי',
        intro: 'כמה כל אחד מהדברים האלה מושך אתכם אצל בן/בת זוג? (1 = לא מושך, 5 = מושך מאוד)',
        scale: { low: 'לא מושך', high: 'מושך מאוד' },
        questions: [
            { id: 'a_confident', kind: 'react', text: 'בטוח/ה בעצמו/ה, יודע/ת מה הוא/היא רוצה', w: { dominance: 0.6, ego: 0.4 } },
            { id: 'a_humble',    kind: 'react', text: 'צנוע/ה, לא מתהדר/ת, נותן/ת לאחרים להיות במרכז', w: { ego: -0.7, warmth: 0.4 } },
            { id: 'a_funny',     kind: 'react', text: 'מצחיק/ה, אחד/ת שאפשר לצחוק איתו/ה עד דמעות', w: { humor: 1 } },
            { id: 'a_deep',      kind: 'react', text: 'מעמיק/ה - אפשר לדבר איתו/ה שעות על משמעות ואמונה', w: { depth: 1 } },
            { id: 'a_emotional', kind: 'react', text: 'רגשי/ת ופתוח/ה - לא מתביישים לבכות ולהתרגש', w: { sensitivity: 0.8, warmth: 0.6 } },
            { id: 'a_strong',    kind: 'react', text: 'חזק/ה ויציב/ה - סלע שאפשר להישען עליו', w: { calm: 1, dominance: 0.4 } },
            { id: 'a_romantic',  kind: 'react', text: 'רומנטי/ת - פרחים, הפתעות ומכתבים', w: { romance: 1 } },
            { id: 'a_adventure', kind: 'react', text: 'הרפתקן/ית - טיולים, רעיונות משוגעים, יוזמה', w: { spontaneity: 1 } },
            { id: 'a_organized', kind: 'react', text: 'מאורגן/ת ואחראי/ת - אפשר לסמוך שהכול יסתדר', w: { order: 1 } },
            { id: 'a_ambitious', kind: 'react', text: 'שאפתן/ית עם חזון, שבונה משהו גדול', w: { ambition: 1 } },
            { id: 'a_homely',    kind: 'react', text: 'ביתי/ת, משפחתי/ת, חולם/ת על בית מלא ילדים', w: { family: 1, sociability: -0.3 } },
            { id: 'a_social',    kind: 'react', text: 'חבר\'ה והרבה אנשים סביבו/ה - בית פתוח לאורחים', w: { sociability: 1 } },
            { id: 'a_independent', kind: 'react', text: 'עצמאי/ת, עם חיים משלו/ה ותחומי עניין משלו/ה', w: { independence: 0.9 } },
            { id: 'a_devoted',   kind: 'react', text: 'מסור/ה - שם אותי בראש סדר העדיפויות', w: { warmth: 0.6, jealousy: 0.5, independence: -0.5 } },
            { id: 'a_direct',    kind: 'react', text: 'ישיר/ה ואמיתי/ת - תמיד יודעים איפה עומדים', w: { directness: 1 } },
            { id: 'a_gentle',    kind: 'react', text: 'עדין/ה ומתחשב/ת - תמיד זהיר/ה במילים', w: { directness: -0.7, sensitivity: 0.5 } },
            { id: 'a_generous',  kind: 'react', text: 'נדיב/ה - נותן/ת בלי לספור', w: { generosity: 1 } },
            { id: 'a_flexible',  kind: 'react', text: 'גמיש/ה וזורם/ת - בקלות מתאים/ה את עצמו/ה', w: { flexibility: 1, dominance: -0.3 } },
            { id: 'a_successful', kind: 'react', text: 'מצליח/ה וזוכה להערכה - אחד/ת שאפשר להתגאות בו/ה', w: { ego: 0.8, ambition: 0.5 } },
        ],
    },

    // ───────────── 4. תרחישים - בחירה כפויה ─────────────
    {
        id: 'scenarios', icon: '🎭', title: 'מה הייתי עושה',
        intro: 'בחרו את האפשרות הקרובה יותר אליכם - לא את זו שנשמעת יפה. אין תשובה נכונה.',
        questions: [
            { id: 's_evening', kind: 'choice', text: 'ערב פנוי באמצע השבוע. מה בא לך?', options: [
                { id: 'a', text: 'לארח או לצאת עם כמה זוגות - ככל שיותר אנשים, יותר כיף', w: { sociability: 1 } },
                { id: 'b', text: 'ערב שקט בבית, רק שנינו, שיחה טובה', w: { sociability: -0.7, depth: 0.5, romance: 0.4 } },
                { id: 'c', text: 'לצאת למקום חדש שלא היינו בו, בלי תוכנית', w: { spontaneity: 1 } },
                { id: 'd', text: 'כל אחד עושה את שלו ואז נפגשים לסיכום היום', w: { independence: 1 } },
            ] },
            { id: 's_fight', kind: 'choice', text: 'רבתם. מה הכי דומה אליך?', options: [
                { id: 'a', text: 'אני אומר/ת מיד מה שמפריע, גם אם זה חד', w: { directness: 1, calm: -0.3 } },
                { id: 'b', text: 'אני צריך/ה זמן להירגע ורק אחר כך לדבר', w: { calm: 0.7, directness: -0.3 } },
                { id: 'c', text: 'אני מוותר/ת כדי שלא יהיה מתח', w: { flexibility: 1, directness: -0.8 } },
                { id: 'd', text: 'אני נפגע/ת עמוק ומתכנס/ת עד שמבינים אותי', w: { sensitivity: 1, directness: -0.5 } },
            ] },
            { id: 's_credit', kind: 'choice', text: 'הצלחת בגדול בעבודה / בלימודים. מה הכי מספק?', options: [
                { id: 'a', text: 'שכולם יודעים ומעריכים', w: { ego: 1 } },
                { id: 'b', text: 'שבן/בת הזוג גאה בי ומשתתף/ת בשמחה', w: { warmth: 0.8, romance: 0.3 } },
                { id: 'c', text: 'לדעת בליבי שהשגתי - זה מספיק', w: { ego: -0.5, depth: 0.6, independence: 0.4 } },
                { id: 'd', text: 'להתחיל מיד את היעד הבא', w: { ambition: 1 } },
            ] },
            { id: 's_vacation', kind: 'choice', text: 'חופשה של שבוע. איך נראית החלום?', options: [
                { id: 'a', text: 'מסלול מתוכנן שעה אחר שעה, הזמנות מראש', w: { order: 1, spontaneity: -0.6 } },
                { id: 'b', text: 'כרטיס בלי כיוון - נראה מה יקרה', w: { spontaneity: 1, order: -0.7 } },
                { id: 'c', text: 'ללא תוכנית - מלון, בריכה וספר', w: { calm: 0.8, ambition: -0.4 } },
                { id: 'd', text: 'אצל המשפחה או עם חברים - ביחד', w: { family: 0.8, sociability: 0.6 } },
            ] },
            { id: 's_surprise', kind: 'choice', text: 'בן/בת הזוג מכין/ה לך הפתעה. מה הכי מרגש?', options: [
                { id: 'a', text: 'מכתב אישי שכתב/ה מהלב', w: { romance: 1, depth: 0.5 } },
                { id: 'b', text: 'מתנה יקרה ונוצצת', w: { ego: 0.6, romance: 0.4 } },
                { id: 'c', text: 'יום שלם של תשומת לב - בלי טלפון', w: { warmth: 0.8, jealousy: 0.4 } },
                { id: 'd', text: 'משהו מעשי שחסך לי עבודה', w: { romance: -0.6, order: 0.5 } },
            ] },
            { id: 's_money', kind: 'choice', text: 'מגיע בונוס בלתי צפוי. מה עושים?', options: [
                { id: 'a', text: 'חוסכים לעתיד / משקיעים', w: { order: 0.8, ambition: 0.4 } },
                { id: 'b', text: 'חוויה גדולה ביחד - טיול או ערב מיוחד', w: { spontaneity: 0.8, romance: 0.6 } },
                { id: 'c', text: 'נותנים לצדקה ולמשפחה - מה שמגיע, חוזר', w: { generosity: 1 } },
                { id: 'd', text: 'משדרגים משהו בבית או לילדים', w: { family: 0.9 } },
            ] },
            { id: 's_ex', kind: 'choice', text: 'בן/בת הזוג נפגש/ת עם חבר/ה ותיק/ה מהצד השני בקפה. אתם...', options: [
                { id: 'a', text: 'לא מרגישים בנוח, מעדיפים שלא', w: { jealousy: 1, independence: -0.5 } },
                { id: 'b', text: 'רוצים לדעת הכול אחר כך, בלי להגביל', w: { jealousy: 0.4, directness: 0.4 } },
                { id: 'c', text: 'סומכים לגמרי - זה לא עניין שלי', w: { jealousy: -1, independence: 0.5 } },
                { id: 'd', text: 'מציעים להצטרף', w: { sociability: 0.6, jealousy: 0.3 } },
            ] },
            { id: 's_decision', kind: 'choice', text: 'צריך להחליט על מעבר דירה. איך זה עובד אצלכם?', options: [
                { id: 'a', text: 'אני מקבל/ת את ההחלטה אחרי שהקשבתי', w: { dominance: 1 } },
                { id: 'b', text: 'מתייעצים הרבה ומחליטים ביחד', w: { flexibility: 0.7, warmth: 0.4 } },
                { id: 'c', text: 'מה שחשוב לבן/בת הזוג - אני מסתדר/ת', w: { dominance: -1, flexibility: 0.6 } },
                { id: 'd', text: 'כל אחד מציג רשימת יתרונות וחסרונות', w: { order: 0.8, depth: 0.3 } },
            ] },
            { id: 's_crisis', kind: 'choice', text: 'שנינו בלחץ מאוד. מה אני עושה?', options: [
                { id: 'a', text: 'לוקח/ת פיקוד ופותר/ת', w: { dominance: 1, calm: 0.4 } },
                { id: 'b', text: 'מקשיב/ה, מחזק/ת ומרגיע/ה', w: { warmth: 1, calm: 0.5 } },
                { id: 'c', text: 'משחרר/ת מתח בהומור', w: { humor: 1 } },
                { id: 'd', text: 'לוחץ/ת גם אני - צריך/ה אחד/ת שיחזיק אותי', w: { calm: -0.8, sensitivity: 0.6 } },
            ] },
            { id: 's_praise', kind: 'choice', text: 'איזו מחמאה הכי חשובה לך שתשמע/י?', options: [
                { id: 'a', text: '"אתה/את מדהים/ה, כולם מעריכים אותך"', w: { ego: 1 } },
                { id: 'b', text: '"איתך אני מרגיש/ה בטוח/ה ושלם/ה"', w: { warmth: 0.8, calm: 0.4 } },
                { id: 'c', text: '"אני לומד/ת ממך הרבה"', w: { depth: 0.8, ambition: 0.3 } },
                { id: 'd', text: '"איתך כל יום הוא הרפתקה"', w: { spontaneity: 1, humor: 0.4 } },
            ] },
            { id: 's_home', kind: 'choice', text: 'הבית שלכם בעוד 5 שנים:', options: [
                { id: 'a', text: 'מלא ילדים, רעש, אורחים בשבת', w: { family: 1, sociability: 0.7 } },
                { id: 'b', text: 'שקט, מסודר, כל דבר במקומו', w: { order: 1, calm: 0.5 } },
                { id: 'c', text: 'הרבה ספרים ושיחות, בית לימוד', w: { depth: 1 } },
                { id: 'd', text: 'בית יפה ויוקרתי שכולם מתפעלים ממנו', w: { ego: 0.8, ambition: 0.5 } },
            ] },
            { id: 's_pet', kind: 'choice', text: 'בן/בת הזוג מוסיף/ה "הערה קטנה" על משהו שעשית לא טוב. אתה/את:', options: [
                { id: 'a', text: 'מתגונן/ת - לא ממש הסכמתי', w: { ego: 0.9, sensitivity: 0.3 } },
                { id: 'b', text: 'מתקן/ת מיד, בלי דרמה', w: { flexibility: 0.8, calm: 0.4 } },
                { id: 'c', text: 'נפגע/ת ושותק/ת', w: { sensitivity: 1, directness: -0.6 } },
                { id: 'd', text: 'מחזיר/ה הערה משלי', w: { directness: 0.8, dominance: 0.4 } },
            ] },
        ],
    },

    // ───────────── 5. ערכים ─────────────
    {
        id: 'values', icon: '⭐', title: 'מה הכי חשוב לי',
        intro: 'בחרו עד 5 דברים שהכי קובעים אצלכם אם זוגיות תצליח.',
        questions: [
            { id: 'v_top', kind: 'pick', text: 'הדברים הכי חשובים לי בזוגיות', max: 5, options: [
                { id: 'trust', text: 'אמון ויושר' }, { id: 'humor', text: 'צחוק ושמחה' },
                { id: 'torah', text: 'עולם רוחני משותף' }, { id: 'family', text: 'בית ומשפחה' },
                { id: 'respect', text: 'כבוד הדדי' }, { id: 'space', text: 'מרחב אישי' },
                { id: 'passion', text: 'חיבה ואינטימיות' }, { id: 'growth', text: 'צמיחה והתפתחות' },
                { id: 'stability', text: 'יציבות כלכלית' }, { id: 'adventure', text: 'חוויות והרפתקאות' },
                { id: 'friends', text: 'חברים וקהילה' }, { id: 'peace', text: 'שלווה ושקט בבית' },
                { id: 'ambition', text: 'שאיפה והצלחה' }, { id: 'gentle', text: 'עדינות וטוב לב' },
            ] },
            { id: 'v_dealbreaker', kind: 'pick', text: 'סימנים שאצלי הם אדומים (בחרו עד 5)', max: 5, options: [
                { id: 'lie', text: 'שקרים' }, { id: 'ego', text: 'אגו מנופח' }, { id: 'temper', text: 'התפרצויות כעס' },
                { id: 'lazy', text: 'עצלנות' }, { id: 'cheap', text: 'קמצנות' }, { id: 'rude', text: 'חוסר נימוס' },
                { id: 'control', text: 'שליטה וקנאות' }, { id: 'cold', text: 'קרירות רגשית' },
                { id: 'mama', text: 'תלות יתר בהורים' }, { id: 'phone', text: 'שעבוד לטלפון' },
                { id: 'gossip', text: 'רכילות ולשון הרע' }, { id: 'mess', text: 'אי-סדר מתמשך' },
                { id: 'vain', text: 'שטחיות ודגש על חיצוניות' }, { id: 'victim', text: 'קורבנות ותלונות' },
            ] },
        ],
    },

    // ───────────── 6. פתוחות ─────────────
    {
        id: 'open', icon: '✍️', title: 'במילים שלי',
        intro: 'כמה מילים בלבד. אפשר לדלג על מה שלא נוח - אבל כל משפט משפר את ההתאמה.',
        questions: [
            { id: 'o_best', kind: 'text', text: 'מה אנשים שמכירים אותי הכי טוב אומרים עליי?', placeholder: 'למשל: "תמיד מקשיב/ה", "מצחיק/ה", "עקשן/ית"...' },
            { id: 'o_worst', kind: 'text', text: 'מה הצד הפחות נוח שלי, שבן/בת הזוג צריך/ה להכיר?', placeholder: 'כנות כאן שווה זהב' },
            { id: 'o_anger', kind: 'text', text: 'מה מכעיס אותי הכי מהר, ואיך אני מגיב/ה?', placeholder: '' },
            { id: 'o_perfect', kind: 'text', text: 'תארו יום שישי-שבת מושלם עם בן/בת הזוג', placeholder: '' },
            { id: 'o_learn', kind: 'text', text: 'מה למדתי על עצמי מקשרים קודמים?', placeholder: '' },
            { id: 'o_need', kind: 'text', text: 'מה אני צריך/ה מבן/בת הזוג שלא אמרתי עד היום?', placeholder: '' },
        ],
    },
];

/** כל התשובות: מזהה שאלה -> ערך (מספר, מזהה אפשרות, מערך מזהים או טקסט) */
export type Answers = Record<string, number | string | string[]>;

export interface QuizState {
    v: 1;
    answers: Answers;
    /** פרופיל תכונות מחושב 0-100 - מעודכן בכל שינוי */
    traits: Partial<Record<TraitId, number>>;
    updatedAt: string;
}

export const QUIZ_FIELD_KEY = 'ai_quiz';

export function emptyQuiz(): QuizState {
    return { v: 1, answers: {}, traits: {}, updatedAt: '' };
}

export function parseQuiz(raw: unknown): QuizState {
    if (typeof raw !== 'string' || !raw.trim()) return emptyQuiz();
    try {
        const o = JSON.parse(raw);
        if (o && typeof o === 'object' && o.answers && typeof o.answers === 'object') {
            return { v: 1, answers: o.answers, traits: o.traits ?? {}, updatedAt: String(o.updatedAt ?? '') };
        }
    } catch { /* פורמט ישן/פגום - מתחילים מחדש */ }
    return emptyQuiz();
}

export function serializeQuiz(q: QuizState): string {
    return JSON.stringify({ ...q, traits: computeTraits(q.answers), updatedAt: new Date().toISOString() });
}

export function isAnswered(q: Question, a: Answers): boolean {
    const v = a[q.id];
    if (q.kind === 'pick') return Array.isArray(v) && v.length > 0;
    if (q.kind === 'text') return typeof v === 'string' && v.trim().length > 0;
    return v !== undefined && v !== '';
}

/** כמה שאלות אינן פתוחות (חובה אופטימלית) ענו, מתוך כלל השאלות, לכל פרק */
export function sectionProgress(s: QuizSection, a: Answers): { done: number; total: number } {
    return { done: s.questions.filter((q) => isAnswered(q, a)).length, total: s.questions.length };
}

export function totalProgress(a: Answers): { done: number; total: number; pct: number } {
    let done = 0, total = 0;
    for (const s of SECTIONS) {
        const p = sectionProgress(s, a);
        done += p.done; total += p.total;
    }
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/**
 * מקפל את כל התשובות לפרופיל תכונות 0-100.
 * דירוג ישיר (1-7) נספר בכפול, כי הוא הצהרה מפורשת; שאלות עקיפות נותנות את "הגילוי".
 * react: ערך 1-5 מנורמל ל-[-1,1] ומוכפל במשקל התכונה.
 * choice: האפשרות שנבחרה מוסיפה את משקליה (+) בלבד - הבחירה היא הצהרה על מי שאני.
 */
export function computeTraits(a: Answers): Partial<Record<TraitId, number>> {
    const sum: Partial<Record<TraitId, number>> = {};
    const wt: Partial<Record<TraitId, number>> = {};
    const add = (t: TraitId, signal: number, weight: number) => {
        sum[t] = (sum[t] ?? 0) + signal * weight;
        wt[t] = (wt[t] ?? 0) + weight;
    };

    for (const s of SECTIONS) {
        for (const q of s.questions) {
            const v = a[q.id];
            if (v === undefined) continue;
            if (q.kind === 'rate' && typeof v === 'number') {
                add(q.trait, (v - 4) / 3, 2);
            } else if (q.kind === 'react' && typeof v === 'number') {
                const sig = (v - 3) / 2;
                for (const [t, w] of Object.entries(q.w) as [TraitId, number][]) add(t, sig * Math.sign(w), Math.abs(w));
            } else if (q.kind === 'choice' && typeof v === 'string') {
                const opt = q.options.find((o) => o.id === v);
                if (!opt) continue;
                for (const [t, w] of Object.entries(opt.w) as [TraitId, number][]) add(t, Math.sign(w), Math.abs(w));
            }
        }
    }

    const out: Partial<Record<TraitId, number>> = {};
    for (const t of Object.keys(TRAITS) as TraitId[]) {
        if (!wt[t]) continue;
        const norm = Math.max(-1, Math.min(1, (sum[t] ?? 0) / wt[t]!));
        out[t] = Math.round(50 + norm * 50);
    }
    return out;
}

/** תכונות בולטות (הכי גבוהות / הכי נמוכות) - לתצוגת סיכום */
export function topTraits(traits: Partial<Record<TraitId, number>>, n = 4): { id: TraitId; score: number }[] {
    return (Object.entries(traits) as [TraitId, number][])
        .map(([id, score]) => ({ id, score }))
        .sort((x, y) => Math.abs(y.score - 50) - Math.abs(x.score - 50))
        .slice(0, n);
}
