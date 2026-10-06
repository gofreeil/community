<script lang="ts">
    import { onMount } from 'svelte';

    // "קומה" של צוות השדכנים בכלי השדכן: רשימת המאושרים, עם הסתרה (נשמרת בדפדפן)
    type Member = { userId: string; nickname: string; gender: string; city: string; neighborhood: string; phone: string };

    const STORAGE_KEY = 'mm_team_open';

    let team = $state<Member[] | null>(null);
    let meId = $state('');
    let failed = $state(false);
    let open = $state(true);

    onMount(() => {
        try { if (localStorage.getItem(STORAGE_KEY) === '0') open = false; } catch { /* ללא אחסון */ }
        fetch('/api/matchmaker-team')
            .then((r) => r.json())
            .then((out) => {
                if (out?.success) { team = out.team; meId = out.meId; }
                else failed = true;
            })
            .catch(() => { failed = true; });
    });

    function toggle() {
        open = !open;
        try { localStorage.setItem(STORAGE_KEY, open ? '1' : '0'); } catch { /* ללא אחסון */ }
    }

    const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '972')}`;
    const genderIcon = (g: string) => (g === 'female' ? '👩' : g === 'male' ? '👨' : '💘');
</script>

<div class="mb-4 rounded-2xl bg-[#0f172a] border border-purple-400/30 overflow-hidden">
    <button
        type="button"
        onclick={toggle}
        aria-expanded={open}
        class="w-full flex items-center gap-2.5 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/15 transition-colors text-right"
    >
        <span class="text-lg">👥</span>
        <span class="flex-1 font-black text-purple-100 text-sm">
            צוות השדכנים{#if team} <span class="text-purple-300/80 font-bold">· {team.length}</span>{/if}
        </span>
        <span class="text-xs text-purple-200/80">{open ? 'הסתר ▴' : 'הצג ▾'}</span>
    </button>

    {#if open}
        <div class="px-3 py-3 border-t border-purple-400/20">
            {#if failed}
                <p class="text-center text-xs text-gray-500">לא הצלחנו לטעון את הצוות</p>
            {:else if team === null}
                <p class="text-center text-xs text-gray-500">טוען...</p>
            {:else if team.length === 0}
                <p class="text-center text-xs text-gray-500">עדיין אין שדכנים מאושרים</p>
            {:else}
                <div class="flex flex-wrap gap-2">
                    {#each team as m (m.userId || m.nickname)}
                        <div class="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 ps-2.5 pe-2 py-1 {m.userId === meId ? 'ring-1 ring-pink-400/50' : ''}">
                            <span class="text-sm">{genderIcon(m.gender)}</span>
                            <span class="text-xs font-bold text-white">{m.nickname || 'שדכן/ית'}</span>
                            {#if m.city}<span class="text-[11px] text-gray-400">· {m.city}</span>{/if}
                            {#if m.userId === meId}<span class="text-[10px] font-bold text-pink-300">(את/ה)</span>{/if}
                            {#if m.phone}
                                <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer"
                                   class="text-[10px] font-bold bg-green-600 hover:bg-green-500 text-white rounded-full px-2 py-0.5 transition-colors"
                                   aria-label="וואטסאפ ל{m.nickname}">וואטסאפ</a>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
