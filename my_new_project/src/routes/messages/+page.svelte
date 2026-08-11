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

    // === טוסט צף בתחתית המסך (דפוס loc-toast מדף הפרופיל) - משוב נראה לפעולות שאין להן ביטוי מיידי בכרטיס ===
    let toast = $state<{ kind: 'ok' | 'error'; text: string; key: number } | null>(null);
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    function showToast(kind: 'ok' | 'error', text: string) {
        if (toastTimer) clearTimeout(toastTimer);
        toast = { kind, text, key: Date.now() }; // key ייחודי מפעיל את האנימציה מחדש גם כשטוסט כבר מוצג
        toastTimer = setTimeout(() => (toast = null), 4000); // תואם את משך אנימציית msgToastInOut
    }

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

    // שמירת מצב ההודעה בשרת (חוצה-מכשירים) - מחזיר את ה-Response כדי שהקורא יוכל לוודא הצלחה
    function persistMsgState(id: string, patch: Record<string, unknown>): Promise<Response> {
        return fetch('/api/messages/state', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id, ...patch }),
        });
    }

    // החזרת הודעה לסטטוס "לא נקרא" → תחזור לדף הפרופיל כהתראה פעילה.
    // מסירים אותה מ"נמחקו/נקראו" וגם מהארכיון ב-localStorage של הפרופיל, וגם מאפסים
    // את המצב בשרת (read/dismissed/snooze/archived) כדי שתחזור כפעילה בכל המכשירים.
    async function markUnread(id: string) {
        const lid = localId(id);
        // שומרים מה השתנה מקומית כדי שנוכל לשחזר אם השמירה בשרת תיכשל
        const nd = loadIdSet(MSG_DELETED_KEY);  const wasDeleted = nd.delete(lid);  saveSet(MSG_DELETED_KEY, nd);
        const na = loadIdSet(MSG_ARCHIVED_KEY); const wasArchived = na.delete(lid); saveSet(MSG_ARCHIVED_KEY, na);
        // גם מפת הנודניק המקומית - אחרת "נודניק" קודם בפרופיל היה משאיר את ההודעה
        // מוסתרת במכשיר הזה עד יומיים למרות שביקשנו להחזירה כלא-נקראה
        let prevSnooze: number | undefined;
        if (typeof localStorage !== 'undefined') {
            try {
                const sn = JSON.parse(localStorage.getItem(MSG_SNOOZED_KEY) ?? '{}') ?? {};
                if (lid in sn) { prevSnooze = sn[lid]; delete sn[lid]; localStorage.setItem(MSG_SNOOZED_KEY, JSON.stringify(sn)); }
            } catch { /* ignore */ }
        }
        // ממתינים לשמירה בשרת - כשל שקט היה משאיר את ההודעה "נקראה" לתמיד בכל שאר המכשירים
        try {
            const res = await persistMsgState(id, { read: false, dismissed: false, snooze_until: 0, archived: false });
            if (!res.ok) throw new Error(`state save failed: ${res.status}`);
            showToast('ok', get(_)('extras.m_unread_ok'));
        } catch {
            // משחזרים את המצב המקומי כדי שיישאר עקבי עם השרת
            const rd = loadIdSet(MSG_DELETED_KEY);  if (wasDeleted)  rd.add(lid); saveSet(MSG_DELETED_KEY, rd);
            const ra = loadIdSet(MSG_ARCHIVED_KEY); if (wasArchived) ra.add(lid); saveSet(MSG_ARCHIVED_KEY, ra);
            if (prevSnooze !== undefined && typeof localStorage !== 'undefined') {
                try {
                    const sn = JSON.parse(localStorage.getItem(MSG_SNOOZED_KEY) ?? '{}') ?? {};
                    sn[lid] = prevSnooze; localStorage.setItem(MSG_SNOOZED_KEY, JSON.stringify(sn));
                } catch { /* ignore */ }
            }
            showToast('error', get(_)('extras.m_unread_error'));
        }
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

    // הודעת "בקשת פרסום חדשה" נושאת יעד פעולה ב-extra_fields.review_link.
    // בלי הכפתור הזה הנתיב מופיע בגוף ההודעה כטקסט בלבד ואי אפשר ללחוץ עליו.
    // מאשרים רק נתיב פנימי (מתחיל ב-"/") כדי שלא ייווצר יעד חיצוני מהדאטה.
    function adsReviewLink(extraFields: string): string {
        try {
            const f = JSON.parse(extraFields);
            if (f?.type !== 'ad_submission') return '';
            const l = typeof f.review_link === 'string' ? f.review_link : '';
            return l.startsWith('/') ? l : '/admin/ads-review';
        } catch { return ''; }
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

<div class="dense-zone max-w-2xl mx-auto px-4 py-8" dir="rtl">

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

            <form method="POST" action="?/deleteAll" use:enhance={() => {
                // משוב נראה גם כשהמחיקה נכשלת - אחרת ההודעות פשוט חוזרות בלי הסבר
                return async ({ result, update }) => {
                    if (result.type === 'failure') {
                        const err = (result.data as { error?: string } | undefined)?.error;
                        showToast('error', err || get(_)('extras.m_delete_all_error'));
                    } else if (result.type === 'error') {
                        showToast('error', get(_)('extras.m_delete_all_error'));
                    } else if (result.type === 'success') {
                        showToast('ok', get(_)('extras.m_delete_all_ok'));
                    }
                    await update();
                };
            }}>
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
                    <p class="text-gray-300 text-sm leading-relaxed bg-white/5 rounded-xl px-4 py-3 mb-3 whitespace-pre-line break-words">
                        {msg.description}
                    </p>

                    <!-- קיצור להשלמת הפרופיל בהודעת דרגות -->
                    {#if isTierUpgrade(msg.extra_fields)}
                        <a href="/profile"
                            class="block text-center py-2 rounded-xl mb-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white text-sm font-bold transition-all">
                            {$_('extras.m_complete_profile')}
                        </a>
                    {/if}

                    <!-- קיצור לעמוד אישור הפרסומות בהודעה על בקשת פרסום חדשה -->
                    {#if adsReviewLink(msg.extra_fields)}
                        <a href={adsReviewLink(msg.extra_fields)}
                            class="block text-center py-2 rounded-xl mb-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-black text-sm font-black transition-all">
                            {$_('extras.m_open_ads_review')}
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

<!-- טוסט משוב צף (הצלחה/שגיאה) - נעלם לבד אחרי 4 שניות; דפוס loc-toast מדף הפרופיל -->
{#if toast}
    {#key toast.key}
        <div class="fixed bottom-6 left-1/2 z-[100] w-max max-w-xs md:max-w-sm msg-toast" role="status" aria-live="polite">
            <div class="rounded-2xl bg-gray-900 border shadow-2xl px-5 py-3.5 flex items-center gap-3 {toast.kind === 'ok' ? 'border-emerald-500/50' : 'border-red-500/50'}">
                <span class="text-xl leading-none flex-shrink-0">{toast.kind === 'ok' ? '✅' : '⚠️'}</span>
                <p class="flex-1 min-w-0 text-sm font-bold leading-snug {toast.kind === 'ok' ? 'text-emerald-300' : 'text-red-200'}">{toast.text}</p>
            </div>
        </div>
    {/key}
{/if}

<style>
    /* טוסט המשוב - עולה מלמטה ונמוג לקראת ההיעלמות האוטומטית (4 שניות) */
    @keyframes msgToastInOut {
        0% {
            opacity: 0;
            transform: translate(-50%, 12px);
        }
        8%, 88% {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, 6px);
        }
    }
    .msg-toast {
        animation: msgToastInOut 4s ease-out forwards;
    }
</style>
