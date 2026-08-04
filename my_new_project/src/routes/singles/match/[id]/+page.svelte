<script lang="ts">
    import type { PageData } from './$types';
    import { religiosityLabel } from '$lib/singlesMock';
    import type { Religiosity, Gender } from '$lib/singlesMock';

    let { data }: { data: PageData } = $props();

    type MiniCard = {
        id: string; nickname: string; gender: Gender; age: string; city: string;
        // maritalStatus/education/interests/images אופציונליים גם ב-SingleProfile —
        // הכרטיס מהשרת מגיע איתם כ-undefined אפשרי, והתבנית ממילא עטופה ב-{#if}
        religiosity: string; maritalStatus?: string; education?: string; interests?: string;
        description: string; lookingFor: string; inspiration: string;
        images?: string[]; avatar: string;
    };

    // מצב מקומי לצד "פנוי/ה" — מתעדכן אחרי החלטה בלי רענון.
    let myResponse = $state(data.role === 'single' ? data.myResponse : 'pending');
    let stage = $state(data.stage);
    let submitting = $state<'interested' | 'declined' | null>(null);
    let errMsg = $state('');

    const COST_NOTE = 'שימו לב: לשידוך יש עלות, שתסוכם ישירות עם השדכן/ית המציע/ה.';

    async function respond(response: 'interested' | 'declined') {
        if (submitting) return;
        submitting = response;
        errMsg = '';
        try {
            const res = await fetch('/api/match-respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId: data.matchId, response }),
            });
            const out = await res.json().catch(() => ({}));
            if (res.ok && out?.success) {
                myResponse = response;
                stage = out.stage;
            } else {
                errMsg = out?.message || 'שגיאה — נסו שוב';
            }
        } catch {
            errMsg = 'בעיית תקשורת — נסו שוב';
        } finally {
            submitting = null;
        }
    }

    function relLabel(rel: string, gender: Gender): string {
        return religiosityLabel(rel as Religiosity, gender);
    }
</script>

<svelte:head>
    <title>המלצת שידוך | קהילה בשכונה</title>
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#snippet cardView(card: MiniCard)}
    <div class="rounded-2xl bg-[#0f172a] border border-pink-500/25 overflow-hidden shadow-xl">
        <!-- גלריית תמונות -->
        {#if card.images && card.images.length > 0}
            <div class="flex gap-1 overflow-x-auto snap-x bg-black/30">
                {#each card.images as img}
                    <img src={img} alt={card.nickname} class="h-64 w-auto object-cover snap-center flex-shrink-0" loading="lazy" />
                {/each}
            </div>
        {:else}
            <div class="h-40 flex items-center justify-center bg-gradient-to-br from-pink-600/20 to-purple-600/10">
                <img src={card.avatar} alt={card.nickname} class="w-24 h-24 rounded-full object-cover ring-2 ring-white/20" />
            </div>
        {/if}

        <div class="p-4">
            <div class="flex items-baseline gap-2 flex-wrap mb-1">
                <h2 class="text-white font-black text-xl">{card.nickname}</h2>
                {#if card.age}<span class="text-pink-200/90 text-sm">🎂 {card.age}</span>{/if}
                {#if card.city}<span class="text-pink-200/90 text-sm">📍 {card.city}</span>{/if}
            </div>
            <div class="flex flex-wrap gap-1.5 mb-3">
                {#if card.religiosity}<span class="text-[11px] font-bold text-cyan-200 bg-cyan-500/10 border border-cyan-400/25 rounded-full px-2 py-0.5">{relLabel(card.religiosity, card.gender)}</span>{/if}
                {#if card.maritalStatus}<span class="text-[11px] font-bold text-gray-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">{card.maritalStatus}</span>{/if}
                {#if card.education}<span class="text-[11px] font-bold text-gray-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">🎓 {card.education}</span>{/if}
            </div>

            {#if card.description}
                <p class="text-gray-300 text-sm leading-relaxed mb-3 whitespace-pre-line">{card.description}</p>
            {/if}
            {#if card.lookingFor}
                <div class="mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                    <p class="text-pink-300 text-xs font-bold mb-0.5">מה מחפש/ת</p>
                    <p class="text-gray-300 text-sm">{card.lookingFor}</p>
                </div>
            {/if}
            {#if card.interests}
                <p class="text-gray-400 text-xs mb-2">🎯 {card.interests}</p>
            {/if}
            {#if card.inspiration}
                <p class="text-gray-400 text-xs italic border-r-2 border-pink-500/40 pr-2">{card.inspiration}</p>
            {/if}

            <p class="text-gray-500 text-[11px] mt-4">🔒 פרטי הקשר אינם מוצגים — ההיכרות מתואמת דרך השדכן/ית.</p>
        </div>
    </div>
{/snippet}

<div class="min-h-screen bg-[#070b14] text-white pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-lg mx-auto">
        <div class="mb-4">
            <a href="/singles" class="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm">→ חזרה ללוח הפנויים</a>
        </div>

        {#if data.role === 'single'}
            <div class="text-center mb-5">
                <div class="text-4xl mb-2">💘</div>
                <h1 class="text-xl md:text-2xl font-black">השדכנים שלנו ממליצים לך על התאמה</h1>
                <p class="text-gray-400 text-sm mt-1">הצצו לפרטים הראשונים והחליטו אם להמשיך בהליכים.</p>
            </div>

            {#if data.otherCard}
                {@render cardView(data.otherCard)}
            {:else}
                <div class="text-center text-gray-400 py-10">הכרטיס של הצד השני אינו זמין כרגע.</div>
            {/if}

            <!-- אזור החלטה -->
            <div class="mt-5">
                {#if stage === 'closed' && myResponse !== 'declined'}
                    <div class="rounded-2xl bg-white/5 border border-white/10 px-4 py-5 text-center">
                        <p class="text-gray-300 font-bold">ההצעה נסגרה כרגע 🕊️</p>
                        <p class="text-gray-500 text-sm mt-1">נמשיך לחפש עבורך התאמות נוספות.</p>
                    </div>
                {:else if myResponse === 'declined'}
                    <div class="rounded-2xl bg-white/5 border border-white/10 px-4 py-5 text-center">
                        <p class="text-gray-300 font-bold">סימנת שאין המשך להצעה זו.</p>
                        <p class="text-gray-500 text-sm mt-1">תודה — נמשיך לחפש עבורך.</p>
                    </div>
                {:else if myResponse === 'interested' && stage === 'mutual'}
                    <div class="rounded-2xl bg-pink-500/10 border border-pink-400/40 px-4 py-5 text-center">
                        <div class="text-3xl mb-1">💞</div>
                        <p class="text-pink-200 font-bold">יש עניין הדדי!</p>
                        <p class="text-pink-100/80 text-sm mt-1">השדכן/ית{#if data.matchmakerName} ({data.matchmakerName}){/if} ייצור/תיצור איתך קשר בקרוב לתיאום ההיכרות.</p>
                        <p class="text-amber-200/80 text-xs mt-3">{COST_NOTE}</p>
                    </div>
                {:else if myResponse === 'interested'}
                    <div class="rounded-2xl bg-emerald-500/10 border border-emerald-400/40 px-4 py-5 text-center">
                        <p class="text-emerald-200 font-bold">סימנת שאת/ה מעוניין/ת להמשיך ✓</p>
                        <p class="text-emerald-100/80 text-sm mt-1">ממתינים לתשובת הצד השני. נעדכן אותך ברגע שתתקבל.</p>
                        <p class="text-amber-200/80 text-xs mt-3">{COST_NOTE}</p>
                    </div>
                {:else}
                    <div class="rounded-2xl bg-amber-500/10 border border-amber-400/30 px-4 py-3 mb-3 text-center">
                        <p class="text-amber-200/90 text-xs">{COST_NOTE}</p>
                    </div>
                    <div class="flex gap-3">
                        <button type="button" onclick={() => respond('interested')} disabled={!!submitting}
                            class="flex-1 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                            {submitting === 'interested' ? 'שולח...' : '💗 מעוניין/ת להמשיך'}
                        </button>
                        <button type="button" onclick={() => respond('declined')} disabled={!!submitting}
                            class="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-gray-200 font-bold py-3 rounded-xl transition-colors">
                            {submitting === 'declined' ? '...' : 'לא מעוניין/ת'}
                        </button>
                    </div>
                {/if}
                {#if errMsg}<p class="text-red-400 text-sm text-center mt-2">{errMsg}</p>{/if}
            </div>

        {:else}
            <!-- תצוגת שדכן/אדמין: סקירה + טלפונים לקידום -->
            <div class="text-center mb-5">
                <div class="text-3xl mb-2">🧩</div>
                <h1 class="text-xl font-black">מעקב שידוך</h1>
                <p class="text-gray-400 text-sm mt-1">
                    סטטוס: <span class="font-bold text-white">{stage === 'mutual' ? '💞 עניין הדדי' : stage === 'closed' ? 'נסגר' : 'ממתין לתשובות'}</span>
                </p>
            </div>

            <div class="space-y-4">
                {#each [{ c: data.aCard, r: data.aResponse, ph: data.aPhone }, { c: data.bCard, r: data.bResponse, ph: data.bPhone }] as sideItem}
                    {#if sideItem.c}
                        <div>
                            <div class="flex items-center justify-between mb-1 px-1">
                                <span class="text-xs font-bold {sideItem.r === 'interested' ? 'text-emerald-300' : sideItem.r === 'declined' ? 'text-red-400' : 'text-gray-400'}">
                                    {sideItem.r === 'interested' ? '✓ מעוניין/ת' : sideItem.r === 'declined' ? '✗ לא מעוניין/ת' : '⏳ ממתין/ה'}
                                </span>
                                {#if stage === 'mutual' && sideItem.ph}
                                    <a href={`tel:${sideItem.ph}`} dir="ltr" class="text-xs font-bold text-pink-300 hover:text-pink-200">📞 {sideItem.ph}</a>
                                {/if}
                            </div>
                            {@render cardView(sideItem.c)}
                        </div>
                    {/if}
                {/each}
            </div>

            {#if stage === 'mutual'}
                <p class="text-center text-amber-200/80 text-xs mt-4">שני הצדדים מעוניינים — צרו קשר לתיאום. העלות מסוכמת מולך ישירות.</p>
            {/if}
        {/if}
    </div>
</div>
