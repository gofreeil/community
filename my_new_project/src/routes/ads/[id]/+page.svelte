<script lang="ts">
    import type { PageData } from './$types';
    let { data }: { data: PageData } = $props();
    const ad = data.ad;
    const lp = ad.landing;
</script>

<svelte:head>
    <title>{ad.title} - קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#0b1220] text-white" dir="rtl">
    <header class="relative bg-gradient-to-br {ad.gradient} px-4 py-12 md:py-20 text-center">
        {#if ad.logo}
            <img src={ad.logo} alt="" class="mx-auto mb-4 w-20 h-20 object-contain rounded-2xl bg-white/10 p-2" />
        {/if}
        <h1 class="text-3xl md:text-5xl font-black mb-2 drop-shadow">{lp.headline || ad.title}</h1>
        {#if lp.pitch}
            <p class="text-base md:text-xl max-w-2xl mx-auto opacity-95">{lp.pitch}</p>
        {/if}
        {#if ad.mainImage}
            <img src={ad.mainImage} alt={ad.title}
                 class="mx-auto mt-6 max-h-72 md:max-h-96 rounded-2xl shadow-2xl object-cover" />
        {/if}
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {#if lp.advantages?.some(a => a?.trim())}
            <section>
                <ul class="grid gap-3 max-w-xl mx-auto">
                    {#each lp.advantages as a}
                        {#if a?.trim()}
                            <li class="flex items-center gap-3 px-2 py-1">
                                <span class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br {ad.gradient} flex items-center justify-center font-black">✓</span>
                                <span class="text-base">{a}</span>
                            </li>
                        {/if}
                    {/each}
                </ul>
            </section>
        {/if}

        {#if lp.extended}
            <section>
                <h2 class="text-xl font-black mb-2">הסיפור שלנו</h2>
                <p class="whitespace-pre-line text-gray-200">{lp.extended}</p>
            </section>
        {/if}

        {#if lp.products?.length}
            <section>
                <h2 class="text-xl font-black mb-3">מוצרים / שירותים</h2>
                <div class="grid gap-3 sm:grid-cols-2">
                    {#each lp.products as p (p.id)}
                        <article class="rounded-xl border border-white/10 bg-white/5 p-3 flex gap-3">
                            {#if p.image}
                                <img src={p.image} alt={p.name} class="w-20 h-20 object-cover rounded-lg" />
                            {/if}
                            <div class="flex-1 min-w-0">
                                <h3 class="font-bold">{p.name}</h3>
                                {#if p.price}<div class="text-amber-300 font-black">{p.price} ₪</div>{/if}
                                {#if p.description}<p class="text-xs text-gray-300 mt-1">{p.description}</p>{/if}
                            </div>
                        </article>
                    {/each}
                </div>
            </section>
        {/if}

        {#if lp.uniqueness}
            <section>
                <h2 class="text-xl font-black mb-2">מה מייחד אותנו</h2>
                <p class="whitespace-pre-line text-gray-200">{lp.uniqueness}</p>
            </section>
        {/if}

        <section class="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
            <h2 class="text-xl font-black mb-3">פרטי קשר</h2>
            <div class="grid sm:grid-cols-2 gap-2 text-sm">
                {#if lp.phone}<div>📞 <a href={`tel:${lp.phone}`} class="text-amber-300 hover:underline">{lp.phone}</a></div>{/if}
                {#if lp.whatsapp}<div>💬 <a href={`https://wa.me/${lp.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener" class="text-emerald-300 hover:underline">{lp.whatsapp}</a></div>{/if}
                {#if lp.email}<div>✉️ <a href={`mailto:${lp.email}`} class="text-amber-300 hover:underline">{lp.email}</a></div>{/if}
                {#if lp.website}<div>🌐 <a href={lp.website} target="_blank" rel="noopener" class="text-amber-300 hover:underline">{lp.website}</a></div>{/if}
                {#if lp.address}<div>📍 {lp.address}</div>{/if}
                {#if lp.hours}<div>🕒 {lp.hours}</div>{/if}
            </div>
        </section>
    </main>
</div>
