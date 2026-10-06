<script lang="ts">
    // פידבק שדכן/ית על ציון ההתאמה של זוג. לחיצה על דירוג נשמרת מיד (ונראית: "✓ נשמר");
    // אחריה נפתח פאנל קטן לדיוק - מה הכי השפיע + הערה חופשית. לחיצה חוזרת על אותו דירוג מבטלת אותו.
    // הנתונים מלמדים את המערכת מה נחשב התאמה: ראו /admin/match-feedback.
    import { untrack } from 'svelte';
    import { FEEDBACK_REASONS, VERDICT_LABELS, MAX_FEEDBACK_NOTE, type MatchFeedback, type Verdict } from '$lib/matchFeedbackShared';

    let { aId, bId, initial = null, onchange }: {
        aId: string;
        bId: string;
        initial?: MatchFeedback | null;
        onchange?: (fb: MatchFeedback | null) => void;
    } = $props();

    let verdict = $state<Verdict | null>(untrack(() => initial?.verdict ?? null));
    let reasons = $state<string[]>(untrack(() => [...(initial?.reasons ?? [])]));
    let note = $state(untrack(() => initial?.note ?? ''));
    let open = $state(false);
    let busy = $state(false);
    let dirty = $state(false);
    let msg = $state<{ ok: boolean; text: string } | null>(null);

    const VERDICTS: Verdict[] = ['good', 'maybe', 'bad'];
    const tone: Record<Verdict, string> = {
        good: 'bg-emerald-500/25 border-emerald-300 text-emerald-100',
        maybe: 'bg-amber-500/25 border-amber-300 text-amber-100',
        bad: 'bg-red-500/25 border-red-300 text-red-100',
    };
    const prompt: Record<Verdict, string> = {
        good: 'מה הכי מתאים בזוג הזה?',
        maybe: 'מה מעורר ספק?',
        bad: 'מה הכי לא מתאים?',
    };

    async function post(body: Record<string, unknown>): Promise<{ success?: boolean; message?: string; feedback?: MatchFeedback }> {
        try {
            const res = await fetch('/api/match-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aId, bId, ...body }),
            });
            const out = await res.json().catch(() => ({}));
            return res.ok ? out : { success: false, message: out?.message || 'שגיאה - נסו שוב' };
        } catch {
            return { success: false, message: 'בעיית תקשורת - נסו שוב' };
        }
    }

    async function save(v: Verdict) {
        busy = true;
        msg = null;
        const out = await post({ verdict: v, reasons, note });
        busy = false;
        if (out.success && out.feedback) {
            verdict = v;
            dirty = false;
            msg = { ok: true, text: '✓ נשמר - תודה, זה מלמד את המערכת' };
            onchange?.(out.feedback);
        } else {
            msg = { ok: false, text: out.message || 'שגיאה - נסו שוב' };
        }
    }

    async function pick(v: Verdict) {
        if (busy) return;
        if (v === verdict) {
            busy = true;
            msg = null;
            const out = await post({ clear: true });
            busy = false;
            if (out.success) {
                verdict = null; reasons = []; note = ''; open = false; dirty = false;
                msg = { ok: true, text: '✓ הדירוג בוטל' };
                onchange?.(null);
            } else {
                msg = { ok: false, text: out.message || 'שגיאה - נסו שוב' };
            }
            return;
        }
        open = true;
        await save(v);
    }

    function toggleReason(id: string) {
        reasons = reasons.includes(id) ? reasons.filter((r) => r !== id) : [...reasons, id];
        dirty = true;
    }
</script>

<div class="px-3 py-2.5 border-t border-white/10 bg-white/[0.02]" dir="rtl">
    <div class="flex items-center gap-2">
        <span class="text-[11px] font-bold text-gray-400 shrink-0">🧠 מה דעתך על ההתאמה?</span>
        <div class="flex flex-1 gap-1.5">
            {#each VERDICTS as v}
                <button type="button" onclick={() => pick(v)} disabled={busy} aria-pressed={verdict === v}
                    class="flex-1 rounded-lg border px-1.5 py-1.5 text-[11px] sm:text-xs font-bold transition-colors disabled:opacity-50
                        {verdict === v ? tone[v] : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}">
                    {VERDICT_LABELS[v]}
                </button>
            {/each}
        </div>
        {#if verdict && !open}
            <button type="button" onclick={() => (open = true)} class="text-[11px] text-pink-300 hover:text-pink-200 underline underline-offset-2 shrink-0">פרטים</button>
        {/if}
    </div>

    {#if open && verdict}
        <div class="mt-2.5 space-y-2">
            <p class="text-[11px] font-bold text-gray-300">{prompt[verdict]} <span class="font-normal text-gray-500">(אפשר לבחור כמה)</span></p>
            <div class="flex flex-wrap gap-1.5">
                {#each FEEDBACK_REASONS as r (r.id)}
                    <button type="button" onclick={() => toggleReason(r.id)} aria-pressed={reasons.includes(r.id)}
                        class="rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors
                            {reasons.includes(r.id) ? 'bg-pink-500/30 border-pink-300 text-white' : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'}">
                        {r.label}
                    </button>
                {/each}
            </div>
            <textarea bind:value={note} oninput={() => (dirty = true)} rows="2" maxlength={MAX_FEEDBACK_NOTE}
                placeholder="הערה חופשית - למה כן / למה לא (לא חובה)"
                class="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-pink-500/60"></textarea>
            <div class="flex items-center gap-2">
                <button type="button" onclick={() => save(verdict!)} disabled={busy || !dirty}
                    class="rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                    {busy ? 'שומר...' : 'שמור פרטים'}
                </button>
                <button type="button" onclick={() => (open = false)} class="text-[11px] text-gray-400 hover:text-white">סגור</button>
            </div>
        </div>
    {/if}

    {#if msg}
        <p role="status" class="mt-1.5 text-[11px] font-bold {msg.ok ? 'text-emerald-300' : 'text-red-400'}">{msg.text}</p>
    {/if}
</div>
