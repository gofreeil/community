<script lang="ts">
    import { enhance } from '$app/forms';
    import { get } from 'svelte/store';
    import { _ } from 'svelte-i18n';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // === מצב הודעות משותף עם דף הפרופיל (localStorage) ===
    // ה-IDs בפרופיל בפורמט `db-${documentId}`; שומרים על אותו פורמט כדי שהפעולות יסונכרנו.
    const MSG_DELETED_KEY = 'msgs_deleted_v1';   // נקראו/הוסרו מהפרופיל
    const MSG_ARCHIVED_KEY = 'msgs_archived_v1'; // נשמרו לארכיון
    const MSG_SNOOZED_KEY = 'msgs_snoozed_v1';   // נודניק (מפה id→תפוגה) — משותף עם הפרופיל וה-Header

    function loadIdSet(key: string): Set<string> {
        if (typeof localStorage === 'undefined') return new Set();
        try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); }
        catch { return new Set(); }
    }
    function saveSet(key: string, set: Set<string>) {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, JSON.stringify([...set]));
        // מעדכן את עיגול ההודעות בהדר מיד (ארכוב/החזרה-ללא-נקרא) במקום להמתין לפול ה-30 שנ'
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('msgs:changed'));
    }

    let view = $state<'all' | 'archive'>('all');

    const localId = (id: string) => `db-${id}`;

    // מקור האמת לסטטוס "שמור" הוא השרת (status='archived') כדי שהמחיקה האוטומטית (100 הודעות/3 חודשים) תדלג עליו
    function isArchived(m: { status: string }): boolean { return m.status === 'archived'; }

    // עדכון מקביל של ה-localStorage המשותף עם הפרופיל (כדי שהארכוב יסונכרן לתצוגת ההתראות שם)
    function mirrorArchiveToProfile(id: string, archived: boolean) {
        const lid = localId(id);
        const set = loadIdSet(MSG_ARCHIVED_KEY);
        if (archived) set.add(lid); else set.delete(lid);
        saveSet(MSG_ARCHIVED_KEY, set);
    }

    // שמירת מצב ההודעה בשרת (חוצה-מכשירים) - fire-and-forget
    function persistMsgState(id: string, patch: Record<string, unknown>) {
        fetch('/api/messages/state', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id, ...patch }),
        }).catch(() => {});
    }

    // החזרת הודעה לסטטוס "לא נקרא" → תחזור לדף הפרופיל כהתראה פעילה.
    // מסירים אותה מ"נמחקו/נקראו" וגם מהארכיון ב-localStorage של הפרופיל, וגם מאפסים
    // את המצב בשרת (read/dismissed/snooze/archived) כדי שתחזור כפעילה בכל המכשירים.
    function markUnread(id: string) {
        const lid = localId(id);
        const nd = loadIdSet(MSG_DELETED_KEY);  nd.delete(lid); saveSet(MSG_DELETED_KEY, nd);
        const na = loadIdSet(MSG_ARCHIVED_KEY); na.delete(lid); saveSet(MSG_ARCHIVED_KEY, na);
        // גם מפת הנודניק המקומית - אחרת "נודניק" קודם בפרופיל היה משאיר את ההודעה
        // מוסתרת במכשיר הזה עד יומיים למרות שביקשנו להחזירה כלא-נקראה
        if (typeof localStorage !== 'undefined') {
            try {
                const sn = JSON.parse(localStorage.getItem(MSG_SNOOZED_KEY) ?? '{}') ?? {};
                if (lid in sn) { delete sn[lid]; localStorage.setItem(MSG_SNOOZED_KEY, JSON.stringify(sn)); }
            } catch { /* ignore */ }
        }
        persistMsgState(id, { read: false, dismissed: false, snooze_until: 0, archived: false });
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

    // הודעת השלמת-פרופיל (דרגות) מקבלת כפתור קיצור לדף הפרופיל
    function isTierUpgrade(extraFields: string): boolean {
        try { return JSON.parse(extraFields)?.type === 'tier_upgrade'; }
        catch { return false; }
    }

    function formatDate(iso: string): string {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const t = get(_);
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return t('extras.m_now');
        if (mins < 60) return t('extras.m_mins_ago', { values: { n: mins } });
        const hours = Math.floor(mins / 60);
        if (hours < 24) return t('extras.m_hours_ago', { values: { n: hours } });
        const days = Math.floor(hours / 24);
        if (days === 1) return t('extras.m_yesterday');
        return t('extras.m_days_ago', { values: { n: days } });
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
            {$_('extras.m_title')}
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">{$_('extras.m_count', { values: { n: data.messages.length } })}</p>
    </div>

    <!-- הסבר חד-פעמי על מחיקה אוטומטית -->
    {#if data.messages.length > 0}
        <div class="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
            <p class="text-gray-400 text-xs leading-relaxed text-center">
                {$_('extras.m_auto_1')} <span class="font-bold text-gray-300">{$_('extras.m_auto_days')}</span> {$_('extras.m_auto_2')} <span class="font-bold text-amber-300">{$_('extras.m_auto_save')}</span>.
            </p>
        </div>
    {/if}

    <!-- טאבים + מחיקת הכל -->
    {#if data.messages.length > 0}
        <div class="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div class="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                    onclick={() => view = 'all'}
                    class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer {view === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}"
                >
                    {$_('extras.m_tab_all')}
                </button>
                <button
                    onclick={() => view = 'archive'}
                    class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer {view === 'archive' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}"
                >
                    {$_('extras.m_tab_saved', { values: { n: archiveCount } })}
                </button>
            </div>

            <form method="POST" action="?/deleteAll" use:enhance>
                <button
                    type="submit"
                    onclick={(e) => { if (!confirm(get(_)('extras.m_confirm_delete_all'))) e.preventDefault(); }}
                    class="px-3 py-1.5 rounded-lg bg-red-600/15 text-red-300 border border-red-500/30 hover:bg-red-600/30 text-sm font-bold transition-all cursor-pointer"
                >
                    {$_('extras.m_delete_all')}
                </button>
            </form>
        </div>
    {/if}

    {#if displayed.length === 0}
        <div class="text-center py-16">
            <div class="text-5xl mb-3">{view === 'archive' ? '📌' : '📭'}</div>
            <p class="font-bold text-lg text-gray-400">
                {view === 'archive' ? $_('extras.m_empty_saved') : $_('extras.m_empty_all')}
            </p>
            <p class="text-gray-500 text-sm mt-1">
                {view === 'archive'
                    ? $_('extras.m_empty_saved_sub')
                    : $_('extras.m_empty_all_sub')}
            </p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each displayed as msg}
                {@const sender    = getSender(msg.extra_fields)}
                {@const itemLabel = getItemLabel(msg.extra_fields)}
                {@const archived  = isArchived(msg)}
                <div class="rounded-2xl border p-4 transition-all {archived ? 'border-amber-500/40 bg-amber-900/10' : 'border-purple-500/20 bg-purple-900/10 hover:bg-purple-900/20'}">
                    <!-- Header row -->
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                {sender.name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <p class="text-white font-bold text-sm leading-tight flex items-center gap-1">
                                    {sender.name || $_('extras.m_anonymous')}
                                    {#if archived}<span class="text-amber-400 text-xs">{$_('extras.m_saved_badge')}</span>{/if}
                                </p>
                                {#if itemLabel}
                                    <p class="text-gray-500 text-xs">{$_('extras.m_regarding', { values: { label: itemLabel } })}</p>
                                {/if}
                            </div>
                        </div>
                        <span class="text-gray-500 text-xs flex-shrink-0">{formatDate(msg.created_at)}</span>
                    </div>

                    <!-- Message body -->
                    <p class="text-gray-300 text-sm leading-relaxed bg-white/5 rounded-xl px-4 py-3 mb-3">
                        {msg.description}
                    </p>

                    <!-- קיצור להשלמת הפרופיל בהודעת דרגות -->
                    {#if isTierUpgrade(msg.extra_fields)}
                        <a href="/profile"
                            class="block text-center py-2 rounded-xl mb-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white text-sm font-bold transition-all">
                            {$_('extras.m_complete_profile')}
                        </a>
                    {/if}

                    <!-- Reply buttons -->
                    {#if sender.phone}
                        <div class="flex gap-2 mb-3">
                            <a href="tel:{sender.phone}"
                                class="flex-1 text-center py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-sm font-bold transition-all border border-blue-500/30">
                                📞 {sender.phone}
                            </a>
                            <a href={waLink(sender.phone)} target="_blank" rel="noopener noreferrer"
                                aria-label={$_('extras.m_wa_aria')}
                                class="px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white text-sm font-bold transition-all border border-green-500/30">
                                {$_('extras.m_whatsapp')}
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
                                {archived ? $_('extras.m_unsave') : $_('extras.m_save_archive')}
                            </button>
                        </form>

                        <button
                            onclick={() => markUnread(msg.id)}
                            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20"
                            title={$_('extras.m_mark_unread_title')}
                        >
                            {$_('extras.m_mark_unread')}
                        </button>

                        <form method="POST" action="?/delete" use:enhance class="ms-auto">
                            <input type="hidden" name="id" value={msg.id} />
                            <button
                                type="submit"
                                onclick={(e) => { if (!confirm(get(_)('extras.m_confirm_delete'))) e.preventDefault(); }}
                                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20"
                            >
                                {$_('extras.m_delete')}
                            </button>
                        </form>
                    </div>

                    {#if archived}
                        <p class="text-amber-400/70 text-[11px] mt-2">
                            {$_('extras.m_saved_note')}
                        </p>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    <!-- Back -->
    <div class="text-center mt-6">
        <a href="/profile" class="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            {$_('extras.m_back_profile')}
        </a>
    </div>
</div>
