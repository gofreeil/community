// ============================================================
// neighborhoodState.svelte.ts - מצב שכונה גלובלי ומשותף
//
// קורא מ-localStorage, נכתב בכל שינוי.
// כל הרכיבים שמייבאים את neighborhoodState מקבלים
// עדכון ריאקטיבי אוטומטי.
// ============================================================

import { LS_KEY, DEFAULT_NEIGHBORHOOD } from './neighborhoodsData';
import { browser } from '$app/environment';

const DEFAULT_CITY = 'ירושלים';

class NeighborhoodState {
    neighborhood = $state(DEFAULT_NEIGHBORHOOD);
    city         = $state(DEFAULT_CITY);

    /** האם המשתמש מחובר. נקבע ב-+layout לפי הסשן (מקור אמת יחיד). */
    isLoggedIn = $state(false);

    /** דגל תצוגה: אורח בחר שכונה → מציגים נדנוד להרשמה. */
    showRegisterNudge = $state(false);

    /** דגל תצוגה: הבחירה נשמרה לפרופיל של משתמש מחובר → הודעה קצרה (לא פעולה שקטה). */
    savedToProfile = $state<{ neighborhood: string; city: string } | null>(null);

    // ננעל אחרי שנקבעה שכונה סמכותית (פרופיל) או אחרי בחירה מפורשת בסשן,
    // כדי ש-init חוזר בניווט פנימי לא ידרוס את הבחירה.
    private _locked = false;

    // האם לפרופיל בשרת כבר יש עיר. כל עוד אין - בחירת שכונה באתר נשמרת גם לפרופיל,
    // כדי שהנתון יתקיים גם מעבר לדפדפן הזה (רוב המשתמשים נרשמו בלי עיר/שכונה).
    // null = עדיין לא ידוע (לפני שה-layout דיווח).
    private _profileHasCity: boolean | null = null;
    private _syncInFlight = false;

    /** נקבע מ-+layout לפי data.session בכל עמוד. */
    setLoggedIn(v: boolean) {
        this.isLoggedIn = v;
    }

    // בחירה מפורשת (select / שחזור מ-localStorage) - להבדיל מברירת המחדל (קרית משה),
    // שאותה לעולם לא כותבים לפרופיל.
    private _explicitChoice = false;

    /** נקבע מ-+layout לפי פרופיל המשתמש (layoutUser.city). */
    setProfileCity(city: string | null | undefined) {
        this._profileHasCity = !!city?.trim();
        // ה-init של המפה/הלוחות רץ לפני ה-effect של ה-layout: אם כבר שוחזרה בחירה
        // מקומית ועכשיו התברר שלפרופיל אין עיר - מסנכרנים עכשיו (רטרואקטיבי).
        if (this._profileHasCity === false && this._explicitChoice) this._syncToProfile();
    }

    /**
     * שמירת הבחירה הנוכחית לפרופיל בשרת - רק למשתמש מחובר שלפרופיל שלו אין עיר.
     * best-effort: כשל רשת לא משנה כלום בממשק. בהצלחה מוצגת הודעה (savedToProfile).
     */
    private _syncToProfile() {
        if (!browser || !this.isLoggedIn || this._profileHasCity !== false || this._syncInFlight) return;
        const city = this.city?.trim();
        const neighborhood = this.neighborhood?.trim();
        if (!city) return;
        this._syncInFlight = true;
        fetch('/api/profile/upgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city, neighborhood }),
        })
            .then(async (res) => {
                const j = await res.json().catch(() => ({}));
                if (res.ok && j?.ok) {
                    this._profileHasCity = true;
                    this.savedToProfile = { neighborhood, city };
                }
            })
            .catch(() => { /* ננסה שוב בבחירה הבאה */ })
            .finally(() => { this._syncInFlight = false; });
    }

    /** סגירת ההודעה "נשמר בפרופיל". */
    dismissSavedNotice() {
        this.savedToProfile = null;
    }

    /**
     * אתחל מ-localStorage, עם עדיפות לנתוני הפרופיל מהשרת.
     * קרא ב-onMount של כל דף שמשתמש בשכונה.
     */
    init(userNeighborhood?: string | null, userCity?: string | null) {
        if (!browser) return;

        // עדיפות עליונה: פרופיל משתמש מחובר (DB). מספיק *עיר* כדי לפתוח את האזור שלו.
        // ביישובים עם שכונה אחת בלבד (כמו כפר תפוח) השכונה לא תמיד נשמרת,
        // ואסור שבמקרה כזה המפה תיפול חזרה לברירת המחדל (קרית משה).
        if (userCity?.trim()) {
            this.city         = userCity.trim();
            this.neighborhood = userNeighborhood?.trim() || 'מרכז';
            this._locked      = true;
            this._profileHasCity = true;
            this._save();
            return;
        }

        // בחירה שכבר נעשתה בסשן הנוכחי — לא לדרוס בניווט פנימי.
        if (this._locked) return;

        // אורח (לא מחובר): תמיד ברירת המחדל (קרית משה, ירושלים) — לא קוראים
        // מ-localStorage בכוונה, כדי לתמרץ הרשמה. ההעדפה נזכרת רק אחרי הרשמה.
        if (!this.isLoggedIn) {
            this.neighborhood = DEFAULT_NEIGHBORHOOD;
            this.city         = DEFAULT_CITY;
            return;
        }

        // מחובר בלי עיר בפרופיל → שחזר מהבחירה האחרונה שנשמרה מקומית.
        let restored = false;
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const saved = JSON.parse(raw) as { neighborhood?: string; city?: string };
                if (saved.neighborhood) this.neighborhood = saved.neighborhood;
                if (saved.city)       { this.city         = saved.city; restored = true; }
            }
        } catch {}
        // רטרואקטיבי: בחירה שכבר נעשתה בדפדפן הזה לפני שהתחלנו לשמור לפרופיל -
        // עולה לפרופיל עכשיו (רק אם ה-layout כבר דיווח שלפרופיל אין עיר).
        if (restored) { this._explicitChoice = true; this._syncToProfile(); }
    }

    /** בחר שכונה חדשה. מחובר → נשמר. אורח → נדנוד להרשמה (לא נשמר). */
    select(neighborhood: string, city: string) {
        this.neighborhood = neighborhood;
        this.city         = city;
        this._locked      = true;
        this._explicitChoice = true;

        if (this.isLoggedIn) {
            this._save();
            // לפרופיל אין עיר → הבחירה נשמרת גם בשרת (עם הודעה למשתמש)
            this._syncToProfile();
        } else {
            this.showRegisterNudge = true;
        }
    }

    /** סגירת הנדנוד ע"י המשתמש. */
    dismissNudge() {
        this.showRegisterNudge = false;
    }

    private _save() {
        if (!browser) return;
        try {
            localStorage.setItem(
                LS_KEY,
                JSON.stringify({ neighborhood: this.neighborhood, city: this.city }),
            );
        } catch {}
    }
}

export const neighborhoodState = new NeighborhoodState();
