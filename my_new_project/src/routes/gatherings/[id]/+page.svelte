<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';
    import { canonical } from '$lib/seo';

    let { data }: { data: PageData } = $props();

    let g = $derived(data.gathering as any);
    let isManager = $derived(data.isManager as boolean);
    let myAttendance = $derived(data.myAttendance as any);
    let myId = $derived((data.user as any)?.id ?? '');

    const hebrewMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    const hebrewDays = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    function formatFullDate(dateStr: string) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `יום ${hebrewDays[d.getDay()]}, ${d.getDate()} ב${hebrewMonths[d.getMonth()]}`;
    }

    function genderIcon(gender: string) {
        const gn = (gender ?? '').toLowerCase();
        if (gn === 'male' || gn === 'גבר') return '👨';
        if (gn === 'female' || gn === 'אישה') return '👩';
        return '🙂';
    }
    function initials(name: string) {
        return (name ?? '').trim().charAt(0) || '?';
    }

    let totalGuests = $derived((g.attendees ?? []).reduce((s: number, a: any) => s + (a.count || 1), 0));
    let claimedCount = $derived((g.food_items ?? []).filter((f: any) => f.claimed_by_id).length);

    // ── UI state ──
    let editing = $state(false);
    let showManagers = $state(false);
    let rsvpCount = $state(myAttendance?.count ?? 1);
    let rsvpNote  = $state(myAttendance?.note ?? '');

    // ── תמונת שער (עריכה למנהל) ──
    let editImage = $state(g.image ?? '');
    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const MAX = 1200;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.naturalWidth, h = img.naturalHeight;
                    if (w > MAX || h > MAX) {
                        const r = Math.min(MAX / w, MAX / h);
                        w = Math.round(w * r); h = Math.round(h * r);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = reject;
                img.src = ev.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    async function handleEditImage(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) editImage = await compressImage(file);
        (e.target as HTMLInputElement).value = '';
    }

    // ── שיתוף בכל האמצעים ──
    const enc = encodeURIComponent;
    let shareUrl   = $derived(`https://community.gofreeil.com/gatherings/${g.id}`);
    let shareText  = $derived(`${g.title} — ${formatFullDate(g.date)}${g.time ? ' · ' + g.time : ''}${g.location ? ', ' + g.location : ''}. הצטרפו לסעודה הקהילתית:`);
    let shareMsg   = $derived(`${shareText} ${shareUrl}`);
    let waLink     = $derived(`https://wa.me/?text=${enc(shareMsg)}`);
    let tgLink     = $derived(`https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(shareText)}`);
    let fbLink     = $derived(`https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`);
    let mailLink   = $derived(`mailto:?subject=${enc(g.title)}&body=${enc(shareMsg)}`);
    let smsLink    = $derived(`sms:?&body=${enc(shareMsg)}`);
    let copied = $state(false);

    let canNativeShare = $state(false);
    $effect(() => { canNativeShare = typeof navigator !== 'undefined' && !!navigator.share; });

    async function shareNative() {
        try {
            await navigator.share({ title: g.title, text: shareText, url: shareUrl });
        } catch { /* המשתמש ביטל */ }
    }
    async function copyLink() {
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = shareUrl; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.focus(); ta.select();
            try { document.execCommand('copy'); } catch {}
            ta.remove();
        }
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }
</script>

<svelte:head>
    <title>{g.title} | סעודה קהילתית</title>
    <meta name="description" content={`${g.title} — ${formatFullDate(g.date)}${g.location ? ', ' + g.location : ''}. הצטרפו, שבצו מה אתם מביאים וראו מי מגיע.`} />
    <link rel="canonical" href={canonical(`/gatherings/${g.id}`)} />
    <meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-screen bg-[#070b14] py-6 md:py-10 px-4" dir="rtl">
    <div class="max-w-3xl mx-auto">

        <a href="/gatherings" class="text-amber-400 hover:text-amber-300 text-sm mb-4 inline-block transition-colors">→ חזרה לכל הסעודות</a>

        {#if !data.isMember}
            <!-- ── חברים בלבד ── -->
            <div class="max-w-md mx-auto bg-[#0f172a] border border-amber-500/20 rounded-2xl p-8 text-center mt-8">
                <div class="text-5xl mb-4">🔒</div>
                <h2 class="text-xl font-bold text-white mb-2">אזור לחברי הקהילה</h2>
                <p class="text-gray-400 text-sm mb-6">פרטי הסעודה ורשימת המגיעים נגישים רק לחברים רשומים עם כרטיס.</p>
                <div class="flex gap-3 justify-center">
                    <a href="/login" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold">התחברות</a>
                    <a href="/register" class="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold">הרשמה</a>
                </div>
            </div>
        {:else}

        <!-- ── כותרת הסעודה ── -->
        <div class="bg-gradient-to-br from-amber-500/15 to-rose-500/10 border border-amber-500/25 rounded-2xl mb-6 overflow-hidden">
            {#if g.image}
                <img src={g.image} alt={g.title} class="w-full h-48 md:h-60 object-cover" />
            {/if}
            <div class="p-6">
            <div class="flex items-start gap-4">
                <div class="text-5xl">{g.icon}</div>
                <div class="flex-1 min-w-0">
                    <h1 class="text-2xl md:text-3xl font-black text-white">{g.title}</h1>
                    <div class="text-amber-200/90 mt-2 space-y-1 text-sm">
                        <div>📅 {formatFullDate(g.date)}{#if g.time} · {g.time}{/if}</div>
                        {#if g.location}<div>📍 {g.location}</div>{/if}
                        {#if g.host_name}<div>🧑‍🍳 מארח/ת: {g.host_name}</div>{/if}
                    </div>
                    {#if g.description}<p class="text-gray-300 text-sm mt-3 whitespace-pre-wrap">{g.description}</p>{/if}
                </div>
            </div>

            {#if isManager}
                <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                    <button onclick={() => (editing = !editing)} class="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">✏️ עריכת פרטים</button>
                    <button onclick={() => (showManagers = !showManagers)} class="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">👤 ניהול מנהלים</button>
                    {#if g.creator_id === myId || (data.user as any)?.role === 'super_admin'}
                        <form method="POST" action="?/deleteGathering" use:enhance class="inline">
                            <button type="submit" onclick={(e) => { if (!confirm('למחוק את הסעודה?')) e.preventDefault(); }}
                                class="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition">🗑️ מחיקה</button>
                        </form>
                    {/if}
                </div>
            {/if}
            </div>
        </div>

        <!-- ── שיתוף הסעודה ── -->
        <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6">
            <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 class="text-lg font-bold text-white">📣 הזמינו עוד אנשים</h2>
                {#if canNativeShare}
                    <button onclick={shareNative} class="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition">
                        שיתוף בכל האמצעים…
                    </button>
                {/if}
            </div>
            <div class="flex flex-wrap gap-2">
                <a href={waLink} target="_blank" rel="noopener" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/25 transition text-sm font-medium">
                    <span>💬</span> וואטסאפ
                </a>
                <a href={tgLink} target="_blank" rel="noopener" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#229ED9]/15 text-[#3aa9e0] border border-[#229ED9]/30 hover:bg-[#229ED9]/25 transition text-sm font-medium">
                    <span>✈️</span> טלגרם
                </a>
                <a href={fbLink} target="_blank" rel="noopener" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1877F2]/15 text-[#4a93f7] border border-[#1877F2]/30 hover:bg-[#1877F2]/25 transition text-sm font-medium">
                    <span>👍</span> פייסבוק
                </a>
                <a href={smsLink} class="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition text-sm font-medium">
                    <span>📱</span> SMS
                </a>
                <a href={mailLink} class="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition text-sm font-medium">
                    <span>✉️</span> אימייל
                </a>
                <button onclick={copyLink} class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-gray-200 border border-white/15 hover:bg-white/10 transition text-sm font-medium">
                    <span>{copied ? '✅' : '🔗'}</span> {copied ? 'הקישור הועתק!' : 'העתקת קישור'}
                </button>
            </div>
        </div>

        <!-- ── עריכת פרטים (מנהל) ── -->
        {#if isManager && editing}
            <form method="POST" action="?/updateDetails" use:enhance={() => async ({ update }) => { await update(); editing = false; }}
                class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
                <h3 class="font-bold text-amber-300">עריכת פרטי הסעודה</h3>
                <input name="title" value={g.title} required class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                <div class="grid grid-cols-2 gap-3">
                    <input type="date" name="date" value={g.date} required class="bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                    <input type="time" name="time" value={g.time} class="bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <input name="location" value={g.location} placeholder="מיקום" class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                <textarea name="description" rows="2" placeholder="תיאור" class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white">{g.description}</textarea>

                <!-- תמונת שער -->
                <div>
                    <span class="block text-xs text-gray-400 mb-2">תמונת שער</span>
                    {#if editImage}
                        <div class="relative inline-block">
                            <img src={editImage} alt="תצוגה מקדימה" class="h-28 rounded-xl object-cover border border-white/10" />
                            <button type="button" onclick={() => (editImage = '')} class="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-rose-500 text-white text-sm flex items-center justify-center shadow-lg">✕</button>
                        </div>
                    {:else}
                        <label class="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 cursor-pointer transition text-gray-400 hover:text-amber-300">
                            <span class="text-xl">🖼️</span>
                            <span class="text-xs">העלאת תמונה</span>
                            <input type="file" accept="image/*" class="hidden" onchange={handleEditImage} />
                        </label>
                    {/if}
                    <input type="hidden" name="image" value={editImage} />
                </div>

                <div class="flex gap-2">
                    <button type="submit" class="px-4 py-2 rounded-lg bg-amber-500 text-white font-bold">שמירה</button>
                    <button type="button" onclick={() => (editing = false)} class="px-4 py-2 rounded-lg bg-white/10 text-white">ביטול</button>
                </div>
            </form>
        {/if}

        <!-- ── ניהול מנהלים ── -->
        {#if isManager && showManagers}
            <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6">
                <h3 class="font-bold text-amber-300 mb-3">מנהלי הסעודה</h3>
                <p class="text-xs text-gray-400 mb-3">מנהלים יכולים לערוך פרטים ולנהל את רשימת המאכלים. אפשר למנות כל מי שאישר הגעה — והוא יקבל על כך הודעה אישית בפרופיל.</p>
                <ul class="space-y-2">
                    {#each g.attendees as a}
                        {@const isMgr = g.manager_ids.includes(a.user_id)}
                        <li class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <span class="text-white text-sm">{genderIcon(a.gender)} {a.name} {#if a.user_id === g.creator_id}<span class="text-amber-400 text-xs">(מקים)</span>{/if}</span>
                            {#if a.user_id === g.creator_id}
                                <span class="text-xs text-gray-500">מנהל קבוע</span>
                            {:else if isMgr}
                                <form method="POST" action="?/removeManager" use:enhance class="inline">
                                    <input type="hidden" name="user_id" value={a.user_id} />
                                    <button class="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-300">הסרת ניהול</button>
                                </form>
                            {:else}
                                <form method="POST" action="?/addManager" use:enhance class="inline">
                                    <input type="hidden" name="user_id" value={a.user_id} />
                                    <button class="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">מינוי כמנהל</button>
                                </form>
                            {/if}
                        </li>
                    {/each}
                    {#if g.attendees.length === 0}
                        <li class="text-sm text-gray-500">כשמשתתפים יאשרו הגעה תוכלו למנות אותם כמנהלים.</li>
                    {/if}
                </ul>
            </div>
        {/if}

        <!-- ── רשימת מאכלים ── -->
        <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold text-white">🍴 מה מביאים</h2>
                <span class="text-xs text-amber-400">{claimedCount}/{g.food_items?.length ?? 0} שובצו</span>
            </div>

            {#if (g.food_items ?? []).length === 0}
                <p class="text-gray-500 text-sm">עדיין לא הוגדרה רשימת מאכלים.</p>
            {:else}
                <ul class="space-y-2">
                    {#each g.food_items as f}
                        <li class="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2.5">
                            <div class="flex-1 min-w-0">
                                <div class="text-white font-medium">{f.name}{#if f.qty}<span class="text-gray-400 text-sm font-normal"> · {f.qty}</span>{/if}</div>
                                {#if f.claimed_by_id}
                                    <div class="text-xs text-emerald-400 mt-0.5">✓ {f.claimed_by_name} מביא/ה</div>
                                {:else}
                                    <div class="text-xs text-gray-500 mt-0.5">עדיין אין מי שמביא</div>
                                {/if}
                            </div>

                            <!-- שיבוץ עצמי -->
                            {#if !f.claimed_by_id}
                                <form method="POST" action="?/claimFood" use:enhance class="inline">
                                    <input type="hidden" name="food_id" value={f.id} />
                                    <button class="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition whitespace-nowrap">אני אביא 🙋</button>
                                </form>
                            {:else if f.claimed_by_id === myId}
                                <form method="POST" action="?/unclaimFood" use:enhance class="inline">
                                    <input type="hidden" name="food_id" value={f.id} />
                                    <button class="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition whitespace-nowrap">ביטול</button>
                                </form>
                            {:else if isManager}
                                <form method="POST" action="?/unclaimFood" use:enhance class="inline">
                                    <input type="hidden" name="food_id" value={f.id} />
                                    <button class="text-xs px-2 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition" title="שחרור שיבוץ">↺</button>
                                </form>
                            {/if}

                            <!-- מחיקת מאכל (מנהל) -->
                            {#if isManager}
                                <form method="POST" action="?/removeFood" use:enhance class="inline">
                                    <input type="hidden" name="food_id" value={f.id} />
                                    <button class="text-xs px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition" title="מחיקת מאכל">✕</button>
                                </form>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}

            <!-- הוספת מאכל (מנהל) -->
            {#if isManager}
                <form method="POST" action="?/addFood" use:enhance={() => async ({ update }) => { await update({ reset: true }); }}
                    class="flex gap-2 mt-4 pt-4 border-t border-white/10">
                    <input name="name" placeholder="מאכל / מוצר" required class="flex-1 bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    <input name="qty" placeholder="כמות" class="w-24 bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    <button class="px-4 rounded-lg bg-amber-500 text-white font-bold text-sm whitespace-nowrap">הוספה</button>
                </form>
            {/if}
        </div>

        <!-- ── אישור הגעה ── -->
        <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6">
            {#if myAttendance}
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <div class="text-emerald-400 font-bold">✓ אישרת הגעה ({myAttendance.count} {myAttendance.count > 1 ? 'אנשים' : 'איש'})</div>
                    <form method="POST" action="?/cancelRsvp" use:enhance class="inline">
                        <button class="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition">ביטול הגעה</button>
                    </form>
                </div>
            {/if}
            <form method="POST" action="?/rsvp" use:enhance class="flex items-end gap-3 flex-wrap {myAttendance ? 'mt-4 pt-4 border-t border-white/10' : ''}">
                <div>
                    <label class="block text-xs text-gray-400 mb-1">כמה אתם מגיעים?</label>
                    <input type="number" name="count" min="1" bind:value={rsvpCount} class="w-20 bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>
                <div class="flex-1 min-w-[140px]">
                    <label class="block text-xs text-gray-400 mb-1">הערה (לא חובה)</label>
                    <input name="note" bind:value={rsvpNote} placeholder="מגיע עם הילדים..." class="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <button class="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold whitespace-nowrap">
                    {myAttendance ? 'עדכון' : '✋ אני מגיע/ה'}
                </button>
            </form>
        </div>

        <!-- ── רשימת מגיעים (כרטיסים) ── -->
        <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-5">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold text-white">👥 מי מגיע</h2>
                <span class="text-xs text-emerald-400">{g.attendees?.length ?? 0} נרשמו · {totalGuests} אנשים</span>
            </div>

            {#if (g.attendees ?? []).length === 0}
                <p class="text-gray-500 text-sm">עדיין אף אחד לא אישר הגעה. היו הראשונים!</p>
            {:else}
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {#each g.attendees as a}
                        <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-center {a.user_id === myId ? 'ring-1 ring-emerald-400/50' : ''}">
                            {#if a.avatar_url}
                                <img src={a.avatar_url} alt={a.name} class="w-14 h-14 rounded-full object-cover mx-auto mb-2" />
                            {:else}
                                <div class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/40 to-rose-500/40 flex items-center justify-center mx-auto mb-2 text-xl font-bold text-white">
                                    {initials(a.name)}
                                </div>
                            {/if}
                            <div class="text-white text-sm font-medium truncate">{genderIcon(a.gender)} {a.name}</div>
                            {#if a.city}<div class="text-xs text-gray-400 truncate">{a.city}</div>{/if}
                            {#if a.count > 1}<div class="text-xs text-amber-400 mt-0.5">+{a.count - 1}</div>{/if}
                            {#if a.note}<div class="text-[11px] text-gray-500 mt-1 truncate" title={a.note}>{a.note}</div>{/if}
                            {#if g.manager_ids.includes(a.user_id)}<div class="text-[10px] text-amber-300 mt-1">מנהל/ת</div>{/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        {/if}
    </div>
</div>
