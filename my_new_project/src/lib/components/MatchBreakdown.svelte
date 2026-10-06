<script lang="ts">
    // פירוט ציון ההתאמה. לשדכן: כל החלקים, מה עובד ואיפה יש חיכוך.
    // לפנוי/ה: ניסוח כללי בלבד, בלי תוכן אישי מהשאלון של הצד השני.
    import type { MatchResult } from '$lib/singlesMatching';

    let { match, audience = 'matchmaker' }: { match: MatchResult; audience?: 'matchmaker' | 'single' } = $props();

    const bar = (s: number) => (s >= 72 ? 'bg-emerald-400' : s >= 58 ? 'bg-cyan-400' : s >= 45 ? 'bg-amber-400' : 'bg-gray-400');
</script>

<div class="space-y-3 text-right" dir="rtl">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span class="font-black text-white">{match.tierLabel}</span>
        <span class="text-gray-400">ודאות {match.confidenceLabel}</span>
        {#if match.partial}
            <span class="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-200">ציון חלקי - חסר שאלון</span>
        {/if}
    </div>

    {#if audience === 'single'}
        {#if match.highlights.length}
            <ul class="space-y-1">
                {#each match.highlights as h}
                    <li class="text-sm text-emerald-100/90">✓ {h}</li>
                {/each}
            </ul>
        {/if}
        <p class="text-[11px] text-gray-500 leading-relaxed">
            הציון נבנה מהשוואת הפרופילים משאלון ההתאמה ומפרטי הכרטיס. זו הערכה של המערכת, והשדכן/ית ישמחו להסביר אותה.
        </p>
    {:else}
        <div class="space-y-1.5">
            {#each match.parts as p (p.key)}
                <div>
                    <div class="flex justify-between text-[11px] text-gray-300">
                        <span>{p.label}</span>
                        <span class="font-bold">{p.score === null ? 'אין נתונים' : p.score}</span>
                    </div>
                    <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        {#if p.score !== null}<div class="h-full {bar(p.score)}" style="width:{p.score}%"></div>{/if}
                    </div>
                </div>
            {/each}
        </div>

        {#if match.aToB !== null || match.bToA !== null}
            <div class="grid grid-cols-2 gap-2 text-[11px]">
                {#if match.bToA !== null}
                    <div class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
                        <p class="text-gray-400">הוא עונה על מה שהיא מחפשת</p>
                        <p class="font-black text-white">{match.bToA}%</p>
                    </div>
                {/if}
                {#if match.aToB !== null}
                    <div class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
                        <p class="text-gray-400">היא עונה על מה שהוא מחפש</p>
                        <p class="font-black text-white">{match.aToB}%</p>
                    </div>
                {/if}
            </div>
        {/if}

        {#if match.dealbreakers.length}
            <div class="rounded-lg border border-red-400/40 bg-red-500/10 p-2.5">
                <p class="text-[11px] font-black text-red-200 mb-1">⛔ מסנני חובה שנפגעו</p>
                <ul class="space-y-0.5">
                    {#each match.dealbreakers as d}<li class="text-[11px] text-red-100/90">• {d}</li>{/each}
                </ul>
            </div>
        {/if}
        {#if match.strengths.length}
            <div>
                <p class="text-[11px] font-black text-emerald-200 mb-1">✓ מה עובד</p>
                <ul class="space-y-0.5">
                    {#each match.strengths as t}<li class="text-[11px] text-gray-200">• {t}</li>{/each}
                </ul>
            </div>
        {/if}
        {#if match.frictions.length}
            <div>
                <p class="text-[11px] font-black text-amber-200 mb-1">⚠ איפה יש חיכוך</p>
                <ul class="space-y-0.5">
                    {#each match.frictions as t}<li class="text-[11px] text-gray-200">• {t}</li>{/each}
                </ul>
            </div>
        {/if}
    {/if}
</div>
