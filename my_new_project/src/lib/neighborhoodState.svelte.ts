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

    // ננעל אחרי שנקבעה שכונה סמכותית (פרופיל) או אחרי בחירה מפורשת בסשן,
    // כדי ש-init חוזר בניווט פנימי לא ידרוס את הבחירה.
    private _locked = false;

    /** נקבע מ-+layout לפי data.session בכל עמוד. */
    setLoggedIn(v: boolean) {
        this.isLoggedIn = v;
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
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const saved = JSON.parse(raw) as { neighborhood?: string; city?: string };
                if (saved.neighborhood) this.neighborhood = saved.neighborhood;
                if (saved.city)         this.city         = saved.city;
            }
        } catch {}
    }

    /** בחר שכונה חדשה. מחובר → נשמר. אורח → נדנוד להרשמה (לא נשמר). */
    select(neighborhood: string, city: string) {
        this.neighborhood = neighborhood;
        this.city         = city;
        this._locked      = true;

        if (this.isLoggedIn) {
            this._save();
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
