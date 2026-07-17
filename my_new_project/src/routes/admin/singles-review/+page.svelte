<script lang="ts">
    import type { PageData, ActionData } from './$types';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    type Card = PageData['pending'][number];

    // טאב: ממתינים / מאושרים (כדי לבחון מחדש את לוח הגברים והנשים)
    let tab = $state<'pending' | 'active'>('pending');
    // סינון מגדר לבחינת לוח הגברים/הנשים בנפרד
    let gender = $state<'all' | 'male' | 'female'>('all');
    // סינון נראות: כל הכרטיסים / רק פומביים / רק "לשדכנים שלנו" (דיסקרטיים)
    let vis = $state<'all' | 'public' | 'matchmakers'>('all');

    let cards = $derived(
        (tab === 'pending' ? data.pending : data.active).filter(
            (c: Card) =>
                (gender === 'all' || c.gender === gender) &&
                (vis === 'all' || (c.visibility ?? 'public') === vis),
        ),
    );

    // מספר הכרטיסים הדיסקרטיים (רק לשדכנים) — לתשומת לב הצוות
    let matchmakerOnlyCount = $derived(
        (tab === 'pending' ? data.pending : data.active).filter(
            (c: Card) => c.visibility === 'matchmakers',
        ).length,
    );

    function genderLabel(g: string): string {
        return g === 'male' ? '👨 גבר' : '👩 אישה';
    }
</script>

<svelte:head><title>אישור כרטיסי פנויים | ניהול</title></svelte:head>

<div class="min-h-screen bg-[#070b14] text-white" dir="rtl">
    <div class="max-w-6xl mx-auto px-4 py-8">
        <!-- כותרת -->
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
                <h1 class="text-3xl font-black flex items-center gap-2">💑 אישור כרטיסי פנויים</h1>
                <p class="text-gray-400 mt-1">בדוק שאין תמונות לא צנועות לפני אישור. כרטיס מאושר עולה ללוח; כרטיס שנדחה לא מוצג.</p>
            </div>
            <button
                onclick={() => goto('/admin')}
                class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >← לוח הניהול</button>
        </div>

        <!-- הודעת תוצאה -->
        {#if form?.success}
            <div class="mb-6 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center">
                <p class="text-green-400 text-sm font-medium">{form.message}</p>
            </div>
        {/if}
        {#if form?.error}
            <div class="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-center">
                <p class="text-red-400 text-sm font-medium">{form.error}</p>
            </div>
        {/if}

        <!-- 🔑 בקשות גישה לצפייה בלוח (הורים/שדכנים ללא כרטיס) -->
        {#if data.accessRequests && data.accessRequests.length}
            <div class="mb-6 rounded-2xl bg-[#0f172a] border border-pink-500/30 overflow-hidden">
                <div class="px-4 py-3 bg-gradient-to-r from-pink-600/30 to-purple-600/20 border-b border-pink-500/20 flex items-center gap-2">
                    <span class="text-xl">🔑</span>
                    <h2 class="font-black text-white">בקשות גישה לצפייה בלוח ({data.accessRequests.length})</h2>
                    <span class="text-pink-200/70 text-xs mr-1">מפרסם כרטיס נכנס אוטומטית — אלו מבקשי גישה בלבד (הורים/שדכנים)</span>
                </div>
                <div class="divide-y divide-white/5">
                    {#each data.accessRequests as r (r.id)}
                        <div class="p-4 flex items-center justify-between gap-3 flex-wrap">
                            <div class="min-w-0">
                                <p class="text-white font-bold text-sm">
                                    <span class="inline-block bg-pink-500/15 text-pink-200 px-2 py-0.5 rounded-full text-[12px] font-bold ring-1 ring-pink-400/40">{r.roleLabel || r.role}</span>
                                    <span class="mr-2">{r.nickname || '—'}</span>
                                </p>
                                <p class="text-gray-400 text-xs mt-1">
                                    {#if r.city}📍 {r.city}{#if r.neighborhood} · {r.neighborhood}{/if} · {/if}
                                    {#if r.phone}📞 {r.phone} · {/if}
                                    {#if r.email}✉️ {r.email}{/if}
                                </p>
                            </div>
                            <div class="flex gap-2 flex-shrink-0">
                                <form method="POST" action="?/accessDecision" use:enhance>
                                    <input type="hidden" name="id" value={r.id} />
                                    <input type="hidden" name="decision" value="approved" />
                                    <button class="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-xl transition-colors text-sm">✅ אשר גישה</button>
                                </form>
                                <form method="POST" action="?/accessDecision" use:enhance>
                                    <input type="hidden" name="id" value={r.id} />
                                    <input type="hidden" name="decision" value="rejected" />
                                    <button class="bg-white/5 hover:bg-red-600/30 text-gray-400 hover:text-red-300 font-bold py-2 px-4 rounded-xl transition-colors text-sm border border-white/10">🚫 דחה</button>
                                </form>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- טאבים -->
        <div class="flex gap-2 mb-4 flex-wrap">
            <button
                onclick={() => (tab = 'pending')}
                class="px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer {tab === 'pending' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}"
            >
                ⏳ ממתינים לאישור ({data.pending.length})
            </button>
            <button
                onclick={() => (tab = 'active')}
                class="px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer {tab === 'active' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}"
            >
                ✅ מאושרים בלוח ({data.active.length})
            </button>
        </div>

        <!-- סינון מגדר: בחינת לוח הגברים / הנשים -->
        <div class="flex gap-2 mb-3 items-center flex-wrap">
            <span class="text-gray-400 text-sm">בחן לוח:</span>
            {#each [['all', 'הכל'], ['male', '👨 גברים'], ['female', '👩 נשים']] as [val, lbl]}
                <button
                    onclick={() => (gender = val as typeof gender)}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {gender === val ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{lbl}</button>
            {/each}
        </div>

        <!-- סינון נראות: דיסקרטיים = "רק לשדכנים שלנו", לפנייה יזומה בלבד -->
        <div class="flex gap-2 mb-6 items-center flex-wrap">
            <span class="text-gray-400 text-sm">נראות:</span>
            {#each [['all', 'הכל'], ['public', '🌐 פומביים'], ['matchmakers', '🔒 רק לשדכנים']] as [val, lbl]}
                <button
                    onclick={() => (vis = val as typeof vis)}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {vis === val ? 'bg-purple-500/15 text-purple-200 border-purple-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{lbl}</button>
            {/each}
            {#if matchmakerOnlyCount > 0}
                <span class="text-purple-300/80 text-xs mr-1">({matchmakerOnlyCount} דיסקרטיים לפנייה יזומה)</span>
            {/if}
        </div>

        {#if cards.length === 0}
            <div class="text-center py-20">
                <span class="text-5xl mb-4 block">{tab === 'pending' ? '🎉' : '📭'}</span>
                <p class="text-gray-400 text-lg">{tab === 'pending' ? 'אין כרטיסים שממתינים לאישור' : 'אין כרטיסים מאושרים בקטגוריה זו'}</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {#each cards as c (c.id)}
                    {@const isMale = c.gender === 'male'}
                    <div class="rounded-2xl bg-[#0f172a] border-2 {isMale ? 'border-blue-500/40' : 'border-pink-500/40'} overflow-hidden shadow-xl">
                        <!-- כותרת -->
                        <div class="p-4 flex items-center justify-between gap-3 bg-gradient-to-r {isMale ? 'from-blue-600/80 to-cyan-600/80' : 'from-pink-600/80 to-rose-500/80'}">
                            <div class="min-w-0">
                                <h3 class="text-white font-black text-lg leading-tight">{c.nickname}</h3>
                                <p class="text-white/85 text-sm">{genderLabel(c.gender)} · {c.age || '—'} · {c.city || '—'}</p>
                                {#if c.visibility === 'matchmakers'}
                                    <span class="inline-block mt-1 text-[11px] font-bold bg-black/35 text-purple-100 px-2 py-0.5 rounded-full ring-1 ring-purple-300/40">🔒 רק לשדכנים · לא בלוח הפומבי</span>
                                {/if}
                            </div>
                            <a href="/items/{c.id}" target="_blank" class="shrink-0 text-xs bg-black/30 hover:bg-black/50 text-white px-3 py-1.5 rounded-lg transition-colors">דף מלא</a>
                        </div>

                        <!-- תמונות בגדול לבדיקת צניעות -->
                        <div class="p-4">
                            {#if c.images && c.images.length}
                                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                                    {#each c.images as img}
                                        <a href={img} target="_blank" rel="noopener noreferrer" class="block aspect-square rounded-lg overflow-hidden bg-black/40 ring-1 ring-white/10 hover:ring-amber-400/60">
                                            <img src={img} alt="תמונת פרופיל" class="w-full h-full object-cover" loading="lazy" />
                                        </a>
                                    {/each}
                                </div>
                            {:else}
                                <p class="text-gray-500 text-sm italic mb-3">— אין תמונות שהועלו —</p>
                            {/if}

                            {#if c.description}
                                <p class="text-gray-300 text-sm leading-relaxed mb-3">{c.description}</p>
                            {/if}

                            <!-- מידע לשדכנים בלבד (נאסף בטופס, לא מוצג בלוח הפומבי) -->
                            {#if c.matchPartnerCharacter || c.matchSelfAdvantage}
                                <div class="mb-3 rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                                    <p class="text-[11px] font-bold text-purple-200 mb-2 flex items-center gap-1.5">🔒 מידע לשדכנים · לא בלוח הפומבי</p>
                                    {#if c.matchPartnerCharacter}
                                        <div class="mb-2">
                                            <p class="text-purple-300/80 text-[11px] font-bold">מהו אופי בן הזוג שהוא/היא מחפש/ת</p>
                                            <p class="text-gray-200 text-sm leading-relaxed">{c.matchPartnerCharacter}</p>
                                        </div>
                                    {/if}
                                    {#if c.matchSelfAdvantage}
                                        <div>
                                            <p class="text-purple-300/80 text-[11px] font-bold">היתרון שהוא/היא מביא/ה אל הזוגיות</p>
                                            <p class="text-gray-200 text-sm leading-relaxed">{c.matchSelfAdvantage}</p>
                                        </div>
                                    {/if}
                                </div>
                            {/if}

                            <!-- פעולות -->
                            <div class="flex gap-2 flex-wrap">
                                {#if tab === 'pending'}
                                    <form method="POST" action="?/approve" use:enhance class="flex-1 min-w-[120px]">
                                        <input type="hidden" name="id" value={c.id} />
                                        <button class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">✅ אשר ופרסם</button>
                                    </form>
                                    <form method="POST" action="?/reject" use:enhance class="flex-1 min-w-[120px]">
                                        <input type="hidden" name="id" value={c.id} />
                                        <button class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">🚫 דחה</button>
                                    </form>
                                {:else}
                                    <form method="POST" action="?/unapprove" use:enhance class="flex-1 min-w-[120px]">
                                        <input type="hidden" name="id" value={c.id} />
                                        <button class="w-full bg-amber-600/80 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">⏳ הורד מהלוח</button>
                                    </form>
                                {/if}
                                <form method="POST" action="?/remove" use:enhance class="flex-shrink-0" onsubmit={(e) => { if (!confirm('למחוק את הכרטיס לצמיתות?')) e.preventDefault(); }}>
                                    <input type="hidden" name="id" value={c.id} />
                                    <button class="bg-white/5 hover:bg-red-600/30 text-gray-400 hover:text-red-300 font-bold py-2.5 px-4 rounded-xl transition-colors text-sm border border-white/10">🗑️</button>
                                </form>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
