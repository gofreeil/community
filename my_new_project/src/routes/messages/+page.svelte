<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // === מצב הודעות משותף עם דף הפרופיל (localStorage) ===
    // ה-IDs בפרופיל בפורמט `db-${documentId}`; שומרים על אותו פורמט כדי שהפעולות יסונכרנו.
    const MSG_DELETED_KEY = 'msgs_deleted_v1';   // נקראו/הוסרו מהפרופיל
    const MSG_ARCHIVED_KEY = 'msgs_archived_v1'; // נשמרו לארכיון

    function loadIdSet(key: string): Set<string> {
        if (typeof localStorage === 'undefined') return new Set();
        try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); }
        catch { return new Set(); }
    }
    function saveSet(key: string, set: Set<string>) {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, JSON.stringify([...set]));
    }

    let view = $state<'all' | 'archive'>('all');

    const localId = (id: string) => `db-${id}`;

    // מקור האמת לסטטוס "שמור" הוא השרת (status='archived') כדי שמחיקת ה-60 יום תדלג עליו
    function isArchived(m: { status: string }): boolean { return m.status === 'archived'; }

    // עדכון מקביל של ה-localStorage המשותף עם הפרופיל (כדי שהארכוב יסונכרן לתצוגת ההתראות שם)
    function mirrorArchiveToProfile(id: string, archived: boolean) {
        const lid = localId(id);
        const set = loadIdSet(MSG_ARCHIVED_KEY);
        if (archived) set.add(lid); else set.delete(lid);
        saveSet(MSG_ARCHIVED_KEY, set);
    }

    // החזרת הודעה לסטטוס "לא נקרא" → תחזור לדף הפרופיל כהתראה פעילה.
    // מסירים אותה מ"נמחקו/נקראו" וגם מהארכיון ב-localStorage של הפרופיל.
    function markUnread(id: string) {
        const lid = localId(id);
        const nd = loadIdSet(MSG_DELETED_KEY);  nd.delete(lid); saveSet(MSG_DELETED_KEY, nd);
        const na = loadIdSet(MSG_ARCHIVED_KEY); na.delete(lid); saveSet(MSG_ARCHIVED_KEY, na);
    }

    let archiveCount = $derived((data.messages ?? []).filter(isArchived).length);

    // ההודעות לתצוגה לפי הטאב הנבחר
    let displayed = $derived(
        (data.messages ?? []).filter((m) => view === 'archive' ? isArchived(m) : true)
    );

    function getSender(extraFields: string): { name: string; phone: string } {
        try {
            const ef = JSON.parse(extraFields);
            return { name: ef.sender_name ?? '', phone: ef.sender_phone ?? '' };
        } catch {
            return { name: '', phone: '' };
        }
    }

    function getItemLabel(extraFields: string): string {
        try { return JSON.parse(extraFields)?.item_label ?? ''; }
        catch { return ''; }
    }

    function formatDate(iso: string): string {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return 'עכשיו';
        if (mins < 60) return `לפני ${mins} דק'`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `לפני ${hours} שע'`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'אתמול';
        return `לפני ${days} ימים`;
    }

    // כמה ימים נותרו עד מחיקה אוטומטית (60 יום מיצירת ההודעה)
    function daysLeft(iso: string): number {
        if (!iso) return 60;
        const age = Date.now() - new Date(iso).getTime();
        return Math.max(0, 60 - Math.floor(age / 86400000));
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }
</script>

<svelte:head>
    <title>הודעות אישיות | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-8" dir="rtl">

    <!-- Header -->
    <div class="mb-4">
        <h1 class="text-2xl font-black text-white flex items-center gap-2">
            ✉️ הודעות אישיות
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">{data.messages.length} הודעות</p>
    </div>

    <!-- טאבים + מחיקת הכל -->
    {#if data.messages.length > 0}
        <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div class="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                    onclick={() => view = 'all'}
                    class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer {view === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}"
                >
                    הכל
                </button>
                <button
                    onclick={() => view = 'archive'}
                    class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer {view === 'archive' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}"
                >
                    📌 שמורות ({archiveCount})
                </button>
            </div>

            <form method="POST" action="?/deleteAll" use:enhance>
                <button
                    type="submit"
                    onclick={(e) => { if (!confirm('למחוק לצמיתות את כל ההודעות? פעולה זו אינה הפיכה.')) e.preventDefault(); }}
                    class="px-3 py-1.5 rounded-lg bg-red-600/15 text-red-300 border border-red-500/30 hover:bg-red-600/30 text-sm font-bold transition-all cursor-pointer"
                >
                    🗑 מחק הכל
                </button>
            </form>
        </div>
    {/if}

    {#if displayed.length === 0}
        <div class="text-center py-16">
            <div class="text-5xl mb-3">{view === 'archive' ? '📌' : '📭'}</div>
            <p class="font-bold text-lg text-gray-400">
                {view === 'archive' ? 'אין הודעות שמורות' : 'אין הודעות עדיין'}
            </p>
            <p class="text-gray-500 text-sm mt-1">
                {view === 'archive'
                    ? 'הודעות שתסמן לשמירה יישמרו כאן ולא יימחקו מהתצוגה בפרופיל'
                    : 'כשמישהו ישלח לך הודעה בנוגע למודעה שפרסמת - היא תופיע כאן'}
            </p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each displayed as msg}
                {@const sender    = getSender(msg.extra_fields)}
                {@const itemLabel = getItemLabel(msg.extra_fields)}
                {@const archived  = isArchived(msg)}
                {@const left      = daysLeft(msg.created_at)}
                <div class="rounded-2xl border p-4 transition-all {archived ? 'border-amber-500/40 bg-amber-900/10' : 'border-purple-500/20 bg-purple-900/10 hover:bg-purple-900/20'}">
                    <!-- Header row -->
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                {sender.name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <p class="text-white font-bold text-sm leading-tight flex items-center gap-1">
                                    {sender.name || 'אנונימי'}
                                    {#if archived}<span class="text-amber-400 text-xs">📌 שמור</span>{/if}
                                </p>
                                {#if itemLabel}
                                    <p class="text-gray-500 text-xs">בנוגע ל: {itemLabel}</p>
                                {/if}
                            </div>
                        </div>
                        <span class="text-gray-500 text-xs flex-shrink-0">{formatDate(msg.created_at)}</span>
                    </div>

                    <!-- Message body -->
                    <p class="text-gray-300 text-sm leading-relaxed bg-white/5 rounded-xl px-4 py-3 mb-3">
                        {msg.description}
                    </p>

                    <!-- Reply buttons -->
                    {#if sender.phone}
                        <div class="flex gap-2 mb-3">
                            <a href="tel:{sender.phone}"
                                class="flex-1 text-center py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm font-bold transition-all border border-blue-500/30">
                                📞 {sender.phone}
                            </a>
                            <a href={waLink(sender.phone)} target="_blank" rel="noopener noreferrer"
                                aria-label="שלח הודעת וואטסאפ (נפתח בחלון חדש)"
                                class="px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white text-sm font-bold transition-all border border-green-500/30">
                                💬 וואטסאפ
                            </a>
                        </div>
                    {/if}

                    <!-- Action buttons -->
                    <div class="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
                        <form method="POST" action="?/setArchive" use:enhance={() => { mirrorArchiveToProfile(msg.id, !archived); return async ({ update }) => update({ reset: false }); }}>
                            <input type="hidden" name="id" value={msg.id} />
                            <input type="hidden" name="archived" value={archived ? '0' : '1'} />
                            <button
                                type="submit"
                                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border {archived ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}"
                            >
                                {archived ? '✓ הסר מהשמורים' : '📌 שמור (ארכיון)'}
                            </button>
                        </form>

                        <button
                            onclick={() => markUnread(msg.id)}
                            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20"
                            title="ההודעה תחזור כהתראה לא-נקראה בדף הפרופיל"
                        >
                            🔔 החזר ללא-נקרא
                        </button>

                        <form method="POST" action="?/delete" use:enhance class="ms-auto">
                            <input type="hidden" name="id" value={msg.id} />
                            <button
                                type="submit"
                                onclick={(e) => { if (!confirm('למחוק לצמיתות את ההודעה הזו? פעולה זו אינה הפיכה.')) e.preventDefault(); }}
                                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20"
                            >
                                🗑 מחק לצמיתות
                            </button>
                        </form>
                    </div>

                    <!-- מונה מחיקה אוטומטית / סטטוס שמור -->
                    {#if archived}
                        <p class="text-amber-400/70 text-[11px] mt-2">
                            📌 שמור - לא יימחק אוטומטית
                        </p>
                    {:else}
                        <p class="text-gray-600 text-[11px] mt-2">
                            ⏳ תימחק אוטומטית בעוד {left} {left === 1 ? 'יום' : 'ימים'}
                        </p>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    <!-- הסבר על מחיקה אוטומטית -->
    <div class="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
        <p class="text-gray-400 text-xs leading-relaxed">
            ℹ️ כל ההודעות נמחקות אוטומטית מהמערכת לאחר <span class="font-bold text-gray-300">60 יום</span>.
            כדי לשמור הודעה לאורך זמן - סמן אותה בכפתור <span class="font-bold text-amber-300">📌 שמור</span>.
        </p>
    </div>

    <!-- Back -->
    <div class="text-center mt-6">
        <a href="/profile" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← חזרה לפרופיל
        </a>
    </div>
</div>
