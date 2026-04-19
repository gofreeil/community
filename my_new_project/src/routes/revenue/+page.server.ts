import type { PageServerLoad } from './$types';
import { strapiGet } from '$lib/server/strapiClient';

// ערכי ברירת מחדל — משמשים כ-fallback אם אין רשומה ב-Strapi
const DEFAULT_STATS = [
    { num: '8',   lbl: 'ערוצי הכנסה' },
    { num: '35%', lbl: 'עלויות תפעול' },
    { num: '65%', lbl: 'רווח נקי לחלוקה' },
];

const DEFAULT_CHANNELS = [
    { icon: '📣', bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', title: 'פרסומות ממומנות', desc: 'עסקים מקומיים מפרסמים שירותים לתושבי השכונה במחיר הוגן.', tag: 'ערוץ ראשי' },
    { icon: '🤝', bg: 'rgba(16,185,129,0.15)',  color: '#34d399', title: 'עמלת שירותים',    desc: 'עמלה קטנה על השארת פרטים לבעלי מקצוע בשכונה.', tag: 'עמלה' },
    { icon: '🎫', bg: 'rgba(234,179,8,0.15)',   color: '#facc15', title: 'כרטיסים לאירועים', desc: 'מכירת כרטיסים לאירועים שכונתיים — הרצאות, מופעים, סיורים.', tag: 'עמלה' },
    { icon: '🏠', bg: 'rgba(236,72,153,0.15)',  color: '#f472b6', title: 'השכרת צימרים',    desc: 'קומיסיון על השכרות קצרות טווח שמתאמים דרך הפלטפורמה.', tag: 'עמלה' },
    { icon: '👶', bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa', title: 'בייביסיטינג',     desc: 'התאמת שמרטפים למשפחות — עמלת תיווך לכל שיבוץ.', tag: 'עמלה' },
    { icon: '🎓', bg: 'rgba(249,115,22,0.15)',  color: '#fb923c', title: 'חוגים ושיעורים',  desc: 'פלטפורמה לרישום לחוגים בשכונה — עמלה קטנה על כל רישום.', tag: 'עמלה' },
    { icon: '🚗', bg: 'rgba(14,165,233,0.15)',  color: '#38bdf8', title: 'טרמפים משותפים',  desc: 'תמורה סמלית על ארגון נסיעות משותפות — חוסך ומקרב.', tag: 'סמלי' },
    { icon: '⭐', bg: 'rgba(244,63,94,0.15)',   color: '#fb7185', title: 'חבילות Premium',  desc: 'מנוי פרימיום לעסקים: בולטות, דוחות, כלי ניהול מתקדמים.', tag: 'מנוי' },
];

const DEFAULT_COSTS = [
    { name: 'תפעול טכני (שרתים, דומיין, API)', pct: '12%' },
    { name: 'פיתוח ותחזוקה שוטפת',             pct: '10%' },
    { name: 'שיווק ותמיכה',                      pct: '8%'  },
    { name: 'משפטי, חשבונאות ומיסוי',           pct: '5%'  },
];

const DEFAULT_DISTRIBUTION = [
    { emoji: '🏛️', pct: '50%', title: 'בעלי הפלטפורמה', desc: 'תמורה על ההשקעה, הסיכון וההובלה של המיזם לאורך זמן.', from: '#1e3a8a', to: '#3b82f6' },
    { emoji: '❤️',  pct: '20%', title: 'צדקה ונזקקים',  desc: 'חלק קבוע שיוצא לפעילות חברתית ולסיוע למשפחות בשכונה.', from: '#064e3b', to: '#10b981' },
    { emoji: '👥',  pct: '30%', title: 'רכזי השכונות',  desc: 'תגמול למי שמפעילים בפועל את הקהילה ומייצרים פעילות בשטח.', from: '#78350f', to: '#f59e0b' },
];

const DEFAULT_FLOW = [
    { ico: '💳', t: 'הכנסה גולמית',  s: '100%',          border: 'rgba(124,58,237,0.3)'  },
    { ico: '⚙️',  t: 'עלויות תפעול', s: '35%',           border: 'rgba(239,68,68,0.3)'   },
    { ico: '💰', t: 'רווח נקי',      s: '65%',           border: 'rgba(250,204,21,0.4)'  },
    { ico: '🤲', t: 'חלוקה',         s: 'לשלושה גורמים', border: 'rgba(16,185,129,0.4)'  },
];

export const load: PageServerLoad = async () => {
    let cfg: Record<string, unknown> = {};
    try {
        const res = await strapiGet<{ data: Record<string, unknown> }>('/api/revenue-config');
        cfg = (res.data ?? res) as Record<string, unknown>;
    } catch {
        // fallback — Strapi לא נגיש או הרשומה לא קיימת
    }

    return {
        hero_title:   (cfg.hero_title   as string) || 'איך הקהילה מייצרת ערך — ומחזירה אותו לחברים',
        hero_subtitle:(cfg.hero_subtitle as string) || 'מודל כלכלי חברתי שקוף שבו כל שקל שנכנס מתחלק בין הקהילה, הבעלים, ורכזי השכונות - כולם נהנים ומרוויחים',
        stats:        (cfg.stats        as typeof DEFAULT_STATS)        || DEFAULT_STATS,
        channels:     (cfg.channels     as typeof DEFAULT_CHANNELS)     || DEFAULT_CHANNELS,
        costs:        (cfg.costs        as typeof DEFAULT_COSTS)        || DEFAULT_COSTS,
        distribution: (cfg.distribution as typeof DEFAULT_DISTRIBUTION) || DEFAULT_DISTRIBUTION,
        flow_nodes:   (cfg.flow_nodes   as typeof DEFAULT_FLOW)         || DEFAULT_FLOW,
    };
};
