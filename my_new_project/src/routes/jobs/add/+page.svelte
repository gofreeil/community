<script lang="ts">
    import type { ActionData, PageData } from './$types';
    import { _ } from 'svelte-i18n';
    import { formMemory } from '$lib/formMemory';

    let { data, form }: { data: PageData; form: ActionData } = $props();
    let job_type = $state<'offering' | 'seeking'>('offering');
    let submitting = $state(false);
</script>

<svelte:head>
    <title>פרסום מודעת עבודה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">💼</span>
            <h1 class="text-3xl font-black text-white mb-2">{$_('jobs.add_title')}</h1>
            <p class="text-gray-400">{$_('jobs.add_subtitle')}</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-red-900/30 border border-red-500/30 p-4 mb-4 text-center">
                <p class="text-red-200 mb-2">{$_('jobs.login_required')}</p>
                <a href="/login?redirect=/jobs/add" class="inline-block bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold">{$_('jobs.login_button')}</a>
            </div>
        {:else}
            <form method="POST" use:formMemory={{ fillName: true }} onsubmit={() => (submitting = true)} class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-4">
                <div class="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onclick={() => job_type = 'offering'}
                        class="px-4 py-3 rounded-xl text-sm font-bold transition-all {job_type === 'offering' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                    >💼 {$_('jobs.offering_btn')}</button>
                    <button
                        type="button"
                        onclick={() => job_type = 'seeking'}
                        class="px-4 py-3 rounded-xl text-sm font-bold transition-all {job_type === 'seeking' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg' : 'bg-white/10 text-gray-400 hover:bg-white/15'}"
                    >👤 {$_('jobs.seeking_btn')}</button>
                    <input type="hidden" name="job_type" value={job_type} />
                </div>

                <div>
                    <label for="title" class="text-white text-sm font-bold mb-1 block">{$_('jobs.title_label')} *</label>
                    <input id="title" name="title" required placeholder={job_type === 'offering' ? $_('jobs.title_ph_offering') : $_('jobs.title_ph_seeking')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                </div>

                <div>
                    <label for="description" class="text-white text-sm font-bold mb-1 block">{$_('jobs.desc_label')}</label>
                    <textarea id="description" name="description" rows="4" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500"></textarea>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="street" class="text-white text-sm font-bold mb-1 block">{$_('jobs.street_label')}</label>
                        <input id="street" name="street" placeholder={$_('jobs.street_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="buildingNum" class="text-white text-sm font-bold mb-1 block">{$_('jobs.building_label')}</label>
                        <input id="buildingNum" name="buildingNum" placeholder={$_('jobs.building_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label for="floor" class="text-white text-sm font-bold mb-1 block">{$_('jobs.floor_label')}</label>
                        <input id="floor" name="floor" placeholder={$_('jobs.floor_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="apartment" class="text-white text-sm font-bold mb-1 block">{$_('jobs.apartment_label')}</label>
                        <input id="apartment" name="apartment" placeholder={$_('jobs.apartment_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="hours" class="text-white text-sm font-bold mb-1 block">{$_('jobs.hours_label')}</label>
                        <input id="hours" name="hours" placeholder="9:00-17:00" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <div>
                    <label for="arrivalNotes" class="text-white text-sm font-bold mb-1 block">{$_('jobs.arrival_label')}</label>
                    <textarea id="arrivalNotes" name="arrivalNotes" rows="2" placeholder={$_('jobs.arrival_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" style="color-scheme: dark;"></textarea>
                </div>

                <div>
                    <label for="salary" class="text-white text-sm font-bold mb-1 block">{$_('jobs.salary_label')}</label>
                    <input id="salary" name="salary" placeholder={$_('jobs.salary_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="contact" class="text-white text-sm font-bold mb-1 block">{$_('jobs.contact_label')}</label>
                        <input id="contact" name="contact" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <label for="phone" class="text-white text-sm font-bold mb-1 block">{$_('jobs.phone_label')} *</label>
                        <input id="phone" name="phone" type="tel" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                {#if form?.error}
                    <p class="text-red-400 text-sm text-center">{form.error}</p>
                {/if}

                <button type="submit" disabled={submitting} class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? $_('jobs.submitting') : $_('jobs.submit')}
                </button>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="/national/jobs" class="text-gray-500 hover:text-white transition-colors text-sm">{$_('jobs.back_to_board')}</a>
        </div>
    </div>
</div>
