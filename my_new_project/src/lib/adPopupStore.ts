import { writable } from 'svelte/store';
import { ads, type Ad } from './adsData';

const STORAGE_KEY = 'ad_deck';

// ============================================================
// פרסומות משולמות בפופ-אפ הנייד
// ------------------------------------------------------------
// הטור הימני (RightAdBanner) הוא hidden lg:block, כלומר דסקטופ בלבד.
// לכן מפרסם ששילם לא הופיע בנייד בכלל - למרות שהבילדר מראה לו בשלב 7
// "כך הפרסומת תיפתח בנייד". כאן הן נכנסות לאותה חפיסה של פרסומות
// הרשת, כדי שמה שהובטח למפרסם יקרה גם במסך קטן.
// ============================================================
let paidAds: Ad[] = [];

/** נקרא מה-layout עם הפרסומות המאושרות שהשרת החזיר */
export function registerPaidAds(list: Ad[]): void {
    paidAds = list.filter(a => a.title && a.image && a.href);
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getFullAds(): Ad[] {
    // המשולמות קודם ברשימה; הערבוב עדיין קובע את הסדר בפועל
    return [...paidAds, ...ads.filter(a => a.title && a.description && a.image && a.href)];
}

// טוען או יוצר חפיסה מ-localStorage
function loadDeck(): { deck: string[]; pos: number } {
    if (typeof window === 'undefined') return { deck: [], pos: 0 };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw) as { deck: unknown[]; pos: number };
            if (Array.isArray(saved.deck) && saved.deck.length > 0 && saved.pos < saved.deck.length) {
                // חפיסות ישנות נשמרו עם מזהים מספריים; מזהה של פרסומת משולמת
                // הוא מחרוזת, ולכן משווים תמיד כמחרוזת
                return { deck: saved.deck.map(String), pos: saved.pos };
            }
        }
    } catch {}

    return buildNewDeck();
}

// בונה חפיסה חדשה מעורבבת ושומר ב-localStorage
function buildNewDeck(): { deck: string[]; pos: number } {
    const fullAds = getFullAds();
    const deck = shuffle(fullAds.map(a => String(a.id)));
    const state = { deck, pos: 0 };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    return state;
}

function saveDeckState(deck: string[], pos: number) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ deck, pos })); } catch {}
}

function getNextFullAd(): Ad | null {
    const fullAds = getFullAds();
    if (!fullAds.length) return null;

    let { deck, pos } = loadDeck();

    // סיבוב נגמר → חפיסה חדשה. גם חפיסה שנשמרה לפני שהמפרסם אושר לא
    // מכילה אותו, ולכן בונים מחדש כשהמספרים כבר לא תואמים.
    if (pos >= deck.length || deck.length !== fullAds.length) {
        ({ deck, pos } = buildNewDeck());
    }

    const id = deck[pos];
    const ad = fullAds.find(a => String(a.id) === id) ?? fullAds[0];

    saveDeckState(deck, pos + 1);
    return ad;
}

export const adPopup = writable<{ ad: Ad; pendingHref?: string } | null>(null);

export function triggerAdPopup(pendingHref?: string): boolean {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) return false;
    const ad = getNextFullAd();
    if (!ad) return false;
    adPopup.set({ ad, pendingHref });
    return true;
}

export function closeAdPopup() {
    adPopup.set(null);
}
