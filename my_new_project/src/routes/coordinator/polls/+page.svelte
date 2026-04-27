<script lang="ts">
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let optionCount = $state(2);

    function pct(count: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((count / total) * 100);
    }
</script>

<svelte:head>
    <title>ניהול משאלים | רכז שכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <div class="mb-2">
            <a href="/coordinator" class="text-gray-500 hover:text-white text-sm">← חזרה לפאנל רכז</a>
        </div>
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🗳️</span>
            <h1 class="text-3xl font-black text-white mb-2">ניהול משאלים</h1>
            <p class="text-gray-400">{data.polls.length} משאלים בשכונותיך</p>
        </div>

        {#if form?.error}
            <div class="rounded-xl bg-red-900/30 border border-red-500/30 p-3 mb-4 text-center text-red-200 text-sm">
                {form.error}
            </div>
        {/if}
        {#if form?.success}
            <div class="rounded-xl bg-green-900/30 border border-green-500/30 p-3 mb-4 text-center text-green-200 text-sm">
                {form.action === 'created' ? '✓ המשאל נוצר' : form.action === 'closed' ? '✓ המשאל נסגר' : '✓ נמחק'}
            </div>
        {/if}

        <!-- Create poll form -->
        <div class="rounded-2xl bg-[#0f172a] border border-purple-500/30 p-5 mb-6">
            <h2 class="text-white font-bold text-lg mb-3">➕ צור משאל חדש</h2>
            <form method="POST" action="?/create" class="space-y-3">
                <div>
                    <label for="question" class="text-white text-sm font-bold mb-1 block">שאלת המשאל *</label>
                    <input id="question" name="question" required placeholder="לדוגמה: האם להוסיף גן שעשועים בכיכר?" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                    <label for="description" class="text-white text-sm font-bold mb-1 block">פירוט נוסף</label>
                    <textarea id="description" name="description" rows="2" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"></textarea>
                </div>
                <div>
                    <label for="neighborhood" class="text-white text-sm font-bold mb-1 block">שכונה</label>
                    <select id="neighborhood" name="neighborhood" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white">
                        {#each data.myNeighborhoods as n}
                            <option value={n}>{n}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <p class="text-white text-sm font-bold mb-2">אפשרויות הצבעה (2-6)</p>
                    <div class="space-y-2">
                        {#each Array(optionCount) as _, i}
                            <input
                                name="option"
                                placeholder={`אפשרות ${i + 1}`}
                                required={i < 2}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            />
                        {/each}
                    </div>
                    <div class="flex gap-2 mt-2">
                        {#if optionCount < 6}
                            <button type="button" onclick={() => optionCount++} class="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg">+ הוסף אפשרות</button>
                        {/if}
                        {#if optionCount > 2}
                            <button type="button" onclick={() => optionCount--} class="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg">- הסר אפשרות</button>
                        {/if}
                    </div>
                </div>

                <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all">
                    צור משאל
                </button>
            </form>
        </div>

        <!-- Polls list -->
        <div class="space-y-4">
            {#each data.polls as p}
                <div class="rounded-2xl bg-[#0f172a] border border-white/10 p-5">
                    <div class="flex items-start justify-between gap-3 mb-3">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-white font-bold text-lg">{p.label}</h3>
                                {#if p.status === 'active'}
                                    <span class="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">פעיל</span>
                                {:else}
                                    <span class="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">סגור</span>
                                {/if}
                            </div>
                            <p class="text-gray-500 text-xs">📍 {p.neighborhood} · 🗳️ {p.total} מצביעים</p>
                            {#if p.description}
                                <p class="text-gray-400 text-sm mt-1">{p.description}</p>
                            {/if}
                        </div>
                        <div class="flex flex-col gap-2 flex-shrink-0">
                            {#if p.status === 'active'}
                                <form method="POST" action="?/close" onsubmit={(e) => { if (!confirm('לסגור את המשאל לקבלת קולות?')) e.preventDefault(); }}>
                                    <input type="hidden" name="id" value={p.id} />
                                    <button type="submit" class="bg-yellow-600/40 hover:bg-yellow-600/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">🔒 סגור</button>
                                </form>
                            {/if}
                            <form method="POST" action="?/delete" onsubmit={(e) => { if (!confirm('למחוק את המשאל לצמיתות?')) e.preventDefault(); }}>
                                <input type="hidden" name="id" value={p.id} />
                                <button type="submit" class="bg-red-600/40 hover:bg-red-600/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">🗑️ מחק</button>
                            </form>
                        </div>
                    </div>

                    <!-- Results bars -->
                    <div class="space-y-2">
                        {#each p.options as opt}
                            {@const count = p.counts[opt.key] ?? 0}
                            {@const percent = pct(count, p.total)}
                            <div>
                                <div class="flex justify-between text-sm mb-1">
                                    <span class="text-white">{opt.label}</span>
                                    <span class="text-gray-400">{count} ({percent}%)</span>
                                </div>
                                <div class="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all" style="width: {percent}%"></div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}

            {#if data.polls.length === 0}
                <div class="text-center py-12">
                    <span class="text-5xl mb-3 block">🗳️</span>
                    <p class="text-gray-400">עדיין אין משאלים</p>
                    <p class="text-gray-500 text-sm mt-2">צור משאל ראשון לשכונה שלך</p>
                </div>
            {/if}
        </div>
    </div>
</div>
