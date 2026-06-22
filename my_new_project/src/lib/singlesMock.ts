// נתוני דמו ללוח פנויים/פנויות - יוחלף בנתונים אמיתיים מה-DB כשיהיו

export type Religiosity = 'haredi' | 'dl' | 'general';
export type Gender = 'male' | 'female';

export interface SingleProfile {
    id: string;
    nickname: string;
    label: string;
    gender: Gender;
    age: string;
    religiosity: Religiosity;
    city: string;
    description: string;
    lookingFor: string;
    inspiration: string;
    avatar: string;
    contact: string;
    phone: string;
}

// תמונות נוצרות דינמית ע"י DiceBear (SVG אנונימי, לא משויך לאדם אמיתי)
export function avatarUrl(seed: string, female: boolean): string {
    return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}` +
        (female
            ? '&hair=long,curly,bobCut,bobBangs,curlyBun,straightBun,pigtails,bunUndercut'
            : '&hair=shortCombover,shortComboverChops,buzzcut,fade,sideShave,curlyHighTop');
}

export const mockSingles: SingleProfile[] = [
    { id: '1', nickname: 'דודי',     label: 'פנוי, 28, ירושלים',   gender: 'male',   age: '28', religiosity: 'haredi',  city: 'ירושלים',   description: 'סטודנט למדעי המחשב, אוהב טיולים ומוזיקה.',           lookingFor: 'בת זוג רצינית, יראת שמיים, עם חוש הומור',  inspiration: '"איזהו עשיר? השמח בחלקו"',                  avatar: avatarUrl('Dudi-1',  false), contact: 'דוד',     phone: '050-1234567' },
    { id: '2', nickname: 'שרהל\'ה', label: 'פנויה, 25, ירושלים',  gender: 'female', age: '25', religiosity: 'haredi',  city: 'ירושלים',   description: 'מורה לאנגלית, אוהבת ספרים ובישול.',                  lookingFor: 'בן זוג ירא שמיים, רגיש וחכם, עם שאיפות',     inspiration: '"כל מה שעשה הקב"ה - לטובה עשה"',           avatar: avatarUrl('Sara-2',  true),  contact: 'שרה',     phone: '050-2345678' },
    { id: '3', nickname: 'יוסי',     label: 'פנוי, 31, בני ברק',   gender: 'male',   age: '31', religiosity: 'haredi',  city: 'בני ברק',   description: 'מהנדס תוכנה, בוגר ישיבה.',                            lookingFor: 'בת זוג עם ערכים, יראת שמיים, אכפתית',       inspiration: '"איזהו חכם? הלומד מכל אדם"',                avatar: avatarUrl('Yossi-3', false), contact: 'יוסף',    phone: '050-3456789' },
    { id: '4', nickname: 'רחלי',     label: 'פנויה, 24, רמת גן',   gender: 'female', age: '24', religiosity: 'dl',      city: 'רמת גן',    description: 'סטודנטית לעבודה סוציאלית, מתנדבת בארגון "לתת".',     lookingFor: 'בן זוג רציני, אוהב חסד, עם לב טוב',          inspiration: '"ואהבת לרעך כמוך"',                          avatar: avatarUrl('Racheli-4', true),  contact: 'רחל',     phone: '050-4567890' },
    { id: '5', nickname: 'מושיק',    label: 'פנוי, 29, ירושלים',   gender: 'male',   age: '29', religiosity: 'dl',      city: 'ירושלים',   description: 'עורך דין, אוהב ספורט ושיעורי תורה.',                  lookingFor: 'בת זוג עם חוש הומור, חכמה, רגישה',           inspiration: '"חזק ואמץ כי אתה תנחיל"',                    avatar: avatarUrl('Moshik-5', false), contact: 'משה',     phone: '050-5678901' },
    { id: '6', nickname: 'לאל\'ה',  label: 'פנויה, 27, פתח תקווה', gender: 'female', age: '27', religiosity: 'general', city: 'פתח תקווה', description: 'גרפיקאית, אוהבת אמנות ויצירה.',                       lookingFor: 'בן זוג עם חוש הומור, יצירתי, אוהב חיים',     inspiration: '"להאמין ולחלום ולא לוותר"',                  avatar: avatarUrl('Leah-6',   true),  contact: 'לאה',     phone: '050-6789012' },
    { id: '7', nickname: 'אברימי',  label: 'פנוי, 63, ירושלים',   gender: 'male',   age: '63', religiosity: 'dl',      city: 'ירושלים',   description: 'רואה חשבון בגמלאות, אוהב חסד ועזרה לזולת.',          lookingFor: 'בת זוג לבניין בית, חמה ואוהבת',              inspiration: '"בלי לוותר על אהבה - בכל גיל"',              avatar: avatarUrl('Avremi-7', false), contact: 'אברהם',  phone: '050-7890123' },
    { id: '8', nickname: 'מירי',     label: 'פנויה, 65, ירושלים',  gender: 'female', age: '65', religiosity: 'general', city: 'ירושלים',   description: 'אחות בדימוס, אוהבת טבע וטיולים.',                     lookingFor: 'בן זוג אמיתי, רגיש, אוהב חיים',              inspiration: '"זה הזמן להתחיל פרק חדש"',                   avatar: avatarUrl('Miri-8',   true),  contact: 'מרים',   phone: '050-8901234' },
];
