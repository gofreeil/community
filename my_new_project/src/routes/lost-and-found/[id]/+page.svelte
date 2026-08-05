<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();
    // $derived: מעבר בין פריטים בניווט צד-לקוח מחזיר את אותה קומפוננטה,
    // ובלי זה היא הייתה נשארת עם הפריט הראשון שנטען
    const item = $derived(data.item);

    const isOwner = $derived(!!data.currentUserId && item.user_id === data.currentUserId);

    // מודל הורדת מודעה (בעלים) + מחיקת מנהל (סופר-אדמין)
    let resolveOpen  = $state(false);
    let resolveSending = $state(false);
    let adminOpen    = $state(false);
    let adminDeleting = $state(false);

    function getType(ef: string): 'lost' | 'found' {
        try { return JSON.parse(ef)?.type === 'lost' ? 'lost' : 'found'; }
        catch { return 'found'; }
    }

    function getImage(ef: string): string {
        try { return JSON.parse(ef)?.image ?? ''; }
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

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    const type  = $derived(getType(item.extra_fields));
    const image = $derived(getImage(item.extra_fields));
</script>

<svelte:head>
    <title>{item.label} | אבדות ומציאות</title>
</svelte:head>

<div class="max-w-lg mx-auto px-4 py-8" dir="rtl">

    <!-- Back -->
    <a href="/lost-and-found" class="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors mb-6">
        ← חזרה לכל המודעות
    </a>

    <div class="bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

        <!-- Image -->
        {#if image}
            <div class="relative w-full h-56">
                <img src={image} alt={item.label} class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-t from-[#1e293b]/80 to-transparent"></div>
            </div>
        {/if}

        <!-- Type badge -->
        <div class="px-6 {image ? 'pt-4' : 'pt-6'} flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider
                {type === 'found' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}">
                {type === 'found' ? '✅ נמצא' : '❓ אבד'}
            </span>
            {#if item.created_at}
                <span class="text-gray-500 text-xs">🕒 {formatDate(item.created_at)}</span>
            {/if}
        </div>

        <!-- Content -->
        <div class="px-6 py-4 space-y-4">
            <h1 class="text-2xl font-black text-white leading-tight">{item.label}</h1>

            {#if item.description}
                <p class="text-gray-300 text-sm leading-relaxed">
                    {item.description.replace(/^(❓ אבד|✅ נמצא) \| /, '')}
                </p>
            {/if}

            <div class="space-y-2 text-sm text-gray-400">
                {#if item.address}
                    <div class="flex items-center gap-2">
                        <span>📍</span>
                        <span>{item.address}</span>
                    </div>
                {/if}
                {#if item.contact}
                    <div class="flex items-center gap-2">
                        <span>👤</span>
                        <span>{item.contact}</span>
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            {#if item.phone}
                <div class="flex gap-2 pt-2">
                    <a href="tel:{item.phone}"
                        class="flex-1 text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all shadow-lg">
                        📞 {item.phone}
                    </a>
                    <a href={waLink(item.phone)} target="_blank" rel="noopener noreferrer"
                        aria-label="שלח הודעת וואטסאפ (נפתח בחלון חדש)"
                        class="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-sm transition-all shadow-lg">
                        💬
                    </a>
                </div>
            {/if}

            <!-- הורדה / מחיקה -->
            {#if isOwner}
                <button
                    onclick={() => (resolveOpen = true)}
                    class="w-full py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/30 text-red-400 hover:text-red-300 text-sm font-bold transition-all border border-red-500/20">
                    🗑️ הורד מודעה
                </button>
            {/if}
            {#if data.isSuperAdmin}
                <button
                    onclick={() => (adminOpen = true)}
                    class="w-full py-2.5 rounded-xl bg-red-900/30 hover:bg-red-800/50 text-red-300 hover:text-white text-sm font-bold transition-all border border-red-500/30">
                    🛡️ מחק כמנהל
                </button>
            {/if}
        </div>
    </div>
</div>

<!-- Resolve modal (owner) -->
{#if resolveOpen}
    <div class="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center px-4" dir="rtl">
        <div class="w-full max-w-md bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-black text-white text-lg">✅ הורדת מודעה</h2>
                <button onclick={() => (resolveOpen = false)} class="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            <p class="text-gray-300 text-sm mb-3 leading-relaxed">
                נודה לך שתדווח גם כשהאבדה שבה - כדי שנשמח יחד ונקדם חברה מתוקנת יותר 🤝
            </p>
            <p class="text-gray-500 text-sm mb-5">
                לפני הסרת המודעה <span class="text-white font-bold">"{item.label}"</span>, נשמח לדעת:
            </p>

            {#if form?.resolveError}
                <div class="mb-3 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                    ⚠️ {form.resolveError}
                </div>
            {/if}

            <form method="POST" action="?/resolveItem"
                use:enhance={() => {
                    resolveSending = true;
                    return async ({ update }) => { await update(); resolveSending = false; };
                }}
                class="space-y-4">
                <input type="hidden" name="item_user_id" value={item.user_id ?? ''} />
                <div>
                    <label for="resolver-phone" class="block text-sm font-bold text-white mb-2">
                        {type === 'lost'
                            ? '📞 מה מספר הטלפון של מי שהחזיר לך את האבדה?'
                            : '📞 מה מספר הטלפון של מי שקיבל ממך את הפריט?'}
                    </label>
                    <input id="resolver-phone" type="tel" name="resolver_phone" required placeholder="050-0000000"
                        class="w-full bg-white/5 border border-white/10 focus:border-green-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600" />
                    <p class="text-gray-500 text-xs mt-1.5">הפרטים נשמרים לצורך מעקב ואינם מפורסמים</p>
                </div>

                <div class="flex gap-3">
                    <button type="button" onclick={() => (resolveOpen = false)}
                        class="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10">
                        ביטול
                    </button>
                    <button type="submit" disabled={resolveSending}
                        class="flex-1 py-3 rounded-xl font-black text-sm transition-all
                            {resolveSending ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white shadow-lg'}">
                        {resolveSending ? 'מסיר...' : '✅ הסר מודעה'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Admin delete modal (super-admin) -->
{#if adminOpen}
    <div class="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center px-4" dir="rtl">
        <div class="w-full max-w-md bg-[#1e293b] rounded-2xl border border-red-500/30 shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="font-black text-white text-lg">🛡️ מחיקת מודעה (מנהל)</h2>
                <button onclick={() => (adminOpen = false)} class="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            <p class="text-gray-300 text-sm mb-5 leading-relaxed">
                המודעה <span class="text-white font-bold">"{item.label}"</span> תימחק לצמיתות מהמערכת.
                פעולה זו אינה ניתנת לשחזור.
            </p>

            {#if form?.adminDeleteError}
                <div class="mb-3 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">
                    ⚠️ {form.adminDeleteError}
                </div>
            {/if}

            <form method="POST" action="?/adminDeleteItem"
                use:enhance={() => {
                    adminDeleting = true;
                    return async ({ update }) => { await update(); adminDeleting = false; };
                }}
                class="flex gap-3">
                <button type="button" onclick={() => (adminOpen = false)}
                    class="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10">
                    ביטול
                </button>
                <button type="submit" disabled={adminDeleting}
                    class="flex-1 py-3 rounded-xl font-black text-sm transition-all
                        {adminDeleting ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white shadow-lg'}">
                    {adminDeleting ? 'מוחק...' : '🗑️ מחק לצמיתות'}
                </button>
            </form>
        </div>
    </div>
{/if}
