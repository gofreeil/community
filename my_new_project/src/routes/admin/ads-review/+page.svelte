<script lang="ts">
    import type { PageData, ActionData } from './$types';
    import { enhance } from '$app/forms';

    let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
    <title>אישור פרסומות — מנהל ראשי</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-6 md:py-10" dir="rtl">
    <header class="mb-6">
        <h1 class="text-2xl md:text-3xl font-black text-white mb-1">אישור פרסומות</h1>
        <p class="text-sm text-gray-400">פרסומות שנשלחו על־ידי משתמשים — אשר/דחה לפני פרסום באתר.</p>
    </header>

    {#if form?.success}
        <div class="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-bold">
            ✅ {form.message}
        </div>
    {/if}
    {#if form && 'error' in form && form.error}
        <div class="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm font-bold">
            ❌ {form.error}
        </div>
    {/if}

    <section class="mb-10">
        <h2 class="text-lg font-black text-amber-300 mb-3">ממתינות לאישור ({data.pending.filter(p => p.status === 'pending').length})</h2>

        {#if data.pending.filter(p => p.status === 'pending').length === 0}
            <p class="text-sm text-gray-500 italic">אין פרסומות שממתינות.</p>
        {:else}
            <div class="grid gap-4">
                {#each data.pending.filter(p => p.status === 'pending') as ad (ad.id)}
                    <article class="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                        <div class="flex flex-col md:flex-row gap-4">
                            {#if ad.mainImage}
                                <img src={ad.mainImage} alt={ad.title}
                                     class="w-full md:w-40 h-40 object-cover rounded-xl border border-white/10" />
                            {/if}
                            <div class="flex-1 min-w-0">
                                <h3 class="text-lg font-black text-white mb-1">{ad.title}</h3>
                                <p class="text-sm text-gray-300 mb-1">{ad.subtitle}</p>
                                {#if ad.cta}
                                    <p class="text-xs text-amber-300 mb-2">CTA: {ad.cta}</p>
                                {/if}
                                <div class="text-xs text-gray-400 space-y-0.5">
                                    {#if ad.submittedBy?.email}<div>מאת: {ad.submittedBy.email}</div>{/if}
                                    <div>נשלח: {new Date(ad.submittedAt).toLocaleString('he-IL')}</div>
                                    {#if ad.landing?.phone}<div>טלפון: {ad.landing.phone}</div>{/if}
                                    {#if ad.landing?.website}<div>אתר: {ad.landing.website}</div>{/if}
                                    {#if ad.landing?.address}<div>כתובת: {ad.landing.address}</div>{/if}
                                </div>
                            </div>
                        </div>

                        <details class="mt-3 text-xs text-gray-300">
                            <summary class="cursor-pointer text-amber-300 font-bold">תצוגה מקדימה של דף הנחיתה</summary>
                            <div class="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 space-y-2">
                                {#if ad.landing?.headline}<p class="font-bold text-white">{ad.landing.headline}</p>{/if}
                                {#if ad.landing?.pitch}<p>{ad.landing.pitch}</p>{/if}
                                {#if ad.landing?.advantages?.some(a => a?.trim())}
                                    <ul class="list-disc pr-5">
                                        {#each ad.landing.advantages as a}
                                            {#if a?.trim()}<li>{a}</li>{/if}
                                        {/each}
                                    </ul>
                                {/if}
                                <a href={`/ads/${ad.id}`} target="_blank" rel="noopener"
                                   class="inline-block mt-2 px-3 py-1.5 rounded-lg bg-white/10 text-amber-300 font-bold hover:bg-white/15">
                                    פתח את דף הנחיתה המלא →
                                </a>
                            </div>
                        </details>

                        <div class="mt-4 flex flex-wrap gap-2">
                            <form method="POST" action="?/approve" use:enhance>
                                <input type="hidden" name="id" value={ad.id} />
                                <button type="submit"
                                        class="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black text-sm hover:bg-emerald-400">
                                    ✅ אשר ופרסם
                                </button>
                            </form>
                            <form method="POST" action="?/reject" use:enhance class="flex gap-2 flex-1 min-w-[260px]">
                                <input type="hidden" name="id" value={ad.id} />
                                <input type="text" name="reason" placeholder="סיבת דחייה (אופציונלי)"
                                       class="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm" />
                                <button type="submit"
                                        class="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-sm hover:bg-red-500">
                                    ❌ דחה
                                </button>
                            </form>
                        </div>
                    </article>
                {/each}
            </div>
        {/if}
    </section>

    <section class="mb-10">
        <h2 class="text-lg font-black text-emerald-300 mb-3">פורסמו ({data.approved.length})</h2>
        {#if data.approved.length === 0}
            <p class="text-sm text-gray-500 italic">עוד לא פורסמו פרסומות.</p>
        {:else}
            <ul class="grid gap-2">
                {#each data.approved as ad (ad.id)}
                    <li class="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                        {#if ad.mainImage}<img src={ad.mainImage} alt="" class="w-12 h-12 rounded-lg object-cover" />{/if}
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-bold text-white truncate">{ad.title}</div>
                            <div class="text-xs text-gray-400">{ad.subtitle}</div>
                        </div>
                        <a href={`/ads/${ad.id}`} target="_blank" rel="noopener"
                           class="text-xs text-amber-300 hover:underline">פתח →</a>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>

    {#if data.pending.some(p => p.status === 'rejected')}
        <section>
            <h2 class="text-lg font-black text-red-300 mb-3">נדחו</h2>
            <ul class="grid gap-2">
                {#each data.pending.filter(p => p.status === 'rejected') as ad (ad.id)}
                    <li class="px-3 py-2 rounded-xl bg-white/5 border border-red-500/20">
                        <div class="text-sm font-bold text-white">{ad.title}</div>
                        {#if ad.rejectionReason}
                            <div class="text-xs text-red-300">סיבה: {ad.rejectionReason}</div>
                        {/if}
                    </li>
                {/each}
            </ul>
        </section>
    {/if}
</div>
