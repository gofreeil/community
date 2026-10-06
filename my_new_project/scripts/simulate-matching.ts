// סימולציית כיול למנוע ההתאמה (src/lib/singlesMatching.ts).
// מייצרת אוכלוסייה אקראית שעונה על השאלון האמיתי, ומדפיסה את התפלגות הציונים - כדי שנדע ש-50 = זוג רגיל
// ו-85+ נדיר. מריצים כך:
//   npx esbuild scripts/simulate-matching.ts --bundle --platform=node --format=esm --outfile=.sim/sim.mjs && node .sim/sim.mjs

import { buildSections } from '../src/lib/singlesQuestionnaireData';
import { computeProfile, type Answers, type G } from '../src/lib/singlesQuestionnaire';
import { scoreMatch, type MatchCandidate } from '../src/lib/singlesMatching';

// מחולל פסאודו-אקראי עם זרע קבוע - שהתוצאות יהיו ניתנות לשחזור
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const pickOne = <T>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];

function randomAnswers(g: G): Answers {
    const a: Answers = {};
    for (const s of buildSections(g)) {
        for (const q of s.questions) {
            if (q.g && q.g !== g) continue;
            if (q.kind === 'rate') a[q.id] = Math.max(1, Math.min(7, Math.round(4.6 + 1.5 * gauss())));
            else if (q.kind === 'react') a[q.id] = Math.max(1, Math.min(5, Math.round(2.8 + 1.4 * gauss())));
            else if (q.kind === 'choice') a[q.id] = pickOne(q.options).id;
            else if (q.kind === 'pick') {
                const ids = q.options.map((o) => o.id).sort(() => rnd() - 0.5);
                a[q.id] = ids.slice(0, q.max);
            }
        }
    }
    return a;
}

function person(i: number, g: G): MatchCandidate {
    const answers = randomAnswers(g);
    return {
        id: `${g}${i}`, g,
        age: Math.round(24 + 10 * rnd()),
        sector: pickOne([1, 2, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5]),
        sectorLabel: '',
        city: pickOne(['ירושלים', 'ירושלים', 'בית שמש', 'תל אביב']),
        smoker: rnd() < 0.08,
        marital: rnd() < 0.85 ? 'single' : 'previously',
        profile: computeProfile(g, answers),
    };
}

const N = 200;
const men = Array.from({ length: N }, (_, i) => person(i, 'm'));
const women = Array.from({ length: N }, (_, i) => person(i, 'f'));

const scores: number[] = [];
const sameSector: number[] = [];
const raws: number[] = [];
for (const m of men) {
    for (const w of women) {
        if (m.age !== null && w.age !== null && Math.abs(m.age - w.age) > 5) continue;
        const sc = scoreMatch(m, w).score;
        scores.push(sc);
        if (m.sector === w.sector) sameSector.push(sc);
    }
}
sameSector.sort((a, b) => a - b);
console.log('אותו מגזר בלבד: חציון', sameSector[Math.floor(sameSector.length / 2)], '| p90', sameSector[Math.floor(sameSector.length * 0.9)], '| p99', sameSector[Math.floor(sameSector.length * 0.99)]);
scores.sort((a, b) => a - b);
const q = (p: number) => scores[Math.min(scores.length - 1, Math.floor(p * scores.length))];
console.log(`זוגות: ${scores.length}`);
console.log(`ממוצע ${(scores.reduce((s, x) => s + x, 0) / scores.length).toFixed(1)} | p10 ${q(0.1)} | p25 ${q(0.25)} | חציון ${q(0.5)} | p75 ${q(0.75)} | p90 ${q(0.9)} | p99 ${q(0.99)} | מקס ${scores[scores.length - 1]}`);

// היסטוגרמה
const bins = new Array(10).fill(0);
for (const s of scores) bins[Math.min(9, Math.floor((s - 1) / 10))]++;
bins.forEach((c, i) => console.log(`${String(i * 10 + 1).padStart(3)}-${String(i * 10 + 10).padEnd(3)} ${'#'.repeat(Math.round((c / scores.length) * 100))} ${((c / scores.length) * 100).toFixed(1)}%`));

// "הזוג המושלם": כל אחד מחפש בדיוק את מה שהשני, ואופי דומה
function mirrorPair(): [MatchCandidate, MatchCandidate] {
    const m = person(9001, 'm'), w = person(9002, 'f');
    for (const t of Object.keys(m.profile!.self) as (keyof typeof m.profile.self)[]) {
        const v = m.profile!.self[t]!;
        w.profile!.self[t] = Math.max(0, Math.min(100, v + Math.round(6 * gauss())));
    }
    m.profile!.seeks = { ...w.profile!.self };
    w.profile!.seeks = { ...m.profile!.self };
    m.profile!.values = w.profile!.values = ['trust', 'family', 'respect', 'humor', 'peace'];
    m.profile!.redFlags = []; w.profile!.redFlags = [];
    m.profile!.conflictStyle = 'cooling'; w.profile!.conflictStyle = 'direct';
    m.profile!.attachment = 'secure'; w.profile!.attachment = 'secure';
    m.age = 30; w.age = 28; m.sector = w.sector = 4; m.city = w.city = 'ירושלים';
    m.profile!.quality = w.profile!.quality = { answered: 80, total: 90, straightlining: false, flattering: false };
    return [m, w];
}
const [pm, pw] = mirrorPair();
const perfect = scoreMatch(pm, pw);
console.log(`\nזוג "מושלם": ${perfect.score} (${perfect.tierLabel}) | חלקים: ${perfect.parts.map((p) => `${p.key}=${p.score}`).join(' ')}`);

// הפוכים לגמרי
const [om, ow] = mirrorPair();
for (const t of Object.keys(ow.profile!.self) as (keyof typeof ow.profile.self)[]) ow.profile!.self[t] = 100 - ow.profile!.self[t]!;
om.profile!.seeks = { ...om.profile!.self };
ow.profile!.seeks = { ...ow.profile!.self };
const opposite = scoreMatch(om, ow);
console.log(`הפוכים: ${opposite.score} (${opposite.tierLabel}) | חלקים: ${opposite.parts.map((p) => `${p.key}=${p.score}`).join(' ')}`);

// בלי שאלון, פרטים מעשיים מושלמים
const noQuiz = scoreMatch({ ...pm, profile: null }, { ...pw, profile: null });
console.log(`בלי שאלון (פרטים מושלמים): ${noQuiz.score} (${noQuiz.tierLabel}, וודאות ${noQuiz.confidenceLabel})`);

// מושלם בנתונים אישיים אבל מגזר רחוק
const farSector = scoreMatch(pm, { ...pw, sector: 1 });
console.log(`מושלם אבל חרדי/חילוני... מגזר רחוק: ${farSector.score}`);

// סימנים אדומים
const flagged = person(9101, 'm'); flagged.profile = { ...pm.profile!, redFlags: ['ego', 'cold'] };
const coldEgo = { ...pw, profile: { ...pw.profile!, self: { ...pw.profile!.self, ego: 90, warmth: 15 } } };
const withFlags = scoreMatch(flagged, coldEgo);
console.log(`סימנים אדומים נפגעו: ${withFlags.score} | ${withFlags.dealbreakers.join(' ; ')}`);

console.log('\nדוגמת הסבר לזוג אקראי:');
const ex = scoreMatch(men[0], women[0]);
console.log(ex.score, ex.tierLabel, '\n+', ex.strengths.join('\n+ '), '\n-', ex.frictions.join('\n- '));
void raws;

// פרופיל מסכם לדוגמה (מה שמוצג בסוף השאלון)
import { buildProfileSummary } from '../src/lib/singlesProfileSummary';
const sm = buildProfileSummary('m', men[1].profile!);
console.log('\nפרופיל מסכם (גבר):', JSON.stringify({ ...sm, groups: sm.groups.map((g) => `${g.title}:${g.rows.length}`) }, null, 1));
