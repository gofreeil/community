<script lang="ts">
    // פאנל לשדכן בכרטיס פנוי/ה: "חיפוש התאמה" (המועמדים עם הציון הגבוה ביותר) + פרופיל השאלון.
    // השרת מחזיר את הנתונים רק לשדכן מאושר (ראה singles/[id]/+page.server.ts).
    import type { MatchResult } from '$lib/singlesMatching';
    import type { ProfileSummary } from '$lib/singlesProfileSummary';
    import QuizProfileCard from './QuizProfileCard.svelte';
    import MatchScoreBadge from './MatchScoreBadge.svelte';
    import MatchBreakdown from './MatchBreakdown.svelte';

    type TopMatch = { id: string; nickname: string; age: string; city: string; avatar: string; match: MatchResult };

    let { subjectId, subjectGender, profile, matches }: {
        subjectId: string;
        subjectGender: 'male' | 'female';
        profile: ProfileSummary | null;
        matches: TopMatch[];
    } = $props();

    let open = $state(true);
    // מצב השידוך לכל מועמד/ת: sending → done / error
    let sent = $state<Record<string, 'sending' | 'done' | 'error'>>({});

    async function recommend(m: TopMatch) {
        if (sent[m.id] === 'sending' || sent[m.id] === 'done') return;
        sent = { ...sent, [m.id]: 'sending' };
        const [aId, bId] = subjectGender === 'male' ? [subjectId, m.id] : [m.id, subjectId];
        try {
            const res = await fetch('/api/matchmaker-recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aId, bId }),
            });
            const out = await res.json().catch(() => ({}));
            sent = { ...sent, [m.id]: res.ok && out?.success ? 'done' : 'error' };
        } catch {
            sent = { ...sent, [m.id]: 'error' };
        }
    }
</script>

<div class="mt-6 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 overflow-hidden" dir="rtl">
    <button onclick={() => (open = !open)}
        class="w-full flex items-center justify-between gap-2 px-4 py-3 text-right hover:bg-fuchsia-500/10 transition-colors">
        <span class="flex items-center gap-2 text-fuchsia-200 font-bold text-sm">
            🧠 התאמה חכמה לשדכנים
            <span class="text-fuchsia-300/70 text-[11px] font-medium">(לא מוצג בלוח הפומבי)</span>
        </span>
        <span class="text-fuchsia-300 text-xs">{open ? '▲' : '▼'}</span>
    </button>

    {#if open}
        <div class="px-4 pb-4 space-y-5">
            <!-- חיפוש התאמה -->
            <div>
                <p class="text-fuchsia-100 text-xs font-black mb-2">🔎 ההתאמות המובילות ({matches.length})</p>
                {#if !profile}
                    <p class="mb-2 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                        הכרטיס הזה עוד לא מילא את שאלון ההתאמה, ולכן הציונים חלקיים - לפי גיל, מגזר ועיר בלבד.
                    </p>
                {/if}
                {#if matches.length === 0}
                    <p class="text-gray-400 text-xs">אין כרגע מועמדים/ות בטווח הגילאים.</p>
                {:else}
                    <div class="space-y-2">
                        {#each matches as m (m.id)}
                            <div class="rounded-xl bg-black/20 border border-white/10 overflow-hidden">
                                <div class="flex items-center gap-3 p-2.5">
                                    <a href="/singles/{m.id}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90">
                                        <img src={m.avatar} alt={m.nickname} class="w-11 h-11 rounded-full object-cover ring-2 ring-white/20 shrink-0" loading="lazy" />
                                        <span class="min-w-0">
                                            <span class="block text-white font-bold text-sm truncate">{m.nickname}</span>
                                            <span class="block text-gray-400 text-[11px] truncate">{[m.age, m.city].filter(Boolean).join(' · ')}</span>
                                            <span class="block text-fuchsia-200/90 text-[11px] font-bold">{m.match.tierLabel}{m.match.partial ? ' · חלקי' : ''}</span>
                                        </span>
                                    </a>
                                    <MatchScoreBadge score={m.match.score} partial={m.match.partial} />
                                </div>
                                <details class="border-t border-white/10">
                                    <summary class="cursor-pointer select-none px-3 py-1.5 text-[11px] text-gray-400 hover:bg-white/[0.03]">פירוט ההתאמה ▾</summary>
                                    <div class="px-3 pb-3 pt-1"><MatchBreakdown match={m.match} audience="matchmaker" /></div>
                                </details>
                                <div class="px-2.5 pb-2.5">
                                    {#if sent[m.id] === 'done'}
                                        <p class="text-center text-emerald-300 text-xs font-bold py-1">✓ השידוך נוצר - שני הצדדים קיבלו התראה</p>
                                    {:else}
                                        <button type="button" onclick={() => recommend(m)} disabled={sent[m.id] === 'sending'}
                                            class="w-full bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs">
                                            {sent[m.id] === 'sending' ? 'משדך...' : '💘 חבר כרטיסים ושלח לשניהם'}
                                        </button>
                                        {#if sent[m.id] === 'error'}<p class="text-center text-red-400 text-[11px] mt-1">שגיאה בשליחה - נסו שוב</p>{/if}
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- פרופיל השאלון -->
            <div>
                <p class="text-fuchsia-100 text-xs font-black mb-2">📋 פרופיל ההתאמה של {subjectGender === 'male' ? 'הפנוי' : 'הפנויה'}</p>
                {#if profile}
                    <QuizProfileCard summary={profile} audience="matchmaker" />
                {:else}
                    <p class="text-gray-400 text-xs">לא מולא שאלון התאמה.</p>
                {/if}
            </div>

            <p class="text-fuchsia-300/60 text-[11px] leading-relaxed">
                המידע נמסר לצוות השדכנים בדיסקרטיות. אין להעביר אותו לצד השני או לכל גורם אחר.
            </p>
        </div>
    {/if}
</div>
