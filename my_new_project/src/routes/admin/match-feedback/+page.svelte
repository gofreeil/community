<script lang="ts">
    import type { PageData } from './$types';
    import { PART_LABELS } from '$lib/singlesMatching';
    import { FEEDBACK_REASONS, VERDICT_LABELS, SYSTEM_GOOD_SCORE, MIN_FOR_THRESHOLD, type MatchFeedback, type PartStat } from '$lib/matchFeedbackShared';

    let { data }: { data: PageData } = $props();
    const s = $derived(data.summary);

    const reasonLabel = (id: string) => FEEDBACK_REASONS.find((r) => r.id === id)?.label ?? id;
    const dateOf = (iso: string) => (iso ? new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '');
    const verdictTone: Record<string, string> = {
        good: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
        maybe: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
        bad: 'text-red-300 border-red-400/40 bg-red-500/10',
    };

    /** כמה החלק מבדיל בין זוגות שסומנו "מתאים" לאלה שסומנו "לא מתאים" */
    function readPart(p: PartStat): { text: string; tone: string } {
        if (p.gap === null || p.nGood < 3 || p.nBad < 3) return { text: 'מעט נתונים', tone: 'text-gray-500' };
        if (p.gap >= 10) return { text: 'מבדיל היטב', tone: 'text-emerald-300' };
        if (p.gap >= 4) return { text: 'מבדיל במידה', tone: 'text-cyan-300' };
        if (p.gap > -4) return { text: 'כמעט לא מבדיל', tone: 'text-amber-300' };
        return { text: 'הפוך! זוגות רעים יוצאים גבוהים יותר', tone: 'text-red-300' };
    }

    const maxReason = $derived(Math.max(1, ...s.reasons.map((r) => r.good + r.maybe + r.bad)));
</script>

<svelte:head><title>למידת ההתאמה | ניהול</title></svelte:head>

{#snippet pairRow(f: MatchFeedback)}
    <article class="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
        <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="rounded-full border px-2 py-0.5 font-bold {verdictTone[f.verdict]}">{VERDICT_LABELS[f.verdict]}</span>
            {#if f.score !== null}
                <span class="rounded-full border border-white/15 px-2 py-0.5 font-bold text-white">ציון המערכת {f.score}{f.partial ? ' (חלקי)' : ''}</span>
            {/if}
            <span class="font-bold text-white">
                <a href="/items/{f.aId}" target="_blank" rel="noopener noreferrer" class="hover:underline">{f.aName || 'כרטיס'}</a>
                +
                <a href="/items/{f.bId}" target="_blank" rel="noopener noreferrer" class="hover:underline">{f.bName || 'כרטיס'}</a>
            </span>
            <span class="text-gray-500 me-auto">{f.matchmakerName} · {dateOf(f.updatedAt)}</span>
        </div>
        {#if f.reasons.length}
            <div class="mt-1.5 flex flex-wrap gap-1">
                {#each f.reasons as r}<span class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-gray-200">{reasonLabel(r)}</span>{/each}
            </div>
        {/if}
        {#if f.note}<p class="mt-1.5 text-xs text-gray-300 whitespace-pre-wrap">{f.note}</p>{/if}
    </article>
{/snippet}

<div class="max-w-4xl mx-auto px-4 py-5 md:py-8" dir="rtl">
    <a href="/admin" class="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm">→ חזרה ללוח הניהול</a>
    <h1 class="text-2xl md:text-3xl font-black text-white mt-2 mb-1">🧠 למידת ההתאמה</h1>
    <p class="text-gray-400 text-sm mb-5">
        השדכנים מדרגים כל זוג שהמערכת הציעה - "מתאים / אולי / לא מתאים" - ומציינים מה הכי השפיע. כאן רואים איפה ציון המערכת מסכים איתם ואיפה לא,
        כדי לכייל את המשקלים והסף ב-<span dir="ltr" class="text-gray-300">singlesMatching.ts</span>. שום דבר כאן לא משנה את הציונים אוטומטית - ההחלטה לשנות נשארת שלך.
    </p>

    {#if s.total === 0}
        <div class="rounded-2xl border border-white/10 bg-white/5 py-14 text-center">
            <p class="text-4xl mb-2">🧠</p>
            <p class="text-gray-300 font-bold">עדיין אין דירוגים</p>
            <p class="text-gray-500 text-sm mt-1">שדכנים מדרגים בכרטיסי ההתאמה ב-<span dir="ltr">/singles/matchmaker</span>.</p>
        </div>
    {:else}
        <!-- סיכום -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
            <div class="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <p class="text-2xl font-black text-white">{s.total}</p>
                <p class="text-[11px] text-gray-400">דירוגים · {s.matchmakers} שדכנים</p>
            </div>
            {#each ['good', 'maybe', 'bad'] as const as v}
                <div class="rounded-xl border p-3 text-center {verdictTone[v]}">
                    <p class="text-2xl font-black">{s.byVerdict[v]}</p>
                    <p class="text-[11px]">{VERDICT_LABELS[v]}{s.avgScore[v] !== null ? ` · ממוצע ציון ${s.avgScore[v]}` : ''}</p>
                </div>
            {/each}
            <div class="rounded-xl border border-pink-400/40 bg-pink-500/10 p-3 text-center col-span-2 md:col-span-1">
                <p class="text-2xl font-black text-pink-100">{s.agreement.rate === null ? '-' : `${s.agreement.rate}%`}</p>
                <p class="text-[11px] text-pink-200/80">הסכמה (ציון {SYSTEM_GOOD_SCORE}+ = "טוב")</p>
            </div>
        </div>

        <!-- סף מפריד -->
        <section class="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 class="font-black text-white mb-1">איפה לשים את הקו?</h2>
            {#if s.bestThreshold}
                <p class="text-sm text-gray-200">
                    הציון שמפריד הכי טוב בין "מתאים" ל"לא מתאים" הוא <span class="font-black text-pink-200">{s.bestThreshold.score}</span>
                    (דיוק מאוזן {s.bestThreshold.accuracy}%), לעומת {SYSTEM_GOOD_SCORE} שמוגדר היום כ"התאמה טובה".
                    {#if Math.abs(s.bestThreshold.score - SYSTEM_GOOD_SCORE) >= 6}
                        הפער משמעותי - שווה לבחון הזזה של <span dir="ltr">CALIB_CENTER</span> או של גבולות הדרגות.
                    {:else}
                        הפער קטן - הכיול הנוכחי סביר.
                    {/if}
                </p>
            {:else}
                <p class="text-sm text-gray-400">צריך לפחות {MIN_FOR_THRESHOLD} דירוגי "מתאים" ו-{MIN_FOR_THRESHOLD} דירוגי "לא מתאים" כדי להציע סף. כרגע: {s.byVerdict.good} ו-{s.byVerdict.bad}.</p>
            {/if}
        </section>

        <!-- חלקי הציון -->
        <section class="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 class="font-black text-white mb-1">אילו חלקים בציון באמת מנבאים?</h2>
            <p class="text-xs text-gray-400 mb-3">ממוצע ציון כל חלק בזוגות ש"מתאימים" מול אלה ש"לא מתאימים". פער גדול = החלק מבדיל טוב; פער אפסי = כדאי להקטין את משקלו.</p>
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-right">
                    <thead class="text-[11px] text-gray-400">
                        <tr>
                            <th class="py-1 font-bold">חלק</th>
                            <th class="py-1 font-bold">מתאים</th>
                            <th class="py-1 font-bold">לא מתאים</th>
                            <th class="py-1 font-bold">פער</th>
                            <th class="py-1 font-bold">קריאה</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each s.parts as p (p.key)}
                            {@const r = readPart(p)}
                            <tr class="border-t border-white/10">
                                <td class="py-1.5 text-white">{PART_LABELS[p.key]}</td>
                                <td class="py-1.5 text-gray-200">{p.avgGood ?? '-'} <span class="text-[10px] text-gray-500">({p.nGood})</span></td>
                                <td class="py-1.5 text-gray-200">{p.avgBad ?? '-'} <span class="text-[10px] text-gray-500">({p.nBad})</span></td>
                                <td class="py-1.5 font-bold text-white">{p.gap === null ? '-' : p.gap > 0 ? `+${p.gap}` : p.gap}</td>
                                <td class="py-1.5 text-xs font-bold {r.tone}">{r.text}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </section>

        <!-- סיבות -->
        <section class="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 class="font-black text-white mb-1">מה השדכנים אומרים שמכריע</h2>
            <p class="text-xs text-gray-400 mb-3">כמה פעמים כל גורם סומן, לפי הדירוג. "משיכה" ו"משהו אחר" הם דברים שהמערכת לא רואה בכלל.</p>
            <div class="space-y-1.5">
                {#each s.reasons.filter((r) => r.good + r.maybe + r.bad > 0).sort((a, b) => (b.good + b.maybe + b.bad) - (a.good + a.maybe + a.bad)) as r (r.id)}
                    {@const total = r.good + r.maybe + r.bad}
                    <div>
                        <div class="flex justify-between text-xs text-gray-200">
                            <span>{r.label}</span>
                            <span class="text-gray-400">
                                <span class="text-emerald-300">{r.good}</span> · <span class="text-amber-300">{r.maybe}</span> · <span class="text-red-300">{r.bad}</span>
                            </span>
                        </div>
                        <div class="flex h-1.5 overflow-hidden rounded-full bg-white/10" style="width:{Math.max(8, (total / maxReason) * 100)}%">
                            <div class="bg-emerald-400" style="width:{(r.good / total) * 100}%"></div>
                            <div class="bg-amber-400" style="width:{(r.maybe / total) * 100}%"></div>
                            <div class="bg-red-400" style="width:{(r.bad / total) * 100}%"></div>
                        </div>
                    </div>
                {:else}
                    <p class="text-xs text-gray-500">עדיין לא סומנו גורמים.</p>
                {/each}
            </div>
        </section>

        <!-- חילוקי דעות -->
        <section class="mb-5">
            <h2 class="font-black text-white mb-1">⚠️ המערכת אמרה "טוב", השדכנים אמרו "לא מתאים"</h2>
            <p class="text-xs text-gray-400 mb-2">הכי חשוב לבדוק: ציון {SYSTEM_GOOD_SCORE}+ שנדחה. בדקו מה חסר למנוע (ראו הסיבות וההערות).</p>
            <div class="space-y-2">
                {#each s.falsePositives as f (f.id)}{@render pairRow(f)}{:else}<p class="text-xs text-gray-500">אין כרגע.</p>{/each}
            </div>
        </section>

        <section class="mb-5">
            <h2 class="font-black text-white mb-1">🔍 המערכת אמרה "חלש", השדכנים אמרו "מתאים"</h2>
            <p class="text-xs text-gray-400 mb-2">התאמות שהמנוע מפספס: ציון מתחת ל-45 שדכן/ית דווקא אהב/ה.</p>
            <div class="space-y-2">
                {#each s.falseNegatives as f (f.id)}{@render pairRow(f)}{:else}<p class="text-xs text-gray-500">אין כרגע.</p>{/each}
            </div>
        </section>

        <!-- אחרונים -->
        <section>
            <h2 class="font-black text-white mb-2">הדירוגים האחרונים</h2>
            <div class="space-y-2">
                {#each data.recent as f (f.id)}{@render pairRow(f)}{/each}
            </div>
        </section>
    {/if}
</div>
