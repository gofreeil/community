<script lang="ts">
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let editingId = $state<string | null>(null);

    function getRole(extraFields: string): string {
        try { return JSON.parse(extraFields)?.role ?? 'חבר'; }
        catch { return 'חבר'; }
    }

    const ROLE_OPTIONS = ['ראש כיתה', 'סגן ראש כיתה', 'מד"ץ', 'חובש', 'חבר פעיל', 'חבר'];
</script>

<svelte:head>
    <title>ניהול כיתת כוננות | רכז שכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <div class="mb-2">
            <a href="/coordinator" class="text-gray-500 hover:text-white text-sm">← חזרה לפאנל רכז</a>
        </div>
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🚨</span>
            <h1 class="text-3xl font-black text-white mb-2">ניהול כיתת כוננות</h1>
            <p class="text-gray-400">{data.members.length} חברים פעילים</p>
        </div>

        {#if form?.error}
            <div class="rounded-xl bg-red-900/30 border border-red-500/30 p-3 mb-4 text-center text-red-200 text-sm">
                {form.error}
            </div>
        {/if}
        {#if form?.success}
            <div class="rounded-xl bg-green-900/30 border border-green-500/30 p-3 mb-4 text-center text-green-200 text-sm">
                {form.action === 'added' ? '✓ חבר נוסף' : form.action === 'updated' ? '✓ עודכן' : '✓ נמחק'}
            </div>
        {/if}

        <!-- Add member form -->
        <div class="rounded-2xl bg-[#0f172a] border border-red-500/30 p-5 mb-6">
            <h2 class="text-white font-bold text-lg mb-3">➕ הוסף חבר חדש</h2>
            <form method="POST" action="?/add" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label for="name" class="text-white text-sm font-bold mb-1 block">שם מלא *</label>
                    <input id="name" name="name" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                    <label for="phone" class="text-white text-sm font-bold mb-1 block">טלפון *</label>
                    <input id="phone" name="phone" type="tel" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                    <label for="role" class="text-white text-sm font-bold mb-1 block">תפקיד</label>
                    <select id="role" name="role" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white">
                        {#each ROLE_OPTIONS as r}
                            <option value={r}>{r}</option>
                        {/each}
                    </select>
                </div>
                <div>
                    <label for="neighborhood" class="text-white text-sm font-bold mb-1 block">שכונה</label>
                    <select id="neighborhood" name="neighborhood" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white">
                        {#each data.myNeighborhoods as n}
                            <option value={n}>{n}</option>
                        {/each}
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label for="notes" class="text-white text-sm font-bold mb-1 block">הערות</label>
                    <input id="notes" name="notes" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div class="md:col-span-2">
                    <button type="submit" class="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition-all">
                        הוסף לכיתה
                    </button>
                </div>
            </form>
        </div>

        <!-- Members list -->
        <div class="space-y-3">
            {#each data.members as m}
                {@const role = getRole(m.extra_fields)}
                <div class="rounded-2xl bg-[#0f172a] border border-white/10 p-4">
                    {#if editingId === m.id}
                        <form method="POST" action="?/update" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input type="hidden" name="id" value={m.id} />
                            <div>
                                <label for="name-{m.id}" class="text-white text-xs font-bold mb-1 block">שם</label>
                                <input id="name-{m.id}" name="name" value={m.label} required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label for="phone-{m.id}" class="text-white text-xs font-bold mb-1 block">טלפון</label>
                                <input id="phone-{m.id}" name="phone" value={m.phone} required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label for="role-{m.id}" class="text-white text-xs font-bold mb-1 block">תפקיד</label>
                                <select id="role-{m.id}" name="role" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white">
                                    {#each ROLE_OPTIONS as r}
                                        <option value={r} selected={r === role}>{r}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label for="notes-{m.id}" class="text-white text-xs font-bold mb-1 block">הערות</label>
                                <input id="notes-{m.id}" name="notes" value={m.description} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                            </div>
                            <div class="md:col-span-2 flex gap-2">
                                <button type="submit" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-colors text-sm">שמור</button>
                                <button type="button" onclick={() => editingId = null} class="px-4 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg transition-colors text-sm">ביטול</button>
                            </div>
                        </form>
                    {:else}
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-2xl flex-shrink-0">🚨</div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-white font-bold">{m.label}</h3>
                                    <span class="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{role}</span>
                                    <span class="text-xs text-gray-500">📍 {m.neighborhood}</span>
                                </div>
                                <p class="text-gray-400 text-sm">📞 {m.phone}</p>
                                {#if m.description}
                                    <p class="text-gray-500 text-xs mt-1">{m.description}</p>
                                {/if}
                            </div>
                            <div class="flex gap-2 flex-shrink-0">
                                <button onclick={() => editingId = m.id} class="bg-blue-600/40 hover:bg-blue-600/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">✏️ ערוך</button>
                                <form method="POST" action="?/delete" onsubmit={(e) => { if (!confirm(`למחוק את ${m.label}?`)) e.preventDefault(); }}>
                                    <input type="hidden" name="id" value={m.id} />
                                    <button type="submit" class="bg-red-600/40 hover:bg-red-600/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">🗑️ מחק</button>
                                </form>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}

            {#if data.members.length === 0}
                <div class="text-center py-12">
                    <span class="text-5xl mb-3 block">🚨</span>
                    <p class="text-gray-400">עדיין אין חברי כיתה</p>
                    <p class="text-gray-500 text-sm mt-2">הוסף חברים כדי שהציבור יראה אותם</p>
                </div>
            {/if}
        </div>
    </div>
</div>
