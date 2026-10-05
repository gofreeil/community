// בנק השאלות של שאלון ההתאמה. הלוגיקה והטיפוסים ב-singlesQuestionnaire.ts.
//
// סימון מגדר: {גבר|אישה} = מגדר הנשאל/ת (או נושא התכונה בכותרות הסקאלה);
//             <בן הזוג|בת הזוג> = הצד ההפוך.
// בשאלות react: משקל חיובי = ההתנהגות המתוארת מייצגת את הקוטב הגבוה של התכונה.
//   "מפריע" על התנהגות בקוטב הגבוה => מחפש/ת נמוך; "מושך" => מחפש/ת גבוה.

import type { G, Question, QuizSection, RateQ, ReactQ, TraitId, Weights } from './singlesQuestionnaire';

interface TraitDef { label: string; low: string; high: string }

/** כותרות הסקאלה בגוף שלישי, כדי שישמשו גם לדירוג עצמי וגם לדירוג בן/בת הזוג */
export const TRAITS: Record<TraitId, TraitDef> = {
    ego:         { label: 'אגו',                         low: '{צנוע|צנועה}, לא {צריך|צריכה} במה',                high: '{אוהב|אוהבת} להיות במרכז ולהצליח' },
    sensitivity: { label: 'רגישות',                   low: '{עבה|עבת} עור, לא {נפגע|נפגעת} בקלות',              high: '{רגיש|רגישה} מאוד, מרגיש הכול' },
    warmth:      { label: 'חום והבעת אהבה',           low: '{מאופק|מאופקת}',                                    high: '{חם|חמה} ו{מביע|מביעה} אהבה בגלוי' },
    humor:       { label: 'חוש הומור',                low: '{רציני|רצינית}',                                   high: '{צוחק|צוחקת} ו{מצחיק|מצחיקה} כל הזמן' },
    dominance:   { label: 'דומיננטיות',               low: '{נוח|נוחה} לו ללכת אחרי אחרים',                     high: '{לוקח|לוקחת} פיקוד ו{מחליט|מחליטה}' },
    independence:{ label: 'עצמאות ומרחב',             low: '{אוהב|אוהבת} לעשות הכול ביחד',                      high: '{צריך|צריכה} מרחב משלו' },
    calm:        { label: 'שלווה ויציבות',            low: '{סוער|סוערת}, עליות ומורדות',                       high: '{רגוע ויציב|רגועה ויציבה}' },
    ambition:    { label: 'שאפתנות',                  low: '{מסתפק|מסתפקת} במה שיש',                            high: '{שואף|שואפת} רחוק ולא {עוצר|עוצרת}' },
    order:       { label: 'סדר ותכנון',               low: '{זורם|זורמת}, לא {מתכנן|מתכננת}',                   high: '{מסודר|מסודרת} ו{מתכנן|מתכננת} הכול' },
    spontaneity: { label: 'ספונטניות והרפתקנות',      low: '{אוהב|אוהבת} שגרה וודאות',                          high: '{אוהב|אוהבת} הפתעות ושינוי' },
    sociability: { label: 'חברותיות',                 low: '{אינטימי|אינטימית}, מעט אנשים',                     high: '{אוהב|אוהבת} קהל ואירוח' },
    generosity:  { label: 'נתינה ונדיבות',            low: '{שומר|שומרת} על {שלו|שלה}',                         high: '{נותן|נותנת} בלב רחב' },
    jealousy:    { label: 'קנאה וצורך בביטחון',       low: '{סומך|סומכת} ו{משחרר|משחררת}',                      high: '{זקוק|זקוקה} לביטחון ותשומת לב מתמידים' },
    flexibility: { label: 'גמישות',                   low: '{עומד|עומדת} על {שלו|שלה}',                         high: '{מתפשר|מתפשרת} ו{מתאים|מתאימה} את {עצמו|עצמה}' },
    romance:     { label: 'רומנטיות',                 low: '{מעשי|מעשית}',                                     high: '{רומנטי|רומנטית}, {אוהב|אוהבת} מחוות' },
    family:      { label: 'משפחה וילדים',             low: 'קריירה והגשמה עצמית קודם',                          high: 'משפחה וילדים במרכז החיים' },
    depth:       { label: 'עומק ופנימיות',            low: '{קליל|קלילה}, {חי|חיה} את הרגע',                    high: '{מהורהר|מהורהרת}, שיחות עמוקות ומשמעות' },
    directness:  { label: 'ישירות',                   low: '{עדין|עדינה}, {עוקף|עוקפת} עימות',                  high: '{אומר|אומרת} הכול בפנים, בלי עיגולים' },
    support:     { label: 'הכלה ותמיכה',              low: '{מחפש|מחפשת} פתרון מהר, פחות {מתעכב|מתעכבת} על רגשות', high: '{מקשיב|מקשיבה}, {מכיל|מכילה} ו{נותן|נותנת} עורף' },
    provider:    { label: 'אחריות כלכלית',            low: 'פחות {מתעסק|מתעסקת} בכסף',                          high: '{דואג|דואגת} לביטחון כלכלי ו{מתכנן|מתכננת} קדימה' },
    parents:     { label: 'קרבה למשפחת המוצא',        low: '{עצמאי|עצמאית} מההורים',                            high: '{קרוב|קרובה} מאוד להורים ו{מתייעץ|מתייעצת} איתם' },
};

// ───────────── בנאים קצרים ─────────────

const rateSelf = (trait: TraitId, text: string): RateQ => ({ id: `r_${trait}`, kind: 'rate', about: 'self', trait, text });
const ratePartner = (trait: TraitId): RateQ => ({ id: `p_${trait}`, kind: 'rate', about: 'partner', trait, text: TRAITS[trait].label });
const bother = (id: string, text: string, w: Weights, mirror = 0.4): ReactQ => ({ id, kind: 'react', mode: 'bother', text, w, mirror });
const attract = (id: string, text: string, w: Weights, mirror = 0.3): ReactQ => ({ id, kind: 'react', mode: 'attract', text, w, mirror });
type Opt = { id: string; text: string; self?: Weights; seeks?: Weights };
const choice = (id: string, text: string, options: Opt[], extra: Partial<Question> = {}): Question =>
    ({ id, kind: 'choice', text, options, ...extra }) as Question;

// ───────────── פרקים משותפים ─────────────

const SELF_RATINGS: QuizSection = {
    id: 'self', icon: '🪞', title: 'איך אני רואה את עצמי',
    intro: 'דרגו את עצמכם בכנות, 1-7. אין תכונה "טובה" או "רעה" - ההתאמה נבנית מהאמת, לא מהתמונה היפה. מתחת לכל שאלה מוצגים שני הקצוות של הסקאלה.',
    questions: [
        rateSelf('ego',          'עד כמה אני {מתמקד|מתמקדת} בעצמי ובהישגים שלי'),
        rateSelf('sensitivity',  'עד כמה אני {רגיש|רגישה} ({נפגע|נפגעת}, {מתרגש|מתרגשת}, {קולט|קולטת} מצבי רוח)'),
        rateSelf('warmth',       'עד כמה אני {חם|חמה} ו{מביע|מביעה} אהבה בגלוי'),
        rateSelf('humor',        'עד כמה אני {מצחיק|מצחיקה} ו{אוהב|אוהבת} הומור'),
        rateSelf('dominance',    'עד כמה אני {דומיננטי|דומיננטית} - {מוביל|מובילה} ו{מחליט|מחליטה}'),
        rateSelf('independence', 'עד כמה אני {צריך|צריכה} מרחב ועצמאות'),
        rateSelf('calm',         'עד כמה אני {רגוע|רגועה} ו{יציב|יציבה}'),
        rateSelf('ambition',     'עד כמה אני {שאפתן|שאפתנית}'),
        rateSelf('order',        'עד כמה אני {מסודר|מסודרת} ו{מתכנן|מתכננת}'),
        rateSelf('spontaneity',  'עד כמה אני {ספונטני|ספונטנית} ו{אוהב|אוהבת} הרפתקאות'),
        rateSelf('sociability',  'עד כמה אני {חברותי|חברותית} ו{אוהב|אוהבת} להיות בין אנשים'),
        rateSelf('generosity',   'עד כמה אני {נותן|נותנת} ו{נדיב|נדיבה} - בזמן, בכסף ובתשומת לב'),
        rateSelf('jealousy',     'עד כמה אני {קנאי|קנאית} או {זקוק|זקוקה} לביטחון מתמיד'),
        rateSelf('flexibility',  'עד כמה אני {גמיש|גמישה} ו{מוכן|מוכנה} להתפשר'),
        rateSelf('romance',      'עד כמה אני {רומנטי|רומנטית}'),
        rateSelf('depth',        'עד כמה אני {אוהב|אוהבת} שיחות עמוקות ומשמעות'),
        rateSelf('directness',   'עד כמה אני {אומר|אומרת} בפנים מה שאני {חושב|חושבת}'),
        rateSelf('support',      'עד כמה אני {מקשיב|מקשיבה} ו{מכיל|מכילה} כשקשה למישהו'),
        rateSelf('provider',     'עד כמה חשוב לי להבטיח ביטחון כלכלי למשפחה'),
        rateSelf('family',       'עד כמה משפחה וילדים הם המרכז של החיים שלי'),
        rateSelf('parents',      'עד כמה אני {קרוב|קרובה} להורים שלי ו{מתייעץ|מתייעצת} איתם'),
    ],
};

const PARTNER_RATINGS: QuizSection = {
    id: 'ideal', icon: '🎯', title: 'מי אני מחפש{|ת}',
    intro: 'איפה על הסקאלה הייתם רוצים את <בן הזוג|בת הזוג> האידיאלי<|ת> שלכם? (1-7). זו התשובה המוצהרת - בהמשך נבדוק גם מה מושך אתכם בפועל, ונשווה.',
    questions: (['ego', 'sensitivity', 'warmth', 'humor', 'dominance', 'independence', 'calm', 'ambition', 'order', 'spontaneity', 'sociability', 'romance', 'depth', 'directness', 'flexibility', 'support'] as TraitId[]).map(ratePartner),
};

const SCENARIOS_COMMON: Question[] = [
    choice('s_evening', 'ערב פנוי באמצע השבוע. מה בא לך?', [
        { id: 'a', text: 'לארח או לצאת עם כמה זוגות - ככל שיותר אנשים, יותר כיף', self: { sociability: 1 } },
        { id: 'b', text: 'ערב שקט בבית, רק שנינו, שיחה טובה', self: { sociability: -0.7, depth: 0.5, romance: 0.4 } },
        { id: 'c', text: 'לצאת למקום חדש שלא היינו בו, בלי תוכנית', self: { spontaneity: 1 } },
        { id: 'd', text: 'כל אחד עושה את שלו ואז נפגשים לסיכום היום', self: { independence: 1 } },
    ]),
    choice('s_fight', 'רבתם. מה הכי דומה לך?', [
        { id: 'a', text: 'אני {אומר|אומרת} מיד מה שמפריע, גם אם זה חד', self: { directness: 1, calm: -0.3 } },
        { id: 'b', text: 'אני {צריך|צריכה} זמן להירגע ורק אחר כך לדבר', self: { calm: 0.7, directness: -0.3 } },
        { id: 'c', text: 'אני {מוותר|מוותרת} כדי שלא יהיה מתח', self: { flexibility: 1, directness: -0.8 } },
        { id: 'd', text: 'אני {נפגע|נפגעת} עמוק ו{מתכנס|מתכנסת} עד שמבינים אותי', self: { sensitivity: 1, directness: -0.5 } },
    ]),
    choice('s_credit', 'הצלחת בגדול בעבודה או בלימודים. מה הכי מספק?', [
        { id: 'a', text: 'שכולם יודעים ומעריכים', self: { ego: 1 } },
        { id: 'b', text: 'ש<בן הזוג|בת הזוג> גאה בי ו<משתתף|משתתפת> בשמחה', self: { warmth: 0.8, romance: 0.3 } },
        { id: 'c', text: 'לדעת בליבי שהשגתי - זה מספיק', self: { ego: -0.5, depth: 0.6, independence: 0.4 } },
        { id: 'd', text: 'להתחיל מיד את היעד הבא', self: { ambition: 1 } },
    ]),
    choice('s_vacation', 'חופשה של שבוע. איך נראית החלום?', [
        { id: 'a', text: 'מסלול מתוכנן שעה אחר שעה, הזמנות מראש', self: { order: 1, spontaneity: -0.6 } },
        { id: 'b', text: 'כרטיס בלי כיוון - נראה מה יקרה', self: { spontaneity: 1, order: -0.7 } },
        { id: 'c', text: 'בלי תוכנית - מלון, בריכה וספר', self: { calm: 0.8, ambition: -0.4 } },
        { id: 'd', text: 'אצל המשפחה או עם חברים - ביחד', self: { family: 0.8, sociability: 0.6 } },
    ]),
    choice('s_surprise', '<בן הזוג|בת הזוג> <מכין|מכינה> לך הפתעה. מה הכי מרגש?', [
        { id: 'a', text: 'מכתב אישי שנכתב מהלב', self: { romance: 1, depth: 0.5 } },
        { id: 'b', text: 'מתנה יקרה ומרשימה', self: { ego: 0.6, romance: 0.4 } },
        { id: 'c', text: 'יום שלם של תשומת לב - בלי טלפון', self: { warmth: 0.8, jealousy: 0.4 } },
        { id: 'd', text: 'משהו מעשי שחסך לי עבודה', self: { romance: -0.6, order: 0.5 } },
    ]),
    choice('s_money', 'מגיע בונוס בלתי צפוי. מה עושים?', [
        { id: 'a', text: 'חוסכים לעתיד או משקיעים', self: { order: 0.8, provider: 0.8, ambition: 0.4 } },
        { id: 'b', text: 'חוויה גדולה ביחד - טיול או ערב מיוחד', self: { spontaneity: 0.8, romance: 0.6 } },
        { id: 'c', text: 'נותנים לצדקה ולמשפחה - מה שמגיע, חוזר', self: { generosity: 1 } },
        { id: 'd', text: 'משדרגים משהו בבית או לילדים', self: { family: 0.9 } },
    ]),
    choice('s_ex', 'מישהו מהעבר של <בן הזוג|בת הזוג> מזמין <אותו|אותה> לקפה. מה הכי דומה לך?', [
        { id: 'a', text: 'לא {מרגיש|מרגישה} בנוח, מעדיף שלא', self: { jealousy: 1, independence: -0.5 } },
        { id: 'b', text: 'רוצה לדעת הכול אחר כך, בלי להגביל', self: { jealousy: 0.4, directness: 0.4 } },
        { id: 'c', text: '{סומך|סומכת} לגמרי - זה לא עניין שלי', self: { jealousy: -1, independence: 0.5 } },
        { id: 'd', text: 'מציע להצטרף', self: { sociability: 0.6, jealousy: 0.3 } },
    ]),
    choice('s_decision', 'צריך להחליט על מעבר דירה. איך זה עובד אצלכם?', [
        { id: 'a', text: 'אני {מקבל|מקבלת} את ההחלטה אחרי שהקשבתי', self: { dominance: 1 } },
        { id: 'b', text: 'מתייעצים הרבה ומחליטים ביחד', self: { flexibility: 0.7, warmth: 0.4 } },
        { id: 'c', text: 'מה שחשוב ל<בן הזוג|בת הזוג> - אני {מסתדר|מסתדרת}', self: { dominance: -1, flexibility: 0.6 } },
        { id: 'd', text: 'כל אחד מציג יתרונות וחסרונות, ולפי הרשימה מחליטים', self: { order: 0.8, depth: 0.3 } },
    ]),
    choice('s_crisis', 'שנינו בלחץ גדול. מה אני עושה?', [
        { id: 'a', text: '{לוקח|לוקחת} פיקוד ו{פותר|פותרת}', self: { dominance: 1, calm: 0.4 } },
        { id: 'b', text: '{מקשיב|מקשיבה}, {מחזק|מחזקת} ו{מרגיע|מרגיעה}', self: { support: 1, warmth: 0.6, calm: 0.5 } },
        { id: 'c', text: '{משחרר|משחררת} מתח בהומור', self: { humor: 1 } },
        { id: 'd', text: '{נלחץ|נלחצת} גם אני - אני {צריך|צריכה} מישהו שיחזיק אותי', self: { calm: -0.8, sensitivity: 0.6 } },
    ]),
    choice('s_praise', 'איזו מחמאה הכי חשובה לך לשמוע?', [
        { id: 'a', text: '"אתה מדהים, כולם מעריכים אותך"', self: { ego: 1 } },
        { id: 'b', text: '"איתך אני מרגיש בטוח ושלם"', self: { warmth: 0.8, calm: 0.4 } },
        { id: 'c', text: '"אני לומד ממך הרבה"', self: { depth: 0.8, ambition: 0.3 } },
        { id: 'd', text: '"איתך כל יום הוא הרפתקה"', self: { spontaneity: 1, humor: 0.4 } },
    ]),
    choice('s_home', 'הבית שלכם בעוד 5 שנים:', [
        { id: 'a', text: 'מלא ילדים, רעש, אורחים בשבת', self: { family: 1, sociability: 0.7 } },
        { id: 'b', text: 'שקט, מסודר, כל דבר במקומו', self: { order: 1, calm: 0.5 } },
        { id: 'c', text: 'הרבה ספרים ושיחות, בית של לימוד ומחשבה', self: { depth: 1 } },
        { id: 'd', text: 'בית יפה ויוקרתי שכולם מתפעלים ממנו', self: { ego: 0.8, ambition: 0.5 } },
    ]),
    choice('s_pet', '<בן הזוג|בת הזוג> <מוסיף|מוסיפה> "הערה קטנה" על משהו שעשיתי לא טוב. אני:', [
        { id: 'a', text: '{מתגונן|מתגוננת} - לא ממש {מסכים|מסכימה}', self: { ego: 0.9, sensitivity: 0.3 } },
        { id: 'b', text: '{מתקן|מתקנת} מיד, בלי דרמה', self: { flexibility: 0.8, calm: 0.4 } },
        { id: 'c', text: '{נפגע|נפגעת} ו{שותק|שותקת}', self: { sensitivity: 1, directness: -0.6 } },
        { id: 'd', text: '{מחזיר|מחזירה} הערה משלי', self: { directness: 0.8, dominance: 0.4 } },
    ]),
    choice('s_inlaws', 'ההורים של <בן הזוג|בת הזוג> רוצים להיות מאוד מעורבים בחיים שלכם. אני:', [
        { id: 'a', text: 'שמח על קשר חם ואינטנסיבי - המשפחה מתרחבת', self: { family: 0.8, parents: 0.6, sociability: 0.4 } },
        { id: 'b', text: 'רוצה גבולות ברורים - הבית שלנו קודם', self: { independence: 0.9, directness: 0.5 } },
        { id: 'c', text: '{מתאים|מתאימה} את עצמי, העיקר שיהיה שקט', self: { flexibility: 0.9, directness: -0.4 } },
        { id: 'd', text: '{מבקש|מבקשת} מ<בן הזוג|בת הזוג> להיות <המתווך|המתווכת> מולם', self: { dominance: -0.5, directness: -0.3 } },
    ]),
];

const DILEMMAS: QuizSection = {
    id: 'dilemmas', icon: '⚖️', title: 'מה חשוב לי יותר',
    intro: 'שתי תכונות טובות - אבל חייבים לבחור. מי <בן הזוג|בת הזוג> שיתאים לכם יותר? כאן מתגלים סדרי העדיפויות האמיתיים.',
    questions: [
        choice('d_humor', 'הומור או עומק?', [
            { id: 'a', text: '<מצחיק|מצחיקה> וקליל<|ה> - צוחקים הרבה', seeks: { humor: 1, depth: -0.6 } },
            { id: 'b', text: '<עמוק|עמוקה> ורציני<|ת> - שיחות על משמעות', seeks: { depth: 1, humor: -0.6 } },
        ]),
        choice('d_stab', 'יציבות או הרפתקה?', [
            { id: 'a', text: '<יציב|יציבה> ושגרתי<|ת> - אני {יודע|יודעת} מה מחכה', seeks: { spontaneity: -1, calm: 0.6 } },
            { id: 'b', text: '<מלא|מלאה> הפתעות, מחדש<|ת> כל יום', seeks: { spontaneity: 1, calm: -0.4 } },
        ]),
        choice('d_amb', 'שאפתנות או שלווה?', [
            { id: 'a', text: '<שאפתן|שאפתנית> ו<מצליח|מצליחה> - <הולך|הולכת> רחוק', seeks: { ambition: 1, ego: 0.3 } },
            { id: 'b', text: '<שלו|שלווה> ו<מסתפק|מסתפקת> - הבית והשקט קודם', seeks: { ambition: -1, calm: 0.5 } },
        ]),
        choice('d_dom', 'חוזק או גמישות?', [
            { id: 'a', text: '<חזק|חזקה> ו<דומיננטי|דומיננטית> - <מוביל|מובילה> את הבית', seeks: { dominance: 1 } },
            { id: 'b', text: '<גמיש|גמישה> ונוח<|ה> לשיתוף פעולה', seeks: { dominance: -1, flexibility: 1 } },
        ]),
        choice('d_dir', 'ישירות או עדינות?', [
            { id: 'a', text: '<ישיר|ישירה> - <אומר|אומרת> הכול בפנים', seeks: { directness: 1, sensitivity: -0.4 } },
            { id: 'b', text: '<עדין|עדינה> ו<מתחשב|מתחשבת> במילים', seeks: { directness: -1, sensitivity: 0.4 } },
        ]),
        choice('d_soc', 'חברותי או ביתי?', [
            { id: 'a', text: '<חברותי|חברותית> - בית פתוח, חברים ואורחים', seeks: { sociability: 1 } },
            { id: 'b', text: '<ביתי|ביתית> - אינטימיות ושקט, מעט אנשים', seeks: { sociability: -1, family: 0.4 } },
        ]),
        choice('d_ind', 'עצמאות או קרבה?', [
            { id: 'a', text: '<עצמאי|עצמאית>, עם עולם משלו', seeks: { independence: 1 } },
            { id: 'b', text: '<מרוכז|מרוכזת> בנו ובמשפחה', seeks: { independence: -1, family: 0.6 } },
        ]),
        choice('d_order', 'סדר או זרימה?', [
            { id: 'a', text: '<מסודר|מסודרת> ו<מתוכנן|מתוכננת> - אפשר לסמוך', seeks: { order: 1 } },
            { id: 'b', text: '<זורם|זורמת> ו<משוחרר|משוחררת> - בלי לחץ', seeks: { order: -1, calm: 0.3 } },
        ]),
        choice('d_emotion', 'פתיחות רגשית או איפוק?', [
            { id: 'a', text: '<פתוח|פתוחה> ו<רגשי|רגשית> - <מביע|מביעה> הכול', seeks: { sensitivity: 0.7, warmth: 0.6 } },
            { id: 'b', text: '<מאופק|מאופקת> ו<יציב|יציבה> - לא <נסחף|נסחפת>', seeks: { calm: 0.8, sensitivity: -0.6 } },
        ]),
        choice('d_rom', 'רומנטיקה או אחריות?', [
            { id: 'a', text: '<רומנטי|רומנטית> - מחוות, מילים והפתעות', seeks: { romance: 1 } },
            { id: 'b', text: '<מעשי|מעשית> ו<אחראי|אחראית> - מעשים ולא מילים', seeks: { romance: -0.8, provider: 0.5, order: 0.4 } },
        ]),
        choice('d_ego', 'כוכב או צנוע?', [
            { id: 'a', text: '<מוערך|מוערכת> על ידי כולם - אפשר להתגאות', seeks: { ego: 1, ambition: 0.4 } },
            { id: 'b', text: '<צנוע|צנועה> ואנושי<|ת> - לא <צריך|צריכה> במה', seeks: { ego: -1 } },
        ]),
        choice('d_fam', 'משפחה או קריירה?', [
            { id: 'a', text: 'ממוקד<|ת> משפחה - הבית והילדים במרכז', seeks: { family: 1 } },
            { id: 'b', text: 'ממוקד<|ת> קריירה והגשמה עצמית', seeks: { family: -0.8, ambition: 0.8 } },
        ]),
    ],
};

const VALUES: QuizSection = {
    id: 'values', icon: '⭐', title: 'ערכים וסימנים',
    intro: 'בחרו עד 5 בכל שאלה. זה מה שישפיע הכי חזק על ההתאמה.',
    questions: [
        { id: 'v_top', kind: 'pick', text: 'הדברים הכי חשובים לי בזוגיות', max: 5, options: [
            { id: 'trust', text: 'אמון ויושר' }, { id: 'humor', text: 'צחוק ושמחה' },
            { id: 'torah', text: 'עולם רוחני משותף' }, { id: 'family', text: 'בית ומשפחה' },
            { id: 'respect', text: 'כבוד הדדי' }, { id: 'space', text: 'מרחב אישי' },
            { id: 'passion', text: 'חיבה וקרבה' }, { id: 'growth', text: 'צמיחה והתפתחות' },
            { id: 'stability', text: 'יציבות כלכלית' }, { id: 'adventure', text: 'חוויות והרפתקאות' },
            { id: 'friends', text: 'חברים וקהילה' }, { id: 'peace', text: 'שלווה ושקט בבית' },
            { id: 'ambition', text: 'שאיפה והצלחה' }, { id: 'gentle', text: 'עדינות וטוב לב' },
        ] },
        { id: 'v_red', kind: 'pick', text: 'סימנים שאצלי הם אדומים', max: 5, options: [
            { id: 'lie', text: 'שקרים' }, { id: 'ego', text: 'אגו מנופח' }, { id: 'temper', text: 'התפרצויות כעס' },
            { id: 'lazy', text: 'עצלנות' }, { id: 'cheap', text: 'קמצנות' }, { id: 'rude', text: 'חוסר נימוס' },
            { id: 'control', text: 'שליטה וקנאות' }, { id: 'cold', text: 'קרירות רגשית' },
            { id: 'mama', text: 'תלות יתר בהורים' }, { id: 'phone', text: 'שעבוד לטלפון' },
            { id: 'gossip', text: 'רכילות ולשון הרע' }, { id: 'mess', text: 'אי-סדר מתמשך' },
            { id: 'vain', text: 'שטחיות ודגש על חיצוניות' }, { id: 'victim', text: 'קורבנות ותלונות' },
        ] },
        { id: 'v_love', kind: 'pick', text: 'איך אני הכי {מרגיש אהוב|מרגישה אהובה}? (עד 2)', max: 2, options: [
            { id: 'words', text: 'מילים טובות והערכה' }, { id: 'time', text: 'זמן איכות בלי הפרעות' },
            { id: 'gifts', text: 'מחוות ומתנות' }, { id: 'acts', text: 'עזרה מעשית ושיתוף במשימות' },
            { id: 'close', text: 'חיבה וקרבה' },
        ] },
    ],
};

// ───────────── שאלות המשך: מופיעות רק כשתשובה קודמת מצדיקה ─────────────

const FOLLOWUPS: QuizSection = {
    id: 'deeper', icon: '🔍', title: 'חידוד',
    intro: 'שאלות שנוספו בעקבות התשובות שלכם - כדי לדייק איפה זה באמת משפיע על זוגיות.',
    questions: [
        choice('f_dom', 'שניכם בעלי דעה נחרצת ורבים על החלטה. מה קורה?', [
            { id: 'a', text: 'אני לא {מוותר|מוותרת} - הצד השני צריך להתאים את עצמו', self: { dominance: 1, flexibility: -1 } },
            { id: 'b', text: 'אני {מוותר|מוותרת} בקטנות ו{עומד|עומדת} על העיקר', self: { flexibility: 0.6, dominance: 0.4 } },
            { id: 'c', text: 'אחפש <בן זוג|בת זוג> פחות דומיננטי<|ת> ממני', seeks: { dominance: -1 } },
            { id: 'd', text: 'דווקא {אוהב|אוהבת} ש<בן הזוג|בת הזוג> חזק<|ה> כמוני - מתווכחים וממשיכים', seeks: { dominance: 0.8, directness: 0.6 } },
        ], { when: { id: 'r_dominance', gte: 6 } }),
        choice('f_jeal', 'מה גורם לך לחוש חוסר ביטחון בקשר?', [
            { id: 'a', text: 'חוסר תשומת לב ויחס', seeks: { warmth: 1, independence: -0.5 } },
            { id: 'b', text: 'קשרים עם הצד השני שאני לא מכיר', seeks: { jealousy: -0.5, directness: 0.5 } },
            { id: 'c', text: 'כשלא משתפים אותי במה שקורה', seeks: { depth: 0.6, directness: 0.6 } },
            { id: 'd', text: 'השוואות לאחרים', seeks: { ego: -0.6, warmth: 0.5 } },
        ], { when: { id: 'r_jealousy', gte: 5 } }),
        choice('f_ego', 'מישהו אחר מקבל את הכבוד והכותרות. מה אני מרגיש?', [
            { id: 'a', text: 'מפרגן באמת, שמח בשמחתו', self: { ego: -0.8, warmth: 0.4 } },
            { id: 'b', text: 'קצת קנאה, אבל מסתדר', self: { ego: 0.7 } },
            { id: 'c', text: 'מרגיש צורך להראות מה אני שווה', self: { ego: 1, ambition: 0.5 } },
        ], { when: { id: 'r_ego', gte: 6 } }),
        choice('f_sens', 'מה קורה כשאני נפגע?', [
            { id: 'a', text: 'אומר מיד', self: { directness: 1 } },
            { id: 'b', text: 'שותק ונסגר', self: { directness: -1, sensitivity: 0.5 } },
            { id: 'c', text: 'מצפה שיבינו בלי שאסביר', self: { sensitivity: 1, directness: -0.8 } },
            { id: 'd', text: 'מעבד לבד ואז מספר', self: { depth: 0.7, independence: 0.5 } },
        ], { when: { id: 'r_sensitivity', gte: 6 } }),
        choice('f_indep', 'כמה זמן לבד אני צריך בשבוע?', [
            { id: 'a', text: 'כמה שעות', self: { independence: 0.3 } },
            { id: 'b', text: 'ערב או שניים', self: { independence: 0.8 } },
            { id: 'c', text: 'כמה ערבים, ואני זקוק להם באמת', self: { independence: 1, sociability: -0.4 } },
        ], { when: { id: 'r_independence', gte: 6 } }),
        choice('f_amb', 'הקריירה דורשת הרבה זמן על חשבון הבית. מה אני עושה?', [
            { id: 'a', text: 'המשפחה קודמת - אצמצם', self: { family: 1, ambition: -0.4 } },
            { id: 'b', text: 'אחפש איזון, גם אם זה יקר', self: { flexibility: 0.5, order: 0.4 } },
            { id: 'c', text: 'זה חלק מהייעוד שלי, והצד השני צריך להבין', self: { ambition: 1, family: -0.4 } },
        ], { when: { id: 'r_ambition', gte: 6 } }),
        choice('f_dir', 'אמרתי משהו חד ופגעתי. מה אני עושה?', [
            { id: 'a', text: 'מתנצל מיד', self: { flexibility: 0.8, sensitivity: 0.3 } },
            { id: 'b', text: 'עומד על כך שזו האמת', self: { directness: 1, flexibility: -0.6 } },
            { id: 'c', text: 'מנסה לרכך אחר כך בחום', self: { warmth: 0.6 } },
        ], { when: { id: 'r_directness', gte: 6 } }),
        choice('f_par', 'ההורים שלי לא אוהבים את <בן הזוג|בת הזוג>. מה אני עושה?', [
            { id: 'a', text: 'מקשיב להם - דעתם חשובה לי מאוד', self: { parents: 1 } },
            { id: 'b', text: 'מנסה לגשר ולהפגיש', self: { flexibility: 0.6, warmth: 0.3 } },
            { id: 'c', text: 'זו ההחלטה שלי', self: { parents: -1, independence: 0.6 } },
        ], { when: { id: 'r_parents', gte: 6 } }),
        choice('f_calm', 'כשאני סוער, מה מרגיע אותי?', [
            { id: 'a', text: 'שיחה עם <בן הזוג|בת הזוג>', seeks: { support: 1 }, self: { sensitivity: 0.4 } },
            { id: 'b', text: 'זמן לבד', self: { independence: 0.7 } },
            { id: 'c', text: 'פעילות, תפילה או ספורט', self: { depth: 0.4, calm: 0.3 } },
        ], { when: { id: 'r_calm', lte: 3 } }),
        choice('f_soc', 'אורחים בשבת - כל שבוע? מה אני אומר?', [
            { id: 'a', text: 'מצוין, זה הבית שאני רוצה', self: { sociability: 1, family: 0.4 } },
            { id: 'b', text: 'מדי פעם, לא כל שבוע', self: { sociability: 0.2 } },
            { id: 'c', text: 'מעדיף לרוב שקט משפחתי', self: { sociability: -1 } },
        ], { when: { id: 'r_sociability', gte: 6 } }),
    ],
};

const OPEN_COMMON: Question[] = [
    { id: 'o_best', kind: 'text', text: 'מה אנשים שמכירים אותי הכי טוב אומרים עליי?', placeholder: 'למשל: "תמיד {מקשיב|מקשיבה}", "{מצחיק|מצחיקה}", "{עקשן|עקשנית}"...' },
    { id: 'o_worst', kind: 'text', text: 'מה הצד הפחות נוח שלי, ש<בן הזוג|בת הזוג> צריך להכיר?', placeholder: 'כנות כאן שווה זהב' },
    { id: 'o_anger', kind: 'text', text: 'מה מכעיס אותי הכי מהר, ואיך אני מגיב?' },
    { id: 'o_perfect', kind: 'text', text: 'תארו יום שישי-שבת מושלם עם <בן הזוג|בת הזוג>' },
    { id: 'o_roles', kind: 'text', text: 'איך אני {מדמיין|מדמיינת} את חלוקת התפקידים בבית ובפרנסה?' },
    { id: 'o_learn', kind: 'text', text: 'מה למדתי על עצמי מקשרים קודמים?' },
    { id: 'o_need', kind: 'text', text: 'מה אני {צריך|צריכה} מ<בן הזוג|בת הזוג> שלא אמרתי עד היום?' },
];

// ───────────── בנק גברים: מה מרתיע / מושך אצל אישה ─────────────

const M_BOTHER: QuizSection = {
    id: 'turnoffs', icon: '🚫', title: 'מה מוריד לי את החשק',
    intro: 'דמיינו אישה שמתנהגת כך. כמה זה מפריע לכם? (1 = לא מפריע בכלל, 5 = מרתיע עד כדי סיום). הציון 1-2 נחשב ניטרלי.',
    scale: { low: 'לא מפריע', high: 'מרתיע מאוד' },
    questions: [
        bother('bm_selftalk', 'מדברת בעיקר על עצמה ועל מה שהשיגה או קנתה', { ego: 1 }),
        bother('bm_praise', 'זקוקה להערכה ולמחמאות כל הזמן', { ego: 0.7, jealousy: 0.5 }),
        bother('bm_critic', 'מבקרת אותי מול משפחה וחברים', { support: -1, directness: 0.5 }),
        bother('bm_change', 'מנסה לשנות אותי ולעצב אותי מחדש', { dominance: 1, flexibility: -0.6 }),
        bother('bm_boss', 'מחליטה על הכול בבית, כמעט בלי לשאול', { dominance: 1 }),
        bother('bm_passive', 'פסיבית - אין לה דעה, תמיד "מה שתרצה"', { dominance: -1 }),
        bother('bm_cry', 'רגשנית מאוד - בוכה ונפגעת מדברים קטנים', { sensitivity: 1, calm: -0.6 }),
        bother('bm_vent', 'מתלוננת בלי סוף על בעיות ולא מחפשת פתרון', { calm: -1 }),
        bother('bm_silent', 'שותקת כשהיא כועסת ומצפה שאנחש מה קרה', { directness: -1 }),
        bother('bm_blunt', 'ישירה עד כאב - אומרת מה שחושבת בלי ריפוד', { directness: 1, sensitivity: -0.4 }),
        bother('bm_jealous', 'קנאית ובודקת איפה אני ועם מי', { jealousy: 1, independence: -0.7 }),
        bother('bm_cold', 'מאופקת, לא משתפת ברגשות ולא מחבקת', { warmth: -1 }),
        bother('bm_spend', 'מוציאה הרבה כסף על קניות ובילויים', { provider: -1, order: -0.4 }),
        bother('bm_cheap', 'חסכנית ומחושבת עד כדי קמצנות', { generosity: -1 }),
        bother('bm_neg', 'ממורמרת ושלילית - רואה בכל דבר את הרע', { humor: -1 }),
        bother('bm_light', 'קלילה ולא רצינית - הכול בצחוק, גם עניינים חשובים', { depth: -1 }),
        bother('bm_career', 'מקדישה את רוב זמנה לקריירה, והבית בצד', { family: -1, ambition: 0.5 }),
        bother('bm_noambition', 'ללא שאיפות או רצון להתפתח', { ambition: -1 }),
        bother('bm_mother', 'קשורה מאוד להורים ומתייעצת איתם על כל החלטה', { parents: 1 }),
        bother('bm_routine', 'מתקשה בשינוי ונאחזת בשגרה', { spontaneity: -1, flexibility: -0.5 }),
        bother('bm_messy', 'לא מסודרת, בלגן ואי-ארגון בבית', { order: -1 }),
        bother('bm_late', 'מאחרת באופן קבוע ולא מתנצלת', { order: -1 }),
        bother('bm_friends', 'עסוקה בחברות ובחוץ, פחות בבית', { sociability: 1, family: -0.4 }),
        bother('bm_romance', 'מצפה לרומנטיקה ולמחוות גדולות כל הזמן', { romance: 1 }),
        bother('bm_hermit', 'לא אוהבת לצאת, להתארח או לארח', { sociability: -1 }),
    ],
};

const M_ATTRACT: QuizSection = {
    id: 'attractions', icon: '🧲', title: 'מה מושך אותי',
    intro: 'כמה כל אחד מהדברים האלה מושך אתכם אצל אישה? (1 = לא מושך, 5 = מושך מאוד)',
    scale: { low: 'לא מושך', high: 'מושך מאוד' },
    questions: [
        attract('am_confident', 'בטוחה בעצמה ויודעת מה היא רוצה', { dominance: 0.6, ego: 0.3 }),
        attract('am_humble', 'צנועה ועדינה בהליכותיה', { ego: -0.8, sensitivity: 0.3 }),
        attract('am_funny', 'מצחיקה, עם חוש הומור', { humor: 1 }),
        attract('am_deep', 'עמוקה - אפשר לדבר איתה על אמונה ומשמעות', { depth: 1 }),
        attract('am_warm', 'חמה ורכה, מחבקת ומפרגנת', { warmth: 1 }),
        attract('am_listen', 'מקשיבה ומכילה כשקשה לי', { support: 1 }),
        attract('am_calm', 'יציבה ורגועה - לא נסערת מכל דבר', { calm: 1 }),
        attract('am_romantic', 'רומנטית, אוהבת הפתעות קטנות', { romance: 1 }),
        attract('am_ambitious', 'שאפתנית - עם חזון וקריירה משלה', { ambition: 1 }),
        attract('am_order', 'מסודרת ומנהלת בית באחריות', { order: 1 }),
        attract('am_mother', 'אמא חמה ומסורה שחולמת על משפחה', { family: 1, sociability: -0.2 }),
        attract('am_social', 'חברותית - אוהבת לארח ולארגן', { sociability: 1 }),
        attract('am_indep', 'עצמאית, עם עולם ותחומי עניין משלה', { independence: 1 }),
        attract('am_support', 'תומכת בלימוד או בעבודה שלי, נותנת עורף', { support: 1, flexibility: 0.3 }),
        attract('am_direct', 'ישירה וכנה - תמיד יודע איפה אני עומד', { directness: 1 }),
        attract('am_gentle', 'עדינה ומתחשבת בדברים שהיא אומרת', { directness: -1 }),
        attract('am_generous', 'נדיבה - נותנת בלב רחב', { generosity: 1 }),
        attract('am_flex', 'גמישה - מתאימה את עצמה בקלות', { flexibility: 1 }),
        attract('am_money', 'אחראית כלכלית, מתכננת ושומרת על תקציב', { provider: 1, order: 0.4 }),
        attract('am_adventure', 'הרפתקנית - אוהבת לטייל ולנסות דברים חדשים', { spontaneity: 1 }),
        attract('am_success', 'מצליחה ומוערכת בתחום שלה', { ego: 0.5, ambition: 0.8 }),
    ],
};

// ───────────── בנק נשים: מה מרתיע / מושך אצל גבר ─────────────

const F_BOTHER: QuizSection = {
    id: 'turnoffs', icon: '🚫', title: 'מה מוריד לי את החשק',
    intro: 'דמיינו גבר שמתנהג כך. כמה זה מפריע לכם? (1 = לא מפריע בכלל, 5 = מרתיע עד כדי סיום). הציון 1-2 נחשב ניטרלי.',
    scale: { low: 'לא מפריע', high: 'מרתיע מאוד' },
    questions: [
        bother('bf_selftalk', 'מדבר בעיקר על עצמו ועל ההישגים שלו', { ego: 1 }),
        bother('bf_boss', 'מחליט על הכול לבד ולא שואל', { dominance: 1 }),
        bother('bf_passive', 'לא לוקח יוזמה - צריך לדחוף אותו לכל דבר', { dominance: -1 }),
        bother('bf_rigid', 'לא מקשיב ולא מתפשר - "ככה זה וזהו"', { flexibility: -1 }),
        bother('bf_indecisive', 'מתלבט ולא מסוגל להחליט', { dominance: -0.8, calm: -0.4 }),
        bother('bf_closed', 'סגור, לא משתף ברגשות', { warmth: -1 }),
        bother('bf_emotional', 'רגשן מאוד - נפגע ונסגר בקלות', { sensitivity: 1 }),
        bother('bf_temper', 'מתפרץ בכעס', { calm: -1 }),
        bother('bf_avoid', 'מתחמק מקונפליקט ולא אומר מה מפריע לו', { directness: -1 }),
        bother('bf_blunt', 'קשוח - אומר דברים כואבים בלי ריפוד', { directness: 1, sensitivity: -0.4 }),
        bother('bf_jealous', 'קנאי ושואל איפה הייתי ועם מי', { jealousy: 1, independence: -0.6 }),
        bother('bf_clingy', 'צריך אותי כל הזמן ומתקשר בכל שעה', { independence: -1 }),
        bother('bf_friends', 'עסוק עם חברים ובחוץ, מעט זמן בבית', { sociability: 1, family: -0.5 }),
        bother('bf_career', 'שקוע בעבודה או בקריירה, והמשפחה בצד', { family: -1, ambition: 0.5 }),
        bother('bf_noambition', 'בלי שאיפות - מסתפק במה שיש', { ambition: -1 }),
        bother('bf_provider', 'לא דואג לפרנסה ולביטחון כלכלי', { provider: -1 }),
        bother('bf_cheap', 'קמצן - סופר כל שקל', { generosity: -1 }),
        bother('bf_spend', 'מבזבז בלי חשבון', { order: -0.6, provider: -0.7 }),
        bother('bf_home', 'לא עוזר בבית ומצפה שהכול יסתדר', { generosity: -0.8, support: -0.5 }),
        bother('bf_mother', 'קרוב מדי לאמא ושואל אותה על כל דבר', { parents: 1 }),
        bother('bf_routine', 'צפוי ושגרתי - אותו דבר כל יום', { spontaneity: -1 }),
        bother('bf_forget', 'שוכח ימי הולדת ומחוות קטנות', { romance: -1 }),
        bother('bf_sarcasm', 'ציני ועוקצני, גם בצחוק', { warmth: -1 }),
        bother('bf_serious', 'רציני מדי - בלי הומור', { humor: -1 }),
        bother('bf_late', 'מאחר ולא מסודר', { order: -1 }),
        bother('bf_shallow', 'שטחי - לא מתעניין בשיחות על משמעות ורגשות', { depth: -1 }),
        bother('bf_halfear', 'מקשיב בחצי אוזן כשאני מספרת על היום שלי', { support: -1 }),
    ],
};

const F_ATTRACT: QuizSection = {
    id: 'attractions', icon: '🧲', title: 'מה מושך אותי',
    intro: 'כמה כל אחד מהדברים האלה מושך אתכם אצל גבר? (1 = לא מושך, 5 = מושך מאוד)',
    scale: { low: 'לא מושך', high: 'מושך מאוד' },
    questions: [
        attract('af_lead', 'לוקח אחריות והובלה בבית ובחיים', { dominance: 1 }),
        attract('af_strong', 'חזק ויציב - סלע להישען עליו', { calm: 1 }),
        attract('af_listen', 'מקשיב ומכיל כשקשה לי', { support: 1 }),
        attract('af_open', 'פתוח רגשית ומשתף', { warmth: 0.7, sensitivity: 0.5 }),
        attract('af_funny', 'מצחיק - אפשר לצחוק איתו עד דמעות', { humor: 1 }),
        attract('af_deep', 'עמוק - שיחות על אמונה, משמעות ועולם', { depth: 1 }),
        attract('af_growth', 'מקדיש זמן קבוע ללימוד ולצמיחה רוחנית', { depth: 0.7 }),
        attract('af_provider', 'מפרנס יציב ואחראי כלכלית', { provider: 1 }),
        attract('af_ambitious', 'שאפתן, עם חזון', { ambition: 1 }),
        attract('af_father', 'אבא מסור, חולם על משפחה', { family: 1 }),
        attract('af_romantic', 'רומנטי - מחוות, מילים והפתעות', { romance: 1 }),
        attract('af_supportive', 'מפרגן לי להתקדם ולהצליח', { independence: 0.6, support: 0.6 }),
        attract('af_order', 'מסודר ומארגן', { order: 1 }),
        attract('af_social', 'חברותי - בית פתוח לאורחים', { sociability: 1 }),
        attract('af_humble', 'צנוע - לא מתהדר', { ego: -1 }),
        attract('af_success', 'מצליח ומוערך - אפשר להתגאות בו', { ego: 0.6, ambition: 0.6 }),
        attract('af_generous', 'נדיב - נותן בלב רחב', { generosity: 1 }),
        attract('af_direct', 'ישיר וכן', { directness: 1 }),
        attract('af_gentle', 'עדין ומתחשב', { directness: -1 }),
        attract('af_adventure', 'הרפתקן - יוזם טיולים ורעיונות', { spontaneity: 1 }),
        attract('af_flex', 'גמיש ופתוח לדעה שלי', { flexibility: 1 }),
        attract('af_praise', 'מביע הערכה ומחמאות בקול', { warmth: 0.8, romance: 0.4 }),
        attract('af_indep', 'עצמאי, עם עולם משלו', { independence: 1 }),
    ],
};

// ───────────── תרחישים ייעודיים לכל מגדר ─────────────

const M_SCENARIOS: Question[] = [
    choice('sm_vent', 'אשתך חוזרת מיום קשה ומתחילה לספר. מה אתה עושה?', [
        { id: 'a', text: 'מקשיב עד הסוף בלי להפריע ומחזק', self: { support: 1, warmth: 0.5 } },
        { id: 'b', text: 'מציע מיד פתרונות מעשיים', self: { support: -0.8, dominance: 0.6 } },
        { id: 'c', text: 'מנסה להצחיק כדי להפיג מתח', self: { humor: 1 } },
        { id: 'd', text: 'מתקשה - אני מתעייף ומחכה שזה יעבור', self: { support: -1, calm: -0.4 } },
    ]),
    choice('sm_career', 'היא רוצה להמשיך בקריירה גם אחרי שיהיו ילדים, וזה ידרוש ממך יותר בבית.', [
        { id: 'a', text: 'מצוין, מסתדרים ביחד', self: { flexibility: 1, independence: 0.3 }, seeks: { ambition: 0.6 } },
        { id: 'b', text: 'אני מעדיף שהיא תהיה יותר בבית', self: { family: 0.7, dominance: 0.8, flexibility: -0.6 }, seeks: { family: 0.8 } },
        { id: 'c', text: 'נדבר ונמצא פשרה - חשוב לי שהילדים לא יפסידו', self: { flexibility: 0.6, family: 0.6 } },
        { id: 'd', text: 'אשקיע יותר בפרנסה כדי שהיא תוכל לבחור', self: { provider: 1, generosity: 0.5 } },
    ]),
    choice('sm_earn', 'היא מרוויחה משמעותית יותר ממך.', [
        { id: 'a', text: 'גאה ושמח', self: { ego: -0.8, flexibility: 0.5 } },
        { id: 'b', text: 'מרגיש חוסר נוחות אבל מתמודד', self: { ego: 0.7 } },
        { id: 'c', text: 'קשה לי - אני צריך להיות המפרנס', self: { provider: 1, ego: 0.8, dominance: 0.5 } },
        { id: 'd', text: 'לא משנה, הכול משותף', self: { flexibility: 0.8, generosity: 0.3 } },
    ]),
    choice('sm_disagree', 'אשתך חולקת עליך בפומבי מול חברים.', [
        { id: 'a', text: 'מחייך ומדבר איתה אחר כך', self: { calm: 0.8, directness: -0.3 } },
        { id: 'b', text: 'עונה לה במקום', self: { directness: 0.8, ego: 0.6 } },
        { id: 'c', text: 'נעלב ושותק עד סוף הערב', self: { sensitivity: 1, directness: -0.5 } },
        { id: 'd', text: 'מוצא את זה משעשע, ואפילו מעורר כבוד', self: { humor: 0.6, ego: -0.5 } },
    ]),
    choice('sm_tired', 'חזרת מותש מהעבודה והיא רוצה לדבר.', [
        { id: 'a', text: 'מקשיב בכל זאת', self: { support: 0.8, generosity: 0.5 } },
        { id: 'b', text: 'מבקש חצי שעה לבד ואז מתפנה', self: { independence: 0.9, directness: 0.5 } },
        { id: 'c', text: 'מתקשה להתרכז, מהנהן ומחכה שזה ייגמר', self: { support: -0.6 } },
        { id: 'd', text: 'עושה מאמץ ויוצא איתה לטיול קצר', self: { romance: 0.7, warmth: 0.5 } },
    ]),
    choice('sm_miss', 'מה הכי היית רוצה לקבל מאשתך?', [
        { id: 'a', text: 'הערכה וכבוד', seeks: { warmth: 0.6, ego: 0.4 } },
        { id: 'b', text: 'שתהיה יציבה ורגועה', seeks: { calm: 1 } },
        { id: 'c', text: 'שתמלא את הבית בשמחה', seeks: { humor: 0.8, warmth: 0.4 } },
        { id: 'd', text: 'שתעזור לי לצמוח ולהתקדם', seeks: { ambition: 0.6, support: 0.6 } },
    ]),
];

const F_SCENARIOS: Question[] = [
    choice('sf_vent', 'חזרתי מיום קשה. מה הכי הייתי רוצה שבעלי יעשה?', [
        { id: 'a', text: 'יקשיב עד הסוף בלי להתערב', seeks: { support: 1 } },
        { id: 'b', text: 'ייתן פתרון מעשי', seeks: { support: -0.6, dominance: 0.5 } },
        { id: 'c', text: 'יחבק וישתוק', seeks: { warmth: 1 } },
        { id: 'd', text: 'יצחיק אותי', seeks: { humor: 1 } },
    ]),
    choice('sf_decide', 'צריך להחליט על דירה או עבודה. איך זה עובד אצלכם?', [
        { id: 'a', text: 'הוא מחליט, אני סומכת עליו', self: { dominance: -0.7, flexibility: 0.5 }, seeks: { dominance: 0.8 } },
        { id: 'b', text: 'מחליטים ביחד אחרי שיחה ארוכה', self: { flexibility: 0.6, depth: 0.4 } },
        { id: 'c', text: 'אני מחליטה והוא מסכים', self: { dominance: 1 }, seeks: { dominance: -0.6 } },
        { id: 'd', text: 'כל אחד מציג עמדה ומתפשרים באמצע', self: { directness: 0.6, flexibility: 0.3 } },
    ]),
    choice('sf_mom', 'הוא מתייעץ עם אמא שלו לפני החלטה גדולה.', [
        { id: 'a', text: 'חמוד - זה מראה כבוד להוריו', self: { parents: 0.8 } },
        { id: 'b', text: 'מפריע לי - שיחליט איתי', self: { parents: -1, jealousy: 0.4 } },
        { id: 'c', text: 'בסדר, כל עוד ההחלטה הסופית שלנו', self: { flexibility: 0.4, independence: 0.3 } },
        { id: 'd', text: 'גם אני מתייעצת עם אמא שלי', self: { parents: 1 } },
    ]),
    choice('sf_distance', 'הוא מקבל הצעת עבודה מצוינת בעיר רחוקה.', [
        { id: 'a', text: 'עוברת איתו, ביחד', self: { flexibility: 1, family: 0.5 } },
        { id: 'b', text: 'מעדיפה להישאר - הקריירה, המשפחה והחברות שלי כאן', self: { independence: 0.8, parents: 0.5 } },
        { id: 'c', text: 'מבקשת לדון בזה ולהגיע לפשרה', self: { directness: 0.7, flexibility: 0.4 } },
    ]),
    choice('sf_miss', 'מה הכי היית רוצה לקבל מבעלך?', [
        { id: 'a', text: 'שיקשיב באמת', seeks: { support: 1 } },
        { id: 'b', text: 'ביטחון כלכלי', seeks: { provider: 1 } },
        { id: 'c', text: 'שיעריך ויפרגן', seeks: { warmth: 0.8, ego: -0.2 } },
        { id: 'd', text: 'שייקח יוזמה ויוביל', seeks: { dominance: 0.9 } },
    ]),
    choice('sf_anxiety', 'אני מודאגת ולחוצה לגבי משהו. איך הכי נכון שהוא יגיב?', [
        { id: 'a', text: 'יישאר רגוע ויחזיק את הדברים', seeks: { calm: 1 }, self: { sensitivity: 0.5 } },
        { id: 'b', text: 'יתעניין וישאל שאלות עד שאפתח', seeks: { support: 0.9, depth: 0.4 } },
        { id: 'c', text: 'ייתן לי מקום ויחזור אחר כך', seeks: { independence: 0.7 }, self: { independence: 0.6 } },
        { id: 'd', text: 'יפתור לי את הבעיה', seeks: { dominance: 0.7, provider: 0.4 } },
    ]),
];

const OPEN_M: Question = { id: 'om_need', kind: 'text', text: 'מה אישה צריכה להבין עליי כדי שאהיה רגוע בקשר?' };
const OPEN_F: Question = { id: 'of_need', kind: 'text', text: 'מה גבר צריך להבין עליי כדי שארגיש בטוחה בקשר?' };

/** הרכבת השאלון לפי מגדר הנשאל/ת. שאלות המשך (when) מסוננות בשלב ההצגה. */
export function buildSections(g: G): QuizSection[] {
    return [
        SELF_RATINGS,
        PARTNER_RATINGS,
        g === 'm' ? M_BOTHER : F_BOTHER,
        g === 'm' ? M_ATTRACT : F_ATTRACT,
        {
            id: 'scenarios', icon: '🎭', title: 'מה הייתי עושה',
            intro: 'בחרו את האפשרות הקרובה יותר אליכם - לא את זו שנשמעת יפה. אין תשובה נכונה.',
            questions: [...SCENARIOS_COMMON, ...(g === 'm' ? M_SCENARIOS : F_SCENARIOS)],
        },
        DILEMMAS,
        VALUES,
        FOLLOWUPS,
        {
            id: 'open', icon: '✍️', title: 'במילים שלי',
            intro: 'כמה מילים בלבד. אפשר לדלג על מה שלא נוח - אבל כל משפט משפר את ההתאמה.',
            questions: [...OPEN_COMMON, g === 'm' ? OPEN_M : OPEN_F],
        },
    ];
}
