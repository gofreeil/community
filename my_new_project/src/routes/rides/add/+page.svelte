<script lang="ts">
    import type { ActionData, PageData } from './$types';
    import { _ } from 'svelte-i18n';
    import { invalidateAll } from '$app/navigation';
    import LevelUpCard from '$lib/components/LevelUpCard.svelte';
    import { formMemory } from '$lib/formMemory';
    import ExtraContactsField from '$lib/components/ExtraContactsField.svelte';

    let { data, form }: { data: PageData; form: ActionData } = $props();
    let direction = $state<'driver' | 'passenger'>('driver');
    let submitting = $state(false);
</script>

<svelte:head>
    <title>פרסום טרמפ חדש | קהילה בשכונה</title>
</svelte:head>

{#if data.needsUpgrade && data.tierUser}
<div class="min-h-screen bg-[#070b14] pt-10 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <LevelUpCard user={data.tierUser} target={data.requiredTier} reason={$_('tiers.reason_publish')} approved={(data as any).approvedNeighborhoods ?? []} onDone={() => invalidateAll()} />
    </div>
</div>
{:else}
<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🚗</span>
            <h1 class="text-3xl font-black text-white mb-2">{$_('listings.ridesadd_title')}</h1>
            <p class="text-gray-400">{$_('listings.ridesadd_subtitle')}</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-red-900/30 border border-red-500/30 p-4 mb-4 text-center">
                <p class="text-red-200 mb-2">{$_('listings.login_to_post')}</p>
                <a href="/login?redirect=/rides/add" class="inline-block bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold">{$_('listings.login')}</a>
            </div>
        {:else}
            <form method="POST" use:formMemory={{ fillName: true }} onsubmit={() => (submitting = true)} class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-4">
                <!-- Direction -->
                <div class="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onclick={() => direction = 'driver'}
                        class="px-4 py-3 rounded-xl text-sm font-bold transition-all {direction === 'driver' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                    >{$_('listings.ridesadd_offer')}</button>
                    <button
                        type="button"
                        onclick={() => direction = 'passenger'}
                        class="px-4 py-3 rounded-xl text-sm font-bold transition-all {direction === 'passenger' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                    >{$_('listings.ridesadd_seek')}</button>
                    <input type="hidden" name="direction" value={direction} />
                </div>

                {#if direction === 'driver'}
                    <p class="text-gray-400 text-xs text-center">
                        {$_('listings.ridesadd_driver_note')}
                    </p>
                {/if}

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="from" class="text-white text-sm font-bold mb-1 block">{$_('listings.ridesadd_from')}</label>
                        <input id="from" name="from" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="to" class="text-white text-sm font-bold mb-1 block">{$_('listings.ridesadd_to')}</label>
                        <input id="to" name="to" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                        <label for="date" class="text-white text-sm font-bold mb-1 block">{$_('listings.ridesadd_date')}</label>
                        <input id="date" name="date" type="date" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="time" class="text-white text-sm font-bold mb-1 block">{$_('listings.ridesadd_time')}</label>
                        <input id="time" name="time" type="time" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="seats" class="text-white text-sm font-bold mb-1 block">{$_('listings.ridesadd_seats')}</label>
                        <input id="seats" name="seats" type="number" min="1" max="10" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <div>
                    <label for="description" class="text-white text-sm font-bold mb-1 block">{$_('listings.ridesadd_details')}</label>
                    <textarea id="description" name="description" rows="3" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="contact" class="text-white text-sm font-bold mb-1 block">{$_('listings.contact_name')}</label>
                        <input id="contact" name="contact" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="phone" class="text-white text-sm font-bold mb-1 block">{$_('listings.phone_req')}</label>
                        <input id="phone" name="phone" type="tel" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div class="col-span-2">
                        <ExtraContactsField name="extra_contacts" idPrefix="rides-extra-contact" compact />
                    </div>
                </div>

                {#if form?.error}
                    <p class="text-red-400 text-sm text-center">{form.error}</p>
                {/if}

                <button type="submit" disabled={submitting} class="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? $_('listings.ridesadd_submitting') : $_('listings.ridesadd_submit')}
                </button>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="/rides" class="text-gray-500 hover:text-white transition-colors text-sm">← {$_('listings.ridesadd_back')}</a>
        </div>
    </div>
</div>

{/if}
