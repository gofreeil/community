<script lang="ts">
    import type { PageData } from './$types';
    import { religiosityLabel } from '$lib/singlesMock';
    import type { Gender, Religiosity } from '$lib/singlesMock';

    let { data }: { data: PageData } = $props();

    type Pair = PageData['pairs'][number];

    // מצב ההמלצה לכל זוג: idle → sending → done / error
    let sent = $state<Record<string, 'sending' | 'done' | 'error'>>({});

    const pairKey = (p: Pair) => `${p.a.id}_${p.b.id}`;

    async function recommend(p: Pair) {
        const key = pairKey(p);
        if (sent[key] === 'sending' || sent[key] === 'done') return;
        sent = { ...sent, [key]: 'sending' };
        try {
            const res = await fetch('/api/matchmaker-recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aId: p.a.id, bId: p.b.id }),
            });
            const out = await res.json().catch(() => ({}));
            sent = { ...sent, [key]: res.ok && out?.success ? 'done' : 'error' };
        } catch {
            sent = { ...sent, [key]: 'error' };
        }
    }

    function relLabel(rel: string, gender: Gender): string {
        return religiosityLabel(rel as Religiosity, gender);
    }

    // ── הזמנת מועמד/ת שעדיין אין לו/ה כרטיס: יצירת הודעה אישית ל-WhatsApp / העתקה ──
    const INVITE_DEFAULT =
        'יש עבורך ניסיון התאמה להכרת בן/בת גילך.\nהשלימו את הפרופיל באתר קהילה בשכונה וקבלו את הכרטיס:';
    let invitePhone = $state('');
    let inviteMsg = $state(INVITE_DEFAULT);
    let inviteCopied = $state(false);
    let inviteSending = $state(false);
    let inviteResult = $state<{ ok: boolean; text: string } | null>(null);

    // ההודעה המלאה = הטקסט + קישור להשלמת הפרופיל (נגזר מכתובת האתר בפועל)
    function inviteFullText(): string {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://community.gofreeil.com';
        return `${inviteMsg.trim()}\n${origin}/add/singles`;
    }
    function inviteWhatsApp() {
        const text = encodeURIComponent(inviteFullText());
        const digits = invitePhone.replace(/\D/g, '').replace(/^0/, '972');
        window.open(digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
    }
    function inviteCopy() {
        navigator.clipboard?.writeText(inviteFullText());
        inviteCopied = true;
        setTimeout(() => { inviteCopied = false; }, 1800);
    }
    function inviteReset() { inviteMsg = INVITE_DEFAULT; }

    // שליחה כהודעה בתוך האתר — נכנסת לתיבת ההודעות של הנמען (אם רשום עם הטלפון)
    async function inviteInApp() {
        if (!invitePhone.trim()) { inviteResult = { ok: false, text: 'נא להזין טלפון נמען לשליחה באתר' }; return; }
        inviteSending = true;
        inviteResult = null;
        try {
            const res = await fetch('/api/matchmaker-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: invitePhone, message: inviteMsg }),
            });
            const out = await res.json().catch(() => ({}));
            if (res.ok && out?.success) {
                inviteResult = { ok: true, text: `✓ ההזמנה נשלחה לתיבת ההודעות של ${out.name || 'המשתמש/ת'}` };
            } else {
                inviteResult = { ok: false, text: out?.message || 'שגיאה בשליחה' };
            }
        } catch {
            inviteResult = { ok: false, text: 'בעיית תקשורת — נסו שוב' };
        } finally {
            inviteSending = false;
        }
    }
</script>

<svelte:head>
    <title>כלים לשדכן — המלצות התאמה | קהילה בשכונה</title>
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <!-- חזרה -->
        <div class="mb-4">
            <a href="/singles" class="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm">→ חזרה ללוח הפנויים</a>
        </div>

        <!-- כותרת -->
        <div class="text-center mb-6">
            <div class="text-4xl mb-2">💘</div>
            <h1 class="text-2xl md:text-3xl font-black text-white mb-1">כלים לשדכן — המלצות התאמה</h1>
            <p class="text-gray-400 text-sm">
                המערכת מציעה זוגות לפי <span class="text-rose-300 font-bold">גילאים דומים</span> (עד {data.ageThreshold} שנות הפרש).
                בהמשך יתווספו קריטריונים נוספים.
            </p>
            <p class="text-gray-500 text-xs mt-2">
                {data.maleCount} גברים · {data.femaleCount} נשים · {data.totalPairs} התאמות אפשריות
            </p>
        </div>

        <!-- 💌 הזמנת מועמד/ת שעדיין אין לו/ה כרטיס -->
        <div class="mb-6 rounded-2xl bg-[#0f172a] border border-rose-500/25 overflow-hidden">
            <div class="px-4 py-3 bg-gradient-to-r from-rose-600/20 to-pink-600/10 border-b border-rose-500/15 flex items-center gap-2.5">
                <span class="text-xl">💌</span>
                <div class="min-w-0">
                    <h2 class="font-black text-white text-sm">הזמנת מועמד/ת חדש/ה</h2>
                    <p class="text-rose-200/70 text-xs">מכירים מישהו שיכול להתאים אך עדיין אין לו כרטיס? שלחו הזמנה אישית להשלים פרופיל ולקבל כרטיס.</p>
                </div>
            </div>
            <div class="p-4 space-y-3">
                <div>
                    <label for="inv-phone" class="block text-xs text-gray-400 mb-1">טלפון הנמען (לא חובה — לפתיחת השיחה ישירות)</label>
                    <input
                        id="inv-phone"
                        type="tel"
                        bind:value={invitePhone}
                        dir="ltr"
                        placeholder="05X-XXXXXXX"
                        class="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-rose-500/60 transition-all"
                    />
                </div>
                <div>
                    <label for="inv-msg" class="block text-xs text-gray-400 mb-1">תוכן ההודעה (ניתן לערוך)</label>
                    <textarea
                        id="inv-msg"
                        bind:value={inviteMsg}
                        rows="3"
                        class="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-rose-500/60 transition-all"
                    ></textarea>
                    <div class="flex items-center justify-between mt-1">
                        <p class="text-gray-500 text-[11px]">בסוף ההודעה יתווסף קישור להשלמת הפרופיל: <span dir="ltr" class="text-gray-400">/add/singles</span></p>
                        {#if inviteMsg.trim() !== INVITE_DEFAULT}
                            <button type="button" onclick={inviteReset} class="text-[11px] text-rose-300/80 hover:text-rose-200 underline underline-offset-2">איפוס לנוסח המקורי</button>
                        {/if}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button
                        type="button"
                        onclick={inviteInApp}
                        disabled={inviteSending}
                        class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-rose-500/20"
                    >
                        {inviteSending ? 'שולח...' : '📬 שלח כהודעה באתר'}
                    </button>
                    <button
                        type="button"
                        onclick={inviteWhatsApp}
                        class="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                        title="שלח בוואטסאפ"
                        aria-label="שלח בוואטסאפ"
                    >
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.03L.789 23.702l4.823-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.33 0-4.481-.76-6.234-2.048l-.447-.334-2.862.87.908-2.745-.367-.472A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                        וואטסאפ
                    </button>
                    <button
                        type="button"
                        onclick={inviteCopy}
                        class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                    >
                        {inviteCopied ? '✓ הועתק' : '📋 העתק'}
                    </button>
                </div>
                {#if inviteResult}
                    <p class="text-sm font-bold text-center {inviteResult.ok ? 'text-emerald-300' : 'text-red-400'}">{inviteResult.text}</p>
                {/if}
                <p class="text-gray-500 text-[11px] leading-relaxed">
                    📬 <span class="text-gray-400">"שלח כהודעה באתר"</span> — אם הנמען רשום עם הטלפון הזה, ההזמנה תופיע ככרטיס בתיבת ההודעות שלו עם קישור להשלמת הפרופיל. אחרת — שלחו בוואטסאפ.
                </p>
            </div>
        </div>

        {#if data.pairs.length === 0}
            <div class="text-center py-20">
                <span class="text-5xl mb-4 block">🕊️</span>
                <p class="text-gray-400 text-lg">אין עדיין התאמות בטווח הגילאים</p>
                <p class="text-gray-500 text-sm mt-2">כשיצטרפו עוד כרטיסים עם גילאים דומים — הן יופיעו כאן.</p>
            </div>
        {:else}
            <div class="space-y-3">
                {#each data.pairs as p (pairKey(p))}
                    {@const key = pairKey(p)}
                    {@const st = sent[key]}
                    <div class="rounded-2xl bg-[#0f172a] border border-white/10 overflow-hidden shadow-lg">
                        <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch">
                            <!-- גבר -->
                            <a href="/items/{p.a.id}" target="_blank" rel="noopener noreferrer"
                               class="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b sm:border-b-0 sm:border-l border-white/10">
                                <div class="w-12 h-12 rounded-full overflow-hidden ring-2 ring-blue-400/50 bg-white/10 shrink-0">
                                    <img src={p.a.avatar} alt={p.a.nickname} class="w-full h-full object-cover" loading="lazy" />
                                </div>
                                <div class="min-w-0">
                                    <p class="text-white font-bold text-sm leading-tight truncate">{p.a.nickname}</p>
                                    <p class="text-blue-200/80 text-xs mt-0.5">👨 {p.a.age}{#if p.a.city} · {p.a.city}{/if}</p>
                                    <p class="text-gray-500 text-[11px]">{relLabel(p.a.religiosity, 'male')}{#if p.a.visibility === 'matchmakers'} · 🔒 דיסקרטי{/if}</p>
                                </div>
                            </a>

                            <!-- מרכז: פער גיל + בונוסים -->
                            <div class="flex sm:flex-col items-center justify-center gap-1.5 px-3 py-2 bg-white/[0.03]">
                                <span class="text-rose-300 text-lg leading-none">💞</span>
                                <span class="text-[11px] font-bold text-gray-300 whitespace-nowrap">פער {p.ageDiff} שנ׳</span>
                                <div class="flex sm:flex-col gap-1">
                                    {#if p.sameCity}<span class="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-full px-2 py-0.5">אותה עיר</span>{/if}
                                    {#if p.sameReligiosity}<span class="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 rounded-full px-2 py-0.5">אותו מגזר</span>{/if}
                                </div>
                            </div>

                            <!-- אישה -->
                            <a href="/items/{p.b.id}" target="_blank" rel="noopener noreferrer"
                               class="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-t sm:border-t-0 sm:border-r border-white/10">
                                <div class="w-12 h-12 rounded-full overflow-hidden ring-2 ring-pink-400/50 bg-white/10 shrink-0">
                                    <img src={p.b.avatar} alt={p.b.nickname} class="w-full h-full object-cover" loading="lazy" />
                                </div>
                                <div class="min-w-0">
                                    <p class="text-white font-bold text-sm leading-tight truncate">{p.b.nickname}</p>
                                    <p class="text-pink-200/80 text-xs mt-0.5">👩 {p.b.age}{#if p.b.city} · {p.b.city}{/if}</p>
                                    <p class="text-gray-500 text-[11px]">{relLabel(p.b.religiosity, 'female')}{#if p.b.visibility === 'matchmakers'} · 🔒 דיסקרטי{/if}</p>
                                </div>
                            </a>
                        </div>

                        <!-- פעולת ההמלצה -->
                        <div class="px-3 py-2.5 border-t border-white/10 bg-white/[0.02]">
                            {#if st === 'done'}
                                <p class="text-center text-emerald-300 text-sm font-bold">✓ נשלחה המלצה לשני הצדדים</p>
                            {:else}
                                <button
                                    type="button"
                                    onclick={() => recommend(p)}
                                    disabled={st === 'sending'}
                                    class="w-full bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-rose-500/20"
                                >
                                    {st === 'sending' ? 'שולח...' : '💌 המלץ להם לראות זה את זה'}
                                </button>
                                {#if st === 'error'}
                                    <p class="text-center text-red-400 text-xs mt-1.5">שגיאה בשליחה — נסו שוב</p>
                                {/if}
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
            {#if data.totalPairs > data.pairs.length}
                <p class="text-center text-gray-500 text-xs mt-4">מוצגות {data.pairs.length} מתוך {data.totalPairs} התאמות (הקרובות ביותר בגיל)</p>
            {/if}
        {/if}
    </div>
</div>
