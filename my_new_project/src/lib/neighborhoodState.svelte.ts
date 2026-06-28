// ============================================================
// neighborhoodState.svelte.ts - מצב שכונה גלובלי ומשותף
//
// קורא מ-localStorage, נכתב בכל שינוי.
// כל הרכיבים שמייבאים את neighborhoodState מקבלים
// עדכון ריאקטיבי אוטומטי.
// ============================================================

import { LS_KEY, DEFAULT_NEIGHBORHOOD } from './neighborhoodsData';
import { browser } from '$app/environment';

class NeighborhoodState {
    neighborhood = $state(DEFAULT_NEIGHBORHOOD);
    city         = $state('ירושלים');

    /**
     * אתחל מ-localStorage, עם עדיפות לנתוני הפרופיל מהשרת.
     * קרא ב-onMount של כל דף שמשתמש בשכונה.
     */
    init(userNeighborhood?: string | null, userCity?: string | null) {
        if (!browser) return;

        // עדיפות: פרופיל משתמש (DB) > localStorage > default
        // חשוב: מספיק שיש למשתמש *עיר* כדי לפתוח לו את האזור שלו.
        // ביישובים עם שכונה אחת בלבד (כמו כפר תפוח) השכונה לא תמיד נשמרת,
        // ואסור שבמקרה כזה המפה תיפול חזרה לברירת המחדל (קרית משה).
        if (userCity?.trim()) {
            this.city         = userCity.trim();
            this.neighborhood = userNeighborhood?.trim() || 'מרכז';
            this._save();
            return;
        }

        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const saved = JSON.parse(raw) as { neighborhood?: string; city?: string };
                if (saved.neighborhood) this.neighborhood = saved.neighborhood;
                if (saved.city)         this.city         = saved.city;
            }
        } catch {}
    }

    /** בחר שכונה חדשה ושמור ב-localStorage */
    select(neighborhood: string, city: string) {
        this.neighborhood = neighborhood;
        this.city         = city;
        this._save();
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
