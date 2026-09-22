<script lang="ts">
    // "מידע לשדכנים בלבד" — התשובות שהפנוי/ה מילא/ה בטופס תחת group='matchmakers'.
    // מוצג רק למי שהשרת אישר כשדכן/ית מערכת (getMatchmakerStatus === 'approved')
    // או לסופר-אדמין; לכל שאר הצופים התשובות כלל לא יוצאות מהשרת.
    // אותו בלוק משמש את /items/[id] ואת /singles/[id] כדי שהתצוגה תהיה זהה.

    // שתי שאלות ותיקות נוסחו בגוף ראשון ("שאתה מחפש") — בתצוגת השדכן הן בגוף שלישי
    const THIRD_PERSON_LABELS: Record<string, string> = {
        match_partner_character: 'מהו אופי בן/בת הזוג שהוא/היא מחפש/ת',
        match_self_advantage: 'היתרון שהוא/היא מביא/ה אל הזוגיות',
    };

    let { answers = [] }: { answers?: { key: string; label: string; value: string }[] } = $props();

    let open = $state(true);
</script>

{#if answers.length}
    <div class="mt-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 overflow-hidden" dir="rtl">
        <button
            onclick={() => (open = !open)}
            class="w-full flex items-center justify-between gap-2 px-4 py-3 text-right hover:bg-purple-500/10 transition-colors"
        >
            <span class="flex items-center gap-2 text-purple-200 font-bold text-sm">
                🔒 מידע לשדכנים בלבד
                <span class="text-purple-300/70 text-[11px] font-medium">({answers.length} תשובות · לא מוצג בלוח הפומבי)</span>
            </span>
            <span class="text-purple-300 text-xs">{open ? '▲' : '▼'}</span>
        </button>

        {#if open}
            <div class="px-4 pb-4 space-y-3">
                {#each answers as a (a.key)}
                    <div class="rounded-xl bg-black/20 p-3">
                        <p class="text-purple-300/80 text-[11px] font-bold mb-1">{THIRD_PERSON_LABELS[a.key] ?? a.label}</p>
                        <p class="text-gray-200 text-sm leading-relaxed whitespace-pre-line">{a.value}</p>
                    </div>
                {/each}
                <p class="text-purple-300/60 text-[11px] leading-relaxed">
                    המידע נמסר לצוות השדכנים בדיסקרטיות. אין להעביר אותו לצד השני או לכל גורם אחר.
                </p>
            </div>
        {/if}
    </div>
{/if}
