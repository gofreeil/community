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

    let cards = $derived(
        (tab === 'pending' ? data.pending : data.active).filter(
            (c: Card) => gender === 'all' || c.gender === gender,
        ),
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
        <div class="flex gap-2 mb-6 items-center flex-wrap">
            <span class="text-gray-400 text-sm">בחן לוח:</span>
            {#each [['all', 'הכל'], ['male', '👨 גברים'], ['female', '👩 נשים']] as [val, lbl]}
                <button
                    onclick={() => (gender = val as typeof gender)}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {gender === val ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{lbl}</button>
            {/each}
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
                            </div>
                            <a href="/items/{c.id}" target="_blank" class="shrink-0 text-xs bg-black/30 hover:bg-black/50 text-white px-3 py-1.5 rounded-lg transition-colors">👁️ דף מלא</a>
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
