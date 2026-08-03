// "שידוך" — חיבור שני כרטיסי פנויים ע"י שדכן מאושר, עם מעקב הסכמה דו-צדדי.
// נשמר כפריט category='singles_match' (קטגוריה חופשית, בלי שינוי סכמה בבאקאנד).
// כל הלוגיקה נגזרת מ-extra_fields — אין שדות חדשים ב-Strapi.
//
// זרימה:
//   proposed  → שני הצדדים קיבלו התראה, כל אחד עונה interested/declined
//   mutual    → שניהם interested → השדכן מקבל התראה לקדם קשר
//   closed    → צד אחד declined (או שהשדכן סגר)

import type { DbItem } from './db';

export const SINGLES_MATCH_CATEGORY = 'singles_match';

export type MatchResponse = 'pending' | 'interested' | 'declined';
export type MatchStage = 'proposed' | 'mutual' | 'closed';

export interface MatchSide {
    card_id: string;
    user_id: string;
    name: string;
    gender: 'male' | 'female';
    response: MatchResponse;
}

export interface MatchData {
    matchmaker_id: string;
    matchmaker_name: string;
    a: MatchSide;
    b: MatchSide;
    stage: MatchStage;
    created_at: string;
    updated_at?: string;
}

export function parseMatch(item: DbItem): MatchData | null {
    try {
        const ef = JSON.parse(item.extra_fields || '{}');
        if (!ef?.a?.card_id || !ef?.b?.card_id) return null;
        return ef as MatchData;
    } catch {
        return null;
    }
}

/** הצד של המשתמש בשידוך ('a'/'b'), או null אם אינו אחד הצדדים. */
export function sideOf(m: MatchData, userId: string): 'a' | 'b' | null {
    if (m.a.user_id && m.a.user_id === userId) return 'a';
    if (m.b.user_id && m.b.user_id === userId) return 'b';
    return null;
}

/** מפתח זוג בלתי-מסודר — לזיהוי כפילות שידוך (אותו זוג בכל סדר). */
export function pairKey(cardIdA: string, cardIdB: string): string {
    return [cardIdA, cardIdB].sort().join('__');
}
